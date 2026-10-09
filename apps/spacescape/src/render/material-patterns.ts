/**
 * What a surface looks like when it is wearing something other than its vertex colour.
 *
 * ## One pattern in three dimensions, not three patterns blended
 *
 * **Every material here is a function of world position alone, and that is the whole design.**
 * The alternative — evaluate the pattern in all three axis-aligned projections and blend by the
 * normal, which is what "triplanar" means — cannot be made continuous. Across a 45° edge the
 * three projections cross-fade into mush rather than meeting at a line, and where two flat walls
 * meet at a corner they get two *independent* patterns with a hard discontinuity down the
 * corner, because there is no shared phase between them to continue.
 *
 * A 3D lattice fixes both by construction, because there is only one pattern in the world and
 * every plane is a slice through it:
 *
 * - a wall facing X sees courses along Y and bricks varying in Z;
 * - a wall facing Z sees courses along Y and bricks varying in X;
 * - a floor sees bricks in X and Z and no courses at all, which is how a brick floor is laid;
 * - a corner is the same pattern cut by both faces, running through continuously.
 *
 * **The cost is one aspect ratio for every orientation**, and that is why brick and tile are
 * different materials rather than one material with an orientation-dependent scale.
 *
 * ## Every scale is in world units, and this repository's are large
 *
 * **`VOXEL_SIZE` is ten.** A brick one unit long — the obvious number in an engine whose units
 * are metres — would be a tenth of a voxel here and unresolvable at any distance. The numbers in
 * `CELL` are the lengths in world units at which these read correctly against a landscape of
 * chunks each `BLOCK_WORLD` across, and they are the first thing to turn if that stops being
 * true.
 *
 * ## The aliasing, and the one thing that fixes it
 *
 * **A procedural pattern has no mip chain, so it shimmers.** Once a pixel spans more than the
 * width of a mortar line, that line is thinner than the thing sampling it and the result is
 * noise — worse than no pattern at all, because it moves.
 *
 * The fix is `fwidth`, which is how big a pixel is in the units being sampled. When a pixel is
 * wider than the mortar, the mortar is faded out — **not sharpened, not clamped: faded to
 * nothing**, which is also what distance physically does, since a mortar line is not visible at
 * two hundred units whether or not anything draws it. One `smoothstep` per pattern, and the
 * constant that makes it work is `minDetail`.
 */

/**
 * The size of one unit of each pattern, in world units.
 *
 * **A `vec3` per material rather than a uniform, and that is a decision.** The shader is
 * unrolled over the material ids, so a uniform table would have to be indexed by a value read
 * from a varying — which GLSL cannot do. Everything the pattern needs is therefore a constant,
 * and changing a brick's size is a change to this file rather than to a uniform. That is the
 * price of one program with no branches, and it is why these are all together and commented.
 */
export const BRICK = { x: 24, y: 12, z: 12, mortar: 1.6 } as const;
export const TILE = { x: 20, y: 20, z: 20, grout: 2.2 } as const;
export const PLANK = { x: 22, y: 30, z: 22, groove: 1.4 } as const;

/**
 * How wide a pixel may get before a pattern is faded out entirely, in pattern units.
 *
 * **One, and it is a whole cell rather than the mortar's own width.** Fading on the mortar's
 * width alone would leave a brick's *colour jitter* still being sampled per pixel, which is the
 * other half of the shimmer — two bricks either side of a corner flickering between two shades.
 * Fading on the cell puts the whole pattern out of reach of the sampler at once.
 */
export const MIN_DETAIL = 1;

/**
 * How much of a cell a pixel may span before the fade starts, and the pattern is still whole.
 *
 * **And this is why `detailAt` is not simply `1 - perCell`.** Linear from zero would mean a pixel
 * spanning a quarter of a brick — an ordinary viewing distance for a wall — sampled the pattern
 * at three quarters contrast, so the wall would quietly be less brick-like the closer you got.
 * The pattern is left alone until the sampler is genuinely in trouble and then taken away
 * quickly, which is the opposite arrangement: close up is exact, and far away is plain.
 */
export const FADE_START = 0.5;

/**
 * A hash of three integers to a number in 0…1.
 *
 * **A cheap integer hash rather than a `sin`-based one**, because `fract(sin(x) * k)` is visibly
 * banded on some drivers and a brick wall is exactly where that would be seen. This is three
 * rounds of multiply-xor-shift, which is four instructions each.
 */
export const hash3 = (x: number, y: number, z: number): number => {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (z | 0) * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Brick, as a multiplier on the surface's colour in 0…1.
 *
 * **A running bond by a half-cell shear on alternate courses**, which is the one piece of
 * masonry knowledge here and it is what stops a wall reading as a grid of identical boxes.
 *
 * The mortar is `1 - smoothstep` over the distance to the nearest face of the cell, so it is a
 * line rather than a step and does not alias at the transition the way a threshold would.
 */
export const brickAt = (
  x: number,
  y: number,
  z: number,
): { mortar: number; shade: number } => {
  const row = Math.floor(y / BRICK.y);
  // **Alternate courses offset by half a brick.** The shear is in world units rather than in
  // cells so that the bond survives a change of brick size.
  const qx = x + (row & 1) * (BRICK.x / 2);
  const qz = z + (row & 1) * (BRICK.z / 2);

  const cx = Math.floor(qx / BRICK.x);
  const cz = Math.floor(qz / BRICK.z);
  const cy = Math.floor(y / BRICK.y);

  // **Distance to the nearest face of the cell, per axis.** Zero at a face, half a cell at the
  // middle — which is the mortar profile in one expression.
  const lx = qx - cx * BRICK.x;
  const lz = qz - cz * BRICK.z;
  const dx = Math.min(lx, BRICK.x - lx);
  const dz = Math.min(lz, BRICK.z - lz);
  const dy = Math.min(y - cy * BRICK.y, BRICK.y - (y - cy * BRICK.y));

  const nearest = Math.min(dx, Math.min(dy, dz));
  const mortar = 1 - Math.min(1, nearest / BRICK.mortar);

  // **Per-brick shade, hashed on the cell.** The same brick is the same shade everywhere and
  // different from its neighbours, which is what makes a wall read as fired clay rather than as
  // a colour and a grid.
  const shade = 0.82 + hash3(cx, cy, cz) * 0.36;

  return { mortar, shade };
};

/**
 * Tile: a square grid with wide grout and a little per-tile variation.
 *
 * **No `y`, and that is the pattern rather than an oversight.** A floor has no courses — the
 * grid is the same in X and Z and repeats along Y — which is the whole reason tile is a separate
 * material rather than a differently scaled brick (see `material-names.ts`). Taking two
 * arguments where the other patterns take three would say so at the call site; taking a `y` and
 * ignoring it would say the opposite.
 */
export const tileAt = (
  x: number,
  z: number,
): { grout: number; shade: number } => {
  const cx = Math.floor(x / TILE.x);
  const cz = Math.floor(z / TILE.z);
  const lx = x - cx * TILE.x;
  const lz = z - cz * TILE.z;
  const nearest = Math.min(
    Math.min(lx, TILE.x - lx),
    Math.min(lz, TILE.z - lz),
  );
  const grout = 1 - Math.min(1, nearest / TILE.grout);
  const shade = 0.9 + hash3(cx, 0, cz) * 0.2;
  return { grout, shade };
};

/** Timber: grain along Y, with a groove between planks. */
export const timberAt = (
  x: number,
  y: number,
  z: number,
): { groove: number; shade: number } => {
  const cx = Math.floor(x / PLANK.x);
  const cz = Math.floor(z / PLANK.z);
  const lx = x - cx * PLANK.x;
  const lz = z - cz * PLANK.z;
  const nearest = Math.min(
    Math.min(lx, PLANK.x - lx),
    Math.min(lz, PLANK.z - lz),
  );
  const groove = 1 - Math.min(1, nearest / PLANK.groove);
  // **Grain, and it is a function of Y** so the streaks run down the plank rather than across
  // it. Cheap and it is most of what reads as timber.
  const grain = hash3(cx, Math.floor(y / 3), cz);
  const shade = 0.86 + grain * 0.22 - groove * 0.3;
  return { groove, shade };
};

/**
 * How much of a pattern survives at this distance, 0 to 1.
 *
 * **The anti-aliasing, and it is the difference between a wall and a shimmer.** `footprint` is
 * how many world units one pixel covers, measured by the caller with `fwidth` on the position
 * being sampled; it is in the pattern's own units, so each pattern passes its own scale.
 *
 * **Faded to nothing rather than clamped.** Past the point where a pixel is wider than a cell,
 * the pattern carries no information at that distance — the mortar is not visible two hundred
 * units away whether or not anything draws it — and drawing something anyway is what shimmers.
 */
export const detailAt = (footprint: number, cellSize: number): number => {
  const perCell = footprint / cellSize;
  if (perCell <= FADE_START) return 1;
  if (perCell >= MIN_DETAIL) return 0;
  return (MIN_DETAIL - perCell) / (MIN_DETAIL - FADE_START);
};

/**
 * How much a pattern darkens towards its mortar, and the shade of the brick beside it.
 *
 * **Two numbers rather than a colour, because the caller has a colour and this multiplies it.**
 * Keeping the palette on the surface and the pattern as a multiplier is what lets one material
 * be used on a red wall and a blue one without a second entry in `MATERIAL_NAMES`.
 */
export const MORTAR_DARKEN = 0.45;
export const GROUT_DARKEN = 0.4;
export const GROOVE_DARKEN = 0.35;
