/**
 * Reading a level file, and the three rules that keep it honest.
 *
 * ## Why a level file is validated at all
 *
 * Everything in this app that reaches the fold arrives as an **effect**, and every effect
 * goes through `inspectEffect` before anything is built from it
 * ([ADR 0017](../../../../docs/adr/0017-the-vocabulary-is-a-table.md)). That is the whole
 * trust boundary: a peer sends effects, not operations.
 *
 * A level file is the **second** channel. It is a document, not a script — a person points
 * at the world, the editor writes it, and the thing that opens the place later reads it
 * without anything having been said to it. So it is untrusted in exactly the same way, and
 * it is validated in exactly the same place: each item is mapped onto the effect it stands
 * for and handed to `inspectEffect`, which checks it against the table a script's would be
 * checked against.
 *
 * **That is not ceremony, it is reuse.** The bounds on a shape's size, the enum of material
 * names, the per-primitive field checks — none of them are restated here. A level editor
 * that validated its own vocabulary would be a second place for a primitive to be added and
 * forgotten.
 *
 * ## The three rules
 *
 * - **Whole or refused.** Not "apply the good rows and report the bad one". A level with
 *   500 good items and one malformed row is not a level with 500 shapes in it; it is a
 *   level nobody can open, and saying so beats a world that is quietly missing a wall.
 * - **An unknown key is a refusal.** A *manifest* tolerates unknown fields because a
 *   manifest never reaches a place (`place-file.ts`). A level file does reach a place, so
 *   the tolerance does not transfer: a file written by a newer editor has to be refused by
 *   an older one rather than half-read, or a renamed field means something here and nothing
 *   there.
 * - **The array order is the fold order, and nothing here sorts it.** See `types.ts`.
 */

import { inspectEffect } from "../effects";
import { MAX_OPERATIONS_PER_PLACE } from "../place-registry";
import {
  MAX_CHANNEL,
  MAX_COORDINATE,
  MAX_NAME_LENGTH,
  MAX_SHAPE_SIZE,
  MAX_SOFTNESS,
} from "../limits";
import { MATERIAL_NAMES } from "../../render/material-names";
import type {
  Combine,
  LevelItem,
  LevelPlan,
  LevelShape,
  WallSide,
} from "./types";
import { isLevelFigure, LEVEL_PLACE, WALL_SIDES } from "./types";
import { encodeImagePlane, type LevelImagePlane } from "./image-plane";

/**
 * How many items one level may hold.
 *
 * **The place's own limit, imported rather than restated.** A level's shapes are one
 * place's worth by construction (`LEVEL_PLACE`), so the ceiling that matters is the one
 * `PlaceHandle.add` enforces — and writing the number again here would be two numbers that
 * have to agree, with nothing to say when one of them moved.
 *
 * Being *at* the limit rather than under it is deliberate. `PlaceHandle.add` refuses once a
 * place is full, so a level at 2000 shapes leaves no room under its own place name for
 * anything else — and that is a refusal that names itself, which is the same thing
 * `MAX_OPERATIONS_PER_PLACE` is for. A level that is under it has headroom for the script
 * to add something to the same place, and one that is over it is not silently shortened.
 *
 * It lives here rather than in `places/limits.ts` because a level file is not an effect and
 * no field rule refers to it — and `limits.test.ts` fails the build on an exported limit
 * nothing references, which is the right way round.
 */
export const MAX_LEVEL_ITEMS = MAX_OPERATIONS_PER_PLACE;

/** The format version this build reads. */
export const LEVEL_VERSION = 1;

/**
 * The most polylines one walls item may hold.
 *
 * **Not in `places/limits.ts`, and deliberately.** That file is bounded payload fields a
 * script can send, and its test fails on a bound nothing enforces. A walls item is a level
 * document's own vocabulary and no effect carries it, so its bounds live beside the reader
 * that enforces them — the same reasoning `MAX_LEVEL_ITEMS` above is here rather than there.
 *
 * The number is a drawing of a building: sixty-four polylines is a floor plan with rooms,
 * doorways and a boundary, and far more than one session's hand-drawing produces.
 */
export const MAX_WALL_LINES = 64;

/** The most points one polyline may hold, so a drag cannot build an unbounded shape. */
export const MAX_WALL_POINTS = 512;

/** A level that could not be read, and the one thing that was wrong with it. */
export interface LevelRefusal {
  /**
   * Which item, said the way a person can find it in their file.
   *
   * `"items[7]"` for a row, or a field path for the envelope itself. Empty means the whole
   * document, which is the shape of "this file is not a level" rather than "this row is not
   * right".
   */
  readonly where: string;
  readonly why: string;
}

/** A level that is good, or the reason it is not. Never both, never neither. */
export type ParsedLevel =
  { readonly plan: LevelPlan } | { readonly refusal: LevelRefusal };

/**
 * A refusal on its own, so one helper serves the document and the item readers.
 *
 * **Not `ParsedLevel`,** which would drag the `{ plan }` variant into every item reader and
 * stop the narrowing below working. The object is a member of both result types, so
 * returning it here is assignable to whichever one the caller has.
 */
const refuse = (
  where: string,
  why: string,
): { readonly refusal: LevelRefusal } => ({
  refusal: { where, why },
});

/**
 * One item read, or the reason it was not read.
 *
 * **Its own type rather than `ParsedLevel`**, because the two differ by a member and
 * narrowing on `"refusal" in …` cannot tell `{ item }` from `{ plan }` — they are both the
 * variant without a `refusal`, and the check that follows would not narrow at all. Keeping
 * the successful outcome a distinct shape is what lets the loop below return on the first
 * bad row and carry on knowing it has one.
 */
type ReadItem =
  { readonly item: LevelItem } | { readonly refusal: LevelRefusal };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads a level file.
 *
 * **`JSON.parse` into `unknown` first, judge second, and nothing in between** — the same
 * order `load-place.ts` parses a manifest in, for the same reason: a value that has been
 * parsed but not yet checked is the only place a bug can live.
 */
export const parseLevelPlan = (text: string): ParsedLevel => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    return refuse("", `is not JSON: ${(cause as Error).message}`);
  }
  return readLevelPlan(parsed);
};

/**
 * The same, for a value that has already been parsed.
 *
 * Separate because the editor holds a live plan and re-reads it on every import, and
 * parsing it to JSON only to hand it straight back would be a round trip that finds nothing.
 */
export const readLevelPlan = (value: unknown): ParsedLevel => {
  if (!isPlainObject(value)) {
    return refuse("", "is not an object");
  }

  // Checked before anything else, and refused rather than coerced. A level from a future
  // build is a level this one cannot claim to understand, and guessing which of its fields
  // still mean what they meant is how a wall ends up somewhere nobody put it.
  if (value.version !== LEVEL_VERSION) {
    return refuse(
      "version",
      `is ${JSON.stringify(value.version)}, and this build reads ${LEVEL_VERSION}`,
    );
  }

  if (!Array.isArray(value.items)) {
    return refuse("items", "is not an array");
  }
  if (value.items.length > MAX_LEVEL_ITEMS) {
    return refuse(
      "items",
      `holds ${value.items.length}, and a level may hold ${MAX_LEVEL_ITEMS}`,
    );
  }

  const items: LevelItem[] = [];
  // **Every item is checked before any is kept**, so a refusal part-way down the file
  // cannot leave half a level behind. The array is built here and handed over at the end,
  // and there is no path that returns it part-filled.
  for (let i = 0; i < value.items.length; i++) {
    const read = readItem(value.items[i], `items[${i}]`);
    if ("refusal" in read) return read;
    items.push(read.item);
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      return refuse("", `two items are both called "${item.id}"`);
    }
    seen.add(item.id);
  }

  return { plan: { version: LEVEL_VERSION, items } };
};

const readItem = (value: unknown, where: string): ReadItem => {
  if (!isPlainObject(value)) return refuse(where, "is not an object");

  if (value.kind === "shape") return readShape(value, where);
  if (value.kind === "figure") return readFigure(value, where);
  if (value.kind === "walls") return readWalls(value, where);

  return refuse(
    `${where}.kind`,
    `is ${JSON.stringify(value.kind)}, and an item is a "shape", a "figure" or "walls"`,
  );
};

const readShape = (value: Record<string, unknown>, where: string): ReadItem => {
  // Refused rather than overwritten, even though `shapePayload` would win the key anyway.
  // A `place` in a level item is a field that means nothing here, and a file carrying one
  // was written by somebody who believed it did — which is the half-read this file's
  // whole-or-refused rule exists to prevent.
  if ("place" in value) {
    return refuse(
      where,
      "carries a place, and a level's shapes always fold under the level's own",
    );
  }

  const inspected = inspectEffect("shape-add", shapePayload(value));
  if ("refusal" in inspected) return refuse(where, inspected.refusal.reason);
  const payload = inspected.effect.payload as ShapePayload;

  return {
    item: {
      kind: "shape",
      id: payload.id,
      at: payload.at,
      shape: payload.shape,
      combine: payload.combine,
      ...(payload.softness === undefined ? {} : { softness: payload.softness }),
      /**
       * **Carried across, which is the whole of ADR 0051.** The table has declared this a
       * `quat` since the vocabulary was written and `host.ts` has read it off a `shape-add`
       * since too, so a payload carrying one always passed the check — and this reader used to
       * drop it, which meant a rotated level shape loaded as an un-rotated one with nothing
       * saying so. The spread is the same conditional every other optional here uses, so an
       * item with no turn gains no `orientation` key rather than an identity one.
       */
      ...(payload.orientation === undefined
        ? {}
        : { orientation: payload.orientation }),
      ...(payload.colour === undefined ? {} : { colour: payload.colour }),
      ...(payload.material === undefined ? {} : { material: payload.material }),
    },
  };
};

const readFigure = (
  value: Record<string, unknown>,
  where: string,
): ReadItem => {
  const inspected = inspectEffect("entity-add", figurePayload(value));
  if ("refusal" in inspected) return refuse(where, inspected.refusal.reason);
  const payload = inspected.effect.payload as FigurePayload;

  // **The one rule the effect table cannot hold, because it is a rule about two
  // functions.** `createProp` and `createNpc` are one tag, and the difference between them
  // is only enforceable where they are declared — which is why the guest has two functions
  // and the host re-checks it (`host.ts`). A level file has one `figure` field, so it has
  // to check it here or an unnamed npc would reach the host and be refused by a rule three
  // files away from the thing that broke it.
  if (payload.kind === "npc" && payload.name === undefined) {
    return refuse(where, "name is required for an npc");
  }

  return {
    item: {
      kind: "figure",
      id: payload.id,
      figure: payload.kind,
      model: payload.model,
      at: payload.at,
      ...(payload.yaw === undefined ? {} : { yaw: payload.yaw }),
      ...(payload.scale === undefined ? {} : { scale: payload.scale }),
      ...(payload.meshResolution === undefined
        ? {}
        : { meshResolution: payload.meshResolution }),
      ...(payload.solid === undefined ? {} : { solid: payload.solid }),
      ...(payload.name === undefined ? {} : { name: payload.name }),
    },
  };
};

/**
 * Reads a walls item.
 *
 * **Its own validation rather than `inspectEffect`, and that is the one place this file has
 * two paths.** Every other item stands for an effect and is checked against the effect table
 * ([ADR 0017](../../../../docs/adr/0017-the-vocabulary-is-a-table.md)) — that is the whole
 * trust boundary. A walls item stands for no effect: the plan's narrow path keeps it a level
 * document's own kind, expanded into per-segment operations by `apply-level.ts` rather than
 * sent as one. So the rules the table would have enforced are written here, and the caps in
 * particular are here because a hand-drawn polyline is the one payload whose *size* is the
 * person's rather than a primitive's.
 */
const readWalls = (value: Record<string, unknown>, where: string): ReadItem => {
  const id = value.id;
  if (typeof id !== "string" || id === "") {
    return refuse(`${where}.id`, "is not a name");
  }
  if (id.length > MAX_NAME_LENGTH) {
    return refuse(
      `${where}.id`,
      `is longer than ${MAX_NAME_LENGTH} characters`,
    );
  }

  const at = readPoint(value.at, `${where}.at`);
  if ("refusal" in at) return at;
  const up = readPoint(value.up, `${where}.up`);
  if ("refusal" in up) return up;
  if (up.point[0] === 0 && up.point[1] === 0 && up.point[2] === 0) {
    return refuse(
      `${where}.up`,
      "is the zero vector, which is not a direction",
    );
  }

  if (!Array.isArray(value.lines)) {
    return refuse(`${where}.lines`, "is not an array");
  }
  if (value.lines.length === 0) {
    return refuse(`${where}.lines`, "holds no lines");
  }
  if (value.lines.length > MAX_WALL_LINES) {
    return refuse(
      `${where}.lines`,
      `holds ${value.lines.length}, and a walls item may hold ${MAX_WALL_LINES}`,
    );
  }

  const lines: [number, number, number][][] = [];
  for (let i = 0; i < value.lines.length; i++) {
    const line = value.lines[i];
    const lineWhere = `${where}.lines[${i}]`;
    if (!Array.isArray(line)) return refuse(lineWhere, "is not an array");
    if (line.length < 2) {
      return refuse(
        lineWhere,
        "has fewer than two points, so it is not a wall",
      );
    }
    if (line.length > MAX_WALL_POINTS) {
      return refuse(
        lineWhere,
        `holds ${line.length} points, and a line may hold ${MAX_WALL_POINTS}`,
      );
    }
    const points: [number, number, number][] = [];
    for (let j = 0; j < line.length; j++) {
      const point = readPoint(line[j], `${lineWhere}[${j}]`);
      if ("refusal" in point) return point;
      points.push(point.point);
    }
    lines.push(points);
  }

  let sides: WallSide[] | undefined;
  if (value.sides !== undefined) {
    if (!Array.isArray(value.sides)) {
      return refuse(`${where}.sides`, "is not an array");
    }
    if (value.sides.length !== lines.length) {
      return refuse(
        `${where}.sides`,
        `holds ${value.sides.length}, and there are ${lines.length} lines, so it is not one side per line`,
      );
    }
    sides = [];
    for (let i = 0; i < value.sides.length; i++) {
      const side = value.sides[i];
      if (
        typeof side !== "string" ||
        !(WALL_SIDES as readonly string[]).includes(side)
      ) {
        return refuse(
          `${where}.sides[${i}]`,
          `is ${JSON.stringify(side)}, and a side is centre, left or right`,
        );
      }
      sides.push(side as WallSide);
    }
  }

  const height = readSize(value.height, `${where}.height`);
  if ("refusal" in height) return height;
  const thickness = readSize(value.thickness, `${where}.thickness`);
  if ("refusal" in thickness) return thickness;

  const combine = value.combine;
  if (combine !== "Add" && combine !== "Subtract" && combine !== "Paint") {
    return refuse(
      `${where}.combine`,
      `is ${JSON.stringify(combine)}, and a combine is Add, Subtract or Paint`,
    );
  }

  const softness = value.softness;
  if (softness !== undefined) {
    if (
      typeof softness !== "number" ||
      softness < 0 ||
      softness > MAX_SOFTNESS
    ) {
      return refuse(`${where}.softness`, `is outside 0 to ${MAX_SOFTNESS}`);
    }
  }

  const material = value.material;
  if (material !== undefined) {
    if (
      typeof material !== "string" ||
      !(MATERIAL_NAMES as readonly string[]).includes(material)
    ) {
      return refuse(`${where}.material`, "is not a material this build knows");
    }
  }

  const colour = readColour(value.colour, `${where}.colour`);
  if (colour !== null && "refusal" in colour) return colour;

  // **And nothing but its own keys**, the same rule a shape's own parameters are held to: a
  // field this build does not know is a file written by something else, and there is no safe
  // reading of a field nobody validated.
  const known = new Set([
    "kind",
    "id",
    "at",
    "up",
    "lines",
    "sides",
    "height",
    "thickness",
    "combine",
    "softness",
    "material",
    "colour",
  ]);
  for (const key of Object.keys(value)) {
    if (!known.has(key)) {
      return refuse(`${where}.${key}`, "is not a field this build knows");
    }
  }

  return {
    item: {
      kind: "walls",
      id,
      at: at.point,
      up: up.point,
      lines,
      ...(sides === undefined ? {} : { sides }),
      height: height.size,
      thickness: thickness.size,
      combine: combine as Combine,
      ...(softness === undefined ? {} : { softness }),
      ...(material === undefined ? {} : { material }),
      ...(colour === null ? {} : { colour: colour.colour }),
    },
  };
};

/** A three-number point within the coordinate bound, or why it is not one. */
const readPoint = (
  value: unknown,
  where: string,
):
  | { readonly point: [number, number, number] }
  | { readonly refusal: LevelRefusal } => {
  if (!Array.isArray(value) || value.length !== 3) {
    return refuse(where, "is not three numbers");
  }
  for (const part of value) {
    if (typeof part !== "number" || !Number.isFinite(part)) {
      return refuse(where, "has a part that is not a finite number");
    }
    if (part < -MAX_COORDINATE || part > MAX_COORDINATE) {
      return refuse(
        where,
        `has a part outside -${MAX_COORDINATE} to ${MAX_COORDINATE}`,
      );
    }
  }
  return { point: [value[0], value[1], value[2]] };
};

/** A size, bounded as a shape's own dimension is, or why it is not one. */
const readSize = (
  value: unknown,
  where: string,
): { readonly size: number } | { readonly refusal: LevelRefusal } => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > MAX_SHAPE_SIZE
  ) {
    return refuse(where, `is outside 0 to ${MAX_SHAPE_SIZE}`);
  }
  return { size: value };
};

/** A colour, or `null` when there is none, or why it is not one. */
const readColour = (
  value: unknown,
  where: string,
):
  | { readonly colour: { r: number; g: number; b: number } }
  | null
  | { readonly refusal: LevelRefusal } => {
  if (value === undefined) return null;
  if (!isPlainObject(value)) return refuse(where, "is not an object");
  for (const channel of ["r", "g", "b"] as const) {
    const part = value[channel];
    if (
      typeof part !== "number" ||
      !Number.isInteger(part) ||
      part < 0 ||
      part > MAX_CHANNEL
    ) {
      return refuse(`${where}.${channel}`, `is outside 0 to ${MAX_CHANNEL}`);
    }
  }
  return {
    colour: {
      r: value.r as number,
      g: value.g as number,
      b: value.b as number,
    },
  };
};

/**
 * The `shape-add` payload a level shape stands for.
 *
 * **`place` is written after the spread on purpose.** Spreading first would let an item
 * carrying its own `place` choose the place it folds under; writing last means the level's
 * name wins whatever the file says. `readShape` refuses such an item before it gets here —
 * this is the belt to that braces, not the only thing standing between a hand-edited file
 * and a shape that outlives its own level.
 *
 * `kind` is dropped rather than declared: it is how the file says which reader to use, and
 * the effect it turns into has no such field. Everything else is passed through untouched so
 * the table checks the item exactly as it would check a script's.
 */
const shapePayload = (
  item: Record<string, unknown>,
): Record<string, unknown> => {
  const { kind: _kind, ...rest } = item;
  return { ...rest, place: LEVEL_PLACE };
};

/** The `entity-add` payload a level figure stands for. */
const figurePayload = (
  item: Record<string, unknown>,
): Record<string, unknown> => {
  const { kind: _itemKind, figure, ...rest } = item;
  return { ...rest, kind: figure };
};

/** The shape fields the table accepts, narrowed so the reader above can name them. */
interface ShapePayload {
  readonly id: string;
  readonly at: readonly [number, number, number];
  readonly shape: LevelShape["shape"];
  readonly combine: LevelShape["combine"];
  readonly softness?: number;
  /** Already a validated four-number tuple: the table checks it is four parts in −1…1. */
  readonly orientation?: readonly [number, number, number, number];
  readonly colour?: { r: number; g: number; b: number };
  readonly material?: string;
}

interface FigurePayload {
  readonly id: string;
  readonly kind: "prop" | "npc";
  readonly model: string;
  readonly at: readonly [number, number, number];
  readonly yaw?: number;
  readonly scale?: number;
  readonly meshResolution?: number;
  readonly solid?: boolean;
  readonly name?: string;
}

/**
 * Writes a level out, in the shape `parseLevelPlan` reads back.
 *
 * **`JSON.stringify` with two spaces, because this file is meant to be read and edited by
 * a person.** It is the only artefact the level editor produces, and a single line of
 * minified JSON would make a level a thing that can only be changed by the tool that made
 * it — which is the scripting-alone problem the editor exists to solve.
 */
export const writeLevelPlan = (
  plan: LevelPlan,
  imagePlane?: LevelImagePlane,
): string =>
  `${JSON.stringify(
    {
      version: LEVEL_VERSION,
      items: plan.items,
      // **Only when there is one**, so a level without a reference is byte-for-byte the file it
      // always was and its diffs stay clean. See `image-plane.ts` for why this key may sit at
      // the top level while every other field is an item.
      ...(imagePlane === undefined
        ? {}
        : { imagePlane: encodeImagePlane(imagePlane) }),
    },
    null,
    2,
  )}\n`;

/**
 * What an item is called in the editor's list.
 *
 * **`id` and what it is, not the numbers.** A list of `Box(12, 4, 30)` rows is a list
 * nobody can scan; a list of `wall-4 · box` is a list somebody can find a thing in.
 */
export const itemLabel = (item: LevelItem): string => {
  if (isLevelFigure(item)) return `${item.id} · ${item.figure}`;
  if (item.kind === "walls") {
    const points = item.lines.reduce((total, line) => total + line.length, 0);
    return `${item.id} · walls (${item.lines.length}, ${points} points)`;
  }
  return `${item.id} · ${item.shape.type.toLowerCase()}`;
};
