/**
 * The numbers this application is built around, each with the reasoning that produced it.
 *
 * ## Why these are not in `@big-mesh-studios/core`
 *
 * **Every one of them is a property of this world rather than of a field.** `VOXEL_SIZE` is how
 * far apart this landscape's samples are, `CHUNK_VOXELS` is how many of them a re-mesh costs, and
 * `BLOCK_WORLD` is the result. They were all in one `constants.ts` with the four things a field
 * genuinely owns, and ADR 0024 splits them because the chain
 * `VOXEL_SIZE → CHUNK_VOXELS → BLOCK_WORLD → CANDIDATE_CELL` reached all the way into the CSG — a
 * package that has to be usable by an application with a different natural scale.
 *
 * A second application that models rather than streams will have its own numbers, and it will not
 * have any of these.
 */

/** World units per voxel at level of detail 0. */
export const VOXEL_SIZE = 10;

/**
 * Voxels per chunk per axis at level of detail 0.
 *
 * **Sixteen, because a chunk is the unit an edit re-meshes.** A place like the animal hospital
 * asks for a 3.2-unit sample grid (`MeshSettings.lodSampleSizes`), and at thirty-two voxels a
 * chunk is 320 units and therefore 100³ — just over a million field evaluations per edit. At
 * sixteen it is 160 units and 50³, one eighth of that, and an edit to a small cutout still fits
 * in one chunk. The default landscape stays at the same ten-unit spacing; it simply has sixteen
 * samples a chunk rather than thirty-two.
 *
 * The cost of the smaller chunk is more cells in the streaming window, which is why the window
 * radius, the level-of-detail bands and the superchunk grouping all speak in chunks and are
 * scaled with it. Drawing is still batched over a 2×2×2 superchunk, so a chunk becoming smaller
 * does not become a draw call of its own.
 */
export const CHUNK_VOXELS = 16;

/** World units one chunk spans on each axis, at every level of detail. */
export const BLOCK_WORLD = CHUNK_VOXELS * VOXEL_SIZE;

/**
 * How many times each level of detail samples the field more coarsely than the one before it.
 * Indexed by level.
 *
 * Doubling rather than growing by a constant, because level of detail is a sampling stride over
 * one continuous function (ADR 0004) and a stride that halves the samples is what makes a coarse
 * chunk cheap rather than merely smaller.
 */
export const LOD_STRIDE = [1, 2, 4] as const;

/** The coarsest level of detail there is, and one past it, for loops. */
export const LOD_COUNT = LOD_STRIDE.length;

/** Voxels across one chunk at a given level of detail, per axis. */
export const lodVoxels = (lod: number): number =>
  CHUNK_VOXELS / (LOD_STRIDE[Math.min(lod, LOD_COUNT - 1)] as number);

/**
 * World units across one chunk at a given level of detail, per axis.
 *
 * Constant across levels, and that is the point: a chunk covers the same ground at every level,
 * and only the resolution of its samples changes. A chunk's world size is therefore the one true
 * extent, and every coordinate conversion goes through this rather than through a level-dependent
 * number.
 */
export const lodWorld = (_lod: number): number => BLOCK_WORLD;

/**
 * One level of detail beyond the texture's edge.
 *
 * Sampled fields do not clamp at their edges, so a chunk needs a border of samples outside itself
 * to cull its seam faces against. One is enough for the mesher to decide every face on its own
 * boundary; more would be a way of hiding a seam rather than closing it.
 */
export const FIELD_BORDER = 1;

/** The chunk size the operation BVH's candidate cache is sized to. */
export const CANDIDATE_CELL = BLOCK_WORLD;

/**
 * The chunk size the operation BVH is given, which is this application's.
 *
 * **A number passed rather than a constant read**, so that the BVH in `packages/csg` is not tied to
 * a chunk this application happens to use. The default is the same chunk size, so nothing about
 * the behaviour changes; what changes is that a second application can be built at a different
 * scale without it reaching into the landscape's constants to say so.
 */
export const BVH_CANDIDATE_CELL = CANDIDATE_CELL;
