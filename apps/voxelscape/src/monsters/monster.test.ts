// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MONSTER_DENSITY, monsterAt, monsterId, spawnPose } from "./monster";

describe("monster identity and spawning", () => {
  it("derives a stable id per (seed, cell, slot) address", () => {
    const a = monsterId(1, 0, 0, 0);
    expect(a).toBe("m1_0_0_0");
    expect(a).toBe(monsterId(1, 0, 0, 0));
    expect(monsterId(1, 0, 0, 1)).not.toBe(a);
    expect(monsterId(1, 1, 0, 0)).not.toBe(a);
    expect(monsterId(2, 0, 0, 0)).not.toBe(a);
  });

  it("materializes deterministically for the same seed and cell", () => {
    for (const [seed, cx, cz, slot] of [
      [1, 0, 0, 0],
      [42, -3, 7, 1],
      [54321, 100, -50, 1],
    ]) {
      expect(monsterAt(seed, cx, cz, slot)).toEqual(
        monsterAt(seed, cx, cz, slot),
      );
    }
  });

  it("differs across seeds", () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const a = monsterAt(1, i, 0, 0);
      const b = monsterAt(2, i, 0, 0);
      if ((a === null) !== (b === null)) {
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("spawns roughly the configured density", () => {
    let present = 0;
    const total = 2000;
    for (let i = 0; i < total; i++) {
      if (monsterAt(7, i, i, i % 2) !== null) {
        present++;
      }
    }
    const rate = present / total;
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(0.2);
    expect(rate).toBeLessThan(MONSTER_DENSITY + 0.05);
  });

  it("places spawn poses inside the cell, grounded on the height field", () => {
    const spawn = monsterAt(7, 2, 3, 0);
    expect(spawn).not.toBeNull();
    const pose = spawnPose(spawn!, 2, 3, () => 10);
    expect(pose.x).toBeGreaterThanOrEqual(2 * 32);
    expect(pose.x).toBeLessThan(3 * 32);
    expect(pose.z).toBeGreaterThanOrEqual(3 * 32);
    expect(pose.z).toBeLessThan(4 * 32);
    expect(pose.y).toBe(11.1);
    expect(pose.vx).toBe(0);
    expect(pose.vz).toBe(0);
  });
});
