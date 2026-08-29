// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEATH_FALL_SECONDS,
  DEATH_LIE_SECONDS,
  HEART_HP,
  START_HEARTS,
  PlayerHealth,
  heartStates,
} from "./health";

const FULL_HP = START_HEARTS * HEART_HP;

describe("PlayerHealth", () => {
  it("starts with every heart full and standing", () => {
    const h = new PlayerHealth();
    expect(h.hp).toBe(FULL_HP);
    expect(h.maxHp).toBe(FULL_HP);
    expect(h.dead).toBe(false);
  });

  it("reports the damage actually taken", () => {
    const h = new PlayerHealth();
    expect(h.takeDamage(2)).toBe(2);
    expect(h.hp).toBe(FULL_HP - 2);
    expect(h.dead).toBe(false);
  });

  it("floors health at zero, and a swing past it takes only what remains", () => {
    const h = new PlayerHealth();
    expect(h.takeDamage(100)).toBe(FULL_HP);
    expect(h.hp).toBe(0);
    expect(h.takeDamage(2)).toBe(0);
  });

  it("flips to dead exactly once, when the last heart empties", () => {
    const h = new PlayerHealth();
    h.takeDamage(FULL_HP - 1);
    expect(h.dead).toBe(false);
    h.takeDamage(1);
    expect(h.dead).toBe(true);
    // a hit on a corpse takes nothing and does not restart the sequence
    h.takeDamage(2);
    expect(h.dead).toBe(true);
    expect(h.hp).toBe(0);
  });

  it("calls the change callback on a hit and a heal, but not on a no-op hit", () => {
    const h = new PlayerHealth();
    let calls = 0;
    h.onChange = () => calls++;
    h.takeDamage(1);
    expect(calls).toBe(1);
    h.takeDamage(0);
    expect(calls).toBe(1);
    h.heal(1);
    expect(calls).toBe(2);
  });

  it("advances the fall, lies out, and reports fallDone once", () => {
    let done = 0;
    const h = new PlayerHealth({ onFallDone: () => done++ });
    h.takeDamage(FULL_HP);
    expect(h.fallProgress).toBe(0);
    h.tick(DEATH_FALL_SECONDS / 2);
    expect(h.fallProgress).toBeCloseTo(0.5, 5);
    h.tick(DEATH_FALL_SECONDS / 2);
    expect(h.fallProgress).toBe(1);
    expect(done).toBe(0); // still lying out
    h.tick(DEATH_LIE_SECONDS);
    expect(done).toBe(1);
    h.tick(10); // reported once, until a respawn
    expect(done).toBe(1);
  });

  it("does nothing while alive", () => {
    let done = 0;
    const h = new PlayerHealth({ onFallDone: () => done++ });
    h.tick(10);
    expect(done).toBe(0);
    expect(h.fallProgress).toBe(0);
  });

  it("respawns with full hearts, standing again", () => {
    const h = new PlayerHealth();
    h.takeDamage(FULL_HP);
    expect(h.dead).toBe(true);
    h.respawn();
    expect(h.dead).toBe(false);
    expect(h.hp).toBe(FULL_HP);
    expect(h.fallProgress).toBe(0);
  });
});

describe("heartStates", () => {
  it("renders full, half and empty hearts from hit points", () => {
    expect(heartStates(FULL_HP, FULL_HP)).toEqual([2, 2, 2]);
    expect(heartStates(FULL_HP - 1, FULL_HP)).toEqual([2, 2, 1]);
    expect(heartStates(FULL_HP - 2, FULL_HP)).toEqual([2, 2, 0]);
    expect(heartStates(FULL_HP - 3, FULL_HP)).toEqual([2, 1, 0]);
    expect(heartStates(0, FULL_HP)).toEqual([0, 0, 0]);
  });

  it("floors a negative or overflowing hp into the available hearts", () => {
    expect(heartStates(-5, FULL_HP)).toEqual([0, 0, 0]);
    expect(heartStates(99, FULL_HP)).toEqual([2, 2, 2]);
  });
});
