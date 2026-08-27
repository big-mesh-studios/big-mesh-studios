// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MonsterSnapshot } from "./monster";
import { extrapolate, nextRenderedPosition } from "./reckon";

const GROUND = 10;

const makeSnapshot = (
  overrides: Partial<MonsterSnapshot> = {},
): MonsterSnapshot => ({
  id: "m1_0_0_0",
  kind: "zombie",
  pose: { x: 0, y: GROUND + 1.1, z: 0, yaw: 0, vx: 2, vz: 0 },
  hp: 20,
  maxHp: 20,
  state: "chase",
  wanderLeft: 0,
  cooldown: 0,
  owner: null,
  authoritativeAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe("dead reckoning", () => {
  it("extrapolates a pose forward by its velocity", () => {
    const p = extrapolate(makeSnapshot().pose, 0.5);
    expect(p.x).toBeCloseTo(1, 5);
    expect(p.z).toBe(0);
    expect(p.y).toBe(GROUND + 1.1);
  });

  it("draws a fresh sample exactly, without extrapolating its velocity", () => {
    const snap = makeSnapshot({ updatedAt: 1000 });
    const r = nextRenderedPosition({
      snapshot: snap,
      current: { x: 5, y: GROUND + 1.1, z: 5 },
      now: 1010,
      dt: 1 / 60,
    });
    expect(r.position.x).toBe(0);
    expect(r.position.y).toBe(GROUND + 1.1);
    expect(r.snapped).toBe(false);
  });

  it("extrapolates a stale sample", () => {
    const snap = makeSnapshot({ updatedAt: 0 });
    const r = nextRenderedPosition({
      snapshot: snap,
      current: { x: 0, y: GROUND + 1.1, z: 0 },
      now: 1000,
      dt: 1 / 60,
    });
    // one second of age clamps to the one-second extrapolation window: x -> 2
    expect(r.position.x).toBeGreaterThan(0);
    expect(r.position.x).toBeLessThan(2);
    expect(r.snapped).toBe(false);
  });

  it("eases toward the target on small errors", () => {
    const snap = makeSnapshot({ updatedAt: 0 });
    const r = nextRenderedPosition({
      snapshot: snap,
      current: { x: 1.9, y: GROUND + 1.1, z: 0 },
      now: 1000,
      dt: 1 / 60,
    });
    expect(r.position.x).toBeGreaterThan(1.9);
    expect(r.position.x).toBeLessThan(2);
    expect(r.snapped).toBe(false);
  });

  it("snaps to the target on large errors", () => {
    const snap = makeSnapshot({ updatedAt: 0 });
    const r = nextRenderedPosition({
      snapshot: snap,
      current: { x: 50, y: GROUND + 1.1, z: 50 },
      now: 1000,
      dt: 1 / 60,
    });
    expect(r.snapped).toBe(true);
    expect(r.position.x).toBeCloseTo(2, 3);
    expect(r.position.z).toBe(0);
  });
});
