// The OAuth client configuration and the popup sign-in flow. atcute's browser
// OAuth client is configured through module-level state and keeps its sessions
// in localStorage, so the popup and its opener each configure it the same way
// and the popup hands back only a DID — the opener reads the session out of
// shared storage itself.
//
// An application builds its own client with `createOAuthClient`, because the
// two values that differ between applications must differ: two applications
// served from one origin share that localStorage and would otherwise answer
// each other's sign-ins over the same channel.
import { LocalActorResolver } from "@atcute/identity-resolver";
import type { ActorIdentifier, Did } from "@atcute/lexicons";
import {
  configureOAuth,
  createAuthorizationUrl,
  finalizeAuthorization,
} from "@atcute/oauth-browser-client";
import { createDidDocumentResolver, createHandleResolver } from "./identity";

/** Requested when the client metadata document does not name a scope itself. */
const DEFAULT_SCOPE = "atproto transition:generic";

const POPUP_FEATURES = "popup=1,width=600,height=720";

/**
 * How long the opener waits for the popup before giving up on the sign-in.
 * There is no way to notice a popup being dismissed by hand — see
 * `awaitSignIn` — so this timeout is the only thing that ends an abandoned
 * attempt. It stays under the ten minutes atcute keeps the pending
 * authorization for, so a sign-in that outlives it would have failed anyway.
 */
const SIGN_IN_TIMEOUT_MS = 5 * 60_000;

/** What the popup reports back to whichever window opened it. */
export type SignInResult = { did: Did } | { error: string };

export interface OAuthClientOptions {
  /**
   * Same-origin channel name the popup reports its result over. Two
   * applications on one origin must not share a name, or each will see the
   * other's sign-ins.
   */
  popupChannel: string;
  /**
   * The path the authorization server sends the browser back to, used to build
   * the loopback `redirect_uri` during local development.
   */
  loopbackRedirectPath: string;
  /**
   * Where the hosted client metadata document is served from, asked for only
   * when no `client_id` is given and the page is not running on loopback — so
   * an application may work out the address from the current one without that
   * happening on a loopback page that will never use it.
   */
  clientMetadataUrl: () => string;
}

/** What the authorization server is told this application is, once resolved. */
export interface ClientConfig {
  /** The `client_id` the authorization server identifies this app by. */
  clientId: string;
  /** Must match the document's own URL for `finalizeAuthorization` to work. */
  redirectUri: string;
  scope: string;
}

/**
 * The sign-in flow for one application: its popup channel, its loopback
 * redirect, and its metadata document. Build one per application — atcute's
 * OAuth module state is global, so a second client would reconfigure the first.
 */
export function createOAuthClient(options: OAuthClientOptions) {
  /**
   * A loopback client_id is self-describing: the authorization server derives the
   * client's redirect_uri and scope from this URL's own query string rather than
   * from a hosted metadata document, which is what lets local development work
   * without a server. The redirect_uri's host must be the loopback address, not
   * "localhost" (RFC 8252 disallows "localhost" as a redirect_uri host), so an
   * application served on localhost has to redirect itself to 127.0.0.1 first.
   */
  function buildLoopbackConfig(): ClientConfig {
    const port = window.location.port || "5173";
    const redirectUri = `http://127.0.0.1:${port}${options.loopbackRedirectPath}`;
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      scope: DEFAULT_SCOPE,
    });
    return {
      clientId: `http://localhost?${params.toString()}`,
      redirectUri,
      scope: DEFAULT_SCOPE,
    };
  }

  function isLoopbackEnvironment(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  }

  /**
   * Reads the redirect URI and scope out of a hosted client metadata document.
   * atcute needs both up front — it never fetches the document itself — and
   * taking them from the same JSON the authorization server will read keeps
   * client and server in agreement.
   */
  async function loadHostedConfig(metadataUrl: string): Promise<ClientConfig> {
    const response = await fetch(metadataUrl, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `could not load client metadata from ${metadataUrl} (${response.status})`,
      );
    }

    const metadata = (await response.json()) as {
      redirect_uris?: string[];
      scope?: string;
    };
    const redirectUri = metadata.redirect_uris?.[0];

    if (redirectUri === undefined) {
      throw new Error(
        `client metadata at ${metadataUrl} lists no redirect_uris`,
      );
    }

    return {
      clientId: metadataUrl,
      redirectUri,
      scope: metadata.scope ?? DEFAULT_SCOPE,
    };
  }

  async function resolveClientConfig(
    clientId: string | undefined,
  ): Promise<ClientConfig> {
    if (clientId !== undefined) {
      return loadHostedConfig(clientId);
    }
    if (isLoopbackEnvironment()) {
      return buildLoopbackConfig();
    }
    return loadHostedConfig(options.clientMetadataUrl());
  }

  let configuring: Promise<ClientConfig> | undefined;

  /**
   * Configures atcute's OAuth module state for this document, at most once —
   * `configureOAuth` overwrites module-level variables and opens a fresh
   * localStorage-backed session store each time it runs. Returns the resolved
   * config because the scope is needed again when authorization starts.
   */
  function configureOAuthClient(clientId?: string): Promise<ClientConfig> {
    configuring ??= (async () => {
      const config = await resolveClientConfig(clientId);
      configureOAuth({
        metadata: {
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
        },
        identityResolver: new LocalActorResolver({
          handleResolver: createHandleResolver(),
          didDocumentResolver: createDidDocumentResolver(),
        }),
      });
      return config;
    })();
    return configuring;
  }

  /**
   * Whether this document was loaded as the OAuth redirect. atcute asks for
   * `response_mode=fragment`, so the callback parameters arrive in the hash. The
   * parameters are what identifies the load, not the path: the deployed
   * `redirect_uris` points at the site root, because GitHub Pages has no
   * single-page fallback that could serve a dedicated callback path.
   */
  function isOAuthCallback(): boolean {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.has("state") && (params.has("code") || params.has("error"));
  }

  function publishSignIn(result: SignInResult): void {
    const channel = new BroadcastChannel(options.popupChannel);
    channel.postMessage(result);
    channel.close();
  }

  /**
   * Resolves once the popup reports a DID over the shared channel, and rejects if
   * it reports a failure or nothing at all before the timeout.
   *
   * The popup handle is deliberately not watched. Authorization servers send
   * `Cross-Origin-Opener-Policy`, which moves the popup into its own browsing
   * context group the moment it navigates: from here `popup.closed` then reads
   * `true` for a window that is alive and showing the login form, and treating
   * that as an abort cancels every sign-in a second after it starts. The channel
   * is the only link that survives, so it is the only one used.
   */
  function awaitSignIn(): Promise<Did> {
    return new Promise((resolve, reject) => {
      const channel = new BroadcastChannel(options.popupChannel);
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const settle = (finish: () => void) => {
        clearTimeout(timeout);
        channel.close();
        finish();
      };

      channel.onmessage = (event: MessageEvent<SignInResult>) => {
        const result = event.data;
        if ("did" in result) {
          settle(() => resolve(result.did));
        } else {
          settle(() => reject(new Error(result.error)));
        }
      };

      timeout = setTimeout(() => {
        settle(() => reject(new Error("sign-in was not completed in time")));
      }, SIGN_IN_TIMEOUT_MS);
    });
  }

  /**
   * Signs `identifier` in through a popup and resolves to the account's DID,
   * whose session atcute has by then written to this origin's localStorage.
   */
  async function signInPopup(params: {
    identifier: ActorIdentifier;
    clientId?: string;
  }): Promise<Did> {
    // Opened before the first await: a popup that is not a direct result of the
    // click which started the sign-in is blocked by default.
    const popup = window.open("about:blank", "_blank", POPUP_FEATURES);

    if (popup === null) {
      throw new Error("sign-in popup was blocked — allow popups for this site");
    }

    try {
      const config = await configureOAuthClient(params.clientId);
      const url = await createAuthorizationUrl({
        target: { type: "account", identifier: params.identifier },
        scope: config.scope,
        display: "popup",
      });
      // Listening starts before the popup navigates, so a fast authorization
      // server cannot answer into a window that has nobody watching yet.
      const signedIn = awaitSignIn();
      popup.location.href = url.href;
      return await signedIn;
    } catch (error) {
      // Only reachable before the popup has navigated anywhere, which is also the
      // only time closing it from here still works.
      popup.close();
      throw error;
    }
  }

  /**
   * Runs in the popup: exchanges the callback parameters for a session, which
   * atcute persists to localStorage where the opener's `getSession` will find it,
   * and reports the account's DID over the shared channel. Reports the failure
   * over the same channel instead, so a waiting opener is not left hanging until
   * the window is closed.
   */
  async function completeSignIn(): Promise<Did> {
    try {
      await configureOAuthClient();
      const params = new URLSearchParams(window.location.hash.slice(1));
      // Scrub the callback parameters so a reload cannot replay them.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      const { session } = await finalizeAuthorization(params);
      publishSignIn({ did: session.info.sub });
      return session.info.sub;
    } catch (error) {
      publishSignIn({
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  return {
    configureOAuthClient,
    isOAuthCallback,
    signInPopup,
    completeSignIn,
  };
}

/** The flow `createOAuthClient` hands back. */
export type OAuthClient = ReturnType<typeof createOAuthClient>;
