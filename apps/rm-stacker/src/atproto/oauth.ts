// This editor's own sign-in flow: the channel name its popup answers over, and
// where its client metadata document is served from. Both belong to the
// application rather than the protocol, so the package takes them rather than
// naming them itself.
import { createOAuthClient } from "@big-mesh-studios/atproto/oauth";

export const {
  configureOAuthClient,
  isOAuthCallback,
  signInPopup,
  completeSignIn,
} = createOAuthClient({
  popupChannel: "rm-stacker.oauth",
  loopbackRedirectPath: import.meta.env.BASE_URL,
  // Resolved against the folder the application sits in rather than the page
  // being shown: the document lives beside the application, and asking relative
  // to the current address would look for it beside whichever page happened to
  // be open.
  clientMetadataUrl: () =>
    new URL(
      "client-metadata.json",
      new URL(import.meta.env.BASE_URL, window.location.origin),
    ).href,
});
