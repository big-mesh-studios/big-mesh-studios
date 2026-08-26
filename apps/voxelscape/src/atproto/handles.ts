// Turning a peer's DID into the handle to show for them. A DID document
// carries its own handle in `alsoKnownAs`, but that entry is written by
// whoever controls the DID and by nobody else, so on its own it is a claim:
// any account can name itself `someone-else.bsky.social`. The handle only
// becomes a name worth showing once resolving it in the other direction —
// handle to DID, through DNS or the account's `/.well-known` document, which
// only the handle's owner controls — leads back to the same DID.

/** The handle a DID document claims for itself: its first `at://` alias. */
export const claimedHandle = (document: {
  alsoKnownAs?: readonly string[];
}): string | null => {
  const prefix = "at://";
  for (const alias of document.alsoKnownAs ?? []) {
    if (alias.startsWith(prefix)) {
      const handle = alias.slice(prefix.length);
      return handle === "" ? null : handle;
    }
  }
  return null;
};

/**
 * The confirmed handle for `did`, or null when there is none to show: no
 * claim in the document, a claim that resolves to a different DID, or a
 * handle that cannot be resolved at all (an expired domain, a directory that
 * is unreachable right now).
 *
 * @param resolveDid Resolves a handle to the DID it points at, rejecting when
 * it points at nothing.
 */
export const confirmHandle = async (params: {
  did: string;
  document: { alsoKnownAs?: readonly string[] };
  resolveDid: (handle: string) => Promise<string>;
}): Promise<string | null> => {
  const handle = claimedHandle(params.document);
  if (handle === null) {
    return null;
  }
  try {
    return (await params.resolveDid(handle)) === params.did ? handle : null;
  } catch {
    return null;
  }
};
