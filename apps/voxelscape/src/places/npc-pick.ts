// CPU NPC picking: the crosshair ray against each NPC's upright body, the same
// way `monsters/hit.ts` picks monsters and `world/picker.ts` picks voxels. An
// NPC stands as a box from its grounded feet up two world units, so the pick is
// a plain slab test per NPC returning the nearest one the ray crosses within
// talk reach — what a tap or click over an NPC means, before the tool would act.
import type { RenderedNpc } from "./npc-figures";

/** How close a player must aim to start a talk, in world units. */
export const NPC_TALK_REACH = 5;

export interface NpcHit {
  id: string;
  /** Distance along the ray to the first body crossing, in world units. */
  distance: number;
}

/** Half the width and depth of an NPC's body, in world units. */
const HALF = 0.6;
/** How tall an NPC's body stands above its feet, in world units. */
const HEIGHT = 2;

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
 * The nearest NPC the crosshair ray crosses before `maxReach` world units, or
 * null when it crosses none. The origin may sit inside an NPC's body — as it
 * can when one is right in the player's face — and that counts as a hit at
 * distance 0.
 */
export const pickNpc = (
  origin: [number, number, number],
  direction: [number, number, number],
  npcs: Iterable<RenderedNpc>,
  maxReach: number = NPC_TALK_REACH,
): NpcHit | null => {
  let best: NpcHit | null = null;
  for (const npc of npcs) {
    const distance = rayBoxDistance(origin, direction, {
      minX: npc.x - HALF,
      maxX: npc.x + HALF,
      minY: npc.y,
      maxY: npc.y + HEIGHT,
      minZ: npc.z - HALF,
      maxZ: npc.z + HALF,
    });
    if (
      distance !== null &&
      distance <= maxReach &&
      (best === null || distance < best.distance)
    ) {
      best = { id: npc.id, distance };
    }
  }
  return best;
};
