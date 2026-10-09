import { describe, expect, it } from "vitest";

import { surfaceHeightAt } from "./surface-height";

/**
 * The surface query a place uses to find the ground, against a world it can be checked on.
 *
 * **A synthetic planet and a synthetic height field**, because the point of pulling this out of
 * `app.tsx` is that the thing that broke — a column traced through a sphere — can be tested
 * without a renderer, a mesh or a player. The bug it fixes was invisible for as long as this had
 * no test: every place built at `y ≈ 0` while the planet's surface was at `y ≈ 136000`, and the
 * place tests all stubbed `terrainHeight: () => 0`, which is the value the demos were wrong to
 * trust.
 */

/** A planet of radius `radius` centred on the origin: solid inside, air outside. */
const planet = (radius: number) => ({
  solidAt: (x: number, y: number, z: number): boolean =>
    Math.hypot(x, y, z) < radius,
  seaRadius: radius,
});

const EARTH = 136_000;

describe("the surface above a column", () => {
  it("is the radius of a planet, over its pole", () => {
    // The whole point: a place at the origin asks where the ground is and is told the surface,
    // not zero. This is the number the demos were building 136000 units below.
    const height = surfaceHeightAt(0, 0, planet(EARTH));
    expect(height).toBeCloseTo(EARTH, 3);
  });

  it("follows the sphere off the pole, because the vertical is not the radial", () => {
    // **Away from the pole the ground is genuinely lower**, and a query that always answered the
    // radius would be wrong for any place not sited on the axis. The vertical through `(x, 0)`
    // meets a sphere of radius `R` at `sqrt(R² - x²)`.
    for (const offset of [1000, 5000, 20_000]) {
      const height = surfaceHeightAt(offset, 0, planet(EARTH));
      expect(height, `at x = ${offset}`).toBeCloseTo(
        Math.sqrt(EARTH * EARTH - offset * offset),
        2,
      );
    }
  });

  it("lands on the crossing rather than a coarse probe near it", () => {
    // **The bisection, checked by its error and not by its agreement with itself.** The probes are
    // eight units apart, so a version that returned the first solid probe would be up to eight
    // units low — which is most of a doorway and is exactly the kind of error a place would show
    // as a foundation sunk into the ground.
    const exact = EARTH;
    const height = surfaceHeightAt(0, 0, planet(exact));
    expect(Math.abs(height - exact)).toBeLessThan(0.01);
  });

  it("gives a height field its own answer, without tracing", () => {
    // **Because a height field is the case that always worked.** Asking the field is cheaper than
    // tracing and is the same answer the field would give the physics; the trace exists only for
    // the world that has no such answer.
    let traced = 0;
    const height = surfaceHeightAt(0, 0, {
      seaRadius: EARTH,
      heightAt: () => -70,
      solidAt: () => {
        traced += 1;
        return false;
      },
    });
    expect(height).toBe(-70);
    expect(traced, "a height field must not be traced").toBe(0);
  });

  it("is zero when there is no ground down the column", () => {
    // **A place over open air builds in the air**, which is the same answer it got before there
    // was a trace and is better than refusing the whole place to load.
    const height = surfaceHeightAt(0, 0, {
      seaRadius: EARTH,
      solidAt: () => false,
    });
    expect(height).toBe(0);
  });

  it("is zero for a column that misses the planet entirely", () => {
    // **Past the horizon, where the vertical line never meets the sphere.** A place sited there
    // is sited in space, and "there is no ground" is the answer it can act on rather than a
    // height invented from the top of the search.
    const height = surfaceHeightAt(EARTH + 10_000, 0, planet(EARTH));
    expect(height).toBe(0);
  });
});
