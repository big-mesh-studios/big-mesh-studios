/**
 * What a level is made of: the things a person placed by pointing at the world.
 *
 * ## Why this is its own vocabulary and not `createShape`'s arguments
 *
 * It is close to `CreateShapeOptions` on purpose — the shape, the combine, the colour —
 * but it is a separate type because a level is **a document** and a `createShape` call is
 * **a statement**. The differences that matter:
 *
 * - **A level has a version.** `CreateShapeOptions` does not, because it is read by the
 *   build that ships it. A level file is read by whatever opens the place, which may be
 *   older.
 * - **A level's items are in one list, not three.** voxelscape's editor flattens three
 *   arrays into one so a selection is a single index. Here there is nothing to flatten:
 *   shapes and figures share one array, which means **the array order is the order things
 *   were placed**, and that is also the fold order (see `level-plan.ts`).
 *
 * ## Why the shape is `PlaceShape` and not something looser
 *
 * The whole point of `PlaceShape` being derived from `@big-mesh-studios/sdf`'s primitive
 * table is that a place gets a new primitive the day the table has one. Re-deriving it here
 * — or widening it to `OperationShape` — would put a second list of primitives in the app,
 * and a level editor offering six shapes while `createShape` offers nine is a level editor
 * that quietly cannot express the level somebody is looking at.
 *
 * The import is `import type`, so it erases: the guest library is a sandbox-side file and
 * nothing here pulls it into the bundle.
 */

import type { Combine, PlaceShape, Vec3Like } from "../guest/place-api";

/**
 * One shape standing in the world.
 *
 * **Every field here is `createShape`'s, with the same names and the same meaning.** There
 * is no editor-only spelling of a position or a colour, because the file is meant to be
 * readable by whoever ends up opening the place script and asking what a level actually
 * did. A level file that needed a converter to become a `createShape` call would be a level
 * file with two truths.
 */
export interface LevelShape {
  readonly kind: "shape";
  /**
   * What it is called within the level.
   *
   * **Unique within the level, and never reused.** It is what the level's place holds the
   * operation under, so two items sharing one would make the second unreachable — and
   * `PlaceHandle.add` refuses a taken id rather than replacing, which is right for a
   * script and would be a silent data loss here.
   *
   * Applying it to the world prefixes it, because a level's figures share one `FigureSet`
   * with every place on the planet. See `apply-level.ts`.
   */
  readonly id: string;
  /** Its origin. An array because that is what JSON makes of it and what the guest takes. */
  readonly at: Vec3Like;
  readonly shape: PlaceShape;
  readonly combine: Combine;
  /** 0 to 0.25. Above that the stored box is smaller than the shape's reach. */
  readonly softness?: number;
  /**
   * Which way it is turned, as `x, y, z, w`.
   *
   * **`createShape`'s field with `createShape`'s spelling** ([ADR
   * 0051](../../../../docs/adr/0051-a-level-shape-carries-its-turn.md)), because a level file
   * is meant to be readable as the `createShape` call it stands for — and that call has carried
   * a turn since the vocabulary was written. This field was added to a format that already
   * declared one on the effect side and dropped it on the way in, which meant a level file
   * carrying a rotation was accepted and silently ignored.
   *
   * **Absent means the identity**, as it does on `CreateShapeOptions` and on `Operation`. The
   * pivot is the shape's own `at`, which is also the centre of its box at every orientation —
   * see the ADR for why that is arithmetic rather than a decision.
   */
  readonly orientation?: readonly [number, number, number, number];
  /**
   * 0 to 255 per channel, and **only read on a `Paint`.**
   *
   * Carried here because a person picking a colour should not have to know that the host
   * drops it for the other two combines (`host.ts`), but the inspector says so out loud
   * rather than letting the picker look broken.
   */
  readonly colour?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  /** One of `MATERIAL_NAMES`. */
  readonly material?: string;
}

/**
 * One figure standing in the world: a prop, or something that talks.
 *
 * **One type rather than two, because the guest has one id space for both.**
 * `createProp` and `createNpc` are two functions over one `entity-add` tag, and the only
 * difference between them is that an npc must be named. Splitting this in two would put
 * that difference in two places, and the split would have to be re-decided at every call
 * site.
 */
export interface LevelFigure {
  readonly kind: "figure";
  readonly id: string;
  readonly figure: "prop" | "npc";
  /**
   * The name of a model the place carries.
   *
   * **A name, never a path.** A `.sdfmod` has no identity of its own — its name *is* its
   * path in the manifest ([ADR 0033](../../../../docs/adr/0033-a-project-file-is-a-manifest-and-the-model.md))
   * — so this is resolved against `ModelLibrary` at apply time and refused by name if the
   * place does not carry it.
   */
  readonly model: string;
  /** Its own origin, not its base or its centre. */
  readonly at: Vec3Like;
  /** A turn about up, in radians. */
  readonly yaw?: number;
  /** Uniform, about its own origin. Non-uniform is refused by the host. */
  readonly scale?: number;
  /**
   * The voxel size to mesh this model at, in world units, when the model's own default is
   * wrong for this prop.
   *
   * **Absent means the model decides** — `FigureModel.resolution`, derived from the model's
   * own size. A model made in `sdf-modeller` is small in this world's units and lands on a
   * coarser grid than its parts; this is the per-prop control that fixes one without asking
   * the place author to re-export the file. See ADR 0047 for why meshing is a model concern
   * rather than a per-instance one.
   */
  readonly meshResolution?: number;
  /** Whether the player walks into it. A pickup says false. */
  readonly solid?: boolean;
  /** What to call it, and what a prop is asked at. Required for an npc. */
  readonly name?: string;
}

/**
 * Anything a level holds.
 *
 * **`kind` rather than a shape/prop/npc trio**, because the flat list is what a selection
 * indexes into and what a command names a position in.
 */
export type LevelItem = LevelShape | LevelFigure | LevelWalls;

/**
 * A set of walls: polylines drawn by hand and extruded upward.
 *
 * ## Why this is a third kind and not a `LevelShape`
 *
 * **Because the primitive table cannot carry a polyline, and this records the fork the plan
 * took.** A shape is one `PRIMITIVES` entry, and every entry's parameters are a fixed handful
 * of named numbers — that is what the operation format's fixed-width records, `fields.ts`'s
 * `checkShape`, and the guest library's mapped `PlaceShape` all assume. A wall is a list of
 * points and a height, which fits none of them. The narrow path is a level-only item that
 * `apply-level.ts` expands into one operation per segment: no `@big-mesh-studios/sdf` change,
 * no `@big-mesh-studios/csg` change, no binary-format bump, no `.sdfmod` fallout and no
 * guest-API change. Promoting it later to a real `Walls` primitive is a separate decision with
 * its own cost, recorded in `docs/draw-walls-plan.md`.
 *
 * ## What it costs to be a third kind
 *
 * **Every place that asked "shape or figure" now asks "shape, figure or walls".** Picking, the
 * highlight, the inspector and the level reader each gain a branch. That is the honest price
 * of the narrow path and it is paid once, here, rather than hidden behind a shape that is not
 * one.
 *
 * ## Why the points are in world space
 *
 * **Because the walls were drawn in a plane whose up is the frame's up at the first point, and
 * that plane is a fact about where they were drawn rather than a thing to re-derive.** Storing
 * the plane's basis would be a second way to say the same positions, and the two would have to
 * be kept equal. The points are absolute; `up` is the one direction the extrusion needs, and
 * it is remembered so a wall drawn on a planet still stands along its own local vertical.
 */
export interface LevelWalls {
  readonly kind: "walls";
  readonly id: string;
  /**
   * The centre of the walls' own box, in world space.
   *
   * **Derived from the points rather than a second truth**, and stored so that every item in a
   * level answers "where are you" the same way — the highlight, the selection and the list all
   * read `at` of whatever is selected. `apply-level.ts` recomputes it from the points when the
   * item is built, so it cannot drift from them.
   */
  readonly at: Vec3Like;
  /** Which way the walls stand, unit. The frame's up at the point they were drawn from. */
  readonly up: Vec3Like;
  /** Every polyline, in world space, in the order it was drawn. Each has two points or more. */
  readonly lines: readonly (readonly Vec3Like[])[];
  /** How tall the walls stand along `up`, from the plane they were drawn in. */
  readonly height: number;
  /** How thick a wall is, across its own line. */
  readonly thickness: number;
  readonly combine: Combine;
  /** 0 to 0.25. Above that the stored box is smaller than the shape's reach. */
  readonly softness?: number;
  /** One of `MATERIAL_NAMES`. */
  readonly material?: string;
  /** 0 to 255 per channel, and **only read on a `Paint`**, as it is for a shape. */
  readonly colour?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
}

/** The name of one primitive, which is what a shape's own parameters hang off. */
export type ShapeKind = LevelShape["shape"]["type"];

/**
 * How a shape joins the fold, re-exported so a panel can name it without reaching into the
 * guest library for the type. The definition is `PlaceShape`'s combine — one vocabulary,
 * used by a script, a level file and the toolbar alike.
 */
export type { Combine };

/** Whether an item is one of the two shapes of thing rather than the other. */
export const isLevelShape = (item: LevelItem): item is LevelShape =>
  item.kind === "shape";

export const isLevelFigure = (item: LevelItem): item is LevelFigure =>
  item.kind === "figure";

/** Whether an item is the drawn-wall kind. See `LevelWalls` for why it is its own kind. */
export const isLevelWalls = (item: LevelItem): item is LevelWalls =>
  item.kind === "walls";

/**
 * A level, as it is held and as it is written.
 *
 * **The items are one list and the list order is the fold order.** A shape's index in the
 * CSG fold decides what the terrain looks like, because the fold combines with a smooth
 * minimum — symmetric but not associative — so order *is* the surface
 * ([ADR 0016](../../../../docs/adr/0016-a-place-is-a-named-group-of-operations.md)). An
 * array says that order explicitly and every peer reads it the same way; three named lists
 * would say nothing about how the shapes interleave.
 */
export interface LevelPlan {
  /** The format version, checked on read. See `level-plan.ts`. */
  readonly version: 1;
  readonly items: LevelItem[];
}

/** The place name a level's shapes are held under, and folded under. */
export const LEVEL_PLACE = "level";

/**
 * The file name a level is carried under in a place.
 *
 * **One, and fixed.** `MAX_PLACE_LEVELS` is four because a place *can* carry several, but the
 * editor produces exactly one — so the editor's "Add to place" writes it here rather than making
 * somebody name a file to save a document they did not know was a file. The other three slots
 * are for a format somebody designs rather than for this button's convenience.
 *
 * `level` rather than `level.json` because the extension is not load-bearing: `place-file.ts`
 * deliberately does not check extensions, so a place carrying `level` and one carrying
 * `level.json` are the same place with two names for it.
 */
export const LEVEL_FILE = "level.json";

/**
 * What a level figure is called in the world's one figure id space.
 *
 * **Namespaced because `FigureSet` is shared by every place on the planet**
 * (`figure-set.ts`). Two places standing a `chair` would collide today and the second would
 * silently not appear; a level must not be able to make a published place's furniture
 * disappear, and neither must it lose its own to a name it did not choose.
 *
 * The slash is in there so it cannot collide with a script's own ids, which are written by
 * hand and rarely start with one.
 */
/**
 * What stands in front of a level figure's own name in the world.
 *
 * **One prefix, and `picking.ts` reads it from here rather than restating it.** Two
 * literals that have to agree are two literals that will disagree, and the failure is a
 * level editor that cannot select its own props — silently, and only once somebody
 * renames one.
 */
export const LEVEL_FIGURE_PREFIX = "level/";

export const levelFigureId = (id: string): string =>
  `${LEVEL_FIGURE_PREFIX}${id}`;
