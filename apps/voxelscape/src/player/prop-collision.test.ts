// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  boxContains,
  boxGroundAt,
  boxVelocityAt,
  solidBoxAt,
  type SolidBox,
} from "./prop-collision";

const bed: SolidBox = {
  minX: -1,
  maxX: 1,
  minY: 0,
  maxY: 1,
  minZ: -2,
  maxZ: 2,
};

describe("prop collision", () => {
  it("contains a point inside the box and not outside it", () => {
    expect(boxContains(bed, 0, 0.5, 0)).toBe(true);
    expect(boxContains(bed, 0, 1.5, 0)).toBe(false);
    expect(boxContains(bed, 2, 0.5, 0)).toBe(false);
  });

  it("reports solid where any box stands", () => {
    expect(solidBoxAt([bed], 0, 0.5, 0)).toBe(true);
    expect(solidBoxAt([bed], 0, 0.5, 5)).toBe(false);
    expect(solidBoxAt([], 0, 0.5, 0)).toBe(false);
  });

  it("finds the highest box top at or below the feet", () => {
    const table: SolidBox = { ...bed, maxY: 2 };
    expect(boxGroundAt([bed, table], 0, 2, 0)).toBe(2);
    expect(boxGroundAt([bed, table], 0, 1, 0)).toBe(1);
    // Over nothing: no ground.
    expect(boxGroundAt([bed], 5, 1, 5)).toBe(-Infinity);
  });

  it("turns a box's footprint with its yaw", () => {
    // A long, thin box along Z: a point off to the side is inside only once it
    // has been turned a quarter turn.
    const plank: SolidBox = {
      minX: -0.5,
      maxX: 0.5,
      minY: 0,
      maxY: 1,
      minZ: -3,
      maxZ: 3,
    };
    expect(boxContains(plank, 2, 0.5, 0)).toBe(false);
    expect(boxContains({ ...plank, yaw: Math.PI / 2 }, 2, 0.5, 0)).toBe(true);
    expect(boxContains({ ...plank, yaw: Math.PI / 2 }, 0, 0.5, 2)).toBe(false);
  });

  it("reports the velocity of the box that holds the player up", () => {
    const platform: SolidBox = { ...bed, maxY: 2, vx: 3, vz: -1 };
    expect(boxVelocityAt([platform], 0, 2, 0)).toEqual([3, 0, -1]);
    expect(boxVelocityAt([platform], 5, 2, 5)).toBeNull();
  });
});
