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
import { dumpOAuthDatabase } from "./oauth-debug";

export const OAuthCallbackPage: Component = () => {
  const [status, setStatus] = createSignal("finishing sign-in…");

  // the component body runs once, same as App.tsx's own fire-and-forget
  // `void atproto.init()` — there's no reactive dependency to key an effect
  // off, so no onMount-equivalent is needed
  void (async () => {
    // Captured immediately, before oauth.init() runs: the library strips
    // these from the URL via history.replaceState() as one of its first
    // steps, well before the (slower, async) state lookup that can fail —
    // reading them any later, e.g. from a catch block, sees an already-
    // cleared URL and not the real params.
    const rawParams =
      location.hash.length > 1
        ? new URLSearchParams(location.hash.slice(1))
        : new URLSearchParams(location.search);
    const urlState = rawParams.get("state");
    const dumpBefore = await dumpOAuthDatabase().catch(
      (dumpErr) => `(failed to dump db: ${String(dumpErr)})`,
    );
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
      // Debugging a callback failure: show this window's own storage
      // connection both before and after the failed lookup, alongside the
      // state key the URL actually carried — directly comparable against
      // the parent window's /oauthdb output to check whether this window
      // even sees what the parent wrote, and whether the lookup that just
      // failed changed anything.
      const dumpAfter = await dumpOAuthDatabase().catch(
        (dumpErr) => `(failed to dump db: ${String(dumpErr)})`,
      );
      setStatus(
        [
          `sign-in failed: ${err instanceof Error ? err.message : String(err)}`,
          `callback url state param: ${urlState}`,
          `this window's own IndexedDB view BEFORE the lookup:`,
          dumpBefore,
          `this window's own IndexedDB view AFTER the lookup:`,
          dumpAfter,
        ].join("\n\n"),
      );
    }
  })();

  return (
    <div
      style={{
        position: "absolute",
        inset: "0",
        background: "#111",
        color: "#ddd",
        font: "12px monospace",
        padding: "24px",
        "white-space": "pre-wrap",
        "word-break": "break-all",
        overflow: "auto",
      }}
    >
      {status()}
    </div>
  );
};
