import "./index.css";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import { render } from "@solidjs/web";
import App from "./App";
import { OAuthCallbackPage } from "./atproto/oauth-callback-page";

// atproto's OAuth loopback client requires the literal 127.0.0.1 origin
// (RFC 8252 disallows "localhost" as a redirect_uri host), but Vite's own
// dev-server banner prints "http://localhost:5173/" — an easy link to open
// or bookmark by mistake. "localhost" and "127.0.0.1" are different origins
// as far as the browser's storage is concerned, so a page loaded on
// "localhost" and the OAuth popup (always forced onto "127.0.0.1") end up
// with two completely separate IndexedDB stores: every login attempt then
// fails with "Unknown authorization session", since the popup never sees
// the pending session the parent window wrote. Redirect once, in place,
// before anything else boots, so this can't happen by accident.
if (window.location.hostname === "localhost") {
  const url = new URL(window.location.href);
  url.hostname = "127.0.0.1";
  window.location.replace(url.href);
} else {
  // The OAuth redirect_uri lands here as a real page load (no client-side
  // router involved) — render the minimal callback page instead of booting
  // the whole game for a window that's just going to close itself.
  const isOAuthCallback = window.location.pathname === "/oauth/callback";

  render(
    () => (isOAuthCallback ? <OAuthCallbackPage /> : <App />),
    document.getElementById("root")!,
  );
}
