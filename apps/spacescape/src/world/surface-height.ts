/**
 * "What is the surface above `(x, z)`" — answered for a height field and, for a planet, traced.
 *
 * ## Why this is not just `field.heightAt`
 *
 * **A height field has an answer and a planet does not**, and that asymmetry was a shipped bug.
 * `sculpt.terrainHeight` returns `undefined` on a sphere — `sculpt.ts` argues correctly that "the
 * surface above a column" is not a question a sphere answers — and the place host fell back to
 * zero. So every built-in place, which is authored against `getHeightAt(0, 0)`, built at `y ≈ 0`
 * while the planet's surface is at `y ≈ 136000`: a house at the planet's core, a hundred and
 * thirty-five thousand units inside the ground, invisible to a player standing on the surface.
 *
 * **So a planet is traced.** Straight down the vertical through `(x, z)` from above the surface to
 * the first solid point, then bisected to the crossing. That is exactly the question
 * `Game.spawnOnTheSurface` asks along the local up, written for a column because that is the shape
 * a script's `getHeightAt(x, z)` has — and near the pole, where the world's own spawn is, the
 * vertical and the radial are the same direction to within a rounding error.
 *
 * ## What this is *for*
 *
 * **A place that wants to build on the ground can ask where it is.** `getHeightAt(x, z)` in a
 * script goes through the host to here, so an author can put a bridge on the planet, scatter a row
 * of lanterns along it, or site a house on the surface — none of which was possible while the
 * answer was a constant zero. A place that would rather not care can ignore it entirely and build
 * in the air, which is what a demo with no ground in mind does.
 *
 * ## The cost is fixed and paid once per call
 *
 * `reach / step` probes to find the layer, then twenty-four more to find the crossing. It is
 * called at a place's load and not per frame, so the number that matters is that it is bounded
 * rather than that it is small.
 */

/** Everything the query needs from the world, so the trace is testable without a planet. */
export interface SurfaceHeightOptions {
  /** Whether the world is solid at a point. The one fact the trace is made of. */
  readonly solidAt: (x: number, y: number, z: number) => boolean;
  /**
   * The radius the surface is near, which the search brackets.
   *
   * **A radius rather than a bounds**, because the two worlds answer differently: a planet's
   * surface is a distance from its centre and a height field's is a height. The caller knows which
   * it has — `GAME_SEA` for the planet, and for a height field this is never reached.
   */
  readonly seaRadius: number;
  /** The height field's own answer, when the world has one. Used in preference to the trace. */
  readonly heightAt?: ((x: number, z: number) => number) | undefined;
  /** How far either side of `seaRadius` to look for the surface. */
  readonly reach?: number;
}

/** How far either side of the sea radius to search, in world units. */
const DEFAULT_REACH = 2000;
/** How far apart the coarse probes are. */
const STEP = 8;
/** How many bisections to take. Twenty-four is exact to well under a unit over a 2000-unit span. */
const REFINEMENTS = 24;

/**
 * The height of the surface above `(x, z)`, or zero when the column is empty.
 *
 * **Zero for an empty column rather than a throw**, because that is what a place author with no
 * ground under them should get: the same answer as before, and one that builds in the air rather
 * than one that refuses the whole place to load.
 */
export const surfaceHeightAt = (
  x: number,
  z: number,
  options: SurfaceHeightOptions,
): number => {
  const fromField = options.heightAt?.(x, z);
  if (fromField !== undefined) return fromField;

  const { solidAt, seaRadius } = options;
  const reach = options.reach ?? DEFAULT_REACH;
  const solid = (y: number): boolean => solidAt(x, y, z);

  let found: number | undefined;
  for (let y = seaRadius + reach; y >= seaRadius - reach; y -= STEP) {
    if (solid(y)) {
      found = y;
      break;
    }
  }
  // Nothing solid down that column: no ground to stand on, which is the honest answer for a
  // column through open air and the same zero a place got before there was a trace at all.
  if (found === undefined) return 0;

  // **`low` is solid and `high` is air**, and the two close on the crossing from opposite sides.
  let low: number = found;
  let high: number = found + STEP;
  for (let i = 0; i < REFINEMENTS; i += 1) {
    const mid: number = (low + high) / 2;
    if (solid(mid)) low = mid;
    else high = mid;
  }
  return low;
};
