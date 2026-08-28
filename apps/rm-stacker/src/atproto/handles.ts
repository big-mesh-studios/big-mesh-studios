// Turning a DID into the handle to show for it. A DID document carries its own
// handle in `alsoKnownAs`, but that entry is written by whoever controls the
// DID and by nobody else, so on its own it is a claim: any account can name
// itself `someone-else.bsky.social`. The handle only becomes a name worth
// showing once resolving it in the other direction — handle to DID, through the
// domain name system or the account's own `/.well-known` document, which only
// the handle's owner controls — leads back to the same DID.

/** The handle a DID document claims for itself: its first `at://` alias. */
export function claimedHandle(document: { alsoKnownAs?: readonly string[] }): string | null {
  const prefix = "at://";

  for (const alias of document.alsoKnownAs ?? []) {
    if (alias.startsWith(prefix)) {
      const handle = alias.slice(prefix.length);
      return handle === "" ? null : handle;
    }
  }

  return null;
}

/**
 * The confirmed handle for `did`, or null when there is none to show: no claim
 * in the document, a claim that resolves to a different DID, or a handle that
 * cannot be resolved at all — an expired domain, or a directory that is
 * unreachable right now. A caller with nothing to show falls back to the DID,
 * which is ugly and is nobody else's name.
 *
 * @param resolveDid Resolves a handle to the DID it points at, rejecting when
 * it points at nothing.
 */
export async function confirmHandle(params: {
  did: string;
  document: { alsoKnownAs?: readonly string[] };
  resolveDid: (handle: string) => Promise<string>;
}): Promise<string | null> {
  const handle = claimedHandle(params.document);

  if (handle === null) {
    return null;
  }

  try {
    return (await params.resolveDid(handle)) === params.did ? handle : null;
  } catch {
    return null;
  }
}
