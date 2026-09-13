// Where a lossy-tolerant preview picture — an avatar, a model's thumbnail —
// is actually fetched from: a caching image proxy, rather than the account's
// own PDS. wsrv.nl is a free, publicly run one that needs no account and no
// server of this world's own to keep running.
//
// This is never the right address for a side or a section's face: those
// pixels are palette indices, not a photograph, and nothing here promises
// them back untouched.
const CDN = "https://wsrv.nl/";

/** `url` wrapped so it is fetched, and cached, through the CDN instead of directly. */
export function cdnImageUrl(url: string): string {
  return `${CDN}?url=${encodeURIComponent(url)}`;
}
