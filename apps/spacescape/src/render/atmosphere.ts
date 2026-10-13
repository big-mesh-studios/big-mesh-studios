/**
 * The atmosphere as a spherical shell, and the column of it between two points.
 *
 * ## Why this exists next to `fog.ts`
 *
 * `Fog` was a function of *distance from the eye* with a height term bolted on, and that shape cannot
 * answer the question the planet asks. Hiding the streamed chunks' 1280-unit window needs a fog
 * thick enough to swallow everything past it, and the same thickness swallows the whole planet when
 * the player climbs — which is the bug this module exists to make impossible. The two jobs are
 * different jobs: a *near-field* fog that closes the window, and an *atmosphere* whose column depends
 * on where the ray goes and how much air it passes through.
 *
 * So this is the second one, stated once and shared. `fog.ts` uses the column to place the air over
 * a surface; the sky uses the same idea for the rim of the planet seen from orbit.
 *
 * ## The shell
 *
 * Air is the spherical shell `radius <= |p| <= radius + ATMOSPHERE_HEIGHT`, with a density that falls
 * off exponentially with height at `ATMOSPHERE_SCALE_HEIGHT`. That is the only model here: no
 * Rayleigh, no Mie, no sun angle. What it buys is that a **downward** ray from orbit passes through a
 * short, thin column and sees the ground, while a **grazing** ray at the limb passes through the same
 * density over a much longer chord and glows. Distance alone cannot tell those two apart; the shell
 * can.
 *
 * ## Why the shader takes two samples and the tests take sixty-four
 *
 * The column is `∫ exp(-h(t)/H) dt` along the eye→fragment segment, clipped to the shell. The exact
 * integral is not worth a loop in the shader, so the shader clamps the segment to the shell and takes
 * a **two-point Gauss-Legendre quadrature** of the density across it. Two points and not one is not a
 * refinement: a height profile that bends at the closest approach — which is every grazing ray — has
 * its density peak between the midpoint and the shell, and a single midpoint sample read the limb up
 * to fifty per cent low. Two samples pull the worst error over the rays that matter to a few per cent
 * for one more `exp`. `airMassShell` is that same rule, host-side, and `airMassReference` is a
 * sixty-four sample integral of the same law. A test asserts the two agree over the rays a player
 * actually looks along, which is the only way to know the cheap one is close without a GPU.
 */

import type { Node } from "@random-mesh/rmsl";
import { abs, exp, float, max, min, select, sqrt } from "@random-mesh/rmsl";

import type { Vec3 } from "@big-mesh-studios/core";
import { DEFAULT_PLANET } from "@big-mesh-studios/csg";

/**
 * Nominal world radius of the planet, so the shell has a size before a world supplies one.
 *
 * **Read from the planet's own field rather than repeated**, because a second radius that can
 * disagree with `DEFAULT_PLANET.radius` is a sky and an ocean built against a different world than
 * the terrain. The render layer is downstream of the field, so the field is the source.
 */
export const DEFAULT_PLANET_RADIUS = DEFAULT_PLANET.radius;

/**
 * How fast the air thins with height, in world units.
 *
 * The scale height of an atmosphere. Reached from `fog.ts`, which called it `FOG_SCALE_HEIGHT`: the
 * same air the near-field fog samples and the column integrates has to thin at the same rate or the
 * two disagree at the altitude they overlap.
 */
export const ATMOSPHERE_SCALE_HEIGHT = 1200;

/**
 * How far the shell reaches above the sea, in world units.
 *
 * Four scale heights. At that height the density is `e^-4` — under two per cent — which is past the
 * point the eye can tell from vacuum, and it puts the top well above the 900-unit altitude where the
 * globe takes over, so the limb has somewhere to fade into.
 */
export const ATMOSPHERE_HEIGHT = 4 * ATMOSPHERE_SCALE_HEIGHT;

/** The shell's outer radius for the default planet. A world with another radius derives its own. */
export const ATMOSPHERE_RADIUS = DEFAULT_PLANET_RADIUS + ATMOSPHERE_HEIGHT;

/**
 * How much one unit of the column dims what is behind it.
 *
 * **Calibrated for seeing the planet, not for hiding the chunk window** — the window is the
 * near-field fog's job. Measured against the two ends a player cares about: from the 900-unit
 * altitude the globe takes over at, straight down is about 17% haze (the ground reads clearly), and
 * along the limb, where the same air is crossed over a much longer chord, is about 85% (the rim
 * glows). The number is what puts those two where they are; raising it toward the window fog's own
 * rate would swallow the planet again, which is the whole bug this module exists to end.
 */
export const ATMOSPHERE_EXTINCTION = 0.0003;

/** The span of a segment inside a world's air, as fractions of the segment. */
export interface ShellSpan {
  /** Where the segment enters the air, in `0..1` along it. */
  readonly lo: number;
  /** Where it leaves the air, in `0..1`. `lo < hi` whenever this is returned. */
  readonly hi: number;
}

/**
 * Where a segment spends its time in a world's air, or `null` for a segment that misses it.
 *
 * **One function and two solves, because the question is the same on both worlds.** A sphere's air
 * is a shell and a plane's is a slab, so what differs is the surface the segment is clipped to —
 * and the height the density is read at. Both of those differences are one line apiece, and
 * writing them once here rather than at each of the three places that need them is what keeps the
 * host and the shader mirrors agreeing about something that has two answers.
 *
 * ## The shell solve
 *
 * The half-`b` quadratic: for `p(t) = eye + t·d`, `|p|² = a·t² + 2b·t + c`, so the roots are
 * `(-b ± √(b² - ac)) / a`. Clamping the discriminant before the root keeps a miss from producing a
 * `NaN` that would survive the `null` check and poison arithmetic upstream — the same reason the
 * shader clamps before its `sqrt`.
 *
 * ## The slab solve
 *
 * `p(t).y` is linear in `t`, so the two crossings are `(level - eye.y) / d.y` and there is no
 * quadratic at all. Three cases the sphere's solve never has to state, because a plane can be
 * entered from a direction a sphere cannot be:
 *
 * - **`d.y == 0`** — a level ray. It is in the air for all of it or none of it, and which is a
 *   question about the eye alone.
 * - **`d.y < 0` from above** — the segment starts in the air and ends below the sea, so the span
 *   is the crossing and no more.
 * - **`d.y > 0` from below** — it starts below the sea and climbs; it enters at the sea and leaves
 *   at the shell's top, and never touches the ground.
 */
export const airSpan = (
  eye: Vec3,
  point: Vec3,
  radius: number,
  atmosphereHeight: number,
  spherical: boolean,
): ShellSpan | null => {
  const dx = point.x - eye.x;
  const dy = point.y - eye.y;
  const dz = point.z - eye.z;
  const a = dx * dx + dy * dy + dz * dz;
  if (a <= 0) return null;

  if (!spherical) {
    const top = radius + atmosphereHeight;
    if (dy === 0) {
      // **A level ray, and the answer depends only on the eye.** Standing on the ground and
      // looking at the horizon is the ray this case exists for: it must gather the whole
      // distance it travels, or the horizon on a flat world has no air in front of it at all.
      if (eye.y < radius || eye.y > top) return null;
      return { lo: 0, hi: 1 };
    }
    const atSea = (radius - eye.y) / dy;
    const atTop = (top - eye.y) / dy;
    const lo = Math.max(0, Math.min(atSea, atTop));
    const hi = Math.min(1, Math.max(atSea, atTop));
    if (hi <= lo) return null;
    return { lo, hi };
  }

  const b = eye.x * dx + eye.y * dy + eye.z * dz;
  const outer = radius + atmosphereHeight;
  const c = eye.x * eye.x + eye.y * eye.y + eye.z * eye.z - outer * outer;
  const disc = b * b - a * c;
  if (disc <= 0) return null;
  const root = Math.sqrt(disc);
  const lo = Math.max(0, (-b - root) / a);
  const hi = Math.min(1, (-b + root) / a);
  if (hi <= lo) return null;
  return { lo, hi };
};

/**
 * The height of a point above the sea, clamped to zero inside the body.
 *
 * **`|p| - radius` on a sphere and `p.y - radius` on a plane**, and the second is not an
 * approximation of the first — they are the same question ("how far is this from the sea") asked
 * of the two shapes the sea has. Clamped at the sea for the same reason in both: an eye under the
 * water line is inside the air, not below it.
 */
const heightOf = (p: Vec3, radius: number, spherical: boolean): number =>
  Math.max((spherical ? Math.hypot(p.x, p.y, p.z) : p.y) - radius, 0);

/** Gauss-Legendre's two nodes on `[-1, 1]`, `±1/√3`, shared by the host and the shader. */
export const GAUSS_NODE = 1 / Math.sqrt(3);

/** A point `t` of the way along a segment. */
const lerpAt = (eye: Vec3, point: Vec3, t: number): Vec3 => ({
  x: eye.x + (point.x - eye.x) * t,
  y: eye.y + (point.y - eye.y) * t,
  z: eye.z + (point.z - eye.z) * t,
});

/**
 * The column of air between two points, as the shader computes it: **two-point Gauss-Legendre
 * quadrature of the density across the shell-clipped segment**, times its world length.
 *
 * A height profile that bends at the closest approach — every grazing ray — peaks in density between
 * the midpoint and the shell, which is why one midpoint sample read the limb badly low; two nodes
 * straddle that peak and bring the error on the rays a player looks along to a few per cent.
 */
export const airMassShell = (
  eye: Vec3,
  point: Vec3,
  radius: number,
  atmosphereHeight: number = ATMOSPHERE_HEIGHT,
  scaleHeight: number = ATMOSPHERE_SCALE_HEIGHT,
  spherical = true,
): number => {
  const span = airSpan(eye, point, radius, atmosphereHeight, spherical);
  if (span === null) return 0;
  const mid = (span.lo + span.hi) * 0.5;
  const half = (span.hi - span.lo) * 0.5;
  const near = lerpAt(eye, point, mid - half * GAUSS_NODE);
  const far = lerpAt(eye, point, mid + half * GAUSS_NODE);
  const density =
    0.5 *
    (Math.exp(-heightOf(near, radius, spherical) / scaleHeight) +
      Math.exp(-heightOf(far, radius, spherical) / scaleHeight));
  const segment = Math.hypot(point.x - eye.x, point.y - eye.y, point.z - eye.z);
  return (span.hi - span.lo) * segment * density;
};

/**
 * The same column, integrated. The oracle `airMassShell` is measured against.
 *
 * Two hundred and fifty-six midpoint samples, which is the most this is worth: the midpoint rule's
 * error falls as `1/n²`, so the default is under a thousandth of a unit on the longest column this
 * world draws — close enough to stand in for the exact integral without being another approximation.
 */
export const airMassReference = (
  eye: Vec3,
  point: Vec3,
  radius: number,
  atmosphereHeight: number = ATMOSPHERE_HEIGHT,
  scaleHeight: number = ATMOSPHERE_SCALE_HEIGHT,
  samples = 256,
  spherical = true,
): number => {
  const span = airSpan(eye, point, radius, atmosphereHeight, spherical);
  if (span === null) return 0;
  const segment = Math.hypot(point.x - eye.x, point.y - eye.y, point.z - eye.z);
  const step = (span.hi - span.lo) / samples;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const t = span.lo + (i + 0.5) * step;
    const at: Vec3 = {
      x: eye.x + (point.x - eye.x) * t,
      y: eye.y + (point.y - eye.y) * t,
      z: eye.z + (point.z - eye.z) * t,
    };
    total += Math.exp(-heightOf(at, radius, spherical) / scaleHeight);
  }
  return total * step * segment;
};

/**
 * `airMassShell`, as nodes.
 *
 * The same arithmetic, term for term, so the host version is a real mirror rather than a description.
 * The discriminant is clamped before the root for the same `NaN` reason `airSpan` gives, and the
 * `select` at the end is what turns a segment that misses the air into zero rather than into
 * whatever the clamped root happened to produce.
 *
 * **Every intermediate is bound with `toVar`, and that is not tidiness.** rmsl builds an expression
 * graph and emits each node once per use; the quadratic feeds the near and far samples, which
 * feed the density, which the `select` names twice — written plainly, the emitted source repeated the
 * whole `a`/`b`/`c`/`sqrt` block about twenty times and the fragment ran to thousands of characters.
 * A variable is the only thing in this DSL that is computed once.
 *
 * **`spherical` may be a node rather than a constant, and it costs both solves.** The host twin
 * takes a plain boolean because nothing on the host changes shape mid-frame; `Fog` passes a
 * uniform, because a fog is shared by every surface in the scene and rebuilding four materials to
 * change one flag would be the larger cost. Both graphs are therefore emitted and evaluated, and
 * a `select` is a blend rather than a branch — about a dozen extra arithmetic operations per
 * fragment against a shader doing four point lights and a procedural material, which is the
 * cheaper of the two trades. The alternative is one compiled program per world shape and a
 * material rebuild on every switch, and a material rebuild throws away the day's lighting, the
 * place's lights and every other uniform written into it.
 */
export const airMassNode = (
  eye: Node<"vec3">,
  point: Node<"vec3">,
  radius: Node<"float">,
  atmosphereHeight: Node<"float">,
  scaleHeight: Node<"float">,
  spherical: boolean | Node<"bool"> = true,
): Node<"float"> => {
  const d = point.sub(eye).toVar();
  const segment = d.length().toVar();

  // ---- where the segment is in the air, as fractions of it ----
  const outer = radius.add(atmosphereHeight);
  const a = max(d.dot(d), float(1e-6)).toVar();
  const b = eye.dot(d).toVar();
  const c = eye.dot(eye).sub(outer.mul(outer)).toVar();
  const disc = max(b.mul(b).sub(a.mul(c)), float(0)).toVar();
  const root = sqrt(disc).toVar();
  const sphereLo = max(b.negate().sub(root).div(a), float(0)).toVar();
  const sphereHi = min(b.negate().add(root).div(a), float(1)).toVar();

  // **The slab, and its cases.** `d.y` is the only part of a segment's direction that decides
  // where it meets a level.
  //
  // **The divisor keeps its sign, and that is load-bearing.** A descending ray meets the sea
  // at a *positive* `t` because the crossing is `Δy / d.y` with both negative; divide by
  // `abs(d.y)` instead and every crossing comes out behind the eye, the span inverts, and a
  // ray at the ground gathers no air at all. The guard floors the magnitude rather than taking
  // it away, so a level ray cannot divide by zero and the level case below replaces the answer
  // wholesale — the guard is there to keep the arithmetic finite, not to be the answer.
  const safeStep = select(
    d.y.greaterThanEqual(float(0)),
    max(d.y, float(1e-6)),
    min(d.y, float(-1e-6)),
  ).toVar();
  const atSea = radius.sub(eye.y).div(safeStep).toVar();
  const atTop = outer.sub(eye.y).div(safeStep).toVar();
  // **Clamped into the same `0..1` the sphere's roots are in**, because they are the same
  // quantity: a parameter along the segment. Unclamped, a ray two hundred units long at a
  // shallow angle crosses a level tens of thousands of units out, and a `mid` built from that
  // number puts the quadrature somewhere the fragment is not.
  const rising = d.y.greaterThan(float(0)).toVar();
  const crossingLo = select(rising, atSea, atTop).toVar();
  const crossingHi = select(rising, atTop, atSea).toVar();
  const level =
    // **A level ray is in the air for all of it or none of it**, and which is a question about
    // the eye alone — the ray a player looks along at the horizon.
    select(
      eye.y.greaterThanEqual(radius).and(eye.y.lessThanEqual(outer)),
      float(1),
      float(0),
    ).toVar();
  const isLevel = abs(d.y).lessThan(float(1e-6)).toVar();
  const slabLo = max(crossingLo, float(0)).toVar();
  const slabHi = min(crossingHi, float(1)).toVar();
  const slabSpan = select(
    isLevel,
    level,
    max(slabHi.sub(slabLo), float(0)),
  ).toVar();
  const slabFrom = select(isLevel, float(0), slabLo).toVar();

  // ---- one span, whichever world this is, and the quadrature over *that* ----
  //
  // **The two halves are chosen before `mid`, and that ordering is the whole of this
  // function.** The Gauss nodes are points *along the span being integrated*; taking them from
  // one world's span and multiplying the result by the other's reads the density at the wrong
  // place entirely. It is not a small error: on a sphere, a shallow ray's slab crossings are
  // tens of thousands of units out along a two-hundred-unit segment, so `mid` lands far beyond
  // the fragment, the density there is the density at the ground, and the shell's own span — the
  // thousands of units a grazing ray really does cross — is multiplied by it. The result is an
  // optical depth of hundreds and a sky-coloured wall over near mountains.
  const lo = select(spherical, sphereLo, slabFrom).toVar();
  const span = select(spherical, sphereHi.sub(sphereLo), slabSpan).toVar();
  const hi = lo.add(span).toVar();

  // ---- the density across the span, at two Gauss nodes ----
  const mid = lo.add(hi).mul(0.5).toVar();
  const half = span.mul(0.5).toVar();
  const near = eye.add(d.mul(mid.sub(half.mul(float(GAUSS_NODE))))).toVar();
  const far = eye.add(d.mul(mid.add(half.mul(float(GAUSS_NODE))))).toVar();
  // **The altitude is `|p|` or `p.y`, and only this line and the two above know which.** Every
  // other term in this function — the span, the quadrature, the segment length — is identical on
  // both worlds.
  const nearHeight = select(spherical, near.length(), near.y).toVar();
  const farHeight = select(spherical, far.length(), far.y).toVar();
  const density = exp(
    nearHeight.sub(radius).max(float(0)).div(scaleHeight).negate(),
  )
    .add(exp(farHeight.sub(radius).max(float(0)).div(scaleHeight).negate()))
    .mul(0.5)
    .toVar();

  return select(
    span.greaterThan(float(0)),
    span.mul(segment).mul(density),
    float(0),
  );
};
