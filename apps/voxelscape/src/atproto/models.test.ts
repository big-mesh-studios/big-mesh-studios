// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createModelLibrary,
  publishedModels,
  type LocateAccount,
} from "./models";

const DID = "did:plc:zombiekeeper";
const SERVICE = "https://pds.example";

const locate: LocateAccount = async () => ({ did: DID, service: SERVICE });

const modelRecord = (name: string, cid: string) => ({
  $type: "app.bms.stacker.model",
  name,
  createdAt: "2026-08-27T12:00:00.000Z",
  file: { $type: "blob", ref: { $link: cid }, mimeType: "application/zip" },
  dimensions: { width: 16, height: 24, depth: 16 },
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
        value: modelRecord("Zombie", "bafzombie"),
      },
      {
        uri: `at://${DID}/app.bms.stacker.model/duck`,
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
        value: { $type: "app.bms.stacker.model", name: "Half" },
      },
      {
        uri: `at://${DID}/app.bms.stacker.model/post`,
        value: { $type: "app.bsky.feed.post" },
      },
      {
        uri: `at://${DID}/app.bms.stacker.model/zombie`,
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
                  value: modelRecord("Zombie", "bafzombie"),
                },
              ],
            }
          : {
              records: [
                {
                  uri: `at://${DID}/app.bms.stacker.model/duck`,
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

  it("fetches a model's zip from the server holding the account", async () => {
    const { fetch, asked } = server({
      getBlob: new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
    });
    const library = createModelLibrary({ locate, fetch });
    const file = await library.file({
      repo: DID,
      rkey: "zombie",
      record: modelRecord("Zombie", "bafzombie") as never,
    });

    expect(new Uint8Array(await file.arrayBuffer())).toEqual(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    );
    expect(asked[0]).toBe(
      `${SERVICE}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(DID)}&cid=bafzombie`,
    );
  });

  it("says who would not serve a model it could not fetch", async () => {
    const { fetch } = server({});

    await expect(
      createModelLibrary({ locate, fetch }).file({
        repo: DID,
        rkey: "zombie",
        record: modelRecord("Zombie", "bafzombie") as never,
      }),
    ).rejects.toThrow(/would not serve "Zombie" \(404\)/);
  });
});
