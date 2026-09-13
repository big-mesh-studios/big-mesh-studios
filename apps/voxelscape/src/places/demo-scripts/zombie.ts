import {
  createNpc,
  dispatch,
  heightAt,
  now as clockNow,
  solidAt,
  waterAt,
  type ModelsByName,
  type NpcHandle,
  type Player,
} from "voxelscape";

// A whole population of zombies materializes procedurally around wherever
// players explore, rather than one fixed encounter: only the cells near a
// player are ever populated, so the tuning below governs density and pacing
// across an effectively unbounded map.
const SPAWN_CELL = 32;
const SLOTS_PER_CELL = 2;
/** Fraction of (cell, slot) addresses that actually hold a zombie. */
const MONSTER_DENSITY = 0.15;
/** Cells within this of any player are materialized. */
const MATERIALIZE_RADIUS = 56;
/** Most zombies this place keeps alive at once. */
const MONSTER_CAP = 40;
/** This place's own population seed — arbitrary, just fixed, so every peer
 * agrees on which (cell, slot) addresses hold a zombie. */
const POPULATION_SEED = 0x2a5f3c17;

// Every materialized zombie is already close enough to some player to exist
// at all — that is what materializing means — so there is no separate
// "asleep" range below the aggro radius; a zombie always wanders rather than
// standing still as a prop until someone gets close.
const AGGRO_RADIUS = 18;
const ATTACK_RADIUS = 2.4;
/** Seconds between swings while a player stays in melee range, in milliseconds. */
const ATTACK_INTERVAL_MS = 1000;
const ZOMBIE_DAMAGE = 2;
const ZOMBIE_SPEED = 2.4; // world units per second, while chasing
const ZOMBIE_WANDER_SPEED = 1; // world units per second, while wandering
const ZOMBIE_MAX_HP = 20; // three sword swings at 8 damage each
/** How often this place steps its zombies — also the interval `main.ts`
 * rearms its own tick timer on. */
export const TICK_MS = 120;
/** Ground-height rise a step will not climb, in world units. */
const STEP_LIMIT = 1.3;
/** Height above the ground a wall or water is sampled at. */
const BODY_Y = 0.6;
const WANDER_MIN_MS = 3000;
const WANDER_SPREAD_MS = 4000;
/** How much closer a new player has to be before ownership moves to them,
 * so two players near each other don't make it flicker between owners. */
const OWNER_HYSTERESIS = 2;
/** How far a landed hit shoves a zombie away from whoever swung. */
const KNOCKBACK = 1.2;
/** Closest a zombie ever stands to whoever it is attacking, so a player
 * cannot walk into its model's own geometry mid-fight — which reads as the
 * zombie not being there at all, a stronger effect than merely standing
 * close. */
const MIN_ATTACK_DISTANCE = 1.4;
/** How often a wandering zombie's position is broadcast to other peers; a
 * chasing or attacking one broadcasts every tick instead, since a stale
 * position there is what would let a player walk unnoticed into melee range.
 * The owner still moves and renders it every tick either way — only what
 * other peers are told slows down. */
const WANDER_BROADCAST_INTERVAL_MS = 2000;
/** How far a zombie's own wander may drift from where it first stood. */
const WANDER_LEASH_RADIUS = 20;

type ZombieState = "wander" | "chase" | "attack";

interface Zombie {
  npc: NpcHandle<ModelsByName["zombie"]>;
  hp: number;
  lastAttackAt: number;
  state: ZombieState;
  /** Which player this peer currently believes owns (simulates) it, or ""
   * before anyone has. Only meaningful on the peer that is the owner — see
   * `stepZombie`. */
  ownerDid: string;
  wanderHeading: number;
  /** Clock moment the current wander heading may next change. */
  wanderUntil: number;
  /** Clock moment this zombie's position was last broadcast to other peers. */
  lastBroadcastAt: number;
  /** The spawn cell this zombie belongs to, "cx_cz" — forgetting is decided
   * by whether this cell is still near a player, not by where it has since
   * wandered or chased to. */
  cellKey: string;
  /** Where this zombie first stood — wandering has nothing else keeping it
   * from walking anywhere over enough time, so this is what a stray heading
   * gets pulled back toward once it's drifted far from it. */
  homeX: number;
  homeZ: number;
}

const zombies = new Map<string, Zombie>();
/** Zombie ids that have died — permanent for the life of this session: a
 * killed zombie's address never spawns another one in its place. */
const deadIds = new Set<string>();

const dist2D = (ax: number, az: number, bx: number, bz: number): number =>
  Math.hypot(ax - bx, az - bz);

/** A small, fast, seedable generator — deterministic given the same seed,
 * which is what lets every peer agree on the same population and the same
 * wander choices without comparing notes. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of four integers, for deriving a cell's population
 * and a zombie's own wander stream from it. */
function hashInt(a: number, b: number, c: number, d: number): number {
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
}

/** Whether (cx, cz, slot) holds a zombie, and its id and rng seed if so —
 * a pure function of the address, so every peer computes the same answer. */
function zombieAt(
  cx: number,
  cz: number,
  slot: number,
): { id: string; rngSeed: number } | null {
  const rngSeed = hashInt(POPULATION_SEED, cx, cz, slot);
  if (mulberry32(rngSeed)() >= MONSTER_DENSITY) {
    return null;
  }
  return { id: "zombie-" + cx + "_" + cz + "_" + slot, rngSeed };
}

/** Where a freshly materialized zombie stands within its cell, grounded on
 * the terrain there. */
function spawnPose(
  rngSeed: number,
  cx: number,
  cz: number,
): { x: number; z: number; yaw: number } {
  const rng = mulberry32(rngSeed ^ 0x9e3779b9);
  const x = cx * SPAWN_CELL + rng() * SPAWN_CELL;
  const z = cz * SPAWN_CELL + rng() * SPAWN_CELL;
  return { x, z, yaw: rng() * Math.PI * 2 };
}

/** The cell keys within `MATERIALIZE_RADIUS` of (x, z) — a conservative
 * superset that includes every cell whose nearest point could be in range. */
function cellsNear(x: number, z: number): string[] {
  const cx0 = Math.floor((x - MATERIALIZE_RADIUS) / SPAWN_CELL);
  const cx1 = Math.floor((x + MATERIALIZE_RADIUS) / SPAWN_CELL);
  const cz0 = Math.floor((z - MATERIALIZE_RADIUS) / SPAWN_CELL);
  const cz1 = Math.floor((z + MATERIALIZE_RADIUS) / SPAWN_CELL);
  const halfDiagonal = (SPAWN_CELL * Math.SQRT2) / 2;
  const keys: string[] = [];
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cz = cz0; cz <= cz1; cz++) {
      const centerX = cx * SPAWN_CELL + SPAWN_CELL / 2;
      const centerZ = cz * SPAWN_CELL + SPAWN_CELL / 2;
      if (
        Math.hypot(centerX - x, centerZ - z) <=
        MATERIALIZE_RADIUS + halfDiagonal
      ) {
        keys.push(cx + "_" + cz);
      }
    }
  }
  return keys;
}

/** The windowed cell keys within `MATERIALIZE_RADIUS` of any of `players`. */
function windowNear(players: Player[]): Set<string> {
  const window = new Set<string>();
  for (const p of players) {
    for (const key of cellsNear(p.x, p.z)) {
      window.add(key);
    }
  }
  return window;
}

/** Materializes a zombie for every windowed cell that holds one and is not
 * yet tracked — the window being every cell near any current player. */
export function materialize(players: Player[]): void {
  if (zombies.size >= MONSTER_CAP) {
    return;
  }
  for (const key of windowNear(players)) {
    const parts = key.split("_");
    const cx = Number(parts[0]);
    const cz = Number(parts[1]);
    for (let slot = 0; slot < SLOTS_PER_CELL; slot++) {
      const spawn = zombieAt(cx, cz, slot);
      if (spawn === null || zombies.has(spawn.id) || deadIds.has(spawn.id)) {
        continue;
      }
      if (zombies.size >= MONSTER_CAP) {
        return;
      }
      const pose = spawnPose(spawn.rngSeed, cx, cz);
      const npc = createNpc({
        model: "zombie",
        id: spawn.id,
        x: pose.x,
        z: pose.z,
        name: "Zombie",
        yaw: pose.yaw,
        y: heightAt(pose.x, pose.z),
      });
      zombies.set(spawn.id, {
        npc,
        hp: ZOMBIE_MAX_HP,
        lastAttackAt: 0,
        state: "wander",
        ownerDid: "",
        wanderHeading: 0,
        wanderUntil: 0,
        lastBroadcastAt: clockNow(),
        cellKey: key,
        homeX: pose.x,
        homeZ: pose.z,
      });
    }
  }
}

/** Drops zombies whose spawn cell is no longer near any player — the
 * zombie's own current position (which may be well outside it, mid-chase)
 * is not what decides this, its spawn cell is. */
export function forget(players: Player[]): void {
  const window = windowNear(players);
  for (const [id, z] of zombies) {
    if (!window.has(z.cellKey)) {
      zombies.delete(id);
      z.npc.remove();
    }
  }
}

/** Whether stepping from the current ground to (x, z) is walkable: not too
 * steep a rise, and neither solid nor water at body height once there. */
function walkable(fromX: number, fromZ: number, x: number, z: number): boolean {
  const ground = heightAt(x, z);
  if (Math.abs(ground - heightAt(fromX, fromZ)) > STEP_LIMIT) {
    return false;
  }
  const y = ground + BODY_Y;
  return !solidAt(x, y, z) && !waterAt(x, y, z);
}

/** Moves (x, z) one step toward yaw at speed, sliding along whichever axis
 * is still free when the direct line is blocked. */
function moveStep(
  x: number,
  z: number,
  yaw: number,
  speed: number,
  dtMs: number,
): { x: number; z: number; blocked: boolean } {
  const dt = dtMs / 1000;
  const stepX = Math.sin(yaw) * speed * dt;
  const stepZ = Math.cos(yaw) * speed * dt;
  let nx = x;
  let nz = z;
  let blocked = true;
  if (walkable(x, z, x + stepX, z)) {
    nx = x + stepX;
    blocked = false;
  }
  if (walkable(x, z, x, z + stepZ)) {
    nz = z + stepZ;
    blocked = false;
  }
  return { x: nx, z: nz, blocked };
}

/** A heading to wander off in next: fully random near home, biased back
 * toward it — in a wide cone, not a robotic beeline — once it has strayed
 * past the leash. Without this, a symmetric random walk has no reason not
 * to drift arbitrarily far given enough time. */
function pickWanderHeading(
  x: number,
  z: number,
  homeX: number,
  homeZ: number,
): number {
  if (dist2D(x, z, homeX, homeZ) <= WANDER_LEASH_RADIUS) {
    return Math.random() * Math.PI * 2;
  }
  const towardHome = Math.atan2(homeX - x, homeZ - z);
  return towardHome + (Math.random() - 0.5) * (Math.PI / 2);
}

/**
 * Advances one zombie one tick. Every peer runs this from the same live
 * positions, but ownership decides whose result actually counts: the
 * nearest player owns it, kept while the current owner is only marginally
 * farther. Only the owner moves it and dispatches the live update — a peer
 * that isn't the owner leaves its own copy exactly where it last stood until
 * a broadcast from the real owner moves it.
 */
function stepZombie(z: Zombie, players: Player[], now: number): void {
  if (players.length === 0) {
    return;
  }
  const self = players[0].did;
  let x = z.npc.x;
  let zPos = z.npc.z;
  let yaw = z.npc.yaw;

  let nearest = players[0];
  let nearestDistance = dist2D(x, zPos, nearest.x, nearest.z);
  for (let i = 1; i < players.length; i++) {
    const p = players[i];
    const d = dist2D(x, zPos, p.x, p.z);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = p;
    }
  }
  let owner = nearest;
  let ownerDistance = nearestDistance;
  if (z.ownerDid !== "" && z.ownerDid !== nearest.did) {
    const current = players.find((p) => p.did === z.ownerDid);
    if (current !== undefined) {
      const currentDistance = dist2D(x, zPos, current.x, current.z);
      if (currentDistance <= nearestDistance + OWNER_HYSTERESIS) {
        owner = current;
        ownerDistance = currentDistance;
      }
    }
  }
  z.ownerDid = owner.did;
  if (owner.did !== self) {
    return;
  }

  const state: ZombieState =
    ownerDistance <= ATTACK_RADIUS
      ? "attack"
      : ownerDistance <= AGGRO_RADIUS
        ? "chase"
        : "wander";
  z.state = state;

  if (state === "attack") {
    yaw = Math.atan2(owner.x - x, owner.z - zPos);
    // There's a nearest range as well as a furthest one: nothing stops a
    // player walking straight into it mid-fight otherwise, and standing
    // inside its own model's geometry is indistinguishable from it not
    // being there at all. Backing off is silent — no re-dispatch here — the
    // tick's own `move` below still sends wherever it ends up.
    if (ownerDistance < MIN_ATTACK_DISTANCE) {
      const away = yaw + Math.PI;
      const moved = moveStep(x, zPos, away, ZOMBIE_SPEED, TICK_MS);
      x = moved.x;
      zPos = moved.z;
    }
    if (now - z.lastAttackAt >= ATTACK_INTERVAL_MS) {
      z.lastAttackAt = now;
      dispatch("player-damage", {
        player: owner.did,
        amount: ZOMBIE_DAMAGE,
        source: z.npc.id,
      });
    }
  } else if (state === "chase") {
    yaw = Math.atan2(owner.x - x, owner.z - zPos);
    const moved = moveStep(x, zPos, yaw, ZOMBIE_SPEED, TICK_MS);
    x = moved.x;
    zPos = moved.z;
  } else {
    if (now >= z.wanderUntil) {
      z.wanderHeading = pickWanderHeading(x, zPos, z.homeX, z.homeZ);
      z.wanderUntil = now + WANDER_MIN_MS + Math.random() * WANDER_SPREAD_MS;
    }
    // The leash is enforced on every step, not only when a heading is
    // picked — a heading chosen while still within it can point outward, and
    // only checking at the next pick would let a full multi-second leg carry
    // it well past the leash before anything pulled it back.
    const beyondLeash = dist2D(x, zPos, z.homeX, z.homeZ) > WANDER_LEASH_RADIUS;
    const heading = beyondLeash
      ? Math.atan2(z.homeX - x, z.homeZ - zPos)
      : z.wanderHeading;
    const moved = moveStep(x, zPos, heading, ZOMBIE_WANDER_SPEED, TICK_MS);
    x = moved.x;
    zPos = moved.z;
    yaw = heading;
    if (moved.blocked) {
      z.wanderHeading = pickWanderHeading(x, zPos, z.homeX, z.homeZ);
      z.wanderUntil = now + 500 + Math.random() * 1000;
    }
  }

  const dueToBroadcast =
    state !== "wander" ||
    now - z.lastBroadcastAt >= WANDER_BROADCAST_INTERVAL_MS;
  if (dueToBroadcast) {
    z.lastBroadcastAt = now;
  }
  z.npc.move({
    x,
    z: zPos,
    yaw,
    y: heightAt(x, zPos),
    live: dueToBroadcast,
  });
}

/** Advances every tracked zombie one tick, from the same live positions. */
export function stepAll(players: Player[], now: number): void {
  for (const z of zombies.values()) {
    stepZombie(z, players, now);
  }
}

/** Whether `id` names a zombie this place is currently tracking. */
export function isZombie(id: string): boolean {
  return zombies.has(id);
}

/** Where a zombie lands after being shoved away from whoever struck it,
 * unless the shove would land it in a wall or water, which would only stick
 * it there. */
function knockedBack(
  x: number,
  z: number,
  attacker: { x: number; z: number },
): { x: number; z: number } {
  const dx = x - attacker.x;
  const dz = z - attacker.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-6) {
    return { x, z };
  }
  const push = Math.min(KNOCKBACK, distance);
  const nx = x + (dx / distance) * push;
  const nz = z + (dz / distance) * push;
  return walkable(x, z, nx, nz) ? { x: nx, z: nz } : { x, z };
}

/** Whether a landed hit finished the zombie off. */
export interface HitOutcome {
  fell: boolean;
}

/**
 * Applies a landed hit of `amount` to the zombie named `id`, knocking it back
 * from `attacker` — its own current position stands in for either coordinate
 * left unset — and killing it once its hp runs out. Returns undefined if
 * `id` does not name a zombie this place is tracking.
 */
export function hitZombie(
  id: string,
  amount: number,
  attacker: { x?: number; z?: number },
): HitOutcome | undefined {
  const target = zombies.get(id);
  if (target === undefined) {
    return undefined;
  }
  const pushed = knockedBack(target.npc.x, target.npc.z, {
    x: attacker.x ?? target.npc.x,
    z: attacker.z ?? target.npc.z,
  });
  target.hp -= amount;
  if (target.hp <= 0) {
    zombies.delete(target.npc.id);
    deadIds.add(target.npc.id);
    target.npc.die();
    return { fell: true };
  }
  target.npc.move({
    x: pushed.x,
    z: pushed.z,
    y: heightAt(pushed.x, pushed.z),
    live: true,
  });
  return { fell: false };
}
