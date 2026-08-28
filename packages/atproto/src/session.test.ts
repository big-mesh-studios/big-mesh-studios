// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  createAtprotoSession,
  type AdoptedSession,
  type SessionState,
  type SessionStore,
} from "./session";

const ALICE = "did:plc:alice";

/** A store holding whatever sessions a test says this browser has. */
function fakeStore(params?: {
  sessions?: string[];
  onAdopt?: (did: string) => void;
  adoptFails?: Error;
}) {
  const ended: string[] = [];
  const store: SessionStore = {
    stored: () => params?.sessions ?? [],
    async adopt({ did }): Promise<AdoptedSession> {
      if (params?.adoptFails !== undefined) {
        throw params.adoptFails;
      }
      params?.onAdopt?.(did);
      return {
        did,
        client: {} as AdoptedSession["client"],
        async end() {
          ended.push(did);
        },
      };
    },
  };
  return { store, ended };
}

function fakeOAuth(params?: { signInAs?: string; signInFails?: Error }) {
  const configured = vi.fn(async () => ({}) as never);
  const popup = vi.fn(async () => {
    if (params?.signInFails !== undefined) {
      throw params.signInFails;
    }
    return (params?.signInAs ?? ALICE) as never;
  });
  return { configureOAuthClient: configured, signInPopup: popup };
}

const identity = { service: async () => "https://pds.example" };

function build(params?: Parameters<typeof fakeStore>[0]) {
  const { store, ended } = fakeStore(params);
  const oauth = fakeOAuth();
  const states: SessionState[] = [];
  const connected: string[] = [];
  const signedOut = vi.fn();
  const session = createAtprotoSession({
    oauth,
    identity,
    store,
    onChange: (state) => states.push(state),
    onConnected: (did) => connected.push(did),
    onSignedOut: signedOut,
  });
  return { session, states, connected, signedOut, ended, oauth };
}

describe("restore", () => {
  it("settles on anonymous when this browser holds no session", async () => {
    const { session, connected } = build({ sessions: [] });

    await session.restore();

    expect(session.state.status).toBe("anonymous");
    expect(session.state.did).toBeNull();
    expect(connected).toEqual([]);
  });

  it("adopts the stored session and reports who it is for", async () => {
    const { session, connected } = build({ sessions: [ALICE] });

    await session.restore();

    expect(session.state).toEqual({
      status: "connected",
      did: ALICE,
      error: null,
    });
    expect(connected).toEqual([ALICE]);
    expect(session.repoClient).toBeDefined();
  });

  it("does the work once however often it is asked", async () => {
    const adopted: string[] = [];
    const { store } = fakeStore({
      sessions: [ALICE],
      onAdopt: (did) => adopted.push(did),
    });
    const oauth = fakeOAuth();
    const session = createAtprotoSession({ oauth, identity, store });

    await Promise.all([session.restore(), session.restore()]);
    await session.restore();

    expect(adopted).toEqual([ALICE]);
    expect(oauth.configureOAuthClient).toHaveBeenCalledTimes(1);
  });

  it("reports what went wrong rather than rejecting", async () => {
    const { session } = build({
      sessions: [ALICE],
      adoptFails: new Error("the directory is unreachable"),
    });

    await expect(session.restore()).resolves.toBeUndefined();

    expect(session.state.status).toBe("error");
    expect(session.state.error).toBe("the directory is unreachable");
  });
});

describe("signIn", () => {
  it("refuses an identifier that is neither a handle nor an account", async () => {
    const { session, oauth } = build();

    await session.signIn("not a handle");

    expect(session.state.status).toBe("error");
    expect(session.state.error).toContain("not a handle");
    expect(oauth.signInPopup).not.toHaveBeenCalled();
  });

  it("accepts a handle written with a leading at sign", async () => {
    const { session, connected } = build();

    await session.signIn("@alice.example.com");

    expect(session.state.status).toBe("connected");
    expect(connected).toEqual([ALICE]);
  });
});

describe("signOut", () => {
  it("drops the session and the client with it", async () => {
    const { session, signedOut, ended } = build({ sessions: [ALICE] });
    await session.restore();

    await session.signOut();

    expect(session.state).toEqual({
      status: "anonymous",
      did: null,
      error: null,
    });
    expect(session.repoClient).toBeUndefined();
    expect(ended).toEqual([ALICE]);
    expect(signedOut).toHaveBeenCalledOnce();
  });

  it("signs this browser out even when the server will not revoke", async () => {
    const { store } = fakeStore({ sessions: [ALICE] });
    const failing: SessionStore = {
      ...store,
      adopt: async (p) => ({
        ...(await store.adopt(p)),
        end: async () => {
          throw new Error("offline");
        },
      }),
    };
    const session = createAtprotoSession({
      oauth: fakeOAuth(),
      identity,
      store: failing,
    });
    await session.restore();

    await expect(session.signOut()).resolves.toBeUndefined();

    expect(session.state.status).toBe("anonymous");
  });

  it("lets a later restore sign in again", async () => {
    const { session, connected } = build({ sessions: [ALICE] });
    await session.restore();
    await session.signOut();

    await session.restore();

    expect(session.state.status).toBe("connected");
    expect(connected).toEqual([ALICE, ALICE]);
  });
});

describe("state", () => {
  it("is replaced rather than changed, so a held value stays as it was read", async () => {
    const { session } = build({ sessions: [ALICE] });
    const before = session.state;

    await session.restore();

    expect(before).toEqual({ status: "unknown", did: null, error: null });
    expect(session.state).not.toBe(before);
  });

  it("announces every step, not only the last one", async () => {
    const { session, states } = build({ sessions: [ALICE] });

    await session.restore();

    expect(states.map((state) => state.status)).toEqual([
      "connecting",
      "connected",
    ]);
  });
});
