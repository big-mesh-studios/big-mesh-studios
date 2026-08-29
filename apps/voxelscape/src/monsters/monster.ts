// Deterministic monster identity and spawning. Every monster that can exist
// is addressed by the terrain seed and a (cell, slot) pair, so any client can
// agree on which monster is which and where it spawns without a shared server.
// Only some (seed, cell, slot) combinations hold a monster; whether one does,
// and what it is, are pure functions of that address.

export type MonsterKind = "zombie";

export type MonsterState = "sleep" | "wander" | "chase" | "attack";

export interface MonsterPose {
  /** Cube centre, in world units. */
  x: number;
  y: number;
  z: number;
  /** Heading, in radians; 0 faces +Z, matching the player pose convention. */
  yaw: number;
  /** Horizontal velocity in world units per second, for observers to predict from. */
  vx: number;
  vz: number;
}

export interface MonsterSnapshot {
  id: string;
  kind: MonsterKind;
  pose: MonsterPose;
  hp: number;
  maxHp: number;
  state: MonsterState;
  /** Seconds until the current wander heading is re-rolled. */
  wanderLeft: number;
  /** Seconds until the zombie can swing again. */
  cooldown: number;
  /** DID of the player that simulates this monster, or null while it sleeps unowned. */
  owner: string | null;
  /** The moment this state was produced, on the producing client's clock; drives last-write-wins. */
  authoritativeAt: number;
  /** The local moment the snapshot was last refreshed, for dead-reckoning freshness. */
  updatedAt: number;
}

export interface MonsterSpawn {
  id: string;
  kind: MonsterKind;
  /** PRNG seed for the monster's life-long wander and attack randomness. */
  rngSeed: number;
  maxHp: number;
}

/** The spawn grid's cell size, in world units. */
export const SPAWN_CELL = 32;
/** How many monster slots each cell may hold. */
export const SLOTS_PER_CELL = 2;
/** Fraction of (seed, cell, slot) addresses that actually hold a monster. */
export const MONSTER_DENSITY = 0.15;

/** Per-kind traits every monster of that kind shares. */
interface KindTraits {
  maxHp: number;
  /** Half the cube height, so a pose's y (a cube centre) stands above the ground. */
  halfHeight: number;
  /** Half the body's width, across the monster's own left-right axis. */
  halfWidth: number;
  /** Half the body's depth, across the monster's own front-back axis. */
  halfDepth: number;
}

// The zombie's body measures 15 voxels wide, 22 tall and 8 deep in its 24³
// grid, rendered into a 2.2-unit box (about 0.09 units per voxel): a 1.1-unit
// shoulder span and a half-metre depth, with a little given away to make a
// swing at the model land.
const KIND_TRAITS: Record<MonsterKind, KindTraits> = {
  zombie: { maxHp: 20, halfHeight: 1.1, halfWidth: 0.7, halfDepth: 0.45 },
};

/** The stable, world-unique id of the monster at a (seed, cell, slot) address. */
export const monsterId = (
  seed: number,
  cx: number,
  cz: number,
  slot: number,
): string => `m${seed}_${cx}_${cz}_${slot}`;

/** A deterministic 32-bit PRNG (mulberry32), as the weather schedule uses. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A stable 32-bit hash of four integers, for deriving ids and seeds. */
const hashInt = (a: number, b: number, c: number, d: number): number => {
  let h =
    (a ^
      Math.imul(b, 0x9e3779b1) ^
      Math.imul(c, 0x85ebca6b) ^
      Math.imul(d, 0xc2b2ae35)) |
    0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return h | 0;
};

/** The monster at a (seed, cell, slot) address, or null when that cell holds none. */
export const monsterAt = (
  seed: number,
  cx: number,
  cz: number,
  slot: number,
): MonsterSpawn | null => {
  const rngSeed = hashInt(seed, cx, cz, slot);
  if (mulberry32(rngSeed)() >= MONSTER_DENSITY) {
    return null;
  }
  return {
    id: monsterId(seed, cx, cz, slot),
    kind: "zombie",
    rngSeed,
    maxHp: KIND_TRAITS.zombie.maxHp,
  };
};

/** Half the cube height a monster of `kind` stands at. */
export const kindHalfHeight = (kind: MonsterKind): number =>
  KIND_TRAITS[kind].halfHeight;

/** The body half-extents a monster of `kind` is hit by, in its own frame. */
export const kindHitbox = (
  kind: MonsterKind,
): { halfWidth: number; halfHeight: number; halfDepth: number } => ({
  halfWidth: KIND_TRAITS[kind].halfWidth,
  halfHeight: KIND_TRAITS[kind].halfHeight,
  halfDepth: KIND_TRAITS[kind].halfDepth,
});

/** Full health a monster of `kind` has when unhurt. */
export const kindMaxHp = (kind: MonsterKind): number => KIND_TRAITS[kind].maxHp;

/**
 * A deterministic PRNG seed for a monster adopted from a peer broadcast rather
 * than materialized from its own seed: the id hashes to a fixed number, so any
 * client that later comes to own it derives the same wander stream.
 */
export const rngSeedForId = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return h | 0;
};

/**
 * The cube-centre pose a freshly materialized monster stands at somewhere in
 * its cell, grounded on the terrain height field at that spot.
 */
export const spawnPose = (
  spawn: MonsterSpawn,
  cx: number,
  cz: number,
  heightAt: (x: number, z: number) => number,
): MonsterPose => {
  const rng = mulberry32(spawn.rngSeed ^ 0x9e3779b9);
  const x = cx * SPAWN_CELL + rng() * SPAWN_CELL;
  const z = cz * SPAWN_CELL + rng() * SPAWN_CELL;
  return {
    x,
    y: heightAt(x, z) + kindHalfHeight(spawn.kind),
    z,
    yaw: rng() * Math.PI * 2,
    vx: 0,
    vz: 0,
  };
};
