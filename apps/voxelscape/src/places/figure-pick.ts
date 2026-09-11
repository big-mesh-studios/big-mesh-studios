// CPU figure picking: the crosshair ray against each scripted figure's upright
// body, the same way `world/picker.ts` picks voxels. A figure stands as a box
// from its grounded feet up its drawn height, so an NPC and a placed prop are
// picked the same way whether the box is the default body or the wider one a
// vending machine's model implies.
export interface AimTarget {
  id: string;
  /** Feet position, in world units. */
  x: number;
  y: number;
  z: number;
  /** Half the body's width and depth; defaults to `FIGURE_HALF`. */
  half?: number;
  /** How tall the body stands above its feet; defaults to `FIGURE_HEIGHT`. */
  height?: number;
}

/** How close a player must aim to reach a figure, in world units. */
export const FIGURE_REACH = 5;

export interface FigureHit {
  id: string;
  /** Distance along the ray to the first body crossing, in world units. */
  distance: number;
}

/** Half the default body's width and depth, in world units. */
const FIGURE_HALF = 0.6;
/** How tall the default body stands above its feet, in world units. */
const FIGURE_HEIGHT = 2;

/** The distance along a ray to the first crossing of an axis-aligned box, or null. */
const rayBoxDistance = (
  origin: [number, number, number],
  direction: [number, number, number],
  box: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  },
): number | null => {
  const tMin: [number, number, number] = [0, 0, 0];
  const tMax: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const o = origin[axis];
    const d = direction[axis];
    const min = axis === 0 ? box.minX : axis === 1 ? box.minY : box.minZ;
    const max = axis === 0 ? box.maxX : axis === 1 ? box.maxY : box.maxZ;
    if (Math.abs(d) < 1e-9) {
      if (o < min || o > max) {
        return null;
      }
      tMin[axis] = -Infinity;
      tMax[axis] = Infinity;
    } else {
      const inv = 1 / d;
      tMin[axis] = (min - o) * inv;
      tMax[axis] = (max - o) * inv;
      if (tMin[axis] > tMax[axis]) {
        const swap = tMin[axis];
        tMin[axis] = tMax[axis];
        tMax[axis] = swap;
      }
    }
  }
  const entry = Math.max(tMin[0], tMin[1], tMin[2]);
  const exit = Math.min(tMax[0], tMax[1], tMax[2]);
  if (entry > exit || exit < 0) {
    return null;
  }
  return Math.max(0, entry);
};

/**
 * The nearest figure the crosshair ray crosses before `maxReach` world units,
 * or null when it crosses none. The origin may sit inside a figure's body — as
 * it can when one is right in the player's face — and that counts as a hit at
 * distance 0.
 */
export const pickFigure = (
  origin: [number, number, number],
  direction: [number, number, number],
  figures: Iterable<AimTarget>,
  maxReach: number = FIGURE_REACH,
): FigureHit | null => {
  let best: FigureHit | null = null;
  for (const figure of figures) {
    const half = figure.half ?? FIGURE_HALF;
    const height = figure.height ?? FIGURE_HEIGHT;
    const distance = rayBoxDistance(origin, direction, {
      minX: figure.x - half,
      maxX: figure.x + half,
      minY: figure.y,
      maxY: figure.y + height,
      minZ: figure.z - half,
      maxZ: figure.z + half,
    });
    if (
      distance !== null &&
      distance <= maxReach &&
      (best === null || distance < best.distance)
    ) {
      best = { id: figure.id, distance };
    }
  }
  return best;
};

/** How close a player must aim to start a talk, in world units. */
export const NPC_TALK_REACH = FIGURE_REACH;

/**
 * The nearest NPC the crosshair ray crosses before `maxReach` world units, or
 * null when it crosses none. A shorthand for `pickFigure` at the default body
 * size, which is what a talkable NPC stands as.
 */
export const pickNpc = (
  origin: [number, number, number],
  direction: [number, number, number],
  npcs: Iterable<AimTarget>,
  maxReach: number = NPC_TALK_REACH,
): FigureHit | null => pickFigure(origin, direction, npcs, maxReach);
