import type { Node } from "@random-mesh/rmsl";
import {
  add,
  clamp,
  dot,
  float,
  floor,
  fract,
  fwidth,
  max,
  min,
  mod,
  mul,
  oneMinus,
  smoothstep,
  select,
  sub,
  vec3,
} from "@random-mesh/rmsl";

import {
  MATERIAL_COUNT,
  requireMaterialId,
  type MaterialName,
} from "./material-names";
import {
  BRICK,
  FADE_START,
  GROOVE_DARKEN,
  GROUT_DARKEN,
  MIN_DETAIL,
  MORTAR_DARKEN,
  PLANK,
  TILE,
} from "./material-patterns";

/**
 * The procedural patterns, as node graphs the shader compiles.
 *
 * ## This file and `material-patterns.ts` are the same maths twice
 *
 * **One is the shader and one is the reference, and the shader is not derived from it.** A node
 * graph cannot be called from TypeScript and a scalar function cannot be compiled into GLSL, so
 * the arithmetic exists in both — the same duplication this repository already accepts for the
 * octahedral fold, where `surface-material.ts`'s `octahedralNode` sits beside `core`'s
 * `decodeOctahedral`.
 *
 * **The scalar file is the one with the tests and the one to change the maths in.** These two
 * are the only places the patterns exist, and both say so at the top.
 *
 * ## Unrolled, because a varying cannot index a uniform table
 *
 * **`patternNode` selects between four lattices rather than looking one up.** The id arrives from
 * a vertex attribute, and GLSL cannot index a uniform array with a value read from a varying. So
 * every pattern is evaluated and the answers are selected between — which is why the set is
 * small, and why adding a material is a measured event rather than a free one.
 *
 * **Id zero needs no pattern at all.** `plain` is the overwhelming majority of the world — the
 * terrain, the water, and every figure the crosshair is not on — so it short-circuits to one and
 * the four lattices below cost only the fragments that named one.
 */

/**
 * A hash of three floats to a number in 0…1.
 *
 * **Dave Hoskins' `hash13`, and not `fract(sin(dot(p, k)) * c)`.** The `sin` version is the one
 * everybody reaches for and it is visibly banded into rings on some drivers at some
 * resolutions — and a brick wall is exactly where that would be seen, because the pattern is
 * the thing the eye checks. This one is three multiplies and two `fract`s with no transcendental
 * in it, so there is nothing for a driver to implement badly.
 *
 * **It takes floats, not integers**, which is why there are no bit operations anywhere in this
 * file. Bitwise node math needs an `int` conversion and gets the conversion's range and
 * precision rules instead of `fract`'s, and per-brick variation does not need exact integers —
 * it needs values that differ between neighbours and repeat on the same one.
 */
const hashNode = (p: Node<"vec3">): Node<"float"> => {
  const h = fract(mul(p, float(0.1031))).toVar();
  // **That `dot` is what decorrelates the three inputs**, and leaving it out is why the cheap
  // versions of this hash come out banded: three `fract`s of multiplied coordinates are still
  // linear in each other, so cells within a row — the ones most visible side by side — correlate.
  const mix = dot(h, add(h.zyx, float(31.32))).toVar();
  const g = add(h, mix).toVar();
  return fract(mul(add(g.x, g.y), g.z));
};

/**
 * How much of a pattern survives at this distance, 0 to 1.
 *
 * **The anti-aliasing, and it is the difference between a wall and a shimmer.** Once a pixel
 * spans more than a whole cell the pattern carries no information at that distance, so it is
 * faded out rather than clamped — and fading to nothing is also what distance physically does,
 * since a mortar line is not visible two hundred units away whether or not anything draws it.
 *
 * **The footprint is the largest derivative of the three axes, not one of them.** That detail is
 * load-bearing: a wall facing X has `fwidth(x) ≈ 0` because X does not change across it, so
 * sampling one axis would leave every X-facing wall at full contrast while it shimmers along its
 * own length. The pattern is always at its sharpest looking straight at it and fades as the
 * surface turns away or recedes, whichever axis is responsible.
 */
const detail = (p: Node<"vec3">, cell: number): Node<"float"> => {
  const footprint = max(max(fwidth(p.x), fwidth(p.y)), fwidth(p.z));
  // **Whole until `FADE_START` of a cell, then linear to nothing at `MIN_DETAIL`** — the same
  // curve as `detailAt` in the reference file, which is where its reason is written down.
  const perCell = footprint.div(cell).div(MIN_DETAIL);
  return clamp(
    sub(float(1), max(sub(perCell, FADE_START), 0)).div(
      MIN_DETAIL - FADE_START,
    ),
    0,
    1,
  );
};

/**
 * Brick as a multiplier on the surface's colour.
 *
 * **A running bond by a half-brick shear on alternate courses**, which is the one piece of
 * masonry knowledge here and it is what stops a wall reading as a grid of identical boxes.
 *
 * The mortar is `1 - smoothstep` over the distance to the nearest face of the cell, so it is a
 * line rather than a step and does not alias at the transition the way a threshold would.
 */
const brickNode = (p: Node<"vec3">): Node<"float"> => {
  const row = floor(p.y.div(BRICK.y)).toVar();
  // **The shear is in world units rather than in cells**, so the bond survives a change of brick
  // size. `mod(row, 2)` rather than `row & 1`: the same alternation, no `int` conversion, and it
  // reads as "every other course" rather than as a bit.
  const shift = mod(row, 2)
    .mul(BRICK.x / 2)
    .toVar();
  const shiftZ = mod(row, 2)
    .mul(BRICK.z / 2)
    .toVar();
  const qx = add(p.x, shift).toVar();
  const qz = add(p.z, shiftZ).toVar();

  const cx = floor(qx.div(BRICK.x)).toVar();
  const cy = floor(p.y.div(BRICK.y)).toVar();
  const cz = floor(qz.div(BRICK.z)).toVar();

  const lx = sub(qx, cx.mul(BRICK.x)).toVar();
  const ly = sub(p.y, cy.mul(BRICK.y)).toVar();
  const lz = sub(qz, cz.mul(BRICK.z)).toVar();

  // **Distance to the nearest face of the cell, per axis** — zero at a face, half a cell at the
  // middle of one, which is the mortar profile in a single expression.
  const nearest = min(
    min(min(lx, sub(BRICK.x, lx)), min(lz, sub(BRICK.z, lz))),
    min(ly, sub(BRICK.y, ly)),
  );
  // **`smoothstep`, not a clamp.** A clamp gives mortar a hard edge exactly where a pixel starts
  // to straddle it, which is the one place it is guaranteed to be sampled badly; a smoothstep
  // over the same range costs one instruction more and has no edge to alias.
  const mortar = oneMinus(smoothstep(float(0), BRICK.mortar, nearest));

  // **Per-brick shade, hashed on the cell**: the same brick is the same shade everywhere and
  // different from its neighbours, which is what makes a wall read as fired clay rather than as
  // a colour and a grid.
  const shade = add(float(0.82), mul(hashNode(vec3(cx, cy, cz).toVar()), 0.36));
  // **Subtracted, and it has to be.** A mortar line is darker than the brick beside it; adding
  // the term would make the joints the brightest thing on the wall, which is both wrong and a
  // surprisingly easy way not to notice — every pixel still moves, so a "does the pattern reach
  // the frame" test still passes.
  return mul(
    sub(shade, mul(mortar, sub(1, MORTAR_DARKEN))),
    detail(p, BRICK.x),
  );
};

/** Tile: a square grid in X and Z with wide grout, and no courses at all. */
const tileNode = (p: Node<"vec3">): Node<"float"> => {
  const cx = floor(p.x.div(TILE.x)).toVar();
  const cz = floor(p.z.div(TILE.z)).toVar();
  const lx = sub(p.x, cx.mul(TILE.x)).toVar();
  const lz = sub(p.z, cz.mul(TILE.z)).toVar();
  const nearest = min(min(lx, sub(TILE.x, lx)), min(lz, sub(TILE.z, lz)));
  const grout = oneMinus(smoothstep(float(0), TILE.grout, nearest));
  const shade = add(float(0.9), mul(hashNode(vec3(cx, 0, cz).toVar()), 0.2));
  return mul(sub(shade, mul(grout, sub(1, GROUT_DARKEN))), detail(p, TILE.x));
};

/**
 * Plaster: a soft noise at a large scale, and no structure at all.
 *
 * **Why a material with no lattice is in the set, and it is not filler.** A wall wants to be
 * uneven — a perfectly flat albedo reads as a flat-shaded plane no matter how well it is lit —
 * and this is the cheapest thing that fixes it. It is also the material that shows what
 * `detailAt` is for: the noise is at a *larger* scale than any cell, so the fade has far more
 * room before it starts, and past that it is simply the vertex colour.
 */
const plasterNode = (p: Node<"vec3">): Node<"float"> => {
  // **Two scales at once.** One octave is a gradient and reads as a smear; two octaves with a
  // quarter of the period of the first reads as a surface. The `2.7` is not a nice number, it
  // is the one that stopped the two looking like the same noise twice.
  const coarse = hashNode(p).toVar();
  const fine = hashNode(mul(p, float(2.7)).toVar());
  return add(
    float(0.9),
    mul(add(mul(coarse, 0.14), mul(fine, 0.06)), detail(p, PLANK.x * 2)),
  );
};

/** Timber: grain along Y, with a groove between planks. */
const timberNode = (p: Node<"vec3">): Node<"float"> => {
  const cx = floor(p.x.div(PLANK.x)).toVar();
  const cz = floor(p.z.div(PLANK.z)).toVar();
  const lx = sub(p.x, cx.mul(PLANK.x)).toVar();
  const lz = sub(p.z, cz.mul(PLANK.z)).toVar();
  const nearest = min(min(lx, sub(PLANK.x, lx)), min(lz, sub(PLANK.z, lz)));
  const groove = oneMinus(smoothstep(float(0), PLANK.groove, nearest));
  // **Grain as a function of Y**, so the streaks run down the plank rather than across it.
  const grain = hashNode(vec3(cx, floor(p.y.div(3)), cz).toVar());
  return mul(
    sub(add(float(0.86), mul(grain, 0.22)), mul(groove, GROOVE_DARKEN)),
    detail(p, PLANK.x),
  );
};

/**
 * Concrete: a fine speckle at three times the lattice rate, and no structure.
 *
 * **The one pattern with no `detail` fade, and that is not an oversight.** Speckle at this scale
 * aliases the moment a pixel spans a third of it, but unlike a lattice it has no mortar and no
 * per-cell shade to lose — a speckle that fades out is the same colour it was, so there is
 * nothing to protect. Fading it would only dim a wall.
 */
const concreteNode = (p: Node<"vec3">): Node<"float"> =>
  add(
    float(0.94),
    mul(
      hashNode(
        vec3(
          floor(p.x.mul(3)).toVar(),
          floor(p.y.mul(3)).toVar(),
          floor(p.z.mul(3)).toVar(),
        ).toVar(),
      ),
      0.12,
    ),
  );

/**
 * The multiplier for a surface wearing `id`, given its world position.
 *
 * **Every lattice is evaluated for every fragment, then selected between.** There is no branch
 * and no early-out: a fragment's material id comes from a varying, so branching on it would
 * make the two sides of a boundary disagree about which side they are on and the seam would
 * appear. Evaluating all four and selecting is the portable answer, and it is why `plain` skips
 * the multiply entirely rather than skipping the work.
 */
export const patternNode = (
  id: Node<"float">,
  p: Node<"vec3">,
): Node<"float"> => {
  // **One is the default, not a special case.** `plain` is the overwhelming majority of the
  // world — the terrain, the water, and every figure the crosshair is not on — so an id nobody
  // named has to come through as "no change to the colour". Accumulating patterns as
  // `pattern * wears(id)` and starting from zero would instead darken every plain surface to
  // black.
  let result: Node<"float"> = float(1).toVar();

  /**
   * Use `pattern` where this fragment wears `material`, and otherwise leave the total alone.
   *
   * **The id here is `MATERIAL_NAMES`'s index, written out, and that is the fragile part of
   * this file.** They were once off by the position of `tile` and `plaster` in that list, and
   * nothing failed: plaster was absent from the chain and fell through to `plain`, so plaster
   * was a wall with no pattern and tile was never drawn. A material with no case is not an
   * error in a chain of selects, it is the default — which is exactly why
   * `patternsCoverEveryMaterial` checks the count and this is why the numbers below are
   * `materialId("…")` rather than literals.
   *
   * **A `select` per material rather than a sum of masks.** A mask sum is zero for every id a
   * pattern does not answer for, so it has to start from a one and then every *unmatched*
   * pattern has to multiply that one by zero to be ignored. A chain of selects has the identity
   * built in and reads as the thing it is: the last material to match wins, and if none does
   * then it is one.
   *
   * **Every lattice is still evaluated for every fragment.** There is no branch, because the id
   * comes from a varying and branching on it would make the two sides of a material boundary
   * disagree about which side they were on — the seam would appear. That is why `wantsPattern`
   * exists, to turn the whole chain off where it cannot be wanted.
   */
  const wears = (
    material: MaterialName,
    pattern: Node<"float">,
  ): Node<"float"> =>
    select(id.equal(requireMaterialId(material)), pattern, result.toVar());

  result = wears("brick", brickNode(p));
  result = wears("plaster", plasterNode(p));
  result = wears("timber", timberNode(p));
  result = wears("tile", tileNode(p));
  result = wears("concrete", concreteNode(p));
  return result;
};

/**
 * How many patterns the chain above knows about.
 *
 * **Exported as a number and asserted against `MATERIAL_COUNT` by a test, because a material
 * added to the names without a `select` here would be one that validates, draws as plain, and
 * silently never looks like anything.** That is the failure this catches.
 */
export const PATTERN_COUNT = 6;

/** Whether every material in the vocabulary has a pattern behind it. */
export const patternsCoverEveryMaterial = (): boolean =>
  MATERIAL_COUNT <= PATTERN_COUNT;
