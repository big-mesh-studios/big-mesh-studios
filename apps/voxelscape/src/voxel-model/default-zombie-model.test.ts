// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap } from "@big-mesh-studios/maths";
import {
  buildDefaultZombieModel,
  ZOMBIE_PALETTE,
} from "./default-zombie-model";

describe("default zombie model", () => {
  it("draws every side with palette indices in range", () => {
    const model = buildDefaultZombieModel();
    for (const kind of Object.keys(model.sides)) {
      const side = model.sides[kind];
      expect(side.width).toBe(24);
      expect(side.height).toBe(24);
      for (const index of side.data) {
        if (index !== Bitmap.EMPTY) {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThanOrEqual(31);
        }
      }
    }
  });

  it("is not empty and has a body, arms, and a head", () => {
    const model = buildDefaultZombieModel();
    const front = model.sides.front.data;
    const present = [...front].filter((index) => index !== Bitmap.EMPTY);
    expect(present.length).toBeGreaterThan(0);
    expect(present).toContain(1); // skin: arms and head
    expect(present).toContain(2); // shirt: torso
    expect(present).toContain(3); // pants: legs
    expect(present).toContain(0); // eyes
  });

  it("is deterministic", () => {
    const a = buildDefaultZombieModel();
    const b = buildDefaultZombieModel();
    for (const kind of Object.keys(a.sides)) {
      expect(a.sides[kind].data).toEqual(b.sides[kind].data);
    }
  });

  it("shapes a 32-texel palette the marcher can address", () => {
    expect(ZOMBIE_PALETTE).toHaveLength(32);
    for (const colour of ZOMBIE_PALETTE) {
      expect(colour.a).toBe(255);
    }
  });
});
