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
 *
 * ## Why the box is described in the shape's own frame
 *
 * **Because a level shape can be turned** ([ADR
 * 0051](../../../../docs/adr/0051-a-level-shape-carries-its-turn.md)), and a `{min, max}`
 * pair is a world-space axis-aligned box, which cannot be turned without being rebuilt. An
 * `OrientedBox` below is the same three numbers the box always was — a middle, a half-size,
 * and a turn — and both questions asked of a box now share one answer.
 *
 * The middle is worth dwelling on, because it is what makes the gizmo's pivot free. **Every
 * primitive's half-extents are a symmetric box about its own origin** — ADR 0025 is what
 * makes capsules, cones and cylinders point up about Y — so the centre of the box *is* the
 * shape's `at`, at every orientation, for all nine primitives. "Turn it about the middle of
 * the box" and "turn it about where it stands" are the same point, and neither needs
 * computing.
 *
 * **The box is still an approximation of the shape, and deliberately so.** A capsule is not
 * a box and a sphere is not either. A forgiving hit is the right direction for a control the
 * person is aiming with, and it is the answer the primitive table gives for free — see
 * `shapeBox` below for why that is not a list anybody has to keep up to date.
 */

import { conjugate, rotate } from "@big-mesh-studios/csg";
import { primitiveHalfExtents, shapePadding } from "@big-mesh-studios/sdf";
import type { Bounds, Quat, Vec3 } from "@big-mesh-studios/core";

import { LEVEL_FIGURE_PREFIX } from "../../places/level/types";
import type {
  LevelFigure,
  LevelItem,
  LevelShape,
  LevelWalls,
} from "../../places/level/types";
import { wallsBounds } from "../../places/level/walls";

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
 * A box that knows which way it is turned: where its middle is, how far it reaches along
 * each of its **own** axes, and how that frame sits in the world.
 *
 * **This replaced a `{min, max}` pair, and the reason is the turn.** A min/max pair is a
 * world-space axis-aligned box, which cannot be rotated without being rebuilt — and a level
 * shape carries a turn ([ADR
 * 0051](../../../../docs/adr/0051-a-level-shape-carries-its-turn.md)). Describing the box in
 * the shape's own frame and letting the consumer apply the turn means one answer serves both
 * questions the box is asked: where the shape is, and which way it faces.
 *
 * **It is the shape's own frame, not a bounding box of one.** `half` is the primitive's
 * half-extents padded by its softness — the same number the mesher uses — and `centre` is the
 * shape's `at`. Those two facts make the pivot free: a half-box is symmetric about its own
 * origin, so the middle of the box *is* the shape's `at` at every orientation, and the gizmo
 * can turn about it without asking where the middle went.
 *
 * A figure's box is the same three numbers with a yaw in place of a quaternion, which is why
 * this type is shared rather than a shape-only one.
 */
export interface OrientedBox {
  /** Where the middle of the box is — a shape's own origin. */
  readonly centre: Vec3;
  /** How far it reaches along each of its own axes. Never negative. */
  readonly half: Vec3;
  /** Which way its own axes point in the world. The identity for an un-turned shape. */
  readonly orientation: Quat;
}

/** The turn of a shape that names none. */
const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * A level's turn, as the quaternion an `OrientedBox` holds.
 *
 * **The one conversion between the level format's arrays and the model's objects.** `at` and
 * `orientation` cross the boundary as arrays because that is what JSON makes of them and
 * what the guest takes; a box is described in objects. `apply-level.ts` makes the same
 * conversion for an operation, and `host.ts` for one arriving off the wire — three copies of
 * one four-number reorder is three chances to disagree about which end is `w`.
 */
const quatOf = (
  orientation: readonly [number, number, number, number] | undefined,
): Quat =>
  orientation === undefined
    ? IDENTITY
    : {
        x: orientation[0],
        y: orientation[1],
        z: orientation[2],
        w: orientation[3],
      };

/**
 * A turn of `radians` about up, which is what a figure's `yaw` is.
 *
 * **Its own function rather than an inline four-number literal**, because a figure's yaw and
 * a shape's orientation are the same turn described twice and the two must not drift.
 */
export const yawOrientation = (radians: number): Quat => ({
  x: 0,
  y: Math.sin(radians / 2),
  z: 0,
  w: Math.cos(radians / 2),
});

/**
 * The box a shape occupies, in its own frame.
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
 */
export const shapeBox = (item: LevelShape): OrientedBox => {
  const half = primitiveHalfExtents(item.shape);
  const padding = shapePadding(item.shape, item.softness ?? 0);
  return {
    centre: { x: item.at[0], y: item.at[1], z: item.at[2] },
    half: {
      x: half.x + padding,
      y: half.y + padding,
      z: half.z + padding,
    },
    orientation: quatOf(item.orientation),
  };
};

/**
 * The box a figure occupies, in its own frame.
 *
 * **The model's own half-extents at the point it stands**, with its yaw as the turn. `half`
 * comes from the world rather than from the file — it is a property of the model, and a level
 * has no opinion about it beyond where the figure is.
 */
export const figureBox = (
  item: LevelFigure,
  half: Vec3 | undefined,
): OrientedBox => ({
  centre: { x: item.at[0], y: item.at[1], z: item.at[2] },
  half: half ?? { x: 1, y: 2, z: 1 },
  orientation: yawOrientation(item.yaw ?? 0),
});

/**
 * The box a walls item occupies, in its own frame.
 *
 * **The world box of every point and every point lifted by the height**, which `walls.ts`
 * computes once so picking and the highlight cannot disagree. The turn is the identity: the
 * box is world-axis-aligned, and a wall drawn at an angle occupies a slightly larger box than
 * it fills — which is the forgiving direction a click wants.
 */
export const wallsBox = (item: LevelWalls): OrientedBox => {
  const bounds = wallsBounds(item);
  return {
    centre: {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    },
    half: {
      x: (bounds.max.x - bounds.min.x) / 2,
      y: (bounds.max.y - bounds.min.y) / 2,
      z: (bounds.max.z - bounds.min.z) / 2,
    },
    orientation: IDENTITY,
  };
};

/**
 * Where a ray crosses a box, or `undefined` if it misses.
 *
 * **The slab method**, with the near side taken when the ray runs backwards through it, so
 * a box the camera is already inside returns zero rather than being skipped. That is what
 * makes the camera-inside case above need its own check rather than falling out of the
 * arithmetic.
 *
 * **Axis-aligned, and therefore always about a box already in its own frame.** That is what
 * lets the oriented test below be two rotations and this function, rather than a second
 * implementation of the same arithmetic.
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

/**
 * Where a ray crosses a turned box, or `undefined` if it misses.
 *
 * **By putting the ray in the box's frame rather than by writing a second slab test.** The
 * box is already described in its own axes, so the only thing standing between it and
 * `rayBoxDistance` is a change of coordinates: the ray's origin is moved to the box's middle
 * and both it and the direction are turned by the conjugate. The distance along the ray is
 * unchanged by a rotation, so the number that comes back is the number the caller wants.
 *
 * **The conjugate rather than an inverse solve**, which is what `Operation` already stores
 * alongside itself for the same reason (`packages/csg/src/operations.ts:125-128`) — a unit
 * quaternion's inverse is its conjugate, and one negation is cheaper than solving for a
 * matrix nobody keeps.
 */
export const rayOrientedBoxDistance = (
  ray: Ray,
  box: OrientedBox,
): number | undefined => {
  const inverse = conjugate(box.orientation);
  const centre = box.centre;
  return rayBoxDistance(
    {
      origin: rotate(
        {
          x: ray.origin.x - centre.x,
          y: ray.origin.y - centre.y,
          z: ray.origin.z - centre.z,
        },
        inverse,
      ),
      direction: rotate(ray.direction, inverse),
    },
    {
      min: { x: -box.half.x, y: -box.half.y, z: -box.half.z },
      max: { x: box.half.x, y: box.half.y, z: box.half.z },
    },
  );
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
 * Whether a point is inside a turned box, on every face included.
 *
 * **The same change of coordinates as the ray test**, and for the same reason: the camera
 * standing inside a wall someone carved a room out of has to be recognised as inside that
 * wall whether or not the wall has been turned since.
 */
export const orientedBoxContains = (point: Vec3, box: OrientedBox): boolean =>
  boxContains(
    rotate(
      {
        x: point.x - box.centre.x,
        y: point.y - box.centre.y,
        z: point.z - box.centre.z,
      },
      conjugate(box.orientation),
    ),
    {
      min: { x: -box.half.x, y: -box.half.y, z: -box.half.z },
      max: { x: box.half.x, y: box.half.y, z: box.half.z },
    },
  );

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
    const box = item.kind === "walls" ? wallsBox(item) : shapeBox(item);
    // The one skip. A camera inside a subtracted box would otherwise select that box for
    // every click, forever — and a box that has been turned is still the room.
    if (
      item.kind === "shape" &&
      item.shape.type === "Box" &&
      orientedBoxContains(ray.origin, box)
    ) {
      continue;
    }

    const distance = rayOrientedBoxDistance(ray, box);
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
