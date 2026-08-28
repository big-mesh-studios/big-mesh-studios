// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MonsterSnapshot } from "./monster";
import {
  ATTACK_INTERVAL_SECONDS,
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
    const next = stepZombie(1, m, rng, makeInputs());
    expect(next.state).toBe("sleep");
    expect(next.pose).toEqual(m.pose);
  });

  it("sleeps when the nearest player is beyond wake radius", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({ players: [{ x: WAKE_RADIUS + 10, z: 0 }] });
    const next = stepZombie(1, m, rng, inputs);
    expect(next.state).toBe("sleep");
    expect(next.pose.x).toBe(0);
  });

  it("wanders when a player is within wake but outside aggro", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({ players: [{ x: 30, z: 0 }] });
    const next = stepZombie(1, m, rng, inputs);
    expect(next.state).toBe("wander");
  });

  it("chases the nearest player and closes the distance", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({ players: [{ x: 10, z: 0 }] });
    const next = stepZombie(1, m, rng, inputs);
    expect(next.state).toBe("chase");
    expect(next.pose.x).toBeGreaterThan(0);
    expect(next.pose.z).toBeCloseTo(0, 10);
    expect(next.pose.yaw).toBeCloseTo(Math.PI / 2, 5);
    expect(next.pose.vx).toBeGreaterThan(0);
  });

  it("swings at a player in melee range, on an interval", () => {
    const m = makeSnapshot({ cooldown: 0.2 });
    const inputs = makeInputs({ players: [{ x: 1, z: 0 }] });
    const next = stepZombie(1, m, rng, inputs);
    expect(next.state).toBe("attack");
    expect(next.pose.x).toBe(0);
    expect(next.pose.vx).toBe(0);
    expect(next.cooldown).toBeCloseTo(ATTACK_INTERVAL_SECONDS, 5);
  });

  it("keeps the swing timing when mid-swing", () => {
    const m = makeSnapshot({ cooldown: 0.6 });
    const inputs = makeInputs({ players: [{ x: 1, z: 0 }] });
    const next = stepZombie(0.2, m, rng, inputs);
    expect(next.state).toBe("attack");
    expect(next.cooldown).toBeCloseTo(0.4, 5);
  });

  it("stays grounded on the height field", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, z: 0 }],
      heightAt: (x) => GROUND + x * 0.5,
    });
    const next = stepZombie(0.5, m, rng, inputs);
    expect(next.pose.y).toBeCloseTo(GROUND + next.pose.x * 0.5 + 1.1, 5);
  });

  it("will not walk into a solid block", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, z: 0 }],
      solidAt: (x) => x > 1,
    });
    const next = stepZombie(1, m, rng, inputs);
    expect(next.pose.x).toBeLessThanOrEqual(1);
  });

  it("will not wade into water", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, z: 0 }],
      waterAt: (x) => x > 1,
    });
    const next = stepZombie(1, m, rng, inputs);
    expect(next.pose.x).toBeLessThanOrEqual(1);
  });

  it("refuses to climb too steep a slope", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({
      players: [{ x: 10, z: 0 }],
      heightAt: (x) => (x > 1 ? GROUND + 5 : GROUND),
    });
    const next = stepZombie(1, m, rng, inputs);
    expect(next.pose.x).toBeLessThanOrEqual(1);
  });

  it("re-rolls the wander heading when its time is up", () => {
    const m = makeSnapshot();
    const inputs = makeInputs({ players: [{ x: 30, z: 0 }] });
    let calls = 0;
    const seqRng = (): number => (++calls === 1 ? 0 : 0.75);
    const next = stepZombie(1, m, seqRng, inputs);
    expect(next.state).toBe("wander");
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(next.wanderLeft).toBeGreaterThan(0);
    expect(next.pose.z).toBeGreaterThan(0);
  });
});
