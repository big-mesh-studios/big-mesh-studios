// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MonsterSnapshot } from "./monster";
import {
  ATTACK_INTERVAL_SECONDS,
  ATTACK_RADIUS,
  WAKE_RADIUS,
  stepZombie,
  type ZombieStepInputs,
} from "./zombie";

const GROUND = 10;

const makeInputs = (
  overrides: Partial<ZombieStepInputs> = {},
): ZombieStepInputs => ({
  players: [],
  heightAt: () => GROUND,
  solidAt: () => false,
  waterAt: () => false,
  ...overrides,
});

const makeSnapshot = (
  overrides: Partial<MonsterSnapshot> = {},
): MonsterSnapshot => ({
  id: "m1_0_0_0",
  kind: "zombie",
  pose: { x: 0, y: GROUND + 1.1, z: 0, yaw: 0, vx: 0, vz: 0 },
  hp: 20,
  maxHp: 20,
  state: "wander",
  wanderLeft: 0,
  cooldown: 0,
  owner: null,
  authoritativeAt: 0,
  updatedAt: 0,
  ...overrides,
});

const rng = (): number => 0.5;

describe("zombie brain", () => {
  it("sleeps with no player in sight", () => {
    const m = makeSnapshot();
    const { snapshot } = stepZombie(1, m, rng, makeInputs());
    expect(snapshot.state).toBe("sleep");
    expect(snapshot.pose).toEqual(m.pose);
  });

  it("sleeps when the nearest player is beyond wake radius", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: WAKE_RADIUS + 10, y: GROUND + 1, z: 0 }],
    });
    const { snapshot } = stepZombie(1, m, rng, inputs);
    expect(snapshot.state).toBe("sleep");
    expect(snapshot.pose.x).toBe(0);
  });

  it("wanders when a player is within wake but outside aggro", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({ players: [{ x: 30, y: GROUND + 1, z: 0 }] });
    const { snapshot } = stepZombie(1, m, rng, inputs);
    expect(snapshot.state).toBe("wander");
  });

  it("chases the nearest player and closes the distance", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({ players: [{ x: 10, y: GROUND + 1, z: 0 }] });
    const { snapshot } = stepZombie(1, m, rng, inputs);
    expect(snapshot.state).toBe("chase");
    expect(snapshot.pose.x).toBeGreaterThan(0);
    expect(snapshot.pose.z).toBeCloseTo(0, 10);
    expect(snapshot.pose.yaw).toBeCloseTo(Math.PI / 2, 5);
    expect(snapshot.pose.vx).toBeGreaterThan(0);
  });

  it("swings at a player in melee range, on an interval", () => {
    const m = makeSnapshot({ cooldown: 0.2 });
    const inputs = makeInputs({ players: [{ x: 1, y: GROUND + 1, z: 0 }] });
    const { snapshot } = stepZombie(1, m, rng, inputs);
    expect(snapshot.state).toBe("attack");
    expect(snapshot.pose.x).toBe(0);
    expect(snapshot.pose.vx).toBe(0);
    expect(snapshot.cooldown).toBeCloseTo(ATTACK_INTERVAL_SECONDS, 5);
  });

  it("keeps the swing timing when mid-swing", () => {
    const m = makeSnapshot({ cooldown: 0.6 });
    const inputs = makeInputs({ players: [{ x: 1, y: GROUND + 1, z: 0 }] });
    const { snapshot } = stepZombie(0.2, m, rng, inputs);
    expect(snapshot.state).toBe("attack");
    expect(snapshot.cooldown).toBeCloseTo(0.4, 5);
  });

  it("stays grounded on the height field", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, y: GROUND + 1, z: 0 }],
      heightAt: (x) => GROUND + x * 0.5,
    });
    const { snapshot } = stepZombie(0.5, m, rng, inputs);
    expect(snapshot.pose.y).toBeCloseTo(
      GROUND + snapshot.pose.x * 0.5 + 1.1,
      5,
    );
  });

  it("will not walk into a solid block", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, y: GROUND + 1, z: 0 }],
      solidAt: (x) => x > 1,
    });
    const { snapshot } = stepZombie(1, m, rng, inputs);
    expect(snapshot.pose.x).toBeLessThanOrEqual(1);
  });

  it("will not wade into water", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, y: GROUND + 1, z: 0 }],
      waterAt: (x) => x > 1,
    });
    const { snapshot } = stepZombie(1, m, rng, inputs);
    expect(snapshot.pose.x).toBeLessThanOrEqual(1);
  });

  it("refuses to climb too steep a slope", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, y: GROUND + 1, z: 0 }],
      heightAt: (x) => (x > 1 ? GROUND + 5 : GROUND),
    });
    const { snapshot } = stepZombie(1, m, rng, inputs);
    expect(snapshot.pose.x).toBeLessThanOrEqual(1);
  });

  it("re-rolls the wander heading when its time is up", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({ players: [{ x: 30, y: GROUND + 1, z: 0 }] });
    let calls = 0;
    const seqRng = (): number => (++calls === 1 ? 0 : 0.75);
    const { snapshot } = stepZombie(1, m, seqRng, inputs);
    expect(snapshot.state).toBe("wander");
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(snapshot.wanderLeft).toBeGreaterThan(0);
    expect(snapshot.pose.z).toBeGreaterThan(0);
  });
});

describe("zombie attacks", () => {
  const melee = { x: 1, y: GROUND + 1, z: 0 };

  it("reports the nearest player when a swing lands", () => {
    const m = makeSnapshot({ cooldown: 0.1 });
    const inputs = makeInputs({ players: [melee] });
    const { attack } = stepZombie(1, m, rng, inputs);
    expect(attack).toEqual({ x: melee.x, z: melee.z });
  });

  it("reports nothing while the cooldown still runs", () => {
    const m = makeSnapshot({ cooldown: 0.9 });
    const inputs = makeInputs({ players: [melee] });
    const { attack } = stepZombie(0.2, m, rng, inputs);
    expect(attack).toBeNull();
  });

  it("reports nothing while chasing, wandering, or sleeping", () => {
    const chase = stepZombie(
      1,
      makeSnapshot(),
      rng,
      makeInputs({ players: [{ x: 10, y: GROUND + 1, z: 0 }] }),
    );
    expect(chase.attack).toBeNull();
    const wander = stepZombie(
      1,
      makeSnapshot(),
      rng,
      makeInputs({ players: [{ x: 30, y: GROUND + 1, z: 0 }] }),
    );
    expect(wander.attack).toBeNull();
    const sleep = stepZombie(
      1,
      makeSnapshot(),
      rng,
      makeInputs({ players: [{ x: WAKE_RADIUS + 10, y: GROUND + 1, z: 0 }] }),
    );
    expect(sleep.attack).toBeNull();
  });

  it("reports no swing against a player outside melee range", () => {
    const far = { x: ATTACK_RADIUS + 1, y: GROUND + 1, z: 0 };
    const m = makeSnapshot({ cooldown: 0 });
    const { attack } = stepZombie(1, m, rng, makeInputs({ players: [far] }));
    expect(attack).toBeNull();
  });

  it("swings at a player close in all three axes", () => {
    const m = makeSnapshot({ cooldown: 0 });
    const atHeight = { x: 1, y: m.pose.y, z: 0 };
    const { snapshot, attack } = stepZombie(
      1,
      m,
      rng,
      makeInputs({ players: [atHeight] }),
    );
    expect(snapshot.state).toBe("attack");
    expect(attack).toEqual({ x: atHeight.x, z: atHeight.z });
  });

  it("does not swing at a player far above despite matching x and z", () => {
    // The reported bug: a player on a ledge directly above the zombie (same
    // xz, five units up) was at horizontal distance ~0 and so in melee range.
    const m = makeSnapshot({ cooldown: 0 });
    const above = { x: 1, y: m.pose.y + 5, z: 0 };
    const { snapshot, attack } = stepZombie(
      1,
      m,
      rng,
      makeInputs({ players: [above] }),
    );
    expect(snapshot.state).toBe("chase");
    expect(attack).toBeNull();
  });

  it("sleeps when the nearest player is far away vertically", () => {
    const m = makeSnapshot();
    const high = { x: 0, y: m.pose.y + WAKE_RADIUS + 10, z: 0 };
    const { snapshot } = stepZombie(1, m, rng, makeInputs({ players: [high] }));
    expect(snapshot.state).toBe("sleep");
  });

  it("swings immediately if the cooldown already ran out while chasing", () => {
    // The cooldown ticks down in every state, so a zombie that reaches melee
    // with it already spent strikes on the first attack frame.
    const m = makeSnapshot({ state: "chase", cooldown: 0 });
    const inputs = makeInputs({ players: [melee] });
    const { snapshot, attack } = stepZombie(1, m, rng, inputs);
    expect(snapshot.state).toBe("attack");
    expect(attack).toEqual({ x: melee.x, z: melee.z });
  });
});
