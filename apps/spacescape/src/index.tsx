import { render } from "@solidjs/web";

import App from "./app";
import { isOAuthCallback } from "./atproto/oauth";
import { OAuthCallbackPage } from "./atproto/oauth-callback-page";
// The mobile baseline first, so that this application's own rules win wherever the
// two have the same specificity. See `index.css` for why this is a JavaScript import
// rather than a CSS `@import`.
import "@big-mesh-studios/ui/baseline.css";

import "./index.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error(
    "The #root element is missing. It is declared in index.html, and every " +
      "other assumption in this file is downstream of it being there.",
  );
}

// atproto's OAuth loopback client requires the literal 127.0.0.1 origin (RFC 8252 disallows
// "localhost" as a redirect_uri host), but Vite's own dev-server banner prints
// "http://localhost:5173/" — an easy link to open or bookmark by mistake. "localhost" and
// "127.0.0.1" are different origins as far as browser storage is concerned, so a page loaded on
// "localhost" and the OAuth popup (always forced onto 127.0.0.1) end up with two completely
// separate localStorage stores: every login attempt then fails with "unknown state provided",
// since the popup never sees the pending authorization the parent window wrote. Redirect once, in
// place, before anything else boots, so this cannot happen by accident.
if (window.location.hostname === "localhost") {
  const url = new URL(window.location.href);
  url.hostname = "127.0.0.1";
  window.location.replace(url.href);
} else {
  // The OAuth redirect_uri lands here as a real page load — no client-side router involved —
  // so render the minimal callback page instead of booting the whole world for a window that is
  // just going to close itself. Booting the 3D scene for that load would be wasted work, and on
  // any error along the way it would also delay the popup reaching the code that closes it.
  const callback = isOAuthCallback();

  render(() => (callback ? <OAuthCallbackPage /> : <App />), root);
}
