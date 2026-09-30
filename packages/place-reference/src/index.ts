// What a place script can reach, read out of the world application's own
// sources and held here as one artifact the documentation site and the in-game
// `/place:docs` panel both render. Every name, type, and sentence in it is
// copied from the declaration it describes — a JSDoc block, a type, or a
// literal the world already holds — so the reference cannot say anything the
// world does not already do, and it goes stale the moment the source does
// rather than when somebody remembers to check it.
//
// `apps/voxelscape/tools/place-reference.ts` writes `place-api.json` from the
// world application's program, and its `--check` mode fails when the file
// held here no longer matches what that program says.
import data from "./place-api.json";

/** One field of a payload, an option object, or an interface, as the source declares it. */
export interface PlaceField {
  /** The field's name, as a script writes it. */
  name: string;
  /** The field's type, printed from the type checker rather than its source text. */
  type: string;
  /** Whether a value may leave the field out. */
  optional: boolean;
  /** What the field holds, in the words the declaration above it uses. */
  doc: string;
}

/** One argument of a function the `voxelscape` module exports. */
export interface PlaceParam extends PlaceField {}

/** One function the `voxelscape` module exports, callable from a place script. */
export interface PlaceFunction {
  /** The name a script imports. */
  name: string;
  /** The whole call, as the editor's language service would show it. */
  signature: string;
  /** What the function does, in the words its own declaration uses. */
  doc: string;
  params: PlaceParam[];
  /** What the call evaluates to. */
  returns: string;
}

/** One value the `voxelscape` module exports, read without being called. */
export interface PlaceValue {
  /** The name a script imports. */
  name: string;
  /** The value's type, printed from the type checker. */
  type: string;
  /** What the value holds, in the words its own declaration uses. */
  doc: string;
}

/**
 * One named member of a union type, with the fields it declares — so a script
 * reading about `PlanShape` finds all six shapes' fields in one place instead
 * of six names to look up.
 */
export interface PlaceTypeVariant {
  /** The name one union member goes by. */
  name: string;
  /** What the member represents, in the words its own declaration uses. */
  doc: string;
  /** The fields the member declares, in declaration order. */
  members: PlaceField[];
}

/** One type the `voxelscape` module exports, for a script to annotate with. */
export interface PlaceType {
  /** The name a script writes. */
  name: string;
  /** What the type represents, in the words its own declaration uses. */
  doc: string;
  /** An interface's or class's own fields, in declaration order. */
  members: PlaceField[];
  /**
   * A type alias over a union of literals: the values it admits, in
   * declaration order. Empty for anything that is not such a union.
   */
  union: string[];
  /**
   * A type alias over a union of named types, each expanded to the fields it
   * declares. Empty for anything that is not such a union.
   */
  alternatives: PlaceTypeVariant[];
  /**
   * The type a script would have to write to get one of this, for a type with
   * no fields and no members to read — an alias over a tuple, an array, a
   * mapped type, or a union of names rather than literals. Empty whenever the
   * fields or the union say the same thing more fully.
   */
  type: string;
}

/** One effect a script may queue with `dispatch`, and what its payload holds. */
export interface PlaceEffect {
  /** The tag a script passes to `dispatch`. */
  tag: string;
  /** What the effect does to the world, in the words the payload's declaration uses. */
  doc: string;
  /** The payload's fields, in declaration order. */
  fields: PlaceField[];
  /**
   * The tag that takes this effect away again, where the vocabulary names one —
   * `light` is undone by `light-remove`. Empty for an effect nothing undoes.
   */
  removedBy: string;
}

/**
 * One family of effects, gathered so a script author reads the vocabulary in
 * the order the ideas arrive rather than as ninety tags in the order the
 * trusted side happens to validate them.
 */
export interface PlaceEffectGroup {
  /** The family's name, as a heading in the reference. */
  name: string;
  /** What the family is for, in one sentence. */
  doc: string;
  effects: PlaceEffect[];
}

/** One fact a script's `onTick` handler is handed, and the payload it carries. */
export interface PlaceEvent {
  /** The `kind` a script matches against. */
  kind: string;
  /** What the fact reports, in the words its own declaration uses. */
  doc: string;
  /** The fields only this kind carries, in declaration order. */
  fields: PlaceField[];
}

/** One bound the trusted side enforces on a script's own numbers. */
export interface PlaceLimit {
  /** The constant's name as the source declares it. */
  name: string;
  /** The value, written as the source writes it. */
  value: string;
  /** What the bound is on, in the words the constant's own declaration uses. */
  doc: string;
}

/** One shape a place's plan may paint, and the fields that place it. */
export interface PlaceShape {
  /** The `kind` a plan entry names. */
  kind: string;
  /** What the shape builds, in the words its own declaration uses. */
  doc: string;
  /** The fields that place and size it, in declaration order. */
  fields: PlaceField[];
}

/** One type a place's plan is written in, for a script to build one with. */
export interface PlacePlanType {
  /** The name a script writes. */
  name: string;
  /** What the type represents, in the words its own declaration uses. */
  doc: string;
  /** The type's own fields, in declaration order. */
  fields: PlaceField[];
  /**
   * The type itself, for the names that are not an object at all — a tuple, an
   * array, a list of shapes. Empty when there are fields to read instead.
   */
  type: string;
}

/** The whole reference: everything a place script can reach, and every bound on it. */
export interface PlaceReference {
  /** The world application's modules the reference was read out of. */
  sources: string[];
  functions: PlaceFunction[];
  values: PlaceValue[];
  types: PlaceType[];
  effects: PlaceEffectGroup[];
  /**
   * Every fact `onTick` hands a script, with the fields they all share already
   * filled in on each — an event's `doc` says what its own kind reports, and a
   * script reads `event.id`, `event.at`, and `event.producer` on all of them.
   */
  events: PlaceEvent[];
  /** The fields every fact carries, however it was authored. */
  eventCommon: PlaceField[];
  limits: PlaceLimit[];
  shapes: PlaceShape[];
  plan: PlacePlanType[];
}

/**
 * The reference as it was read out of the world application's sources, typed
 * against the shape above — so a generator that emits a field nothing declares
 * here, or leaves out one it does, fails `pnpm check-types` rather than
 * rendering as a blank row on the documentation site.
 */
export const placeReference: PlaceReference = data;
