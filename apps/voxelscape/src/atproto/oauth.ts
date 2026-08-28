// This world's own sign-in flow: the channel name its popup answers over, and
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
  popupChannel: "bms.voxelscape.oauth",
  loopbackRedirectPath: "/oauth/callback",
  clientMetadataUrl: () =>
    new URL("client-metadata.json", window.location.href).href,
});
