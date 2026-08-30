// The zombie's brain: a pure, injected step that turns one monster snapshot
// into the next. Movement is horizontal over the terrain height field (the
// zombie stands on the ground and never leaves it), walls and water come from
// injected terrain queries, and every roll of the dice flows through the `rng`
// argument, so the step is deterministic for a given input and unit-testable
// without a renderer or network.
import {
  kindHalfHeight,
  type MonsterPose,
  type MonsterSnapshot,
  type MonsterState,
} from "./monster";

export interface ZombieStepInputs {
  /** Every player the zombie can see, as cube-centre positions. */
  players: Array<{ x: number; y: number; z: number }>;
  /** Ground height at an absolute world xz, for standing and steepness checks. */
  heightAt: (x: number, z: number) => number;
  /** Whether a voxel is solid, for walls placed by players. */
  solidAt: (x: number, y: number, z: number) => boolean;
  /** Whether a voxel is water, which zombies will not wade into. */
  waterAt: (x: number, y: number, z: number) => boolean;
}

/** Players beyond this distance are ignored; the zombie sleeps. */
export const WAKE_RADIUS = 48;
/** Players within this distance are chased. */
export const AGGRO_RADIUS = 18;
/** Players within this distance are swung at. */
export const ATTACK_RADIUS = 2.4;
/** Seconds between swings while a player stays in melee range. */
export const ATTACK_INTERVAL_SECONDS = 1;
/** Damage one zombie swing deals; a player loses a heart per hit. */
export const ZOMBIE_DAMAGE = 2;
/** World units per second while chasing. */
export const ZOMBIE_SPEED = 2.4;
/** World units per second while wandering. */
export const ZOMBIE_WANDER_SPEED = 1;
/** Ground-height rise a zombie will not climb, in world units. */
export const STEP_LIMIT = 1.3;
/** Height above the ground where obstacles are sampled, in world units. */
const BODY_Y = 0.6;
/** Shortest wander heading duration, seconds. */
const WANDER_MIN_SECONDS = 3;
/** Uniform spread added to the shortest wander duration, seconds. */
const WANDER_SPREAD_SECONDS = 4;

const distance = (
  pose: MonsterPose,
  p: { x: number; y: number; z: number },
): number => Math.hypot(pose.x - p.x, pose.y - p.y, pose.z - p.z);

const nearestPlayer = (
  pose: MonsterPose,
  players: Array<{ x: number; y: number; z: number }>,
): { x: number; y: number; z: number } | null => {
  let best: { x: number; y: number; z: number } | null = null;
  let bestDistance = Infinity;
  for (const p of players) {
    const d = distance(pose, p);
    if (d < bestDistance) {
      bestDistance = d;
      best = p;
    }
  }
  return best;
};

interface MoveResult {
  pose: MonsterPose;
  /** True only when neither axis moved: a wall dead ahead. */
  blocked: boolean;
}

/**
 * Advances a pose one step along `yaw` at `speed`, sliding along whichever
 * axis is free when the direct line is blocked, and snapping to the ground
 * height. Sets the velocity from the displacement actually taken, so a zombie
 * pressed against a wall reports no speed.
 */
const move = (
  pose: MonsterPose,
  yaw: number,
  speed: number,
  dt: number,
  inputs: ZombieStepInputs,
  halfHeight: number,
): MoveResult => {
  const stepX = Math.sin(yaw) * speed * dt;
  const stepZ = Math.cos(yaw) * speed * dt;

  const free = (nx: number, nz: number): boolean => {
    const ground = inputs.heightAt(nx, nz);
    if (Math.abs(ground - inputs.heightAt(pose.x, pose.z)) > STEP_LIMIT) {
      return false;
    }
    const y = ground + BODY_Y;
    return !inputs.solidAt(nx, y, nz) && !inputs.waterAt(nx, y, nz);
  };

  let x = pose.x;
  let z = pose.z;
  let blocked = true;
  if (free(pose.x + stepX, pose.z)) {
    x = pose.x + stepX;
    blocked = false;
  }
  if (free(pose.x, pose.z + stepZ)) {
    z = pose.z + stepZ;
    blocked = false;
  }

  const next: MonsterPose = {
    ...pose,
    x,
    z,
    y: inputs.heightAt(x, z) + halfHeight,
    yaw,
  };
  next.vx = dt > 0 ? (next.x - pose.x) / dt : 0;
  next.vz = dt > 0 ? (next.z - pose.z) / dt : 0;
  return { pose: next, blocked };
};

/**
 * The next step of a zombie and whatever it did to reach it: the snapshot
 * after `dt` seconds, plus the horizontal position of the player a swing
 * landed on this step when one did. The zombie sleeps when no player is
 * within `WAKE_RADIUS`, wanders when one is merely nearby, chases the nearest
 * player inside `AGGRO_RADIUS`, and swings (standing still) inside
 * `ATTACK_RADIUS`, on a `cooldown`-gated interval; a swing lands the moment
 * the cooldown runs out while a player is in melee range. `rng` supplies
 * every random choice, so repeated calls with the same inputs and sequence
 * agree.
 */
export const stepZombie = (
  dt: number,
  m: MonsterSnapshot,
  rng: () => number,
  inputs: ZombieStepInputs,
): { snapshot: MonsterSnapshot; attack: { x: number; z: number } | null } => {
  const halfHeight = kindHalfHeight(m.kind);
  const nearest = nearestPlayer(m.pose, inputs.players);
  const dist = nearest === null ? Infinity : distance(m.pose, nearest);
  let cooldown = Math.max(0, m.cooldown - dt);
  let wanderLeft = m.wanderLeft;
  let attack: { x: number; z: number } | null = null;

  const grounded = (pose: MonsterPose): MonsterPose => ({
    ...pose,
    y: inputs.heightAt(pose.x, pose.z) + halfHeight,
  });

  if (nearest === null || dist > WAKE_RADIUS) {
    return {
      snapshot: {
        ...m,
        pose: { ...grounded(m.pose), vx: 0, vz: 0 },
        state: "sleep",
        cooldown,
      },
      attack,
    };
  }

  let state: MonsterState;
  if (dist <= ATTACK_RADIUS) {
    state = "attack";
  } else if (dist <= AGGRO_RADIUS) {
    state = "chase";
  } else {
    state = "wander";
  }

  let pose: MonsterPose;
  if (state === "attack") {
    const yaw = Math.atan2(nearest.x - m.pose.x, nearest.z - m.pose.z);
    if (cooldown <= 0) {
      cooldown = ATTACK_INTERVAL_SECONDS;
      attack = { x: nearest.x, z: nearest.z };
    }
    pose = { ...grounded(m.pose), yaw, vx: 0, vz: 0 };
  } else if (state === "chase") {
    const yaw = Math.atan2(nearest.x - m.pose.x, nearest.z - m.pose.z);
    pose = move(m.pose, yaw, ZOMBIE_SPEED, dt, inputs, halfHeight).pose;
  } else {
    let heading = m.pose.yaw;
    if (wanderLeft <= 0) {
      heading = rng() * Math.PI * 2;
      wanderLeft = WANDER_MIN_SECONDS + rng() * WANDER_SPREAD_SECONDS;
    }
    wanderLeft -= dt;
    const moved = move(
      m.pose,
      heading,
      ZOMBIE_WANDER_SPEED,
      dt,
      inputs,
      halfHeight,
    );
    pose = moved.pose;
    if (moved.blocked) {
      pose = { ...pose, yaw: rng() * Math.PI * 2 };
      wanderLeft = 0.5 + rng();
    }
  }

  return {
    snapshot: { ...m, pose, state, wanderLeft, cooldown },
    attack,
  };
};
