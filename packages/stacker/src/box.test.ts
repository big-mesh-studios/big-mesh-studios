// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Dimensions3D } from "@big-mesh-studios/maths";
import { boxSize } from "./box";

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
  it("sizes the box to the volume padded by one voxel on each side", () => {
    for (const dimensions of [
      { width: 10, height: 10, depth: 10 },
      { width: 16, height: 8, depth: 4 },
      { width: 1, height: 1, depth: 1 },
    ]) {
      const n = Dimensions3D.normalize(dimensions);
      const size = boxSize(dimensions);
      expect(size.width).toBeCloseTo(
        2 * (n.width / 2 + n.width / dimensions.width),
      );
      expect(size.height).toBeCloseTo(
        2 * (n.height / 2 + n.height / dimensions.height),
      );
      expect(size.depth).toBeCloseTo(
        2 * (n.depth / 2 + n.depth / dimensions.depth),
      );
    }
  });
});
