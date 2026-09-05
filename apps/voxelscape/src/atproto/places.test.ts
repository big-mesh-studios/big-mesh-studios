// @vitest-environment node
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createPlaceLibrary, createPlacePublisher } from "./places";
import {
  PLACE_COLLECTION,
  placeAtUri,
  type PlaceRecord,
} from "../places/place";

const DID = "did:plc:mesamaker";
const SERVICE = "https://pds.example";

const locate: (
  id: string,
) => Promise<{ did: string; service: string }> = async () => ({
  did: DID,
  service: SERVICE,
});

const placeRecord = (name: string, cid: string) => ({
  $type: PLACE_COLLECTION,
  name,
  seed: 12_345,
  spawn: [128, 0, -64],
  createdAt: "2026-09-05T00:00:00.000Z",
  file: { $type: "blob", ref: { $link: cid }, mimeType: "application/zip" },
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });

const server = (
  answers: Record<string, unknown>,
): { fetch: typeof globalThis.fetch; asked: string[] } => {
  const asked: string[] = [];
  const fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    asked.push(url);
    for (const [match, answer] of Object.entries(answers)) {
      if (url.includes(match)) {
        return answer instanceof Response ? answer : json(answer);
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
        value: placeRecord("The Haunted Mesa", "bafmesa"),
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
        value: placeRecord("The Haunted Mesa", "bafmesa"),
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
                  value: placeRecord("The Haunted Mesa", "bafmesa"),
                },
              ],
            }
          : {
              records: [
                {
                  uri: `at://${DID}/${PLACE_COLLECTION}/sky-spire`,
                  value: placeRecord("Sky Spire", "bafspire"),
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
});

describe("a place publisher", () => {
  const zip = async (): Promise<Blob> => {
    const archive = new JSZip();
    archive.file(
      "manifest.json",
      JSON.stringify({
        name: "The Haunted Mesa",
        seed: 12_345,
        spawn: [128, 0, -64],
        scripts: ["main.js"],
      }),
    );
    archive.file("main.js", "export default {}");
    return new Blob([await archive.generateAsync({ type: "arraybuffer" })]);
  };

  it("uploads the zip, puts the record under the name's key, and returns its at-uri", async () => {
    const uploaded: Array<{ mimeType: string }> = [];
    const put: Array<{ rkey: string; record: PlaceRecord }> = [];
    const client = {
      uploadBlob: async (blob: Blob) => {
        uploaded.push({ mimeType: blob.type });
        return { ref: { $link: "bafuploaded" }, mimeType: blob.type };
      },
      putRecord: async (params: {
        repo: string;
        collection: string;
        rkey: string;
        record: PlaceRecord;
      }) => {
        put.push({ rkey: params.rkey, record: params.record });
      },
    } as never;

    const publisher = createPlacePublisher({
      getClient: () => client as never,
      getRepo: () => DID,
    });

    const atUri = await publisher.publish(await zip());

    expect(atUri).toBe(placeAtUri(DID, "the-haunted-mesa"));
    expect(uploaded).toEqual([{ mimeType: "application/zip" }]);
    expect(put[0].rkey).toBe("the-haunted-mesa");
    expect(put[0].record.name).toBe("The Haunted Mesa");
    expect(put[0].record.seed).toBe(12_345);
    expect(put[0].record.file.ref.$link).toBe("bafuploaded");
  });

  it("refuses to publish a file that is not a place zip", async () => {
    const publisher = createPlacePublisher({
      getClient: () => ({}) as never,
      getRepo: () => DID,
    });
    await expect(publisher.publish(new Blob(["nope"]))).rejects.toThrow(
      "not a zip",
    );
  });

  it("says when there is no account to publish under", async () => {
    const publisher = createPlacePublisher({
      getClient: () => undefined,
      getRepo: () => null,
    });
    await expect(publisher.publish(await zip())).rejects.toThrow(
      /account:login/,
    );
  });
});
