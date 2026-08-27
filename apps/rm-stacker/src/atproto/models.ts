// The shape a sprite stack takes once it is a record in somebody's repository.
// The drawing itself stays exactly the file the editor already saves — the zip
// of six indexed pngs and a palette — uploaded as a blob and referred to from
// the record by its content identifier. The record around it holds only what a
// browser needs in order to list models without downloading any of them.
import type { Blob as LexBlob } from "@atcute/lexicons";
import type { Dimensions3D } from "../maths";

/**
 * The collection sprite stacks are written to. It belongs to this editor, and
 * says nothing about what a model is eventually for: a game reading these
 * records is a reader of somebody's drawings, and the drawings were not made
 * for it.
 */
export const MODEL_COLLECTION = "app.bms.stacker.model";

/** The media type the zip is uploaded under. */
export const MODEL_MIME_TYPE = "application/zip";

/**
 * One published sprite stack. Declared as a type alias rather than an interface
 * so it stays assignable to the `Record<string, unknown>` an atproto record
 * body is typed as — TypeScript infers an implicit index signature for the one
 * and not the other.
 */
export type ModelRecord = {
  $type: typeof MODEL_COLLECTION;
  /** What the model is called, as it was typed, punctuation and all. */
  name: string;
  createdAt: string;
  /** The zip the editor saves, byte for byte. */
  file: LexBlob;
  /** The model's extent in voxels, so a listing can be described without it. */
  dimensions: Dimensions3D;
};

/** A record as it was found in a repository, with the key it was found under. */
export interface PublishedModel {
  repo: string;
  rkey: string;
  record: ModelRecord;
}

/**
 * The record key a model called `name` is published under. Publishing under a
 * key derived from the name rather than a fresh one each time is what makes a
 * second publish an edit of the first: the same drawing, touched up, replaces
 * what everyone was reading rather than sitting next to it.
 *
 * A key may hold letters, digits and `.-_:~` and nothing else, so every other
 * character becomes a hyphen and runs of them collapse. A name that survives
 * none of that — punctuation only, or nothing at all — has no key to be found
 * under, and the caller is told to ask for a different one.
 */
export function modelRkey(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_~]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 512);

  if (key === "") {
    throw new Error(`"${name}" holds no letters or digits to name a record by`);
  }

  return key;
}

function isDimensions(value: unknown): value is Dimensions3D {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { width, height, depth } = value as Record<string, unknown>;
  return typeof width === "number" && typeof height === "number" && typeof depth === "number";
}

function isBlob(value: unknown): value is LexBlob {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { ref, mimeType } = value as Record<string, unknown>;
  return (
    typeof mimeType === "string" &&
    typeof ref === "object" &&
    ref !== null &&
    typeof (ref as Record<string, unknown>)["$link"] === "string"
  );
}

/**
 * Whether `value` is a model record this editor can open. Everything read from
 * a repository was written by somebody else's client, so nothing about its
 * shape is assumed: a record missing the blob, or naming dimensions it does not
 * have, is passed over rather than listed and then failing to open.
 */
export function isModelRecord(value: unknown): value is ModelRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record["$type"] === MODEL_COLLECTION &&
    typeof record["name"] === "string" &&
    typeof record["createdAt"] === "string" &&
    isBlob(record["file"]) &&
    isDimensions(record["dimensions"])
  );
}

/** The content identifier of the zip in `record`. */
export function modelBlobCid(record: ModelRecord): string {
  return record.file.ref.$link;
}

/**
 * The address the bytes of `cid` are fetched from, on the server hosting `did`'s
 * repository. Blobs are public, so this needs no session — which is what lets
 * anybody open a model published by an account they are not signed in as.
 *
 * @param service That server's base address, without a trailing slash.
 */
export function blobUrl(service: string, did: string, cid: string): string {
  return `${service}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}
