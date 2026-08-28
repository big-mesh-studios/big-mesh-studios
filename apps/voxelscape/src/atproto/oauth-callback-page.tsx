import styles from "./oauth-callback-page.module.css";
// The page shown when a document is loaded as the OAuth redirect. It exists
// only to finish a popup login: `completeSignIn` exchanges the callback
// parameters off the URL hash, reports the signed-in DID to the opener over a
// same-origin BroadcastChannel, and this closes the window. None of that needs
// the game, so this renders instead of `<App/>` for that one load rather than
// booting the whole 3D scene just to throw it away — besides the waste, that
// heavier boot was also delaying (and risked altogether preventing, on any
// error along the way) the popup ever reaching the code that closes it.
import {
  createEffect,
  createMemo,
  createSignal,
  type Component,
} from "solid-js";
import { completeSignIn } from "./oauth";

/** How long to let `window.close()` take effect before admitting it failed. */
const CLOSE_GRACE_MS = 500;

export const OAuthCallbackPage: Component = () => {
  const [status, setStatus] = createSignal("finishing sign-in…");
  const did = createMemo(completeSignIn);

  createEffect(did, (did) => {
    setStatus("signed in — closing…");
    // Closed unconditionally rather than only when `window.opener` is set:
    // the authorization server's Cross-Origin-Opener-Policy nulls the opener
    // on the way here, so that test rejects the very popups this page exists
    // to close.
    window.close();
    // Anything the browser refuses to close — a tab opened by hand, say —
    // would otherwise sit on "closing…" for good.
    setTimeout(
      () => setStatus(`signed in as ${did} — you can close this window`),
      CLOSE_GRACE_MS,
    );
  });

  return <output class={styles.status}>{status()}</output>;
};
