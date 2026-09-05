// The vocabulary of a published place, at both of its addresses: the atproto
// record a place is listed and joined by, and the `manifest.json` its zip is
// read by. Both describe the same thing — a world named by a seed, a spawn, and
// the scripts that turn it into a game — so they share the fields a browser
// needs in order to list a place or boot its world without ever downloading the
// zip. The manifest stays in the zip because it also names the script files;
// publishing copies its world fields into the record, and a zip is fetched only
// when a place's scripts actually run.
import type { Blob as LexBlob } from "@atcute/lexicons";
import type { Dim3 } from "../world/level-data";

/** The collection published places are written to. */
export const PLACE_COLLECTION = "app.bms.voxelscape.place";
/** The media type a place zip is uploaded under. */
export const PLACE_MIME_TYPE = "application/zip";
/** The file inside the zip that carries a place's manifest. */
export const PLACE_MANIFEST_FILE = "manifest.json";
/** The longest a place's name may be, and so the longest its record key may grow from. */
export const MAX_PLACE_NAME = 256;
/** The furthest a place's spawn may lie from the origin, in world units. */
export const MAX_PLACE_SPAWN = 10_000_000;
/** The most script files one place may name. */
export const MAX_PLACE_SCRIPTS = 64;
/** The longest one script file name may be. */
export const MAX_SCRIPT_FILE = 256;

/** Where a place's player starts, in world units; the ground height is derived. */
export type PlaceSpawn = [number, number, number];

/**
 * The top of a place zip: the world the scripts run on and the files that run.
 * The scripts are named here but not described — what a script file may hold is
 * the script runtime's vocabulary, added when that arrives.
 */
export type PlaceManifest = {
  /** What the place is called, as it was typed, punctuation and all. */
  name: string;
  /** Terrain seed every peer generates the same world from. */
  seed: number;
  /** Where the player starts, in world units. */
  spawn: PlaceSpawn;
  /** The script files in the zip, named relative to its root. */
  scripts?: string[];
};

/**
 * One published place, as it sits in a repository. A type alias rather than an
 * interface, so it stays assignable to the `Record<string, unknown>` an atproto
 * record body is typed as.
 */
export type PlaceRecord = {
  $type: typeof PLACE_COLLECTION;
  name: string;
  seed: number;
  spawn: PlaceSpawn;
  createdAt: string;
  /** The place zip, byte for byte. */
  file: LexBlob;
};

/** A place record as it was found, with where it was found. */
export interface PublishedPlace {
  repo: string;
  rkey: string;
  record: PlaceRecord;
}

const isSpawn = (v: unknown): v is PlaceSpawn => {
  if (!Array.isArray(v) || v.length !== 3) {
    return false;
  }
  return v.every(
    (n) =>
      typeof n === "number" &&
      Number.isFinite(n) &&
      Math.abs(n) <= MAX_PLACE_SPAWN,
  );
};

const isShortName = (v: unknown): boolean =>
  typeof v === "string" && v.length >= 1 && v.length <= MAX_PLACE_NAME;

const isBlob = (v: unknown): v is LexBlob => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const { ref, mimeType } = v as Record<string, unknown>;
  return (
    typeof mimeType === "string" &&
    typeof ref === "object" &&
    ref !== null &&
    typeof (ref as Record<string, unknown>)["$link"] === "string"
  );
};

/**
 * Whether `v` is a place manifest this world can open. A zip picked up from a
 * device or a repository was written by somebody else, so nothing about its
 * shape is assumed.
 */
export const isPlaceManifest = (v: unknown): v is PlaceManifest => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  if (!isShortName(r.name)) {
    return false;
  }
  if (typeof r.seed !== "number" || !Number.isFinite(r.seed)) {
    return false;
  }
  if (!isSpawn(r.spawn)) {
    return false;
  }
  if (r.scripts === undefined) {
    return true;
  }
  if (!Array.isArray(r.scripts) || r.scripts.length > MAX_PLACE_SCRIPTS) {
    return false;
  }
  return r.scripts.every(
    (file) =>
      typeof file === "string" &&
      file.length >= 1 &&
      file.length <= MAX_SCRIPT_FILE &&
      !file.startsWith("/") &&
      !file.includes(".."),
  );
};

/**
 * Whether `v` is a place record this world can open. Everything read from a
 * repository was written by somebody else's client, so a record missing the
 * blob or a world it can boot is passed over rather than listed.
 */
export const isPlaceRecord = (v: unknown): v is PlaceRecord => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    r.$type === PLACE_COLLECTION &&
    isShortName(r.name) &&
    typeof r.seed === "number" &&
    Number.isFinite(r.seed) &&
    isSpawn(r.spawn) &&
    typeof r.createdAt === "string" &&
    isBlob(r.file)
  );
};

/**
 * The record key a place called `name` is published under. Deriving it from the
 * name is what makes a second publish of the same place an edit of the first,
 * the way a model's republish replaces what everyone was reading.
 */
export function placeRkey(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_~]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 512);

  if (key === "") {
    throw new Error(`"${name}" holds no letters or digits to name a place by`);
  }

  return key;
}

/** The record a zip's manifest becomes, once its file has been uploaded. */
export const makePlaceRecord = (
  manifest: PlaceManifest,
  createdAt: string,
  file: LexBlob,
): PlaceRecord => ({
  $type: PLACE_COLLECTION,
  name: manifest.name,
  seed: manifest.seed,
  spawn: manifest.spawn,
  createdAt,
  file,
});

/** The `at://` address a published place is joined by. */
export const placeAtUri = (repo: string, rkey: string): string =>
  `at://${repo}/${PLACE_COLLECTION}/${rkey}`;

/**
 * Parses an `at://` address back into the place it names, or null when the
 * address is not a place in this collection.
 */
export const parsePlaceAtUri = (
  uri: string,
): { repo: string; rkey: string } | null => {
  const match = /^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(uri);
  if (match === null || match[2] !== PLACE_COLLECTION) {
    return null;
  }
  return { repo: match[1], rkey: match[3] };
};

/** The world a place record boots: the seed and spawn it was published with. */
export const placeWorld = (
  record: PlaceRecord,
): { seed: number; spawn: Dim3 } => ({
  seed: record.seed,
  spawn: record.spawn,
});
