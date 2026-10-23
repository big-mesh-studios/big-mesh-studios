/**
 * Meshing one chunk, from a field.
 *
 * The mesher proper (`surface-nets.ts`) takes a sampler and a region and knows nothing
 * about chunks, levels of detail, candidate caches, normals or colours. This is the
 * layer that knows all of that, and it exists to keep the two apart: the mesher is a
 * pure algorithm that is easy to test and hard to get wrong, while everything specific
 * to this project lives here where it can be replaced wholesale.
 *
 * It is an interface with a TypeScript implementation for a reason stated in ADR 0003.
 * `fast-surface-nets-rs` compiled to WebAssembly is measurably faster, and this is the
 * seam it would come through — a substitution, not a rewrite. Anything the interface
 * needs and does not have is something that implementation would be missing too.
 */

import type { Bounds, Vec3 } from "@big-mesh-studios/core";
import type { SurfaceColour } from "@big-mesh-studios/csg";
import { BLOCK_WORLD, VOXEL_SIZE } from "../constants";
import type { CellCoord, Lod, MeshResolution, OverlapMask } from "../world";
import {
  DEFAULT_MESH_RESOLUTION,
  lodSamples,
  meshSampleSize,
  meshSamples,
} from "../world";

import {
  CHUNK_VERTEX_CAPACITY,
  ChunkMeshBuilder,
  ColourBoundaryScratch,
  FaceNormalWriter,
  SharpNormalScratch,
  colourBoundaryScratchFor,
  splitColourBoundaries,
  splitSharpNormals,
  type ChunkMesh,
} from "@big-mesh-studios/meshing";
import { OCCLUSION_REACH, bakeAmbientOcclusion } from "./ambient-occlusion";
import {
  NO_OVERLAP,
  OVERLAP_CELLS,
  overlapCells,
  paddingOf,
  type OverlapCells,
} from "./overlap";
import {
  scratchFor,
  surfaceNets,
  type SurfaceNetsScratch,
} from "@big-mesh-studios/meshing";

/**
 * What a mesher is asked for: which chunk, and at what level.
 *
 * The level is a `Lod` rather than a sample count because it is what the rest of the
 * project schedules in, and converting it here keeps the conversion in one place. Two
 * chunks at different levels still tile seamlessly, which the mesher's tests pin.
 */
export interface MeshRequest {
  readonly cell: CellCoord;
  readonly lod: Lod;
  /**
   * Faces of this chunk whose neighbour is at a *finer* level of detail, as an
   * `OverlapMask`.
   *
   * Optional, and absent means "reach into nobody", because a mesher that cannot be told
   * about its neighbours must still produce a mesh — just one that stops on the shared
   * plane and leaves the slit a level step opens (ADR 0035). The window supplies it from
   * the same `lodAt` that chose this chunk's level.
   */
  readonly overlap?: OverlapMask;
}

/** Builds the mesh for a chunk. */
export interface ChunkMesher {
  mesh(request: MeshRequest): ChunkMesh;
  /**
   * Whether this chunk could hold a surface, answered without sampling it.
   *
   * The cheap half of streaming, and in a terrain world most of it: a chunk entirely above
   * the landscape or entirely inside it is answered with a box test instead of 34,304 field
   * evaluations, and the answer is recorded as an empty mesh so the main thread is not left
   * waiting on a generation that will never be replied to.
   *
   * **Optional, and a mesher that cannot answer must not.** The two failure directions are
   * not symmetric: answering `false` for a chunk that does hold surface puts a hole in the
   * world that nothing will re-mesh, while answering `true` costs one chunk's samples and
   * nothing else. So a mesher with no answer available simply omits this, and a caller
   * treats its absence as "mesh it".
   *
   * Takes the same overlap the request does, because the cells a chunk reaches into are
   * part of the region the answer is about: a gate that tested only the chunk's own extent
   * could skip a chunk whose only surface is in its overlap, which is a hole with nothing
   * to fill it.
   */
  couldHaveMesh?(cell: CellCoord, lod: Lod, overlap?: OverlapMask): boolean;
}

/**
 * The samples and cells a chunk at a given level meshes, in world units.
 *
 * Stated once and used by both the mesher and its bounds checks, because the two must
 * agree exactly: the region declared to the candidate cache has to cover every sample
 * taken, or the cache answers from candidates gathered for somewhere else and the
 * surface comes out with holes in it.
 */
export interface ChunkRegion {
  /**
   * The world position of the run's first cell's low corner, which is the mesher's
   * `origin`.
   *
   * **Not always the chunk's own corner.** A chunk that reaches below its own extent into a
   * finer neighbour runs from one cell lower, because the mesher's run of owned cells always
   * begins at its origin and a cell below index one does not exist.
   */
  readonly origin: Vec3;
  /** Samples a chunk owns per axis, and so the sample grid's inner size. */
  readonly samples: number;
  /** Cells owned beyond the chunk's own extent, per axis. */
  readonly extra: readonly [number, number, number];
  /** World units between samples. */
  readonly sampleSize: number;
  /** The chunk's own world extent, which the overlap reaches outside. */
  readonly bounds: Bounds;
  /**
   * Every sample taken, padding included.
   *
   * Wider than `bounds` by one sample on each side — the seam rule needs one cell of low
   * padding to give the interface edges their vertices, and the high side is padded to
   * match so the sampling loop is a plain cube. On a face the chunk overlaps, by one more
   * than that: the overlap cell's far sample is a sample beyond the padding, and a region
   * that does not cover every sample taken gets its distances answered from candidates
   * gathered for somewhere else.
   */
  readonly sampleBounds: Bounds;
}

/** The same box, grown by `amount` on every axis. */
const growBounds = (bounds: Bounds, amount: number): Bounds => ({
  min: {
    x: bounds.min.x - amount,
    y: bounds.min.y - amount,
    z: bounds.min.z - amount,
  },
  max: {
    x: bounds.max.x + amount,
    y: bounds.max.y + amount,
    z: bounds.max.z + amount,
  },
});

/** The region a chunk at a level meshes, reaching `overlap` cells into finer neighbours. */
export const chunkRegion = (
  cell: CellCoord,
  lod: Lod,
  overlap: OverlapCells = NO_OVERLAP,
  mesh: MeshResolution = DEFAULT_MESH_RESOLUTION,
): ChunkRegion => {
  const samples = meshSamples(lod, mesh);
  const sampleSize = meshSampleSize(lod, mesh);
  const pad = paddingOf(overlap);

  // A chunk's world centre is the middle of its samples. Its own low edge — the first
  // sample it owns — sits half a chunk inside that, and the seam rule counts ownership from
  // there. Both are derived from the centre rather than from the chunk's edge, so that
  // the chunk's own extent is exactly `samples * sampleSize` and lands on a chunk
  // boundary at every level, which is what lets a coarse chunk stand in for four fine
  // ones.
  //
  // The overlap is then a matter of where the run starts and how far it reaches: one cell
  // lower on an axis whose low neighbour is finer, one cell further out on an axis whose
  // high neighbour is. `bounds` stays the chunk's own extent either way, because that is
  // what the window places by and what a query about the world asks about.
  const lowX = cell.x * BLOCK_WORLD - (samples / 2) * sampleSize;
  const lowY = cell.y * BLOCK_WORLD - (samples / 2) * sampleSize;
  const lowZ = cell.z * BLOCK_WORLD - (samples / 2) * sampleSize;
  const originX = lowX - overlap.low[0] * sampleSize;
  const originY = lowY - overlap.low[1] * sampleSize;
  const originZ = lowZ - overlap.low[2] * sampleSize;

  const span = samples * sampleSize;

  return {
    origin: { x: originX, y: originY, z: originZ },
    samples,
    extra: overlap.extra,
    sampleSize,
    bounds: {
      min: { x: lowX, y: lowY, z: lowZ },
      max: { x: lowX + span, y: lowY + span, z: lowZ + span },
    },
    sampleBounds: {
      min: {
        x: lowX - pad.low[0] * sampleSize,
        y: lowY - pad.low[1] * sampleSize,
        z: lowZ - pad.low[2] * sampleSize,
      },
      max: {
        x: lowX + span + pad.high[0] * sampleSize,
        y: lowY + span + pad.high[1] * sampleSize,
        z: lowZ + span + pad.high[2] * sampleSize,
      },
    },
  };
};

/**
 * The meshers a world is meshed by: its ground, and its water where it has any.
 *
 * **A pair rather than a list because there are exactly two surfaces**, and because the
 * sea is not the same kind of thing as the ground — it comes from the landscape alone, so
 * it does not move when an edit does and a world of operations over no landscape has no
 * second mesher at all. `undefined` for the sea means exactly that, and the worker's gate
 * is the sum of the two.
 */
export interface ChunkMeshers {
  readonly ground: ChunkMesher;
  readonly sea?: ChunkMesher;
}

/** The part of the field a mesher needs. The smallest thing that can hold it. */
export interface MeshField {
  distance(x: number, y: number, z: number): number;
  distanceForStepping(x: number, y: number, z: number): number;
  gradient(x: number, y: number, z: number, step?: number): Vec3;
  /**
   * The surface's colour and how opaque it is.
   *
   * **Both, rather than the colour alone, because the terrain discards the second.**
   * The landscape's material writes `vec4(albedo, 1)` — an opaque world has nothing
   * to blend — so the opacity is read here and thrown away. It is still part of the
   * interface so that a field carrying transparency does not need a second method to
   * expose it, and so a mesher does not have to know which of the two it is meshing.
   */
  colourAt(x: number, y: number, z: number): SurfaceColour;
  /**
   * Declares a region about to be sampled, so one candidate cache serves all of it, and
   * returns the function that ends it.
   *
   * Optional: a field with no operation list has no candidates to cache. A mesher that
   * skips this still produces a correct mesh — it just gathers candidates per point
   * instead of once per chunk, which is most of the cost.
   */
  beginRegion?(bounds: Bounds): (() => void) | undefined;
  /** Whether a box could hold a surface at all. */
  couldHoldSurface(bounds: Bounds): boolean;
}

/**
 * Meshes chunks with Surface Nets.
 *
 * Holds its scratch buffers and its output builder for its whole life, because both
 * are sized for a chunk and reused for every chunk thereafter. Allocating them per
 * chunk would put two multi-megabyte allocations in the path of a 5,832-sample loop.
 *
 * **Vertex normals come from the mesh's own faces, except on the chunk's outer layer,
 * which keeps the field's gradient.** Measured on this landscape at LOD 0, the gradient for
 * every vertex was 2.34 ms of a 38.4 ms chunk — six evaluations a vertex, each a whole fold
 * of the operation list — for an answer a pass over the index buffer gives. But a vertex on
 * the outer layer is named only by this chunk's quads, so its fan is clipped by the chunk
 * edge, and the neighbour clips the same vertex against its own cells; measured across a
 * **same-level** seam, the two averaged normals differ by up to 72 degrees. So the outer
 * layer takes the gradient, which both sides compute from the same field at the same world
 * position and therefore agree on to the last bit.
 *
 * `boundaryCells` says which cells those are, and it is worth reading before changing it:
 * the answer is "every face, at every level", which is not the obvious answer and is
 * explained there.
 */
export class SurfaceNetsChunkMesher implements ChunkMesher {
  private readonly scratch: SurfaceNetsScratch;
  private readonly builder = new ChunkMeshBuilder();
  private readonly normals: FaceNormalWriter;
  /**
   * One flag a vertex: it is on a chunk face and its normal comes from the field.
   *
   * A byte a vertex rather than a `Set`, because it is written once per surface vertex in
   * the middle of the mesher's hottest callback and read once per vertex afterwards — a few
   * KiB held for the life of the mesher, against a hash set that would be the same information
   * with a hash in the way.
   *
   * **Sized from the finest level this mesher will be asked for**, because a place may ask
   * for a grid many times finer than the landscape's default. A vertex past this capacity
   * falls back to the field's gradient rather than corrupting the buffer, so the number is
   * a performance bound and not a correctness one.
   */
  private readonly boundary: Uint8Array;
  /** The sample grid this mesher builds, which is the place's if it named one. */
  private readonly resolution: MeshResolution;
  /**
   * The crease angle a place asked for, or `undefined` for the Surface Nets answer.
   *
   * One number turns on both halves of the change: QEF placement moves the vertex onto the
   * crease, and `splitSharpNormals` stops the shader blending across it. See
   * `MeshResolution.sharpEdges`.
   */
  private readonly sharpAngle: number | undefined;
  /**
   * The step for the finite difference that supplies a crossing's normal.
   *
   * **A quarter of the finest sample, capped at the field's own default of one unit.** At a
   * place's 3.2-unit sample that is 0.8, which stays inside the cell; at the landscape's
   * ten-unit sample the cap keeps the existing behaviour. A step of a whole sample would
   * reach across the crease the normal is meant to describe.
   */
  private readonly gradientStep: number;
  private readonly sharpNormals = new SharpNormalScratch();
  /**
   * Whether to cut triangles where the field's colour changes. See
   * `MeshResolution.splitColours`.
   */
  private readonly splitColours: boolean;
  /**
   * Held across chunks, on the same terms as `sharpNormals`: the pass allocates buffers sized
   * for the mesh it is handed, and a chunk rebuild should not pay for them again.
   */
  private colourBoundaries: ColourBoundaryScratch | undefined;
  /**
   * How strongly to bake ambient occlusion into the colours, or `undefined` for none. See
   * `MeshResolution.bakeOcclusion`.
   */
  private readonly bakeOcclusion: number | undefined;
  /**
   * The world distance one unit of occlusion reach spans: the place's finest sample spacing.
   *
   * **The finest, not the level being meshed**, so a wall darkens by the same amount at every
   * level of detail. A band scaled by the current level's spacing would double when a chunk
   * coarsened, and the LOD step would change the shading as well as the silhouette.
   */
  private readonly occlusionScale: number;

  constructor(
    private readonly field: MeshField,
    samples: number = lodSamples(0),
    /**
     * How far this field's value may over-report the distance to the surface — the widest
     * blend any operation in the model carries.
     *
     * **Given to the mesher rather than read off the field, because the field does not know
     * what it is made of.** It is handed a fold and answers distances; the list behind that
     * fold is the caller's to describe. See `broad-pass.ts` for what the number buys.
     *
     * **Absent means the broad pass is declined and every sample is taken**, which is the old
     * behaviour and is what a caller with no operation list — a world of nothing but
     * landscape — gets. That is a deliberate miss: a base field on its own is a landscape,
     * which is the emptiest thing there is to sample, and the pass would drop most of it. So
     * `meshersFor` passes `0` rather than nothing, and says why there.
     */
    private readonly softness?: number,
    resolution: MeshResolution = DEFAULT_MESH_RESOLUTION,
  ) {
    this.resolution = resolution;
    this.sharpAngle = resolution.sharpEdges;
    this.splitColours = resolution.splitColours === true;
    // Zero and absent are the same request; normalising here means the mesh tail asks one
    // question ("was a strength given?") rather than re-deciding it per chunk.
    this.bakeOcclusion =
      resolution.bakeOcclusion === undefined || resolution.bakeOcclusion === 0
        ? undefined
        : resolution.bakeOcclusion;
    this.occlusionScale = resolution.lodSampleSizes[0];
    // The landscape's own step is one world unit and is what every existing caller gets;
    // a sharp place narrows it to a quarter of its own sample so the stencil stays inside a
    // cell. `gradientStep` is the same number for boundary normals and crossings, because
    // two different steps would shade a seam from a different neighbourhood than the one
    // that placed it.
    this.gradientStep =
      resolution.sharpEdges === undefined
        ? 1
        : Math.min(1, resolution.lodSampleSizes[0] * 0.25);
    // **The widest run this mesher will ever be asked for**, which is the finest LOD — and
    // the caller's own `samples` when it passed one, so the old constructor contract still
    // sizes scratch for what it was told. A chunk that reaches one cell into a finer
    // neighbour owns one more per axis, and a scratch one cell short of the grid it is given
    // does not fail — it reads air where the field said solid, and the mesher invents a
    // surface inside rock.
    const widest = Math.max(
      samples,
      meshSamples(0, resolution),
      meshSamples(1, resolution),
      meshSamples(2, resolution),
    );
    this.scratch = scratchFor(widest, OVERLAP_CELLS);
    const vertexCapacity = Math.max(
      CHUNK_VERTEX_CAPACITY,
      4 * (widest + 2) * (widest + 2),
    );
    this.boundary = new Uint8Array(vertexCapacity);
    this.normals = new FaceNormalWriter(vertexCapacity);
  }

  /**
   * Whether the chunk can be skipped without sampling it.
   *
   * The cheap half of streaming. A chunk entirely above the tallest thing the field can
   * produce has no sign change in it, and answering that costs one box test instead of
   * 5,832 field evaluations. `couldHoldSurface` returns true when it cannot tell, so
   * this never produces a wrong answer — only a missed saving.
   */
  couldHaveMesh(cell: CellCoord, lod: Lod, overlap?: OverlapMask): boolean {
    const region = chunkRegion(
      cell,
      lod,
      overlapCells(overlap),
      this.resolution,
    );
    // The region that decides whether anything is in the chunk is the chunk's own extent
    // plus its padding: a surface just outside the padding still puts vertices inside the
    // chunk, so testing the bare bounds would skip chunks that have visible geometry.
    return this.field.couldHoldSurface(region.sampleBounds);
  }

  mesh(request: MeshRequest): ChunkMesh {
    const region = chunkRegion(
      request.cell,
      request.lod,
      overlapCells(request.overlap),
      this.resolution,
    );

    // The candidate cache is told the whole sample region for the duration. Without this
    // the cache is rebuilt every few cells instead of once per chunk, which on the
    // measured cost of a chunk is the difference between one build and dozens.
    const endRegion =
      this.field.beginRegion?.(region.sampleBounds) ?? (() => {});

    try {
      // Which of the chunk's own cells are on its boundary, and on which faces, so that
      // `onVertex` can tell a clipped fan from a complete one. Read from the region rather
      // than recomputed here, because `chunkRegion` already worked out where the run
      // starts — an overlap at a face's low end moves the run one cell down, and a
      // boundary test that ignored that would gradient the wrong cells.
      const seam = boundaryCells(region);
      // Cleared here rather than in `resolveNormals`, which runs *after* the marks are set.
      // A reused buffer carried over from the last chunk would gradient vertices this one
      // never reached, and the symptom is a few scattered gradients — invisible, and the
      // reason this is pinned by the test that counts them.
      this.boundary.fill(0, 0, CHUNK_VERTEX_CAPACITY);

      // **The Hermite data's field fallback.** The cheap path takes a crossing's normal from
      // its own cell's eight samples, which is free and seam-safe; this function is asked
      // only where those samples are not enough — a cell touching a dropped broad-pass block,
      // or a feature cell whose corners are not linear. It must be a pure function of
      // position, because two chunks that own the same interface cell have to agree.
      const normalAt =
        this.sharpAngle === undefined
          ? undefined
          : (x: number, y: number, z: number) => {
              /**
               * **A central difference, rather than the old four-point tetrahedron.**
               *
               * The tetrahedron was chosen for four field samples instead of six, on the
               * argument that a QEF plane did not need the extra accuracy. The hospital
               * says otherwise: at a wall/ceiling junction the tetrahedron straddles both
               * planes and returns a diagonal blend, and the QEF then places vertices up to
               * 1.9 units off the zero set — a visible fin. Six central samples at the same
               * step cut the wall-region worst case to about 0.26 units and remove the fin,
               * for a measured few-percent cost on the sharp chunk. This is still asked only at
               * the crossings whose cell gradient cannot describe the surface.
               *
               * The step is a quarter of the finest sample and never more than a unit, so
               * the probes stay inside the cell the normal belongs to.
               */
              const gradient = this.field.gradient(x, y, z, this.gradientStep);
              const length = Math.hypot(gradient.x, gradient.y, gradient.z);
              if (!(length > 0) || !Number.isFinite(length)) {
                return [0, 1, 0] as const;
              }
              return [
                gradient.x / length,
                gradient.y / length,
                gradient.z / length,
              ] as const;
            };

      surfaceNets({
        origin: [region.origin.x, region.origin.y, region.origin.z],
        samples: region.samples,
        // The overlap is not geometry appended afterwards; it is more cells owned, which
        // is the only way to get a surface that *continues* across the shared plane rather
        // than one that stops on it (ADR 0035).
        extra: region.extra,
        sampleSize: region.sampleSize,
        // A place that asked for hard edges gets Dual Contouring's vertex placement;
        // everything else keeps the Surface Nets mean byte for byte.
        ...(normalAt === undefined
          ? {}
          : {
              vertexPlacement: "qef" as const,
              // The cell's own eight samples describe the crossing for free and cannot
              // disagree across a seam. The field function is the fallback for a cell that
              // touches a broad-pass fill, where those eight are not all measurements.
              normalFromCorners: true,
              normalAt,
            }),
        sampler: {
          distance: (x, y, z) => this.field.distance(x, y, z),
        },
        out: this.builder,
        scratch: this.scratch,
        softness: this.softness,
        onVertex: (index, x, y, z, cell) => {
          // **Marked, not written.** The gradient is spent in the pass below rather than
          // here, and the reason is that the second pass writes a normal for every vertex
          // that has an incident face — which a boundary vertex does. Writing the gradient
          // here and letting the pass overwrite it measured as a 118-degree disagreement
          // across the seam *with the carve-out already applied to every face*, which is
          // what it looks like when the fallback silently eats the answer it was a
          // fallback for.
          if (seam(cell[0], cell[1], cell[2])) this.boundary[index] = 1;
          // **The material goes in the colour's fourth byte**, which is the byte the layout
          // reserved and which nothing read (ADR 0048).
          const { colour, material } = this.field.colourAt(x, y, z);
          this.builder.setColour(index, colour, material);
        },
      });

      this.resolveNormals();
    } finally {
      // The disposer drops the candidate cache, so the next chunk builds its own rather
      // than answering from candidates gathered for this one. It runs even if meshing
      // threw, because a worker that kept a stale region would silently mesh every
      // chunk after a failure with the wrong candidates.
      endRegion();
    }

    // `finish` copies to exact length, which is what leaves the thread by transfer.
    const built = this.builder.finish();
    // **After the candidate cache is closed, because this pass reads no field.** It only
    // duplicates vertices and writes the face normal that was already computed; doing it in
    // the open region would be harmless and would keep a region alive for work that does not
    // need it.
    const sharp =
      this.sharpAngle === undefined
        ? built
        : splitSharpNormals(
            built,
            { angle: this.sharpAngle },
            this.sharpNormals,
          );
    if (!this.splitColours && this.bakeOcclusion === undefined) return sharp;
    /**
     * **The two passes that ask the field after meshing, and the region is reopened for
     * both.** `splitColourBoundaries` walks every disagreeing edge and bisects `colourAt`
     * along it, and occlusion samples a few distances around every vertex; without an open
     * region each query would gather its own candidate set and the passes would cost a tree
     * query per step.
     *
     * **Sharp, then colour, then occlusion.** The split pass averages no normals but does
     * duplicate vertices, and a fan clipped by colour boundaries would give
     * `splitSharpNormals` a leaned normal at every seam — the ordering ADR 0046 records for
     * models, applied here for the same reason. Occlusion runs last because it is a
     * multiplier on the colour and the colour cut compares exact bytes: darkening a vertex
     * first would make one colour disagree with itself and cut a surface that has no seam.
     */
    const endField =
      this.field.beginRegion?.(
        this.bakeOcclusion === undefined
          ? region.sampleBounds
          : growBounds(
              region.sampleBounds,
              OCCLUSION_REACH * this.occlusionScale,
            ),
      ) ?? (() => {});
    try {
      let result = sharp;
      if (this.splitColours) {
        this.colourBoundaries ??= colourBoundaryScratchFor(sharp.triangleCount);
        result = splitColourBoundaries(
          result,
          // **The same function that filled the vertices**, which is what makes the pass's
          // bracketed bisection find every crossing.
          { colourAt: (x, y, z) => this.field.colourAt(x, y, z) },
          this.colourBoundaries,
        );
      }
      if (this.bakeOcclusion !== undefined) {
        // In place: the arrays were built for this chunk and nothing else holds them. The
        // fourth byte stays the material id, so a darker brick is still brick.
        bakeAmbientOcclusion(result, this.field, {
          strength: this.bakeOcclusion,
          scale: this.occlusionScale,
        });
      }
      return result;
    } finally {
      endField();
    }
  }

  /**
   * Writes every vertex's normal: averaged from the mesh where that is right, and from the
   * field where it is not.
   *
   * **Inside the open region, deliberately.** The boundary vertices' gradients are folds of
   * the operation list, and a fold answered from candidates gathered for somewhere else is
   * a surface with holes in it — so this has to run before `endRegion`, which is why it is
   * a method called from inside the `try` rather than a line after it.
   *
   * The fallback is not only for the boundary: a vertex no emitted triangle names, and a
   * fan whose faces cancel exactly, both reach the field. The field's own `fallbackNormal`
   * covers the further case of a zero gradient, and between the two of them no vertex is
   * left at the builder's `[0, 0]` placeholder, which would decode to a black triangle.
   */
  private resolveNormals(): void {
    const count = this.builder.vertexCount;
    const positions = this.builder.positions.array();
    const normalOct = this.builder.normalOct.array();
    this.normals.accumulate(positions, this.builder.indices.array());

    for (let index = 0; index < count; index++) {
      if (this.boundary[index] === 0 && this.normals.write(index, normalOct)) {
        continue;
      }
      const normal = this.field.gradient(
        positions[index * 3] as number,
        positions[index * 3 + 1] as number,
        positions[index * 3 + 2] as number,
        this.gradientStep,
      );
      this.builder.setNormal(index, normal.x, normal.y, normal.z);
    }
  }
}
/**
 * Whether a cell touches one of the chunk's own faces, and so shades from the field.
 *
 * ## Every face, at every level — and that is measured, not assumed
 *
 * The obvious refinement is to restrict this to faces bordering a **different** level of
 * detail, on the reasoning that two chunks at the same level tessellate the shared plane
 * identically and so their clipped fans must be the same fans. They are not. On a sphere
 * straddling a same-level plane, **76 vertices are held by both chunks at bit-identical
 * positions, and their mesh-averaged normals differ by 72 degrees at worst, 25 on average.**
 *
 * Why the reasoning fails: each chunk clips the fan at *its own* cells, so one averages the
 * surface from inside its own extent and the other from inside its. No property of the level
 * makes those two sets of faces the same. So the carve-out is unconditional, and there is no
 * mask to thread through the protocol — which is a much better outcome than a mask that has
 * to be right.
 *
 * ## The two cells per face, and why there are two of them
 *
 * A face's plane is shared, and the cell on either side of it holding the surface is **not
 * the same cell of its own chunk**. On the low side of chunk B the plane is `bounds.min`, and
 * the cells touching it are B's own first cell (`low + 1`) and the padding cell below it
 * (`low`) — the padding exists so the interface edges have their vertices (ADR 0003), and
 * those are exactly the vertices B's neighbour sees. Every one of those 76 pairs was B's
 * padding cell against A's own last cell. Marking only the chunk's own outermost cell leaves
 * the neighbour's half of every pair averaged, and measures the same 70 degrees as marking
 * nothing at all.
 *
 * ## The off-by-one
 *
 * `uniformLane` puts sample `s` at `origin + (s - 1) * size`, so **cell zero is the padding
 * cell** and the chunk's own cells run `1 .. samples`. Reading them as `0 .. samples - 1`
 * picks the wrong cells on both faces.
 *
 * `low` is read off `ChunkRegion` rather than off an overlap mask, because an overlap at a
 * face's low end makes the region one cell lower (`chunkRegion`) and the run's indices with
 * it.
 */
export const boundaryCells = (
  region: ChunkRegion,
): ((cx: number, cy: number, cz: number) => boolean) => {
  // How far below its own extent an overlap has pushed the run on each axis, which is
  // exactly when the region's origin sits below the chunk's own low face.
  const low = [
    region.origin.x < region.bounds.min.x ? 1 : 0,
    region.origin.y < region.bounds.min.y ? 1 : 0,
    region.origin.z < region.bounds.min.z ? 1 : 0,
  ];
  // The cell whose span *ends* on each face's plane, per axis: `low` on the low side and
  // `low + samples` on the high one, because the chunk's own extent is `samples` cells long
  // and starts one cell in. Those are the cells a neighbour sees the surface through. The
  // cell on the near side of each plane is included too — it does not need it, and being one
  // gradient wrong would be worse than the few hundred nanoseconds.
  const near = [low[0]! + 1, low[1]! + 1, low[2]! + 1];
  const far = [
    low[0]! + region.samples,
    low[1]! + region.samples,
    low[2]! + region.samples,
  ];
  return (cx, cy, cz) => {
    const at = [cx, cy, cz];
    for (let axis = 0; axis < 3; axis++) {
      const here = at[axis]!;
      if (here <= near[axis]! || here >= far[axis]!) return true;
    }
    return false;
  };
};
/** How many samples a chunk at a level takes, for budgeting. */
export const sampleCount = (
  lod: Lod,
  mesh: MeshResolution = DEFAULT_MESH_RESOLUTION,
): number => {
  const samples = meshSamples(lod, mesh);
  return (samples + 2) ** 3;
};

/** How many world units a chunk at a level spans on one axis. */
export const chunkSpan = (
  lod: Lod,
  mesh: MeshResolution = DEFAULT_MESH_RESOLUTION,
): number => meshSamples(lod, mesh) * meshSampleSize(lod, mesh);

/** The world position of a chunk's own first sample's voxel, on one axis. */
export const chunkOriginOn = (
  cell: CellCoord,
  axis: "x" | "y" | "z",
  lod: Lod,
  mesh: MeshResolution = DEFAULT_MESH_RESOLUTION,
): number =>
  cell[axis] * BLOCK_WORLD -
  (meshSamples(lod, mesh) / 2) * meshSampleSize(lod, mesh);

/** The size of one sample at a level, for anyone who needs it named. */
export const sampleSizeAt = (
  lod: Lod,
  mesh: MeshResolution = DEFAULT_MESH_RESOLUTION,
): number => meshSampleSize(lod, mesh) || VOXEL_SIZE;
