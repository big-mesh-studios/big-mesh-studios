import { describe, expect, it } from "vitest";

import {
  DEFAULT_TERRAIN,
  FBM_AMPLITUDE_BOUND,
  fbmAmplitudeSum,
  MOUNTAIN_FEATURE,
  MOUNTAIN_MASK_FEATURE,
  MOUNTAIN_MASK_OCTAVES,
  NOISE_GRADIENT_BOUND,
  PerlinNoise2D,
  RIDGE_STRENGTH,
  TERRAIN_FEATURE,
  terrainField,
} from "./terrain";

/** A wide, flat-ish region to measure a height range over. */
const COLUMN_SAMPLES = 24;
const SAMPLE_SPAN = 4000;

const heightsOver = (
  heightAt: (x: number, z: number) => number,
  span = SAMPLE_SPAN,
  count = COLUMN_SAMPLES,
): number[] => {
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < count; k++) {
      heights.push(
        heightAt(
          -span / 2 + (span * i) / count,
          -span / 2 + (span * k) / count,
        ),
      );
    }
  }
  return heights;
};

describe("the noise", () => {
  it("is the same noise for the same seed and a different one for another", () => {
    // Without this the seed is decoration, and every world looks like every other world.
    const one = new PerlinNoise2D(1234);
    const same = new PerlinNoise2D(1234);
    const other = new PerlinNoise2D(1235);

    const at = (n: PerlinNoise2D) => [n.noise(0.5, 0.5), n.noise(3.25, -1.75)];
    expect(at(one)).toEqual(at(same));
    expect(at(one)).not.toEqual(at(other));
  });

  it("is zero at every lattice point, which is what makes it tile", () => {
    // Corner values are zero by construction, so a whole number of cells across is exactly
    // zero and the landscape has no seam at the origin. Compared with `toBeCloseTo` rather
    // than `toBe` because the arithmetic produces `-0` here and `Object.is(-0, 0)` is false
    // — a signed zero here means nothing and would fail the test for no reason.
    const noise = new PerlinNoise2D(9);
    for (let i = -3; i <= 3; i++) {
      for (let k = -3; k <= 3; k++) {
        expect(noise.noise(i, k)).toBeCloseTo(0, 12);
      }
    }
  });

  it("stays inside the amplitude bound it advertises", () => {
    // The bound is what `couldHoldSurface` skips chunks on, so it has to be a bound and not
    // an observation. This is the check that it is one.
    const noise = new PerlinNoise2D(20260901);
    let worst = 0;
    for (let i = 0; i < 4000; i++) {
      const x = i * 0.37;
      worst = Math.max(worst, Math.abs(noise.fbm(x, x * 0.61, 4)));
    }
    expect(worst).toBeLessThanOrEqual(FBM_AMPLITUDE_BOUND);
  });

  it("varies with the point, so the landscape is not a plateau", () => {
    const noise = new PerlinNoise2D(5);
    const samples = heightsOver((x, z) => noise.fbm(x, z, 4));
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread).toBeGreaterThan(0.2);
  });
});

describe("a terrain field", () => {
  it("is negative below its own surface and positive above it", () => {
    // The whole sign convention of the CSG, in one assertion: solid is negative.
    const terrain = terrainField(DEFAULT_TERRAIN);
    for (const [x, z] of [
      [0, 0],
      [1234, -987],
      [-5000, 5000],
    ]) {
      const surface = terrain.heightAt(x, z);
      expect(terrain(x, surface - 5, z)).toBeLessThan(0);
      expect(terrain(x, surface + 5, z)).toBeGreaterThan(0);
      // And the crossing is where it says it is.
      expect(terrain(x, surface, z)).toBeCloseTo(0, 9);
    }
  });

  it("varies across the world rather than repeating, out past the permutation table", () => {
    // `& 255` masks the lattice, so a point 256 cells out hashes the same corner as the
    // origin. Checked well past that, because a landscape that quietly repeats every 256
    // noise cells looks fine until someone walks a kilometre.
    //
    // The offsets are deliberately *not* whole multiples of the feature size: those land on
    // lattice points, where the noise is exactly zero, and two of them are equal for
    // reasons that have nothing to do with the world repeating.
    const terrain = terrainField(DEFAULT_TERRAIN);
    const here = terrain.heightAt(0.37, 0.71);
    const far = terrain.heightAt(
      TERRAIN_FEATURE * 900.37,
      TERRAIN_FEATURE * 640.71,
    );
    expect(Math.abs(here - far)).toBeGreaterThan(1);
  });

  it("keeps its reported height range, because the mesher's gate skips on it", () => {
    // `couldHoldSurface` answers from these two numbers alone. If the real surface ever
    // leaves them, the mesher skips a chunk that has surface in it and the world gets a
    // hole that nothing re-meshes.
    const terrain = terrainField(DEFAULT_TERRAIN);
    const heights = heightsOver((x, z) => terrain.heightAt(x, z));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(terrain.lowest);
    expect(Math.max(...heights)).toBeLessThanOrEqual(terrain.highest);
  });

  it("reports a Lipschitz factor at or below one", () => {
    // A factor above one claims surfaces are further away than they are, and the picker
    // steps through them. `Field` clamps it, which would hide the mistake rather than
    // report it — so the check belongs here, on the value the terrain actually produces.
    const terrain = terrainField(DEFAULT_TERRAIN);
    expect(terrain.lipschitz).toBeLessThan(1);
    expect(terrain.lipschitz).toBeGreaterThan(0);
  });

  it("has a Lipschitz factor that is actually a bound on its own gradient", () => {
    // The load-bearing test for the whole module. A factor that is too large is not a slow
    // picker, it is a picker that walks through the ground and reports no surface — and it
    // would do so on a slope the analytic argument happened to miss.
    //
    // Checked by measuring the gradient of `y - h` numerically over a wide area and
    // comparing against the bound the terrain advertises. The margin left is the
    // derivative's own step, not slack in the constant.
    const terrain = terrainField(DEFAULT_TERRAIN);
    const step = 1;
    let steepest = 0;
    for (let i = 0; i < 200; i++) {
      const x = -6000 + i * 61;
      const z = 900 - i * 37;
      const surface = terrain.heightAt(x, z);
      const dx = terrain(x + step, surface, z) - terrain(x - step, surface, z);
      const dz = terrain(x, surface, z + step) - terrain(x, surface, z - step);
      steepest = Math.max(steepest, Math.hypot(dx, dz) / (2 * step));
    }
    // `1 / steepest` is the largest factor that would still be safe here.
    expect(steepest * terrain.lipschitz).toBeLessThanOrEqual(1);
  });

  it("scales a steeper landscape to a smaller factor", () => {
    // The factor is derived, not decorative: doubling the vertical scale doubles the
    // gradient and must tighten the bound, or a taller landscape is picked through.
    const gentle = terrainField({ ...DEFAULT_TERRAIN, scale: 40 });
    const steep = terrainField({ ...DEFAULT_TERRAIN, scale: 200 });
    expect(steep.lipschitz).toBeLessThan(gentle.lipschitz);
  });

  it("treats a zero octave count as one rather than as a flat world at random", () => {
    const none = terrainField({ ...DEFAULT_TERRAIN, octaves: 0 });
    expect(none.lipschitz).toBeGreaterThan(0);
    expect(Number.isFinite(none.heightAt(10, 10))).toBe(true);
  });

  it("keeps its documented constants honest", () => {
    // If either of these is edited without the derivation in the file header being redone,
    // every bound above becomes a guess. Cheap to check, and the header is long enough that
    // it will not be re-read on its own.
    expect(NOISE_GRADIENT_BOUND).toBeGreaterThan(0);
    expect(FBM_AMPLITUDE_BOUND).toBeGreaterThan(0);
    expect(TERRAIN_FEATURE).toBeGreaterThan(0);
  });

  it("sums its fbm amplitudes exactly, for any octave count", () => {
    // `fbmAmplitudeSum` is what the gradient bound divides by, so if it drifted from the sum
    // `fbm` actually accumulates the bound would be quietly wrong by that drift. Checked
    // against the loop rather than against the closed form, because the loop is the thing
    // being bounded.
    for (const octaves of [1, 2, 3, 4, 6, 8, 12]) {
      let total = 0;
      let amplitude = 1;
      for (let i = 0; i < octaves; i++) {
        total += amplitude;
        amplitude *= 0.5;
      }
      expect(fbmAmplitudeSum(octaves), `octaves ${octaves}`).toBeCloseTo(
        total,
        12,
      );
    }
    // And the values the derivation quotes, because the header states them.
    expect(fbmAmplitudeSum(4)).toBe(1.875);
    expect(fbmAmplitudeSum(2)).toBe(1.5);
    expect(fbmAmplitudeSum(1)).toBe(1);
  });

  it("bounds the height gradient it declares, and reports how loosely", () => {
    // **The test that makes the bound a check rather than an assertion.** Every other
    // consumer of `lipschitz` and `perAxis` — the picker, the lattice gate, and any
    // distance-driven hierarchy — trusts the derivation, and a derivation is only as good as
    // its evidence. This finite-differences the field over a wide spread and asserts the
    // declared per-axis bound holds.
    //
    // **One direction is a sample, not a proof**, which is why the assertion is `<=` and not
    // `≈`: the test can fail if the bound is wrong, and cannot prove it right. The slack it
    // reports is the number that decides whether the bound is worth tightening.
    const perAxis = measuredPerAxis(terrainField(DEFAULT_TERRAIN));
    const declared = gradientPerAxisOf();
    expect(
      perAxis,
      `measured ${perAxis.toFixed(3)} against declared ${declared.toFixed(3)}`,
    ).toBeLessThanOrEqual(declared);

    // **The slack, asserted as a range rather than left to a comment.** It was 18.8× before
    // `fbmAmplitudeSum` was restored and about 10× after, so a regression that undoes the
    // normaliser roughly doubles this and fails here rather than quietly costing the picker
    // five times the steps and the gate 90% of its catch rate.
    const slack = declared / Math.max(perAxis, 1e-9);
    expect(slack, `slack ${slack.toFixed(1)}x`).toBeGreaterThan(2);
    expect(slack, `slack ${slack.toFixed(1)}x`).toBeLessThan(40);
  });
});

/**
 * The largest per-axis height gradient a field actually shows, by central differences.
 *
 * **A sample, not a bound**, and deliberately over a spread far wider than one chunk: the
 * gradient's peak is somewhere in the landscape and a test confined to one region would miss
 * it and pass by luck. The step is small enough that the finite difference is close to the
 * derivative and large enough that float noise does not dominate.
 */
const measuredPerAxis = (
  terrain: ReturnType<typeof terrainField>,
  step = 0.5,
): number => {
  let worst = 0;
  for (let i = 0; i < 120_000; i++) {
    const x = ((i * 7919) % 60_000) - 30_000;
    const z = ((i * 6271) % 60_000) - 30_000;
    const dx =
      (terrain.heightAt(x + step, z) - terrain.heightAt(x - step, z)) /
      (2 * step);
    const dz =
      (terrain.heightAt(x, z + step) - terrain.heightAt(x, z - step)) /
      (2 * step);
    const axis = Math.max(Math.abs(dx), Math.abs(dz));
    if (axis > worst) worst = axis;
  }
  return worst;
};

/**
 * The per-axis bound the field declares, rebuilt from the same expression `terrainField` uses.
 *
 * Duplicated rather than read off the field because `perAxis` is not exposed — it is a local,
 * and the alternative is exporting it purely so a test could read it back. **Every constant it
 * uses is imported rather than written out**, so the only thing being duplicated is the shape of
 * the derivation; if a feature size or a ridge strength changes, this follows it and the slack
 * assertion still means what it says.
 */
const gradientPerAxisOf = (): number => {
  const { octaves, scale } = DEFAULT_TERRAIN;
  const base = fbmAmplitudeSum(octaves);
  const mask = fbmAmplitudeSum(MOUNTAIN_MASK_OCTAVES);
  return (
    Math.abs(scale) *
    ((octaves * NOISE_GRADIENT_BOUND) / (base * TERRAIN_FEATURE) +
      RIDGE_STRENGTH *
        ((octaves * NOISE_GRADIENT_BOUND) / (base * MOUNTAIN_FEATURE) +
          (MOUNTAIN_MASK_OCTAVES * NOISE_GRADIENT_BOUND) /
            (mask * MOUNTAIN_MASK_FEATURE)))
  );
};

/** A chunk's world extent, the box the gate is asked about in practice. */
const BLOCK = 320;

describe("a terrain answering whether a box could hold a surface", () => {
  const terrain = terrainField(DEFAULT_TERRAIN);
  const box = (minY: number, maxY: number) => ({
    min: { x: -160, y: minY, z: -160 },
    max: { x: 160, y: maxY, z: 160 },
  });

  /**
   * The ground truth a gate answer is checked against: does any column of the box reach
   * into the box's own y span?
   *
   * **Sampled denser than the gate samples**, which is what makes it a check rather than a
   * restatement. `couldHoldSurface` takes 17 columns a side; this takes 65, so it can see
   * relief between the gate's own samples — which is precisely the relief the gate's margin
   * has to cover, and precisely what a missing margin would miss.
   */
  const holdsSurface = (bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  }): boolean => {
    const N = 65;
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < N; i++) {
      const x = bounds.min.x + ((bounds.max.x - bounds.min.x) * i) / (N - 1);
      for (let j = 0; j < N; j++) {
        const z = bounds.min.z + ((bounds.max.z - bounds.min.z) * j) / (N - 1);
        const y = terrain.heightAt(x, z);
        if (y < lowest) lowest = y;
        if (y > highest) highest = y;
      }
    }
    return !(highest < bounds.min.y || lowest > bounds.max.y);
  };

  /** One chunk's world extent, which is the box the gate is asked about in practice. */
  const chunkBox = (cx: number, cy: number, cz: number) => ({
    min: { x: cx * BLOCK, y: cy * BLOCK, z: cz * BLOCK },
    max: { x: (cx + 1) * BLOCK, y: (cy + 1) * BLOCK, z: (cz + 1) * BLOCK },
  });

  it("never rules out a box that does hold a surface", () => {
    // **The failure that cannot be taken back.** An answer of "no" deletes a chunk and
    // nothing re-meshes it, so the gate may be wrong in the expensive direction only.
    //
    // **One-directional on purpose.** The gate is *allowed* to answer "yes" for a box with
    // no surface in it — that is a missed saving and nothing else — and asserting otherwise
    // would be asserting that a conservative test is exactly sharp. So the truth is computed
    // and only the boxes that hold surface are required to survive.
    //
    // Checked against denser sampling: the truth takes 65 columns a side against the gate's
    // 17, so relief *between* the gate's own samples counts against it, which is exactly the
    // relief the margin has to cover and exactly what a missing margin would miss.
    let held = 0;
    let missed = 0;
    for (let i = 0; i < 400; i++) {
      const cx = ((i * 37) % 21) - 10;
      const cz = ((i * 53) % 21) - 10;
      const cy = ((i * 29) % 7) - 3;
      const bounds = chunkBox(cx, cy, cz);
      if (holdsSurface(bounds)) {
        held++;
        expect(
          terrain.couldHoldSurface(bounds),
          `cell ${cx},${cy},${cz} holds surface`,
        ).toBe(true);
      } else if (!terrain.couldHoldSurface(bounds)) {
        missed++;
      }
    }
    // Both halves, or the sweep proved nothing: the boxes must really straddle the surface,
    // and the gate must really be saving something.
    expect(held, "no box in the sweep held a surface").toBeGreaterThan(100);
    expect(missed, "the gate saved nothing").toBeGreaterThan(100);
  });

  it("catches most of the empty chunk layers, which is the whole point", () => {
    // A floor rather than an exactness claim, because the catch rate depends on the
    // landscape and the point is that it is not zero. Measured at 58 per cent over a
    // seven-layer window with this world's chunk width; the gate's own cost is 289
    // `heightAt` calls, 0.74 per cent of a chunk's 39,304-sample grid, so it wants to be
    // well past half. A regression to the global band alone would put this at zero.
    let empty = 0;
    let caught = 0;
    for (let cy = -3; cy <= 3; cy++) {
      for (let cx = -6; cx <= 6; cx++) {
        for (let cz = -6; cz <= 6; cz++) {
          const bounds = chunkBox(cx, cy, cz);
          if (holdsSurface(bounds)) continue;
          empty++;
          if (!terrain.couldHoldSurface(bounds)) caught++;
        }
      }
    }
    expect(empty, "the sweep found no empty chunks").toBeGreaterThan(100);
    expect(
      caught / empty,
      `caught ${caught} of ${empty} empty chunks`,
    ).toBeGreaterThan(0.4);
  });

  it("rules out a box entirely above the highest possible ground", () => {
    expect(
      terrain.couldHoldSurface(box(terrain.highest + 1, terrain.highest + 300)),
    ).toBe(false);
  });

  it("rules out a box entirely below the lowest possible ground", () => {
    // All solid: no sign change anywhere in it, so there is no surface to find.
    expect(
      terrain.couldHoldSurface(box(terrain.lowest - 300, terrain.lowest - 1)),
    ).toBe(false);
  });

  it("cannot rule out a box that straddles the range", () => {
    expect(
      terrain.couldHoldSurface(box(terrain.lowest - 1, terrain.highest + 1)),
    ).toBe(true);
  });

  it("cannot rule out a box that merely touches the global range", () => {
    // The boundary is inclusive on the safe side: a box whose lowest face is exactly at the
    // highest possible ground still contains that ground, and skipping it would drop a
    // surface on the seam.
    //
    // **A box wide enough that the sampled test cannot rule it out**, which is what makes
    // this the global band's boundary and nothing else. At 320 units the margin is a few
    // hundred and the local ground there is nowhere near the global maximum, so this same
    // box is now correctly ruled out by the second test — which is the whole point of it,
    // and the reason the global band's own boundary needs a box big enough to isolate it.
    const wide = (minY: number, maxY: number) => ({
      min: { x: -200000, y: minY, z: -200000 },
      max: { x: 200000, y: maxY, z: 200000 },
    });
    expect(
      terrain.couldHoldSurface(wide(terrain.highest, terrain.highest + 300)),
    ).toBe(true);
    expect(
      terrain.couldHoldSurface(wide(terrain.lowest - 300, terrain.lowest)),
    ).toBe(true);
    // And one unit further out is ruled out, so the inclusive edge is really there.
    expect(
      terrain.couldHoldSurface(
        wide(terrain.highest + 1, terrain.highest + 300),
      ),
    ).toBe(false);
  });

  it("rules out a chunk-sized box whose ground is nowhere near it", () => {
    // The sampled test stated as one case, because it is the case the global band got
    // wrong: `highest` is a world-wide maximum and this patch of landscape is nowhere near
    // it, so the band says "maybe" about a box that is 400 units of solid rock. Both halves
    // asserted — that the box is ruled out, and that the ground truth agrees it is empty —
    // because a test that checked only the first would pass just as happily if the gate had
    // simply decided to say no to everything.
    const bounds = box(terrain.highest, terrain.highest + 300);
    expect(holdsSurface(bounds)).toBe(false);
    expect(terrain.couldHoldSurface(bounds)).toBe(false);
  });
});
