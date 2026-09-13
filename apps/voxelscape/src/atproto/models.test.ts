// @vitest-environment node
import { encode } from "fast-png";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { sideKinds } from "@big-mesh-studios/stacker/renderer";
import {
  createModelLibrary,
  publishedModels,
  type LocateAccount,
} from "./models";

const DID = "did:plc:zombiekeeper";
const SERVICE = "https://pds.example";

const locate: LocateAccount = async () => ({ did: DID, service: SERVICE });

/** A one-part model whose every side and face points at `cid`, all fetched from the same blob. */
const modelRecord = (name: string, cid: string) => ({
  $type: "app.bms.stacker.model",
  name,
  createdAt: "2026-08-27T12:00:00.000Z",
  dimensions: { width: 16, height: 24, depth: 16 },
  palette: [{ r: 0, g: 0, b: 0, a: 255 }],
  parts: [
    {
      name: "body",
      // Every axis is a decimal string, not a number — the AT Protocol data
      // model has no float, and a pivot in particular is genuinely fractional.
      root: { x: "0", y: "0", z: "0" },
      pivot: { x: "8", y: "12", z: "8" },
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

/** Answers the two public calls a library makes, and records what it was asked. */
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

describe("publishedModels", () => {
  it("keeps the models in a page, under the key each was published as", () => {
    const models = publishedModels(DID, [
      {
        uri: `at://${DID}/app.bms.stacker.model/zombie`,
        cid: "bafzombierecord",
        value: modelRecord("Zombie", "bafzombie"),
      },
      {
        uri: `at://${DID}/app.bms.stacker.model/duck`,
        cid: "bafduckrecord",
        value: modelRecord("Duck", "bafduck"),
      },
    ]);

    expect(models.map((model) => model.rkey)).toEqual(["zombie", "duck"]);
    expect(models[0].repo).toBe(DID);
    expect(models[0].record.name).toBe("Zombie");
  });

  it("passes over a record it could not open", () => {
    const models = publishedModels(DID, [
      {
        uri: `at://${DID}/app.bms.stacker.model/half`,
        cid: "bafhalfrecord",
        value: { $type: "app.bms.stacker.model", name: "Half" },
      },
      {
        uri: `at://${DID}/app.bms.stacker.model/post`,
        cid: "bafpostrecord",
        value: { $type: "app.bsky.feed.post" },
      },
      {
        uri: `at://${DID}/app.bms.stacker.model/zombie`,
        cid: "bafzombierecord",
        value: modelRecord("Zombie", "bafzombie"),
      },
    ]);

    expect(models.map((model) => model.rkey)).toEqual(["zombie"]);
  });
});

describe("a model library", () => {
  it("finds a model by the name it was published under", async () => {
    const { fetch, asked } = server({
      getRecord: {
        uri: `at://${DID}/app.bms.stacker.model/cute-zombie`,
        cid: "bafcutezombierecord",
        value: modelRecord("Cute Zombie", "bafzombie"),
      },
    });
    const model = await createModelLibrary({ locate, fetch }).find(
      "someone.example",
      "Cute Zombie",
    );

    expect(model.rkey).toBe("cute-zombie");
    expect(model.record.name).toBe("Cute Zombie");
    expect(asked[0]).toContain(`${SERVICE}/xrpc/com.atproto.repo.getRecord`);
    expect(asked[0]).toContain("rkey=cute-zombie");
  });

  it("refuses a record that is not a model it can open", async () => {
    const { fetch } = server({
      getRecord: {
        uri: `at://${DID}/app.bms.stacker.model/zombie`,
        cid: "bafzombierecord",
        value: { $type: "app.bms.stacker.model", name: "Zombie" },
      },
    });

    await expect(
      createModelLibrary({ locate, fetch }).find("someone.example", "zombie"),
    ).rejects.toThrow(/not a model/);
  });

  it("lists every page of models an account published", async () => {
    let page = 0;
    const fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("listRecords")) {
        return new Response("nope", { status: 404 });
      }
      page += 1;
      return json(
        page === 1
          ? {
              cursor: "next",
              records: [
                {
                  uri: `at://${DID}/app.bms.stacker.model/zombie`,
                  cid: "bafzombierecord",
                  value: modelRecord("Zombie", "bafzombie"),
                },
              ],
            }
          : {
              records: [
                {
                  uri: `at://${DID}/app.bms.stacker.model/duck`,
                  cid: "bafduckrecord",
                  value: modelRecord("Duck", "bafduck"),
                },
              ],
            },
      );
    }) as typeof globalThis.fetch;

    const models = await createModelLibrary({ locate, fetch }).list(
      "someone.example",
    );

    expect(models.map((model) => model.rkey)).toEqual(["zombie", "duck"]);
  });

  it("rebuilds a model's zip from the drawings its record's parts point at", async () => {
    const asked: string[] = [];
    const fetch = (async (input: RequestInfo | URL) => {
      asked.push(String(input instanceof Request ? input.url : input));
      // A fresh response each call — the same one could not be read twice.
      return new Response(new Blob([sidePng() as BlobPart]));
    }) as typeof globalThis.fetch;
    const library = createModelLibrary({ locate, fetch });
    const file = await library.file({
      repo: DID,
      rkey: "zombie",
      cid: "bafzombierecord",
      record: modelRecord("Zombie", "bafzombie") as never,
    });

    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(
      [
        "body/",
        ...sideKinds.map((side) => `body/${side}.png`),
        "parts.json",
        "palette.png",
      ].sort(),
    );
    expect(asked.every((url) => url.includes("cid=bafzombie"))).toBe(true);
    expect(asked).toHaveLength(sideKinds.length);
  });

  it("says who would not serve a model it could not fetch", async () => {
    const { fetch } = server({});

    await expect(
      createModelLibrary({ locate, fetch }).file({
        repo: DID,
        rkey: "zombie",
        cid: "bafzombierecord",
        record: modelRecord("Zombie", "bafzombie") as never,
      }),
    ).rejects.toThrow(/would not serve "Zombie" \(404\)/);
  });
});
