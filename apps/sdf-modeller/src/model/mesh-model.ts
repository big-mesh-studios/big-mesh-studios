/**
 * Turning a model into triangles.
 *
 * ## Why Surface Nets and not raymarching
 *
 * **Because the renderer already draws triangles and the field is already a function.**
 * A raymarched figure would be a second renderer with its own camera, its own material
 * model and its own performance cliff, none of which this repository has. Meshing means
 * the model becomes the same kind of `Mesh` the landscape's chunks are, drawn by the same
 * node graph, with lighting and a shadow pass it already has.
 *
 * The cost is that meshing is a discrete operation over a box, so the model has to be
 * bounded and has to be rebuilt when it changes. That is what the resolution below is for.
 *
 * ## Why the sample count is chosen from the model, not fixed
 *
 * **A fixed grid either wastes work on a small model or cannot hold a large one.** The
 * count here is derived from the model's own bounds and a chosen voxel size, clamped at
 * both ends. The clamps are the interesting part: the upper one is a limit on memory and
 * on how long a rebuild takes, and the lower one is there because a model of a few
 * millimetres across should not be one cell.
 */
import type { Bounds, Vec3 } from "@big-mesh-studios/core";
import { writeOctahedralNormal } from "@big-mesh-studios/core";
import {
  Field,
  makeOperation,
  OperationBVH,
  type Operation,
} from "@big-mesh-studios/csg";
import {
  accumulateFaceNormals,
  ChunkMeshBuilder,
  colourBoundaryScratchFor,
  ColourBoundaryScratch,
  FaceNormalScratch,
  marchingCubes,
  marchingCubesScratchFor,
  reportMesh,
  resolveFaceNormal,
  scratchFor,
  splitColourBoundaries,
  surfaceNets,
  type ChunkMesh,
  type MarchingCubesScratch,
  type MeshReport,
  type SurfaceNetsScratch,
} from "@big-mesh-studios/meshing";

import { modelBounds, type Part } from "./part";

/**
 * How much of a model to mesh, and at what resolution.
 *
 * **`samples` is not chosen here** — it is derived, because a number the caller has to
 * keep in step with the model's size is a number that will be wrong.
 */
export interface MeshBudget {
  /** World units per sample. Smaller is finer and slower. */
  readonly voxelSize: number;
  /** The most samples on any one axis, whatever the model's size asks for. */
  readonly maxSamplesPerAxis: number;
  /** The fewest, so a tiny model is still more than one cell. */
  readonly minSamplesPerAxis: number;
}

/**
 * The default budget, and every number in it is a trade rather than a default.
 *
 * - **`voxelSize: 0.25`** puts a surface within an eighth of a unit of where it belongs on
 *   a figure a person is looking at closely. Halving it doubles the samples on each axis,
 *   which is eight times the work, so this is the first number to raise and the reason the
 *   slider is a voxel size rather than a sample count.
 * - **`maxSamplesPerAxis: 96`** is a ceiling on rebuild time. At 96³ the sampling pass is
 *   under a million field evaluations, which is a few tens of milliseconds on a phone and
 *   is why the rebuild is debounced rather than run per frame.
 * - **`minSamplesPerAxis: 8`**, so a model a few millimetres across is not one cell and
 *   therefore not a single vertex.
 */
export const DEFAULT_BUDGET: MeshBudget = {
  voxelSize: 0.25,
  maxSamplesPerAxis: 96,
  minSamplesPerAxis: 8,
};

/**
 * The two meshers, and which one a rebuild uses.
 *
 * **A choice rather than a quality setting, because the two make different promises rather than
 * different sizes.** Surface nets is closed wherever the surface is well resolved, which is
 * nearly always and is not a promise. Marching cubes places every vertex on a real crossing of
 * the surface and is closed and manifold at every resolution — a guarantee rather than an
 * observation. ADR 0003 rejected marching cubes for the landscape; the reasons it gives are about
 * streamed chunks at varying levels of detail, and none of them apply to one bounded box.
 *
 * **The status line reports what the mesh actually is either way**, so choosing wrong is visible
 * and neither is a trap.
 */
export type MeshMode = "surface-nets" | "marching-cubes";

/**
 * Marching cubes, and why it is the one a person gets without asking.
 *
 * **It used to be surface nets, on the reasoning that a mesher arriving a few tens of
 * milliseconds late is worse than one that is not quite closed.** That reasoning was a guess
 * about the cost, and it was the wrong way round. Measured on this application's own models, the
 * two are within noise of each other on time — surface nets' cell loop is cheaper, but both modes
 * spend nearly all their time in the sampling pass and in the six field evaluations per vertex
 * that fill the normals, and marching cubes wins that share back at the finer resolutions. The
 * triangles are three to twenty per cent more depending on the model, which is not what "the
 * fewest triangles and the fastest" was supposed to mean.
 *
 * So the thing the default was trading away was given away for nothing: a guarantee of being
 * closed rather than an observation that it is, at every resolution the control offers. Three
 * things follow from making it the default and all three were reasons to.
 *
 * - **The colour boundaries are only cut for marching cubes.** `splitColourBoundaries` runs on
 *   edges that lie *on* the surface, which is true of a marching cubes edge and not of a surface
 *   nets one. Two coloured shapes meeting therefore get a boundary the field agrees with, and
 *   only on this mesher.
 * - **The export already used it.** `printedMesh` forces marching cubes whichever mode the
 *   viewport is on, so a model previewed on nets and exported on cubes is not the model that was
 *   approved.
 * - **The preview is the same geometry as the print.** Same mesher, same boundaries, same
 *   closure, so what a person signs off on is what a slicer receives.
 *
 * **One constant for both the interface and this function's own argument default**, because they
 * were two literals that were allowed to disagree, and the one that matters is the one in the
 * signal in `app.tsx` — which is the only one anybody ever sees.
 */
export const DEFAULT_MESH_MODE: MeshMode = "marching-cubes";

/** The modes, with what a control needs to offer each one. */
export const MESH_MODES: ReadonlyArray<{
  readonly value: MeshMode;
  readonly label: string;
  readonly hint: string;
}> = [
  {
    value: "marching-cubes",
    label: "Cubes",
    hint: "Vertices on the true surface, so it follows the model more closely. Closed and manifold at every resolution, and the only one whose colour boundaries can be cut — this is the one to print.",
  },
  {
    value: "surface-nets",
    label: "Nets",
    hint: "One vertex per cell. The fewest triangles. Closed wherever the surface is well resolved — which is nearly always, but is not a promise, and its edges float off the surface, so a boundary cannot be cut along them.",
  },
];

/**
 * The voxel sizes a control offers, coarsest first.
 *
 * **A list of voxel sizes and not a slider from one to another**, because the cost is cubic in the
 * reciprocal and a slider invites the middle of its travel, where the difference is invisible and the
 * wait is real. Each step here doubles the samples on every axis and so multiplies the work by eight,
 * which is a ratio a person can predict.
 *
 * The ends are the budget's own. `0.5` is coarse enough to see a model's blocking out; `0.0625` is
 * the finest this repository offers, and above it the sampling stops being what limits the surface
 * and the field's own smoothness does.
 */
export const RESOLUTIONS = [0.5, 0.25, 0.125, 0.0625] as const;

/** The budget for one of `RESOLUTIONS`, keeping the other two numbers where they are. */
export const budgetFor = (
  voxelSize: number,
  base: MeshBudget = DEFAULT_BUDGET,
): MeshBudget => ({ ...base, voxelSize });

/**
 * Scratch, held across rebuilds.
 *
 * **Because the alternative is eleven megabytes a rebuild.** Marching cubes' vertex cache is three
 * arrays of `grid² · cells` entries and the field is `grid³` floats, so at the finest resolution a
 * rebuild allocates about twenty megabytes and throws them away — which is longer than the meshing.
 *
 * Each mode holds one, **grown but never shrunk**. A larger buffer is used as it stands: the loops
 * derive their bounds from the region rather than from the buffer, so a region that has got smaller
 * simply uses less of it. Reallocating on every change would mean the common case — nudging a part
 * at the same resolution — is the one that allocates.
 */
const HELD: {
  "surface-nets"?: { count: number; scratch: SurfaceNetsScratch };
  "marching-cubes"?: { count: number; scratch: MarchingCubesScratch };
  /** See `heldBoundaryScratch`. Kept apart from the mesher scratch, which has a different shape. */
  boundaries?: ColourBoundaryScratch;
  /** See `heldFaceNormals`. Grows with the vertex count, which is neither of the above. */
  faces?: FaceNormalScratch;
} = {};

const heldScratch = (
  mode: MeshMode,
  samples: number,
): SurfaceNetsScratch | MarchingCubesScratch => {
  const existing = HELD[mode];
  if (existing !== undefined && existing.count >= samples)
    return existing.scratch;
  if (mode === "marching-cubes") {
    const scratch = marchingCubesScratchFor(samples);
    HELD["marching-cubes"] = { count: samples, scratch };
    return scratch;
  }
  const scratch = scratchFor(samples);
  HELD["surface-nets"] = { count: samples, scratch };
  return scratch;
};

/**
 * Scratch for the colour-boundary pass, held for the same reason and on the same terms as the
 * mesher's own.
 *
 * **Separate from `HELD[mode]` because it grows with a different number** — the triangle count
 * rather than the sample count — and because it is only ever wanted on one of the two modes. A
 * second key in the same record would have been a `triangles` field that only one value of
 * `mode` ever set, which is a way of saying the two are unrelated that the type system could
 * have said for nothing.
 *
 * **Not shrunk, like the mesher's.** A region that has got smaller uses less of a larger buffer
 * without reallocating.
 */
const heldBoundaryScratch = (triangles: number): ColourBoundaryScratch => {
  const existing = HELD.boundaries;
  if (existing !== undefined && existing.slots.length >= triangles * 4) {
    existing.reset(triangles);
    return existing;
  }
  const scratch = colourBoundaryScratchFor(triangles);
  HELD.boundaries = scratch;
  return scratch;
};

/**
 * Scratch for the face-normal accumulation, held on the same terms as the other two.
 *
 * **Three floats a vertex, and the vertex count is the one number none of the other two
 * is keyed on.** The mesher's scratch grows with the sample count and the boundary pass's
 * with the triangle count, so a buffer held for one is the wrong size for this whenever a
 * model is long and thin — which is most of them, because `samplesFor` gives the longest
 * axis the budget and lets the others use less of it. Keyed separately, and grown but
 * never shrunk, like the others.
 */
const heldFaceNormals = (vertices: number): FaceNormalScratch => {
  const existing = HELD.faces;
  if (existing !== undefined && existing.capacity >= vertices) return existing;
  const scratch = new FaceNormalScratch(vertices);
  HELD.faces = scratch;
  return scratch;
};

/** Frees the held scratch. For a test that wants the module to start from nothing. */
export const releaseScratch = (): void => {
  delete HELD["surface-nets"];
  delete HELD["marching-cubes"];
  delete HELD.boundaries;
  delete HELD.faces;
};

/**
 * Samples per axis for a model of these bounds.
 *
 * **The model's longest axis gets the budget; the others get the same spacing, not the
 * same count.** Making it a per-axis count would give a long thin model a stretched grid,
 * and the mesher's cell loop assumes cells are cubes.
 */
export const samplesFor = (
  bounds: Bounds,
  budget: MeshBudget = DEFAULT_BUDGET,
): number => {
  const longest = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z,
  );
  const asked = Math.ceil(longest / budget.voxelSize);
  return Math.max(
    budget.minSamplesPerAxis,
    Math.min(budget.maxSamplesPerAxis, asked),
  );
};

/**
 * The model as CSG operations, one per part, in list order.
 *
 * **The list order is the fold order, and that now means something.** With every part an
 * `Add` the fold came out the same however the list was arranged, so a part's position was
 * bookkeeping. A `Subtract` in the list makes it not: `A`, `B`, then a difference of `C`
 * is a different solid from the same three parts in another order, and nothing recovers
 * which was meant. So the indices are the parts' positions deliberately, and reordering a
 * model is editing it.
 *
 * **`Paint` is deliberately not reachable from here.** It adds no material — it only
 * colours — and a part's colour counts whatever its boolean is, so a coloured `Add`
 * already covers it. Mapping it would offer a mode that does strictly less than `Add`.
 */
export const partsToOperations = (parts: readonly Part[]): Operation[] =>
  parts.map((part, index) =>
    makeOperation(index, part.origin, part.shape, part.combine, {
      orientation: part.orientation,
      softness: part.softness,
      // **Both or neither.** An opacity with no colour is a number nothing reads, so it is
      // not passed — which keeps `Operation.colour` the single thing that decides whether a
      // part has an appearance of its own.
      ...(part.colour === undefined
        ? {}
        : { colour: part.colour, opacity: part.opacity ?? 1 }),
    }),
  );

/**
 * A model as a field to sample, ready for `SurfaceSampler`.
 *
 * **`Field.distance` already *is* a `SurfaceSampler`** — one method, negative inside — so
 * the meshing seam needs nothing written for it. The BVH is given the model's own scale as
 * its candidate cell, which is what makes its cost independent of how many parts there
 * are: without it a hundred small parts and one hundred parts of the same total size cost
 * very different amounts.
 */
export const modelField = (
  parts: readonly Part[],
  budget = DEFAULT_BUDGET,
): Field => {
  const operations = partsToOperations(parts);
  const region = meshRegion(parts, budget);
  return new Field(
    new OperationBVH(operations, {
      candidateCell: region?.sampleSize ?? budget.voxelSize * 8,
    }),
    {
      base: () => Infinity,
      /**
       * **The region's own spacing, because the default is a whole world unit and the
       * voxels here are a sixteenth of one.** `Field.gradient` takes six central
       * differences across `±step`, so a step of 1 is a stencil two units wide reaching
       * over every edge and crease of a part a unit across — measured on a box's flat
       * face it tilted the normal by up to 50° and it did not improve as the mesh got
       * finer, because the error was the stencil rather than the sampling.
       *
       * Nothing on the meshing path asks the field for a normal any more — the vertices
       * average the faces around them, see `fillNormals` — so this is what the handful of
       * vertices no triangle names get, and what anybody reading the field in a test gets.
       * Left at the default it would be a wrong answer available to any future caller, so
       * it is set here where the spacing is known rather than at each call.
       */
      step: region?.sampleSize ?? budget.voxelSize,
    },
  );
};

/**
 * Where a model's mesh should be built, and how finely.
 *
 * **`pad` is a whole sample, not a fraction of one.** The mesher emits geometry owned by
 * the samples `1 .. n` on each axis, and a surface within half a cell of the edge of the
 * owned range is lost — which shows up as a figure with its extremities shaved off, and
 * only when the model happens to fill the box exactly.
 */
export const meshRegion = (
  parts: readonly Part[],
  budget: MeshBudget = DEFAULT_BUDGET,
): { origin: Vec3; samples: number; sampleSize: number } | undefined => {
  const bounds = modelBounds(parts, budget.voxelSize);
  if (bounds === undefined) return undefined;
  const samples = samplesFor(bounds, budget);
  // The longest axis fills the budget; the spacing comes from it, so the shorter axes are
  // covered with fewer samples rather than stretched.
  const longest = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z,
  );
  const sampleSize = longest / samples;
  return {
    // One sample back from the low corner, because `surfaceNets` puts sample `0` one step
    // *before* the origin it is given — see `SurfaceNetsParams.origin`.
    origin: {
      x: bounds.min.x + sampleSize,
      y: bounds.min.y + sampleSize,
      z: bounds.min.z + sampleSize,
    },
    samples,
    sampleSize,
  };
};

/** What one rebuild produced, and what it cost. */
export interface MeshResult {
  readonly mesh: ChunkMesh;
  readonly region: NonNullable<ReturnType<typeof meshRegion>>;
  /** Field evaluations, for the readout and for the budget test. */
  readonly samples: number;
  /** Triangles, zero when the model has no surface in the box. */
  readonly triangles: number;
  /**
   * Whether the mesh is closed, manifold and consistently wound.
   *
   * **On every result rather than on request, because the interesting failures are the ones nothing
   * looks like.** A clipped mesh and a mesh whose winding has turned over both draw perfectly, and the
   * only moment a person can act on either is before they send it to a slicer.
   */
  readonly report: MeshReport;
}

/**
 * Meshes one part on its own, centred on the origin, for a preview.
 *
 * ## Why this is not `meshModel([part])`
 *
 * **Because a single-part model is not the part.** `meshModel` folds the list, and a lone
 * `Subtract` folded against a base of `Infinity` comes out as nothing at all — so a preview
 * of a difference would have been an empty scene, which is a very confusing thing to show
 * somebody who is dragging it somewhere. Forcing `Add` and a hard edge gives the primitive's
 * own surface, which is what a preview of a move is: the shape that is going somewhere, not
 * the effect it currently has on the model.
 *
 * ## Why the origin is dropped and the orientation is not
 *
 * **So the mesh comes out in the part's own frame, with its turn already in it.** The caller
 * then only has to set a position to place it, and a drag costs one position write per
 * frame. Keeping the orientation in the mesh rather than on the object also means the
 * preview cannot drift out of step with the part: there is one turn, and it is baked into
 * the vertices.
 *
 * ## Why it is built once rather than per frame of a drag
 *
 * **Because a drag along one axis cannot change a shape**, so after the first build the
 * vertices are exactly right for every remaining frame. See `view/ghost.ts`.
 */
export const primitiveMesh = (
  part: Part,
  budget: MeshBudget = DEFAULT_BUDGET,
): MeshResult | undefined => {
  const local: Part = {
    ...part,
    origin: { x: 0, y: 0, z: 0 },
    combine: "Add",
    softness: 0,
  };
  return meshModel([local], budget);
};

/**
 * Fills every vertex's normal from the faces around it, in place.
 *
 * ## Why the mesh's own faces and not the field's gradient
 *
 * **Because a central difference across a crease is the average of both sides of it, and
 * that average is the wrong answer everywhere except exactly on the crease.** The field
 * here is a composition — `min` and `smoothMin` of several exact distances — which is an
 * upper bound on the true distance and whose gradient therefore points away from the
 * surface rather than out of it, most of all where two parts meet. There is a second and
 * larger effect: `Field.gradient` samples at `±step`, and left at its default that step is
 * a whole world unit while the voxels here are as small as a sixteenth of one. A stencil
 * two units wide, on a part a unit across, spans every edge on it.
 *
 * Measured on this application's own models, the angle between a vertex normal and the
 * true one — a lone sphere, whose field is exact, so this is error and not argument:
 *
 * ```text
 *   voxel   gradient (step 1)   averaged faces
 *   0.5     2.1°                5.3°
 *   0.25    1.9°                3.5°
 *   0.125   2.1°                2.4°
 *   0.0625  2.1°                1.1°
 * ```
 *
 * **The gradient's error does not move and the averaged one converges**, which is the
 * claim worth making. It is stuck at two degrees because the step is fixed in world units
 * and the vertex is sampling the same neighbourhood no matter how finely the mesh is cut,
 * so refining the model was buying accuracy in the geometry and none in the shading. On a
 * box's flat face — where the true normal is exactly the face's own and cannot be
 * disputed — the same stencil tilted it by up to 50°, against exactly 0° for the average.
 *
 * Averaging is first-order, so it is the coarser of the two on a smooth surface at a coarse
 * voxel, and it wins by five degrees of mean error by the finest resolution this
 * application offers. It is also cheaper: one pass over the index buffer against six field
 * evaluations a vertex, which on the heaviest model measured here took a rebuild from
 * 1572 ms to 1338 ms.
 *
 * ## What it cannot do
 *
 * **A vertex no triangle names has no faces to average.** `SurfaceOutput.vertex` is called
 * for every cell whose corners disagree, and a quad is only emitted when all four of its
 * cells have vertices, so a vertex on the far side of a surface thinner than a cell can be
 * owned by nothing. Those fall back to the field, and `modelField` has already given the
 * field a step matched to the voxel so the fallback is a local measurement rather than the
 * two-unit blur it would otherwise be.
 *
 * **A degenerate fan falls back too**, for the same reason: two faces whose normals cancel
 * leave nothing to normalise, and a zero written to the buffer decodes in the shader to a
 * black triangle. `resolveFaceNormal` returning `false` is what says which vertices those
 * are, and it is the reason `Field`'s own `fallbackNormal` still has a job here.
 */
const fillNormals = (mesh: ChunkMesh, field: Field): void => {
  const scratch = heldFaceNormals(mesh.vertexCount);
  accumulateFaceNormals(
    mesh.positions,
    mesh.indices,
    mesh.vertexCount,
    scratch,
  );
  const resolved = { x: 0, y: 0, z: 0 };
  for (let index = 0; index < mesh.vertexCount; index++) {
    if (resolveFaceNormal(scratch, index, resolved)) {
      writeOctahedralNormal(mesh.normalOct, index * 2, resolved);
      continue;
    }
    const normal = field.gradient(
      mesh.positions[index * 3] as number,
      mesh.positions[index * 3 + 1] as number,
      mesh.positions[index * 3 + 2] as number,
    );
    writeOctahedralNormal(mesh.normalOct, index * 2, normal);
  }
};

/**
 * Meshes a whole model.
 *
 * **`undefined` for a model with no parts**, which is different from a model that meshes
 * to nothing. The first has nothing to draw and the caller should show an empty scene; the
 * second has parts and the caller should leave the previous mesh up rather than blanking
 * the screen because a shape is smaller than one sample.
 */
export const meshModel = (
  parts: readonly Part[],
  budget: MeshBudget = DEFAULT_BUDGET,
  mode: MeshMode = DEFAULT_MESH_MODE,
): MeshResult | undefined => {
  const region = meshRegion(parts, budget);
  if (region === undefined) return undefined;

  // **The budget, this time.** It was not passed before, which meant the BVH's candidate cell was
  // always the default's eight voxels rather than this region's sample size — so a rebuild at a
  // finer resolution got a candidate cell sized for a coarser one, and the cost of sampling stopped
  // being independent of the resolution the caller asked for.
  const field = modelField(parts, budget);
  const builder = new ChunkMeshBuilder();
  const params = {
    origin: [region.origin.x, region.origin.y, region.origin.z] as const,
    samples: region.samples,
    sampleSize: region.sampleSize,
    // `Field.distance` already *is* a `SurfaceSampler`: one method, negative inside.
    sampler: field,
    out: builder,
    onVertex: (index: number, x: number, y: number, z: number) => {
      /**
       * **The colour of every vertex, from the field.**
       *
       * This was absent, and its absence was not a cosmetic bug. `ChunkMeshBuilder.vertex`
       * fills an unset normal with a placeholder and an unset colour with white — and the
       * builder's own comment says the placeholder was chosen to be "a real direction rather
       * than an obvious sentinel", so that a vertex whose normal was never set would shade as
       * though it were right. Which is exactly what happened: this model was being drawn with
       * every normal pointing the same way and every vertex white.
       *
       * The colour comes from the field rather than from the mesh because it is a property of
       * the surface and the mesher knows nothing about fields — `SurfaceSampler` is one
       * method, a distance.
       *
       * **The normal is not asked for here**, which it used to be. See `fillNormals`, which
       * runs on the finished mesh instead and is why this callback no longer needs to be
       * called once per vertex for the gradient's sake — though both meshers call it once per
       * vertex anyway, since marching cubes shares a vertex between the cells around an edge
       * and filling a normal per cell would write the same vertex several times over.
       */
      const { colour, opacity } = field.colourAt(x, y, z);
      builder.setColour(index, colour, Math.round(opacity * 255));
    },
  };

  const scratch = heldScratch(mode, region.samples);
  if (mode === "marching-cubes") {
    marchingCubes({
      ...params,
      scratch: scratch as MarchingCubesScratch,
    });
  } else {
    surfaceNets({ ...params, scratch: scratch as SurfaceNetsScratch });
  }

  const built = builder.finish();

  /**
   * **The normals, from the mesh's own faces, before anything else touches the mesh.**
   *
   * This is a second pass over the index buffer and costs no field evaluations at all,
   * where asking the field for each normal costs six. It is here rather than in the
   * `onVertex` above because a face's normal needs all three of its vertices' positions,
   * and the second and third of a quad are only known once the quad has been emitted.
   *
   * **Before the colour boundaries rather than after, which is the whole ordering
   * constraint.** `splitColourBoundaries` duplicates every vertex that lands on a boundary
   * and gives each copy the triangles on its own side of it. So afterwards each of those
   * vertices is named by a *clipped* fan — the triangles of one colour, missing the ones
   * that would have cancelled the tilt — and averaging a clipped fan gives a normal leaned
   * towards the faces that survived. That is the same failure `vertex-normals` documents
   * for a chunk edge, and it is the reason the landscape cannot simply average everywhere.
   * Here it does not arise: one bounded box, no neighbouring chunks, and this pass runs on
   * the mesh as the mesher left it, where every vertex's fan is complete.
   */
  fillNormals(built, field);
  /**
   * **Cutting the colour boundaries, for marching cubes only.**
   *
   * Every vertex already holds the colour the field gives it, and that is enough to say where
   * the boundary is: what a triangle between two coloured shapes looks like is a ramp across its
   * width, because a per-vertex colour is blended by whatever draws it. `splitColourBoundaries`
   * finds where the field actually changes along each disagreeing edge and cuts the triangles
   * there, so the boundary is a line on the geometry rather than an interpolation.
   *
   * **Marching cubes and not surface nets, because an edge has to be lying on the surface for a
   * cut along it to mean anything.** Marching cubes puts every vertex on a true crossing, so an
   * edge between two of them runs along the surface. Surface nets places one vertex per cell at
   * the average of that cell's crossings — inside the cell, and so off the surface by up to half
   * a cell — which means a cut found along such an edge is a crossing somewhere near the surface
   * rather than on it.
   *
   * **Free for a model that has nothing to cut**, which is most models and every drag ghost: the
   * pass returns the mesh it was given when no triangle would blend, and that is a scan of the
   * index buffer with no field calls in it.
   *
   * **And the new vertices it writes inherit the normals it was given**, interpolated from
   * the two endpoints of the edge they were cut from — which are now the faces' own answer
   * rather than a gradient's, so the cut is no longer a seam between two different
   * techniques but two pieces of one.
   */
  const mesh =
    mode === "marching-cubes"
      ? splitColourBoundaries(
          built,
          {
            /**
             * **The same rule the vertices were filled with**, and `field.colourAt` as it stands
             * rather than a wrapper of it. The pass brackets each of its searches by asking at an
             * endpoint and expecting the answer already written there, so anything but this very
             * function leaves every search unbracketed and finds nothing.
             */
            colourAt: (x, y, z) => field.colourAt(x, y, z),
          },
          heldBoundaryScratch(builder.triangleCount),
        )
      : built;
  return {
    mesh,
    region,
    samples: (region.samples + 2) ** 3,
    triangles: mesh.triangleCount,
    report: reportMesh(mesh),
  };
};
