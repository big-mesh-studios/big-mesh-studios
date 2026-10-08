/**
 * What a place script can reach, as one artifact the in-game `/place:docs` panel renders.
 *
 * ## Why this is spacescape's own rather than `packages/place-reference`
 *
 * The shared package holds voxelscape's drawing, and its `PlaceReference` carries `effects`,
 * `shapes` and `plan` — three sections this engine has no counterpart for. `effects` is the one
 * worth stating plainly: **the effect vocabulary is not part of a place author's API here.**
 * `guest/place-api.ts` never exports `dispatch`; the single call to `engine.dispatch` is inside the
 * library, and an author writes `createShape`, `createZone`, `createLight`, `after` and `onTick`.
 * voxelscape *does* export `dispatch`, which is why its reference is built around effects and this
 * one is not. A reference that listed all twenty-three tags would send an author after a function
 * no import gives them.
 *
 * So this is functions, values, types, events and limits — the surface a place script actually
 * holds — and it is defined here rather than generalising a package two other applications read.
 *
 * ## Where the sentences come from
 *
 * Every one is read out of the source it describes — a JSDoc block above the declaration, or the
 * `about` a table already carries — so the reference cannot say anything the engine does not do,
 * and it goes stale the moment the source does rather than when somebody remembers to check it.
 * `tools/place-reference.ts` draws it, and its `--check` mode fails when this file no longer
 * matches what that program says.
 */

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
 * One named member of a union type, with the fields it declares — so a script reading about
 * `PlaceEvent` finds every kind's fields in one place instead of seven names to look up.
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
   * A type alias over a union of literals: the values it admits, in declaration order. Empty for
   * anything that is not such a union.
   */
  union: string[];
  /**
   * A type alias over a union of named types, each expanded to the fields it declares. Empty for
   * anything that is not such a union.
   */
  alternatives: PlaceTypeVariant[];
  /**
   * The type a script would have to write to get one of this, for a type with no fields and no
   * members to read — an alias over a tuple, an array, a mapped type, or a union of names rather
   * than literals. Empty whenever the fields or the union say the same thing more fully.
   */
  type: string;
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

/** The whole reference: everything a place script can reach, and every bound on it. */
export interface PlaceReference {
  /** The application's source files the reference was read out of. */
  sources: string[];
  functions: PlaceFunction[];
  values: PlaceValue[];
  types: PlaceType[];
  /**
   * Every fact `onTick` hands a script. An event's `doc` says what its own kind reports; the fields
   * every fact carries however it was authored are `eventCommon`.
   */
  events: PlaceEvent[];
  /** The fields every fact carries, however it was authored. */
  eventCommon: PlaceField[];
  limits: PlaceLimit[];
}
