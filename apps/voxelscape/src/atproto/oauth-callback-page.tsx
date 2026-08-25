// The page served at the OAuth redirect_uri (`/oauth/callback`). It exists
// only to finish a popup login: `oauth.init()` reads the callback params off
// the URL, exchanges them, and (per `@atproto/oauth-client-browser`) signals
// the opener over a same-origin BroadcastChannel and closes itself. None of
// that needs the game, so this renders instead of `<App/>` for this one
// route rather than booting the whole 3D scene just to throw it away —
// besides the waste, that heavier boot was also delaying (and risked
// altogether preventing, on any error along the way) the popup ever reaching
// the code that closes it.
import { createSignal, type Component } from "solid-js";
import { buildOAuthClient } from "./atproto-controller";

export const OAuthCallbackPage: Component = () => {
  const [status, setStatus] = createSignal("finishing sign-in…");

  // the component body runs once, same as App.tsx's own fire-and-forget
  // `void atproto.init()` — there's no reactive dependency to key an effect
  // off, so no onMount-equivalent is needed
  void (async () => {
    try {
      const oauth = await buildOAuthClient({});
      const result = await oauth.init();
      if (result === undefined) {
        setStatus("no sign-in in progress — you can close this window");
        return;
      }
      if (window.opener) {
        setStatus("signed in — closing…");
        window.close();
      } else {
        // opened directly, not as a popup (e.g. a stale/reloaded tab)
        setStatus(
          `signed in as ${result.session.sub} — you can close this window`,
        );
      }
    } catch (err) {
      setStatus(
        `sign-in failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })();

  return (
    <div
      style={{
        position: "absolute",
        inset: "0",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        background: "#111",
        color: "#ddd",
        font: "14px monospace",
        padding: "24px",
        "text-align": "center",
      }}
    >
      {status()}
    </div>
  );
};
