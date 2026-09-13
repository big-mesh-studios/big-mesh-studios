// @vitest-environment jsdom
// jsdom, not node — resolving a place round-trips a model through JSZip
// (`saveFigure`/`loadFigure`), which can only read a `Blob` where a real
// `FileReader` exists.
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import { saveFigure } from "@big-mesh-studios/stacker/format";
import { sideKinds } from "@big-mesh-studios/stacker/renderer";
import { encode } from "fast-png";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createPlaceLibrary, createPlacePublisher } from "./places";
import {
  PLACE_COLLECTION,
  placeAtUri,
  type PlaceModelRef,
  type PlaceRecord,
} from "../places/place";
import type { PlaceProject } from "../places/project";

const DID = "did:plc:mesamaker";
const OWNER_DID = "did:plc:zombiekeeper";
const SERVICE = "https://pds.example";

const locate: (
  id: string,
) => Promise<{ did: string; service: string }> = async (id) => ({
  did: id.startsWith("did:") ? id : DID,
  service: SERVICE,
});

const placeRecord = (
  name: string,
  scripts: PlaceRecord["scripts"] = [],
  models: PlaceModelRef[] = [],
) => ({
  $type: PLACE_COLLECTION,
  name,
  seed: 12_345,
  spawn: [128, 0, -64],
  createdAt: "2026-09-05T00:00:00.000Z",
  scripts,
  models,
});

/** A one-part model record whose every side points at `cid`, all served from the same blob. */
const modelRecord = (cid: string) => ({
  $type: "app.bms.stacker.model",
  name: "Fridge",
  createdAt: "2026-08-27T12:00:00.000Z",
  dimensions: { width: 4, height: 4, depth: 4 },
  palette: [{ r: 0, g: 0, b: 0, a: 255 }],
  parts: [
    {
      name: "body",
      root: { x: "0", y: "0", z: "0" },
      pivot: { x: "2", y: "2", z: "2" },
      turn: { x: "0", y: "0", z: "0" },
      scale: "1",
      parent: null,
      sides: Object.fromEntries(
        sideKinds.map((side) => [
          side,
          { $type: "blob", ref: { $link: cid }, mimeType: "image/png" },
        ]),
      ),
      sections: [],
    },
  ],
  motions: [],
});

/** A png every side/face blob fetch below returns, decodable as a bitmap. */
const sidePng = () =>
  encode({
    width: 1,
    height: 1,
    data: new Uint8Array([1]),
    channels: 1,
    depth: 8,
  });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });

/** A matched answer — a value to encode as JSON, or a factory for a fresh
 * `Response` each call, since a Blob-bodied one can only be read once. */
type Answer = unknown | (() => Response);

const server = (
  answers: Record<string, Answer>,
): { fetch: typeof globalThis.fetch; asked: string[] } => {
  const asked: string[] = [];
  const fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    asked.push(url);
    for (const [match, answer] of Object.entries(answers)) {
      if (url.includes(match)) {
        return typeof answer === "function" ? answer() : json(answer);
      }
    }
    return new Response("nope", { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, asked };
};

describe("a place library", () => {
  it("finds a place by the name it was published under", async () => {
    const { fetch, asked } = server({
      getRecord: {
        uri: `at://${DID}/${PLACE_COLLECTION}/the-haunted-mesa`,
        value: placeRecord("The Haunted Mesa"),
      },
    });
    const place = await createPlaceLibrary({ locate, fetch }).find(
      "mesa.example",
      "The Haunted Mesa",
    );

    expect(place.rkey).toBe("the-haunted-mesa");
    expect(place.record.name).toBe("The Haunted Mesa");
    expect(place.record.seed).toBe(12_345);
    expect(asked[0]).toContain(`${SERVICE}/xrpc/com.atproto.repo.getRecord`);
    expect(asked[0]).toContain("rkey=the-haunted-mesa");
  });

  it("reads a place straight from its at-uri", async () => {
    const { fetch } = server({
      getRecord: {
        uri: `at://${DID}/${PLACE_COLLECTION}/the-haunted-mesa`,
        value: placeRecord("The Haunted Mesa"),
      },
    });
    const place = await createPlaceLibrary({ locate, fetch }).recordAtUri(
      placeAtUri(DID, "the-haunted-mesa"),
    );
    expect(place.record.seed).toBe(12_345);
  });

  it("refuses an at-uri that names no place", async () => {
    const { fetch } = server({});
    const library = createPlaceLibrary({ locate, fetch });
    await expect(
      library.recordAtUri("at://did:plc:oops/other.collection/x"),
    ).rejects.toThrow(/not a place address/);
  });

  it("refuses a record that is not a place it can open", async () => {
    const { fetch } = server({
      getRecord: {
        uri: `at://${DID}/${PLACE_COLLECTION}/broken`,
        value: { $type: PLACE_COLLECTION, name: "Broken" },
      },
    });
    await expect(
      createPlaceLibrary({ locate, fetch }).find("mesa.example", "Broken"),
    ).rejects.toThrow(/not a place/);
  });

  it("lists every page of places an account published", async () => {
    let page = 0;
    const fetch = (async (input: RequestInfo | URL) => {
      if (!String(input).includes("listRecords")) {
        return new Response("nope", { status: 404 });
      }
      page += 1;
      return json(
        page === 1
          ? {
              cursor: "next",
              records: [
                {
                  uri: `at://${DID}/${PLACE_COLLECTION}/the-haunted-mesa`,
                  value: placeRecord("The Haunted Mesa"),
                },
              ],
            }
          : {
              records: [
                {
                  uri: `at://${DID}/${PLACE_COLLECTION}/sky-spire`,
                  value: placeRecord("Sky Spire"),
                },
              ],
            },
      );
    }) as typeof globalThis.fetch;

    const places = await createPlaceLibrary({ locate, fetch }).list(
      "mesa.example",
    );

    expect(places.map((place) => place.rkey)).toEqual([
      "the-haunted-mesa",
      "sky-spire",
    ]);
  });

  describe("reading a place back into a project", () => {
    const modelUri = `at://${OWNER_DID}/app.bms.stacker.model/fridge`;

    it("resolves inline scripts and every attached model's own record", async () => {
      const { fetch } = server({
        "app.bms.voxelscape.place": {
          uri: `at://${DID}/${PLACE_COLLECTION}/the-haunted-mesa`,
          value: placeRecord(
            "The Haunted Mesa",
            [{ name: "main.js", source: "var started = false;" }],
            [{ name: "fridge.zip", uri: modelUri, cid: "bafmodelrecord" }],
          ),
        },
        "app.bms.stacker.model": {
          value: modelRecord("bafside"),
          cid: "bafmodelrecord",
        },
        getBlob: () => new Response(new Uint8Array(sidePng())),
      });
      const library = createPlaceLibrary({ locate, fetch });
      const place = await library.find("mesa.example", "The Haunted Mesa");

      const project = await library.project(place);

      expect(project.scripts).toEqual({ "main.js": "var started = false;" });
      expect(Object.keys(project.models)).toEqual(["fridge.zip"]);
      expect(project.models["fridge.zip"].ref).toEqual({
        uri: modelUri,
        cid: "bafmodelrecord",
      });
      const zip = await JSZip.loadAsync(project.models["fridge.zip"].bytes);
      expect(Object.keys(zip.files)).toContain("body/front.png");
    });

    it("leaves out a model whose current record has drifted from the cid the place named", async () => {
      const { fetch } = server({
        "app.bms.voxelscape.place": {
          uri: `at://${DID}/${PLACE_COLLECTION}/the-haunted-mesa`,
          value: placeRecord(
            "The Haunted Mesa",
            [],
            [{ name: "fridge.zip", uri: modelUri, cid: "bafstale" }],
          ),
        },
        "app.bms.stacker.model": {
          value: modelRecord("bafside"),
          // The record's current cid disagrees with what the place pinned.
          cid: "bafcurrent",
        },
      });
      const library = createPlaceLibrary({ locate, fetch });
      const place = await library.find("mesa.example", "The Haunted Mesa");

      const project = await library.project(place);

      expect(project.models).toEqual({});
    });
  });
});

describe("a place publisher", () => {
  /** A real, decodable one-box model, drawn solid in palette index 1. */
  const modelZipBytes = async (): Promise<Uint8Array> => {
    const bitmap = Bitmap.create(2, 2);
    bitmap.data.fill(1);
    const figure = {
      parts: [
        {
          name: "body",
          sides: Object.fromEntries(sideKinds.map((side) => [side, bitmap])),
          sections: [],
          root: Vector3D.create(),
          pivot: Vector3D.create(1, 1, 1),
          turn: Vector3D.create(),
          scale: 1,
          parent: null,
        },
      ],
      palette: Array.from({ length: 32 }, () => ({ r: 1, g: 1, b: 1, a: 255 })),
    };
    const zip = await saveFigure(figure as never, []);
    return new Uint8Array(await zip.arrayBuffer());
  };

  const project = (models: PlaceProject["models"] = {}): PlaceProject => ({
    manifest: {
      name: "The Haunted Mesa",
      seed: 12_345,
      spawn: [128, 0, -64],
    },
    scripts: { "main.js": "export default {}" },
    models,
  });

  it("puts the record under the name's key, its scripts inline, and returns its at-uri", async () => {
    const put: Array<{ collection: string; rkey: string; record: unknown }> =
      [];
    const client = {
      uploadBlob: async () => {
        throw new Error("no model needed uploading");
      },
      putRecord: async (params: {
        repo: string;
        collection: string;
        rkey: string;
        record: unknown;
      }) => {
        put.push(params);
        return { cid: "bafplacerecord" };
      },
    } as never;

    const publisher = createPlacePublisher({
      getClient: () => client as never,
      getRepo: () => DID,
    });

    const atUri = await publisher.publish(project());

    expect(atUri).toBe(placeAtUri(DID, "the-haunted-mesa"));
    expect(put).toHaveLength(1);
    expect(put[0].rkey).toBe("the-haunted-mesa");
    const record = put[0].record as PlaceRecord;
    expect(record.name).toBe("The Haunted Mesa");
    expect(record.scripts).toEqual([
      { name: "main.js", source: "export default {}" },
    ]);
    expect(record.models).toEqual([]);
  });

  it("reuses an attached model's strong ref as is, without uploading anything for it", async () => {
    const uploaded: unknown[] = [];
    const put: Array<{ collection: string; record: unknown }> = [];
    const client = {
      uploadBlob: async (blob: Blob) => {
        uploaded.push(blob);
        return { ref: { $link: "bafuploaded" }, mimeType: blob.type };
      },
      putRecord: async (params: {
        collection: string;
        rkey: string;
        record: unknown;
      }) => {
        put.push(params);
        return { cid: "bafplacerecord" };
      },
    } as never;

    const publisher = createPlacePublisher({
      getClient: () => client as never,
      getRepo: () => OWNER_DID,
    });

    const ownRef = {
      uri: `at://${OWNER_DID}/app.bms.stacker.model/fridge`,
      cid: "bafownmodel",
    };
    await publisher.publish(
      project({ "fridge.zip": { bytes: new Uint8Array(), ref: ownRef } }),
    );

    expect(uploaded).toEqual([]);
    expect(put).toHaveLength(1); // only the place record — no model record written
    const record = put[0].record as PlaceRecord;
    expect(record.models).toEqual([
      { name: "fridge.zip", uri: ownRef.uri, cid: ownRef.cid },
    ]);
  });

  it("publishes a fresh copy of an attached model with no ref, under the signed-in account", async () => {
    const modelPuts: Array<{ collection: string; rkey: string }> = [];
    const client = {
      uploadBlob: async (blob: Blob) => ({
        ref: { $link: `baf-${Math.random()}` },
        mimeType: blob.type,
      }),
      putRecord: async (params: {
        collection: string;
        rkey: string;
        record: unknown;
      }) => {
        if (params.collection === "app.bms.stacker.model") {
          modelPuts.push(params);
          return { cid: "bafnewmodel" };
        }
        return { cid: "bafplacerecord" };
      },
    } as never;

    const publisher = createPlacePublisher({
      getClient: () => client as never,
      getRepo: () => OWNER_DID,
    });

    const bytes = await modelZipBytes();
    const atUri = await publisher.publish(project({ "fridge.zip": { bytes } }));

    expect(atUri).toBe(placeAtUri(OWNER_DID, "the-haunted-mesa"));
    expect(modelPuts).toHaveLength(1);
    expect(modelPuts[0].rkey).toBe("fridge.zip"); // modelRkey("fridge.zip")
  });

  it("says when there is no account to publish under", async () => {
    const publisher = createPlacePublisher({
      getClient: () => undefined,
      getRepo: () => null,
    });
    await expect(publisher.publish(project())).rejects.toThrow(/account:login/);
  });
});
