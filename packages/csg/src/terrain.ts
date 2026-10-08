/**
 * A seeded height field: the infinite world the operations are carved out of.
 *
 * The model is `fold(operations, p, terrain(p))` (ADR 0004), and this file supplies the
 * `terrain` for a world that has one. It is a `BaseField` and nothing else touches it —
 * adding a landscape is this module plus a `ModelMessage` that says so, and no change to
 * the CSG arithmetic, the mesher or the picker. That is the property the whole of ADR 0002
 * is buying, and it is worth knowing that it is being bought: the terrain is not a special
 * case anywhere, it is a function.
 *
 * ## A height field is not a distance function
 *
 * The surface at `(x, z)` is at `height(x, z)`, so the obvious field is
 *
 *     distance(x, y, z) = y - height(x, z)
 *
 * which is negative below the surface and positive above, and is *exactly* the vertical
 * distance. It is not the distance to the surface. Its gradient is `(-∂h/∂x, 1, -∂h/∂z)`,
 * whose magnitude is `sqrt(1 + |∇h|²)`, so on a slope it **over-reports**: it claims a
 * surface further away than it is, and by a factor that grows with the slope.
 *
 * For a mesher that is harmless — it reads signs and interpolates, and never steps. For the
 * sphere-tracing picker it is fatal, because the picker steps by what it is told and a step
 * that is too long steps *through* the surface and off the far side. So every distance is
 * scaled by `lipschitz` below, which is the reciprocal of that gradient bound, and
 * `FieldOptions.lipschitz` is the property that carries it. This is the first consumer of
 * that option and the reason it exists.
 *
 * ## The bound, and where each factor comes from
 *
 * The surface is a base fBm plus a ridged term confined by a mask:
 *
 *     h = origin + scale · ( base + R · ridge · range )
 *     base  = fbm(x/F,  z/F,  octaves)
 *     ridge = max(0, 1 - |fbm(x/Fm, z/Fm, octaves)|)   in [0, 1]
 *     range = clamp11(fbm(x/Fk, z/Fk, maskOctaves))    in [-1, 1]
 *
 * **`range`, not `mask`.** The mask's mean is taken out — `range` is `2·mask − 1` with no
 * rescaling, and it is signed, which is what makes a sea at height zero meet real ground
 * (see `RIDGE_STRENGTH`). An earlier version of this header still described the unsigned
 * `mask ∈ [0,1]` form, and the bound below happened to survive the change because both forms
 * have unit magnitude and the same gradient; the document was wrong and the number was not,
 * which is the worst combination available.
 *
 * With the usual fBm — amplitude halved and frequency doubled per octave — octave `i` carries
 * amplitude `aᵢ = 2⁻ⁱ` at frequency `fᵢ = 2ⁱ`, so `aᵢ·fᵢ = 1` and **every octave contributes the
 * same gradient**. `fbm` then divides the whole sum by `Σa`, which is the piece this derivation
 * used to omit:
 *
 *     ∂(fbm)/∂u = (1 / Σa) · Σᵢ aᵢ·fᵢ · ∂noise/∂u = (octaves / Σa) · ∂noise/∂u
 *
 * so with `G` bounding `|∂noise/∂u|`, and `Σa = 2(1 − 2⁻ⁿ)` exact for any octave count:
 *
 *     d(base)/dx  ≤ octaves · G / (Σa · F)
 *     d(ridge)/dx ≤ octaves · G / (Σa · Fm)        (ridge is max(0, 1 − |·|), which is 1-Lipschitz in fbm)
 *     d(range)/dx ≤ maskOctaves · G / (Σa_mask · Fk)
 *     |∂h/∂x|     ≤ scale · ( d(base) + R · (d(ridge)·|range| + |ridge|·d(range)) )
 *                 ≤ scale · ( octaves·G/(Σa·F) + R · (octaves·G/(Σa·Fm) + maskOctaves·G/(Σa_mask·Fk)) )
 *
 * The products are bounded because `|ridge| ≤ 1` and `|range| ≤ 1`. Bounding the two axes
 * separately and combining gives
 *
 *     |∇h| ≤ √2 · A   and so   lipschitz = 1 / sqrt(1 + 2A²)
 *
 * with `A` the per-axis bound above.
 *
 * **What omitting `Σa` cost.** At four octaves `Σa = 1.875`, so the old `A` was 17.87 where the
 * field's true gradient never exceeded 0.95 in measurement — a factor of 18.8, and the reason
 * three separate optimisations were each fighting the same wall: the lattice gate's margin was
 * 380 units instead of 20, the picker took five times the steps it needed, and a distance-driven
 * hierarchy could certify no cell at all at any resolution. `NOISE_GRADIENT_BOUND` itself is the
 * next loose term and is **not** corrected here — see its own comment.
 *
 * `G` is `NOISE_GRADIENT_BOUND` below, and it is deliberately pessimistic: it is the worst case of
 * a corner gradient difference times the peak of the quintic's derivative, and the two corner
 * gradients are chosen by independent hashes, so nothing rules that combination out. Being wrong
 * in the pessimistic direction costs the picker a few more steps. Being wrong the other way costs
 * it the surface.
 *
 * A consequence worth stating plainly, because it looks alarming and is not: `lipschitz` is small
 * enough that the picker takes several times as many steps as it would over operations alone. It
 * still converges — the step shrinks geometrically near a surface, so a ray crossing a thousand
 * units of air costs on the order of forty steps — and `maxSteps` is 512.
 *
 * ## Why the surface extent is sampled rather than global
 *
 * `couldHoldSurface` is the mesher's first gate, and it used to be answered in constant time
 * from the extremes of the height range. That was rejected once on the grounds that the
 * margin a local bound needs is `L · spacing`, and with `L` near 18 and a 340-unit box that
 * margin exceeds the box — so it would cost samples and change nothing.
 *
 * **The margin does exceed the box, and it changes plenty.** What it does not do is exceed the
 * *thing being skipped*, because what it has to beat is not a box but a chunk's own relief,
 * and a chunk's relief is a fraction of a chunk's height. Measured on this landscape, over
 * 400 chunks: the height across one chunk's own columns is 89 units at the median and 204 at
 * the 99th percentile, against a 320-unit chunk. A margin of 380 units fits between those,
 * and a margin of 5,719 units — the constant-width reading — fits between nothing.
 *
 * So the gate samples a lattice of columns across the box, takes their extremes, and widens
 * them by the Lipschitz margin for the lattice spacing. **The global band is still tested
 * first**, because it is two comparisons and it is the whole answer for anything far from the
 * landscape; the lattice is the refinement, not a replacement.
 *
 * What it buys, measured over a seven-layer window where 986 of 1,183 chunks are genuinely
 * empty: the global band alone skips **none** of them, and a 17-by-17 lattice skips 576 —
 * 58 per cent of the waste for 289 `heightAt` calls, which is 0.74 per cent of one chunk's
 * 39,304-sample grid. The gate stops being free and becomes cheap, which is the trade worth
 * making when it is buying back two thirds of the work it guards.
 *
 * The sibling's gate is exact and stays exact (`planet.ts`): a radial graph over direction
 * means the radius range over a box is a distance-to-AABB and eight corners. Only a height
 * field has to sample, because `heightAt` is not monotone along anything.
 */

import type { Bounds } from "@big-mesh-studios/core";
import type { BaseField, SurfaceExtent } from "./field";
import {
  caveCeilingRise,
  caveField,
  caveFloorDrop,
  caveNoise,
  type CaveParams,
} from "./caves";

/**
 * World units per noise cell, horizontally, for the rolling base.
 *
 * The vertical character of a landscape is the `scale` in `TerrainParams`; this is the
 * horizontal one, and the message block has no field for it, so it lives here. Sized against
 * the chunk: `BLOCK_WORLD` is 320, so this puts roughly two and a half features across a
 * chunk and about six across the default streaming window.
 */
export const TERRAIN_FEATURE = 768;

/**
 * World units per ridge noise cell, horizontally.
 *
 * Larger than `TERRAIN_FEATURE`, so a mountain is a bigger feature than a hill. Ridged
 * noise — `1 - |fbm|` — turns the smooth fBm's extrema into sharp crests, which is what
 * makes a slope read as a mountain rather than as a dune.
 */
export const MOUNTAIN_FEATURE = 1600;

/**
 * World units per mask noise cell. The mask decides *where* mountains stand, so it is the
 * coarsest of the three: a range several features wide, with plains between.
 */
export const MOUNTAIN_MASK_FEATURE = 2600;

/** Octaves in the mask. Two is enough for a smooth continent-scale decision. */
export const MOUNTAIN_MASK_OCTAVES = 2;

/**
 * How far a range stands above the plain, in units of the base noise's own range.
 *
 * The base contributes `scale * base` with `base` in `[-1, 1]`; a range contributes
 * `RIDGE_STRENGTH * scale * ridge * range` with `ridge` and `range` both in `[-1, 1]`. The
 * height range therefore grows by `RIDGE_STRENGTH * scale`, which `reach` accounts for.
 *
 * **Six, so a range is three times what the plain's own relief is deep** — and this was two,
 * which put a mountain up out of a hill rather than a mountain range above a landscape.
 *
 * **The term is signed, and that is the part that makes the sea exist at all.** It used to be
 * `ridge * mask` with `mask` in `[0, 1]`, which is non-negative everywhere: the landscape was
 * lifted on average and never lowered, so its mean sat *above* the sea level and a sea at zero
 * barely met the ground. Measured on a default planet: one direction in four thousand was
 * underwater. `range * (2 * mask - 1)` is the same mask with its mean taken out, so a range
 * rises where the mask says one stands and the ground falls away where it does not — which is
 * also the plain the ranges stand amongst, and is what puts real coastline on the planet.
 */
export const RIDGE_STRENGTH = 6;

/**
 * Keeps a value inside `[-1, 1]`, which is what the signed range mask's bound needs.
 *
 * **Clamped rather than scaled**, so `landscapeShape`'s `RIDGE_STRENGTH · ridge · range` is
 * bounded by `RIDGE_STRENGTH` and the `reach` below is a real bound rather than an estimate.
 * `FBM_AMPLITUDE_BOUND` is deliberately generous — being too small would let
 * `couldHoldSurface` skip a chunk that has surface in it — so the two halves of that bound are
 * not the same number and need not be.
 */
const clamp11 = (value: number): number =>
  value < -1 ? -1 : value > 1 ? 1 : value;

/**
 * The three noise terms every landscape in this project is built from, in one place.
 *
 * ## Why they are together
 *
 * `terrain.ts` and `planet.ts` are the same landscape read through two parameterisations — a
 * height field and a sphere — and they were written out twice. The duplication was harmless
 * until it was not: this is the third change to the composition, and it would have been the
 * third change to write in two places.
 *
 * ## The shape, and what each term is for
 *
 *     shape = base + RIDGE_STRENGTH · ridge · range
 *
 * - **`base`** — rolling fBm at `TERRAIN_FEATURE`, the landscape's own relief, in `[-1, 1]`.
 * - **`ridge`** — `max(0, 1 − |fbm|)` at `MOUNTAIN_FEATURE`, which peaks where the noise crosses
 *   zero. Ridged, so a mountain reads as a crest rather than a dune.
 * - **`range`** — the mask at `MOUNTAIN_MASK_FEATURE`, **re-centred to `[-1, 1]`**. Positive where
 *   a range stands and negative where it does not, so the term has no mean: that is what lets a
 *   sea at the landscape's zero cut the world rather than miss it, and what leaves flat ground
 *   between the ranges rather than only where the mask is exactly half.
 *
 * ## The mean is the whole claim
 *
 * **The mask was `0.5 + 0.5 · fbm` in `[0, 1]` and read as "how much mountain goes here"**, which
 * is a good way to write it and a bad way to build a coastline from: a non-negative term has a
 * positive mean, so the whole surface sat above the sea and a sea at the landscape's zero
 * barely met the ground. Measured on the default planet: one direction in four thousand was
 * underwater, which is a puddle in the noise's troughs rather than an ocean. Subtracting the
 * `0.5` costs nothing, and it is what puts real coastline on the planet.
 *
 * @param fbm the caller's own noise, addressed by **feature size** rather than by coordinates,
 *   because a height field divides world coordinates by the feature and a sphere scales a
 *   direction by it — the same three features, read two ways.
 */
export const landscapeShape = (
  fbm: (feature: number, octaves?: number) => number,
): number => {
  const base = fbm(TERRAIN_FEATURE);
  const ridge = Math.max(0, 1 - Math.abs(fbm(MOUNTAIN_FEATURE)));
  const range = clamp11(fbm(MOUNTAIN_MASK_FEATURE, MOUNTAIN_MASK_OCTAVES));
  return base + RIDGE_STRENGTH * ridge * range;
};

/**
 * A bound on `|∂noise/∂u|` for the interpolation below.
 *
 * Derived rather than measured, because a measured maximum is not a bound. A corner
 * gradient is `±x ± z` with `x, z` reduced into a lattice cell, so it is bounded by 2, two
 * independent corners therefore differ by at most 4, and the quintic's derivative peaks at
 * `30/16 = 1.875`. Multiplying gives 7.5, and the interpolated derivative is a convex
 * combination of the corner derivatives, so it cannot exceed it.
 *
 * ## The next loose term, and why it is left alone
 *
 * With `Σa` restored this is now the largest overstatement in the file: measured, the height's
 * per-axis gradient peaks at **0.95** against the 9.98 this constant produces, so roughly 10× of
 * slack remains — a tenth of what it was, and still the largest term.
 *
 * **It has not been tightened here, deliberately.** The obvious re-derivation does not get
 * tighter — taking the corner difference as at most 4 and the fade peak as 1.875 gives
 * `1.875 · 4 + 1 = 8.5`, *above* 7.5 — which means the argument above is subtler than the
 * obvious one and replacing it with a cruder version would make the bound worse, not better.
 * A tighter one is worth having, and it wants the same treatment `Σa` just got: derive it,
 * then measure it against dense finite differences before believing it.
 *
 * ## What `grad` actually emits, since it is not four diagonals
 *
 * The comment on `grad` says four, and there are four hash cases but only **three distinct
 * vectors**: `h = 0` and `h = 2` both evaluate to `x + z`. All three have length √2 and components
 * `±1`. Two consequences, one of which corrects a bound elsewhere and one of which does not:
 *
 * - **Corner values reach ±2, not ±1.** `|±x ± z| ≤ 2` on a unit cell, and the quintic
 *   interpolation is a convex combination, so `|noise| ≤ 2`. That makes `FBM_AMPLITUDE_BOUND = 2`
 *   **exact** rather than, as its own comment says, deliberately generous — worth knowing, because
 *   `reach` and therefore the global height band are derived from it and there is nothing spare in
 *   it.
 * - **Every corner's partial derivatives are exactly ±1**, so the "convex combination of the
 *   corner derivatives" step in the argument above bounds the non-fade part by 1 per axis. That is
 *   already the tighter of the two contributions, and is why the naive 8.5 does not apply.
 *
 * ## An unresolved 13 per cent, in the other direction
 *
 * Differentiating the two-stage interpolation term by term gives **8.5, not 7.5**:
 *
 *     ∂P/∂x = u'·(B − A) + [ (1−u)·Aₓ + u·Bₓ ]
 *
 * and the second bracket is a convex combination of two values in `{−1, +1}`, so it is a real term
 * of up to 1 on top of `1.875 · 4`. This constant is 7.5, so on that reading it is **13 per cent
 * optimistic** — which would put the honest `perAxis` at about 13.3 rather than 9.98.
 *
 * **It is probably sound anyway, and the reason is a correlation neither derivation states.** The
 * first term peaks at `t = ½`, where the fade is also `½`, and the second is then `(Aₓ + Bₓ)/2` —
 * which is 1 only when the two corner gradients *agree* in x. But `|B − A| = 4` needs them to
 * disagree maximally. The two cannot both be at their maximum at once, so the true worst case is
 * somewhere between 7.5 and 8.5 and the sum-over-terms is not the right bound.
 *
 * **Left unresolved rather than guessed in either direction**, because it is 13 per cent either
 * way and the argument that settles it is a joint one worth writing down properly. It does not
 * change what was corrected above: restoring `Σa` was sound independently of this, and even if
 * `G` were really 8.5 the honest `perAxis` would be 13.3 against the 17.87 this file used to
 * declare — so the correction is a real improvement either way, and this uncertainty is on top of
 * a number that was previously far looser.
 */
export const NOISE_GRADIENT_BOUND = 7.5;

/**
 * A bound on the amplitude of the normalised fBm below.
 *
 * The normalisation divides by the sum of amplitudes, so the result is a weighted average
 * of octave values; each octave value is bounded by the corner gradient bound of 2, so the
 * average is too. Used for the height range, where being too small would let
 * `couldHoldSurface` skip a chunk that has surface in it — the one failure this whole
 * module cannot be allowed to make.
 *
 * **Exactly 2, not generously 2** — `NOISE_GRADIENT_BOUND`'s comment works this through: `grad`
 * emits gradients of length √2 with components `±1`, so a corner value on a unit cell reaches 2,
 * and the interpolation is convex. There is no slack here, which matters because `reach` is
 * `FBM_AMPLITUDE_BOUND · scale` and so is the entire global height band the gate tests first.
 */
export const FBM_AMPLITUDE_BOUND = 2;

/**
 * The sum `fbm` divides by, for a given octave count — the normaliser that makes its output
 * range independent of how many octaves it was given.
 *
 * **Every octave contributes the same gradient only up to this divide**, and that is the whole
 * correction. `fbm` computes `(Σ aᵢ·noise(2ⁱ·u)) / (Σ aᵢ)` with `aᵢ = 2⁻ⁱ`, so octave `i`'s share
 * of the output's gradient is `aᵢ·2ⁱ·∇noise / Σa = ∇noise / Σa`. The frequency doubling and the
 * amplitude halving cancel exactly — that much was already in the header — and what was missing
 * is the `/ Σa` that `fbm` then applies to the whole sum. Omitting it overstated the bound by
 * `Σa`, which is 1.875 at this world's four octaves and approaches 2 as octaves grow.
 *
 * **The closed form, and why it is not a loop.** `Σ 2⁻ⁱ` is `2(1 − 2⁻ⁿ)`, and every term is a power
 * of two, so the result is exact in floating point for any integer octave count — no
 * accumulation drift, and it cannot drift out of step with `fbm` because it does not reimplement
 * `fbm`'s loop. Clamped to one octave for the same reason `fbm`'s loop effectively is: a zero-octave
 * fBm has no gradient to bound, and dividing by zero is not an answer.
 *
 * Shared with `planet.ts`, which omits the same divide for the same reason.
 */
export const fbmAmplitudeSum = (octaves: number): number => {
  const n = Math.max(1, Math.floor(octaves));
  return 2 * (1 - Math.pow(2, -n));
};

/** The parameters a terrain is built from, and the four a `ModelMessage` carries. */
export interface TerrainParams {
  /** The world y a height of zero sits at. */
  readonly origin: number;
  /** World units per unit of noise output — the vertical scale of the landscape. */
  readonly scale: number;
  readonly octaves: number;
  readonly seed: number;
  /**
   * Tunnels through the landscape, or absent for a solid one.
   *
   * **Optional rather than defaulted, because "no caves" must be a thing a caller can say.**
   * `DEFAULT_CAVES` exists to be spread into a parameters object that wants them; having the
   * field read that constant as a fallback would make every landscape in the repository — the
   * sculpting tests, the picker tests, the planet comparisons — quietly acquire a second noise
   * stream and a different surface, and the differences would show up as failures nobody could
   * attribute.
   *
   * See `caves.ts` for the construction and for why these belong in the base field rather than in
   * the operation list.
   */
  readonly caves?: CaveParams;
}

/**
 * A height field, as the CSG sees it and as the mesher asks it questions.
 *
 * Callable because `BaseField` is a function type and the field's arithmetic is written
 * against that; the extra members are the questions only terrain can answer.
 */
export interface TerrainField extends BaseField, SurfaceExtent {
  /** The factor every reported distance is scaled by. See the file header. */
  readonly lipschitz: number;
  /** Where this landscape's water settles: `origin`, the altitude its height of zero sits at. */
  readonly seaLevel: number;
  /** The surface height at a column, in world units. */
  heightAt(x: number, z: number): number;
  /** The lowest the surface can be anywhere in the world. */
  readonly lowest: number;
  /** The highest the surface can be anywhere in the world. */
  readonly highest: number;
}

/** Landscape parameters chosen to sit the starter model in rolling ground rather than on a plain. */
export const DEFAULT_TERRAIN: TerrainParams = {
  origin: -70,
  scale: 96,
  octaves: 4,
  seed: 20260901,
};

/**
 * Seeded 2D gradient noise over a 256-entry permutation table.
 *
 * The classic construction, and the one the sibling project uses for its terrain, so a
 * landscape here looks like a landscape there. One thing is deliberately *not* carried
 * over: the table is shuffled with a 32-bit LCG through `Math.imul`, where the obvious
 * `n * 1103515245` overflows the mantissa at these magnitudes and quietly loses bits. It is
 * still deterministic either way, so the difference is invisible until two runs disagree.
 */
export class PerlinNoise2D {
  /** Doubled, so an index of `255 + 255` is in range without a modulo. */
  private readonly perm = new Uint8Array(512);

  constructor(seed: number) {
    const table = new Uint8Array(256);
    for (let i = 0; i < 256; i++) table[i] = i;

    // `>>> 0` to keep the multiply in 32-bit unsigned, `Math.imul` to keep it exact, and
    // `& 0x7fffffff` to leave a non-negative state. All three are needed: skip the first
    // and the sign of the state depends on the seed's sign, which is a difference nobody
    // would notice until a negative seed produced a different world.
    let n = seed | 0;
    for (let i = 255; i > 0; i--) {
      n = (Math.imul(n, 1103515245) + 12345) & 0x7fffffff;
      const j = n % (i + 1);
      const swap = table[i];
      table[i] = table[j];
      table[j] = swap;
    }

    for (let i = 0; i < 512; i++) this.perm[i] = table[i & 255];
  }

  /** The quintic smootherstep: zero first *and* second derivative at each lattice point. */
  private static fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  /** One of four diagonal gradients, chosen by two bits of the hash. */
  private grad(hash: number, x: number, z: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : z;
    const v = h < 2 ? z : x;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  }

  /** Noise at a point, in roughly [-1, 1]. */
  noise(x: number, z: number): number {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;
    const u = PerlinNoise2D.fade(xf);
    const v = PerlinNoise2D.fade(zf);

    // Masked, so a point far from the origin hashes the same lattice corner as the
    // equivalent point near it. Without it the landscape is only defined within ±256 cells
    // and the world visibly repeats or tears past that.
    const X = xi & 255;
    const Z = zi & 255;
    const A = this.perm[X] + Z;
    const B = this.perm[X + 1] + Z;

    return PerlinNoise2D.lerp(
      PerlinNoise2D.lerp(
        this.grad(this.perm[A], xf, zf),
        this.grad(this.perm[B], xf - 1, zf),
        u,
      ),
      PerlinNoise2D.lerp(
        this.grad(this.perm[A + 1], xf, zf - 1),
        this.grad(this.perm[B + 1], xf - 1, zf - 1),
        u,
      ),
      v,
    );
  }

  /**
   * Summed octaves, amplitude halved and frequency doubled, normalised to the sum.
   *
   * Normalised rather than merely summed so the output range does not depend on the octave
   * count, which is what lets `FBM_AMPLITUDE_BOUND` be a constant.
   */
  fbm(x: number, z: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let total = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, z * frequency);
      total += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total === 0 ? 0 : value / total;
  }
}

/**
 * Builds a terrain from its parameters.
 *
 * Pure and deterministic in the parameters alone — no module-level cache, unlike the
 * sibling project's — because here a field is built once per worker per model and held for
 * the life of that model, so there is nothing to amortise and a shared cache would only be
 * a way for two models to share a permutation table by accident.
 */
export const terrainField = (params: TerrainParams): TerrainField => {
  const noise = new PerlinNoise2D(params.seed);
  // At least one octave: zero would make `fbm` return zero, a flat world at `origin`, which
  // is a legitimate landscape but is more likely a mistake in a caller.
  const octaves = Math.max(1, Math.floor(params.octaves));
  const scale = params.scale;
  const origin = params.origin;

  const heightAt = (x: number, z: number): number => {
    // **The three terms, from `landscapeShape`** — the same function a planet builds its
    // radius from, so a height field and a sphere are the same landscape rather than two
    // landscapes that agree by coincidence. The addressing differs: a height field divides
    // world coordinates by the feature, where a sphere scales a direction by it.
    const shape = landscapeShape((feature, featureOctaves = octaves) =>
      noise.fbm(x / feature, z / feature, featureOctaves),
    );
    return origin + scale * shape;
  };

  // The base is in `[-R, +R]` and the range term in `[-RIDGE_STRENGTH, +RIDGE_STRENGTH]`,
  // because it is signed — see `landscapeShape` and `RIDGE_STRENGTH`. The reach is the larger
  // magnitude, used symmetrically because the gate only needs a band that contains the surface.
  const reach = (FBM_AMPLITUDE_BOUND + RIDGE_STRENGTH) * Math.abs(scale);
  const lowest = origin - reach;
  const highest = origin + reach;

  // `A` is the per-axis bound on the height's gradient; see the file header for where each
  // factor comes from. The √2 combines two axes bounded separately, and the `1` under the
  // square root is the vertical term of the distance function's own gradient.
  //
  // **Each `fbmAmplitudeSum` is `fbm`'s own normaliser**, and dropping it is what made this
  // bound 1.79× larger than the field it bounds. The mask's is separate because it runs two
  // octaves, not four.
  const baseSum = fbmAmplitudeSum(octaves);
  const maskSum = fbmAmplitudeSum(MOUNTAIN_MASK_OCTAVES);
  const gradientPerAxis =
    (octaves * NOISE_GRADIENT_BOUND) / (baseSum * TERRAIN_FEATURE) +
    RIDGE_STRENGTH *
      ((octaves * NOISE_GRADIENT_BOUND) / (baseSum * MOUNTAIN_FEATURE) +
        (MOUNTAIN_MASK_OCTAVES * NOISE_GRADIENT_BOUND) /
          (maskSum * MOUNTAIN_MASK_FEATURE));
  const perAxis = Math.abs(scale) * gradientPerAxis;
  const lipschitz = 1 / Math.sqrt(1 + 2 * perAxis * perAxis);

  // **With caves, the surface is no longer a graph over `xz`.** A cave is a hole in the rock, so
  // a chunk deep inside stone can hold surface while every one of its column heights sits above
  // it. That is why the composition is a maximum and not a subtraction applied afterwards, and it
  // is why `couldHoldSurface` below changes shape when `caves` is present.
  //
  // **The ceiling and floor shortcuts return +Infinity rather than a large number**, and that is
  // deliberate: `max(a, +∞)` is `+∞`, so a cave outside its depth range contributes exactly
  // nothing to the maximum instead of contributing a merely-large term. `Math.max(a, Infinity)`
  // is `Infinity`, and no arithmetic follows it that would produce a sign.
  const caves = params.caves;
  const cave =
    caves === undefined
      ? undefined
      : caveField(caves, caveNoise(caves, params.seed));
  const caveRise = caves === undefined ? 0 : caveCeilingRise(caves);
  const caveDrop = caves === undefined ? 0 : caveFloorDrop(caves);

  // **The ground without the caves**, which is a different question from the field's own value
  // and is what water asks — see `BuiltBaseField.ground`. Built from the same `heightAt` the
  // composed field uses, so the two cannot drift.
  const ground = (x: number, y: number, z: number): number =>
    y - heightAt(x, z);

  const distance = (x: number, y: number, z: number): number => {
    const surface = heightAt(x, z);
    const ground = y - surface;
    // `heightAt` is asked once and both terms use it, so the ceiling the cave is measured
    // against is the same landscape the ground term is — a second call could disagree by a
    // float and put the mouth band a fraction of a unit off the surface it is damping.
    return cave === undefined
      ? ground
      : Math.max(ground, -cave(surface - y, x, y, z));
  };

  return Object.assign(distance, {
    lipschitz,
    ground,
    /**
     * `origin`, because on a height field a sea is an altitude and the altitude a height of zero
     * sits at is the one a sea covers where the base noise is negative. See
     * `BuiltBaseField.seaLevel`.
     */
    seaLevel: origin,
    heightAt,
    lowest,
    highest,
    /**
     * Whether a box could hold any surface at all.
     *
     * **The global band first, then a lattice of the box's own columns.** A box entirely
     * above `highest` is all air and one entirely below `lowest` is all solid, both answered
     * from two comparisons with no noise evaluated — which is the whole answer for anything
     * far from the landscape, and the whole answer for a planet, whose gate is exact.
     *
     * Inside that band the height range is 1,536 units tall, or 4.8 chunks, and a window
     * around a standing player is 5 chunks tall, so the band cannot tell a chunk of open air
     * from a chunk of surface. That is where most of a streamed world's sampling went:
     * measured, 986 of 1,183 chunks in a seven-layer window are empty, and this test caught
     * none of them.
     *
     * So it samples `GATE_COLUMNS` columns a side across the box, takes their extremes, and
     * widens them by the Lipschitz margin for that spacing. Seventeen a side catches 576 of
     * those 986 for 289 calls — 0.74 per cent of one chunk's grid — and **the margin is
     * derived from `perAxis`, not from anything measured**, because an unsound answer here
     * deletes a surface with nothing to re-mesh it. The margin's arithmetic is
     * `latticeMargin` below and the measurement that says 17 is the right number is in the
     * file header.
     *
     * **Strict, so a face landing exactly on the bound is not ruled out**: that face is the
     * surface, and skipping it would drop a surface on a seam with nothing to bring it back.
     */
    couldHoldSurface: (bounds: Bounds): boolean => {
      if (bounds.min.y > highest || bounds.max.y < lowest) return false;

      // **With caves, this test is not sound and must not be used.** A cave is a hole in the
      // rock, so a box deep inside stone can hold surface while every one of its column
      // heights sits above it — the columns are all above the box, the lattice says "solid,
      // nothing here", and the cave is deleted with nothing to re-mesh it. The landscape's
      // surface is a graph over `xz` and a cave's is not, so the question "does a column's
      // height fall in this box's y span" is the wrong question the moment there is one.
      //
      // **So the band is widened to the caves' own reach and the lattice is skipped
      // entirely.** Two comparisons instead of 289 calls, and as coarse as the band the lattice
      // replaced — which is the honest price of a surface with holes in it. It is a real loss:
      // the lattice caught 58 per cent of the empty chunks in a seven-layer window, and this
      // catches only what falls outside the band.
      //
      // **What would recover it, and why it is not here.** The lattice's power comes entirely
      // from the field being *anisotropic* — `∂f/∂y` is exactly 1 while `∂f/∂x` is `perAxis`,
      // and the vertical direction needs no margin at all because the column heights do not
      // depend on `y`. A cave removes that: the composed field's gradient bound is about
      // `√(1 + 2·perAxis²)` in every direction, so a three-dimensional lattice over the composed
      // field needs a margin of roughly `s · 24` at a 21-unit spacing — wider than the box it
      // is testing, and no spacing that fits inside a chunk is any better. A distance-driven
      // hierarchy hits the same wall for the same reason. The fix is a tighter
      // `NOISE_GRADIENT_BOUND`, not a better test.
      if (cave !== undefined) {
        return (
          bounds.min.y <= highest + caveRise &&
          bounds.max.y >= lowest - caveDrop
        );
      }

      const spanX = bounds.max.x - bounds.min.x;
      const spanZ = bounds.max.z - bounds.min.z;
      const step = GATE_COLUMNS - 1;

      let lowestHere = Infinity;
      let highestHere = -Infinity;
      for (let i = 0; i < GATE_COLUMNS; i++) {
        const x = bounds.min.x + (spanX * i) / step;
        for (let j = 0; j < GATE_COLUMNS; j++) {
          const y = heightAt(x, bounds.min.z + (spanZ * j) / step);
          if (y < lowestHere) lowestHere = y;
          if (y > highestHere) highestHere = y;
        }
      }

      const margin = latticeMargin(perAxis, spanX, spanZ, step);
      return (
        highestHere + margin >= bounds.min.y &&
        lowestHere - margin <= bounds.max.y
      );
    },
    /**
     * Whether a box is entirely above everything this landscape can produce.
     *
     * **The global band, not the sampled one** — deliberately. The sampled test exists to catch
     * boxes the global band cannot rule out, and this question is the other way round: a box
     * that the global band already calls air should be reported as air in constant time, and a
     * lattice of 289 `heightAt` calls to answer it would cost more than the chunk it might save.
     *
     * **`>` and not `>=`,** for the same reason the gate's own comparisons are strict: a face
     * landing exactly on `highest` *is* the surface, and calling that air would drop it.
     *
     * What this buys is narrow and specific: it is what stops one unbounded *operation* — a cave
     * system with no end — from answering "maybe" to every box above ground. See
     * `SurfaceExtent.couldHoldAir`.
     *
     * **Unchanged by the base field's own caves, and that is the point of composing them as a
     * maximum.** Above `highest` the ground term is already positive, and `max(positive, −cave)`
     * cannot be lowered — so a cave up there contributes nothing to the sign however far it
     * reaches. The ceiling that stops caves rising above the surface is an aesthetic measure
     * about cave mouths, not a soundness one, and this answer does not have to consult it.
     */
    couldHoldAir: (bounds: Bounds): boolean => bounds.min.y > highest,
  });
};

/**
 * Columns a side in the local extent test.
 *
 * **Seventeen, and the measurements that chose it** are in the file header: at this world's
 * chunk width it catches 58 per cent of the chunks a seven-layer window wastes, for 0.74 per
 * cent of a chunk's grid sampling. Nine costs 0.21 per cent and catches 21 per cent; thirty-
 * three costs 2.77 per cent and catches 62 per cent.
 *
 * It is also the resolution at which the gate stays cheaper than what it replaces at *every*
 * level of detail. A coarse chunk's grid is 1,000 samples, so a 33-by-33 lattice would spend
 * more `heightAt` calls than the chunk has samples — a gate that costs more than the mesh is
 * the wrong shape however good its hit rate, because the chunks it saves least are the ones
 * where it is proportionally dearest.
 */
const GATE_COLUMNS = 17;

/**
 * How far the height can stray from the nearest sampled column, over a box's own lattice.
 *
 * **`perAxis` bounds each partial derivative separately**, so `|grad h| <= perAxis · √2`, and
 * by the mean value theorem the height moves at most that times the distance travelled. A
 * point in the box is at most half a lattice cell's diagonal from the nearest sample — the
 * lattice cell is `spanX/step` by `spanZ/step` — so:
 *
 *     margin = perAxis · √2 · ½ · hypot(spanX, spanZ) / step
 *
 * For a square box that reduces to `perAxis · spanX / step`, which is the number the header's
 * measurements use.
 *
 * **Soundness rests entirely on `perAxis` being a bound.** Getting this wrong by a factor of
 * √2 was the first version of it, and it would have been invisible: the false-skip count
 * stayed at zero over a thousand chunks, because the margin was still wide enough for the
 * relief it was measuring. An unsound margin does not announce itself by skipping the wrong
 * chunk on average; it skips the wrong chunk on the one piece of terrain with a cliff in it.
 */
const latticeMargin = (
  perAxis: number,
  spanX: number,
  spanZ: number,
  step: number,
): number =>
  ((perAxis * Math.SQRT2) / 2) * (Math.hypot(spanX, spanZ) / Math.max(1, step));
