/**
 * The broad pass: skipping blocks of a sample grid that provably hold no surface.
 *
 * A cell with eight corners of one sign holds no triangle, and both meshers already know
 * that. Neither can know anything wider, because by the time a cell is being read its own
 * eight samples are already in hand — the whole of `grid³` was sampled first.
 *
 * **The value can say more than that.** A signed distance function never *over*-reports: a
 * sample reading `v` is at least `|v|` from the surface. Every point of a block is within half
 * that block's diagonal of its nearest corner, so a block whose corners all read further out than
 * half a diagonal holds no surface anywhere inside it and needs no field evaluation at all.
 *
 * ## The proof, in three lines
 *
 * If the surface passes through any point `p` of a block, then for the corner `c` nearest to it:
 *
 *     |f(c)|  ≤  dist(c, surface)  ≤  dist(c, p)  ≤  half the diagonal
 *
 * — the first step because a distance function never over-reports, the second because `p` is on the
 * surface, the third because the worst case is the block's centre, exactly halfway along all three
 * edges. A block whose every corner clears half a diagonal therefore cannot contain the surface, and
 * the reach is that exact bound rather than the full diagonal, which is safe and culls half as much
 * again.
 *
 * ## It is worth having, because sampling is most of a rebuild
 *
 * Both meshers sample the field once into a buffer and then read only that buffer, and both spend
 * the overwhelming majority of their time doing it. Measured at 1/8 and 1/16 of a unit over four
 * models — a figure, a diorama, a slab with a sphere carved out of it and a soft-blended pair of
 * primitives — blocks dropped in 69 to 97 per cent of cases:
 *
 *                     grid   declined     broad
 *     figure           51     165 ms      45 ms   3.6x
 *     figure           98    1149 ms     210 ms   5.5x
 *     diorama          75     247 ms      26 ms   9.6x
 *     diorama          98     529 ms      50 ms  10.7x
 *     carved sphere    61      95 ms      37 ms   2.6x
 *     carved sphere    98     378 ms     113 ms   3.4x
 *
 * **Culling cells alone would have been worth between one and eleven per cent of that**, which is
 * the number that decided where the pass had to go: the block has to be culled before the sampling,
 * not after it.
 *
 * ## Why it lives here rather than in either mesher
 *
 * **Because it is not either mesher's.** The proof is about a distance function and a cube, and
 * both algorithms consume the same `grid³` of samples in the same way — which is what makes the
 * comparison above mean something: it was measured on marching cubes, but what it measures is the
 * sampling, and `surfaceNets` samples identically. On this repository's own terrain it drops the
 * same share of the grid — 85 per cent at a 32-sample chunk, against marching cubes' 84 — and
 * takes the chunk mesher from 76.9 ms to 41.6. The tables here are marching cubes' because that
 * is where they were taken; the landscape figures are in `surface-nets.ts`, where they were.
 */

import { MAX_SOFTNESS } from "@big-mesh-studios/core";

/**
 * How many samples a block of the broad pass spans, on each axis.
 *
 * **Four is where two costs cross, and both are real.** A smaller block is a *better* test — it
 * rules out less ground, so it drops more — but a dearer one, because the lattice the test reads
 * has one point in `step³`, which is an eighth of the grid at two and a sixty-fourth at four. The
 * measurement below is the whole of the argument for the number rather than taste: rebuilds of a
 * figure, a diorama, a slab with a sphere carved out of it and a soft-blended pair of primitives,
 * at two voxel sizes each, timed with the pass on and off.
 *
 *     block size   2      3      4      6      8
 *     figure     3.97x  3.61x  3.82x  2.87x  2.24x
 *     sparse     4.72x  9.22x 10.71x 10.21x  7.50x
 *     carved     2.77x  3.08x  2.55x  2.32x  1.86x
 *     soft       3.31x  5.41x  4.67x  3.48x  2.65x
 *
 * Four is the best or within noise of the best in six of the eight cases and is never beaten by
 * much. **Two loses hardest on the sparse model, which is the case the pass exists for**: small
 * blocks cannot find it, because each one demands the whole lattice for the little it rules out.
 * Eight is the shape of a model that has stopped filling its own bounding box.
 *
 * **Not a power of two, and not required to be.** A region is `samples + 2` per axis and that is
 * rarely a multiple of anything, so the blocks along the high edge are short — which is what
 * `broadPassBlockExtent` is for.
 */
export const BROAD_PASS_UNIT = 4;

/**
 * How far every corner of a block must read beyond it for the block to be provably empty, from
 * the three spans the block actually covers.
 *
 * **Three extents rather than one side, because a block at the high edge is short on every axis
 * at once and differently on each.** A region is `samples + 2` per axis, which is rarely a
 * multiple of four, so the last block along each axis is pulled in to the grid and those three
 * remainders are generally three different numbers. Reading one side off one axis and using it
 * for all three charges a block that is full on two and short on the third for a reach covering
 * only the third; `marching-cubes.test.ts` catches that as a sphere whose surface is shaven off
 * where its region ends.
 *
 * **Spans and not a sample size, because a region's axes need not share one.** Marching cubes'
 * regions are cubic and read one number; `surfaceNets` also takes per-axis sample *lanes* for a
 * region whose spacing is not even, and the span of a block on such a lane is the difference
 * between the two positions it covers rather than a count times a step.
 *
 * **`blend` added, because that is the direction it has to move.** A smooth minimum takes a dent
 * of up to `softness` out of the field, so the value under-reads and the surface may be `blend`
 * closer than the number says. Adding it makes the test stricter.
 */
export const broadPassReachAcross = (
  spanX: number,
  spanY: number,
  spanZ: number,
  blend: number,
): number =>
  0.5 * Math.sqrt(spanX * spanX + spanY * spanY + spanZ * spanZ) + blend;

/**
 * How far every corner of a block must read beyond it, from the block's sides in samples and the
 * region's own spacing. `broadPassReachAcross` for a cubic region on an even grid, which is every
 * marching cubes call.
 */
export const broadPassReach = (
  sideX: number,
  sideY: number,
  sideZ: number,
  sampleSize: number,
  blend: number,
): number =>
  broadPassReachAcross(
    sideX * sampleSize,
    sideY * sampleSize,
    sideZ * sampleSize,
    blend,
  );

/**
 * The widest a blend may be for the broad pass to run at all, and the de-op above it.
 *
 * **`MAX_SOFTNESS` rather than a number chosen here**, because it is the same bound the candidate
 * cache and the operation padding are already sized by (`CANDIDATE_MARGIN`, `shapePadding`). A
 * model carrying a blend wider than that is one both applications have already refused to produce,
 * and a mesher declining to trust it is a third place saying the same thing rather than the first
 * place to find out.
 *
 * **`smoothMin`'s deepest dent is `k / 4` and `k` is `softness · SOFTNESS_REACH`, which is why the
 * bound is a quarter of a unit at most.** Past that the dent is no longer a rounding concern
 * against a block's half-diagonal — at the finest budget this repository offers, a block of four
 * clears a corner by about a twentieth of a world unit — and a margin wide enough to cover it
 * would stop the test from ever succeeding.
 */
export const BROAD_PASS_MAX_SOFTNESS = MAX_SOFTNESS;

/** How many blocks a grid of this many samples a side has along each axis. */
export const broadPassBlocks = (grid: number): number =>
  Math.ceil(grid / BROAD_PASS_UNIT);

/**
 * How far a block reaches along one axis, in samples.
 *
 * **Measured from `grid - 1`, and this is the pair that has to stay together.** What the cull has
 * to rule out is a surface among the block's *cells*, and the last cell ends at the grid's last
 * sample rather than one past it — so the extent is measured from there and the far corner is
 * pulled in to it. Pulling the corner in while measuring the extent from the grid's edge is the
 * unsound pair; measuring it from where the corner was pulled to is the sound one, and is
 * `grid - 1 - at`, not `grid - at`.
 *
 * **Never below one**, which is what makes the far corner an index: `at` is a block's low corner
 * and `(blocks - 1) · step < grid`, so `grid - 1 - at ≥ 0` is loose but `≥ 0` is not true, and a
 * zero would put the block's two corners on one point and read one value twice.
 */
export const broadPassBlockExtent = (at: number, grid: number): number => {
  const reach = Math.min(BROAD_PASS_UNIT, grid - 1 - at);
  return reach < 1 ? 1 : reach;
};

/**
 * The next coordinate the broad pass's lattice visits, given where it is now.
 *
 * **Steps by `step` until one more step would leave the grid, and then visits the last index.**
 * A region is `samples + 2` per axis and is rarely a multiple of four, so without that last
 * index the block at the high edge would read a corner the lattice never sampled.
 *
 * **And steps past the end once it is there, which is the whole of what this function is.**
 * `grid - 1` is its own fixed point — one more step from the last-but-one index lands on it, and
 * from `grid - 1` the "one more step would leave the grid" branch says so again — so a caller
 * that only ever asked for the next coordinate would spin on it forever. Returning `grid` from
 * `grid - 1` is what lets the loop's own `at < grid` condition end it, and it is the second half
 * of the sentence rather than a detail of it: **a function whose result is used as a loop
 * increment has to know where the loop stops**, and this one is the loop.
 */
export const nextBroadPlane = (at: number, grid: number): number =>
  at >= grid - 1
    ? grid
    : at + BROAD_PASS_UNIT < grid
      ? at + BROAD_PASS_UNIT
      : grid - 1;

/**
 * Whether the pass runs at all for a given blend, and whether the grid is worth dividing.
 *
 * **A predicate rather than a block of arithmetic, because a mesher's decline and its run have to
 * be the same code.** Declining must leave `blockEmpty` all zeros, so the lattice runs and every
 * block is evaluated, and the only difference between the two paths is a flag read in one loop.
 * That is the only way a slow path stays the same code as a fast one.
 *
 * **Absent means "I do not know what this field is made of", and the answer is the slow one.** A
 * broad pass that believed a value it should not have would drop blocks holding real geometry, and
 * nothing downstream re-meshes a region this function has already answered for.
 *
 * **A grid no larger than one block has nothing to divide**, and a single block spanning it is
 * dropped only when the whole region is further from the surface than its own reach — which is a
 * true answer, and not worth a special case to go and find out.
 */
export const broadPassRuns = (
  blend: number | undefined,
  gridX: number,
  gridY: number,
  gridZ: number,
): blend is number =>
  blend !== undefined &&
  blend >= 0 &&
  blend <= BROAD_PASS_MAX_SOFTNESS &&
  gridX > BROAD_PASS_UNIT &&
  gridY > BROAD_PASS_UNIT &&
  gridZ > BROAD_PASS_UNIT;
