// The shape a sprite stack takes once it is a record in somebody's repository.
// Every drawing — each part's six sides, and the two faces of each cut across
// it — is its own image blob, so a viewer that only wants to show one picture
// never has to fetch the rest. What isn't a drawing — a part's placement, its
// palette, what it does over time — is carried in the record itself, typed by
// this lexicon rather than left as an opaque file only this editor can open.
import type { Blob as LexBlob } from "@atcute/lexicons";
import type { Dimensions3D, RGBA } from "@big-mesh-studios/maths";
import { Vector3D, type Bitmap } from "@big-mesh-studios/maths";
import {
  dimensionKinds,
  sideKinds,
  type DimensionKind,
  type Part,
  type Section,
  type SideKind,
  type Sides,
} from "./data";
import type { Ease, Motion } from "./motion";
import { decodeSidePng, encodeSidePng } from "./side-image";

/**
 * The collection sprite stacks are written to. It belongs to this editor, and
 * says nothing about what a model is eventually for: a game reading these
 * records is a reader of somebody's drawings, and the drawings were not made
 * for it.
 */
export const MODEL_COLLECTION = "app.bms.stacker.model";

/** The media type every drawing — a side, a section's face, the small picture — is uploaded under. */
export const THUMBNAIL_MIME_TYPE = "image/png";

/**
 * A vector as a record holds it. The AT Protocol data model has no
 * floating-point number — only integers, alongside strings, bytes and the
 * rest — and a root, a pivot or a turn is genuinely fractional (a box with an
 * odd extent centres its pivot half a voxel in), so each axis is written out
 * as the decimal string it prints as, rather than a number the protocol would
 * refuse the whole record over.
 */
export type RecordVector3D = { x: string; y: string; z: string };

/** One box of a published figure, its drawings each their own blob. */
export type ModelPartRecord = {
  name: string;
  root: RecordVector3D;
  pivot: RecordVector3D;
  turn: RecordVector3D;
  /** How large the part is drawn, as the decimal string it prints as — see `RecordVector3D`. */
  scale: string;
  /** The name of the part this one hangs off, or null for one hanging off the figure. */
  parent: string | null;
  sides: Record<SideKind, LexBlob>;
  sections: {
    axis: DimensionKind;
    at: number;
    before: LexBlob;
    after: LexBlob;
  }[];
};

/** A pose one key of a published motion stands in — see `RecordVector3D`. */
export type ModelKeyRecord = {
  at: number;
  ease: Ease;
  root: RecordVector3D;
  turn: RecordVector3D;
  scale: string;
};

/** What a figure does over time, as a record holds it. */
export type ModelMotionRecord = {
  name: string;
  framesPerSecond: number;
  loop: boolean;
  parts: { part: string; keys: ModelKeyRecord[] }[];
};

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
  /** The figure's extent in voxels, so a listing can be described without fetching any of its drawings. */
  dimensions: Dimensions3D;
  palette: RGBA[];
  parts: ModelPartRecord[];
  /** What the figure does over time, in no particular order. */
  motions: ModelMotionRecord[];
  /**
   * A small picture to show for the model, so a listing does not have to fetch
   * and solve every model it lists. Optional, and absent from anything
   * published before there was one: a listing falls back to showing the name
   * and the extent, both of which the record already carries.
   */
  thumbnail?: LexBlob;
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
  return (
    typeof width === "number" &&
    typeof height === "number" &&
    typeof depth === "number"
  );
}

function isRecordVector3D(value: unknown): value is RecordVector3D {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { x, y, z } = value as Record<string, unknown>;
  return (
    typeof x === "string" && typeof y === "string" && typeof z === "string"
  );
}

/** `vector` as the record writes one — see `RecordVector3D`. */
function toRecordVector3D(vector: Vector3D): RecordVector3D {
  return { x: `${vector.x}`, y: `${vector.y}`, z: `${vector.z}` };
}

/** The vector `vector` holds, as the record wrote it. */
function fromRecordVector3D(vector: RecordVector3D): Vector3D {
  return Vector3D.create(Number(vector.x), Number(vector.y), Number(vector.z));
}

function isRGBA(value: unknown): value is RGBA {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { r, g, b, a } = value as Record<string, unknown>;
  return (
    typeof r === "number" &&
    typeof g === "number" &&
    typeof b === "number" &&
    typeof a === "number"
  );
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

const EASE_VALUES: Ease[] = ["linear", "in", "out", "in-out", "hold"];

function isSides(value: unknown): value is Record<SideKind, LexBlob> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return sideKinds.every((side) =>
    isBlob((value as Record<string, unknown>)[side]),
  );
}

function isSections(value: unknown): value is ModelPartRecord["sections"] {
  return (
    Array.isArray(value) &&
    value.every((section) => {
      if (typeof section !== "object" || section === null) {
        return false;
      }
      const { axis, at, before, after } = section as Record<string, unknown>;
      return (
        dimensionKinds.includes(axis as DimensionKind) &&
        typeof at === "number" &&
        isBlob(before) &&
        isBlob(after)
      );
    })
  );
}

function isPart(value: unknown): value is ModelPartRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { name, root, pivot, turn, scale, parent, sides, sections } =
    value as Record<string, unknown>;
  return (
    typeof name === "string" &&
    isRecordVector3D(root) &&
    isRecordVector3D(pivot) &&
    isRecordVector3D(turn) &&
    typeof scale === "string" &&
    (parent === null || typeof parent === "string") &&
    isSides(sides) &&
    isSections(sections)
  );
}

function isMotions(value: unknown): value is ModelMotionRecord[] {
  return (
    Array.isArray(value) &&
    value.every((motion) => {
      if (typeof motion !== "object" || motion === null) {
        return false;
      }
      const { name, framesPerSecond, loop, parts } = motion as Record<
        string,
        unknown
      >;
      return (
        typeof name === "string" &&
        typeof framesPerSecond === "number" &&
        typeof loop === "boolean" &&
        Array.isArray(parts) &&
        parts.every((entry) => {
          if (typeof entry !== "object" || entry === null) {
            return false;
          }
          const { part, keys } = entry as Record<string, unknown>;
          return (
            typeof part === "string" &&
            Array.isArray(keys) &&
            keys.every((key) => {
              if (typeof key !== "object" || key === null) {
                return false;
              }
              const { at, ease, root, turn, scale } = key as Record<
                string,
                unknown
              >;
              return (
                typeof at === "number" &&
                EASE_VALUES.includes(ease as Ease) &&
                isRecordVector3D(root) &&
                isRecordVector3D(turn) &&
                typeof scale === "string"
              );
            })
          );
        })
      );
    })
  );
}

/**
 * Whether `value` is a model record this editor can open. Everything read from
 * a repository was written by somebody else's client, so nothing about its
 * shape is assumed: a record missing a drawing, or naming dimensions it does
 * not have, is passed over rather than listed and then failing to open.
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
    isDimensions(record["dimensions"]) &&
    Array.isArray(record["palette"]) &&
    (record["palette"] as unknown[]).every(isRGBA) &&
    Array.isArray(record["parts"]) &&
    (record["parts"] as unknown[]).every(isPart) &&
    isMotions(record["motions"]) &&
    (record["thumbnail"] === undefined || isBlob(record["thumbnail"]))
  );
}

/** The content identifier of the model's picture, or null when it has none. */
export function thumbnailBlobCid(record: ModelRecord): string | null {
  return isBlob(record.thumbnail) ? record.thumbnail.ref.$link : null;
}

/**
 * The address the bytes of `cid` are fetched from, on the server at `service`
 * hosting `did`'s repository — its base address, without a trailing slash.
 * Blobs are public, so this needs no session, which is what lets anybody open
 * a model published by an account they are not signed in as.
 */
export function blobUrl(service: string, did: string, cid: string): string {
  return `${service}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

/**
 * `record` read back into a figure: every side and section face fetched
 * through `fetchBlob` and decoded, everything else read straight off the
 * record.
 *
 * `fetchBlob` is the only thing here that touches a network, and it is handed
 * in rather than built — this knows nothing of `did`s, servers, or sessions,
 * only how to turn a record and some bytes into a figure.
 */
export async function loadPublishedFigure(
  record: ModelRecord,
  fetchBlob: (blob: LexBlob) => Promise<Uint8Array>,
): Promise<{ parts: Part[]; palette: RGBA[]; motions: Motion[] }> {
  const parts = await Promise.all(
    record.parts.map(async (part): Promise<Part> => {
      const sideEntries = await Promise.all(
        sideKinds.map(async (side): Promise<[SideKind, Bitmap]> => [
          side,
          decodeSidePng(await fetchBlob(part.sides[side])),
        ]),
      );

      const sections = await Promise.all(
        part.sections.map(async (section): Promise<Section> => ({
          axis: section.axis,
          at: section.at,
          before: decodeSidePng(await fetchBlob(section.before)),
          after: decodeSidePng(await fetchBlob(section.after)),
        })),
      );

      return {
        name: part.name,
        sides: Object.fromEntries(sideEntries) as Sides,
        sections,
        root: fromRecordVector3D(part.root),
        pivot: fromRecordVector3D(part.pivot),
        turn: fromRecordVector3D(part.turn),
        scale: Number(part.scale),
        parent: part.parent,
      };
    }),
  );

  const motions: Motion[] = record.motions.map((motion) => ({
    name: motion.name,
    framesPerSecond: motion.framesPerSecond,
    loop: motion.loop,
    parts: motion.parts.map(({ part, keys }) => ({
      part,
      keys: keys.map((key) => ({
        at: key.at,
        ease: key.ease,
        root: fromRecordVector3D(key.root),
        turn: fromRecordVector3D(key.turn),
        scale: Number(key.scale),
      })),
    })),
  }));

  return { parts, palette: record.palette, motions };
}

/**
 * `figure`'s parts, with every side and section face uploaded through
 * `uploadBlob` in place of the bitmap it was drawn as — everything a
 * `ModelRecord` needs beyond `$type`, `name`, `createdAt` and `dimensions`.
 *
 * `uploadBlob` is the only thing here that touches a network, and it is
 * handed in rather than built, so this knows nothing of sessions or accounts —
 * only how to turn a figure into the record that publishes it.
 */
export async function publishFigure(
  figure: { parts: Part[]; palette: RGBA[] },
  motions: Motion[],
  uploadBlob: (bytes: Uint8Array) => Promise<LexBlob>,
): Promise<{
  palette: RGBA[];
  parts: ModelPartRecord[];
  motions: ModelMotionRecord[];
}> {
  const parts = await Promise.all(
    figure.parts.map(async (part): Promise<ModelPartRecord> => {
      const sideEntries = await Promise.all(
        sideKinds.map(async (side): Promise<[SideKind, LexBlob]> => [
          side,
          await uploadBlob(encodeSidePng(part.sides[side])),
        ]),
      );

      const sections = await Promise.all(
        part.sections.map(async (section) => ({
          axis: section.axis,
          at: section.at,
          before: await uploadBlob(encodeSidePng(section.before)),
          after: await uploadBlob(encodeSidePng(section.after)),
        })),
      );

      return {
        name: part.name,
        root: toRecordVector3D(part.root),
        pivot: toRecordVector3D(part.pivot),
        turn: toRecordVector3D(part.turn),
        scale: `${part.scale}`,
        parent: part.parent,
        sides: Object.fromEntries(sideEntries) as Record<SideKind, LexBlob>,
        sections,
      };
    }),
  );

  const recordMotions: ModelMotionRecord[] = motions.map((motion) => ({
    name: motion.name,
    framesPerSecond: motion.framesPerSecond,
    loop: motion.loop,
    parts: motion.parts.map(({ part, keys }) => ({
      part,
      keys: keys.map((key) => ({
        at: key.at,
        ease: key.ease,
        root: toRecordVector3D(key.root),
        turn: toRecordVector3D(key.turn),
        scale: `${key.scale}`,
      })),
    })),
  }));

  return { palette: figure.palette, parts, motions: recordMotions };
}

/** The `at://` address a published model is read back by. */
export function modelAtUri(repo: string, rkey: string): string {
  return `at://${repo}/${MODEL_COLLECTION}/${rkey}`;
}

/**
 * Parses an `at://` address back into the model it names, or null when the
 * address is not a model in this collection.
 */
export function parseModelAtUri(
  uri: string,
): { repo: string; rkey: string } | null {
  const match = /^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(uri);
  if (match === null || match[2] !== MODEL_COLLECTION) {
    return null;
  }
  return { repo: match[1], rkey: match[3] };
}
