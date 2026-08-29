// CPU monster picking: the crosshair ray against each monster's body, the same
// way `world/picker.ts` picks voxels. The zombie's body is an oriented box —
// it yaws to face its heading — so the ray is rotated into each monster's own
// frame and tested against its body half-extents there, which makes the hit
// track the model whatever way it faces. A pure slab test returns the nearest
// monster whose body the ray crosses within reach — the target a sword swing
// lands on — so the attack can decide whether to hurt anything without asking
// the graphics card or the renderer.
import { kindHitbox, type MonsterSnapshot } from "./monster";
import { DEFAULT_REACH } from "../world/picker";

/** The sword's reach, 60% of the block placement reach. */
export const SWORD_REACH = DEFAULT_REACH * 0.6;

/** Damage one sword swing deals; a zombie dies in three swings. */
export const SWORD_DAMAGE = 8;

/** How far a swing shoves the monster it hits, in world units. */
export const KNOCKBACK = 1.2;

export interface MonsterHit {
  id: string;
  /** Distance along the ray to the first body crossing, in world units. */
  distance: number;
}

interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** The distance along a ray to the first crossing of a box, or null. */
const rayBoxDistance = (
  origin: [number, number, number],
  direction: [number, number, number],
  box: Box,
): number | null => {
  const tMin = [0, 0, 0];
  const tMax = [0, 0, 0];
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
      // A negative direction swaps which face is near, so the interval has to
      // be flipped before the slab test combines the three axes.
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
 * The nearest monster the crosshair ray crosses before `maxReach` world units,
 * or null when the ray hits none. The origin may sit inside a monster's body —
 * as it can when a zombie is right in the player's face — and that counts as a
 * hit at distance 0. Dead monsters are not targets.
 */
export const pickMonster = (
  origin: [number, number, number],
  direction: [number, number, number],
  monsters: Iterable<MonsterSnapshot>,
  maxReach: number = SWORD_REACH,
): MonsterHit | null => {
  let best: MonsterHit | null = null;
  for (const m of monsters) {
    if (m.hp <= 0) {
      continue;
    }
    const hitbox = kindHitbox(m.kind);
    // Rotate the ray into the monster's frame (undoing its yaw) so the box it
    // is tested against is the body as it actually faces. Rotation preserves
    // lengths, so the crossing distance stays a world distance.
    const cos = Math.cos(m.pose.yaw);
    const sin = Math.sin(m.pose.yaw);
    const ox = origin[0] - m.pose.x;
    const oz = origin[2] - m.pose.z;
    const localOrigin: [number, number, number] = [
      ox * cos - oz * sin,
      origin[1] - m.pose.y,
      ox * sin + oz * cos,
    ];
    const localDirection: [number, number, number] = [
      direction[0] * cos - direction[2] * sin,
      direction[1],
      direction[0] * sin + direction[2] * cos,
    ];
    const box: Box = {
      minX: -hitbox.halfWidth,
      maxX: hitbox.halfWidth,
      minY: -hitbox.halfHeight,
      maxY: hitbox.halfHeight,
      minZ: -hitbox.halfDepth,
      maxZ: hitbox.halfDepth,
    };
    const distance = rayBoxDistance(localOrigin, localDirection, box);
    if (distance !== null && distance <= maxReach) {
      if (best === null || distance < best.distance) {
        best = { id: m.id, distance };
      }
    }
  }
  return best;
};
