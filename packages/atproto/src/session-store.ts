// The sessions atcute keeps in this document's local storage, as the plain
// store a session reads and writes. Everything that knows about atcute's OAuth
// module state lives here, so the session itself can be built over a store that
// holds nothing but a map, and tested without a network or an account.
import { Client } from "@atcute/client";
import type { Did } from "@atcute/lexicons";
import {
  deleteStoredSession,
  getSession,
  listStoredSessions,
  OAuthUserAgent,
} from "@atcute/oauth-browser-client";
import { createAtprotoRepoClient } from "./repo-client";
import type { AdoptedSession, SessionStore } from "./session";

/**
 * Where this browser's own record of which account was adopted most
 * recently is kept. Atcute's own `listStoredSessions` holds no such order —
 * it hands back whatever order its database iterates keys in, which is
 * unrelated to which was signed into last — so restoring "the most recent
 * one" needs this browser's own memory of that, not atcute's.
 */
const RECENCY_KEY = "big-mesh-studios:atproto:session-recency";

/** The dids this browser remembers using, most recent first. */
const readRecency = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENCY_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    // A browser that refuses storage (private mode, a disabled origin) just
    // never remembers an order; falling back to atcute's own is no worse
    // than before this existed.
    return [];
  }
};

/** Moves `did` to the front of this browser's recency record. */
const markUsed = (did: string): void => {
  try {
    const order = readRecency().filter((d) => d !== did);
    order.unshift(did);
    localStorage.setItem(RECENCY_KEY, JSON.stringify(order));
  } catch {
    // Same as above: nothing left to fall back to but atcute's own order.
  }
};

export function createBrowserSessionStore(): SessionStore {
  return {
    stored() {
      const actual = listStoredSessions();
      const recency = readRecency();
      // Every actually-held session, ordered by this browser's own memory
      // of last use where it has one, then whatever's left in atcute's own
      // order — so a session nobody has recorded using yet (an older
      // browser profile, say) is still included rather than dropped.
      const known = new Set<string>(actual);
      const ordered = recency.filter((did) => known.has(did));
      const rest = actual.filter((did) => !ordered.includes(did));
      return [...ordered, ...rest];
    },

    async adopt({ did, resolveService }): Promise<AdoptedSession> {
      // `allowStale` accepts an expired access token rather than blocking on a
      // refresh; the agent refreshes on the first request that needs one.
      const agent = new OAuthUserAgent(
        await getSession(did as Did, { allowStale: true }),
      );
      markUsed(agent.sub);
      return {
        did: agent.sub,
        client: createAtprotoRepoClient({
          client: new Client({ handler: agent }),
          selfDid: agent.sub,
          resolveService,
        }),
        async end() {
          try {
            await agent.signOut();
          } catch {
            // Only clearing the browser's own copy actually signs it out, and
            // `signOut` is what does that when it reaches the server.
            deleteStoredSession(agent.sub);
          }
        },
      };
    },
  };
}
