// The page shown when a document is loaded as the OAuth redirect. It exists
// only to finish a popup login: `completeSignIn` exchanges the callback
// parameters off the URL hash, reports the signed-in DID to the opener over a
// same-origin BroadcastChannel, and this closes the window. None of that needs
// the game, so this renders instead of `<App/>` for that one load rather than
// booting the whole 3D scene just to throw it away — besides the waste, that
// heavier boot was also delaying (and risked altogether preventing, on any
// error along the way) the popup ever reaching the code that closes it.
import { createSignal, type Component } from "solid-js";
import { completeSignIn } from "./oauth";

export const OAuthCallbackPage: Component = () => {
  const [status, setStatus] = createSignal("finishing sign-in…");

  // the component body runs once, same as App.tsx's own fire-and-forget
  // `void atproto.init()` — there's no reactive dependency to key an effect
  // off, so no onMount-equivalent is needed
  void (async () => {
    try {
      const did = await completeSignIn();
      if (window.opener) {
        setStatus("signed in — closing…");
        window.close();
      } else {
        // opened directly, not as a popup (e.g. a stale/reloaded tab)
        setStatus(`signed in as ${did} — you can close this window`);
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
