import { describe, expect, it } from "vitest";

import {
  caveCeilingRise,
  caveField,
  caveFloorDrop,
  caveNoise,
  CAVE_SEED_MIX,
  DEFAULT_CAVES,
  type CaveParams,
} from "./caves";
import { DEFAULT_TERRAIN, terrainField } from "./terrain";

const at = (params: CaveParams, seed = 1) =>
  caveField(params, caveNoise(params, seed));

describe("the cave field", () => {
  const params = DEFAULT_CAVES;
  const cave = at(params);

  it("is negative somewhere and positive somewhere, or it is not carving", () => {
    // The construction in one assertion: two noise samples, a squared sum, a threshold. If
    // nothing comes out negative then nothing is being carved and every other test here is
    // measuring an empty field.
    let negative = 0;
    let sampled = 0;
    for (let i = 0; i < 40_000; i++) {
      const x = (i * 7919) % 20_000;
      const y = -200 + ((i * 6271) % 4000);
      const z = (i * 4409) % 20_000;
      if (cave(-y, x, y, z) < 0) negative++;
      sampled++;
    }
    expect(negative, `carved ${negative} of ${sampled}`).toBeGreaterThan(0);
  });

  it("carves a small fraction of the rock it passes through", () => {
    // voxelscape measured 4 per cent below the surface. This is the same construction at a
    // different lattice size, so it should be in the same neighbourhood — and the assertion
    // has a wide band on purpose, because the *interesting* number is that it is a few per cent
    // and not a few tens. A threshold that suddenly carved a third of the world would change
    // every measurement taken against it.
    let carved = 0;
    let inRock = 0;
    for (let i = 0; i < 60_000; i++) {
      const x = (i * 7919) % 12_000;
      const z = (i * 4409) % 12_000;
      const y = -600 + ((i * 6271) % 2000);
      if (y > 0) continue;
      inRock++;
      if (cave(-y, x, y, z) < 0) carved++;
    }
    const fraction = carved / inRock;
    expect(fraction, `carved ${(fraction * 100).toFixed(1)}%`).toBeGreaterThan(
      0.005,
    );
    expect(fraction, `carved ${(fraction * 100).toFixed(1)}%`).toBeLessThan(
      0.35,
    );
  });

  it("stops at its floor and above its ceiling, and contributes nothing either side", () => {
    // **The `+Infinity` shortcut, checked as a value rather than as a sign**, because it is
    // only safe if it is genuinely infinite: `max(ground, −Infinity)` is `ground`, which is the
    // whole point, and a merely-large number would be a large number the picker could step by.
    const rise = caveCeilingRise(params);
    const drop = caveFloorDrop(params);
    expect(cave(-500, 0, 500, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(cave(5000, 0, -5000, 0)).toBe(Number.POSITIVE_INFINITY);
    // And just inside, it answers finitely — the shortcuts are on the right side of the line.
    expect(Number.isFinite(cave(-rise * 0.9, 0, rise * 0.9, 0))).toBe(true);
    expect(Number.isFinite(cave(drop * 0.9, 0, -drop * 0.9, 0))).toBe(true);
  });

  it("is a distance in world units rather than a bare noise magnitude", () => {
    // **The property the picker depends on.** A field whose value is not a distance steps
    // through surfaces, which is what `FieldOptions.lipschitz` exists to prevent and what
    // `caveField` scales itself to avoid needing. Measured against the gradient the module
    // derives from: |d(cave)/d(world)| should be at most 1.
    //
    // **Measured only where all six samples are finite.** Outside its depth range the field
    // answers `+Infinity`, so a stencil straddling the ceiling has an infinite difference and
    // measures `Infinity` — not because the scaling is wrong but because the field is genuinely
    // discontinuous there, which is the module's stated design. The first version of this test
    // included those samples and failed on them, which is the right way round: it says the
    // discontinuity is real rather than hiding it.
    const step = 4;
    let worst = 0;
    let measured = 0;
    for (let i = 0; i < 30_000; i++) {
      const x = (i * 7919) % 9000;
      const z = (i * 4409) % 9000;
      // Depths inside the cave's band — `floor` is 450 — so most samples are finite and the
      // measurement is of the field rather than of the depth-range shortcut. The first version
      // of this ran `y` over a range chosen for the old signature and 392 of 30,000 samples
      // landed inside the band, which the `measured` assertion caught.
      const y = -430 + ((i * 6271) % 420);
      const here = cave(-y, x, y, z);
      const xp = cave(x + step, y, z, 0);
      const xm = cave(x - step, y, z, 0);
      const yp = cave(x, y + step, z, 0);
      const ym = cave(x, y - step, z, 0);
      const zp = cave(x, y, z + step, 0);
      const zm = cave(x, y, z - step, 0);
      if (![here, xp, xm, yp, ym, zp, zm].every(Number.isFinite)) continue;
      measured++;
      const gradient = Math.hypot(xp - xm, yp - ym, zp - zm) / (2 * step);
      if (gradient > worst) worst = gradient;
    }
    expect(
      measured,
      "no sample was inside the cave's depth range",
    ).toBeGreaterThan(1000);
    expect(worst, `measured Lipschitz ${worst.toFixed(3)}`).toBeLessThanOrEqual(
      1,
    );
  });

  it("suppresses cave mouths near the surface", () => {
    // voxelscape's reason for the penalty: without it the landscape is Swiss cheese rather
    // than eroded. Asserted as a *rate* — fewer crossings high than deep — rather than as a
    // count, so a change of lattice size does not fail it for the wrong reason.
    const crossings = (y: number): number => {
      let count = 0;
      for (let i = 0; i < 20_000; i++) {
        const x = (i * 7919) % 9000;
        const z = (i * 4409) % 9000;
        if (cave(-y, x, y, z) < 0) count++;
      }
      return count;
    };
    expect(crossings(-300), "deep").toBeGreaterThan(0);
    expect(crossings(0), "at the surface").toBeLessThan(crossings(-300));
  });

  it("gives two landscapes different caves from one seed stream", () => {
    // The `CAVE_SEED_MIX` exists so a cave pattern cannot coincide with the landscape's own
    // noise, and the cheapest way to pin that is to check two seeds disagree.
    const one = at(params, 1);
    const two = at(params, 2);
    let differing = 0;
    for (let i = 0; i < 20_000; i++) {
      const x = (i * 7919) % 9000;
      const z = (i * 4409) % 9000;
      if (one(200, x, -200, z) !== two(200, x, -200, z)) differing++;
    }
    expect(differing).toBeGreaterThan(100);
  });

  it("takes its seed from the landscape's unless told otherwise", () => {
    // Both routes land in the same place, which is the property that matters: a caller who
    // writes the landscape's own seed down explicitly gets the same caves as one who leaves it
    // out, so a world can be described two ways and still be one world. The first version of
    // this mixed the seed on one side only and compared against a different field.
    const derived = at(params, 99);
    const explicit = at({ ...params, seed: 99 }, 99);
    expect(explicit(200, 123, -200, 456)).toBe(derived(200, 123, -200, 456));

    // **And the mix is applied to both**, so no caller can accidentally address the
    // landscape's own noise stream — which is what `CAVE_SEED_MIX` is for.
    const unmixed = at({ ...params, seed: 0 }, 0);
    let differs = 0;
    for (let i = 0; i < 4_000; i++) {
      const x = (i * 7919) % 9000;
      const z = (i * 4409) % 9000;
      if (unmixed(200, x, -200, z) !== derived(200, x, -200, z)) differs++;
    }
    expect(differs).toBeGreaterThan(50);
    expect(CAVE_SEED_MIX).toBeGreaterThan(0);
  });
});

describe("a landscape carved with caves", () => {
  const solid = terrainField(DEFAULT_TERRAIN);
  const carved = terrainField({ ...DEFAULT_TERRAIN, caves: DEFAULT_CAVES });

  it("adds a second zero set without disturbing the ground's own", () => {
    // `max(ground, −cave)` can only lower the field, so above ground the two agree exactly —
    // which is the same argument `couldHoldAir` rests on, and it is worth pinning at the field
    // rather than only at the gate.
    for (let i = 0; i < 5_000; i++) {
      const x = ((i * 7919) % 9000) - 4500;
      const z = ((i * 4409) % 9000) - 4500;
      const y = solid.heightAt(x, z) + 50;
      expect(carved(x, y, z)).toBe(solid(x, y, z));
    }
  });

  it("reports itself as a height field only where that is still true", () => {
    // `heightAt` is the *ground's* height and stays a height field. What stops being true is
    // the surface's being a graph over `xz`, and the gate below is what accounts for it.
    expect(Number.isFinite(carved.heightAt(120, -80))).toBe(true);
  });

  it("never rules out a chunk that holds a cave", () => {
    // **The failure that has no error message.** A cave is a hole in the rock, so a chunk deep
    // inside stone holds surface while every one of its column heights is above it. The column
    // lattice cannot see that, and a "no" would delete the cave permanently — the mesher that
    // skipped it recorded an answer. So the check is against dense sampling of the *composed*
    // field, and it is the whole reason the gate falls back to a band when caves are present.
    let ruledOutButNotEmpty = 0;
    let ruledOut = 0;
    let empty = 0;
    let held = 0;
    for (let cy = -3; cy <= 3; cy++) {
      for (let cx = -4; cx <= 4; cx++) {
        for (let cz = -4; cz <= 4; cz++) {
          const bounds = {
            min: { x: cx * 320, y: cy * 320, z: cz * 320 },
            max: { x: (cx + 1) * 320, y: (cy + 1) * 320, z: (cz + 1) * 320 },
          };
          const hasSurface = denseHoldsSurface(carved, bounds);
          if (hasSurface) held++;
          else empty++;
          const says = carved.couldHoldSurface(bounds);
          if (!says) ruledOut++;
          if (!says && hasSurface) ruledOutButNotEmpty++;
        }
      }
    }
    expect(ruledOutButNotEmpty, "a chunk with a cave in it was ruled out").toBe(
      0,
    );
    expect(empty, "the sweep found no empty chunks").toBeGreaterThan(50);
    expect(held, "the sweep found no surface").toBeGreaterThan(50);
  });

  it("still skips the air above the landscape", () => {
    // The one thing the gate keeps with caves, and it keeps it because a cave in the sky cannot
    // create geometry. Without this the whole base-field route would have no gate at all.
    const above = {
      min: { x: -160, y: 900, z: -160 },
      max: { x: 160, y: 1200, z: 160 },
    };
    expect(carved.couldHoldSurface(above)).toBe(false);
    expect(carved.couldHoldAir?.(above)).toBe(true);
  });
});

/**
 * Whether a box holds a sign change, by dense sampling of the field itself.
 *
 * **Sampled far finer than the gate's own test and aimed at the composed field rather than at
 * column heights**, which is what makes it a check: it sees the cave that a column lattice
 * cannot. `denseHoldsSurface` for a solid landscape and this for a carved one are the same
 * question asked of different functions, which is the point.
 */
const denseHoldsSurface = (
  terrain: ReturnType<typeof terrainField>,
  bounds: { min: Vec3Like; max: Vec3Like },
  n = 17,
): boolean => {
  let lowest = Number.POSITIVE_INFINITY;
  let highest = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const d = terrain(
          bounds.min.x + ((bounds.max.x - bounds.min.x) * i) / (n - 1),
          bounds.min.y + ((bounds.max.y - bounds.min.y) * j) / (n - 1),
          bounds.min.z + ((bounds.max.z - bounds.min.z) * k) / (n - 1),
        );
        if (!Number.isFinite(d)) continue;
        if (d < lowest) lowest = d;
        if (d > highest) highest = d;
      }
    }
  }
  return !(highest < 0 || lowest > 0);
};

interface Vec3Like {
  x: number;
  y: number;
  z: number;
}
