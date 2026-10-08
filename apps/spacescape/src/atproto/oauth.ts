// This application's sign-in flow: the channel its popup answers over, and where
// its client metadata document is served from. Both belong to the application
// rather than to the protocol, so the package takes them rather than naming
// them itself.
import { createOAuthClient } from "@big-mesh-studios/atproto/oauth";

/**
 * Where this application's client metadata document is served from, resolved against the page's
 * own address.
 *
 * **A named function rather than the expression inline in the config**, because getting it wrong is
 * invisible until a real sign-in on the deployed site fails with a 404 for a document that is
 * sitting right there — so it is the one piece of this file a test can hold still. See the note at
 * the call site for why the page's address and not `import.meta.env.BASE_URL`.
 */
export const clientMetadataUrl = (
  page: string = window.location.href,
): string => new URL("client-metadata.json", page).href;

export const {
  configureOAuthClient,
  isOAuthCallback,
  signInPopup,
  completeSignIn,
} = createOAuthClient({
  // **Its own name, and that is not a style choice.** atproto's OAuth state and this origin's
  // `localStorage` are shared by every application served from it, and all three of this
  // repository's applications sit under one GitHub Pages origin — so a channel name another
  // application uses is a channel that answers somebody else's sign-in.
  popupChannel: "bms.spacescape.oauth",

  // **`"/"` and not `import.meta.env.BASE_URL`**, which is the one place this file could not be
  // copied from a sibling. The value is appended straight onto `http://127.0.0.1:<port>` when the
  // OAuth client builds its loopback config, and this application's `base` is `"./"` in dev as
  // well as in a build — so the environment's value is the string `"./"`, and the redirect would
  // be `http://127.0.0.1:5173./`. A sibling whose dev base is `"/"` gets `http://…:5173/` from the
  // same expression and cannot see the difference. The dev server serves this application at its
  // root whatever `base` says, so `/` is the whole of the answer.
  loopbackRedirectPath: "/",

  // **Resolved against the page's own address, which is the other place a sibling's form does not
  // transfer.** rm-stacker's `new URL("client-metadata.json", new URL(BASE_URL, origin))` resolves
  // a relative base against the *origin*, so for this application it would look for the document at
  // `https://…github.io/client-metadata.json` rather than under `/big-mesh-studios/spacescape/`.
  // The page's own URL already carries the subdirectory, so resolving against it is correct in dev
  // and on Pages alike — and there is no router here, so a page's address is always this
  // application's own directory whatever query or fragment it is reached with.
  clientMetadataUrl: () => clientMetadataUrl(),
});
