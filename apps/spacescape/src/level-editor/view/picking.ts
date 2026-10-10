/**
 * Choosing which item a click in the world meant.
 *
 * ## Why shapes are picked by their box and figures are picked by their field
 *
 * Those are the two different questions in a world made of both, and using one answer for
 * both would be wrong for each.
 *
 * - **A shape is tested against its own box.** The level already holds its parameters, so
 *   the box is arithmetic, and a ray/box test over a few hundred items is nothing. It also
 *   means clicking a wall selects the wall even where the wall is *not* the nearest surface
 *   — which is what a person means when they click a wall they built.
 * - **A figure is traced through its own field**, by `FigureSet.pick`. A prop's collision
 *   box is yaw-aligned and its holes are solid, so a box test would select a chair by its
 *   corners and miss a lantern in the middle of it. The figure picker already exists for
 *   the player (`figure-picker.ts`) and this uses it, which means a prop the editor cannot
 *   pick is a prop the player cannot aim at either.
 *
 * ## The one case where a shape is skipped
 *
 * **A box the camera is inside is not selected.** A ray starting inside a shape enters it
 * at distance zero, so the nearest crossing is always that one — and a person who has
 * carved a room out of a subtracted box could never select anything they built inside it.
 * Only `Box` is skipped, because every other primitive is one box; a house built of four
 * walls does not contain its own interior as far as a single box is concerned.
 */

import { primitiveHalfExtents, shapePadding } from "@big-mesh-studios/sdf";
import type { Bounds, Vec3 } from "@big-mesh-studios/core";

import { LEVEL_FIGURE_PREFIX } from "../../places/level/types";
import type {
  LevelFigure,
  LevelItem,
  LevelShape,
} from "../../places/level/types";

/** How far a click reaches, in world units. A level is built from across a room. */
export const SELECT_REACH = 2000;

/** A ray, in the shape `@big-mesh-studios/picking` hands back. */
export interface Ray {
  readonly origin: Vec3;
  readonly direction: Vec3;
}

/** What a click landed on. */
export interface ItemHit {
  /** Where it is in the level's list, which is what the editor selects by. */
  readonly index: number;
  readonly distance: number;
}

/**
 * The box a shape occupies, centred on its origin.
 *
 * **The primitive's own half-extents, padded by its softness.**
 *
 * The half-extents come from the primitive table rather than from a switch here, because
 * that is the table's job and a second one would fall out of step the day a shape was added
 * ([ADR 0025](../../../../docs/adr/0025-a-primitive-is-one-table-entry.md)).
 *
 * The padding is `shapePadding` because the mesher uses the same number: a soft shape
 * reaches beyond its own box by exactly that much, and a box that did not admit it would
 * make a wall unpickable exactly where it is softest.
 *
 * **An axis-aligned box, so a rotated shape is picked by its unrotated extent.** The
 * editor places shapes unrotated — there is no rotation control — and a box bigger than
 * the shape is a forgiving hit rather than a wrong one. A future rotation would want the
 * oriented box, and this is where it would go.
 */
export const shapeBox = (item: LevelShape): Bounds => {
  const half = primitiveHalfExtents(item.shape);
  const padding = shapePadding(item.shape, item.softness ?? 0);
  const at = { x: item.at[0], y: item.at[1], z: item.at[2] };
  return {
    min: {
      x: at.x - half.x - padding,
      y: at.y - half.y - padding,
      z: at.z - half.z - padding,
    },
    max: {
      x: at.x + half.x + padding,
      y: at.y + half.y + padding,
      z: at.z + half.z + padding,
    },
  };
};

/**
 * Where a ray crosses a box, or `undefined` if it misses.
 *
 * **The slab method**, with the near side taken when the ray runs backwards through it, so
 * a box the camera is already inside returns zero rather than being skipped. That is what
 * makes the camera-inside case above need its own check rather than falling out of the
 * arithmetic.
 */
export const rayBoxDistance = (ray: Ray, box: Bounds): number | undefined => {
  let near = -Infinity;
  let far = Infinity;

  for (const axis of ["x", "y", "z"] as const) {
    const origin = ray.origin[axis];
    const direction = ray.direction[axis];
    if (direction === 0) {
      // Parallel to this slab: a hit only if the origin is already between the planes.
      if (origin < box.min[axis] || origin > box.max[axis]) return undefined;
      continue;
    }
    const enter = (box.min[axis] - origin) / direction;
    const leave = (box.max[axis] - origin) / direction;
    near = Math.max(near, Math.min(enter, leave));
    far = Math.min(far, Math.max(enter, leave));
    if (near > far) return undefined;
  }

  if (far < 0) return undefined;
  return near < 0 ? 0 : near;
};

/** Whether a point is inside a box, on every face included. */
export const boxContains = (point: Vec3, box: Bounds): boolean =>
  point.x >= box.min.x &&
  point.x <= box.max.x &&
  point.y >= box.min.y &&
  point.y <= box.max.y &&
  point.z >= box.min.z &&
  point.z <= box.max.z;

/**
 * The nearest shape a ray crosses.
 *
 * **Every shape, not the nearest shape in the fold.** These are different questions and
 * the fold order is not an answer to this one: a person clicking a wall wants the wall
 * they can see, and the thing in front of it may be a subtract they made to cut a doorway.
 */
export const pickShape = (
  items: readonly LevelItem[],
  ray: Ray,
  reach: number = SELECT_REACH,
): ItemHit | undefined => {
  let best: ItemHit | undefined;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item.kind === "figure") continue;
    // The one skip. A camera inside a subtracted box would otherwise select that box for
    // every click, forever.
    if (item.shape.type === "Box" && boxContains(ray.origin, shapeBox(item)))
      continue;

    const distance = rayBoxDistance(ray, shapeBox(item));
    if (distance === undefined || distance > reach) continue;
    if (best !== undefined && distance >= best.distance) continue;
    best = { index, distance };
  }
  return best;
};

/** What a figure pick has to answer, which is `FigureSet.pick`'s shape. */
export type FigurePick = (
  origin: Vec3,
  direction: Vec3,
  reach?: number,
) => { readonly id: string; readonly distance: number } | undefined;

/**
 * The nearest figure a ray crosses, by its position in the level.
 *
 * **Through `FigureSet.pick`, so this is the same answer the player's crosshair gets.** A
 * prop the editor cannot select is a prop nobody can aim at, and a second picker here would
 * be a second answer to one question.
 *
 * **`FigureHit` carries a distance**, so this returns a real one and `pickItem` can weigh
 * a figure against a shape on equal terms rather than guessing at which is nearer.
 */
export const pickFigure = (
  items: readonly LevelItem[],
  pick: FigurePick,
  ray: Ray,
  reach: number = SELECT_REACH,
): ItemHit | undefined => {
  const found = pick(ray.origin, ray.direction, reach);
  if (found === undefined) return undefined;
  // `FigureSet` answers in the world's id space; the level's ids are namespaced on the
  // way out, so the two have to be matched by position in the list rather than by id.
  const index = items.findIndex(
    (item): item is LevelFigure =>
      item.kind === "figure" && item.id === idWithoutLevel(found.id),
  );
  return index === -1 ? undefined : { index, distance: found.distance };
};

/**
 * The nearest item of either kind.
 *
 * **One ray over the whole level, nearest wins** — the same rule voxelscape's `pickItem`
 * uses, and the reason selection matches what the creator sees. A prop standing in front
 * of a wall selects the prop; a wall in front of a prop selects the wall.
 *
 * **The two distances are comparable because both are measured along the same ray**, which
 * is why `FigureHit.distance` matters here and why a tie goes to the figure: a prop sitting
 * exactly on a wall's face is the more specific answer, and it is the one a person is more
 * likely to have meant to click.
 */
export const pickItem = (
  items: readonly LevelItem[],
  ray: Ray,
  pickFigureFromWorld?: FigurePick,
  reach: number = SELECT_REACH,
): ItemHit | undefined => {
  const shape = pickShape(items, ray, reach);
  const figure =
    pickFigureFromWorld === undefined
      ? undefined
      : pickFigure(items, pickFigureFromWorld, ray, reach);
  if (shape === undefined) return figure;
  if (figure === undefined) return shape;
  return figure.distance <= shape.distance ? figure : shape;
};

/** The world's figure id back to the name the level gave it. */
export const idWithoutLevel = (id: string): string =>
  id.startsWith(LEVEL_FIGURE_PREFIX)
    ? id.slice(LEVEL_FIGURE_PREFIX.length)
    : id;
