// The vocabulary of a published place, at both of its addresses: the atproto
// record a place is listed and joined by, and the `manifest.json` a place zip
// exported to or read from a device is read by. A published place carries its
// scripts and its levels inline and names each attached model by the
// `app.bms.stacker.model` record it is a strong reference to, rather than
// embedding a zip's worth of bytes nobody but this world could open; a zip
// stays the shape a place takes on disk, and the manifest inside it is still
// what names that zip's own script, level, and model files.
import type { Dim3 } from "../world/level-data";

/** The collection published places are written to. */
export const PLACE_COLLECTION = "app.bms.voxelscape.place";
/** The media type a place zip exported to, or read from, a device is written under. */
export const PLACE_MIME_TYPE = "application/zip";
/** The file inside a zip that carries a place's manifest. */
export const PLACE_MANIFEST_FILE = "manifest.json";
/** The longest one script's inlined source may run, in characters. */
export const MAX_SCRIPT_SOURCE = 100_000;
/** The longest a place's name may be, and so the longest its record key may grow from. */
export const MAX_PLACE_NAME = 256;
/** The furthest a place's spawn may lie from the origin, in world units. */
export const MAX_PLACE_SPAWN = 10_000_000;
/** The most script files one place may name. */
export const MAX_PLACE_SCRIPTS = 64;
/** The longest one script file name may be. */
export const MAX_SCRIPT_FILE = 256;
/** The longest one level file name may be, extension included. */
export const MAX_LEVEL_FILE = 128;
/** The most model files one place may carry. */
export const MAX_PLACE_MODELS = 64;
/** The longest one model file name may be. */
export const MAX_MODEL_FILE = 256;
/** The most level files one place may carry. */
export const MAX_PLACE_LEVELS = 8;
/** The longest one level file's plan may run, in characters. */
export const MAX_LEVEL_SOURCE = 32_000;
/** The extension a level file is named under, and so the one a level's name loses to become the name a script addresses it by. */
export const LEVEL_FILE_EXTENSION = ".json";

/**
 * The bare name a level file is addressed by in a script, or null for a file
 * that is not one. A level is a `.json` file in the place's flat namespace, so
 * the extension is the whole of what tells it apart from a script file — the
 * same job `.zip` does for a model.
 */
export const levelSpecifierFor = (file: string): string | null =>
  file.toLowerCase().endsWith(LEVEL_FILE_EXTENSION)
    ? file.slice(0, -LEVEL_FILE_EXTENSION.length)
    : null;

/** The file name a level addressed as `name` is stored under. */
export const levelFileFor = (name: string): string =>
  `${name}${LEVEL_FILE_EXTENSION}`;

/**
 * This site's own address, fixed regardless of which origin is currently
 * serving it. A built-in demo isn't a published place and has no `at://`
 * address of its own, so its identity is derived from this instead.
 */
export const DEFAULT_WORLD_URL =
  "https://big-mesh-studios.github.io/big-mesh-studios/voxelscape/";

/** Where a place's player starts, in world units; the ground height is derived. */
export type PlaceSpawn = [number, number, number];

/**
 * How a place handles other players and their edits: `solo`/`solo:edit` never
 * start multiplayer, `multi`/`multi:edit` do; the `:edit` half decides whether
 * anyone can change blocks at all, and if so whether those edits stay private
 * to whoever made them or become part of what every later visitor sees.
 */
export type PlaceMode = "solo" | "solo:edit" | "multi" | "multi:edit";

/** Every value `PlaceMode` may hold, for validating one read from a manifest or record. */
export const PLACE_MODES: readonly PlaceMode[] = [
  "solo",
  "solo:edit",
  "multi",
  "multi:edit",
];

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
  /** The level files in the zip, named relative to its root. */
  levels?: string[];
  /** The rm-stacker model files in the zip, named relative to its root. */
  models?: string[];
  /** How this place handles other players and their edits; unset on a place published before this existed. */
  mode?: PlaceMode;
};

/** One script of a published place, its source written straight into the record. */
export type PlaceScriptRecord = {
  /** The name a place's manifest and its other scripts import it by. */
  name: string;
  source: string;
};

/**
 * One level a published place carries, its plan written straight into the
 * record beside the scripts it is read by. A level is a plan, not code: it
 * travels as text exactly as the `onPlan` handler's return value would, and a
 * script reaches it by name rather than carrying a copy inline.
 */
export type PlaceLevelRecord = {
  /** The name a place's scripts address this level by (`plan("hub")`). */
  name: string;
  source: string;
};

/**
 * One model a published place has attached, referenced by the
 * `app.bms.stacker.model` record that holds it rather than a copy of its
 * bytes — every attached model is published somewhere by the time a place
 * naming it is, whether that publish belongs to whoever made the place or was
 * made just to give this one a place of its own to point at.
 */
export type PlaceModelRef = {
  /** The name a place's scripts attach and address it by (`createNpc({ model: name })`). */
  name: string;
  uri: string;
  cid: string;
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
  scripts: PlaceScriptRecord[];
  levels?: PlaceLevelRecord[];
  models: PlaceModelRef[];
  /** How this place handles other players and their edits; unset on a place published before this existed. */
  mode?: PlaceMode;
};

/** A place record as it was found, with where it was found. */
export interface PublishedPlace {
  repo: string;
  rkey: string;
  record: PlaceRecord;
}

/** What a network-wide listing answered: the places it found, and whether it stopped at one of its ceilings with places or accounts left unread. */
export interface PlaceListing {
  places: PublishedPlace[];
  capped: boolean;
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

/** Whether `v` is a valid `PlaceMode`, or absent — either is fine on a manifest or record. */
const isPlaceMode = (v: unknown): v is PlaceMode | undefined =>
  v === undefined || PLACE_MODES.includes(v as PlaceMode);

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
  if (!isPlaceMode(r.mode)) {
    return false;
  }
  return (
    isFileList(r.scripts, MAX_PLACE_SCRIPTS, MAX_SCRIPT_FILE) &&
    isFileList(r.levels, MAX_PLACE_LEVELS, MAX_LEVEL_FILE) &&
    isFileList(r.models, MAX_PLACE_MODELS, MAX_MODEL_FILE) &&
    hasDistinctLevels(r)
  );
};

/**
 * Whether the level files a manifest names are levels, and that no script or
 * model file already holds. A place's files share one flat namespace, so the
 * extension is the whole of what tells a level from a script, and two lists
 * naming one file would leave the zip's own contents to decide which of them
 * meant it.
 */
const hasDistinctLevels = (r: Record<string, unknown>): boolean => {
  const levels = r.levels;
  if (levels === undefined) {
    return true;
  }
  if (!Array.isArray(levels)) {
    return false;
  }
  const taken = new Set([...asNames(r.scripts), ...asNames(r.models)]);
  const specifiers = new Set<string>();
  return levels.every((file) => {
    if (typeof file !== "string") {
      return false;
    }
    const specifier = levelSpecifierFor(file);
    if (specifier === null || specifier === "" || taken.has(file)) {
      return false;
    }
    // Two files whose names differ only in case would answer one name from
    // two plans, so the second is refused rather than left to win by order.
    const key = specifier.toLowerCase();
    if (specifiers.has(key)) {
      return false;
    }
    specifiers.add(key);
    return true;
  });
};

/** The file names `v` lists, or none at all for anything that is not a list of strings. */
const asNames = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((name): name is string => typeof name === "string")
    : [];

/**
 * Whether `v` is a list of project-relative file names this world will read,
 * or nothing at all. A name may not be absolute or climb out of the zip with a
 * parent segment, whatever a hand-written manifest says.
 */
const isFileList = (
  v: unknown,
  maxCount: number,
  maxLength: number,
): boolean => {
  if (v === undefined) {
    return true;
  }
  return (
    Array.isArray(v) &&
    v.length <= maxCount &&
    v.every(
      (file) =>
        typeof file === "string" &&
        file.length >= 1 &&
        file.length <= maxLength &&
        !file.startsWith("/") &&
        !file.includes(".."),
    )
  );
};

const isRecordScripts = (v: unknown): v is PlaceScriptRecord[] =>
  Array.isArray(v) &&
  v.length <= MAX_PLACE_SCRIPTS &&
  v.every((script) => {
    if (typeof script !== "object" || script === null) {
      return false;
    }
    const { name, source } = script as Record<string, unknown>;
    return (
      typeof name === "string" &&
      name.length >= 1 &&
      name.length <= MAX_SCRIPT_FILE &&
      !name.startsWith("/") &&
      !name.includes("..") &&
      typeof source === "string" &&
      source.length <= MAX_SCRIPT_SOURCE
    );
  });

const isRecordModels = (v: unknown): v is PlaceModelRef[] =>
  Array.isArray(v) &&
  v.length <= MAX_PLACE_MODELS &&
  v.every((model) => {
    if (typeof model !== "object" || model === null) {
      return false;
    }
    const { name, uri, cid } = model as Record<string, unknown>;
    return (
      typeof name === "string" &&
      name.length >= 1 &&
      name.length <= MAX_MODEL_FILE &&
      !name.startsWith("/") &&
      !name.includes("..") &&
      typeof uri === "string" &&
      typeof cid === "string"
    );
  });

/**
 * Whether `v` is a place record's list of levels. A level's name is a bare
 * word, never a file name: the extension belongs to the zip file it is written
 * as, and a name carrying one could name a script file as readily as a plan.
 */
const isRecordLevels = (v: unknown): v is PlaceLevelRecord[] =>
  v === undefined ||
  (Array.isArray(v) &&
    v.length <= MAX_PLACE_LEVELS &&
    v.every((level) => {
      if (typeof level !== "object" || level === null) {
        return false;
      }
      const { name, source } = level as Record<string, unknown>;
      return (
        typeof name === "string" &&
        name.length >= 1 &&
        name.length <= MAX_LEVEL_FILE &&
        !name.includes(".") &&
        !name.includes("/") &&
        !name.includes("\\") &&
        typeof source === "string" &&
        source.length <= MAX_LEVEL_SOURCE
      );
    }));

/**
 * Whether `v` is a place record this world can open. Everything read from a
 * repository was written by somebody else's client, so a record naming a
 * script, level, or model reference it cannot make sense of is passed over
 * rather than listed.
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
    isRecordScripts(r.scripts) &&
    isRecordLevels(r.levels) &&
    isRecordModels(r.models) &&
    isPlaceMode(r.mode)
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

/** The record a place's world fields, scripts and attached models become. */
export const makePlaceRecord = (
  manifest: Pick<PlaceManifest, "name" | "seed" | "spawn" | "mode">,
  createdAt: string,
  scripts: PlaceScriptRecord[],
  models: PlaceModelRef[],
  levels: PlaceLevelRecord[] = [],
): PlaceRecord => ({
  $type: PLACE_COLLECTION,
  name: manifest.name,
  seed: manifest.seed,
  spawn: manifest.spawn,
  createdAt,
  scripts,
  // A place carrying no level carries no level list at all, so a reader sees
  // exactly the record a publish before levels existed would have written.
  ...(levels.length > 0 ? { levels } : {}),
  models,
  ...(manifest.mode !== undefined ? { mode: manifest.mode } : {}),
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
