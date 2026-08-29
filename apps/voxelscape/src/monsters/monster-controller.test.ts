// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MONSTER_COLLECTION, type MonsterRecord } from "../atproto/monsters";
import type { MonsterUpdate } from "../multiplayer/messages";
import {
  CORPSE_MS,
  PERSIST_INTERVAL_MS,
  MonsterController,
} from "./monster-controller";
import { KNOCKBACK } from "./hit";
import { ATTACK_INTERVAL_SECONDS, WAKE_RADIUS, ZOMBIE_DAMAGE } from "./zombie";

const GROUND = 10;

const makeController = (
  overrides: Partial<ConstructorParameters<typeof MonsterController>[0]> = {},
): MonsterController =>
  new MonsterController({
    seed: 42,
    heightAt: () => GROUND,
    solidAt: () => false,
    waterAt: () => false,
    getDid: () => "me",
    getPlayers: () => [{ did: "me", x: 0, z: 0 }],
    ...overrides,
  });

const update = (overrides: Partial<MonsterUpdate> = {}): MonsterUpdate => ({
  id: "m1_0_0_0",
  kind: "zombie",
  x: 9,
  y: GROUND + 1.1,
  z: 0,
  yaw: 0,
  vx: 1,
  vz: 0,
  hp: 20,
  state: "chase",
  updatedAt: 0,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("monster controller", () => {
  it("materializes monsters in the cells around the player", () => {
    const c = makeController();
    c.tick(1 / 60);
    expect(c.monsters.size).toBeGreaterThan(0);
  });

  it("materializes the same set deterministically", () => {
    const a = makeController();
    a.tick(1 / 60);
    const b = makeController();
    b.tick(1 / 60);
    expect([...a.monsters.keys()]).toEqual([...b.monsters.keys()]);
  });

  it("never leaves an in-range monster asleep", () => {
    const c = makeController();
    for (let i = 0; i < 60 * 10; i++) {
      c.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
    for (const m of c.monsters.values()) {
      if (Math.hypot(m.pose.x, m.pose.z) <= WAKE_RADIUS) {
        expect(m.state).not.toBe("sleep");
      }
    }
  });

  it("keeps out-of-range monsters asleep", () => {
    const c = makeController();
    for (let i = 0; i < 60; i++) {
      c.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
    for (const m of c.monsters.values()) {
      if (Math.hypot(m.pose.x, m.pose.z) > WAKE_RADIUS) {
        expect(m.state).toBe("sleep");
      }
    }
  });

  it("forgets monsters when their cells leave the materialization window", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const original = [...c.monsters.keys()];
    expect(original.length).toBeGreaterThan(0);
    player.x = 100000;
    player.z = 100000;
    c.tick(1 / 60);
    for (const id of original) {
      expect(c.monsters.has(id)).toBe(false);
    }
  });

  it("chases toward a player placed next to a monster", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x + 10;
    player.z = m.pose.z;
    const before = m.pose.x;
    for (let i = 0; i < 60; i++) {
      c.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
    const after = c.monsters.get(id)!.pose;
    expect(after.x).toBeGreaterThan(before);
  });
});

describe("monster controller multiplayer", () => {
  it("broadcasts owned monsters to the mesh, at the moving cadence", () => {
    const sent: MonsterUpdate[][] = [];
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({
      getPlayers: () => [player],
      onBroadcast: (updates) => sent.push(updates),
    });
    c.tick(1 / 60);
    const [, m] = [...c.monsters.entries()][0];
    // put the player within aggro so the nearest monster chases (moves)
    player.x = m.pose.x + 10;
    player.z = m.pose.z;
    c.tick(1 / 60);
    const first = sent.length;
    expect(first).toBeGreaterThanOrEqual(1);
    expect(sent[0].length).toBeGreaterThan(0);
    expect(sent[0][0].kind).toBe("zombie");
    expect(c.monsters.has(sent[0][0].id)).toBe(true);

    // one moving cadence later, still no broadcast; just past it, one more
    vi.advanceTimersByTime(149);
    c.tick(1 / 60);
    expect(sent.length).toBe(first);
    vi.advanceTimersByTime(2);
    c.tick(1 / 60);
    expect(sent.length).toBeGreaterThan(first);
  });

  it("ignores broadcasts for monsters it owns", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x;
    player.z = m.pose.z;
    c.applyMonsterUpdates([update({ id, x: 999, z: 999 })]);
    expect(c.monsters.get(id)!.pose.x).not.toBe(999);
  });

  it("adopts a peer-owned monster from its broadcasts without stepping it", () => {
    const me = { did: "me", x: 0, z: 0 };
    const peer = { did: "aaa", x: 10, z: 0 }; // strictly closer to the crafted monster
    const c = makeController({ getPlayers: () => [me, peer] });
    c.applyMonsterUpdates([update()]);
    const adopted = c.monsters.get("m1_0_0_0");
    expect(adopted).toBeDefined();
    expect(adopted!.pose.x).toBe(9);
    // the peer (nearer) owns it, so this client must not step it
    c.tick(1 / 60);
    expect(c.monsters.get("m1_0_0_0")!.pose.x).toBe(9);
  });

  it("two clients converge on each monster's owner's simulation via broadcast and apply", () => {
    const a = { did: "a", x: 0, z: 0 };
    const b = { did: "b", x: 10, z: 0 };
    let bC: MonsterController | undefined;
    const aC = makeController({
      getDid: () => "a",
      getPlayers: () => [a, b],
      onBroadcast: (updates) => bC?.applyMonsterUpdates(updates),
    });
    bC = makeController({
      getDid: () => "b",
      getPlayers: () => [a, b],
      onBroadcast: (updates) => aC.applyMonsterUpdates(updates),
    });
    for (let i = 0; i < 60 * 15; i++) {
      aC.tick(1 / 60);
      bC.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
    const shared = [...aC.monsters.keys()].filter((id) => bC.monsters.has(id));
    expect(shared.length).toBeGreaterThan(0);
    for (const id of shared) {
      const ma = aC.monsters.get(id)!;
      const mb = bC.monsters.get(id)!;
      expect(
        Math.hypot(ma.pose.x - mb.pose.x, ma.pose.z - mb.pose.z),
      ).toBeLessThan(0.6);
    }
  });

  it("merges atproto records last-write-wins, ignoring other worlds' seeds", () => {
    const c = makeController();
    const makeRecord = (
      overrides: Partial<MonsterRecord> = {},
    ): MonsterRecord => ({
      $type: MONSTER_COLLECTION,
      id: "m1_0_0_0",
      kind: "zombie",
      owner: "peer",
      seed: 42,
      x: 20,
      y: 11,
      z: 30,
      yawDeg: 0,
      hp: 20,
      state: "chase",
      updatedAt: 1_000,
      createdAt: "t",
      ...overrides,
    });

    c.mergeFromAtproto([makeRecord()]);
    const adopted = c.monsters.get("m1_0_0_0")!;
    expect(adopted.owner).toBe("peer");
    expect(adopted.pose.x).toBe(20);
    expect(adopted.pose.z).toBe(30);

    // an older record loses
    c.mergeFromAtproto([makeRecord({ x: 5, updatedAt: 500 })]);
    expect(c.monsters.get("m1_0_0_0")!.pose.x).toBe(20);
    // a newer record wins
    c.mergeFromAtproto([makeRecord({ x: 25, updatedAt: 2_000 })]);
    expect(c.monsters.get("m1_0_0_0")!.pose.x).toBe(25);
    // a record from another world is ignored
    c.mergeFromAtproto([makeRecord({ seed: 99, x: 77, updatedAt: 3_000 })]);
    expect(c.monsters.get("m1_0_0_0")!.pose.x).toBe(25);
  });

  it("persists only owned monsters, immediately then at the interval", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x;
    player.z = m.pose.z;
    c.tick(1 / 60);

    const now = Date.now();
    const due = c.recordsForPersistence(now);
    expect(due.length).toBeGreaterThan(0);
    for (const r of due) {
      expect(r.owner).toBe("me");
    }
    c.markPersisted(due.map((r) => r.id));
    expect(c.recordsForPersistence(now)).toHaveLength(0);
    expect(c.recordsForPersistence(now + PERSIST_INTERVAL_MS - 1)).toHaveLength(
      0,
    );
    expect(
      c.recordsForPersistence(now + PERSIST_INTERVAL_MS).length,
    ).toBeGreaterThan(0);
  });

  it("writes immediately when an owned monster's state changes", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x + 10; // within aggro: the zombie chases
    player.z = m.pose.z;
    c.tick(1 / 60);

    const now = Date.now();
    const due = c.recordsForPersistence(now);
    expect(due.length).toBeGreaterThan(0);
    c.markPersisted(due.map((r) => r.id));
    expect(c.recordsForPersistence(now + 1_000)).toHaveLength(0);

    player.x = m.pose.x; // melee: chase becomes attack
    player.z = m.pose.z;
    c.tick(1 / 60);
    const changed = c.recordsForPersistence(now + 1_000);
    expect(changed.find((r) => r.id === id)).toBeDefined();
  });

  it("keeps the current owner within a hysteresis margin, then hands off", () => {
    const a = { did: "a", x: 11, z: 0 };
    const b = { did: "b", x: 10, z: 0 };
    const c = makeController({ getDid: () => "c", getPlayers: () => [a, b] });
    const record: MonsterRecord = {
      $type: MONSTER_COLLECTION,
      id: "m1_0_0_0",
      kind: "zombie",
      owner: "a",
      seed: 42,
      x: 10,
      y: 11,
      z: 0,
      yawDeg: 0,
      hp: 20,
      state: "chase",
      updatedAt: 1_000,
      createdAt: "t",
    };
    c.mergeFromAtproto([record]);
    expect(c.monsters.get("m1_0_0_0")!.owner).toBe("a");

    // b is nearest, but a (the current owner) is within the margin: a keeps it
    c.tick(1 / 60);
    expect(c.monsters.get("m1_0_0_0")!.owner).toBe("a");

    // a leaves: b is now clearly nearer and takes over
    a.x = 100;
    c.tick(1 / 60);
    expect(c.monsters.get("m1_0_0_0")!.owner).toBe("b");

    // a returns, but b (the current owner) keeps it within the margin
    a.x = 10.5;
    c.tick(1 / 60);
    expect(c.monsters.get("m1_0_0_0")!.owner).toBe("b");
  });
});

describe("monster controller damage", () => {
  const record = (overrides: Partial<MonsterRecord> = {}): MonsterRecord => ({
    $type: MONSTER_COLLECTION,
    id: "m1_0_0_0",
    kind: "zombie",
    owner: "me",
    seed: 42,
    x: 0,
    y: 11,
    z: 0,
    yawDeg: 0,
    hp: 20,
    state: "chase",
    updatedAt: 1_000,
    createdAt: "t",
    ...overrides,
  });

  it("deals damage to a monster it owns", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x;
    player.z = m.pose.z;
    c.tick(1 / 60);
    expect(c.damage(id, 8)).toBe(true);
    expect(c.monsters.get(id)!.hp).toBe(m.maxHp - 8);
  });

  it("refuses to damage a monster another player owns", () => {
    const me = { did: "me", x: 0, z: 0 };
    const peer = { did: "aaa", x: 10, z: 0 }; // strictly closer to the crafted monster
    const c = makeController({ getPlayers: () => [me, peer] });
    c.applyMonsterUpdates([update()]);
    expect(c.monsters.get("m1_0_0_0")!.owner).toBe("aaa");
    expect(c.damage("m1_0_0_0", 8)).toBe(false);
    expect(c.monsters.get("m1_0_0_0")!.hp).toBe(20);
  });

  it("applies a peer's remote damage to a monster it owns", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x;
    player.z = m.pose.z;
    c.tick(1 / 60);
    expect(
      c.applyRemoteDamage({ id, amount: 8, attackerX: 0, attackerZ: 0 }),
    ).toBe(true);
    expect(c.monsters.get(id)!.hp).toBe(m.maxHp - 8);
  });

  it("knocks a monster back from the attacker", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    // Stand two units away: the zombie attacks in place instead of chasing.
    player.x = m.pose.x + 2;
    player.z = m.pose.z;
    c.tick(1 / 60);
    const before = c.monsters.get(id)!.pose;
    expect(c.damage(id, 8)).toBe(true);
    const after = c.monsters.get(id)!.pose;
    const near = Math.hypot(before.x - player.x, before.z - player.z);
    const far = Math.hypot(after.x - player.x, after.z - player.z);
    expect(far).toBeCloseTo(near + KNOCKBACK, 5);
  });

  it("does not push a monster far enough to reach a wall", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({
      getPlayers: () => [player],
      solidAt: () => true,
    });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x + 2;
    player.z = m.pose.z;
    c.tick(1 / 60);
    const before = c.monsters.get(id)!.pose;
    c.damage(id, 8);
    const after = c.monsters.get(id)!.pose;
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.z).toBeCloseTo(before.z, 6);
    expect(c.monsters.get(id)!.hp).toBeLessThan(20);
  });

  it("reports the hit through onHit", () => {
    const player = { did: "me", x: 0, z: 0 };
    const hits: string[] = [];
    const c = makeController({
      getPlayers: () => [player],
      onHit: (id) => hits.push(id),
    });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x;
    player.z = m.pose.z;
    c.tick(1 / 60);
    c.damage(id, 8);
    expect(hits).toEqual([id]);
  });

  it("floors health at zero, writes the tombstone, and never revives the monster", () => {
    const player = { did: "me", x: 0, z: 0 };
    const c = makeController({ getPlayers: () => [player] });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x;
    player.z = m.pose.z;
    c.tick(1 / 60);
    expect(c.damage(id, 100)).toBe(true);
    expect(c.monsters.get(id)!.hp).toBe(0);

    // the dead monster is persisted as the tombstone, then forgotten
    const now = Date.now();
    const due = c.recordsForPersistence(now);
    const tombstone = due.find((r) => r.id === id);
    expect(tombstone).toBeDefined();
    expect(tombstone!.hp).toBe(0);
    c.markPersisted([id]);
    expect(c.monsters.has(id)).toBe(false);

    // nothing re-materializes it, from a spawn or a stale record
    c.tick(1 / 60);
    expect(c.monsters.has(id)).toBe(false);
    c.mergeFromAtproto([record({ id, hp: 20, updatedAt: 2_000 })]);
    expect(c.monsters.has(id)).toBe(false);
  });

  it("marks a monster dead from a zero-health broadcast and ignores later ones", () => {
    const c = makeController();
    c.applyMonsterUpdates([update({ hp: 0 })]);
    expect(c.monsters.has("m1_0_0_0")).toBe(false);
    // a stale full-health broadcast must not bring it back
    c.applyMonsterUpdates([update({ hp: 20 })]);
    expect(c.monsters.has("m1_0_0_0")).toBe(false);
  });

  it("keeps a peer-owned corpse until it has lain out, then forgets it", () => {
    const me = { did: "me", x: 0, z: 0 };
    const peer = { did: "aaa", x: 10, z: 0 };
    const c = makeController({ getPlayers: () => [me, peer] });
    c.applyMonsterUpdates([update()]);
    expect(c.monsters.get("m1_0_0_0")!.owner).toBe("aaa");

    // the owner's death broadcast leaves the corpse in the map, so this client
    // can render the fall before it disappears
    c.applyMonsterUpdates([update({ hp: 0 })]);
    const corpse = c.monsters.get("m1_0_0_0");
    expect(corpse).toBeDefined();
    expect(corpse!.hp).toBe(0);

    // once it has lain out it is forgotten, and nothing revives it
    vi.advanceTimersByTime(CORPSE_MS + 1);
    c.tick(1 / 60);
    expect(c.monsters.has("m1_0_0_0")).toBe(false);
    c.applyMonsterUpdates([update({ hp: 20 })]);
    expect(c.monsters.has("m1_0_0_0")).toBe(false);
  });

  it("adopts nothing from a tombstone record", () => {
    const c = makeController();
    c.mergeFromAtproto([record({ hp: 0 })]);
    expect(c.monsters.has("m1_0_0_0")).toBe(false);
  });

  it("broadcasts a dead monster's final state so peers hide it", () => {
    const player = { did: "me", x: 0, z: 0 };
    const sent: MonsterUpdate[][] = [];
    const c = makeController({
      getPlayers: () => [player],
      onBroadcast: (updates) => sent.push(updates),
    });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x;
    player.z = m.pose.z;
    c.tick(1 / 60);
    sent.length = 0;
    vi.advanceTimersByTime(2_001);
    expect(c.damage(id, 100)).toBe(true);
    c.tick(1 / 60);
    const deadBroadcast = sent.flat().find((u) => u.id === id);
    expect(deadBroadcast).toBeDefined();
    expect(deadBroadcast!.hp).toBe(0);
  });
});

describe("monster controller attacks", () => {
  const record = (overrides: Partial<MonsterRecord> = {}): MonsterRecord => ({
    $type: MONSTER_COLLECTION,
    id: "m1_0_0_0",
    kind: "zombie",
    owner: "me",
    seed: 42,
    x: 0,
    y: 11,
    z: 0,
    yawDeg: 0,
    hp: 20,
    state: "chase",
    updatedAt: 1_000,
    createdAt: "t",
    ...overrides,
  });

  /** The attacker positions a fresh controller a player next to, then waits for a swing. */
  const placeNextTo = (
    c: MonsterController,
    player: { did: string; x: number; z: number },
    seconds: number,
  ): void => {
    c.tick(1 / 60);
    const [, m] = [...c.monsters.entries()][0];
    player.x = m.pose.x + 1;
    player.z = m.pose.z;
    for (let i = 0; i < Math.ceil(seconds / (1 / 60)); i++) {
      c.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
  };

  it("reports an owned zombie's swing on the local player", () => {
    const me = { did: "me", x: 0, z: 0 };
    const hits: Array<[string, number]> = [];
    const c = makeController({
      getPlayers: () => [me],
      onHitPlayer: (did, amount) => hits.push([did, amount]),
    });
    placeNextTo(c, me, ATTACK_INTERVAL_SECONDS + 1);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(([did]) => did === "me")).toBe(true);
    expect(hits[0][1]).toBe(ZOMBIE_DAMAGE);
  });

  it("reports the swing on the nearer peer when one stands closer", () => {
    const me = { did: "me", x: 0, z: 0 };
    const peer = { did: "aaa", x: 0, z: 0 };
    const hits: Array<[string, number]> = [];
    const c = makeController({
      getPlayers: () => [me, peer],
      onHitPlayer: (did, amount) => hits.push([did, amount]),
    });
    c.tick(1 / 60);
    const [id, m] = [...c.monsters.entries()][0];
    // The local player stands close enough to own the monster first, so the
    // hysteresis keeps it theirs once the peer edges nearer.
    me.x = m.pose.x + 2;
    me.z = m.pose.z;
    for (let i = 0; i < 30; i++) {
      c.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
    expect(c.monsters.get(id)!.owner).toBe("me");
    // The peer stands one unit closer than the local player — inside the
    // ownership hysteresis, so the local player keeps the monster but the
    // zombie's swings land on the peer.
    peer.x = m.pose.x + 1;
    peer.z = m.pose.z;
    hits.length = 0; // swings before the peer closed in are not this test's business
    for (
      let i = 0;
      i < Math.ceil((ATTACK_INTERVAL_SECONDS + 1) / (1 / 60));
      i++
    ) {
      c.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(([did]) => did === "aaa")).toBe(true);
    expect(hits[0][1]).toBe(ZOMBIE_DAMAGE);
  });

  it("reports nothing for a monster a peer owns", () => {
    const me = { did: "me", x: 0, z: 0 };
    const peer = { did: "aaa", x: 0, z: 0 };
    const hits: Array<[string, number]> = [];
    const c = makeController({
      getPlayers: () => [me, peer],
      onHitPlayer: (did, amount) => hits.push([did, amount]),
    });
    c.mergeFromAtproto([record({ owner: "aaa" })]);
    // the peer is the nearest player, so they own and simulate the monster
    for (let i = 0; i < 60; i++) {
      c.tick(1 / 60);
      vi.advanceTimersByTime(16);
    }
    expect(hits).toEqual([]);
  });
});
