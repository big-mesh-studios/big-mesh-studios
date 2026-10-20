/**
 * How finely a world's chunks are sampled.
 *
 * ## Why this is a value rather than a constant
 *
 * The engine's default is sized for its landscape: a ten-unit voxel, thirty-two samples a
 * chunk, and three levels of detail. A **place** is often a much smaller thing than a
 * landscape — a building a few hundred units across — and a wall in it is a handful of
 * units thick. At the landscape's ten-unit sampling a wall thinner than a sample can fall
 * between two samples and vanish, which is a mesh that is coarse for the thing being
 * meshed rather than a mesher with a bug.
 *
 * So a place may name the spacing it wants at each level of detail. **The chunk's world
 * extent does not change** — it is still `BLOCK_WORLD` units, and every cell coordinate,
 * window radius and fog distance means exactly what it did. Only the number of samples
 * inside a chunk changes, which is why this can be a per-place setting without turning the
 * chunk lattice into a per-place fact.
 *
 * ## Why the numbers must divide the chunk
 *
 * A chunk is `BLOCK_WORLD` units and the samples tile it exactly. A spacing that does not
 * divide it leaves a sliver at the chunk's high edge, and the neighbouring chunk starts
 * its own grid at the boundary — so the two grids disagree about where the surface is
 * along that edge. The validator refuses that rather than rounding, because a rounded
 * spacing would silently move every wall in the place.
 */

import { BLOCK_WORLD, LOD_COUNT, LOD_STRIDE, VOXEL_SIZE } from "../constants";

/**
 * The world units between samples at each level of detail, finest first.
 *
 * **Three numbers, because there are three levels** — `LOD_STRIDE` is the default's
 * `[1, 2, 4]`, and a place naming its own spacing is naming the result of that stride
 * rather than a different number of levels.
 */
export interface MeshResolution {
  readonly lodSampleSizes: readonly [number, number, number];
  /**
   * How far apart two faces may point before the mesher treats their edge as hard, in
   * degrees; absent means the ground is meshed and shaded exactly as it always was.
   *
   * **A place setting rather than a global one because it changes what the surface looks
   * like, not only how finely it is sampled.** A hard-edged building wants its creases
   * preserved and its terrain still smooth; a landscape of soft sculpture wants neither
   * the extra field evaluations nor the flat-shaded creases. The value is the angle passed
   * to `splitSharpNormals`, and its presence is also what turns on QEF vertex placement —
   * a crease that is not in the geometry cannot be made by shading it.
   *
   * **The cost is a normal at the crossings, not at every sample.** A crossing normally takes
   * its normal from its own cell's eight samples — arithmetic, not field calls. A cell whose
   * samples are not close to linear asks the field for its crossings' normals, so the four
   * field samples are paid only where the surface actually turns. That is why this is opt-in
   * rather than the engine default until a place has been measured.
   */
  readonly sharpEdges?: number;
}

/** The landscape's own spacing: ten units at LOD 0, then twenty and forty. */
export const DEFAULT_MESH_RESOLUTION: MeshResolution = {
  lodSampleSizes: [
    VOXEL_SIZE,
    VOXEL_SIZE * LOD_STRIDE[1],
    VOXEL_SIZE * LOD_STRIDE[2],
  ],
};

/**
 * The fewest samples a chunk may hold per axis.
 *
 * **Four rather than one**, because Surface Nets works on cells and a chunk with fewer than
 * a handful of them cannot describe a surface at all — it would be a chunk-sized smear.
 * The floor also keeps a place from asking for a resolution that is nominally finer but
 * produces only a handful of vertices.
 */
export const MIN_MESH_SAMPLES = 4;

/**
 * The most samples a chunk may hold per axis.
 *
 * **A memory bound rather than a quality one.** The scratch grid is `(samples + 2)³`
 * floats in two arrays, so 128 samples is already about 17 MiB per mesher and a place can
 * run several workers. The finest spacing this allows over a 320-unit chunk is 2.5 units,
 * which captures walls a couple of units thick; anything thinner than that is below the
 * terrain's own smallest feature and is a sign the level should be modelled differently.
 */
export const MAX_MESH_SAMPLES = 128;

const clampLod = (lod: number): 0 | 1 | 2 =>
  Math.max(0, Math.min(lod, LOD_COUNT - 1)) as 0 | 1 | 2;

/** World units between samples at a level of detail. */
export const meshSampleSize = (
  lod: number,
  mesh: MeshResolution = DEFAULT_MESH_RESOLUTION,
): number => mesh.lodSampleSizes[clampLod(lod)] as number;

/** Samples a chunk holds per axis at a level of detail. */
export const meshSamples = (
  lod: number,
  mesh: MeshResolution = DEFAULT_MESH_RESOLUTION,
): number => Math.round(BLOCK_WORLD / meshSampleSize(lod, mesh));

/** Whether two settings ask for the same grid. */
export const sameMeshResolution = (
  a: MeshResolution,
  b: MeshResolution,
): boolean =>
  a.lodSampleSizes[0] === b.lodSampleSizes[0] &&
  a.lodSampleSizes[1] === b.lodSampleSizes[1] &&
  a.lodSampleSizes[2] === b.lodSampleSizes[2] &&
  // **Compared, not remembered.** A place that changes its angle is asking for a different
  // surface, and `Session.setMeshSettings` only re-meshes when this says the grid moved.
  a.sharpEdges === b.sharpEdges;

/**
 * Whether a value names a mesh grid this engine can build.
 *
 * Everything is checked and nothing is coerced, matching the manifest's own rule: a place
 * that arrives with `"3.2"` where a number belongs is a place whose author has a bug, and
 * guessing what they meant would move every wall they drew.
 */
export const isMeshResolution = (value: unknown): value is MeshResolution => {
  if (typeof value !== "object" || value === null) return false;
  const sizes = (value as { lodSampleSizes?: unknown }).lodSampleSizes;
  if (!Array.isArray(sizes) || sizes.length !== LOD_COUNT) return false;

  let previous = 0;
  for (const size of sizes) {
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
      return false;
    }
    // **Coarse levels may equal fine ones**, because a place that wants every chunk at
    // one resolution is a legitimate request; a coarse level finer than a fine one is not.
    if (size < previous) return false;
    const samples = BLOCK_WORLD / size;
    if (!Number.isFinite(samples)) return false;
    const rounded = Math.round(samples);
    if (rounded < MIN_MESH_SAMPLES || rounded > MAX_MESH_SAMPLES) return false;
    // A tolerance rather than `Number.isInteger`, because a decimal spacing that divides
    // evenly can land a few ulps away from an integer under floating-point division.
    if (Math.abs(rounded * size - BLOCK_WORLD) > 1e-6) return false;
    previous = size;
  }

  // **A threshold of zero would flat-shade every triangle and one above ninety is
  // meaningless**, because no face can lean further from a vertex's normal than that. Both
  // are refused rather than clamped: a place that asked for either has a typo, and silently
  // choosing a different angle would change the surface it thought it was getting.
  const sharp = (value as { sharpEdges?: unknown }).sharpEdges;
  if (sharp !== undefined) {
    if (
      typeof sharp !== "number" ||
      !Number.isFinite(sharp) ||
      sharp <= 0 ||
      sharp > 90
    ) {
      return false;
    }
  }
  return true;
};
