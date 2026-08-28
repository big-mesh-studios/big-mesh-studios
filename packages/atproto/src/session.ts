// Being signed in to an account, and stopping being signed in. Owns the whole
// of that and nothing else: which account it is, whether the sign-in is
// settled, what went wrong if it did not, and the record client to make calls
// with. What an application then does with that client — publishing drawings,
// syncing world edits — is its own business.
//
// Nothing here reports in prose. The state is reported as values and the
// caller says what it means in its own words, because the same session backs a
// panel in one application and a console line in another.
import { isActorIdentifier } from "@atcute/lexicons/syntax";
import type { OAuthClient } from "./oauth";
import type { IdentityLookup } from "./identity";
import type { AtprotoBlobClient, AtprotoRepoClient } from "./repo-client";

export type SessionStatus =
  /** Nobody has asked yet whether this browser is signed in. */
  "unknown" | "anonymous" | "connecting" | "connected" | "error";

export interface SessionState {
  status: SessionStatus;
  /** Who is signed in, or null when nobody is. */
  did: string | null;
  /** What went wrong in the last thing that did, or null. */
  error: string | null;
}

/** A session this browser holds, once adopted. */
export interface AdoptedSession {
  did: string;
  client: AtprotoRepoClient & AtprotoBlobClient;
  /** Revokes with the server and clears this browser's copy, whichever of the two works. */
  end(): Promise<void>;
}

/**
 * Where this browser keeps the sessions it has. It outlives any one
 * `AtprotoSession`: signing in writes here, and a later session in the same
 * document finds what was written and adopts it again.
 */
export interface SessionStore {
  /** Every account this browser holds a session for, most recent first. */
  stored(): string[];
  adopt(params: {
    did: string;
    /** Resolves which server holds a given account's records. */
    resolveService(did: string): Promise<string>;
  }): Promise<AdoptedSession>;
}

export interface AtprotoSession {
  /** The current state, replaced rather than changed, so it can be held as one value. */
  readonly state: SessionState;
  /** The record client for the signed-in account, or undefined when nobody is. */
  readonly repoClient: (AtprotoRepoClient & AtprotoBlobClient) | undefined;
  /**
   * Signs back in as whoever this browser was last signed in as, if anybody.
   * Does the work at most once however often it is called, because configuring
   * the client fetches a document and neither that nor adopting is worth doing
   * twice.
   */
  restore(): Promise<void>;
  /** Signs in as `actor` through a popup, and stays signed in across reloads. */
  signIn(actor: string): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Lets go of the session this object holds. The browser's own copy outlives
   * it, so a later session in the same document restores the same account.
   */
  dispose(): void;
}

export function createAtprotoSession(params: {
  /** This application's sign-in flow, from `createOAuthClient`. */
  oauth: Pick<OAuthClient, "configureOAuthClient" | "signInPopup">;
  identity: Pick<IdentityLookup, "service">;
  store: SessionStore;
  /** Called after every change to `state`, so a caller can show it. */
  onChange?(state: SessionState): void;
  /** Called once a session is adopted, whether restored or freshly signed in. */
  onConnected?(did: string): void;
  /** Called after the session is dropped. */
  onSignedOut?(): void;
}): AtprotoSession {
  const { oauth, identity, store } = params;

  let state: SessionState = { status: "unknown", did: null, error: null };
  let adopted: AdoptedSession | undefined;
  let restoring: Promise<void> | undefined;

  const set = (next: Partial<SessionState>) => {
    state = { ...state, ...next };
    params.onChange?.(state);
  };

  const fail = (cause: unknown) =>
    set({
      status: "error",
      error: cause instanceof Error ? cause.message : String(cause),
    });

  const adopt = async (did: string) => {
    adopted = await store.adopt({
      did,
      resolveService: (target) => identity.service(target),
    });
    set({ status: "connected", did: adopted.did, error: null });
    params.onConnected?.(adopted.did);
  };

  return {
    get state() {
      return state;
    },
    get repoClient() {
      return adopted?.client;
    },

    restore() {
      restoring ??= (async () => {
        try {
          set({ status: "connecting", error: null });
          await oauth.configureOAuthClient();
          // Asked only after configuring, which is what opens the store.
          const [stored] = store.stored();
          if (stored === undefined) {
            set({ status: "anonymous" });
            return;
          }
          await adopt(stored);
        } catch (cause) {
          fail(cause);
        }
      })();
      return restoring;
    },

    async signIn(actor) {
      const identifier = actor.trim().replace(/^@/, "");
      if (!isActorIdentifier(identifier)) {
        set({
          status: state.did === null ? "error" : "connected",
          error: `"${actor}" is not a handle or an account identifier`,
        });
        return;
      }
      try {
        set({ status: "connecting", error: null });
        await oauth.configureOAuthClient();
        await adopt(await oauth.signInPopup({ identifier }));
      } catch (cause) {
        fail(cause);
      }
    },

    async signOut() {
      // A revoke that fails — offline, or a token the server has already
      // dropped — still has to sign this browser out, and `end` is what clears
      // the browser's own copy either way.
      await adopted?.end().catch(() => {});
      adopted = undefined;
      restoring = undefined;
      set({ status: "anonymous", did: null, error: null });
      params.onSignedOut?.();
    },

    dispose() {
      adopted = undefined;
    },
  };
}
