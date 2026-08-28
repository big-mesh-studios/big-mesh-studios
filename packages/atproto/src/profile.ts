// The picture an account shows for itself. Every atproto account keeps one
// profile record in its own repo, and the picture in it is a blob: the record
// holds only its content identifier, and the bytes are fetched from the server
// that hosts the account. Both halves therefore come from the account's own
// server, with no image service in between.
//
// The record belongs to Bluesky's profile vocabulary rather than to either
// application here, because that is the profile people already have — somebody
// who has never heard of these programs still arrives with a face.

/** Where an account's profile lives, one record per repo. */
export const PROFILE_COLLECTION = "app.bsky.actor.profile";
export const PROFILE_RKEY = "self";

/**
 * The content identifier of the picture in a profile record, or null when the
 * record holds no picture or is not a profile record at all. The value comes
 * off the network, so nothing about its shape is assumed.
 */
export const pictureBlobCid = (record: unknown): string | null => {
  if (typeof record !== "object" || record === null) {
    return null;
  }
  const avatar = (record as { avatar?: unknown }).avatar;
  if (typeof avatar !== "object" || avatar === null) {
    return null;
  }
  const ref = (avatar as { ref?: unknown }).ref;
  if (typeof ref !== "object" || ref === null) {
    return null;
  }
  const link = (ref as { $link?: unknown })["$link"];
  return typeof link === "string" && link !== "" ? link : null;
};

/**
 * The address the bytes of `cid` are fetched from, on the server hosting
 * `did`'s repo.
 *
 * @param service That server's base address, without a trailing slash.
 */
export const pictureBlobUrl = (
  service: string,
  did: string,
  cid: string,
): string =>
  `${service}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(
    did,
  )}&cid=${encodeURIComponent(cid)}`;
