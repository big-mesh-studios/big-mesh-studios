/**
 * The CSG core: what the model is, and how a point in space is measured against it.
 *
 * One import for everything a worker or a mesher needs. The pieces are separable and individually
 * tested — operations, the tree, the field, the file format — and this barrel exists so that a
 * mesher does not have to know that, and so that a change to one does not force a change to the
 * other's imports.
 *
 * **The shapes are not in here.** They live in `@big-mesh-studios/sdf`, which this package
 * depends on, and the re-export below is for the convenience of a caller that already imports
 * the field: the boundary is real and a package can be moved across it, but a caller should not
 * have to learn which half of the vocabulary it came from. See ADR 0025 for what that boundary
 * buys.
 *
 * **The chunk size is not in here either, and was.** This barrel used to re-export
 * `VOXEL_SIZE`, `CHUNK_VOXELS`, `BLOCK_WORLD` and the rest from a single `constants.ts`, which
 * made the CSG one chunk size wide by accident — the chain ran through `CANDIDATE_CELL` into
 * `bvh.ts` without a single import saying so. Nothing imported those four through here, so
 * removing them broke no caller (ADR 0024).
 *
 * Nothing here imports the renderer or the DOM. That is deliberate and load-bearing: the operation
 * list is cloned into every meshing worker whenever it changes, and it crosses that boundary by
 * structured clone, which means it has to be plain data.
 * `docs/adr/0002-computed-field-never-stored.md` has the reasoning for why the model is a list of
 * primitives at all.
 */

export type {
  OperationShape,
  PrimitiveSpec,
  ShapeType,
} from "@big-mesh-studios/sdf";
export {
  MIN_RADIUS,
  PRIMITIVE_NAMES,
  PRIMITIVES,
  sdShape,
  shapePadding,
} from "@big-mesh-studios/sdf";

export type {
  Combine,
  IndexedOperation,
  Operation,
  SurfaceColour,
} from "./operations";
export {
  CANDIDATE_MARGIN,
  COMBINE,
  applyOperation,
  boundsContain,
  boundsDistance,
  boundsDistanceSquared,
  boundsOf,
  conjugate,
  emptyField,
  foldOperations,
  indexOperation,
  makeOperation,
  operationBounds,
  operationDistance,
  rotate,
  shapeHalfExtents,
  smoothMax,
  smoothMin,
} from "./operations";

export { MAX_SOFTNESS, SOFTNESS_REACH } from "@big-mesh-studios/core";

export { OperationBVH } from "./bvh";

export type {
  BaseField,
  FieldOptions,
  PaintSource,
  SurfaceExtent,
} from "./field";
export { DEFAULT_COLOUR, Field } from "./field";

export type { CaveParams } from "./caves";
export {
  CAVE_SEED_MIX,
  caveCeilingRise,
  caveField,
  caveFloorDrop,
  caveNoise,
  DEFAULT_CAVES,
} from "./caves";

export type { TerrainField, TerrainParams } from "./terrain";
export {
  DEFAULT_TERRAIN,
  FBM_AMPLITUDE_BOUND,
  MOUNTAIN_FEATURE,
  MOUNTAIN_MASK_FEATURE,
  MOUNTAIN_MASK_OCTAVES,
  fbmAmplitudeSum,
  landscapeShape,
  NOISE_GRADIENT_BOUND,
  PerlinNoise2D,
  RIDGE_STRENGTH,
  TERRAIN_FEATURE,
  terrainField,
} from "./terrain";

export type { PlanetField, PlanetParams } from "./planet";
export { DEFAULT_PLANET, planetField, radiusRangeOf, reachOf } from "./planet";

export type { PlanetMapSource, PlanetMaps } from "./planet-maps";
export {
  bakePlanetMaps,
  directionAtEquirect,
  equirectAtDirection,
} from "./planet-maps";

export type { Direction } from "./cube-face";
export type { Patch, PatchSelection } from "./patch";
export {
  angleBetween,
  PATCH_ROOT,
  patchAngle,
  patchCentre,
  patchDirectionAt,
  patchLevel,
  patchLookupCost,
  patchOf,
  patchRange,
  rootPatch,
  selectPatches,
  subdivide,
} from "./patch";
export {
  cubePointAt,
  directionAt,
  faceOf,
  FACE_COUNT,
  FACE_NEG_X,
  FACE_NEG_Y,
  FACE_NEG_Z,
  FACE_POS_X,
  FACE_POS_Y,
  FACE_POS_Z,
} from "./cube-face";

export {
  FBM_AMPLITUDE_BOUND_3D,
  NOISE_GRADIENT_BOUND_3D,
  PerlinNoise3D,
} from "./perlin3";

export type {
  BaseFieldKind,
  BaseFieldSpec,
  BuiltBaseField,
} from "./base-field";
export { baseFieldFor, isPlanetField, seaLevelOf } from "./base-field";

export {
  FormatError,
  FORMAT_VERSION,
  deserialiseOperations,
  serialisedSize,
  serialiseOperations,
} from "./serialise";

/**
 * The model file's manifest — `.sdfmod`, a zip of `manifest.json` and `model.bin`.
 *
 * Here rather than in the application that writes it, because `apps/spacescape` reads these
 * as a place's prop and NPC models and two copies of a format's rules is two things to keep
 * in step. What is *not* here is the mesher vocabulary: `ProjectView.mode` is checked as a
 * name and not against a list, because this package does not know what a mesher is.
 */
export type { ProjectManifest, ProjectView } from "./model-file";
export {
  MAX_MANIFEST_COLOURS,
  MAX_MANIFEST_PARTS,
  MAX_PART_ID,
  PROJECT_EXTENSION,
  PROJECT_MANIFEST_FILE,
  PROJECT_MIME_TYPE,
  PROJECT_MODEL_FILE,
  PROJECT_VERSION,
  isProjectManifest,
  projectName,
} from "./model-file";
