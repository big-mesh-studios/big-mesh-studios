/**
 * Caves: tunnels through a landscape, carried in the base field rather than in the operation
 * list.
 *
 * ## What this is, and where it came from
 *
 * Ported from `apps/voxelscape/src/world/cave-fill.ts`, which does the same thing for a voxel
 * grid. The construction is the classic worm-noise idiom and it is unchanged: sample a 3D Perlin
 * field **twice**, at two positions uncorrelated with its lattice, and take the squared length of
 * the pair.
 *
 *     val = n₁(x,y,z)² + n₂(x+δ, y+δ, z+δ)²        carve where val < threshold
 *
 * Each `nᵢ` is a smooth field whose own zero set is a *sheet*. The pair's zero sets intersect in a
 * *curve*, so thresholding close to both zeroes carves curves and nothing else — which is why two
 * samples and a squared sum buy tunnels, and why one sample and a threshold buy blobs.
 *
 * There is no tube primitive, no random walk, and no per-cave object. A cave has no identity, no
 * length and no end; its extent is however far a connected component of the thresholded field
 * happens to run, which in voxelscape was measured at **over 400,000 world units — 3,125 chunks —
 * unbroken**. That is the property that makes this hard to integrate, and it is discussed under
 * "Why the base field" below.
 *
 * ## Why the base field, and what that costs
 *
 * The obvious integration is a `Subtract` operation. It is the wrong one, and the reason is that
 * worm noise is not a primitive: `packages/sdf` has no shape whose distance is this, and adding
 * one whose **bounding box is unbounded** would put the cave into the candidate list of every
 * chunk in the world — the degradation ADR 0006 already documents for a single thousand-unit
 * primitive, "236 of 240 operations in the candidate set".
 *
 * So the cave folds into the base field instead, as the second term of a maximum:
 *
 *     f(x,y,z) = max( y − height(x,z),  −cave(x,y,z) )
 *
 * which is a soft subtraction written out, and has the property that makes it safe to compose:
 * **a cave above ground cannot create geometry**, because there the first term is already
 * positive and a maximum cannot lower it. So `SurfaceExtent.couldHoldAir` does not need to know
 * caves exist.
 *
 * **The cost is the extent gate, and it is a real one.** A landscape's surface is a graph over
 * `xz`, so "does this box hold a surface" reduces to "does any column's height fall in its y
 * span" — which `terrain.ts` answers by sampling 17 columns a side and widening by a Lipschitz
 * margin. With caves the surface is *not* a graph: a cave is a hole in the rock, so a chunk deep
 * inside stone can hold a surface while every one of its column heights is above it. The column
 * test cannot see that, and answering "no" would delete the cave silently and permanently.
 *
 * The fix is to fall back to a **band** — the union of the landscape's own reach and the caves'
 * depth — which is sound and costs two comparisons but is as coarse as the band the lattice test
 * replaced. See `terrain.ts`'s `couldHoldSurface` for what is left of the sampled test.
 *
 * ## The returned value is a distance, not a boolean
 *
 * voxelscape asks `isCaveVoxel` and gets a yes or no, because a voxel is either stone or air.
 * A signed field cannot: the mesher reads signs, but the **picker steps by this value**, and a
 * value that is not a distance steps through surfaces.
 *
 * So the pair is converted. With `r = sqrt(n₁² + n₂²)` and `t = sqrt(threshold)`, the raw
 * quantity `r − t` is signed correctly and dimensionless. Its gradient in world units is bounded
 * by `√2 · G / feature`, where `G` is `NOISE_GRADIENT_BOUND_3D` — the `√2` from Cauchy–Schwarz on
 * the two terms. Multiplying by `feature / (√2 · G)` therefore makes the result **1-Lipschitz and
 * measured in world units at the same time**, which is the only scaling under which it can be
 * composed with a landscape's distances without the picker over-stepping.
 *
 * **1-Lipschitz where it is finite**, with the mouth penalty folded into the normalisation so
 * that it is exactly 1 rather than approximately. The test asserts it against finite differences.
 *
 * **Deliberately not Lipschitz at all outside its depth range**, where it answers `+Infinity`. That is not a hedge — the infinity is load-bearing, and
 * `max(ground, −Infinity)` is `ground` with no magnitude to have got wrong, where any finite
 * stand-in would have to exceed `|ground|` and so would need re-checking every time `FAR_DISTANCE`
 * changed. The cost is that the field is discontinuous at the ceiling and the floor, and the sign
 * genuinely flips across them: a cave that reaches the ceiling is truncated there and the rock
 * above it is solid. That flat top is a real surface with a real discontinuity, like the top of
 * any clipped shape, and `surfaceNets` will mesh it correctly because it reads signs.
 */

import { NOISE_GRADIENT_BOUND_3D, PerlinNoise3D } from "./perlin3";

/**
 * Keeps the cave seed stream distinct from the landscape's.
 *
 * XOR rather than addition because the landscape seed is a caller-supplied number this module
 * never inspects, and XOR is the one mixing step that cannot carry between two of them.
 */
export const CAVE_SEED_MIX = 0xca7e5;

/** One octave, and it is not a tuning knob: a second octave blurs the sheet intersection. */
const CAVE_OCTAVES = 1;

/**
 * The vertical frequency multiplier.
 *
 * **Two, and the reason caves are slabs rather than tubes.** The lattice is isotropic, so an
 * unmultiplied field produces caves of equal extent in all three axes; doubling the vertical
 * frequency halves their height, which is what a stratified rock layer actually looks like.
 * voxelscape chose 2.0 for the same reason and the value is carried over unchanged.
 */
const CAVE_VERTICAL_SCALE = 2;

/**
 * How far above the surface a cave may reach, as a fraction of the lattice size.
 *
 * voxelscape used 4 world units against a 200-unit lattice, so this is the same 2 per cent.
 * **Aesthetically necessary rather than sound** — a cave in the sky is harmless, as the module
 * header says — but a landscape pockmarked with cave mouths reads as broken rather than as
 * eroded, and nothing else suppresses them.
 */
const CAVE_CEILING = 1 / 50;

/**
 * The band around the surface over which cave mouths are suppressed, as a fraction of the
 * lattice size. voxelscape used 8 units against 200, so the same 4 per cent, and the penalty
 * ramps across the whole band rather than only below the surface.
 */
const CAVE_MOUTH_BAND = 2 / 50;

/**
 * The penalty at the top of the mouth band, in multiples of the threshold.
 *
 * voxelscape's numbers give ten: at 8 units above the surface-minus-four the penalty is 0.04
 * against a threshold of 0.004. Ten is enough to put the penalty well past the threshold over
 * most of the band, which is what makes a mouth rare rather than merely less common.
 */
const CAVE_MOUTH_PENALTY = 10;

/**
 * The offset between the two noise samples, in world units.
 *
 * Carried over from voxelscape, including that it is a bare number rather than a fraction of
 * anything. It has to be **uncorrelated with the lattice** — that is the whole job it does, since
 * it is what stops the two samples agreeing about where their sheets are — and 317 is odd and
 * not a multiple of the lattice sizes either application uses, which is the property wanted. It
 * is not expressed as a fraction because changing it changes the cave pattern globally and
 * nothing about it is worth parameterising until someone has a reason.
 */
const CAVE_SAMPLE_OFFSET = 317;

/** The caves a landscape is carved with. Plain data, so it crosses into workers by clone. */
export interface CaveParams {
  /**
   * The cave stream's own seed, or `undefined` to derive one from the landscape's.
   *
   * Separate from the landscape seed because a world should be able to change one without the
   * other, and because two worlds sharing a seed should still not share their caves.
   */
  readonly seed?: number;
  /** World units across one lattice cell — how far apart caves stand, and how thick they are. */
  readonly feature: number;
  /** How close to a sheet intersection a cave reaches. Larger is more, and thicker, caves. */
  readonly threshold: number;
  /**
   * The deepest a cave goes below the local surface, in world units.
   *
   * **This is the number that decides how much of the world the extent gate can still skip.**
   * With no floor the cave band reaches unboundedly down and the gate can prune nothing below the
   * landscape's own reach; with a floor of `f` it can prune everything more than `f` below the
   * lowest ground the landscape can produce. It is also the only reason the cave band has a
   * bottom edge at all, so it cannot be raised past where caves actually reach without deleting
   * them.
   */
  readonly floor: number;
}

/**
 * Caves at this world's scale, and starting values rather than settled ones.
 *
 * **Every constant is a fraction of `feature`,** because voxelscape's were fractions of its own
 * 200-unit lattice and reusing them as absolute numbers at a 900-unit lattice would have made
 * the caves nine times thicker and the mouths forty-five times higher. The one number that could
 * not be carried across is `threshold`, which sets thickness in proportion to `feature` and so
 * stays put.
 *
 * `floor` at half the lattice is a judgement, and it is the one to revisit first: it is
 * simultaneously how deep caves go and how much of the world the gate can skip, so a world that
 * wants shallower caves gets a more effective gate for free.
 */
export const DEFAULT_CAVES: CaveParams = {
  feature: 900,
  threshold: 0.02,
  floor: 450,
};

/**
 * The cave field for a set of parameters: negative inside a cave, positive outside, and a distance
 * in world units everywhere.
 *
 * ## Depth, not a surface height
 *
 * The caller passes **depth below the local surface** rather than a world altitude and the surface
 * height to compare it against, because "below the surface" is not a direction in world space once
 * the world is a sphere. A height field's answer is `heightAt(x,z) − y`; a planet's is
 * `radiusAt(n̂) − |p|`. Both are positive inside the rock and negative in the air, and both are what
 * the ceiling, the floor and the mouth band are measured against, so one signature serves both and
 * nothing in here has to know which world it is carving.
 *
 * **The noise still reads world coordinates**, which is why the vertical squash does not survive a
 * planet: `CAVE_VERTICAL_SCALE` stretches the lattice along a world axis, and on a sphere there is
 * no such axis — the caves come out isotropic there, which is blobbier and costs nothing to fix
 * later. Squashing them properly needs a local tangent frame, and a base field that took one would
 * be taking a direction the caller may not agree with.
 */
export const caveField = (
  params: CaveParams,
  noise: PerlinNoise3D,
): ((depth: number, x: number, y: number, z: number) => number) => {
  const { feature, threshold, floor } = params;
  const freq = 1 / feature;
  const vFreq = freq * CAVE_VERTICAL_SCALE;
  const offset = CAVE_SAMPLE_OFFSET;

  // The mouth penalty ramps from zero this far below the surface to `MOUTH_PENALTY · threshold`
  // at the ceiling, so its rate is set by the band rather than written as a per-unit constant —
  // voxelscape's `0.005` was `10 · 0.004 / 8` and stops meaning anything once the lattice moves.
  const band = feature * CAVE_MOUTH_BAND;
  const rise = feature * CAVE_CEILING;
  const fadeSlope = (CAVE_MOUTH_PENALTY * threshold) / (band + rise);

  // `sqrt(threshold)`, and the Lipschitz normalisation — which is **why the penalty is added to
  // the root rather than to the squared sum**, which is where voxelscape adds it.
  //
  // On `n₁² + n₂²`, the penalty's contribution to the derivative is `slope / (2·sqrt(squared))`,
  // which diverges on a cave's axis where both noises vanish — and a cave's axis is exactly where
  // the mouth suppression is trying to do its work. Measured, that version came out at Lipschitz
  // 1.41 against a claimed 1: the field was quietly over-reporting distance in a band around the
  // surface, which is the one place the picker is already taking its longest steps.
  //
  // Added to the root instead, the penalty contributes a constant `slope` per world unit, and the
  // noise contributes `√2·G / feature` per world unit. Dividing both out together is what makes
  // the result exactly 1-Lipschitz rather than approximately:
  //
  //     |∇cave| ≤ ( √2·G/feature + fadeSlope ) · feature/( √2·G + fadeSlope·feature ) = 1
  const root = Math.sqrt(threshold);
  const scale =
    feature / (NOISE_GRADIENT_BOUND_3D * Math.SQRT2 + fadeSlope * feature);

  return (depth, x, y, z): number => {
    // Above the ceiling there is no cave, and below the floor there is none either. Both are
    // sign-only shortcuts: returning a positive number is all a maximum needs to ignore this
    // term, so the expensive half is skipped without changing the answer.
    if (depth < -rise) return Number.POSITIVE_INFINITY;
    if (depth > floor) return Number.POSITIVE_INFINITY;

    const ax = x * freq;
    const ay = y * vFreq;
    const az = z * freq;
    const n1 = noise.fbm(ax, ay, az, CAVE_OCTAVES);
    const n2 = noise.fbm(
      (x + offset) * freq,
      (y + offset) * vFreq,
      (z + offset) * freq,
      CAVE_OCTAVES,
    );

    const r = Math.sqrt(n1 * n1 + n2 * n2) + fade(depth, band, fadeSlope);
    return (r - root) * scale;
  };
};

/**
 * The mouth penalty at a point, which is zero below the band and grows towards the ceiling.
 *
 * Written as one expression rather than branched, because the branch would be taken almost never
 * and the arithmetic is two multiplies either way. `depth` is positive below the surface, so the
 * ramp runs the other way from a world altitude and the sign is worth stating.
 */
const fade = (depth: number, band: number, rate: number): number => {
  const above = band / 2 - depth;
  return above > 0 ? above * rate : 0;
};

/** The noise a set of cave parameters needs, seeded so it cannot collide with the landscape's. */
export const caveNoise = (
  params: CaveParams,
  landscapeSeed: number,
): PerlinNoise3D =>
  new PerlinNoise3D((params.seed ?? landscapeSeed) ^ CAVE_SEED_MIX);

/** The highest a cave can reach, as a rise above the local surface. */
export const caveCeilingRise = (params: CaveParams): number =>
  params.feature * CAVE_CEILING;

/** The deepest a cave can reach, as a fall below the local surface. */
export const caveFloorDrop = (params: CaveParams): number => params.floor;
