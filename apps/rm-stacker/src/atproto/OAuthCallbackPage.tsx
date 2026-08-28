// What the page shows when it was loaded as the OAuth redirect. It exists only
// to finish a popup sign-in: the callback parameters are exchanged for a
// session, the account's DID is reported to the window that opened this one,
// and this closes itself. None of that needs the editor, so this renders in its
// place for that one load rather than booting the whole thing — the model, both
// views and the preview's WebGL context — for a window about to disappear.
import { createSignal, type Component } from "solid-js";
import { completeSignIn } from "./oauth";

/** How long to let `window.close()` take effect before admitting it failed. */
const CLOSE_GRACE_MS = 500;

export const OAuthCallbackPage: Component = () => {
  const [status, setStatus] = createSignal("finishing sign-in…");

  void (async () => {
    try {
      const did = await completeSignIn();
      setStatus("signed in — closing…");
      // Closed without first checking `window.opener`: the authorization
      // server's Cross-Origin-Opener-Policy empties that on the way here, so
      // the check would reject the very popups this page exists to close.
      window.close();
      // Anything the browser refuses to close — a tab opened by hand, say —
      // would otherwise sit on "closing…" for good.
      setTimeout(
        () => setStatus(`signed in as ${did} — you can close this window`),
        CLOSE_GRACE_MS,
      );
    } catch (error) {
      setStatus(
        `sign-in failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  })();

  return (
    <div
      style={{
        position: "absolute",
        inset: "0",
        display: "grid",
        "place-content": "center",
        "text-align": "center",
        padding: "24px",
        color: "var(--front)",
        font: "14px monospace",
      }}
    >
      {status()}
    </div>
  );
};
