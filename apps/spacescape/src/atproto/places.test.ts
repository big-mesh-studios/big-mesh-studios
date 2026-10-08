/**
 * The place library and the place publisher.
 *
 * ## What is being tested
 *
 * **The library is a port, and a port is where a ceiling silently disappears.** `listAll` is the
 * part with no natural pull towards correctness: it reads accounts it did not choose, over a relay
 * that lists repos holding the collection, with `repos`, `places`, `bytes`, `concurrent` and
 * `deadlineMs` all able to stop it. None of those can be exercised against a real network in a
 * test, so every one is injected and the harness below is a server that answers like a PDS and a
 * relay and nothing else.
 *
 * **And that a place is not behind an account to read.** The read half takes no token — it builds a
 * plain `Client` against whatever service a DID's document names — which is what makes browse work
 * before sign-in. The harness proves it by never providing an account to the library at all.
 *
 * ## Why the read half is what is exercised hard, and the write half is not
 *
 * Publishing is three lines over `makePlaceRecord` and `putRecord`, and both are covered elsewhere:
 * `project.test.ts` tests the record's shape and its refusal of a project carrying an attachment,
 * and `packages/atproto` tests the client. What is tested here is the address a publish lands at,
 * because that is the part this file decides.
 */

import { describe, expect, it } from "vitest";

import { createPlaceLibrary, createPlacePublisher } from "./places";
import {
  PLACE_COLLECTION,
  placeAtUri,
  type PlaceRecord,
} from "../places/place-record";
import type { PlaceProject } from "../places/project";
import type {
  AtprotoBlobClient,
  AtprotoRepoClient,
} from "@big-mesh-studios/atproto/repo-client";

const DID = "did:plc:harbourmaster";
const SERVICE = "https://pds.example";
const RELAY = "https://relay.example";

/** Every identifier resolves to the test's one account and one service. */
const locate = async (
  id: string,
): Promise<{ did: string; service: string }> => ({
  did: id.startsWith("did:") ? id : DID,
  service: SERVICE,
});

/** A record that passes `isPlaceRecord`, for a test to vary one field of. */
const placeRecord = (
  name: string,
  over: Partial<PlaceRecord> = {},
): PlaceRecord => ({
  $type: PLACE_COLLECTION,
  version: 1,
  name,
  seed: 12_345,
  createdAt: "2026-10-08T00:00:00.000Z",
  entry: "main.ts",
  scripts: [{ name: "main.ts", source: "export {};" }],
  ...over,
});

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });

/** A matched answer: a value to encode as JSON, or a factory for a fresh `Response`. */
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

describe("finding a place by name", () => {
  it("looks it up under the key its name derives", async () => {
    // **The key is derived, not stored**, which is what makes a second publish an edit rather than
    // a fork (ADR 0044). A lookup that used the name verbatim would find nothing a publish wrote.
    const { fetch, asked } = server({
      getRecord: {
        uri: `at://${DID}/${PLACE_COLLECTION}/the-harbour`,
        value: placeRecord("The Harbour"),
      },
    });

    const place = await createPlaceLibrary({ locate, fetch }).find(
      "harbour.example",
      "The Harbour",
    );

    expect(place.rkey).toBe("the-harbour");
    expect(place.repo).toBe(DID);
    expect(place.record.name).toBe("The Harbour");
    expect(asked[0]).toContain(`${SERVICE}/xrpc/com.atproto.repo.getRecord`);
    expect(asked[0]).toContain("rkey=the-harbour");
  });

  it("reads one straight from its address", async () => {
    const { fetch } = server({
      getRecord: {
        uri: `at://${DID}/${PLACE_COLLECTION}/the-harbour`,
        value: placeRecord("The Harbour"),
      },
    });

    const place = await createPlaceLibrary({ locate, fetch }).recordAtUri(
      placeAtUri(DID, "the-harbour"),
    );

    expect(place.record.seed).toBe(12_345);
  });

  it("refuses an address that names no place", async () => {
    const { fetch } = server({});
    await expect(
      createPlaceLibrary({ locate, fetch }).recordAtUri(
        "at://did:plc:oops/other.collection/x",
      ),
    ).rejects.toThrow(/not a place address/);
  });

  it("refuses a record that is not a place this can open", async () => {
    // **A repository holds whatever its owner wrote**, so the record is checked rather than trusted
    // — ADR 0044's `isPlaceRecord`, reached through the library.
    const { fetch } = server({
      getRecord: {
        uri: `at://${DID}/${PLACE_COLLECTION}/broken`,
        value: { $type: PLACE_COLLECTION, name: "Broken" },
      },
    });

    await expect(
      createPlaceLibrary({ locate, fetch }).find("harbour.example", "Broken"),
    ).rejects.toThrow(/not a place this can open/);
  });
});

describe("listing one account", () => {
  it("reads every page it hands over", async () => {
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
                  uri: `at://${DID}/${PLACE_COLLECTION}/the-harbour`,
                  value: placeRecord("The Harbour"),
                },
              ],
            }
          : {
              records: [
                {
                  uri: `at://${DID}/${PLACE_COLLECTION}/the-lookout`,
                  value: placeRecord("The Lookout"),
                },
              ],
            },
      );
    }) as typeof globalThis.fetch;

    const places = await createPlaceLibrary({ locate, fetch }).list(
      "harbour.example",
    );

    expect(places.map((place) => place.record.name)).toEqual([
      "The Harbour",
      "The Lookout",
    ]);
    expect(page).toBe(2);
  });

  it("passes over a record this cannot open without failing the listing", async () => {
    // **One bad record in an account is not a reason to show none of them.** The library's own
    // `console.warn` aside, what matters is that the readable places still arrive.
    const { fetch } = server({
      listRecords: {
        records: [
          {
            uri: `at://${DID}/${PLACE_COLLECTION}/broken`,
            value: { $type: PLACE_COLLECTION, name: "Broken" },
          },
          {
            uri: `at://${DID}/${PLACE_COLLECTION}/the-harbour`,
            value: placeRecord("The Harbour"),
          },
        ],
      },
    });

    const places = await createPlaceLibrary({ locate, fetch }).list(
      "harbour.example",
    );

    expect(places).toHaveLength(1);
    expect(places[0]?.record.name).toBe("The Harbour");
  });
});

describe("listing the whole network", () => {
  it("starts from the relay's directory and reads each account it names", async () => {
    // **The directory is the whole trick.** Nothing here is told an account's name; the relay is
    // asked which repositories hold the collection, and each is read for itself.
    const { fetch, asked } = server({
      listReposByCollection: {
        repos: [{ did: DID }, { did: "did:plc:other" }],
      },
      listRecords: () => json({ records: [] }),
    });

    const listing = await createPlaceLibrary({
      locate,
      fetch,
      relay: RELAY,
    }).listAll();

    expect(asked[0]).toContain(
      `${RELAY}/xrpc/com.atproto.sync.listReposByCollection`,
    );
    expect(asked.filter((url) => url.includes("listRecords"))).toHaveLength(2);
    expect(listing.capped).toBe(false);
  });

  it("counts an account named twice once", async () => {
    // **A relay is allowed to repeat itself**, and an account read twice is one account — which is
    // also why the walk ends on a page naming nothing new.
    const { fetch, asked } = server({
      listReposByCollection: {
        repos: [{ did: DID }, { did: DID }],
      },
      listRecords: () => json({ records: [] }),
    });

    await createPlaceLibrary({ locate, fetch, relay: RELAY }).listAll();

    expect(asked.filter((url) => url.includes("listRecords"))).toHaveLength(1);
  });

  it("passes over an account whose server will not answer", async () => {
    // **A listing reads accounts it did not choose, and one of them is allowed to be gone.** The
    // others still arrive, and the failure is not thrown at the caller.
    const { fetch } = server({
      listReposByCollection: {
        repos: [{ did: DID }, { did: "did:plc:other" }],
      },
      // The one account whose records come back, keyed by its DID — encoded, because
      // `URLSearchParams` writes the colon in a `did:` as `%3A`.
      [`repo=${encodeURIComponent(DID)}`]: {
        records: [
          {
            uri: `at://${DID}/${PLACE_COLLECTION}/the-harbour`,
            value: placeRecord("The Harbour"),
          },
        ],
      },
      listRecords: () => new Response("gone", { status: 503 }),
    });

    const listing = await createPlaceLibrary({
      locate,
      fetch,
      relay: RELAY,
    }).listAll();

    expect(listing.places.map((place) => place.record.name)).toEqual([
      "The Harbour",
    ]);
  });

  it("reports itself capped when the relay names more accounts than it reads", async () => {
    // **The honesty the `capped` field exists for.** A listing that showed the first account and
    // said nothing would be indistinguishable from a network holding one place.
    const { fetch } = server({
      listReposByCollection: {
        // **A cursor is how the relay says there is another page.** Without one it is saying these
        // are every account holding a place, and a listing that called that capped would report a
        // ceiling it never reached.
        repos: [
          { did: "did:plc:one" },
          { did: "did:plc:two" },
          { did: "did:plc:three" },
        ],
        cursor: "more",
      },
      listRecords: () => json({ records: [] }),
    });

    const listing = await createPlaceLibrary({
      locate,
      fetch,
      relay: RELAY,
      // Two accounts read, and the relay named more than two.
      limits: { repos: 2 },
    }).listAll();

    expect(listing.capped).toBe(true);
    expect(listing.places).toHaveLength(0);
  });

  it("reports itself capped when one account holds more than its share", async () => {
    // **The other ceiling, and a different code path.** `repos` bounds how many accounts are read;
    // `placesPerAccount` bounds what one of them may contribute, so a single account cannot spend a
    // whole listing. Reaching it is also being capped, and this is the only test that says so.
    const { fetch } = server({
      listReposByCollection: { repos: [{ did: DID }] },
      listRecords: {
        records: [
          {
            uri: `at://${DID}/${PLACE_COLLECTION}/a`,
            value: placeRecord("A"),
          },
          {
            uri: `at://${DID}/${PLACE_COLLECTION}/b`,
            value: placeRecord("B"),
          },
        ],
        cursor: "more",
      },
    });

    const listing = await createPlaceLibrary({
      locate,
      fetch,
      relay: RELAY,
      limits: { placesPerAccount: 1 },
    }).listAll();

    expect(listing.places).toHaveLength(1);
    expect(listing.capped).toBe(true);
  });

  it("orders what it found by name, then by the account holding it", async () => {
    // **Two accounts can publish the same name**, and the order has to be total or a browse list
    // reshuffles between loads. The key is a place's name first because that is what a person reads.
    const { fetch } = server({
      listReposByCollection: {
        repos: [{ did: "did:plc:z" }, { did: "did:plc:a" }],
      },
      listRecords: {
        records: [
          {
            uri: `at://${DID}/${PLACE_COLLECTION}/x`,
            value: placeRecord("Same Name"),
          },
        ],
      },
    });

    // Both accounts answer with the same name; the ordering falls through to the repository.
    const listing = await createPlaceLibrary({
      locate,
      fetch,
      relay: RELAY,
    }).listAll();

    expect(listing.places).toHaveLength(2);
    expect(listing.places[0]?.repo).toBe("did:plc:a");
    expect(listing.places[1]?.repo).toBe("did:plc:z");
  });
});

describe("reading a place back as a project", () => {
  it("hands back the manifest and the scripts the record carried", async () => {
    const { fetch } = server({
      getRecord: {
        uri: `at://${DID}/${PLACE_COLLECTION}/the-harbour`,
        value: placeRecord("The Harbour", {
          spawn: [4, 30, -8],
          scripts: [
            { name: "main.ts", source: 'import "./span";' },
            { name: "span.ts", source: "export {};" },
          ],
        }),
      },
    });

    const library = createPlaceLibrary({ locate, fetch });
    const place = await library.find("harbour.example", "The Harbour");
    const project = await library.project(place);

    expect(project.manifest.name).toBe("The Harbour");
    expect(project.manifest.seed).toBe(12_345);
    expect(project.manifest.entry).toBe("main.ts");
    expect(project.manifest.spawn).toEqual([4, 30, -8]);
    expect(project.scripts["span.ts"]).toBe("export {};");
    // **No attachments, because the record carries none** (ADR 0044). A project read from a
    // repository is the same shape a project read from a zip is, and a place created here can be
    // saved as one.
    expect(project.models).toEqual({});
  });
});

describe("publishing a place", () => {
  /** A record client that remembers what it was asked to write. */
  const signingIn = (): {
    client: AtprotoRepoClient & AtprotoBlobClient;
    written: { rkey: string; record: unknown }[];
  } => {
    const written: { rkey: string; record: unknown }[] = [];
    const client = {
      async putRecord({
        rkey,
        record,
      }: {
        rkey: string;
        record: { [_ in string]: unknown };
      }) {
        written.push({ rkey, record });
        return { cid: "bafywritten" };
      },
    } as unknown as AtprotoRepoClient & AtprotoBlobClient;
    return { client, written };
  };

  const project = (): PlaceProject => ({
    manifest: {
      name: "The Harbour",
      seed: 12_345,
      entry: "main.ts",
      scripts: ["main.ts"],
    },
    scripts: { "main.ts": "export {};" },
    models: {},
  });

  it("writes the record under the key the name derives, and hands back the address", async () => {
    const { client, written } = signingIn();
    const publisher = createPlacePublisher({
      getClient: () => client,
      getRepo: () => DID,
    });

    const uri = await publisher.publish(project());

    expect(uri).toBe(placeAtUri(DID, "the-harbour"));
    expect(written).toHaveLength(1);
    expect(written[0]?.rkey).toBe("the-harbour");
    expect(uri).toContain(`/${PLACE_COLLECTION}/`);
  });

  it("refuses to publish while nobody is signed in, naming what to do", async () => {
    // **The sentence names the command**, because a person looking at a refusal has to be able to
    // act on it and "not signed in" leaves them looking for a button.
    const publisher = createPlacePublisher({
      getClient: () => undefined,
      getRepo: () => null,
    });

    await expect(publisher.publish(project())).rejects.toThrow(
      /\/account:login/,
    );
  });

  it("refuses a project carrying a file nothing can publish yet", async () => {
    // **Not dropped silently.** A record is JSON and an attachment is bytes, so publishing one
    // needs a blob upload and a model identity neither of which exists (ADR 0044). A place that
    // published with its file quietly missing would be worse than one that would not publish.
    const { client, written } = signingIn();
    const publisher = createPlacePublisher({
      getClient: () => client,
      getRepo: () => DID,
    });

    await expect(
      publisher.publish({
        ...project(),
        manifest: { ...project().manifest, models: ["lantern.sdfmod"] },
        models: { "lantern.sdfmod": new Uint8Array([1, 2, 3]) },
      }),
    ).rejects.toThrow(/nothing can publish yet/);
    expect(written).toHaveLength(0);
  });
});
