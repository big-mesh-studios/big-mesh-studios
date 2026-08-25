import "./index.css";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import { render } from "@solidjs/web";
import App from "./App";
import { OAuthCallbackPage } from "./atproto/oauth-callback-page";

// The OAuth redirect_uri lands here as a real page load (no client-side
// router involved) — render the minimal callback page instead of booting
// the whole game for a window that's just going to close itself.
const isOAuthCallback = window.location.pathname === "/oauth/callback";

render(
  () => (isOAuthCallback ? <OAuthCallbackPage /> : <App />),
  document.getElementById("root")!,
);
