// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createIdentityLookup, type DidDocument } from "./identity";

const ALICE = "did:plc:alice";

const documentFor = (params?: { handle?: string; service?: string }) =>
  ({
    id: ALICE,
    alsoKnownAs: [`at://${params?.handle ?? "alice.example.com"}`],
    service: [
      {
        id: "#atproto_pds",
        type: "AtprotoPersonalDataServer",
        serviceEndpoint: params?.service ?? "https://pds.example/",
      },
    ],
  }) as unknown as DidDocument;

function build(params?: {
  document?: DidDocument;
  resolvesTo?: string;
  fetch?: typeof globalThis.fetch;
}) {
  const resolve = vi.fn(async () => params?.document ?? documentFor());
  const resolveHandle = vi.fn(async () => params?.resolvesTo ?? ALICE);
  const lookup = createIdentityLookup({
    didDocumentResolver: { resolve } as never,
    handleResolver: { resolve: resolveHandle } as never,
    fetch: params?.fetch ?? (vi.fn() as never),
  });
  return { lookup, resolve, resolveHandle };
}

describe("document", () => {
  it("asks the network once per account, however many callers ask", async () => {
    const { lookup, resolve } = build();

    await Promise.all([lookup.document(ALICE), lookup.document(ALICE)]);
    await lookup.document(ALICE);

    expect(resolve).toHaveBeenCalledTimes(1);
  });
});

describe("service", () => {
  it("gives the server address without its trailing slash", async () => {
    const { lookup } = build();

    expect(await lookup.service(ALICE)).toBe("https://pds.example");
  });

  it("fails loudly when the document names no server", async () => {
    const { lookup } = build({
      document: { id: ALICE, service: [] } as unknown as DidDocument,
    });

    await expect(lookup.service(ALICE)).rejects.toThrow(
      /no personal data server/,
    );
  });
});

describe("handle", () => {
  it("gives the claimed handle when resolving it leads back to the account", async () => {
    const { lookup } = build({ resolvesTo: ALICE });

    expect(await lookup.handle(ALICE)).toBe("alice.example.com");
  });

  it("gives nothing when the claim resolves to somebody else", async () => {
    const { lookup } = build({ resolvesTo: "did:plc:mallory" });

    expect(await lookup.handle(ALICE)).toBeNull();
  });

  it("remembers that there was no handle, rather than asking again", async () => {
    const { lookup, resolveHandle } = build({ resolvesTo: "did:plc:mallory" });

    await lookup.handle(ALICE);
    await lookup.handle(ALICE);

    expect(resolveHandle).toHaveBeenCalledTimes(1);
  });
});

describe("name", () => {
  it("falls back to the identifier when there is no handle to show", async () => {
    const { lookup } = build({ resolvesTo: "did:plc:mallory" });

    expect(await lookup.name(ALICE)).toBe(ALICE);
  });

  it("falls back to the identifier when the lookup itself fails", async () => {
    const lookup = createIdentityLookup({
      didDocumentResolver: {
        resolve: async () => {
          throw new Error("the directory is unreachable");
        },
      } as never,
      handleResolver: { resolve: async () => ALICE } as never,
      fetch: vi.fn() as never,
    });

    expect(await lookup.name(ALICE)).toBe(ALICE);
  });
});

describe("picture", () => {
  it("gives nothing when the account keeps no profile record", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 404 }));
    const { lookup } = build({ fetch: fetch as never });

    expect(await lookup.picture(ALICE)).toBeNull();
  });

  it("reads the bytes from the server that holds the account", async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes("getRecord")
        ? Response.json({
            value: { avatar: { ref: { $link: "bafyPicture" } } },
          })
        : new Response("bytes"),
    );
    const { lookup } = build({ fetch: fetch as never });

    const picture = await lookup.picture(ALICE);

    expect(await picture?.text()).toBe("bytes");
    expect(fetch.mock.calls[1][0]).toContain("cid=bafyPicture");
    expect(fetch.mock.calls[1][0]).toContain("https://pds.example/xrpc/");
  });

  it("needs no session, so a face shows whether or not anybody is signed in", async () => {
    const fetch = vi.fn(async () => Response.json({ value: {} }));
    const { lookup } = build({ fetch: fetch as never });

    expect(await lookup.picture(ALICE)).toBeNull();
    expect(fetch).toHaveBeenCalled();
  });
});
