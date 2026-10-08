/**
 * This application's sign-in flow, as far as it can be held still.
 *
 * ## What is worth testing here
 *
 * **One expression, and it is the only one in the file that can be wrong silently.** `createOAuthClient`
 * is `packages/atproto`'s and tested there; the popup channel is a string a test can only repeat back
 * to itself. The client metadata URL is different: it is built from the page's own address, and on the
 * deployed site a mistake in it is a 404 for a document that is sitting right there — discovered only
 * by a person attempting a real sign-in.
 *
 * **It is a real mistake and not a hypothetical one.** This application's `base` is `"./"` in dev as
 * well as in a build, so the sibling form `new URL("client-metadata.json", new URL(BASE_URL, origin))`
 * resolves `"./"` against the **origin** and looks for the document at the root of
 * `big-mesh-studios.github.io` rather than under `/big-mesh-studios/spacescape/`. A sibling whose dev
 * base is `"/"` cannot reproduce that, which is exactly why the reasoning is in the source rather than
 * in a memory.
 */

import { describe, expect, it } from "vitest";

import { clientMetadataUrl } from "./oauth";

describe("where the client metadata document is looked for", () => {
  it("is beside the application on the deployed site", () => {
    // **The case the relative-base mistake gets wrong.** The page's address carries the
    // subdirectory, so resolving against it lands under the application rather than at the origin.
    expect(
      clientMetadataUrl(
        "https://big-mesh-studios.github.io/big-mesh-studios/spacescape/",
      ),
    ).toBe(
      "https://big-mesh-studios.github.io/big-mesh-studios/spacescape/client-metadata.json",
    );
  });

  it("ignores a query or a fragment, because a page is reached with both", () => {
    // **`?edit` and `#state=…` are how this application is entered**, so a resolution that treated
    // them as part of the path would look for the document beside a route. The OAuth callback in
    // particular arrives with the whole authorization answer in the fragment.
    for (const suffix of ["?edit", "#state=abc&code=xyz", "?lod=off#x"]) {
      expect(
        clientMetadataUrl(
          `https://big-mesh-studios.github.io/big-mesh-studios/spacescape/${suffix}`,
        ),
        suffix,
      ).toBe(
        "https://big-mesh-studios.github.io/big-mesh-studios/spacescape/client-metadata.json",
      );
    }
  });

  it("is at the dev server's root, which is where that server serves this app", () => {
    // **The loopback case, and the one the loopback redirect depends on agreeing with it.** atproto
    // requires the literal `127.0.0.1` host (RFC 8252 forbids `localhost` as a redirect host), which
    // is why `index.tsx` redirects to it before anything boots.
    expect(clientMetadataUrl("http://127.0.0.1:5173/")).toBe(
      "http://127.0.0.1:5173/client-metadata.json",
    );
  });

  it("does not resolve against the origin, which is the mistake being guarded", () => {
    // **Stated as its own assertion so the failure names the bug.** If this ever passes while the
    // three above fail, the expression has been replaced by the sibling's form — and the symptom on
    // the deployed site would be a sign-in that cannot start.
    const page =
      "https://big-mesh-studios.github.io/big-mesh-studios/spacescape/";
    expect(clientMetadataUrl(page)).not.toBe(
      "https://big-mesh-studios.github.io/client-metadata.json",
    );
  });
});
