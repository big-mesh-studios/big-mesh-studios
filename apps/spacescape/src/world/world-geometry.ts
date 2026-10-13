/**
 * What kind of world this is, and the numbers every reader of it needs.
 *
 * ## What this file is for
 *
 * `app.tsx` used to hold six module-scope constants — a base field, a physics frame, a sea
 * level, a landscape and the two functions derived from it — built once at import and read
 * from the frame loop, the place host and `Game`. They are all consequences of **one** fact,
 * which is whether the world's surface is a sphere or a plane, and they are collected here so
 * that the fact is stated once.
 *
 * ## The lattice is not the spherical part
 *
 * The chunk lattice is already cubic and already shared. `chunkCellOf`
 * (`level-data.ts:202-218`) is a per-axis `Math.floor` around the world origin, unbounded in
 * both directions, and ADR 0036 put the planet's centre at the origin *precisely so the
 * lattice could stay that way*. A flat world uses the identical lattice, the identical window
 * (`sphereCells`, a squashed ball around the focus rather than a shell) and the identical
 * Euclidean LOD. Nothing here changes any of them, and that is the point: what differs between
 * the two worlds is a field and a frame, not a grid.
 *
 * ## Why one sea level and not two
 *
 * **There was a `?flat` mode in this application and it was removed**, with a note
 * (`app.tsx:171-184`) explaining that a spherical frame with a sea at an altitude is an ocean
 * at an infinite radius, and a flat frame with a sea *radius* is no ocean at all, because
 * `flatFrame`'s `radiusAt` is `Infinity`. Both failures are silent, and both would have been
 * found by a player rather than by a test.
 *
 * That trap is closed here by construction rather than by removing the feature: `seaLevel` is
 * always `seaLevelOf(spec)` (`base-field.ts:112-122`), read off the same parameters every
 * worker builds its field from. On a sphere it is a distance from the centre; on a plane it is
 * an altitude. There is one number, it travels with the spec, and no caller can hold a sea that
 * disagrees with its frame.
 *
 * ## Why a field is built here and handed out
 *
 * `landscape` and `ground` are two answers from **one** `baseFieldFor` call, not two builds.
 * `BuiltBaseField.ground` is the landscape without its caves, and `base-field.ts:70-72` is
 * emphatic that the mesher's gate and the physics' predicate must be handed the same function
 * object — a water predicate built from a second copy of the field is a water predicate that
 * can disagree with the water. `seaLevelOf` is asked separately rather than read off the
 * built field for the same reason `app.tsx:285-289` gives: a number restated is a number that
 * can drift from the one the workers read.
 */

import {
  baseFieldFor,
  DEFAULT_CAVES,
  DEFAULT_PLANET,
  DEFAULT_TERRAIN,
  seaLevelOf,
} from "@big-mesh-studios/csg";
import type { BaseFieldSpec, BuiltBaseField } from "@big-mesh-studios/csg";
import { vec3 } from "@big-mesh-studios/core";

import { cloudDeck, type CloudDeck } from "./clouds";
import { flatFrame, sphericalFrame, type Frame } from "./up";
import { flatWater, sphericalWater, type WaterShape } from "./water";

/**
 * The two worlds, named the way a person would name them.
 *
 * **`"sphere"` and `"flat"` rather than `BaseFieldSpec`'s own `"planet"` and `"terrain"`.**
 * Both worlds have terrain, so the engine's word is ambiguous at the boundary where a place
 * author and a console user meet it; and this is the only place in the application that has to
 * translate, so the engine never sees a second vocabulary and the place format never sees an
 * engine word.
 */
export const WORLD_SHAPES = ["sphere", "flat"] as const;

export type WorldShape = (typeof WORLD_SHAPES)[number];

/**
 * The world a build runs, when the URL does not ask for another.
 *
 * **A sphere, and the reason is the one `app.tsx:171-184` gives** with the other half removed:
 * every shipped demo, every published place and every test that stands a player on the ground
 * is written against this world. A flat world is opt-in until somebody asks for it.
 */
export const DEFAULT_WORLD_SHAPE: WorldShape = "sphere";

/** Whether a value read out of a manifest or a query string is one of the two worlds. */
export const isWorldShape = (value: unknown): value is WorldShape =>
  typeof value === "string" &&
  (WORLD_SHAPES as readonly string[]).includes(value);

/**
 * Everything a reader of this world needs, derived from the one fact that decides all of it.
 *
 * **A record rather than a class, and one per world rather than one mutated.** A shape switch
 * is a rare event that wants to be atomic — there is no frame on which half the readers see
 * the sphere and half see the plane — and a value that is swapped in one assignment says that
 * better than a set of fields a caller could set one at a time.
 */
export interface WorldGeometry {
  /** Which world this is. What every other field here is a consequence of. */
  readonly shape: WorldShape;
  /**
   * The landscape, as the union the workers are given.
   *
   * **A spec rather than a built field, because it crosses the worker boundary** in
   * `ModelMessage.base` (`session.ts:281-291`) and because ADR 0009 is the property that both
   * sides build from the same numbers rather than that they share one object.
   */
  readonly baseField: BaseFieldSpec;
  /**
   * Which way is up, and how far the centre is from a point.
   *
   * `flatFrame`'s `radiusAt` is `Infinity` rather than a radius, so a plane is the degenerate
   * sphere of infinite radius and every consumer of `radiusAt` — the water test, the world
   * bound — needs no branch of its own. See `up.ts:57-62`.
   */
  readonly frame: Frame;
  /** Where this world's water settles: a distance from the centre, or an altitude. */
  readonly seaLevel: number;
  /**
   * The landscape, built once for the questions only the main thread asks.
   *
   * **A second copy of the field every worker builds, and ADR 0009 is why that is acceptable:**
   * both sides build it from the same numbers, so they cannot disagree. This one exists because
   * the player's collision and the water predicate ask per frame.
   */
  readonly landscape: BuiltBaseField;
  /**
   * The landscape without its caves — "not underground" rather than "outside material".
   *
   * **The same function object as the water mesher's gate is given**, which is the property
   * `base-field.ts:70-72` states: a chunk gets water geometry the player is not in the moment
   * these are two functions rather than one.
   */
  readonly ground: (x: number, y: number, z: number) => number;
  /**
   * Which way this world's sea faces, per fragment.
   *
   * **A property of the landscape rather than a branch on `positionWorld`**, which is the whole
   * of `water.ts:44-52`. A sphere's sea points away from the centre everywhere; a plane's is
   * world up at every point. Read it with {@link waterShapeOf} where a material is being built
   * and no landscape has been.
   */
  readonly water: WaterShape;
  /**
   * The cloud deck above this world: the altitudes it is between, its thickness, and the
   * distance one of its features spans.
   *
   * **Here rather than derived at the cloud layer, because the deck's base is a function of
   * the same numbers everything else in this record is.** It is clear of *this* world's reach
   * — and a height field's noise reaches further per unit of scale than a sphere's, because
   * its amplitude bound is two where a sphere's is one — so a layer handed the sphere's deck on
   * a height field would sit at a different height above the ground than the mountains reach.
   */
  readonly deck: CloudDeck;
}

/**
 * The planet, with the caves this application's world has and the library's default does not.
 *
 * **`DEFAULT_PLANET` spread rather than used whole, and the caves are the reason** — see
 * `app.tsx:187-198`. A default planet *with* caves cannot state any property of its own
 * surface: `∂f/∂r` is exactly 1 and a normal's radial component is exactly 1, and both stop
 * being true within a few units of a cave, so `planet.test.ts` would lose three of its own
 * correctness checks.
 *
 * **And why a sphere has caves at all:** a planet here is 272,000 units across with a
 * 1,280-unit horizon, so a player sees nothing but the ground under a sky with no depth to it.
 * The caves are the only thing underfoot that is not sky, and they are what gives a shaft
 * somewhere to go.
 */
const planetSpec: BaseFieldSpec = {
  kind: "planet",
  params: { ...DEFAULT_PLANET, caves: DEFAULT_CAVES },
};

/**
 * The height field, as the library's plain default.
 *
 * **No caves, and the asymmetry with `planetSpec` is the point rather than an oversight.** The
 * reason stated above is that a sphere's surface is the only thing underfoot; a landscape is
 * already three-dimensional and its depth is not the question, so a flat world does not need
 * them for that reason. `DEFAULT_TERRAIN` is also the library's plain default, which
 * `terrain.ts:340-344` says is the one every consumer wants — `DEFAULT_CAVES` exists to be
 * spread into a parameters object that asks for them.
 */
const terrainSpec: BaseFieldSpec = { kind: "terrain", params: DEFAULT_TERRAIN };

/**
 * Which way each world's sea faces, per fragment.
 *
 * **A function of the shape rather than a property of a built geometry, because a material wants
 * this before it wants a field.** `WaterMaterial` takes its shape as a constructor argument and
 * reads it while the shader graph is built (`water.ts:119`, `:142`), so the water material for a
 * world has to be buildable without building that world's landscape — which is why this is not
 * `worldGeometry(shape).water` and why {@link WorldGeometry.water} is a convenience over it.
 */
export const waterShapeOf = (shape: WorldShape): WaterShape =>
  shape === "sphere" ? sphericalWater : flatWater;

/** One line saying what a world is, for the console and the header. */
export const describeWorldShape = (shape: WorldShape): string =>
  shape === "sphere"
    ? "sphere (sea at a radius from the centre)"
    : "flat (sea at an altitude, y is always up)";

/**
 * Builds one world's geometry.
 *
 * **The centre is the origin on a sphere, and `app.tsx`'s own comment says why it must be:**
 * `chunkCellOf` is a per-axis floor around the world origin, so a lattice re-centred on the
 * planet would have to be rebuilt to put a planet anywhere else. A flat world has no centre,
 * which is `flatFrame`'s `centre: undefined` and is what the world bound reads to decide
 * between a cube and a sphere.
 */
export const worldGeometry = (shape: WorldShape): WorldGeometry => {
  const baseField = shape === "sphere" ? planetSpec : terrainSpec;
  // **Thrown rather than asserted non-null.** `baseFieldFor` answers `undefined` only for a
  // spec that is `undefined`, and this spec is not — so an `undefined` here is a defect in the
  // union above, and it should stop the world rather than reach a worker as a `NaN`.
  const landscape = baseFieldFor(baseField);
  if (landscape === undefined) {
    throw new Error(`a "${shape}" world built no landscape`);
  }
  return {
    shape,
    baseField,
    frame: shape === "sphere" ? sphericalFrame(vec3(0, 0, 0)) : flatFrame,
    seaLevel: seaLevelOf(baseField),
    landscape,
    // **A solid world's landscape is its own field**, which is what the absence of `ground`
    // means (`base-field.ts:47-48`), and reading it through a fallback keeps every caller of
    // `WorldGeometry.ground` free of a check for a case the union has already decided.
    ground: landscape.ground ?? ((x, y, z) => landscape(x, y, z)),
    water: waterShapeOf(shape),
    deck: cloudDeck(baseField),
  };
};

/** The query-string flag that chooses the world, beside `?lod`, `?edit` and `?spike`. */
export const WORLD_SEARCH_FLAG = "world";

/**
 * The world the URL asks for, or the default.
 *
 * **Anything unrecognised is the default rather than a refusal.** Every other flag in this file
 * is an experiment (`?lod=off` separates two possible causes of a crack, per `app.tsx:322-330`)
 * and this one is a shape choice with a wrong answer in both directions — a typo that silently
 * gave a player a sphere is not a failure worth stopping the world for, and the query string is
 * not the format that validates (the manifest is, in `place-file.ts`).
 */
export const worldShapeFromSearch = (
  search: URLSearchParams | undefined,
): WorldShape => {
  const asked = search?.get(WORLD_SEARCH_FLAG)?.trim().toLowerCase();
  return isWorldShape(asked) ? asked : DEFAULT_WORLD_SHAPE;
};
