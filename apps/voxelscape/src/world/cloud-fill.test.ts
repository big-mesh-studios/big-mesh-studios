// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cloudColumnCoverage,
  cloudFillNoise,
  cloudVoxelAt,
} from "./cloud-fill";
import { DEFAULT_TERRAIN } from "./noise";

describe("cloud fill field", () => {
  it("shares one noise instance per seed and samples deterministically", () => {
    const a = cloudFillNoise(DEFAULT_TERRAIN.seed);
    const b = cloudFillNoise(DEFAULT_TERRAIN.seed);
    expect(a).toBe(b);
    expect(cloudColumnCoverage(a, 128, 0)).toBe(cloudColumnCoverage(a, 128, 0));
    expect(cloudVoxelAt(a, 128, 220, 0, 0.24)).toBe(
      cloudVoxelAt(a, 128, 220, 0, 0.24),
    );
  });

  it("fills some voxels through the cloud band on the default seed", () => {
    const noise = cloudFillNoise(DEFAULT_TERRAIN.seed);
    let solid = 0;
    for (const [x, z] of [
      [128, 0],
      [256, 0],
      [-128, 128],
      [1000, 1000],
    ]) {
      const cov = cloudColumnCoverage(noise, x, z);
      for (let wy = 156; wy <= 284; wy += 2) {
        if (cloudVoxelAt(noise, x, wy, z, cov)) solid++;
      }
    }
    expect(solid).toBeGreaterThan(0);
  });
});
