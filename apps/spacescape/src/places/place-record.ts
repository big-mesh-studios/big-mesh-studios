/**
 * A place as it sits in a repository: the record `app.bms.spacescape.place` names, the key it is
 * published under, and the `at://` address it is shared by.
 *
 * ## A place on disk and a place published are the same thing, described twice
 *
 * The zip in `load-place.ts` is how a place travels between people who already have each other,
 * and this is how one travels between people who do not — a URL, a repository, an identity. They
 * carry the same program, and `makePlaceRecord` and `projectFromRecord` are the two directions
 * between them, so the zip cannot drift from the record without one of those refusing to round
 * trip.
 *
 * The reference implementation is `big-mesh-studios`'s `apps/voxelscape/src/places/place.ts` and
 * `apps/voxelscape/src/atproto/places.ts`. What is carried over is the addressing and the
 * discipline; what is dropped is every part of it that names something this engine does not have.
 *
 * ## The version field, and why there is no migration chain yet
 *
 * **Every record carries `version: 1`, including the first one.** A record lives in its owner's
 * repository rather than in a database this project controls, so a record already published can
 * only ever change if its owner republishs it — there is no migration to run over what is already
 * out there, and the only lever a reader has is interpreting whichever version it finds. A field
 * that is absent from every record already written cannot be added to them, which is why it is
 * written now rather than when the first shape change arrives.
 *
 * `packages/atproto`'s `versionedRecord` is the mechanism for reading across those changes, and
 * it is not used here **because there is only ever one version to read.** A chain with a single
 * schema is a version check that has been spelled at length. The first shape change adds
 * `.upgradesTo(...)`, and a record written before it keeps opening.
 *
 * ## What a record does not carry
 *
 * **No models.** A model is bytes, an atproto record is JSON, and carrying one means uploading it
 * as a blob and naming the blob by URI and CID — which needs a publisher, and needs a model to have
 * an identity at all. `apps/sdf-modeller`'s project file has none: no name, no UUID, no content
 * hash, so the file name is the only handle that exists (ADR 0033). A `models` field here would be
 * a promise about a thing that cannot be honoured yet, which is the failure mode ADR 0017 exists
 * to avoid.
 *
 * **No levels and no mode.** Same reasoning and the same source: voxelscape's manifest carries
 * both, and `place-file.ts` records why this engine's does not.
 */

import {
  isPlaceManifest,
  isSafePathName,
  MAX_PLACE_FILES,
  type PlaceSpawn,
} from "./place-file";
import { MAX_PLACE_SOURCE, MAX_SCRIPT_SOURCE } from "./limits";

/** The collection published places are written to. */
export const PLACE_COLLECTION = "app.bms.spacescape.place";

/**
 * The shape a record published by this build has.
 *
 * **One, and the field is required.** See the note about versions above: every record this engine
 * has ever written carries a `version`, so a record without one is not a record of this format at
 * an older version — it is something else, and refusing it is the honest answer. A reader meeting
 * a version this build does not know returns null, which is what makes publishing a change
 * reversible from the reader's side.
 */
export const PLACE_RECORD_VERSION = 1;

/** One of a place's script files, as a record carries it: the source inline, not a reference. */
export interface PlaceScriptRecord {
  readonly name: string;
  readonly source: string;
}

/**
 * One published place, as it sits in a repository.
 *
 * A type rather than an interface, so it stays assignable to the `Record<string, unknown>` an
 * atproto record body is typed as.
 *
 * `spawn` is optional and omitted rather than written as null when a place has none, so a record
 * reads exactly as a publish before the field existed would have written it.
 */
export type PlaceRecord = {
  $type: typeof PLACE_COLLECTION;
  version: typeof PLACE_RECORD_VERSION;
  name: string;
  seed: number;
  spawn?: PlaceSpawn;
  entry: string;
  createdAt: string;
  scripts: readonly PlaceScriptRecord[];
};

/**
 * A record as it was found: which repository holds it, and under which key.
 *
 * **The pair travels with the record rather than being reconstructible from it.** `name` is what a
 * place is called and `placeRkey` usually derives the key from it — but a record can be read under
 * any key somebody put it at, and a second account's place with the same name is a different place.
 * Anything that wants to fetch, list or open this again needs the address, not the name.
 */
export interface PublishedPlace {
  readonly repo: string;
  readonly rkey: string;
  readonly record: PlaceRecord;
}

/**
 * What a network-wide listing answered: the places it found, and whether it stopped at one of its
 * ceilings with places or accounts left unread.
 *
 * **`capped` is reported rather than hidden**, because a listing that quietly showed the first two
 * hundred places is indistinguishable from a network that only has two hundred — and a browser
 * that says "these are all of them" when they are not is the one failure mode worth spending a
 * field to avoid.
 */
export interface PlaceListing {
  readonly places: readonly PublishedPlace[];
  readonly capped: boolean;
}
/**
 * Whether a value read out of a repository is a record this can open.
 *
 * **Everything read from a repository was written by somebody else's client**, so nothing about
 * its shape is assumed and nothing is coerced — the same rule `isPlaceManifest` states for a zip,
 * applied to bytes from further away. A record that names a script it does not carry, or a script
 * whose source is over the limit, is passed over rather than listed: a place that will not open
 * should not be one of the places somebody is offered.
 *
 * **The world fields are checked by `isPlaceManifest` rather than by rules written here.** A
 * record's `name`, `seed`, `spawn`, `entry` and script names *are* a manifest — the same five
 * fields, with the same rules and the same refusals — so the predicate that gates a zip gates this
 * too, and a change to what a place may say is a change in one place.
 */
export const isPlaceRecord = (value: unknown): value is PlaceRecord => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;

  if (record.$type !== PLACE_COLLECTION) return false;
  if (record.version !== PLACE_RECORD_VERSION) return false;

  // **A non-empty string and not a date.** `lex.datetimeString` would say more, but it is the
  // one validation library in this repository's dependency graph that a zip does not need, and a
  // record's `createdAt` is never read as anything but something to display.
  if (typeof record.createdAt !== "string" || record.createdAt.length === 0) {
    return false;
  }

  const scripts = recordScripts(record.scripts);
  if (scripts === null) return false;

  return isPlaceManifest({
    name: record.name,
    seed: record.seed,
    spawn: record.spawn,
    entry: record.entry,
    scripts: scripts.map((script) => script.name),
  });
};

/**
 * Reads a record's scripts, or null when the list is not one this can open.
 *
 * **Three bounds, and the total is the one that matters.** A record has already been transferred
 * and parsed by the time it reaches here, so unlike the zip path nothing is being decompressed as
 * it is checked — which makes the total a limit on what a repository can make a browser hold in
 * memory rather than a limit on what is retained, and it is the same `MAX_PLACE_SOURCE` for the
 * same reason: the product of `MAX_PLACE_FILES` and `MAX_SCRIPT_SOURCE` is forty million characters
 * of TypeScript arriving into a tab that then compiles it.
 */
const recordScripts = (value: unknown): readonly PlaceScriptRecord[] | null => {
  if (!Array.isArray(value)) return null;
  if (value.length === 0 || value.length > MAX_PLACE_FILES) return null;

  const scripts: PlaceScriptRecord[] = [];
  const seen = new Set<string>();
  let characters = 0;

  for (const script of value) {
    if (typeof script !== "object" || script === null) return null;
    const { name, source } = script as Record<string, unknown>;

    if (typeof name !== "string" || !isSafePathName(name)) return null;
    if (seen.has(name)) return null;
    seen.add(name);

    if (typeof source !== "string") return null;
    if (source.length > MAX_SCRIPT_SOURCE) return null;
    characters += source.length;
    if (characters > MAX_PLACE_SOURCE) return null;

    scripts.push({ name, source });
  }

  return scripts;
};

/**
 * The record key a place called `name` is published under.
 *
 * **Deriving it from the name is what makes a second publish of the same place an edit of the
 * first**, the way a model's republish replaces what everyone was reading. A key generated per
 * publish would give every save of an unchanged place a new address, and a shared link would stop
 * naming the place it named an hour ago.
 *
 * Two places whose names normalise to the same key are therefore the same published place. That is
 * the price of addressing a place by what it is called, and it is the same price voxelscape pays.
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

/** The `at://` address a published place is joined by. */
export const placeAtUri = (repo: string, rkey: string): string =>
  `at://${repo}/${PLACE_COLLECTION}/${rkey}`;

/**
 * Parses an `at://` address back into the place it names, or null when the address is not a place
 * in this collection.
 *
 * **A handle is not a repository.** The pattern asks for a `did:`, so an address somebody typed as
 * `at://you.bsky.social/...` is refused rather than resolved — resolving a handle is a network
 * round trip through a directory this code does not otherwise own, and a publisher that has
 * already been handed a DID should hand over that.
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
