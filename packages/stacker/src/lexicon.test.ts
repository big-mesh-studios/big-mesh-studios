// @vitest-environment jsdom
import type { Blob as LexBlob } from "@atcute/lexicons";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import { sideKinds, type Figure, type Part } from "./data";
import {
  isModelRecord,
  loadPublishedFigure,
  MODEL_COLLECTION,
  modelRkey,
  publishFigure,
  type ModelRecord,
} from "./lexicon";
import type { Motion } from "./motion";

/** A part drawn solid in palette index `fill`, every side the same size. */
const partOf = (
  name: string,
  fill: number,
  parent: string | null = null,
): Part => {
  const sides = Object.fromEntries(
    sideKinds.map((side) => {
      const bitmap = Bitmap.create(2, 2);
      bitmap.data.fill(fill);
      return [side, bitmap];
    }),
  ) as Part["sides"];

  return {
    name,
    sides,
    sections: [],
    root: Vector3D.create(),
    // Fractional on purpose: a box with an odd extent centres its pivot half a
    // voxel in, and the AT Protocol data model has no float to hold that in —
    // this is exactly the value that once made a real publish fail.
    pivot: Vector3D.create(3.5, 1, 1),
    turn: Vector3D.create(),
    scale: 1,
    parent,
  };
};

/** An in-memory stand-in for `uploadBlob`/fetching one, keyed by cid. */
const blobStore = () => {
  const store = new Map<string, Uint8Array>();
  let next = 0;

  return {
    async uploadBlob(bytes: Uint8Array): Promise<LexBlob> {
      const cid = `baf${next++}`;
      store.set(cid, bytes);
      return {
        $type: "blob",
        mimeType: "image/png",
        ref: { $link: cid },
        size: bytes.length,
      };
    },
    async fetchBlob(blob: LexBlob): Promise<Uint8Array> {
      const bytes = store.get(blob.ref.$link);
      if (bytes === undefined) {
        throw new Error(`no blob uploaded as "${blob.ref.$link}"`);
      }
      return bytes;
    },
  };
};

describe("publishFigure and loadPublishedFigure", () => {
  it("round-trips a figure of several parts and a motion through blob upload and fetch", async () => {
    const figure: Figure = {
      parts: [partOf("torso", 3), partOf("head", 7, "torso")],
      palette: Array.from({ length: 32 }, (_, i) => ({
        r: i,
        g: i,
        b: i,
        a: 255,
      })),
    };
    const motions: Motion[] = [
      {
        name: "nod",
        framesPerSecond: 12,
        loop: true,
        parts: [
          {
            part: "head",
            keys: [
              {
                at: 0,
                ease: "linear",
                root: Vector3D.create(),
                turn: Vector3D.create(),
                scale: 1,
              },
            ],
          },
        ],
      },
    ];

    const { uploadBlob, fetchBlob } = blobStore();
    const published = await publishFigure(figure, motions, uploadBlob);
    const reread = await loadPublishedFigure(
      {
        $type: MODEL_COLLECTION,
        name: "Cute Zombie",
        createdAt: "2026-08-27T12:00:00.000Z",
        dimensions: { width: 2, height: 2, depth: 2 },
        ...published,
      },
      fetchBlob,
    );

    expect(reread.parts.map((part) => part.name)).toEqual(["torso", "head"]);
    expect(reread.parts[1].parent).toBe("torso");
    expect(Array.from(reread.parts[0].sides.front.data)).toEqual([3, 3, 3, 3]);
    expect(Array.from(reread.parts[1].sides.top.data)).toEqual([7, 7, 7, 7]);
    expect(reread.palette[7]).toEqual({ r: 7, g: 7, b: 7, a: 255 });
    expect(reread.motions).toEqual(motions);
    // A fractional pivot is written as a string, never a number the AT
    // Protocol data model would refuse the whole record over, and reads back
    // as the exact value it was drawn at.
    expect(typeof published.parts[0].pivot.x).toBe("string");
    expect(reread.parts[0].pivot.x).toBe(3.5);
  });
});

const record: ModelRecord = {
  $type: MODEL_COLLECTION,
  name: "Cute Zombie",
  createdAt: "2026-08-27T12:00:00.000Z",
  dimensions: { width: 2, height: 2, depth: 2 },
  palette: [{ r: 0, g: 0, b: 0, a: 255 }],
  parts: [
    {
      name: "body",
      root: { x: "0", y: "0", z: "0" },
      pivot: { x: "1", y: "1", z: "1" },
      turn: { x: "0", y: "0", z: "0" },
      scale: "1",
      parent: null,
      sides: Object.fromEntries(
        sideKinds.map((side) => [
          side,
          {
            $type: "blob",
            mimeType: "image/png",
            ref: { $link: `baf-${side}` },
            size: 4,
          },
        ]),
      ) as ModelRecord["parts"][number]["sides"],
      sections: [],
    },
  ],
  motions: [{ name: "", framesPerSecond: 12, loop: true, parts: [] }],
};

describe("modelRkey", () => {
  it("keeps the characters a record key may hold", () => {
    expect(modelRkey("zombie-2.v3_final~")).toBe("zombie-2.v3_final~");
  });

  it("gives the same key for the same name, so a second publish is an edit", () => {
    expect(modelRkey("Cute Zombie")).toBe(modelRkey("cute  zombie"));
  });

  it("replaces runs of anything else with a single hyphen", () => {
    expect(modelRkey("Cute Zombie!! (green)")).toBe("cute-zombie-green");
  });

  it("refuses a name that leaves nothing to be found under", () => {
    expect(() => modelRkey("!!!")).toThrow();
  });
});

describe("isModelRecord", () => {
  it("accepts a record this editor wrote", () => {
    expect(isModelRecord(record)).toBe(true);
  });

  it("passes over a record from another collection", () => {
    expect(isModelRecord({ ...record, $type: "app.bsky.feed.post" })).toBe(
      false,
    );
  });

  it("passes over a record whose part is missing a side", () => {
    const { front: _front, ...missingFront } = record.parts[0].sides;
    expect(
      isModelRecord({
        ...record,
        parts: [{ ...record.parts[0], sides: missingFront }],
      }),
    ).toBe(false);
  });

  it("passes over a record naming dimensions it does not have", () => {
    expect(
      isModelRecord({ ...record, dimensions: { width: 2, height: 2 } }),
    ).toBe(false);
  });

  it("passes over a record whose motion key names no ease this reads", () => {
    expect(
      isModelRecord({
        ...record,
        motions: [
          {
            name: "nod",
            framesPerSecond: 12,
            loop: true,
            parts: [
              {
                part: "body",
                keys: [
                  {
                    at: 0,
                    ease: "bounce",
                    root: { x: "0", y: "0", z: "0" },
                    turn: { x: "0", y: "0", z: "0" },
                    scale: "1",
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });

  it("passes over what is not a record at all", () => {
    expect(isModelRecord(null)).toBe(false);
    expect(isModelRecord("app.bms.stacker.model")).toBe(false);
  });
});
