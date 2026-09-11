// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stored = vi.fn<() => string[]>(() => []);

vi.mock("@atcute/oauth-browser-client", () => ({
  listStoredSessions: () => stored(),
  getSession: async (did: string) => ({ sub: did }),
  deleteStoredSession: vi.fn(),
  OAuthUserAgent: class {
    sub: string;
    constructor(session: { sub: string }) {
      this.sub = session.sub;
    }
    async signOut() {}
    // `@atcute/client`'s `Client` binds this as its fetch handler; never
    // actually called in this test, just present so construction doesn't
    // throw reaching for it.
    async handle(): Promise<never> {
      throw new Error("not used in this test");
    }
  },
}));

/** A bare in-memory `localStorage`, since this package has no DOM dependency
 * to pull in just for one browser-only test. */
class FakeLocalStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("the browser session store's recency order", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage =
      new FakeLocalStorage();
    stored.mockReturnValue([]);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("hands back a session nobody has adopted yet in atcute's own order", async () => {
    stored.mockReturnValue(["did:plc:a", "did:plc:b"]);
    const { createBrowserSessionStore } = await import("./session-store");
    const store = createBrowserSessionStore();
    expect(store.stored()).toEqual(["did:plc:a", "did:plc:b"]);
  });

  it("moves the account it just adopted to the front", async () => {
    stored.mockReturnValue(["did:plc:a", "did:plc:b"]);
    const { createBrowserSessionStore } = await import("./session-store");
    const store = createBrowserSessionStore();

    await store.adopt({
      did: "did:plc:b",
      resolveService: async () => "https://pds.example",
    });

    expect(store.stored()).toEqual(["did:plc:b", "did:plc:a"]);
  });

  it("keeps the most recently adopted account first across a fresh store — the reload case", async () => {
    stored.mockReturnValue(["did:plc:a", "did:plc:b"]);
    const { createBrowserSessionStore } = await import("./session-store");
    const first = createBrowserSessionStore();
    await first.adopt({
      did: "did:plc:a",
      resolveService: async () => "https://pds.example",
    });
    await first.adopt({
      did: "did:plc:b",
      resolveService: async () => "https://pds.example",
    });

    // A new store object, over the same localStorage — the shape of a page
    // reload, which is exactly the case that was restoring the wrong
    // account: atcute's own order never changed, only this browser's own
    // memory of which was used last did.
    const second = createBrowserSessionStore();
    expect(second.stored()[0]).toBe("did:plc:b");
  });

  it("still includes a session this browser holds but never recorded using", async () => {
    stored.mockReturnValue(["did:plc:a", "did:plc:b", "did:plc:c"]);
    const { createBrowserSessionStore } = await import("./session-store");
    const store = createBrowserSessionStore();
    await store.adopt({
      did: "did:plc:c",
      resolveService: async () => "https://pds.example",
    });

    expect(store.stored()).toEqual(["did:plc:c", "did:plc:a", "did:plc:b"]);
  });
});
