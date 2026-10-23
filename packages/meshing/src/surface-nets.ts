/**
 * Naive Surface Nets.
 *
 * For every cell whose eight corner samples disagree on sign, emit **one** vertex,
 * placed at the average of the crossings along that cell's edges; then, for every
 * primal edge where the sign changes, emit a quad from the four cells sharing it.
 *
 * **The vertex can be the QEF minimum instead of the mean** (`vertexPlacement`), which is
 * Dual Contouring's vertex placement. The cells, the quads and every ownership rule are
 * unchanged; only the point inside the cell moves, from between the faces to the line or
 * corner where they meet. See `qef.ts` and ADR 0055.
 *
 * Chosen over marching cubes (ADR 0003) for three reasons that all matter here: one
 * vertex per cell rather than two to five triangles; no 256-entry table and no
 * ambiguous cases; and a surface that reads as smooth where marching cubes' reads as
 * voxelised.
 *
 * ## The seam rule, and why it is the only subtle thing here
 *
 * A chunk owns a range of **cells**, and a quad belongs to a primal **edge**. The
 * four cells around an edge straddle chunk boundaries — the edge at the interface has
 * cells on either side of it — so "each chunk meshes its own cells" does not say who
 * emits the interface quads. Both halves would, or neither would, and both produce a
 * visible artefact: duplicated geometry, or a crack.
 *
 * The rule is: **each chunk owns the edges lying within its own cells' span, and
 * takes the four cells it needs from one cell of padding on the low side.**
 *
 *     a chunk owning cells [base, base + n) emits edges at [base, base + n)
 *
 * Neighbouring chunks therefore emit consecutive, disjoint runs, every edge in the
 * world is emitted exactly once, and no stitching is involved. The reference
 * implementation states the same property in one line — *faces are not generated on a
 * chunk's positive boundaries* — and this is the same rule written as what each chunk
 * *does* rather than what it avoids.
 *
 * ## Index layout
 *
 * With `n` samples a chunk owns per axis, and `O` the world position of its own first
 * sample's voxel:
 *
 * - the sample array holds `n + 2` per axis, indices `0 .. n + 1`
 * - sample `s` is at world `O + (s - 1)`, so indices `1 .. n` are the chunk's own
 * - cell `c` spans samples `c` and `c + 1`, so cell `c` is the cell of world voxel
 *   `O + c - 1`, and there are `n + 1` cells, indices `0 .. n`
 * - cell `0` is therefore one cell of **low padding**, and exists only to give the
 *   interface edges their vertices
 * - an edge leaves grid point `p` toward `p + e`; the four cells sharing it all have
 *   index `p` on the edge's own axis, and `p - 1` or `p` on each of the other two
 *
 * Those four-cell indices are what fix the loop ranges. `p` must be `1 .. n` on the
 * edge's own axis to be owned, and `1 .. n` on the other two so that `p - 1` still
 * names a cell. One range, both reasons.
 *
 * ## A chunk may own cells outside its own extent
 *
 * `extra` widens the run of owned cells per axis, to `1 .. n + extra`, and everything
 * above follows from that: the grid is two larger than the run rather than than `n`, and
 * the grid is rectangular rather than cubic, so the strides come off the cell counts
 * instead of off one `cells`.
 *
 * The run still *begins* at `origin`, so a caller whose extra cell lies below its chunk
 * says so by lowering `origin` rather than by asking for a negative index. That is the
 * whole reason the parameter is a count per axis and not a range: a chunk reaching into
 * its neighbour on one face should own one extra cell, not a shell of them.
 *
 * ## A cell may be refused, and a second field sampled to say why
 *
 * `cellGate` exists for the case where a surface should stop against another surface
 * that something else already draws: the sea's surface, which is everywhere as a sphere
 * but is water only where it stands in open air, and is buried in the landscape
 * everywhere else. The gate is asked, per cell, whether any of that cell's corners is
 * inside the ground, and a cell it refuses gets no vertex — and therefore no quads,
 * because a quad naming a missing vertex is already refused. `marker` is the ground,
 * sampled in the same pass as the water, so the cell loop never has to touch a field.
 * `SurfaceNetsParams.cellGate` says why a CSG difference is not the same thing done
 * more cheaply.
 *
 * ## The broad pass, and what it is worth on a landscape
 *
 * Sampling the field is most of a mesh — on this repository's own terrain, measured, 76 per cent
 * of a 32-sample chunk — and most of what it samples is nothing at all. A streamed chunk is a
 * window onto a world rather than a model in a box, so most of the volume in it is open air above
 * the landscape or deep rock below it, and a block of the grid sitting wholly in either holds no
 * surface and can say so without asking.
 *
 * `softness` is the caller saying what its field is made of, and giving it turns that on.
 * Measured against this package's own terrain at the game's chunk size, through the real chunk
 * mesher rather than the mesher alone, the pass removes **85 per cent of the field evaluations**
 * at level of detail 0 and 72 at level 1, and takes a chunk from **76.9 ms to 41.6** — 1.85
 * times, which is less than the share of samples suggests because colour and normals do not get
 * cheaper with them. At level 2 it removes 26 per cent and is not worth much.
 *
 * **The proof, the reach and the block arithmetic are in `broad-pass.ts`**, because they are not
 * this algorithm's: both meshers sample the same grid the same way, and the saving is in the
 * sampling. **The mesh is byte-identical either way** — a dropped block is *filled* with a
 * constant on the side of the surface its own corners say it is on, rather than skipped, so the
 * cell loop is left exactly as it was and declines the block's cells itself.
 *
 * **And it declines where it cannot be shown to be right.** A warped region — one carrying
 * `positionAt`, which is a patch of a cube face on a planet — has no per-axis spacing for a
 * half-diagonal to be computed from, so the pass is declined there and those chunks are sampled in
 * full. That is the shape `apps/spacescape` uses for a planet's surface, and the reason the win is
 * not unbounded.
 */

import { FAR_DISTANCE } from "@big-mesh-studios/core";

import {
  broadPassBlockExtent,
  broadPassBlocks,
  broadPassReachAcross,
  broadPassRuns,
  BROAD_PASS_UNIT,
  nextBroadPlane,
} from "./broad-pass";
import { QEF_REFINE_COS, QEF_REFINE_MIXED, QefScratch } from "./qef";

/** What the mesher needs from whatever it is meshing. */
export interface SurfaceSampler {
  /** Signed distance at a world position; negative inside. */
  distance(x: number, y: number, z: number): number;
}

/**
 * Told how far through a mesher is, as a count of work units against the whole.
 *
 * **Counts rather than a fraction because the passes are not the same size.** `surfaceNets`
 * samples `grid³` values, walks `cells³` cells and then walks `owned³` edges; `marchingCubes`
 * samples `grid³` values and walks `cells³` cells. A caller drawing a bar cannot divide one by
 * the other without knowing all of them, which is exactly the arithmetic the mesher already
 * has in hand.
 *
 * **`done` reaches `total` exactly once, on the last slice of the mesher's last pass.** That is
 * what lets a caller treat the last message as "finished" rather than watching for a fraction
 * that rounds to one — which is the difference between a bar that completes and a bar that sits
 * at 99% waiting for something that never arrives.
 *
 * **Optional everywhere, and absent means the mesher counts nothing.** A call on the outer `z`
 * loop of each pass rather than the inner `x` one, so a mesh that wants no progress pays one
 * comparison and one empty call per slice — which is why there is no "call it every N slices"
 * mode to tune.
 *
 * **A `marker` pass is not counted.** It is a second field sampled between the first and the
 * cell loop, it exists only for `cellGate`, and only the sea in `apps/spacescape` uses one; a
 * caller watching a bar would see it run slightly fast rather than stall, and that is the
 * better of the two failures.
 */
export type MeshProgress = (done: number, total: number) => void;

/** A mesh being accumulated into. Passed in so a thread reuses one for every chunk. */
export interface SurfaceOutput {
  clear(): void;
  vertexCount: number;
  /** Appends a vertex at a world position. Returns its index. */
  vertex(x: number, y: number, z: number): number;
  /**
   * Appends two triangles from four existing vertices, in the order given.
   *
   * **A quad and not a triangle because every dual method emits quads**, and an output that
   * only took triangles would have the other half of this seam added for a primal method's sake.
   */
  quad(a: number, b: number, c: number, d: number): void;
  /**
   * Appends one triangle from three existing vertices.
   *
   * **Optional, and that is the point of it being optional rather than absent.** Surface nets
   * never calls it, and a `SurfaceOutput` that a test writes by hand should not have to
   * implement a method nothing will call. A mesher that needs it and does not find it throws
   * rather than silently dropping triangles.
   */
  triangle?(a: number, b: number, c: number): void;
}

/** Appends one triangle, refusing to say nothing if the output cannot take one. */
export const emitTriangle = (
  out: SurfaceOutput,
  a: number,
  b: number,
  c: number,
): void => {
  if (out.triangle === undefined) {
    throw new Error("this SurfaceOutput cannot take a triangle");
  }
  out.triangle(a, b, c);
};

/** The eight corners of a cell, as offsets from its low corner. */
const CORNER_OFFSETS = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
] as const;

/**
 * The twelve edges of a cell, as pairs of its corner indices.
 *
 * Six along the cell's own axes and six across its faces. The face-crossing ones are
 * why a cell's vertex is a weighted average of crossings that are not all parallel to
 * anything in particular.
 */
const CELL_EDGES = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

/**
 * The trilinear interpolant's gradient at a point in a cell, as a unit normal.
 *
 * **The eight corner samples are the whole input**, which is what makes this seam-safe: a
 * shared cell is the same eight numbers in both chunks, so both compute the same direction
 * without sampling the field again. The gradient is taken in cell fractions and divided by
 * each axis's span so that a cell wider on one axis still produces a world-space direction.
 *
 * Returns `false` for a gradient that has no direction or is not finite; the caller falls
 * back to the centroid rather than writing a zero normal.
 */
const cornerNormal = (
  corners: Float32Array,
  u: number,
  v: number,
  w: number,
  spanX: number,
  spanY: number,
  spanZ: number,
  out: { x: number; y: number; z: number },
): boolean => {
  const f000 = corners[0] as number;
  const f100 = corners[1] as number;
  const f010 = corners[2] as number;
  const f110 = corners[3] as number;
  const f001 = corners[4] as number;
  const f101 = corners[5] as number;
  const f011 = corners[6] as number;
  const f111 = corners[7] as number;

  const iu = 1 - u;
  const iv = 1 - v;
  const iw = 1 - w;

  // ∂F/∂u, ∂F/∂v and ∂F/∂w of the trilinear interpolant. Written out rather than through a
  // weight loop because this is the innermost arithmetic of a QEF cell and the eight terms
  // are the whole of it.
  const gx =
    (f100 - f000) * iv * iw +
    (f110 - f010) * v * iw +
    (f101 - f001) * iv * w +
    (f111 - f011) * v * w;
  const gy =
    (f010 - f000) * iu * iw +
    (f110 - f100) * u * iw +
    (f011 - f001) * iu * w +
    (f111 - f101) * u * w;
  const gz =
    (f001 - f000) * iu * iv +
    (f101 - f100) * u * iv +
    (f011 - f010) * iu * v +
    (f111 - f110) * u * v;

  // Fractions per cell, world units per fraction. A degenerate lane would divide by zero;
  // one is the only finite stand-in and a cell with no width has no normal worth keeping.
  const worldX = gx / (spanX || 1);
  const worldY = gy / (spanY || 1);
  const worldZ = gz / (spanZ || 1);
  const length = Math.hypot(worldX, worldY, worldZ);
  if (!(length > 0) || !Number.isFinite(length)) return false;
  out.x = worldX / length;
  out.y = worldY / length;
  out.z = worldZ / length;
  return true;
};

/**
 * Whether a cell's eight samples are far enough from linear that a corner gradient is
 * describing a blend rather than a plane.
 *
 * **The mixed differences are free, and they are the signal a normal spread misses.** A
 * box corner's three crossings all see the same diagonal trilinear gradient, so their
 * normals agree while the surface has three planes; a linear field has zero mixed
 * differences, a resolved sphere has about a hundredth of a cell, and a corner has most of
 * one. See `QEF_REFINE_MIXED`.
 */
const cellDeviatesFromLinear = (
  corners: Float32Array,
  span: number,
): boolean => {
  const f000 = corners[0] as number;
  const f100 = corners[1] as number;
  const f010 = corners[2] as number;
  const f110 = corners[3] as number;
  const f001 = corners[4] as number;
  const f101 = corners[5] as number;
  const f011 = corners[6] as number;
  const f111 = corners[7] as number;
  const mixed = Math.max(
    Math.abs(f000 - f100 - f010 + f110),
    Math.abs(f000 - f100 - f001 + f101),
    Math.abs(f000 - f010 - f001 + f011),
    Math.abs(f000 - f100 - f010 - f001 + f110 + f101 + f011 - f111),
  );
  return mixed > Math.abs(span) * QEF_REFINE_MIXED;
};

/**
 * Samples a chunk owns per axis: `n`. The grid holds one more on each side.
 *
 * Only one on the low side is ever needed — the seam rule puts every chunk's low cell
 * at index 0 and its last own cell at index `n`, which needs samples `n` and `n + 1`.
 * Both sides are padded so the sampling loop is a plain cube rather than a special case
 * on the high edge.
 *
 * `extra` is the most this will ever be asked for beyond `n`, which is what a buffer has
 * to be sized for: a chunk that owns cells past its own extent needs a bigger grid, and a
 * buffer one cell short of the grid does not fail loudly — it drops the writes past its
 * end and reads air in their place.
 */
export const SURFACE_NETS_GRID = (samplesPerAxis: number, extra = 0): number =>
  samplesPerAxis + extra + 2;

/** Cells along an axis: one more than the grid. */
export const SURFACE_NETS_CELLS = (samplesPerAxis: number, extra = 0): number =>
  samplesPerAxis + extra + 1;

/** Reusable per-thread buffers, sized for one chunk shape and then reused. */
export class SurfaceNetsScratch {
  readonly samples: Float32Array;
  /**
   * The `marker` field's values, at the same samples. See `SurfaceNetsParams.marker`.
   *
   * **Allocated and left zeroed for every caller, including the ones that give no
   * marker**, so `cellGate` can read it without asking whether there was one: a cell with
   * no marker reads as uniformly out of the ground, which is the answer that lets a gate
   * written for the sea run on a mesh that was not given a landscape.
   */
  readonly marks: Float32Array;
  /** Cell index to emitted vertex index, or -1. Fixed size: a lookup, not a log. */
  readonly cellVertex: Int32Array;
  /**
   * One flag per broad-pass block: `1` where the block provably holds no surface.
   *
   * **Written every rebuild and never cleared**, which is safe only because the broad pass writes
   * all of them before either sampling pass reads any. A rebuild that *declines* the pass writes
   * zeros over all of them rather than leaving them, and a rebuild that does run rewrites them
   * all, so neither can read a stale flag from a chunk with a different blend in it.
   *
   * **A byte per block rather than a bit, because there are few enough of them to be free.** At a
   * 32-sample chunk this is 729 bytes, and a bitset would be four passes of shifting to save
   * nothing.
   */
  readonly blockEmpty: Uint8Array;
  /** The eight corner samples of the cell being considered. */
  readonly corners = new Float32Array(8);
  /** The eight corner marker values of that same cell. */
  readonly cornerMarks = new Float32Array(8);
  /**
   * The crossings and QEF solve for the cell being placed.
   *
   * Allocated for every caller and left alone by centroid placement, because it is a fixed
   * dozen crossings rather than something sized by the grid — and a branch that allocated it
   * on first use would be a branch in the cell loop for a buffer smaller than the cell's own
   * corner arrays.
   */
  readonly qef = new QefScratch();

  /**
   * @param samplesPerAxis samples on each axis, or the three counts when they differ.
   *
   * **Per-axis because a region on a sphere is not cubic.** A patch of a cube face is square in its
   * own two parameters but is sampled across a radial depth as well, and the three counts are set
   * by what is being sampled rather than by the shape of the chunk. A scalar constructor is kept
   * because every existing caller is cubic and passing three equal numbers to say so is noise.
   */
  constructor(
    samplesPerAxis: number | readonly [number, number, number],
    maxExtra: number | readonly [number, number, number] = 0,
  ) {
    const [nx, ny, nz] = perAxis(samplesPerAxis);
    const [ex, ey, ez] = perAxis(maxExtra);
    const gx = SURFACE_NETS_GRID(nx, ex);
    const gy = SURFACE_NETS_GRID(ny, ey);
    const gz = SURFACE_NETS_GRID(nz, ez);
    const cx = SURFACE_NETS_CELLS(nx, ex);
    const cy = SURFACE_NETS_CELLS(ny, ey);
    const cz = SURFACE_NETS_CELLS(nz, ez);
    this.samples = new Float32Array(gx * gy * gz);
    this.marks = new Float32Array(gx * gy * gz);
    this.cellVertex = new Int32Array(cx * cy * cz);
    const bx = broadPassBlocks(gx);
    const by = broadPassBlocks(gy);
    const bz = broadPassBlocks(gz);
    this.blockEmpty = new Uint8Array(bx * by * bz);
  }
}

/**
 * Three counts from either three counts or one.
 *
 * **A scalar means all three, which is every existing call.** The alternative — three required
 * numbers everywhere — would put `[32, 32, 32]` at nine call sites to say "a cube", and the ones
 * that are genuinely cubic would stop looking cubic.
 */
const perAxis = (
  n: number | readonly [number, number, number],
): readonly [number, number, number] => (typeof n === "number" ? [n, n, n] : n);

export interface SurfaceNetsParams {
  /** The world position of the chunk's own first sample's voxel. */
  origin: readonly [number, number, number];
  /**
   * Samples this chunk owns, per axis. The sample grid is two larger on each.
   *
   * A scalar is all three, which is every chunk on a cubic lattice. **A patch of a cube face is
   * not cubic** — it is square in its two face parameters and sampled across a radial depth — so it
   * passes three.
   */
  samples: number | readonly [number, number, number];
  /**
   * Cells this chunk owns beyond `samples`, on each axis.
   *
   * **A chunk reaching into its neighbour's ground.** The run of owned cells becomes
   * `1 .. samples + extra`, which is what closes a level-of-detail seam: the coarser of
   * two neighbouring chunks meshes one cell into the finer one, so their two surfaces
   * overlap across the plane between them instead of stopping on it and leaving a slit
   * (ADR 0035).
   *
   * The run still begins at `origin`, so an extra cell on an axis's *low* side is a lower
   * `origin` rather than a negative cell index, and the axes are independent — one finer
   * neighbour on one face costs one cell rather than a shell of them on all six.
   *
   * Optional, and absent means none, which is the case every other caller is.
   */
  extra?: readonly [number, number, number];
  /** World units between samples. Ignored where `lanes` is given. */
  sampleSize: number;
  /**
   * Where each sample actually sits on each axis, when that is not a single spacing.
   *
   * **Optional, and the uniform case is not a special case in the loops.** Omitting it
   * builds the even lane `origin + (s - 1) * sampleSize` once and then runs the same code
   * as any other lane set, so there is one code path rather than two that have to agree.
   *
   * It exists because "evenly spaced" is an assumption about the *world*, not about this
   * algorithm, and at a level-of-detail boundary it stops being true. A coarse chunk and a
   * fine one put their owned cells either side of the shared plane — a fine chunk's last
   * cell ends at `x = 160` and a coarse one's begins at `x = 160` — so a chunk that refined
   * its own boundary shell would have cells of two different widths, and a vertex placed
   * by `origin + (c - 0.5) * sampleSize` would be in the wrong place by the difference.
   *
   * Giving the algorithm the sample positions rather than a spacing is what lets that be
   * expressed at all; the crossing parameter itself is unchanged, because a linear
   * interpolation crosses zero at the same *fraction* of an edge whatever its length.
   */
  lanes?: SampleLanes;
  /**
   * Where the sample at a grid index sits, given the index rather than the position.
   *
   * **This is what makes a warped region meshable, and `lanes` could not do it.** `lanes` gives each
   * axis its own list of positions, so it describes a grid whose sample positions are *separable* —
   * axis `x`'s positions do not depend on `y` or `z`. A region on a sphere is not separable: the
   * sample at face parameters `(u, v)` and radial depth `w` sits at `directionAt(u, v) · (r + w)`,
   * so every position depends on all three indices at once. No product of three per-axis lists can
   * express that.
   *
   * **Positions and not values, because a vertex is placed from positions.** A value-only hook was
   * tried first and it silently produced nonsense: the samples were right, and the vertices came
   * out at a radius of 8 on a planet of radius 4000, because a dual vertex is placed by
   * interpolating along the cell's edges and that interpolation was reading the *lane* positions —
   * which for a warped grid are the placeholders above. There is no way to place a vertex from
   * values alone.
   *
   * Given one, `lanes`, `origin` and `sampleSize` are unused — but they are still required, because
   * `lanes` is how a caller says where a *separable* grid runs and the two are alternatives rather
   * than additions.
   */
  positionAt?: (
    x: number,
    y: number,
    z: number,
  ) => readonly [number, number, number];
  /**
   * Where the vertex in a crossing cell goes: the crossing mean, or the QEF minimum.
   *
   * **Centroid is Surface Nets and QEF is Dual Contouring**, and the connectivity is the
   * same either way: one vertex a crossing cell, one quad a sign-changing primal edge. Only
   * the point inside the cell changes, which is why this can be a parameter rather than a
   * second mesher — the seam rule, the overlap, the cell gate and the broad pass are all
   * statements about cells and edges and do not care where in the cell the vertex sits.
   *
   * **`"qef"` needs `normalAt`**, and a caller that asks for it without one gets an error
   * rather than a silent return to the mean. The two produce visibly different boxes, and a
   * silent fallback would be a setting that did nothing.
   */
  vertexPlacement?: "centroid" | "qef";
  /**
   * The surface normal at a world position, for QEF placement.
   *
   * **Asked at every edge crossing when `normalFromCorners` is off, and only for a cell that
   * touches a dropped broad-pass block or is refined as a feature when it is on.** It must
   * be a pure function of position: two neighbouring chunks compute the same crossing
   * position for a shared cell and must get the same normal, or their vertices stop
   * coinciding and the seam opens. A gradient sampled from the chunk's own grid does not
   * satisfy that — one side's padding cell reads a different neighbourhood — which is why
   * the intended answer is a finite difference of the field at the crossing position rather
   * than of the chunk's sample buffer.
   *
   * Ignored when `vertexPlacement` is `"centroid"`.
   */
  normalAt?: (
    x: number,
    y: number,
    z: number,
  ) => readonly [number, number, number];
  /**
   * Take a crossing's normal from the cell's own eight samples instead of `normalAt`.
   *
   * **The cheap path, and the seam-safe one.** A cell's eight corners are the same eight
   * numbers in every chunk that owns it, so a finite difference built only from them cannot
   * disagree across a seam; it costs a handful of arithmetic rather than four field samples a
   * crossing. The answer is the trilinear interpolant's gradient at the crossing, which is a
   * smoothed estimate of the field — enough to place a crease, not enough to be the field's
   * gradient.
   *
   * **It needs `normalAt` as a fallback when the broad pass is on.** A dropped block is
   * filled with `FAR_DISTANCE`, so a crossing cell that touches one has corners that are not
   * measurements. Such a cell asks `normalAt` instead, which is why both may be given
   * together. A caller that gives neither, or gives only this and uses a broad pass, is
   * choosing an answer the mesher cannot make honest.
   *
   * Ignored on a warped grid, where a cell has no single axis-aligned corner frame; a QEF
   * warped caller must supply `normalAt`.
   */
  normalFromCorners?: boolean;
  /**
   * How strongly the QEF is pulled toward the crossing mean. Defaults to `QEF_BIAS`.
   *
   * See `qef.ts`: this is a regulariser for flat cells, not a shape control. Raising it
   * rounds the corners the method exists to preserve.
   */
  qefBias?: number;
  sampler: SurfaceSampler;
  out: SurfaceOutput;
  scratch: SurfaceNetsScratch;
  /**
   * Told each emitted vertex's world position, so a caller can fill in its normal and
   * colour without walking the positions array again.
   *
   * **The owning cell comes with it, because a caller cannot work it out.** Which cells a
   * chunk owns on its outer layer is what decides whether a vertex's face fan is clipped
   * by the chunk edge, and a clipped fan averages to a normal tilted towards whichever
   * faces survived — so a caller shading from the mesh's own faces rather than from the
   * field's gradient has to know the boundary from somewhere, and the mesher is the only
   * thing that knows where the cell walk is. The cell is the loop's own `(cx, cy, cz)`,
   * counted from zero on every axis including where an overlap has shifted the run.
   */
  onVertex?: (
    index: number,
    x: number,
    y: number,
    z: number,
    cell: readonly [number, number, number],
  ) => void;
  /**
   * Asked, for every cell whose corners disagree, whether that cell may carry a vertex
   * at all. Receives the cell's eight corner samples and, when a `marker` was given, the
   * eight marker values at the same corners.
   *
   * ## What it is for
   *
   * **A surface that ends against another one, where the other one is already drawn.**
   * The sea is a sphere of radius `seaLevel` and it is everywhere; only the part of it
   * standing in open air is water, and the rest is buried in the landscape, which draws
   * its own surface there. Meshing the whole sphere gives the visible sea *and* a second
   * copy of the seabed, coincident with the ground's own triangles — so it z-fights them
   * and doubles their count.
   *
   * The obvious fix is to clip with a CSG difference, `max(sea, −ground)`, and it is
   * worse: the zero set of that composite is the sea's surface *and* the ground's surface
   * below the waterline, because a difference's boundary is both operands' boundaries.
   * The unwanted half is the same seabed, arrived at from the other direction.
   *
   * ## Why it takes a second value rather than reading the composite
   *
   * **`max(sea, −ground) < 0` says a corner is in open water and nothing more.** It cannot
   * say whether a *positive* corner is above the waterline or inside the ground, and a
   * cell straddling the seabed differs from a cell straddling the sea only in which of
   * those its positive corners are. So the ground is sampled as its own `marker`, and the
   * gate is asked the question it can answer: is any corner of this cell inside the
   * ground?
   *
   * Refusing the cell leaves its vertex at `-1`, and `quadAcross` already refuses any quad
   * naming a vertex it does not have, so removing vertices cannot leave a half-emitted
   * quad behind.
   *
   * ## Why it cannot open a seam
   *
   * **The gate is a pure function of values sampled at the corners, and corner `c` of a
   * cell is sampled at the same world position in every chunk that owns it.** Two
   * neighbours asked about one shared cell are handed the same numbers in the same order
   * and therefore answer alike, which is the property the seam rule above exists to
   * preserve and the reason this is a per-cell predicate rather than a per-chunk one.
   *
   * ## What it costs
   *
   * One call per crossing cell, in the loop that already read its eight corners, plus one
   * extra sampling pass when a `marker` is given. Optional, and absent means every
   * crossing cell emits and no second pass runs — which is every other caller, and is why
   * this changes no existing output.
   */
  cellGate?: (
    corners: Float32Array,
    /** The `marker`'s values at the same corners, or a zero-filled buffer when none. */
    marks: Float32Array,
  ) => boolean;
  /**
   * A second field, sampled in the same pass as `sampler` and read only by `cellGate`.
   *
   * **Optional, and absent means the second buffer is left zeroed** — so a gate written
   * against `marks` still runs on a mesh with no marker, and sees a field that is
   * uniformly non-negative, which is the answer "nothing here is inside anything".
   */
  marker?: SurfaceSampler;
  /**
   * How far this field's value may over-report the true distance to the surface, in world units.
   *
   * **Zero for a field made of exact distances** — primitives composed with `min` and `max` and
   * nothing else — and the widest blend carried by any operation in the model otherwise. A caller
   * that knows what its field is made of says so here; see `broad-pass.ts` for why the mesher
   * cannot work it out for itself.
   *
   * **Giving it turns on the broad pass**, which drops blocks of the grid that provably hold no
   * surface and fills them with a constant instead of walking the field. On a streamed landscape
   * that is most of the work: a 32-sample chunk is mostly air above the ground and rock below it,
   * and measured on this repository's own terrain the pass removes 85 per cent of the samples at
   * level of detail 0 and 72 at level 1.
   *
   * **Above `BROAD_PASS_MAX_SOFTNESS`, or absent, it is declined** and every sample is taken as
   * before. Absent means "I do not know what this field is made of", and the answer to a question
   * a mesher cannot answer safely is the slow one: a broad pass that believed a value it should
   * not have would drop blocks holding real geometry.
   *
   * **Given, the mesh is byte-identical to the mesh without it** — the same vertices at the same
   * positions in the same order. A dropped block is filled rather than skipped, so the cell loop
   * reads the sign it would have read anyway and declines the block's cells itself.
   */
  softness?: number;
  /** Told how far through the three passes this mesh is. See `MeshProgress`. */
  onProgress?: MeshProgress;
}

/** World position of every sample index along one axis, `0 .. samples + 1`. */
export type SampleLane = Float64Array;

/** A sample lane per axis. */
export interface SampleLanes {
  readonly x: SampleLane;
  readonly y: SampleLane;
  readonly z: SampleLane;
}

/** The lane an evenly spaced grid would have: sample `s` sits at `origin + (s - 1) * step`. */
export const uniformLane = (
  origin: number,
  step: number,
  grid: number,
): SampleLane => {
  const lane = new Float64Array(grid);
  for (let s = 0; s < grid; s++) lane[s] = origin + (s - 1) * step;
  return lane;
};

/**
 * Meshes one chunk's surface into `out`, which is emptied first.
 *
 * Two passes, and the split is load-bearing. The first pass samples the field into a
 * scratch buffer and then never touches the field again; the cell loop reads only
 * that buffer. The field call is a tree walk in the operations (ADR 0004) and this is
 * the densest loop in the project, so interleaving the two would turn every one of
 * `grid³` samples into a cell walk as well.
 */
export const surfaceNets = (params: SurfaceNetsParams): void => {
  const { origin, samples, sampleSize, sampler, out, scratch } = params;

  // The run of owned cells, and the two grids around it. Cubic when no axis takes an
  // extra cell, which is every call but one kind, so the general form costs nothing to
  // read: `grid` is `owned + 2` and `cells` is one fewer than that.
  const extra = params.extra ?? NO_EXTRA;
  const counts = perAxis(samples);
  const ownedX = counts[0] + extra[0];
  const ownedY = counts[1] + extra[1];
  const ownedZ = counts[2] + extra[2];
  const gridX = SURFACE_NETS_GRID(ownedX);
  const gridY = SURFACE_NETS_GRID(ownedY);
  const gridZ = SURFACE_NETS_GRID(ownedZ);
  const cellsX = SURFACE_NETS_CELLS(ownedX);
  const cellsY = SURFACE_NETS_CELLS(ownedY);
  const cellsZ = SURFACE_NETS_CELLS(ownedZ);
  const STRIDES = cellStrides(cellsX, cellsY);

  // A scratch one cell short of the grid does not fail — it drops the writes past its end
  // and reads air in their place, which is a field that is solid everywhere reading as
  // half solid and the mesher inventing a surface in the middle of rock. The two grids
  // are separately sized and separately checked because either one alone can be short.
  if (scratch.samples.length < gridX * gridY * gridZ) {
    throw new Error(
      `surface nets: scratch holds ${scratch.samples.length} samples, this grid needs ${gridX * gridY * gridZ}`,
    );
  }
  if (scratch.cellVertex.length < cellsX * cellsY * cellsZ) {
    throw new Error(
      `surface nets: scratch holds ${scratch.cellVertex.length} cells, this grid needs ${cellsX * cellsY * cellsZ}`,
    );
  }

  /** Blocks along each axis, of the broad pass. Needed by the guard and the sampling loop alike. */
  const blocksX = broadPassBlocks(gridX);
  const blocksY = broadPassBlocks(gridY);
  const blocksZ = broadPassBlocks(gridZ);
  // **Checked with the other two rather than trusted, because a short one fails quietly.** A
  // `Uint8Array` read past its end is `undefined`, and `undefined === 1` is false, so a scratch
  // too small for this grid's blocks would drop nothing and produce the dense mesh — correct,
  // slower, and with nothing anywhere saying so. That is the one failure mode in this routine that
  // does not announce itself, which is the argument for asking here.
  if (scratch.blockEmpty.length < blocksX * blocksY * blocksZ) {
    throw new Error(
      `surface nets: scratch holds ${scratch.blockEmpty.length} broad-pass blocks, this grid needs ${blocksX * blocksY * blocksZ}`,
    );
  }

  // Where each sample sits on each axis, resolved once. An even grid is built rather than
  // special-cased in the loops below, so there is a single version of the hot code and it
  // is the version that supports uneven spacing.
  const px = params.lanes?.x ?? uniformLane(origin[0], sampleSize, gridX);
  const py = params.lanes?.y ?? uniformLane(origin[1], sampleSize, gridY);
  const pz = params.lanes?.z ?? uniformLane(origin[2], sampleSize, gridZ);

  out.clear();

  // The placement mode, resolved once. `qef` is the scratch buffer rather than a boolean so
  // the cell loop carries one branch on a defined value instead of two on a flag and a buffer.
  const placement = params.vertexPlacement ?? "centroid";
  const normalFromCorners = params.normalFromCorners === true;
  if (
    placement === "qef" &&
    params.normalAt === undefined &&
    !normalFromCorners
  ) {
    throw new Error(
      "surface nets: QEF placement needs a normalAt function or normalFromCorners to supply its Hermite data",
    );
  }
  // A warped cell has no axis-aligned corner frame to difference, so the cheap path cannot
  // describe it; a caller asking for both without a field normal gets an error rather than a
  // normal assembled from placeholder lanes.
  if (
    placement === "qef" &&
    normalFromCorners &&
    params.positionAt !== undefined &&
    params.normalAt === undefined
  ) {
    throw new Error(
      "surface nets: normalFromCorners cannot describe a warped grid; give normalAt as well",
    );
  }
  const qef = placement === "qef" ? scratch.qef : undefined;
  const normalAt = params.normalAt;
  const useCorners =
    qef !== undefined && normalFromCorners && !params.positionAt;
  /** Reused by `cornerNormal`; never escapes this call. */
  const cornerDirection = { x: 0, y: 0, z: 0 };

  const gate = params.cellGate;

  const sample = (x: number, y: number, z: number): number =>
    scratch.samples[(z * gridY + y) * gridX + x];

  const mark = (x: number, y: number, z: number): number =>
    scratch.marks[(z * gridY + y) * gridX + x];

  // **Two fill loops, not one with a branch.** The separable case is the hot path for every chunk
  // on a cubic lattice, and a branch there would sit in the innermost loop of the densest routine
  // in the project. The warped case is rare enough that duplicating four lines is the cheaper trade.
  const positionAt = params.positionAt;
  // **The work denominator, once, before any loop.** `onProgress` is resolved to a no-op rather
  // than left possibly-undefined so the three loops below carry one call each rather than a
  // check and a call.
  //
  // **Three terms because this mesher has three passes and the third is not a small one.** The
  // sample pass reads the field `grid³` times, the cell pass walks `cells³` cells, and the edge
  // pass walks `owned³` edges testing four samples each — at a 228-sample region that is twelve
  // million iterations, which is the same order as either of the others and not a tail to be
  // left out of the arithmetic. `marchingCubes` has no such pass and so has two terms, which is
  // why this is not shared between the two files.
  const progress = params.onProgress ?? noProgress;
  const sampleCount = gridX * gridY * gridZ;
  const cellCount = cellsX * cellsY * cellsZ;
  const edgeCount = ownedX * ownedY * ownedZ;

  /**
   * **Whether the broad pass runs, resolved once, before any loop.**
   *
   * **And why it is a flag and not a branch around the pass.** `empty` is then all zeros, so the
   * lattice runs and every block is evaluated — for the cost of the lattice, which is one point in
   * `step³` and a sixty-fourth of the grid at four. Declining this way rather than skipping the
   * work keeps the two paths identical in every respect except the flag, which is the only way a
   * "slow path" stays the same code as the fast one.
   *
   * **And a warped region declines it, because there is no reach to compute for one.** The proof
   * is about half a block's *diagonal*, which needs the block's extent in world units, and a grid
   * given `positionAt` has no per-axis spacing to take it from — a patch of a cube face is square
   * in its own two parameters and sampled across a radial depth, and its diagonal is a function of
   * all three indices at once. Computing one would mean evaluating `positionAt` at eight corners
   * a block, which is a reach derived from where the corners landed rather than from the geometry
   * the proof is about, so those chunks are sampled in full instead. `apps/spacescape` meshes a
   * planet's surface exactly this way (ADR 0038) and keeps its speed.
   */
  const blend = positionAt ? undefined : params.softness;
  const broad = broadPassRuns(blend, gridX, gridY, gridZ);
  const step = BROAD_PASS_UNIT;
  const empty = scratch.blockEmpty;
  const marker = params.marker;

  // **The lattice's cost, counted only when it is paid for.** The denominator has to describe the
  // work this mesh actually does, and a mesh that declined the pass never evaluates a lattice
  // point. The bar therefore runs slightly fast when the pass declines and exactly when it does
  // not — the better of the two failures `MeshProgress` already names.
  const latticeCount = broad ? blocksX * blocksY * blocksZ : 0;
  const totalWork = latticeCount + sampleCount + cellCount + edgeCount;

  if (positionAt) {
    for (let z = 0; z < gridZ; z++) {
      for (let y = 0; y < gridY; y++) {
        for (let x = 0; x < gridX; x++) {
          const p = positionAt(x, y, z);
          scratch.samples[(z * gridY + y) * gridX + x] = sampler.distance(
            p[0],
            p[1],
            p[2],
          );
        }
      }
      progress((z + 1) * gridX * gridY, totalWork);
    }
    // The marker, in a pass of its own rather than a branch inside the loop above.
    //
    // **Same position, same call shape, and skipped entirely when there is no marker** — which is
    // every caller but the sea's. A branch in the innermost loop of the densest routine in the
    // project would cost every chunk that has no use for one to save a loop only the sea pays.
    if (marker !== undefined) {
      for (let z = 0; z < gridZ; z++) {
        for (let y = 0; y < gridY; y++) {
          for (let x = 0; x < gridX; x++) {
            const p = positionAt(x, y, z);
            scratch.marks[(z * gridY + y) * gridX + x] = marker.distance(
              p[0],
              p[1],
              p[2],
            );
          }
        }
      }
    }
  } else {
    /**
     * **The lattice the cull reads, at one point in `step³`.**
     *
     * **Evaluated on its own and written where every other value goes**, because a corner belongs
     * to eight blocks and evaluating it eight times is eight times the cost of evaluating it once.
     * At four samples a side that is a sixty-fourth of the grid against the eight-in-sixty-four a
     * per-block test would spend.
     *
     * **The last coordinate is always sampled, and `grid - 1` is not a multiple of four.** The
     * block at the high edge is short, its corners are pulled in to the grid, and the pull-in can
     * land anywhere — so each axis steps by `step` until one more step would leave the grid, and
     * then visits `grid - 1`. Without it the last block would read `undefined`, and a `NaN` from
     * `Math.abs(undefined)` fails a `<=` comparison, which would drop that block on the strength
     * of a comparison that never happened.
     */
    for (let z = 0; z < gridZ; z = nextBroadPlane(z, gridZ)) {
      const wz = pz[z] as number;
      for (let y = 0; y < gridY; y = nextBroadPlane(y, gridY)) {
        const wy = py[y] as number;
        for (let x = 0; x < gridX; x = nextBroadPlane(x, gridX)) {
          scratch.samples[(z * gridY + y) * gridX + x] = sampler.distance(
            px[x] as number,
            wy,
            wz,
          );
        }
      }
    }

    for (let cz = 0; cz < blocksZ; cz++) {
      for (let cy = 0; cy < blocksY; cy++) {
        for (let cx = 0; cx < blocksX; cx++) {
          const slot = (cz * blocksY + cy) * blocksX + cx;
          // **Written rather than left, because a rebuild that ran the pass leaves `1`s behind and
          // one that did not must not read them.** That is the whole of the guarantee
          // `blockEmpty`'s own comment claims, and it costs one store per block.
          if (!broad) {
            empty[slot] = 0;
            continue;
          }
          const x0 = cx * step;
          const y0 = cy * step;
          const z0 = cz * step;
          const ex = broadPassBlockExtent(x0, gridX);
          const ey = broadPassBlockExtent(y0, gridY);
          const ez = broadPassBlockExtent(z0, gridZ);

          /**
           * **The reach is the half-diagonal of the block's own spans, read off the lanes.**
           *
           * `px[x0 + ex] − px[x0]` rather than `ex · sampleSize`, because a region may give per-axis
           * lanes and then the two are not the same number. For the even lane `uniformLane` builds,
           * they are — which is why this is not two code paths.
           */
          const reach = broadPassReachAcross(
            Math.abs((px[x0 + ex] as number) - (px[x0] as number)),
            Math.abs((py[y0 + ey] as number) - (py[y0] as number)),
            Math.abs((pz[z0 + ez] as number) - (pz[z0] as number)),
            blend,
          );

          let clear = true;
          outer: for (let dz = 0; dz <= 1; dz++) {
            const z = z0 + dz * ez;
            for (let dy = 0; dy <= 1; dy++) {
              const y = y0 + dy * ey;
              for (let dx = 0; dx <= 1; dx++) {
                const x = x0 + dx * ex;
                if (
                  Math.abs(
                    scratch.samples[(z * gridY + y) * gridX + x] as number,
                  ) <= reach
                ) {
                  clear = false;
                  break outer;
                }
              }
            }
          }
          empty[slot] = clear ? 1 : 0;
        }
      }
    }

    /**
     * **Every block's samples, filled one block at a time.**
     *
     * **Interiors partition the grid exactly.** Block `b` owns `[b·step, min(b·step + step, grid))`,
     * so every point is written once and once only — the cell loop needs every sample to have a
     * value, and it reads the planes between blocks as readily as anything else.
     *
     * **And it never fills past what the cull ruled out.** Where a block is short at the grid's
     * high edge, `broadPassBlockExtent` pulled its far corner in to `grid - 1` and the fill's
     * `Math.min` lands on the same index, so the two agree by construction rather than by two
     * pieces of arithmetic happening to match.
     */
    let sampled = 0;
    for (let bz = 0; bz < blocksZ; bz++) {
      const z0 = bz * step;
      const zEnd = Math.min(z0 + step, gridZ);
      for (let by = 0; by < blocksY; by++) {
        const y0 = by * step;
        const yEnd = Math.min(y0 + step, gridY);
        for (let bx = 0; bx < blocksX; bx++) {
          const x0 = bx * step;
          const xEnd = Math.min(x0 + step, gridX);
          sampled += (zEnd - z0) * (yEnd - y0) * (xEnd - x0);

          if (empty[(bz * blocksY + by) * blocksX + bx] === 1) {
            /**
             * **A constant, and the constant's sign is the block's own.** Every sample in a
             * dropped block is on the same side of the surface — a block holding both would hold a
             * crossing, and a crossing is what the cull rules out — so any of its corners says
             * which side, and `FAR_DISTANCE` out on that side is a value the field itself would
             * have given a point that far from everything. **A positive constant here would be
             * wrong in a way that shows**: a block buried inside a solid is dropped just as often
             * as one out in the open air, and filling it with air puts a surface along every one
             * of its faces that was not there.
             */
            const corner = scratch.samples[
              (z0 * gridY + y0) * gridX + x0
            ] as number;
            const away = corner < 0 ? -FAR_DISTANCE : FAR_DISTANCE;
            for (let z = z0; z < zEnd; z++) {
              for (let y = y0; y < yEnd; y++) {
                const row = (z * gridY + y) * gridX;
                scratch.samples.fill(away, row + x0, row + xEnd);
                /**
                 * **The marker is filled beside it, and the value does not matter.**
                 *
                 * The gate is asked about *cells*, and a cell in a dropped block is all one sign
                 * and is declined before the gate is reached — so these values decide nothing, and
                 * filling them with a constant, filling them with the previous chunk's depths, or
                 * not writing them at all all produce the same mesh. They are written because
                 * `marks` is documented as holding a value at every sample and a caller that
                 * reads it somewhere this file has not thought of is owed one; zero is what
                 * `cellGate` already promises a caller with no marker at all.
                 */
                if (marker !== undefined)
                  scratch.marks.fill(0, row + x0, row + xEnd);
              }
            }
            continue;
          }

          for (let z = z0; z < zEnd; z++) {
            const wz = pz[z] as number;
            for (let y = y0; y < yEnd; y++) {
              const row = (z * gridY + y) * gridX;
              const wy = py[y] as number;
              for (let x = x0; x < xEnd; x++) {
                scratch.samples[row + x] = sampler.distance(
                  px[x] as number,
                  wy,
                  wz,
                );
              }
              // **The marker rides in the same row, so a kept block costs one loop for both fields
              // and a dropped one costs none for either.** It is not a branch in the innermost loop:
              // it is outside it, once per row of the grid, which is `grid²` decisions against
              // `grid³` field calls.
              if (marker !== undefined) {
                for (let x = x0; x < xEnd; x++) {
                  scratch.marks[row + x] = marker.distance(
                    px[x] as number,
                    wy,
                    wz,
                  );
                }
              }
            }
          }
        }
      }
      progress(sampled, totalWork);
    }
  }

  if (marker === undefined && gate !== undefined) {
    // Zeroed for a gate that was given no marker, once per chunk rather than per sample: the
    // buffer is only read where a gate reads it, and a caller with no marker wants the same
    // answer every time rather than the last chunk's.
    scratch.marks.fill(0);
  }

  // The whole buffer, rather than the part this grid uses: it is sized for the widest grid
  // the thread will be asked for, and a leftover entry from a previous chunk would be read
  // as a vertex in this one.
  scratch.cellVertex.fill(-1);

  // ---- One vertex per cell whose corners disagree.
  for (let cz = 0; cz < cellsZ; cz++) {
    for (let cy = 0; cy < cellsY; cy++) {
      for (let cx = 0; cx < cellsX; cx++) {
        let inside = 0;
        for (let corner = 0; corner < 8; corner++) {
          const [dx, dy, dz] = CORNER_OFFSETS[corner];
          const value = sample(cx + dx, cy + dy, cz + dz);
          scratch.corners[corner] = value;
          if (value < 0) inside++;
        }
        // All eight corners one side: no crossing, so no vertex. This is where a chunk
        // that is entirely air or entirely solid costs eight reads per cell and
        // nothing else.
        if (inside === 0 || inside === 8) continue;

        // A cell the caller will not have. Its markers are gathered here rather than read
        // in place because the gate is handed both corners together and reads them as
        // pairs — see `SurfaceNetsParams.cellGate`, which is why this is here and not in
        // the gate itself.
        if (gate !== undefined) {
          if (marker !== undefined) {
            for (let corner = 0; corner < 8; corner++) {
              const [dx, dy, dz] = CORNER_OFFSETS[corner];
              scratch.cornerMarks[corner] = mark(cx + dx, cy + dy, cz + dz);
            }
          } else {
            scratch.cornerMarks.fill(0);
          }
          if (!gate(scratch.corners, scratch.cornerMarks)) continue;
        }

        // Empty before the crossings are gathered, and only for a cell the gate accepted —
        // a refused cell contributes no vertex and must not leave crossings for the next one.
        qef?.clear();

        // The cell's own spans. Every crossing of this cell shares them, and the corner
        // gradient divides its fraction-space answer by them to make a world direction.
        const spanX = (px[cx + 1] as number) - (px[cx] as number);
        const spanY = (py[cy + 1] as number) - (py[cy] as number);
        const spanZ = (pz[cz + 1] as number) - (pz[cz] as number);
        // A dropped broad-pass block is filled with the saturation value, not a measured
        // distance. Its sign is trustworthy (that is the pass's proof) but its magnitude is
        // not, so a cell touching one takes the field normal instead of a corner gradient.
        let cornersAreMeasurements = true;
        if (useCorners && normalAt !== undefined) {
          for (let corner = 0; corner < 8; corner++) {
            if (Math.abs(scratch.corners[corner] as number) >= FAR_DISTANCE) {
              cornersAreMeasurements = false;
              break;
            }
          }
        }
        // A cell that is not close to linear in its own eight samples is a cell a corner
        // gradient cannot describe; the field is asked for the crossings' normals even if
        // the corner normals happen to agree. See `cellDeviatesFromLinear`.
        const featureCell =
          useCorners &&
          normalAt !== undefined &&
          cellDeviatesFromLinear(
            scratch.corners,
            Math.max(Math.abs(spanX), Math.abs(spanY), Math.abs(spanZ)),
          );

        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;
        let crossings = 0;
        for (const [a, b] of CELL_EDGES) {
          const va = scratch.corners[a];
          const vb = scratch.corners[b];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          const ux = (a & 1) + t * ((b & 1) - (a & 1));
          const uy = (a & 2 ? 1 : 0) + t * ((b & 2 ? 1 : 0) - (a & 2 ? 1 : 0));
          const uz = (a & 4 ? 1 : 0) + t * ((b & 4 ? 1 : 0) - (a & 4 ? 1 : 0));
          sumX += ux;
          sumY += uy;
          sumZ += uz;
          crossings++;

          // **The crossing in world space, and its normal there.** The normal is what makes
          // this Dual Contouring rather than Surface Nets: a position alone cannot say that
          // two planes meet. See `qef.ts`.
          //
          // It is asked here rather than after the loop because the cell's lanes are already
          // in hand, and because the position the normal is asked at has to be the crossing
          // itself — a normal at the cell's centre describes no plane the crossings lie on.
          //
          // **Separable only.** A warped cell's `px`/`py`/`pz` are placeholders, so the
          // crossings are gathered again below where `positionAt` has put them in the world.
          if (qef !== undefined && positionAt === undefined) {
            const wx = (px[cx] as number) + ux * spanX;
            const wy = (py[cy] as number) + uy * spanY;
            const wz = (pz[cz] as number) + uz * spanZ;
            let nx = 0;
            let ny = 0;
            let nz = 0;
            let haveNormal = false;
            if (useCorners && cornersAreMeasurements) {
              haveNormal = cornerNormal(
                scratch.corners,
                ux,
                uy,
                uz,
                spanX,
                spanY,
                spanZ,
                cornerDirection,
              );
              if (haveNormal) {
                nx = cornerDirection.x;
                ny = cornerDirection.y;
                nz = cornerDirection.z;
              }
            }
            if (!haveNormal && normalAt !== undefined) {
              const normal = normalAt(wx, wy, wz);
              nx = normal[0];
              ny = normal[1];
              nz = normal[2];
              haveNormal = true;
            }
            // A crossing with no direction is still part of the mass point; the solver
            // ignores a zero normal for the planes but not for the mean.
            qef.add(
              wx,
              wy,
              wz,
              haveNormal ? nx : 0,
              haveNormal ? ny : 0,
              haveNormal ? nz : 0,
            );
          }
        }

        // Where the vertex goes, and the reason there are two ways to work it out.
        //
        // **Separable: the average is in the cell's own corner coordinates, 0..1, on each axis.**
        // That is a *fraction of the cell*, not a distance, which is why it survives the cell being
        // a different width from its neighbours: the cell's own two samples give where its low
        // corner is and how wide it is, and the fraction says how far along it the crossing fell.
        // Subtracting a half centres it on the cell, which is what makes it a dual vertex rather
        // than a point somewhere near one. Cell `c` is the cell of world voxel `origin + c - 1`,
        // so its own samples are `c` and `c + 1` on the lane and its centre is their middle.
        //
        // **Warped: the same fractions, but interpolated between the corners' actual positions.**
        // The separable arithmetic cannot be reused, because it assumes each axis moves at its own
        // constant rate — which is exactly what a warped grid does not do. So each crossing is
        // taken along its edge in three dimensions and the vertex is the mean of those points.
        // This costs twelve position lookups per cell instead of six array reads, which is why it
        // is not the default.
        let worldX: number;
        let worldY: number;
        let worldZ: number;
        if (positionAt) {
          let ax = 0;
          let ay = 0;
          let az = 0;
          let n = 0;
          for (let e = 0; e < CELL_EDGES.length; e++) {
            const ca = CELL_EDGES[e]![0];
            const cb = CELL_EDGES[e]![1];
            const [ax0, ay0, az0] = CORNER_OFFSETS[ca] as readonly [
              number,
              number,
              number,
            ];
            const [bx0, by0, bz0] = CORNER_OFFSETS[cb] as readonly [
              number,
              number,
              number,
            ];
            const va = sample(cx + ax0, cy + ay0, cz + az0);
            const vb = sample(cx + bx0, cy + by0, cz + bz0);
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            const pa = positionAt(cx + ax0, cy + ay0, cz + az0);
            const pb = positionAt(cx + bx0, cy + by0, cz + bz0);
            const wx = pa[0] + t * (pb[0] - pa[0]);
            const wy = pa[1] + t * (pb[1] - pa[1]);
            const wz = pa[2] + t * (pb[2] - pa[2]);
            ax += wx;
            ay += wy;
            az += wz;
            if (qef !== undefined) {
              const normal = normalAt!(wx, wy, wz);
              qef.add(wx, wy, wz, normal[0], normal[1], normal[2]);
            }
            n++;
          }
          // Both branches walk `CELL_EDGES`, so both count the same crossings and
          // `crossings === n`. It is not asserted at runtime — a mismatch would divide by a count
          // it did not earn, which is the kind of thing to catch in a test rather than in the
          // innermost loop of every mesh on the planet.
          worldX = ax / crossings;
          worldY = ay / crossings;
          worldZ = az / crossings;
        } else {
          worldX =
            (px[cx] as number) +
            (sumX / crossings) * ((px[cx + 1] as number) - (px[cx] as number));
          worldY =
            (py[cy] as number) +
            (sumY / crossings) * ((py[cy + 1] as number) - (py[cy] as number));
          worldZ =
            (pz[cz] as number) +
            (sumZ / crossings) * ((pz[cz + 1] as number) - (pz[cz] as number));
        }

        // **Corner normals are refined only where they disagree.** A flat face or a smooth
        // sphere has nothing to gain from the field's extra samples; a cell with two planes
        // in it does, because a trilinear gradient across them is a blend and a QEF built
        // from blends lands near the crease rather than on it.
        if (
          useCorners &&
          normalAt !== undefined &&
          (featureCell || qef.spreadCos() < QEF_REFINE_COS)
        ) {
          qef.refine(normalAt);
        }

        // **The QEF minimum replaces the mean, inside the same cell.** A separable cell's
        // bounds are its own two lane positions. A warped cell has no box in its own frame,
        // so the box is the bounds of its eight real corners: looser than the hexahedron,
        // and the right direction to be loose in because the answer only has to stay out of
        // the neighbour's cell.
        if (qef !== undefined) {
          let lowX: number;
          let lowY: number;
          let lowZ: number;
          let highX: number;
          let highY: number;
          let highZ: number;
          if (positionAt) {
            lowX = Infinity;
            lowY = Infinity;
            lowZ = Infinity;
            highX = -Infinity;
            highY = -Infinity;
            highZ = -Infinity;
            for (let corner = 0; corner < 8; corner++) {
              const [dx, dy, dz] = CORNER_OFFSETS[corner];
              const p = positionAt(cx + dx, cy + dy, cz + dz);
              if (p[0] < lowX) lowX = p[0];
              if (p[1] < lowY) lowY = p[1];
              if (p[2] < lowZ) lowZ = p[2];
              if (p[0] > highX) highX = p[0];
              if (p[1] > highY) highY = p[1];
              if (p[2] > highZ) highZ = p[2];
            }
          } else {
            lowX = px[cx] as number;
            lowY = py[cy] as number;
            lowZ = pz[cz] as number;
            highX = px[cx + 1] as number;
            highY = py[cy + 1] as number;
            highZ = pz[cz + 1] as number;
          }
          const placed = qef.solve(
            lowX,
            lowY,
            lowZ,
            highX,
            highY,
            highZ,
            params.qefBias,
            (x, y, z) => Math.abs(sampler.distance(x, y, z)),
          );
          worldX = placed.x;
          worldY = placed.y;
          worldZ = placed.z;
        }

        scratch.cellVertex[(cz * cellsY + cy) * cellsX + cx] = out.vertex(
          worldX,
          worldY,
          worldZ,
        );
        params.onVertex?.(
          scratch.cellVertex[(cz * cellsY + cy) * cellsX + cx],
          worldX,
          worldY,
          worldZ,
          [cx, cy, cz],
        );
      }
    }
    progress(
      latticeCount + sampleCount + (cz + 1) * cellsX * cellsY,
      totalWork,
    );
  }

  // ---- One quad per owned edge whose sign changes.
  //
  // `p` runs 1..owned on every axis: on the edge's own axis because that is the run of
  // edges this chunk owns, and on the other two because the four cells need `p - 1` to
  // name a cell.
  //
  // The four cells round an edge along `axis` all share the index `p` on that axis —
  // the edge lies between cells `p` and `p + 1`, and the four sharing it are the ones
  // at `p` — and take `p - 1` or `p` on the other two. Derived from strides rather
  // than written out three times, because writing it out three times is how the y and z
  // rows came to disagree with the x one.
  for (let pz = 1; pz <= ownedZ; pz++) {
    for (let py = 1; py <= ownedY; py++) {
      for (let px = 1; px <= ownedX; px++) {
        const base = (pz * cellsY + py) * cellsX + px;
        const nearInside = sample(px, py, pz) < 0;

        for (let axis = 0; axis < 3; axis++) {
          const farInside =
            axis === 0
              ? sample(px + 1, py, pz) < 0
              : axis === 1
                ? sample(px, py + 1, pz) < 0
                : sample(px, py, pz + 1) < 0;

          const acrossB = STRIDES[OTHER_AXES[axis][0]];
          const acrossC = STRIDES[OTHER_AXES[axis][1]];

          // A cycle round the edge: (b-1, c-1), (b, c-1), (b, c), (b-1, c).
          quadAcross(
            nearInside,
            farInside,
            [
              scratch.cellVertex[base - acrossB - acrossC],
              scratch.cellVertex[base - acrossC],
              scratch.cellVertex[base],
              scratch.cellVertex[base - acrossB],
            ],
            out,
          );
        }
      }
    }
    progress(
      latticeCount + sampleCount + cellCount + pz * ownedX * ownedY,
      totalWork,
    );
  }
};

/** The `onProgress` a mesher runs with when nobody is watching. */
const noProgress: MeshProgress = () => {};

/** The linear stride of one cell step along each axis, of a rectangular cell grid. */
const cellStrides = (cellsX: number, cellsY: number): readonly number[] => [
  1,
  cellsX,
  cellsX * cellsY,
];

/** The two axes other than each axis. */
const OTHER_AXES: readonly (readonly [number, number])[] = [
  [1, 2],
  [2, 0],
  [0, 1],
];

/**
 * Emits a quad if the sign changed, and only if all four of its cells have vertices.
 *
 * A cell with no vertex is one the surface did not cross, so the surface simply does
 * not reach this edge. Emitting a degenerate triangle there instead would put a
 * zero-area face in the mesh, which every normal calculation downstream has to
 * special-case and which casts as a black speck under any lighting.
 *
 * The winding is reversed depending on which end of the edge is inside, because the
 * cycle of cells round an edge is clockwise from one end and anticlockwise from the
 * other. Without it, half the world's quads face inward.
 */
const quadAcross = (
  nearInside: boolean,
  farInside: boolean,
  vertices: readonly number[],
  out: SurfaceOutput,
): void => {
  if (nearInside === farInside) return;
  for (const vertex of vertices) if (vertex < 0) return;
  if (nearInside) {
    out.quad(vertices[0], vertices[1], vertices[2], vertices[3]);
  } else {
    out.quad(vertices[0], vertices[3], vertices[2], vertices[1]);
  }
};

/** Scratch for a chunk meshing `samples` samples per axis, owning `maxExtra` more. */
export const scratchFor = (
  samples: number | readonly [number, number, number],
  maxExtra: number | readonly [number, number, number] = 0,
): SurfaceNetsScratch => new SurfaceNetsScratch(samples, maxExtra);

/** The default `extra`: a chunk that owns exactly the cells it was promised. */
const NO_EXTRA: readonly [number, number, number] = [0, 0, 0];
