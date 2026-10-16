/**
 * The reference image in a level file: its codec, its reader, and the compatibility it rests on.
 *
 * **Two claims are worth pinning rather than trying on a file.** The bytes and the media type
 * must survive a round trip exactly — that is the whole requirement — and the key must be
 * invisible to the items reader, because that invisibility is what lets an older build open a
 * level that carries one (`level-plan.ts` checks only `version` and `items`).
 */
import { describe, expect, it } from "vitest";

import {
  base64ToBytes,
  bytesToBase64,
  decodeImagePlane,
  encodeImagePlane,
  MAX_IMAGE_PLANE_BYTES,
  MAX_IMAGE_PLANE_WIDTH,
  type LevelImagePlane,
} from "./image-plane";
import { parseLevelPlan, writeLevelPlan } from "./level-plan";
import type { LevelPlan } from "./types";

const aReference: LevelImagePlane = {
  at: [1, 2, 3],
  yaw: 0.5,
  width: 120,
  opacity: 0.4,
  mime: "image/png",
  bytes: new Uint8Array([0, 1, 2, 250, 255]),
};

const bytesOf = (value: Uint8Array | undefined): number[] =>
  value === undefined ? [] : [...value];

describe("base64", () => {
  it("round-trips every length modulo three, padding included", () => {
    // The three cases are the three padding shapes: none, one `=`, two `=`.
    for (const length of [0, 1, 2, 3, 4, 5, 100]) {
      const bytes = new Uint8Array(length).map((_, i) => (i * 37) & 0xff);
      expect(bytesOf(base64ToBytes(bytesToBase64(bytes)))).toEqual([...bytes]);
    }
  });

  it("refuses anything that is not base64", () => {
    expect(base64ToBytes("not base64!!")).toBeUndefined();
  });
});

describe("decodeImagePlane", () => {
  it("reads a written reference back byte for byte", () => {
    const decoded = decodeImagePlane(encodeImagePlane(aReference));
    expect("imagePlane" in decoded).toBe(true);
    if (!("imagePlane" in decoded)) return;
    expect(decoded.imagePlane).toBeDefined();
    expect(decoded.imagePlane?.bytes).toEqual(aReference.bytes);
    expect(decoded.imagePlane?.mime).toBe("image/png");
    expect(decoded.imagePlane?.at).toEqual([1, 2, 3]);
    expect(decoded.imagePlane?.yaw).toBe(0.5);
    expect(decoded.imagePlane?.width).toBe(120);
    expect(decoded.imagePlane?.opacity).toBe(0.4);
  });

  it("reads an absent key as no reference, not as a refusal", () => {
    // A level with no picture is the common case, and it must not be an error.
    expect(decodeImagePlane(undefined)).toEqual({ imagePlane: undefined });
  });

  it("refuses a field this build does not know, as the items reader does", () => {
    const refused = decodeImagePlane({
      ...encodeImagePlane(aReference),
      wobble: 3,
    });
    expect("refusal" in refused).toBe(true);
  });

  it("refuses bytes that are not base64", () => {
    const refused = decodeImagePlane({
      ...encodeImagePlane(aReference),
      bytes: "!!!!",
    });
    expect("refusal" in refused).toBe(true);
  });

  it("refuses an image past the size cap", () => {
    const tooBig = {
      ...encodeImagePlane(aReference),
      bytes: bytesToBase64(new Uint8Array(MAX_IMAGE_PLANE_BYTES + 1)),
    };
    const refused = decodeImagePlane(tooBig);
    expect("refusal" in refused).toBe(true);
  });

  it("refuses an opacity outside zero to one", () => {
    const refused = decodeImagePlane({
      ...encodeImagePlane(aReference),
      opacity: 2,
    });
    expect("refusal" in refused).toBe(true);
  });

  it("allows a reference far wider than a shape's own size limit", () => {
    // A reference is a map of the build, not a shape in it, so its width bound is its own and
    // much larger than `MAX_SHAPE_SIZE`. The cap still holds, one unit past it.
    expect(
      "imagePlane" in
        decodeImagePlane(
          encodeImagePlane({ ...aReference, width: MAX_IMAGE_PLANE_WIDTH }),
        ),
    ).toBe(true);
    expect(
      "refusal" in
        decodeImagePlane({
          ...encodeImagePlane(aReference),
          width: MAX_IMAGE_PLANE_WIDTH + 1,
        }),
    ).toBe(true);
  });
});

describe("the top-level key in a level file", () => {
  const plan: LevelPlan = { version: 1, items: [] };

  it("is written only when there is a reference", () => {
    expect(JSON.parse(writeLevelPlan(plan))).not.toHaveProperty("imagePlane");
    expect(JSON.parse(writeLevelPlan(plan, aReference))).toHaveProperty(
      "imagePlane",
    );
  });

  it("is ignored by the items reader, which is what an older build relies on", () => {
    // The compatibility the plan promised: a build that checks only `version` and `items`
    // loads the level and drops the picture, rather than refusing the file.
    const read = parseLevelPlan(writeLevelPlan(plan, aReference));
    expect("plan" in read).toBe(true);
  });
});
