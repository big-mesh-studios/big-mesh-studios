// The living cavern: how the "Cube Cavern" demo stands its themed enemies and
// walks them at whoever is nearest. Kept apart from the demo's own script so
// one place owns the AI, the way `zombie.ts` owns the Zombies demo's. The
// enemies are plain NPCs placed by hand through the "npc" effect — this module
// never calls `createNpc`, so a borrowed stand-in model never has to satisfy
// the attached-model type, and every position it writes is its own live
// computation.
import { dispatch, getPlayers } from "voxelscape";
import { FLOOR, type EnemyKind, type EnemySpawn } from "./cube-cavern-level";

/** How fast the source's own speed number becomes world units per second. */
const SPEED_SCALE = 0.12;
/** How close an enemy must be to land a touch, in world units. */
const STRIKE_RANGE = 2.6;
/** How often an enemy may touch, in milliseconds. */
const STRIKE_MS = 1_200;
/** How often a ranged enemy may shoot, in milliseconds. */
const SHOT_MS = 1_900;
/** How far a ranged enemy shoots from, in world units. */
const SHOT_RANGE = 18;

/** One enemy the demo is tracking. */
export interface MobState {
  readonly id: string;
  readonly kind: EnemyKind;
  readonly mega: boolean;
  x: number;
  z: number;
  yaw: number;
  health: number;
  /** The shared-clock moment its next strike or shot is due. */
  nextAttackAt: number;
}

const mobs = new Map<string, MobState>();

/** Every tracked enemy, in insertion order. */
export const allMobs = (): MobState[] => [...mobs.values()];

/** Forgets every tracked enemy without dispatching anything; used on a reset. */
export const forgetMobs = (): void => {
  mobs.clear();
};

/** Places one enemy at its spawn, replacing any it holds the id of. */
export const spawnMob = (
  spawn: EnemySpawn,
  floor: number,
  index: number,
): MobState => {
  const id = `mob-${floor}-${index}`;
  const state: MobState = {
    id,
    kind: spawn.kind,
    mega: spawn.mega,
    x: spawn.x,
    z: spawn.z,
    yaw: 0,
    health: spawn.kind.health,
    nextAttackAt: 0,
  };
  mobs.set(id, state);
  dispatch("npc", {
    id,
    x: state.x,
    z: state.z,
    y: FLOOR,
    name: spawn.kind.name,
    // A raw "npc" effect names the model file, not the bare name `createNpc`
    // resolves; the world's own table is keyed by the file.
    model: `${spawn.kind.model}.zip`,
    tags: ["enemy"],
    attributes: { health: state.health, floor, mega: spawn.mega },
  });
  return state;
};

/** Removes one enemy from tracking and world alike. */
export const removeMob = (id: string): void => {
  mobs.delete(id);
  dispatch("npc-remove", { id });
};

/** Plays one enemy's death fall and forgets it. */
export const killMob = (mob: MobState): void => {
  mobs.delete(mob.id);
  dispatch("npc-die", { id: mob.id });
};

/**
 * Takes `amount` off an enemy, returning it when that was the last of its
 * health and null while it still stands.
 */
export const damageMob = (id: string, amount: number): MobState | null => {
  const mob = mobs.get(id);
  if (mob === undefined) {
    return null;
  }
  mob.health -= amount;
  if (mob.health <= 0) {
    return mob;
  }
  dispatch("entity-set", {
    id: mob.id,
    attributes: { health: mob.health, mega: mob.mega },
  });
  return null;
};

/**
 * Steps every enemy one tick: closes on the nearest player within its aggro
 * range, and lands a touch or a shot when close enough and its own cooldown
 * has passed. The original's own enemies seek rather than navigate, and a
 * sight check from a monster's body would only find the monster itself, so a
 * chase is gated on range alone. `strike` is called with the damage to apply.
 */
export const stepMobs = (
  now: number,
  dtMs: number,
  strike: (mob: MobState, damage: number) => void,
): void => {
  const players = getPlayers();
  if (players.length === 0) {
    return;
  }
  for (const mob of mobs.values()) {
    let target = players[0];
    let best = Math.hypot(target.x - mob.x, target.z - mob.z);
    for (const player of players) {
      const distance = Math.hypot(player.x - mob.x, player.z - mob.z);
      if (distance < best) {
        best = distance;
        target = player;
      }
    }
    if (best > mob.kind.dist) {
      continue;
    }
    const dx = (target.x - mob.x) / (best === 0 ? 1 : best);
    const dz = (target.z - mob.z) / (best === 0 ? 1 : best);
    mob.yaw = Math.atan2(dx, dz);

    const ranged = mob.kind.ranged && best > STRIKE_RANGE + 1;
    const standoff = ranged ? SHOT_RANGE : 0;
    if (best > STRIKE_RANGE && mob.kind.speed > 0) {
      const charge = mob.kind.charge && best < 12 ? 1.7 : 1;
      const speed = mob.kind.speed * SPEED_SCALE * charge;
      const travel = Math.min(best - standoff, speed * (dtMs / 1_000));
      if (travel > 0) {
        mob.x += dx * travel;
        mob.z += dz * travel;
      }
    }
    dispatch("npc", {
      id: mob.id,
      x: mob.x,
      z: mob.z,
      y: FLOOR,
      name: mob.kind.name,
      model: `${mob.kind.model}.zip`,
      yaw: mob.yaw,
      live: true,
      tags: ["enemy"],
      attributes: { health: mob.health, mega: mob.mega },
    });

    if (now < mob.nextAttackAt) {
      continue;
    }
    if (!ranged && best <= STRIKE_RANGE) {
      mob.nextAttackAt = now + STRIKE_MS;
      strike(mob, mob.kind.damage);
    } else if (mob.kind.ranged && best <= SHOT_RANGE) {
      mob.nextAttackAt = now + SHOT_MS;
      dispatch("particle", {
        id: `shot-${mob.id}`,
        x: target.x,
        y: FLOOR + 1,
        z: target.z,
        kind: mob.kind.id === "poopie" ? "smoke" : "spark",
        color: mob.kind.id === "poopie" ? [0.45, 0.3, 0.1] : [0.1, 0.9, 0.2],
        lifeMs: 500,
      });
      strike(mob, mob.kind.damage);
    }
  }
};
