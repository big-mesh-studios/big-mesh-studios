// @vitest-environment node
import { describe, expect, it } from "vitest";
import { boxSize } from "./box-size";

describe("boxSize", () => {
  it("pads a cubic grid by one voxel on each side", () => {
    const size = boxSize({ width: 24, height: 24, depth: 24 });
    const padded = 26 / 24;
    expect(size.width).toBeCloseTo(padded, 6);
    expect(size.height).toBeCloseTo(padded, 6);
    expect(size.depth).toBeCloseTo(padded, 6);
  });

  it("normalizes the largest axis to one before padding", () => {
    const size = boxSize({ width: 24, height: 48, depth: 24 });
    expect(size.width).toBeCloseTo(0.5 * (1 + 2 / 24), 6);
    expect(size.height).toBeCloseTo(1 * (1 + 2 / 48), 6);
    expect(size.depth).toBeCloseTo(0.5 * (1 + 2 / 24), 6);
  });
});
