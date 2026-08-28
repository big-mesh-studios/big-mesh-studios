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

export function createBrowserSessionStore(): SessionStore {
  return {
    stored() {
      return listStoredSessions();
    },

    async adopt({ did, resolveService }): Promise<AdoptedSession> {
      // `allowStale` accepts an expired access token rather than blocking on a
      // refresh; the agent refreshes on the first request that needs one.
      const agent = new OAuthUserAgent(
        await getSession(did as Did, { allowStale: true }),
      );
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
