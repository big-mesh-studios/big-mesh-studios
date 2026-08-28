import "./index.css";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import { render } from "@solidjs/web";
import App from "./App";
import { isOAuthCallback } from "./atproto/oauth";
import { OAuthCallbackPage } from "./atproto/OAuthCallbackPage";

// Signing in against a development server only works on the literal 127.0.0.1
// address, RFC 8252 disallowing "localhost" as a redirect target — but Vite
// prints "http://localhost:5173/" as the address to open. The two are separate
// origins as far as storage is concerned, so a page opened on one and the
// sign-in popup, always forced onto the other, keep two entirely separate
// stores: the popup never sees the pending authorization the editor wrote, and
// every attempt fails with "unknown state provided". Move across once, before
// anything else starts, so that cannot happen by accident.
if (window.location.hostname === "localhost") {
  const url = new URL(window.location.href);
  url.hostname = "127.0.0.1";
  window.location.replace(url.href);
} else {
  // The sign-in popup lands back here as a real page load, with no router in
  // between — render the page that finishes it rather than the editor.
  render(
    () => (isOAuthCallback() ? <OAuthCallbackPage /> : <App />),
    document.getElementById("root")!,
  );
}
