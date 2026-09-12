// Collision against scripted props: the axis-aligned boxes a place stands in
// the world block the player where voxels cannot, because a prop is a model
// rather than part of the terrain. The player's physics only ever asks whether
// a point is solid and where the ground is, so a caller wraps its terrain
// samplers with these and the mover needs no knowledge of props at all.
/** A box a prop is solid over, in world units, optionally turned about its centre. */
export interface SolidBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  /** Yaw about the box's vertical centre line, in radians; defaults to 0. */
  yaw?: number;
  /** The box's own velocity, in world units per second; defaults to still. */
  vx?: number;
  vy?: number;
  vz?: number;
}

/** How far below a box's top still counts as standing on it, in world units. */
const TOUCH = 1e-3;

/**
 * Whether (`x`, `z`) lies inside a box's footprint, turning the point back by
 * the box's yaw about its centre so a turned platform is met where it now sits.
 */
const inFootprint = (box: SolidBox, x: number, z: number): boolean => {
  const yaw = box.yaw ?? 0;
  if (yaw === 0) {
    return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
  }
  const hx = (box.maxX - box.minX) / 2;
  const hz = (box.maxZ - box.minZ) / 2;
  const dx = x - (box.minX + box.maxX) / 2;
  const dz = z - (box.minZ + box.maxZ) / 2;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return Math.abs(dx * c - dz * s) <= hx && Math.abs(dx * s + dz * c) <= hz;
};

/** Whether a world point lies inside a solid box. */
export const boxContains = (
  box: SolidBox,
  x: number,
  y: number,
  z: number,
): boolean => y >= box.minY && y <= box.maxY && inFootprint(box, x, z);

/** Whether a world point lies inside any of `boxes`. */
export const solidBoxAt = (
  boxes: readonly SolidBox[],
  x: number,
  y: number,
  z: number,
): boolean => boxes.some((box) => boxContains(box, x, y, z));

/**
 * The highest box top at or below `y` over the column at (`x`, `z`), in world
 * units, or `-Infinity` when none stands there. Mirrors `groundHeightAt`, so a
 * player can stand on a bed or a counter the way they stand on a voxel.
 */
export const boxGroundAt = (
  boxes: readonly SolidBox[],
  x: number,
  y: number,
  z: number,
): number => {
  let best = -Infinity;
  for (const box of boxes) {
    if (inFootprint(box, x, z) && box.maxY <= y + TOUCH && box.maxY > best) {
      best = box.maxY;
    }
  }
  return best;
};

/**
 * The velocity of the box whose top holds the player up over the column at
 * (`x`, `z`), or null when no box stands there. Mirrors `boxGroundAt`, so the
 * platform the ground sampler chose is the one whose motion carries the player.
 */
export const boxVelocityAt = (
  boxes: readonly SolidBox[],
  x: number,
  y: number,
  z: number,
): [number, number, number] | null => {
  let best: SolidBox | null = null;
  let bestTop = -Infinity;
  for (const box of boxes) {
    if (inFootprint(box, x, z) && box.maxY <= y + TOUCH && box.maxY > bestTop) {
      bestTop = box.maxY;
      best = box;
    }
  }
  return best === null ? null : [best.vx ?? 0, best.vy ?? 0, best.vz ?? 0];
};
