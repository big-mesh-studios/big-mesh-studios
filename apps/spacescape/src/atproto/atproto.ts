/**
 * Who a person is signed in as, and the record client to publish under.
 *
 * ## Why this is so small, and why that is not a shortcut
 *
 * **`packages/atproto` does the whole of the protocol** — the OAuth popup, the token store, the
 * record client, the handle lookup — and none of it names an application. What is left is three
 * signals and a `requireSession`, and the sibling project needs exactly the same three signals plus
 * a great deal more.
 *
 * The shape is taken from `apps/rm-stacker`'s `create-atproto.ts` rather than from
 * `apps/voxelscape`'s `AtprotoController`, because the latter carries an edit-chunk sync layer for
 * this world model to have and not to inherit: it is built on voxelscape's `EditLayer` over 32³
 * voxel chunks, where this engine's world is a CSG operation list (ADR 0016).
 *
 * ## Nothing here requires a session to read a place
 *
 * **A published place is public**, and voxelscape's place library is an anonymous reader for
 * exactly that reason — it builds a plain `Client` against whatever service a DID's document names
 * and carries no token. So `requireSession` is only ever reached by *writing*, and the browse and
 * load paths of Phase 4 will not go near it. A place is not behind an account to look at.
 */

import { createSignal, type Accessor } from "solid-js";

import { createIdentityLookup } from "@big-mesh-studios/atproto/identity";
import { createAtprotoSession } from "@big-mesh-studios/atproto/session";
import { createBrowserSessionStore } from "@big-mesh-studios/atproto/session-store";
import type {
  AtprotoBlobClient,
  AtprotoRepoClient,
} from "@big-mesh-studios/atproto/repo-client";

import * as oauth from "./oauth";

export type AtprotoStatus = "anonymous" | "connecting" | "connected" | "error";

/** The signed-in account: always a DID, and a name for it once one is confirmed. */
export interface Account {
  readonly did: string;
  readonly handle: string | null;
}

export interface Atproto {
  readonly status: Accessor<AtprotoStatus>;
  readonly account: Accessor<Account | null>;
  /** What went wrong in the last thing that did, for a caller to print. */
  readonly error: Accessor<string | null>;
  /**
   * The signed-in account's record client, or undefined when nobody is.
   *
   * **The non-throwing half of `requireSession`**, for the publisher: it takes getters rather than
   * a client precisely so that signing in after it was built needs no re-wiring, and a getter that
   * threw would be a publisher that cannot report "not signed in" as a value.
   */
  readonly repoClient: Accessor<
    (AtprotoRepoClient & AtprotoBlobClient) | undefined
  >;

  /**
   * Signs back in as whoever this browser was last signed in as, if anybody.
   *
   * **Not called at startup, and that is the sibling project's decision too.** Configuring the
   * OAuth client fetches a metadata document, so a session would cost a network round trip for
   * every session of this application whether or not anybody ever publishes anything. The editor's
   * Publish button is what asks.
   */
  restore(): Promise<void>;
  /** Signs in as `actor` through a popup. An empty `actor` is refused with a reason. */
  signIn(actor: string): Promise<void>;
  signOut(): Promise<void>;
  /** One line saying who is signed in, or that nobody is. */
  describe(): string;
  /**
   * The signed-in account's record client, or a refusal naming what is missing.
   *
   * **Two getters rather than a captured client**, so signing in after this was built needs no
   * re-wiring — the same reason voxelscape's publisher takes `getClient`/`getRepo`.
   */
  requireSession(): {
    client: AtprotoRepoClient & AtprotoBlobClient;
    did: string;
  };
  /**
   * The name an account is known by, or the account id when none can be confirmed.
   *
   * **The id rather than null when a lookup fails**, because the caller is a list saying who
   * published what, and an account with no confirmable handle is still an account — a blank there
   * would read as a place nobody published. That is also why this never rejects.
   */
  resolveHandle(did: string): Promise<string>;
}

export const createAtproto = (): Atproto => {
  const [status, setStatus] = createSignal<AtprotoStatus>("anonymous");
  const [account, setAccount] = createSignal<Account | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const identity = createIdentityLookup();

  const session = createAtprotoSession({
    oauth,
    identity,
    store: createBrowserSessionStore(),
    onChange(state) {
      // **"unknown" reads as anonymous**, which is what it means here: nobody has asked yet, so
      // this application has no account. The two are distinguished inside the session and nowhere
      // else, because nothing out here can act differently on them.
      setStatus(state.status === "unknown" ? "anonymous" : state.status);
      setError(state.error);
      setAccount((current) =>
        state.did === null
          ? null
          : current?.did === state.did
            ? current
            : { did: state.did, handle: null },
      );
    },
    async onConnected(did) {
      // The handle is worth waiting for and nothing waits on it: the account is signed in and
      // usable under its DID meanwhile, and shows a name the moment one is confirmed.
      const confirmed = await identity.handle(did);
      setAccount((current) =>
        current?.did === did ? { ...current, handle: confirmed } : current,
      );
    },
  });

  const requireSession = (): {
    client: AtprotoRepoClient & AtprotoBlobClient;
    did: string;
  } => {
    const signedIn = account();
    const client = session.repoClient;
    if (client === undefined || signedIn === null) {
      throw new Error("not signed in — use /account:login first");
    }
    return { client, did: signedIn.did };
  };

  return {
    status,
    account,
    error,
    repoClient: () => session.repoClient,

    restore: () => session.restore(),

    async signIn(actor) {
      if (actor.trim() === "") {
        setError("provide a handle, e.g. /account:login you.bsky.social");
        return;
      }
      await session.signIn(actor);
    },

    signOut: () => session.signOut(),

    /**
     * One line, and the words are this application's rather than the session's.
     *
     * **`packages/atproto/src/session.ts` says so about itself**: it reports state as values and
     * never as prose, because the same session backs a panel in one application and a console line
     * in another.
     */
    describe: () => {
      const signedIn = account();
      if (signedIn === null) {
        return error() === null
          ? "not signed in"
          : `not signed in — ${error() ?? ""}`.trimEnd();
      }
      const name = signedIn.handle ?? signedIn.did;
      return status() === "connecting"
        ? `signing in as ${name}…`
        : `signed in as ${name}`;
    },

    requireSession,

    async resolveHandle(did) {
      try {
        return (await identity.handle(did)) ?? did;
      } catch {
        // **A name that cannot be confirmed is not a reason to fail a listing.** The account is
        // still an account and a row that shows its id is honest; one that failed to render
        // because a resolver was slow is not.
        return did;
      }
    },
  };
};
