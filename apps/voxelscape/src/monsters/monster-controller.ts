// Owns the local simulation of monsters: materializes the spawn cells around
// the players, chooses each monster's owner, steps the monsters this client
// owns and broadcasts their state, and reconciles the durable atproto records
// (the source of truth) into the same map. A plain domain object — it knows
// the terrain queries, the players, its own identity, and the atproto record
// codec; nothing about renderers or a console. The rendered meshes read the
// snapshots kept here each frame.
import {
  SPAWN_CELL,
  SLOTS_PER_CELL,
  kindMaxHp,
  monsterAt,
  mulberry32,
  rngSeedForId,
  spawnPose,
  type MonsterSnapshot,
  type MonsterState,
} from "./monster";
import {
  makeMonsterRecord,
  recordBeats,
  recordToSnapshot,
  type MonsterRecord,
} from "../atproto/monsters";
import type { MonsterUpdate } from "../multiplayer/messages";
import { WAKE_RADIUS, stepZombie, type ZombieStepInputs } from "./zombie";

export interface MonsterPlayer {
  did: string;
  x: number;
  z: number;
}

export interface MonsterControllerParams {
  /** Terrain seed; addresses every monster's id and spawn. */
  seed: number;
  heightAt: (x: number, z: number) => number;
  solidAt: (x: number, y: number, z: number) => boolean;
  waterAt: (x: number, y: number, z: number) => boolean;
  /** This client's DID, or null while signed out; matches the local player in `getPlayers`. */
  getDid: () => string | null;
  /** The players monsters can see and target: the local player plus connected peers. */
  getPlayers: () => MonsterPlayer[];
  /**
   * Receives the state of every monster this client owns, for the caller to
   * broadcast (wired to the multiplayer mesh in the app). Called at the pose
   * broadcast cadence, so receivers dead-reckon between deliveries.
   */
  onBroadcast?: (updates: MonsterUpdate[]) => void;
}

/** Cells whose nearest point is within this of a player are materialized, world units. */
export const MATERIALIZE_RADIUS = 56;
/** The largest number of monsters simulated at once. */
export const MONSTER_CAP = 40;
/** Broadcast cadence while any owned monster is moving, and the idle heartbeat, ms. */
export const MONSTER_BROADCAST_MOVING_MS = 150;
export const MONSTER_BROADCAST_IDLE_MS = 2_000;
/** How often an owned monster's state is persisted to atproto, ms. */
export const PERSIST_INTERVAL_MS = 5_000;
/** Horizontal speed (world units per second) below which a monster counts as idle. */
const MOVE_EPS = 0.05;
/** Distances within this are ties for ownership, settled by the lower DID. */
const OWNER_TIE_EPS = 0.001;
/** World units the current owner keeps a monster before a clearly nearer player takes it. */
const OWNER_HYSTERESIS = 2;

const cellKey = (cx: number, cz: number): string => `${cx},${cz}`;

const parseCellKey = (key: string): { cx: number; cz: number } => {
  const [x, z] = key.split(",");
  return { cx: Number(x), cz: Number(z) };
};

export class MonsterController {
  private readonly seed: number;
  private readonly heightAt: (x: number, z: number) => number;
  private readonly solidAt: (x: number, y: number, z: number) => boolean;
  private readonly waterAt: (x: number, y: number, z: number) => boolean;
  private readonly getDid: () => string | null;
  private readonly getPlayers: () => MonsterPlayer[];
  private readonly onBroadcast:
    ((updates: MonsterUpdate[]) => void) | undefined;

  private readonly monsters_ = new Map<string, MonsterSnapshot>();
  private readonly rngs = new Map<string, () => number>();
  private readonly lastPersistAt = new Map<string, number>();
  private readonly lastPersisted = new Map<
    string,
    { state: MonsterState; owner: string | null }
  >();
  private lastBroadcastAt = 0;

  constructor(params: MonsterControllerParams) {
    this.seed = params.seed;
    this.heightAt = params.heightAt;
    this.solidAt = params.solidAt;
    this.waterAt = params.waterAt;
    this.getDid = params.getDid;
    this.getPlayers = params.getPlayers;
    this.onBroadcast = params.onBroadcast;
  }

  /** Every monster currently simulated or displayed, keyed by id. */
  get monsters(): ReadonlyMap<string, MonsterSnapshot> {
    return this.monsters_;
  }

  /**
   * Advances the simulation by `dt` seconds: re-derives the spawn-cell window
   * around the players, forgets monsters whose cells left it, steps the
   * monsters this client owns, and broadcasts their new state.
   */
  tick(dt: number): void {
    const players = this.getPlayers();
    const window = new Set<string>();
    for (const p of players) {
      for (const key of this.cellWindow(p.x, p.z)) {
        window.add(key);
      }
    }
    this.materialize(window);
    this.forgetOutside(window);
    this.stepOwned(dt, players);
  }

  /**
   * Applies a peer's monster-state broadcast: adopts monsters near this client
   * that it does not own and refreshes the ones it already tracks, so they are
   * displayed from the owner's simulation. Updates for a monster this client
   * owns are ignored — it is the authority for those.
   */
  applyMonsterUpdates(updates: MonsterUpdate[]): void {
    if (updates.length === 0) {
      return;
    }
    const players = this.getPlayers();
    const selfDid = this.getDid() ?? "";
    const now = Date.now();
    for (const u of updates) {
      const existing = this.monsters_.get(u.id);
      if (existing !== undefined) {
        const owner = this.ownerOf(existing, players);
        if (owner !== null && owner.did === selfDid) {
          continue;
        }
        this.monsters_.set(u.id, this.snapshotFromUpdate(u, now, players));
        continue;
      }
      if (!this.inAoi(u.x, u.z, players)) {
        continue;
      }
      this.rngs.set(u.id, mulberry32(rngSeedForId(u.id)));
      this.monsters_.set(u.id, this.snapshotFromUpdate(u, now, players));
    }
  }

  /**
   * Merges durable atproto records into the simulation, last-write-wins by the
   * producing client's `updatedAt` (ties broken by the owner DID, so every
   * client resolves a conflict the same way). Records from another world's
   * seed are ignored, and records for monsters outside this client's interest
   * are not adopted.
   */
  mergeFromAtproto(records: MonsterRecord[]): void {
    if (records.length === 0) {
      return;
    }
    const players = this.getPlayers();
    for (const record of records) {
      if (record.seed !== this.seed) {
        continue;
      }
      const existing = this.monsters_.get(record.id);
      if (existing !== undefined) {
        if (!recordBeats(existing, record)) {
          continue;
        }
      } else if (!this.inAoi(record.x, record.z, players)) {
        continue;
      }
      if (!this.rngs.has(record.id)) {
        this.rngs.set(record.id, mulberry32(rngSeedForId(record.id)));
      }
      this.monsters_.set(record.id, recordToSnapshot(record, Date.now()));
    }
  }

  /**
   * The records this client should write now: every owned monster whose state
   * changed since the last write, or whose last write is older than
   * `PERSIST_INTERVAL_MS`. The caller persists them and calls `markPersisted`.
   */
  recordsForPersistence(now: number): MonsterRecord[] {
    const selfDid = this.getDid() ?? "";
    const out: MonsterRecord[] = [];
    for (const [id, m] of this.monsters_) {
      if (m.owner !== selfDid) {
        continue;
      }
      const previous = this.lastPersisted.get(id);
      const changed =
        previous === undefined ||
        previous.state !== m.state ||
        previous.owner !== m.owner;
      const due =
        changed ||
        now - (this.lastPersistAt.get(id) ?? 0) >= PERSIST_INTERVAL_MS;
      if (due) {
        out.push(makeMonsterRecord(m, this.seed, new Date(now).toISOString()));
      }
    }
    return out;
  }

  /** Acknowledges that `ids` were persisted, so they stop being due. */
  markPersisted(ids: string[]): void {
    const now = Date.now();
    for (const id of ids) {
      const m = this.monsters_.get(id);
      if (m === undefined) {
        continue;
      }
      this.lastPersistAt.set(id, now);
      this.lastPersisted.set(id, { state: m.state, owner: m.owner });
    }
  }

  /** One line about the simulation, for a debug console. */
  describe(): string {
    const awake = [...this.monsters_.values()].filter(
      (m) => m.state !== "sleep",
    ).length;
    return `monsters: ${this.monsters_.size} tracked, ${awake} awake`;
  }

  /** The cell keys a player's spawn window covers (a conservative superset of cells whose nearest point is within `MATERIALIZE_RADIUS`). */
  private cellWindow(x: number, z: number): Set<string> {
    const cx0 = Math.floor((x - MATERIALIZE_RADIUS) / SPAWN_CELL);
    const cx1 = Math.floor((x + MATERIALIZE_RADIUS) / SPAWN_CELL);
    const cz0 = Math.floor((z - MATERIALIZE_RADIUS) / SPAWN_CELL);
    const cz1 = Math.floor((z + MATERIALIZE_RADIUS) / SPAWN_CELL);
    const halfDiagonal = (SPAWN_CELL * Math.SQRT2) / 2;
    const window = new Set<string>();
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const centerX = cx * SPAWN_CELL + SPAWN_CELL / 2;
        const centerZ = cz * SPAWN_CELL + SPAWN_CELL / 2;
        if (
          Math.hypot(centerX - x, centerZ - z) <=
          MATERIALIZE_RADIUS + halfDiagonal
        ) {
          window.add(cellKey(cx, cz));
        }
      }
    }
    return window;
  }

  /** Creates a sleeping snapshot for every windowed cell that holds a monster and is not yet tracked. */
  private materialize(window: Set<string>): void {
    if (this.monsters_.size >= MONSTER_CAP) {
      return;
    }
    for (const key of window) {
      const { cx, cz } = parseCellKey(key);
      for (let slot = 0; slot < SLOTS_PER_CELL; slot++) {
        const spawn = monsterAt(this.seed, cx, cz, slot);
        if (spawn === null || this.monsters_.has(spawn.id)) {
          continue;
        }
        if (this.monsters_.size >= MONSTER_CAP) {
          return;
        }
        const pose = spawnPose(spawn, cx, cz, this.heightAt);
        this.rngs.set(spawn.id, mulberry32(spawn.rngSeed));
        this.monsters_.set(spawn.id, {
          id: spawn.id,
          kind: spawn.kind,
          pose,
          hp: spawn.maxHp,
          maxHp: spawn.maxHp,
          state: "sleep",
          wanderLeft: 0,
          cooldown: 0,
          owner: null,
          // A materialized spawn is an estimate, not a produced state, so any
          // real record supersedes it in a merge.
          authoritativeAt: 0,
          updatedAt: Date.now(),
        });
      }
    }
  }

  /** Drops monsters whose cell is no longer in any player's window. */
  private forgetOutside(window: Set<string>): void {
    for (const id of [...this.monsters_.keys()]) {
      const { cx, cz } = this.cellOf(id);
      if (!window.has(cellKey(cx, cz))) {
        this.monsters_.delete(id);
        this.rngs.delete(id);
        this.lastPersistAt.delete(id);
        this.lastPersisted.delete(id);
      }
    }
  }

  /**
   * Steps every monster this client owns through its brain, then broadcasts
   * the new states. Monsters another player owns are left alone — the owner's
   * broadcasts update them; a monster no player owns sleeps in place.
   */
  private stepOwned(dt: number, players: MonsterPlayer[]): void {
    const selfDid = this.getDid() ?? "";
    const inputs: ZombieStepInputs = {
      players,
      heightAt: this.heightAt,
      solidAt: this.solidAt,
      waterAt: this.waterAt,
    };
    const now = Date.now();
    const owned: MonsterUpdate[] = [];
    for (const [id, snapshot] of this.monsters_) {
      const owner = this.ownerOf(snapshot, players);
      if (owner === null) {
        if (snapshot.state !== "sleep" || snapshot.owner !== null) {
          this.monsters_.set(id, {
            ...snapshot,
            pose: { ...snapshot.pose, vx: 0, vz: 0 },
            state: "sleep",
            owner: null,
            updatedAt: now,
          });
        }
        continue;
      }
      if (owner.did !== selfDid) {
        if (snapshot.owner !== owner.did) {
          this.monsters_.set(id, { ...snapshot, owner: owner.did });
        }
        continue;
      }
      const rng = this.rngs.get(id);
      if (rng === undefined) {
        continue;
      }
      const next = stepZombie(dt, snapshot, rng, inputs);
      this.monsters_.set(id, {
        ...next,
        owner: selfDid,
        authoritativeAt: now,
        updatedAt: now,
      });
      owned.push(this.toUpdate(this.monsters_.get(id)!));
    }
    this.broadcastOwned(owned, now);
  }

  /**
   * The player that owns `m`: the nearest player, with the currently recorded
   * owner kept while another player is only marginally closer (so two players
   * hovering around a monster don't ping-pong it), or null when every player
   * is beyond wake radius and the monster sleeps unowned.
   */
  private ownerOf(
    m: MonsterSnapshot,
    players: MonsterPlayer[],
  ): MonsterPlayer | null {
    const nearest = this.nearestPlayer(m.pose.x, m.pose.z, players);
    if (nearest === null) {
      return null;
    }
    if (Math.hypot(nearest.x - m.pose.x, nearest.z - m.pose.z) > WAKE_RADIUS) {
      return null;
    }
    const current = m.owner;
    if (current !== null && current !== nearest.did) {
      const currentPlayer = players.find((p) => p.did === current);
      if (currentPlayer !== undefined) {
        const currentDistance = Math.hypot(
          currentPlayer.x - m.pose.x,
          currentPlayer.z - m.pose.z,
        );
        const nearestDistance = Math.hypot(
          nearest.x - m.pose.x,
          nearest.z - m.pose.z,
        );
        if (currentDistance <= nearestDistance + OWNER_HYSTERESIS) {
          return currentPlayer;
        }
      }
    }
    return nearest;
  }

  /** The player nearest to a point, ties broken by the lower DID. */
  private nearestPlayer(
    x: number,
    z: number,
    players: MonsterPlayer[],
  ): MonsterPlayer | null {
    let best: MonsterPlayer | null = null;
    let bestDistance = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (
        best === null ||
        d < bestDistance - OWNER_TIE_EPS ||
        (Math.abs(d - bestDistance) <= OWNER_TIE_EPS && p.did < best.did)
      ) {
        best = p;
        bestDistance = d;
      }
    }
    return best;
  }

  /** Sends the owned monsters' state at the pose broadcast cadence. */
  private broadcastOwned(updates: MonsterUpdate[], now: number): void {
    if (this.onBroadcast === undefined || updates.length === 0) {
      return;
    }
    const moving = updates.some((u) => Math.hypot(u.vx, u.vz) > MOVE_EPS);
    const interval = moving
      ? MONSTER_BROADCAST_MOVING_MS
      : MONSTER_BROADCAST_IDLE_MS;
    if (now - this.lastBroadcastAt < interval) {
      return;
    }
    this.lastBroadcastAt = now;
    this.onBroadcast(updates);
  }

  private toUpdate(m: MonsterSnapshot): MonsterUpdate {
    return {
      id: m.id,
      kind: m.kind,
      x: m.pose.x,
      y: m.pose.y,
      z: m.pose.z,
      yaw: m.pose.yaw,
      vx: m.pose.vx,
      vz: m.pose.vz,
      hp: m.hp,
      state: m.state,
      updatedAt: m.updatedAt,
    };
  }

  private snapshotFromUpdate(
    u: MonsterUpdate,
    now: number,
    players: MonsterPlayer[],
  ): MonsterSnapshot {
    const nearest = this.nearestPlayer(u.x, u.z, players);
    const owner =
      nearest !== null &&
      Math.hypot(nearest.x - u.x, nearest.z - u.z) <= WAKE_RADIUS
        ? nearest
        : null;
    return {
      id: u.id,
      kind: u.kind,
      pose: { x: u.x, y: u.y, z: u.z, yaw: u.yaw, vx: u.vx, vz: u.vz },
      hp: u.hp,
      maxHp: kindMaxHp(u.kind),
      state: u.state,
      wanderLeft: 0,
      cooldown: 0,
      owner: owner?.did ?? null,
      authoritativeAt: u.updatedAt,
      updatedAt: now,
    };
  }

  /** Whether a point is close enough to a player to be worth adopting into the map. */
  private inAoi(x: number, z: number, players: MonsterPlayer[]): boolean {
    for (const p of players) {
      if (Math.hypot(x - p.x, z - p.z) <= MATERIALIZE_RADIUS + SPAWN_CELL) {
        return true;
      }
    }
    return false;
  }

  private cellOf(id: string): { cx: number; cz: number } {
    const parts = id.split("_");
    return { cx: Number(parts[1]), cz: Number(parts[2]) };
  }
}
