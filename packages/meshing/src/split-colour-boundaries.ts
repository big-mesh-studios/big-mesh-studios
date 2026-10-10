/**
 * Putting a colour boundary on the mesh, where the field says one is.
 *
 * ## What is wrong without this
 *
 * **A colour is per vertex, and the rasteriser blends between vertices.** `ChunkMesh.colours`
 * is four bytes a vertex, filled from whatever the caller asked about that vertex's position —
 * so a model of two coloured shapes meeting has vertices of two colours, side by side, and
 * every triangle spanning the join comes out as a ramp between them. The join is as wide as
 * one cell and as soft as one interpolation. `Field.colourAt` is not at fault: it resolves
 * ownership by nearest own surface (`bvh.ts`), which is a rule with a genuine edge in it, and
 * the mesh simply cannot draw an edge.
 *
 * ## What this does about it
 *
 * **It stops asking the field where the boundary is, because the mesh already knows.**
 *
 * Every vertex was sampled through the ownership rule and holds the right answer. What is
 * missing is what happens *between* two vertices that disagree. So: for each mesh edge whose
 * endpoints carry different colours, find where along that edge the rule actually flips — by
 * bisection — and cut every triangle that has such an edge at those points.
 *
 * The alternative, which is the obvious one and is not this, is to give each triangle one
 * colour by sampling its centroid. That is sharp and it is wrong by up to half a cell: the
 * seam becomes a staircase of triangle edges, and on a figure a person is looking at closely,
 * half a cell is visible. Cutting on the edges makes the error second-order — the seam
 * follows the boundary to within the boundary's curvature *inside one triangle*, which is a
 * different order of small entirely.
 *
 * ## Why this cannot break the mesh
 *
 * **Because a crossing is a pure function of the two endpoints it lies between, and both
 * triangles sharing that edge compute it the same way.**
 *
 * That is the whole invariant, and everything else follows from it. Each edge is canonicalised
 * to its two endpoints in index order before it is searched, so the search does not depend on
 * which triangle asked. Both triangles cut at the identical position, so each half-edge still
 * has exactly two users, and `reportMesh` — which counts edges by rounded **position** rather
 * than by index, precisely because it expects meshes to hold two vertices in one place (see
 * its header) — sees the same mesh it saw before.
 *
 * A vertex's *valence* does rise: a crossing copy is a corner of one sub-triangle from the
 * triangle whose edge it was cut on, and of one more from the triangle on the other side of
 * that edge. Three in all. That is a vertex, and nothing here counts vertices.
 *
 * ## The rule that keeps it simple
 *
 * **Every edge whose endpoints disagree is cut, full stop — the cut is never declined.**
 *
 * That sounds like it needs a condition on it, and the condition it replaces was: a crossing
 * landing within `CROSSING_TOLERANCE` of an endpoint used to be refused as a sliver, and a
 * refused crossing left that edge uncut. Which is how this pass opened a hundred and twelve
 * holes in a sphere — because a triangle with one of its edges left uncut while the triangle on
 * the other side of it *was* cut has an edge that no other triangle names, and no amount of
 * position-welding hides that.
 *
 * Clamping the crossing to just inside the edge instead makes the rule unconditional, and the
 * whole of the awkward special-case handling goes with it. In particular a triangle can no
 * longer end up with exactly one cut edge, so it can no longer be in a state where it cannot be
 * partitioned. The number of edges on a triangle whose endpoints disagree is 0, 2 or 3 and
 * never 1, because disagreeing is a relation on a cycle: one corner differing from the other
 * two means two edges differ.
 *
 * ## Why marching cubes, and not surface nets
 *
 * **Because the edge being cut has to be lying on the surface for the cut to mean anything.**
 * Marching cubes puts every vertex on a true crossing, so an edge between two of them runs
 * along the surface and the crossing found on it is a true surface point. Surface nets places
 * one vertex per cell at the average of that cell's crossings, which is inside the cell and
 * therefore off the surface by up to half a cell — so an edge between two of them floats, and
 * a crossing found along it is somewhere near the surface rather than on it.
 *
 * ## What it costs
 *
 * **Triangles proportional to boundary length, not to the mesh.** A triangle with no cut edge
 * is emitted untouched and shares every vertex it already had. One with cut edges becomes at
 * most three. Field samples are spent only on disagreeing edges — one bisection each, on the
 * order of ten calls — so a model with a long colour join pays for the join and not for the
 * surface.
 *
 * The colour along an edge is sampled on the straight line between its endpoints, which is
 * inside the solid rather than on it. That is the same linear assumption `marchingCubes`
 * already makes about where a vertex is, so nothing new is being trusted; near a join, where
 * the surface is nearly tangent to the triangle, the two are close.
 */

import type { Rgb8 } from "@big-mesh-studios/core";

import type { ChunkMesh } from "./chunk-mesh";
import { Growable } from "./growable";

/**
 * How close to an endpoint a crossing may be cut, as a fraction of the edge.
 *
 * **A bound rather than a distance in world units**, for the reason `WELD_PRECISION` gives in
 * `mesh-report.ts`: the size of a point depends on how big the model is, and a fixed distance
 * cannot serve two scales at once.
 *
 * **It exists to keep a sub-triangle from having no area, and nothing else.** A cut right at an
 * endpoint bounds a region of zero area, which is how a mesh acquires a degenerate triangle —
 * one that every normal calculation downstream has to special-case and that a slicer prints as
 * a speck. Cutting a thousandth of the way in leaves a sliver too small to see and an area that
 * is genuinely there.
 */
export const CROSSING_TOLERANCE = 1e-3;

/**
 * The most bisection steps one crossing may take.
 *
 * **A ceiling rather than the stopping rule**, which is `CROSSING_TOLERANCE`. Ten steps
 * reaches it from a whole edge; twenty-four cannot be reached at all, and is here so that a
 * field which does not behave — one whose ownership rule is noisy at the scale of a cell —
 * costs a bounded amount rather than a variable one.
 */
export const CROSSING_MAX_STEPS = 24;

/** The floats one crossing costs: two endpoints of three, and the parameter between them. */
const CROSSING_STRIDE = 7;

/** The edges a triangle has. */
const EDGES = 3;

/**
 * What a point on the surface looks like, as far as this pass is concerned.
 *
 * **Structurally `Field.colourAt`'s own return, so that field passes straight in.** No import
 * from `packages/csg`: this package's contract is one method and whatever it returns, exactly
 * as `SurfaceSampler` is one method and a distance, and a mesh that can be re-cut against its
 * own colours must not require a CSG tree to say what those are.
 */
export interface BoundaryColour {
  readonly colour: Rgb8;
  /**
   * The fourth byte, whatever it currently means.
   *
   * **Named for the byte and not for its use, because the use changed and the pass did not.**
   * This was `opacity`, which no shader read; it is now a material id (ADR 0048). The pass
   * already keyed its boundary test on all four bytes and already cut where they disagreed, so a
   * material boundary is cut for free — which is the whole reason the byte was the place to put
   * one, and it costs this file nothing.
   */
  readonly material: number;
}

export interface ColourBoundaryOptions {
  /**
   * The colour of the surface at a world point.
   *
   * **The same rule that filled the vertices, and it has to be the same one.** This pass
   * brackets its bisection by asking at an endpoint and expecting the answer already written
   * there; a caller whose rule disagreed with its own vertices would find every search
   * unbracketed and no crossing anywhere, which is the correct response to inconsistent input
   * and a silent failure everywhere else.
   */
  readonly colourAt: (x: number, y: number, z: number) => BoundaryColour;
  /** How close to an endpoint a crossing may be cut. Defaults to `CROSSING_TOLERANCE`. */
  readonly tolerance?: number;
}

/**
 * Reusable buffers, sized for one mesh and then reused.
 *
 * **Because the alternative is the allocator.** `Growable` is what every other accumulation in
 * this package uses and the same reasoning as `MarchingCubesScratch` applies: a rebuild every
 * ninety milliseconds that allocates four arrays and a map each time makes the allocator the
 * second most expensive thing in the mesh.
 *
 * The three `Growable`s are parallel — slot `k` of each is the same crossing — because a
 * crossing is read together or not at all, and splitting it across records would mean three
 * indexings where one would do.
 */
export class ColourBoundaryScratch {
  /**
   * What each triangle found: a crossing per edge, and then where its middle piece began.
   *
   * **`-1` for an edge whose ends agree and for a triangle with no middle.** Four a triangle
   * because the three edges are read together constantly and the middle's index is looked up
   * once per triangle, and a second array for four values would be a worse trade than the
   * three bytes a triangle it costs.
   */
  slots: Int32Array = new Int32Array(0);
  /** `CROSSING_STRIDE` floats a crossing: an endpoint, another endpoint, and the parameter. */
  edges: Growable<Float32Array> = new Growable<Float32Array>(Float32Array, 256);
  /** The first endpoint's vertex index, a crossing. */
  edgeLow: Growable<Uint32Array> = new Growable<Uint32Array>(Uint32Array, 128);
  /** The second endpoint's vertex index, a crossing. */
  edgeHigh: Growable<Uint32Array> = new Growable<Uint32Array>(Uint32Array, 128);
  /**
   * Two colours a crossing: the first endpoint's, then the second's.
   *
   * **`Uint32Array` and not `Int32Array`**, because `0xRRGGBBAA` runs past `2^31` and a colour
   * is very often near white. Reinterpreting through `| 0` would be a bijection but would
   * collide with the `-1` that means "this edge does not cross", and that sentinel is worth
   * more than the arithmetic.
   */
  edgeColours: Growable<Uint32Array> = new Growable<Uint32Array>(
    Uint32Array,
    128,
  );
  /** A canonical edge — `low * vertexCount + high` — to the crossing that searched it. */
  readonly byEdge = new Map<number, number>();
  /**
   * The edge indices of a triangle's crossings, in walk order. **Reused rather than freshly
   * filtered, because a mesh of half a million triangles would otherwise allocate half a
   * million three-element arrays** and this is the one place in the pass that would.
   */
  readonly here: number[] = [];

  /** Grows what has to match the mesh and empties what does not. */
  reset(triangles: number): void {
    if (this.slots.length < triangles * SLOTS) {
      this.slots = new Int32Array(triangles * SLOTS);
    }
    this.slots.fill(-1, 0, triangles * SLOTS);
    this.edges.clear();
    this.edgeLow.clear();
    this.edgeHigh.clear();
    this.edgeColours.clear();
    this.byEdge.clear();
  }
}

/** Scratch for a mesh of this many triangles. */
export const colourBoundaryScratchFor = (
  triangles: number,
): ColourBoundaryScratch => {
  const scratch = new ColourBoundaryScratch();
  scratch.reset(triangles);
  return scratch;
};

/**
 * `mesh` with every triangle carrying a single colour, or `mesh` itself when it already does.
 *
 * **Returns the argument rather than a copy of it when there is nothing to do**, which is every
 * single-colour model and every drag ghost, and which is the only thing that makes this safe to
 * leave switched on. The bail is a triangle scan with no field calls in it at all.
 */
export const splitColourBoundaries = (
  mesh: ChunkMesh,
  options: ColourBoundaryOptions,
  scratch: ColourBoundaryScratch,
): ChunkMesh => {
  if (mesh.triangleCount === 0) return mesh;

  scratch.reset(mesh.triangleCount);
  if (!hasGradient(mesh)) return mesh;

  const crossings = findCrossings(
    mesh,
    options,
    scratch,
    options.tolerance ?? CROSSING_TOLERANCE,
  );
  // **A caller whose rule disagrees with its own vertices lands here.** Every bisection is
  // unbracketed, so no edge is cut, and a mesh with no cut edge cannot be made flat: the
  // regions this pass is built from are defined by crossings, and there is no second mechanism
  // to fall back on. Handing the argument back is the honest outcome, and cheaper than a copy
  // of itself.
  if (crossings === 0) return mesh;

  return rebuild(mesh, options, scratch, crossings);
};

/**
 * Whether any triangle has corners of more than one colour.
 *
 * **The whole of the bail, and it is worth being precise about why it asks about triangles and
 * not about vertices.** Two things look like "nothing to do" and only one of them is. A mesh
 * where no *vertex* is shared between two colours may still have every triangle blending: if a
 * colour boundary happens to run along the edges of the triangulation — which is exactly what
 * happens when it falls between two sample planes — then each vertex belongs entirely to one
 * side, no vertex is mixed, and yet a hundred and forty-odd triangles of a sphere go from one
 * colour to another across their width. Asking about vertices misses that entirely, and the
 * pass would hand back a mesh with the ramp still in it.
 *
 * So it asks the question it means: is there a triangle whose three corners would blend? One
 * pass over the index buffer, no field calls, no allocation.
 */
const hasGradient = (mesh: ChunkMesh): boolean => {
  for (let t = 0; t < mesh.triangleCount; t++) {
    const first = packed(mesh, mesh.indices[t * 3] as number);
    if (
      packed(mesh, mesh.indices[t * 3 + 1] as number) !== first ||
      packed(mesh, mesh.indices[t * 3 + 2] as number) !== first
    ) {
      return true;
    }
  }
  return false;
};

/** The packed key two packed colours are the same under, as `0xRRGGBBAA`. */
const packed = (mesh: ChunkMesh, vertex: number): number =>
  (((mesh.colours[vertex * 4] as number) << 24) |
    ((mesh.colours[vertex * 4 + 1] as number) << 16) |
    ((mesh.colours[vertex * 4 + 2] as number) << 8) |
    (mesh.colours[vertex * 4 + 3] as number)) >>>
  0;

/**
 * The key a `BoundaryColour` packs to: all four bytes, as `setColour` writes them.
 *
 * **Every byte counts and it always did.** The fourth was an opacity no shader read and is now a
 * material id (ADR 0048), so a wall of brick meeting a wall of plaster is cut here on exactly
 * the same terms as a red sphere meeting a blue box — which is the point of having put the
 * material in this byte rather than in a fourth attribute.
 */
const keyOf = ({ colour, material }: BoundaryColour): number =>
  ((colour.r << 24) | (colour.g << 16) | (colour.b << 8) | material) >>> 0;

/**
 * Every edge whose endpoints disagree, cut where the rule actually flips.
 *
 * **Canonicalised by index before it is searched, and that ordering is the watertightness
 * argument rather than a tidiness one.** Two triangles sharing an edge reach it in opposite
 * directions; if the search ran in walk order, one would bracket against the colour it arrived
 * at and the other against the colour it left, and with more than one flip along the edge they
 * would find *different* points. Ordering the endpoints by index first makes the search a
 * function of the edge alone, so both find the same one.
 *
 * **Bisection and not a linear solve, because the rule is categorical and has no zero.** The
 * predicate is "still the first endpoint's colour", bracketed at the outset — `t=0` because
 * that is the vertex's own colour, `t=1` because the endpoints differ — and needs no
 * monotonicity to converge. Three flips along one cell would be pathological, and both
 * triangles would still agree on which one they found, because they are running the same
 * search.
 *
 * @returns How many crossings the whole mesh holds.
 */
const findCrossings = (
  mesh: ChunkMesh,
  options: ColourBoundaryOptions,
  scratch: ColourBoundaryScratch,
  tolerance: number,
): number => {
  const { edgeLow, edgeHigh, edgeColours, byEdge, slots } = scratch;
  const count = mesh.vertexCount;
  const at = (vertex: number, axis: number): number =>
    mesh.positions[vertex * 3 + axis] as number;

  for (let t = 0; t < mesh.triangleCount; t++) {
    for (let e = 0; e < EDGES; e++) {
      const u = mesh.indices[t * 3 + e] as number;
      const v = mesh.indices[t * 3 + ((e + 1) % EDGES)] as number;
      const low = u < v ? u : v;
      const high = u < v ? v : u;
      const lowColour = packed(mesh, low);
      const highColour = packed(mesh, high);
      if (lowColour === highColour) continue;

      const edgeKey = low * count + high;
      const known = byEdge.get(edgeKey);
      if (known !== undefined) {
        slots[t * SLOTS + e] = known;
        continue;
      }

      const ax = at(low, 0);
      const ay = at(low, 1);
      const az = at(low, 2);
      const bx = at(high, 0);
      const by = at(high, 1);
      const bz = at(high, 2);

      // Bracketed by construction, and checked rather than assumed — see `colourAt` on
      // `ColourBoundaryOptions`. A caller whose rule disagrees with its own vertices gets no
      // crossings here, which is the honest answer to inconsistent input.
      if (keyOf(options.colourAt(ax, ay, az)) !== lowColour) continue;

      let near = 0;
      let far = 1;
      for (let step = 0; step < CROSSING_MAX_STEPS; step++) {
        if (far - near <= tolerance) break;
        const mid = (near + far) / 2;
        if (
          keyOf(
            options.colourAt(
              ax + (bx - ax) * mid,
              ay + (by - ay) * mid,
              az + (bz - az) * mid,
            ),
          ) === lowColour
        ) {
          near = mid;
        } else {
          far = mid;
        }
      }

      // **Clamped into the interior rather than refused.** See the header: refusing a crossing
      // leaves the edge uncut on both of the triangles that share it, and the one whose other
      // edges were cut is then a triangle naming an edge no other triangle names.
      let along = (far + near) / 2;
      if (along < tolerance) along = tolerance;
      else if (along > 1 - tolerance) along = 1 - tolerance;

      scratch.edges.pushMany([ax, ay, az, bx, by, bz, along]);
      edgeLow.push(low);
      edgeHigh.push(high);
      edgeColours.push(lowColour);
      edgeColours.push(highColour);
      const slot = edgeLow.size - 1;
      byEdge.set(edgeKey, slot);
      slots[t * SLOTS + e] = slot;
    }
  }
  return edgeLow.size;
};

/**
 * A crossing's output vertex carrying `colour` — the first endpoint's, or the second's.
 *
 * **Decided by comparing colours rather than by remembering the walk direction**, because the
 * canonical ordering the search uses is by index and says nothing about which end of the edge
 * the caller happened to be standing at.
 *
 * **One slot, two fixed places**: `base + slot * 2` and `base + slot * 2 + 1`. No record of
 * where a slot landed, so no way for one to disagree with another.
 */ const copyFor = (
  scratch: ColourBoundaryScratch,
  base: number,
  slot: number,
  colour: number,
): number =>
  scratch.edgeColours.at(slot * 2) === colour
    ? base + slot * 2
    : base + slot * 2 + 1;

/** How many slots a triangle holds: its three edges, and where its middle piece began. */
const SLOTS = 4;
/** The slot after the three edges, holding the middle piece's first vertex index. */
const MIDDLE = 3;

/** How many triangles have crossings on all three of their edges. */
const countMiddles = (scratch: ColourBoundaryScratch): number => {
  const { slots } = scratch;
  let count = 0;
  for (let t = 0; t * SLOTS < slots.length; t++) {
    if (
      (slots[t * SLOTS] as number) >= 0 &&
      (slots[t * SLOTS + 1] as number) >= 0 &&
      (slots[t * SLOTS + 2] as number) >= 0
    ) {
      count++;
    }
  }
  return count;
};

/**
 * The same mesh, and every triangle re-cut so that all three of a triangle's corners agree.
 *
 * **Original vertices keep their indices and their bytes.** That is what makes the pass cheap: a
 * triangle with no cut edge is emitted as three indices it already had, and the only new
 * vertices are the crossings, appended after the originals.
 */
const rebuild = (
  mesh: ChunkMesh,
  options: ColourBoundaryOptions,
  scratch: ColourBoundaryScratch,
  crossings: number,
): ChunkMesh => {
  const { positions, normalOct, colours, indices } = mesh;
  const triangles = mesh.triangleCount;
  const base = mesh.vertexCount;
  const middles = countMiddles(scratch);
  const middleBase = base + crossings * 2;
  const outCount = middleBase + middles * 3;

  const outPositions = new Float32Array(outCount * 3);
  const outNormalOct = new Int16Array(outCount * 2);
  const outColours = new Uint8Array(outCount * 4);
  outPositions.set(positions);
  outNormalOct.set(normalOct);
  outColours.set(colours);
  writeCrossings(
    mesh,
    scratch,
    crossings,
    outPositions,
    outNormalOct,
    outColours,
  );
  writeMiddles(
    mesh,
    options,
    scratch,
    middleBase,
    outPositions,
    outNormalOct,
    outColours,
  );

  // **Four a triangle at most**, which is a fact about the geometry rather than a guess. A
  // triangle with cut edges is cut into as many arcs of its boundary as it has crossings, and
  // the corner counts of those arcs sum to three however many there are — so the fans always
  // produce three triangles. Only the three-crossing case produces a fourth, the piece in the
  // middle, and only that one does.
  const outIndices = new Uint32Array(triangles * 12);
  let written = 0;
  const { slots, here } = scratch;

  for (let t = 0; t < triangles; t++) {
    const corners = [
      indices[t * 3] as number,
      indices[t * 3 + 1] as number,
      indices[t * 3 + 2] as number,
    ];

    /**
     * The edges carrying a crossing, as edge indices in walk order.
     *
     * **Indices and not slots, and that distinction is the whole of the region arithmetic
     * below**: a stretch between two crossings is described by *which edge* each is on, and a
     * slot number says only which record was written. A triangle whose edge `0` was the
     * fortieth crossing searched and whose edge `2` was the ninth would have its crossings at
     * slots 39 and 8, and arithmetic on those numbers lands on the wrong corners.
     */
    here.length = 0;
    for (let e = 0; e < EDGES; e++) {
      if ((slots[t * SLOTS + e] as number) >= 0) here.push(e);
    }

    if (here.length === 0) {
      // **Nothing to cut, so the triangle already agrees** — which is not a guess. A triangle
      // with no cut edge has no edge whose ends disagree, and colour is the same on both ends
      // of every edge of a closed triangle walk, so all three corners are one colour.
      outIndices[written++] = corners[0] as number;
      outIndices[written++] = corners[1] as number;
      outIndices[written++] = corners[2] as number;
      continue;
    }

    /**
     * **One region per arc.** Walking the boundary, the colour is constant between one crossing
     * and the next, so each such stretch plus the chord closing it is a region. The corners of a
     * stretch agree by construction — an edge inside it that was not cut has ends that do not
     * disagree — which is what lets each region's fan come out uniform.
     */
    for (let region = 0; region < here.length; region++) {
      const enterEdge = here[region] as number;
      const leaveEdge = here[(region + 1) % here.length] as number;
      // **Crossing `enterEdge` sits on the edge *ending* at corner `(enterEdge + 1) % 3`**, so
      // the stretch after it starts at that corner and runs to the corner `leaveEdge` ends at.
      // The `+ 3` before the second `%` is what makes the count positive: JavaScript's remainder
      // takes the sign of its left operand, and `leaveEdge` is very often the lower of the two.
      const start = (enterEdge + 1) % 3;
      const count = ((((leaveEdge - start) % 3) + 3) % 3) + 1;
      const colour = packed(mesh, corners[(start + count - 1) % 3] as number);

      const ring: number[] = [
        copyFor(scratch, base, slots[t * SLOTS + enterEdge] as number, colour),
      ];
      for (let step = 0; step < count; step++) {
        ring.push(corners[(start + step) % 3] as number);
      }
      ring.push(
        copyFor(scratch, base, slots[t * SLOTS + leaveEdge] as number, colour),
      );

      for (let i = 1; i + 1 < ring.length; i++) {
        outIndices[written++] = ring[0] as number;
        outIndices[written++] = ring[i] as number;
        outIndices[written++] = ring[i + 1] as number;
      }
    }

    /**
     * **Three crossings enclose a piece the fans cannot reach.**
     *
     * Two crossings close into each other — each region's chord is the other's, walked the
     * other way — so the two pieces tile the triangle and every edge is shared. Three do not:
     * the three chords form a **closed inner triangle**, and the three corner pieces only cover
     * the outside of it. Emitting the fans alone leaves that middle with nothing in it and its
     * three chords named by one triangle each, which is a hundred and twelve open edges on a
     * sphere the first time this was measured.
     *
     * **Its edges are the same three chords the corner pieces closed with, walked the other way
     * round**, which is what pairs them. That pairing is by position and not by index, so the
     * middle piece needs vertices of its own rather than reusing the crossings' — see
     * `writeMiddles` for why reusing them does not work.
     *
     * **It cannot be degenerate.** Three points, one in the interior of each edge of a
     * triangle, cannot be collinear: a straight line crosses a triangle's boundary at two
     * points, not three. So this is the one triangle in the pass whose area is guaranteed rather
     * than hoped for.
     */
    const middle = slots[t * SLOTS + MIDDLE] as number;
    if (middle >= 0) {
      outIndices[written++] = middle;
      outIndices[written++] = middle + 1;
      outIndices[written++] = middle + 2;
    }
  }

  return {
    positions: outPositions,
    normalOct: outNormalOct,
    colours: outColours,
    // **`slice` and not `subarray`, matching `ChunkMeshBuilder.finish()`.** The copy is there
    // because a view cannot cross a thread boundary, and `ChunkMesh` is handed to workers by
    // applications this package does not know about. The other three are already exactly sized
    // and need nothing; only this one is over-allocated.
    indices: outIndices.slice(0, written),
    vertexCount: outCount,
    triangleCount: written / 3,
  };
};

/**
 * The middle piece of every three-crossing triangle: three vertices of its own, at the crossings,
 * in the colour the field gives the middle.
 *
 * ## Why vertices of its own rather than the crossings'
 *
 * **Because the middle's colour need not be either of the colours its crossings carry.** A
 * crossing has a copy for each of the two colours its edge led between, and the middle piece is
 * the one region of the pass whose colour comes from nowhere else — three different shapes meet
 * in one cell, the nearest-surface rule picks whichever of them is closest to the crossing
 * points' centroid, and that is free to be a fourth answer, or the one belonging to the shape
 * whose own surface is nowhere near the triangle. Taking a crossing's copy would then hand the
 * middle a colour that is not the one it was given, which is a triangle that blends again.
 *
 * **Position is still shared, which is the only thing that had to be.** The middle's vertices sit
 * exactly where the crossings do, so its three chords pair with the corner pieces' by position
 * and `reportMesh` sees one watertight mesh rather than a middle floating free of its frame.
 */
const writeMiddles = (
  mesh: ChunkMesh,
  options: ColourBoundaryOptions,
  scratch: ColourBoundaryScratch,
  middleBase: number,
  positions: Float32Array,
  normalOct: Int16Array,
  colours: Uint8Array,
): void => {
  const { slots, here } = scratch;
  let next = middleBase;
  for (let t = 0; t < mesh.triangleCount; t++) {
    if (
      (slots[t * SLOTS] as number) < 0 ||
      (slots[t * SLOTS + 1] as number) < 0 ||
      (slots[t * SLOTS + 2] as number) < 0
    ) {
      continue;
    }
    here.length = 0;
    here.push(0, 1, 2);
    const colour = keyOf(
      options.colourAt(...middleOf(positions, mesh.vertexCount, slots, t)),
    );
    for (const edge of here) {
      // **The low copy**, which is at the crossing's position as is its high copy — they differ
      // only in colour.
      const at = mesh.vertexCount + (slots[t * SLOTS + edge] as number) * 2;
      positions[next * 3] = positions[at * 3] as number;
      positions[next * 3 + 1] = positions[at * 3 + 1] as number;
      positions[next * 3 + 2] = positions[at * 3 + 2] as number;
      normalOct[next * 2] = normalOct[at * 2] as number;
      normalOct[next * 2 + 1] = normalOct[at * 2 + 1] as number;
      colours[next * 4] = (colour >>> 24) & 0xff;
      colours[next * 4 + 1] = (colour >>> 16) & 0xff;
      colours[next * 4 + 2] = (colour >>> 8) & 0xff;
      colours[next * 4 + 3] = colour & 0xff;
      next++;
    }
    slots[t * SLOTS + MIDDLE] = next - 3;
  }
};

/**
 * The centroid of a triangle's three crossing points, which is the only point inside the middle
 * piece that has no vertex of its own to be read from.
 */
const middleOf = (
  positions: Float32Array,
  base: number,
  slots: Int32Array,
  t: number,
): [number, number, number] => {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let edge = 0; edge < 3; edge++) {
    const vertex = base + (slots[t * SLOTS + edge] as number) * 2;
    x += positions[vertex * 3] as number;
    y += positions[vertex * 3 + 1] as number;
    z += positions[vertex * 3 + 2] as number;
  }
  return [x / 3, y / 3, z / 3];
};

/** Writes a crossing's two copies: the interpolated position, a blended normal, each colour. */
const writeCrossings = (
  mesh: ChunkMesh,
  scratch: ColourBoundaryScratch,
  crossings: number,
  positions: Float32Array,
  normalOct: Int16Array,
  colours: Uint8Array,
): void => {
  const base = mesh.vertexCount;
  const edges = scratch.edges.array();
  for (let slot = 0; slot < crossings; slot++) {
    const at = slot * CROSSING_STRIDE;
    const along = edges[at + 6] as number;
    const x =
      (edges[at] as number) +
      ((edges[at + 3] as number) - (edges[at] as number)) * along;
    const y =
      (edges[at + 1] as number) +
      ((edges[at + 4] as number) - (edges[at + 1] as number)) * along;
    const z =
      (edges[at + 2] as number) +
      ((edges[at + 5] as number) - (edges[at + 2] as number)) * along;

    // **The two endpoints' normals blended — and blended as the encoded pair**, which is not the
    // encoding of the blended normal. The pair is two bytes and the endpoints are one cell
    // apart, so the error is far below a degree; decoding, blending and re-encoding would cost
    // an octahedron round trip per crossing to buy nothing anybody could see.
    const low = scratch.edgeLow.at(slot) as number;
    const high = scratch.edgeHigh.at(slot) as number;
    const nx = blend(mesh.normalOct, low * 2, high * 2, 0, along);
    const ny = blend(mesh.normalOct, low * 2, high * 2, 1, along);

    for (let side = 0; side < 2; side++) {
      const vertex = base + slot * 2 + side;
      positions[vertex * 3] = x;
      positions[vertex * 3 + 1] = y;
      positions[vertex * 3 + 2] = z;
      normalOct[vertex * 2] = nx;
      normalOct[vertex * 2 + 1] = ny;
      const key = scratch.edgeColours.at(slot * 2 + side) as number;
      colours[vertex * 4] = (key >>> 24) & 0xff;
      colours[vertex * 4 + 1] = (key >>> 16) & 0xff;
      colours[vertex * 4 + 2] = (key >>> 8) & 0xff;
      colours[vertex * 4 + 3] = key & 0xff;
    }
  }
};

/** One `snorm16` channel of vertex `to`'s normal, blended `along` of the way from `from`. */
const blend = (
  normals: Int16Array,
  from: number,
  to: number,
  channel: number,
  along: number,
): number =>
  Math.round(
    (normals[from + channel] as number) +
      ((normals[to + channel] as number) -
        (normals[from + channel] as number)) *
        along,
  );
