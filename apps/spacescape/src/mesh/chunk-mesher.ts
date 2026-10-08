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
import type { CellCoord, Lod, OverlapMask } from "../world";
import { lodSampleSize, lodSamples } from "../world";

import {
  CHUNK_VERTEX_CAPACITY,
  ChunkMeshBuilder,
  FaceNormalWriter,
  type ChunkMesh,
} from "@big-mesh-studios/meshing";
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

/** The region a chunk at a level meshes, reaching `overlap` cells into finer neighbours. */
export const chunkRegion = (
  cell: CellCoord,
  lod: Lod,
  overlap: OverlapCells = NO_OVERLAP,
): ChunkRegion => {
  const samples = lodSamples(lod);
  const sampleSize = lodSampleSize(lod);
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
 * chunk would put two multi-megabyte allocations in the path of a 34,304-sample loop.
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
   * the middle of the mesher's hottest callback and read once per vertex afterwards — 4 KiB
   * held for the life of the mesher, against a hash set that would be the same information
   * with a hash in the way.
   */
  private readonly boundary = new Uint8Array(CHUNK_VERTEX_CAPACITY);

  constructor(
    private readonly field: MeshField,
    samples: number = lodSamples(0),
  ) {
    // Sized for the widest run this mesher will ever be asked for rather than for the
    // widest chunk: a chunk that reaches one cell into a finer neighbour owns one more per
    // axis, and a scratch one cell short of the grid it is given does not fail — it reads
    // air where the field said solid, and the mesher invents a surface inside rock.
    this.scratch = scratchFor(samples, OVERLAP_CELLS);
    this.normals = new FaceNormalWriter(CHUNK_VERTEX_CAPACITY);
  }

  /**
   * Whether the chunk can be skipped without sampling it.
   *
   * The cheap half of streaming. A chunk entirely above the tallest thing the field can
   * produce has no sign change in it, and answering that costs one box test instead of
   * 34,304 field evaluations. `couldHoldSurface` returns true when it cannot tell, so
   * this never produces a wrong answer — only a missed saving.
   */
  couldHaveMesh(cell: CellCoord, lod: Lod, overlap?: OverlapMask): boolean {
    const region = chunkRegion(cell, lod, overlapCells(overlap));
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

      surfaceNets({
        origin: [region.origin.x, region.origin.y, region.origin.z],
        samples: region.samples,
        // The overlap is not geometry appended afterwards; it is more cells owned, which
        // is the only way to get a surface that *continues* across the shared plane rather
        // than one that stops on it (ADR 0035).
        extra: region.extra,
        sampleSize: region.sampleSize,
        sampler: {
          distance: (x, y, z) => this.field.distance(x, y, z),
        },
        out: this.builder,
        scratch: this.scratch,
        onVertex: (index, x, y, z, cell) => {
          // **Marked, not written.** The gradient is spent in the pass below rather than
          // here, and the reason is that the second pass writes a normal for every vertex
          // that has an incident face — which a boundary vertex does. Writing the gradient
          // here and letting the pass overwrite it measured as a 118-degree disagreement
          // across the seam *with the carve-out already applied to every face*, which is
          // what it looks like when the fallback silently eats the answer it was a
          // fallback for.
          if (seam(cell[0], cell[1], cell[2])) this.boundary[index] = 1;
          const { colour, opacity } = this.field.colourAt(x, y, z);
          this.builder.setColour(index, colour, Math.round(opacity * 255));
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
    return this.builder.finish();
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
export const sampleCount = (lod: Lod): number => {
  const samples = lodSamples(lod);
  return (samples + 2) ** 3;
};

/** How many world units a chunk at a level spans on one axis. */
export const chunkSpan = (lod: Lod): number =>
  lodSamples(lod) * lodSampleSize(lod);

/** The world position of a chunk's own first sample's voxel, on one axis. */
export const chunkOriginOn = (
  cell: CellCoord,
  axis: "x" | "y" | "z",
  lod: Lod,
): number =>
  cell[axis] * BLOCK_WORLD - (lodSamples(lod) / 2) * lodSampleSize(lod);

/** The size of one sample at a level, for anyone who needs it named. */
export const sampleSizeAt = (lod: Lod): number =>
  lodSampleSize(lod) || VOXEL_SIZE;
