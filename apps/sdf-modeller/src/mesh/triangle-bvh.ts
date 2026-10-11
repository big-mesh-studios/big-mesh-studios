/**
 * Which triangle of a mesh a ray met, and which point of a mesh is nearest a given point.
 *
 * ## Why this exists at all, when there is already a picker
 *
 * **Because `@big-mesh-studios/picking` answers both of its questions against the *field*, and
 * neither answer is the one a texture needs.** `pickAlong` sphere-traces the folded distance
 * function and hands back a point on the surface — a true point, to a fraction of a voxel, with
 * no triangle attached at all. That is exactly what picking a *part* wants: `pickPart` only needs
 * to know roughly where the surface is, and then works out which primitive put it there from
 * signed distances.
 *
 * A texture wants the opposite. It needs **which triangle**, because a baked UV lives on vertices
 * and reaching one from a point in space means interpolating three of them. And when a model is
 * edited the whole UV layout is carried onto the new mesh, which means asking "what is the nearest
 * point on the surface to this vertex" once per vertex — a question about *geometry*, where the
 * picker's answer is about *distance*.
 *
 * So this is the geometry half of picking, kept apart from the field half. There is no
 * ray-versus-triangle code anywhere in the repository and this is all of it.
 *
 * ## Why the queries are two-sided
 *
 * **Because this application's meshes are drawn double-sided, and a hit test that disagreed with
 * the picture would be worse than one that agreed with the wrong side.** A subtracted sphere is
 * mostly its own inside; `ModelMaterial` sets `Side.DoubleSide` precisely so it reads as a surface
 * rather than as a hole. Back-face culling here would report "empty space" for a ray landing on
 * visible surface.
 *
 * A two-sided test with a nearest-hit rule still gets the entry wall first for a ray from
 * outside, because that is the smaller of the two distances — so the only thing two-sidedness
 * costs is that a ray starting *inside* a solid leaves through the far wall, which is what a
 * person would draw if they were inside it.
 *
 * ## Why the tree is built by median split rather than by a grid or by sorting once
 *
 * **Because the two cheaper builds both degrade on this input, and this input is regular.** A
 * uniform grid wants cell extents, and a mesh here is whatever size a person made it — a grid
 * tuned for one model is catastrophic for the next. Sorting the triangles once by a space-filling
 * curve and then halving is the usual alternative and is genuinely good, but it costs an n×n
 * space-filling computation and a Morton decode to get right, and the balance it buys over a
 * median split is small enough not to be worth either.
 *
 * The median split is O(n log n) to build, gives a tree of depth log₂(n) — about eighteen for a
 * two-hundred-thousand-triangle mesh — and prunes about as well. It is the boring choice, and
 * boring is the right adjective for something every rebuild goes through.
 *
 * ## Why a hit is only committed when it beats the one already held
 *
 * **Because the scratch the arithmetic writes into is overwritten by the next triangle tested.**
 * A leaf tests several triangles and a traversal tests many leaves, so "the last one I looked at"
 * is not "the best one". The trial result and the held result are therefore separate scratch, and
 * the trial is copied into the held one only on an improvement — which is also the only moment it
 * is worth the copy.
 *
 * ## Why the query results are copied into fresh objects
 *
 * **Because the arithmetic is allocation-free and the answer should not be.** The closest-point
 * walk runs a few million times in one UV transfer, and an object per triangle would cost more
 * than the arithmetic it carries. The internals write into scratch on the instance; the public
 * methods copy out once, so a caller holding a hit cannot have it overwritten by the next query.
 *
 * That makes the class **not reentrant**, deliberately and visibly: one query at a time, which is
 * what every caller in this application does.
 *
 * ## What it costs, measured
 *
 * **Against a sphere of radius four meshed at `budgetFor(0.125)` — 38,732 triangles, 19,368
 * vertices, 28,311 nodes, depth fourteen — on a phone-class ARM CPU under Vitest:** a ray costs
 * about fifty microseconds and a closest point about thirty-five on the surface, fifty-eight a
 * little off it. `LEAF_TRIANGLES = 4` was chosen by sweeping four, eight, sixteen and thirty-two
 * against both queries; four won on both.
 *
 * **So one UV transfer over a nineteen-thousand-vertex mesh is roughly seven hundred
 * milliseconds here**, and the texture work has to treat that as a fact: transfers run in a
 * worker and are debounced, rather than happening on a frame. Desktop hardware should be three to
 * five times quicker. If it is still too slow, the lever is spatial coherence — the mesher emits
 * vertices in grid order, so consecutive ones are about a voxel apart, and seeding each query
 * with the previous hit's triangle would collapse most of the traversal.
 *
 * Two bugs found by measuring rather than reading are recorded below where they were fixed; both
 * were silent, and the whole correctness suite passed straight through both of them.
 */
import type { Vec3 } from "@big-mesh-studios/core";
import type { Ray } from "@big-mesh-studios/picking";

/**
 * How many triangles a leaf holds before the build splits it again.
 *
 * **Four.** The trade is between the per-node work — a slab test, or a box distance, plus the
 * stack traffic — and the per-triangle work, which for the closest-point walk is Ericson's region
 * test rather than a couple of dot products. Four is where those balance on the meshes this is
 * built for: enough triangles per node that the traversal overhead is amortised, few enough that
 * the region test is not being skipped over most of the time.
 */
const LEAF_TRIANGLES = 4;

/**
 * How close to parallel a ray and a triangle may be and still be worth intersecting.
 *
 * **A determinant, so it is in area-squared units rather than in triangles.** The usual `1e-8` is
 * sized for unit triangles; these are marching-cubes triangles roughly a quarter of a world unit
 * across, whose determinants run around `0.06`, so a threshold expressed in world units would
 * have to be re-derived every time the mesh resolution changed. A threshold near the limit of what
 * a double can resolve relative to itself is the one number that means the same thing at every
 * scale — and a triangle this small and this flat is one the mesh report calls degenerate anyway.
 */
const PARALLEL_EPS = 1e-12;

/** A place on a mesh, and which triangle of it that place is on. */
export interface TriangleHit {
  /**
   * Which triangle, counted from zero in index-buffer order.
   *
   * **The index, not the first vertex of it.** A mesh can and does share vertices between
   * triangles, so a triangle number is the only thing that names one unambiguously.
   */
  readonly triangle: number;
  /** The triangle's three vertex indices, in winding order, matching `weights`. */
  readonly vertices: readonly [number, number, number];
  /** The point, on the triangle. */
  readonly point: Vec3;
  /**
   * Barycentric weights for the three vertices, summing to one.
   *
   * **Carried rather than left to the caller to recover.** The edge cases of a closest-point walk
   * return a parameter along an edge rather than a pair of free coefficients, so a caller
   * reconstructing them from the point would have to know which case produced the answer.
   * Interpolating anything per-vertex — a UV today, a second UV tomorrow — is then one line.
   */
  readonly weights: readonly [number, number, number];

  /**
   * Which way this one triangle faces, length one.
   *
   * **The face's own normal rather than a smoothed one.** A surface is drawn with a normal
   * averaged across its neighbours, because that is what makes a meshed sphere read as a sphere;
   * but a brush cursor wants the opposite, since it lies flat against the face and an average
   * across an edge it is sitting on top of would tilt it away from the surface by up to half the
   * angle of that edge. So it is per-triangle here, and the averaging is left to the material
   * that wants it.
   *
   * **Not flipped towards the eye**, for the same reason the material does its own flipping
   * separately: this is a direction in world space, and a caller that wants it facing the camera
   * says so.
   */
  readonly normal: Vec3;
}

/** A triangle the ray met, and how far along the ray it is. */
export interface RayHit extends TriangleHit {
  /** Distance along the ray. The direction is normalised first, so this is a world distance. */
  readonly distance: number;
}

/** The nearest point of the mesh to a point, and how far away it is. */
export interface SurfaceHit extends TriangleHit {
  /** Distance from the queried point to `point`. Always zero or more. */
  readonly distance: number;
}

/** A place on a mesh, unpacked into scratch that a query can overwrite freely. */
interface ScratchHit {
  point: Float64Array;
  weights: Float64Array;
  /** The face's own normal, in world space. See {@link faceNormal}. */
  normal: Float64Array;
  triangle: number;
  /** Distance along a ray, or a squared distance for a point. Never mixed between the two. */
  distance: number;
}

const held: ScratchHit = {
  point: new Float64Array(3),
  weights: new Float64Array(3),
  normal: new Float64Array(3),
  triangle: -1,
  distance: 0,
};

const trial: ScratchHit = {
  point: new Float64Array(3),
  weights: new Float64Array(3),
  normal: new Float64Array(3),
  triangle: -1,
  distance: 0,
};

/**
 * The point of a triangle nearest `p`, and the barycentric weights of that point.
 *
 * **Ericson's region walk, unrolled.** The seven regions a point can be in relative to a triangle
 * — three vertices, three edges, the interior — each reject in one step, so the walk stops at the
 * first that applies and never tests the rest. The alternative is a brute-force minimum over the
 * three edges, which is correct and roughly three times the arithmetic.
 *
 * ## Why every division is guarded
 *
 * **Because a degenerate triangle is a normal input, not a broken one.** `reportMesh` counts them
 * — that is what its `degenerateTriangles` field is for — and a mesher that emits one has not
 * failed, it has produced a sliver at a cell where the field crosses within rounding. On a
 * triangle with `a === b` the region arithmetic reaches an edge case with `0 / 0` in it, and a
 * `NaN` here does not stay local: it compares false against every bound in the pruning that
 * follows and so silently widens the search rather than failing loudly. Each guard is therefore
 * written as "and the denominator is not zero" rather than trusting the region test to imply it.
 */
const closestOnTriangle = (
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
  into: ScratchHit,
): void => {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;

  // The vertex regions, cheapest first: each is one sign test on two dot products.
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) {
    into.point[0] = ax;
    into.point[1] = ay;
    into.point[2] = az;
    into.weights[0] = 1;
    into.weights[1] = 0;
    into.weights[2] = 0;
    return;
  }

  const bpx = px - bx;
  const bpy = py - by;
  const bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) {
    into.point[0] = bx;
    into.point[1] = by;
    into.point[2] = bz;
    into.weights[0] = 0;
    into.weights[1] = 1;
    into.weights[2] = 0;
    return;
  }

  // The first edge. `d1 - d3` carries `ab`'s squared length, so it is zero exactly when `a` and
  // `b` are the same point.
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0 && d1 - d3 > 0) {
    const t = d1 / (d1 - d3);
    into.point[0] = ax + abx * t;
    into.point[1] = ay + aby * t;
    into.point[2] = az + abz * t;
    into.weights[0] = 1 - t;
    into.weights[1] = t;
    into.weights[2] = 0;
    return;
  }

  const cpx = px - cx;
  const cpy = py - cy;
  const cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) {
    into.point[0] = cx;
    into.point[1] = cy;
    into.point[2] = cz;
    into.weights[0] = 0;
    into.weights[1] = 0;
    into.weights[2] = 1;
    return;
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0 && d2 - d6 > 0) {
    const t = d2 / (d2 - d6);
    into.point[0] = ax + acx * t;
    into.point[1] = ay + acy * t;
    into.point[2] = az + acz * t;
    into.weights[0] = 1 - t;
    into.weights[1] = 0;
    into.weights[2] = t;
    return;
  }

  const va = d3 * d6 - d5 * d4;
  const along = d4 - d3;
  const across = d5 - d6;
  if (va <= 0 && along >= 0 && across >= 0 && along + across > 0) {
    const t = along / (along + across);
    into.point[0] = bx + (cx - bx) * t;
    into.point[1] = by + (cy - by) * t;
    into.point[2] = bz + (cz - bz) * t;
    into.weights[0] = 0;
    into.weights[1] = 1 - t;
    into.weights[2] = t;
    return;
  }

  // The interior. `va + vb + vc` is twice the triangle's area, so zero means there is no interior
  // to be in and the answer is whichever end of the sliver is nearer.
  const total = va + vb + vc;
  if (total > 0) {
    const u = vb / total;
    const v = vc / total;
    into.point[0] = ax + abx * u + acx * v;
    into.point[1] = ay + aby * u + acy * v;
    into.point[2] = az + abz * u + acz * v;
    into.weights[0] = 1 - u - v;
    into.weights[1] = u;
    into.weights[2] = v;
    return;
  }

  nearestOf(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz, into);
};

/** The nearer of a triangle's three vertices, for a triangle with no interior to be in. */
const nearestOf = (
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
  into: ScratchHit,
): void => {
  let near = 0;
  let best = (ax - px) ** 2 + (ay - py) ** 2 + (az - pz) ** 2;

  const fromB = (bx - px) ** 2 + (by - py) ** 2 + (bz - pz) ** 2;
  if (fromB < best) {
    near = 1;
    best = fromB;
  }
  const fromC = (cx - px) ** 2 + (cy - py) ** 2 + (cz - pz) ** 2;
  if (fromC < best) near = 2;

  into.point[0] = near === 0 ? ax : near === 1 ? bx : cx;
  into.point[1] = near === 0 ? ay : near === 1 ? by : cy;
  into.point[2] = near === 0 ? az : near === 1 ? bz : cz;
  into.weights[0] = near === 0 ? 1 : 0;
  into.weights[1] = near === 1 ? 1 : 0;
  into.weights[2] = near === 2 ? 1 : 0;
};

/** What a completed build leaves behind, before the query half takes it. */
interface BuiltTree {
  readonly order: Uint32Array;
  readonly min: Float32Array;
  readonly max: Float32Array;
  readonly start: Int32Array;
  readonly count: Int32Array;
  readonly right: Int32Array;
}

/**
 * Builds the tree.
 *
 * **A function rather than a constructor body, so the query half of the class has no build state
 * to hold.** Everything here is write-once; the class below is read-and-scratch.
 */
const buildTree = (
  positions: Float32Array,
  indices: Uint32Array,
  triangles: number,
): BuiltTree => {
  const centroids = new Float32Array(triangles * 3);
  for (let triangle = 0; triangle < triangles; triangle++) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let corner = 0; corner < 3; corner++) {
      const at = indices[triangle * 3 + corner] * 3;
      x += positions[at];
      y += positions[at + 1];
      z += positions[at + 2];
    }
    centroids[triangle * 3] = x / 3;
    centroids[triangle * 3 + 1] = y / 3;
    centroids[triangle * 3 + 2] = z / 3;
  }

  const order = new Uint32Array(triangles);
  for (let triangle = 0; triangle < triangles; triangle++)
    order[triangle] = triangle;

  const min: number[] = [];
  const max: number[] = [];
  const start: number[] = [];
  const count: number[] = [];
  const right: number[] = [];

  const grow = (): number => {
    const node = start.length;
    min.push(0, 0, 0);
    max.push(0, 0, 0);
    start.push(0);
    count.push(0);
    right.push(-1);
    return node;
  };

  /**
   * The world box around a range of `order`, and which way to cut it.
   *
   * **The vertices' box and not the centroids'.** A ray test and a closest-point test both prune
   * against this box, and a box around the centroids is strictly smaller than the triangles
   * inside it, so pruning against it would discard triangles that were in front of the camera.
   * The centroids decide only *which way to cut*.
   *
   * **Widest, not largest.** Splitting on the axis with the biggest extent is the usual rule and
   * it is wrong here: an axis can have a large extent from two distant triangles and no centroids
   * between them, which makes it a poor cut and a good nothing. The widest axis is the one that
   * actually separates.
   */
  const measure = (
    from: number,
    length: number,
  ): { readonly box: number[]; readonly axis: number } => {
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    const centre = [
      Infinity,
      Infinity,
      Infinity,
      -Infinity,
      -Infinity,
      -Infinity,
    ];

    for (let at = from; at < from + length; at++) {
      const triangle = order[at];
      for (let corner = 0; corner < 3; corner++) {
        const vertex = indices[triangle * 3 + corner] * 3;
        const x = positions[vertex];
        const y = positions[vertex + 1];
        const z = positions[vertex + 2];
        if (x < box[0]) box[0] = x;
        if (y < box[1]) box[1] = y;
        if (z < box[2]) box[2] = z;
        if (x > box[3]) box[3] = x;
        if (y > box[4]) box[4] = y;
        if (z > box[5]) box[5] = z;
      }
      const cx = centroids[triangle * 3];
      const cy = centroids[triangle * 3 + 1];
      const cz = centroids[triangle * 3 + 2];
      if (cx < centre[0]) centre[0] = cx;
      if (cy < centre[1]) centre[1] = cy;
      if (cz < centre[2]) centre[2] = cz;
      if (cx > centre[3]) centre[3] = cx;
      if (cy > centre[4]) centre[4] = cy;
      if (cz > centre[5]) centre[5] = cz;
    }

    const spanX = centre[3] - centre[0];
    const spanY = centre[4] - centre[1];
    const spanZ = centre[5] - centre[2];

    return {
      box,
      axis: spanX >= spanY && spanX >= spanZ ? 0 : spanY >= spanZ ? 1 : 2,
    };
  };

  /**
   * Reorders a range so that its median by centroid on `axis` lands at `from + length / 2`.
   *
   * **Quickselect, not a sort.** The question being answered at each node is only "which half of
   * this range is the median in", so quickselect answers it in linear time and a sort would
   * answer it in n log n — once per level, which is the difference between O(n log n) and
   * O(n log² n) over the whole build. The median-of-three pivot is what stops an already-ordered
   * range from degrading to O(n²), and a quickselect that can go quadratic is not worth having
   * for the cases where it saves a sort.
   */
  const partition = (from: number, length: number, axis: number): number => {
    const last = from + length - 1;
    const middle = from + (length >> 1);
    const value = (at: number): number => centroids[order[at] * 3 + axis];

    const a = value(from);
    const b = value(middle);
    const c = value(last);
    const pivot = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));

    let low = from;
    let high = last;
    for (;;) {
      while (low <= high && value(low) < pivot) low++;
      while (low <= high && value(high) > pivot) high--;
      if (low > high) break;
      const swap = order[low];
      order[low] = order[high];
      order[high] = swap;
      low++;
      high--;
    }

    // Both halves have to be non-empty or the recursion below never terminates, and the median
    // target can fall outside the range the partition actually separated.
    return Math.min(Math.max(middle, from + 1), last);
  };

  const build = (from: number, length: number): number => {
    const node = grow();
    const { box, axis } = measure(from, length);

    for (let axisAt = 0; axisAt < 3; axisAt++) {
      min[node * 3 + axisAt] = box[axisAt];
      max[node * 3 + axisAt] = box[axisAt + 3];
    }

    if (length <= LEAF_TRIANGLES) {
      start[node] = from;
      count[node] = length;
      return node;
    }

    const middle = partition(from, length, axis);

    // **The left child is allocated next, so it is always this node plus one.** That is why
    // `BuiltTree` carries one child index rather than two: a saved array read on every traversal
    // step, and one fewer thing to get wrong when the tree is rebuilt.
    build(from, middle - from);
    right[node] = build(middle, from + length - middle);
    return node;
  };

  if (triangles > 0) build(0, triangles);

  return {
    order,
    min: Float32Array.from(min),
    max: Float32Array.from(max),
    start: Int32Array.from(start),
    count: Int32Array.from(count),
    right: Int32Array.from(right),
  };
};

/**
 * A mesh's triangles, arranged so that "which of these is near here" is answered without looking
 * at all of them.
 *
 * **Build is O(n log n) and one-off; every query is O(log n) plus what it actually hits.** Both
 * halves of the interface are here because the texture work needs both, and they share the tree.
 *
 * **The two `ScratchHit` records are module-level rather than per-instance.** A transfer runs one
 * query at a time and a per-instance pair would be a second copy of the same invariant, which is
 * the kind of thing two BVH instances quietly stop sharing.
 */
/**
 * The three arrays a tree needs, and nothing else.
 *
 * **Structural rather than `ChunkMesh`, so that a reference read out of a saved file can be
 * queried.** A file holds positions and indices and nothing about normals or colours, and
 * requiring the full mesh to make a tree over it would mean either saving three arrays nobody
 * reads or wrapping what the file gave back in a `ChunkMesh` with invented normals — so the
 * requirement is the three arrays the tree actually walks. `ChunkMesh` satisfies it unchanged.
 */
export interface TriangleMesh {
  positions: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
}

export class TriangleBVH {
  /** Builds one over `mesh`'s triangles. A mesh with no triangles gives a tree that never hits. */
  static readonly of = (mesh: TriangleMesh): TriangleBVH =>
    new TriangleBVH(mesh);

  private readonly positions: Float32Array;
  private readonly indices: Uint32Array;
  private readonly triangles: number;

  private readonly order: Uint32Array;
  private readonly min: Float32Array;
  private readonly max: Float32Array;
  private readonly start: Int32Array;
  private readonly count: Int32Array;
  private readonly right: Int32Array;

  /**
   * The query point and direction, unpacked into indexable form.
   *
   * **On the instance rather than in a local, because the slab test indexes three parallel arrays
   * and a `Vec3` is an object.** Allocating a three-element array per query is free in the ray
   * case and ruinous in the vertex-at-a-time case, so the scratch is held here and the
   * non-reentrancy it implies is documented in the file header.
   */
  private readonly at = new Float64Array(3);
  /** Along the same lines, for the ray's direction. */
  private readonly along = new Float64Array(3);

  private constructor(mesh: TriangleMesh) {
    this.positions = mesh.positions;
    this.indices = mesh.indices;
    this.triangles = mesh.indices.length / 3;

    const built = buildTree(this.positions, this.indices, this.triangles);
    this.order = built.order;
    this.min = built.min;
    this.max = built.max;
    this.start = built.start;
    this.count = built.count;
    this.right = built.right;
  }

  /** How many triangles the tree holds. Zero for an empty mesh, and both queries then miss. */
  get triangleCount(): number {
    return this.triangles;
  }

  /** How many nodes the tree has, for a readout or a test that wants to know it did any work. */
  get nodeCount(): number {
    return this.start.length;
  }

  /**
   * The nearest triangle to `ray` within `reach`, or nothing.
   *
   * **Both faces are tested and the nearest hit wins**, for the reason in the file header. The
   * direction is normalised rather than trusted, so `distance` is a world distance even if a
   * caller handed in an unnormalised direction — `pickAlong` normalises for the same reason.
   */
  intersectRay(ray: Ray, reach: number = Infinity): RayHit | undefined {
    if (this.triangles === 0) return undefined;

    const length = Math.sqrt(
      ray.direction.x ** 2 + ray.direction.y ** 2 + ray.direction.z ** 2,
    );
    if (!(length > 0)) return undefined;

    this.at[0] = ray.origin.x;
    this.at[1] = ray.origin.y;
    this.at[2] = ray.origin.z;
    this.along[0] = ray.direction.x / length;
    this.along[1] = ray.direction.y / length;
    this.along[2] = ray.direction.z / length;

    let best = reach;
    held.triangle = -1;
    const stack: number[] = [0];
    while (stack.length > 0) {
      const node = stack.pop() as number;
      if (this.entry(node, best) < 0) continue;

      if (this.count[node] > 0) {
        for (
          let at = this.start[node];
          at < this.start[node] + this.count[node];
          at++
        ) {
          const t = this.meet(this.order[at], best);
          if (t === undefined) continue;
          best = t;
          commit(trial, held);
        }
        continue;
      }

      this.pushChildren(node, best, stack, true);
    }

    return held.triangle < 0 ? undefined : this.hit(held.distance);
  }

  /**
   * The point of the mesh nearest `point`, or nothing for a mesh with no triangles.
   *
   * **Exact rather than approximate.** Distance to a node's box is a lower bound on the distance
   * to anything inside it, so a node further away than the best hit so far cannot improve it —
   * which is the whole pruning argument, and the reason skipping nodes loses nothing.
   */
  closestPoint(point: Vec3): SurfaceHit | undefined {
    if (this.triangles === 0) return undefined;

    this.at[0] = point.x;
    this.at[1] = point.y;
    this.at[2] = point.z;

    // Squared throughout, and un-squared only in the result: the comparison this feeds runs once
    // per node per query and takes Infinity as its limit, so a square root there would be a square
    // root per node to save one at the end.
    let best = Infinity;
    held.triangle = -1;

    const stack: number[] = [0];
    while (stack.length > 0) {
      const node = stack.pop() as number;
      if (this.away(node, best) > best) continue;

      if (this.count[node] > 0) {
        for (
          let at = this.start[node];
          at < this.start[node] + this.count[node];
          at++
        ) {
          const squared = this.meetPoint(this.order[at]);

          if (squared >= best) continue;
          best = squared;
          commit(trial, held);
        }
        continue;
      }

      this.pushChildren(node, best, stack, false);
    }

    return held.triangle < 0 ? undefined : this.hit(Math.sqrt(held.distance));
  }

  /**
   * Queues a node's two children, nearer last so the nearer is popped first.
   *
   * **Ordering does not change the answer; it changes how much of the tree the answer lets us
   * skip.** Popping the nearer child first means `best` is tight before the farther one is even
   * looked at, which is what turns the farther child's box test into a rejection rather than a
   * descent.
   *
   * **`ray` says which of the two questions is being asked**, because the two traversals want
   * genuinely different measures and the limits they prune against are in each one's own units: a
   * ray works in entry distances along itself, and a point query in squared distances from the
   * point. Sharing one measure between them would compare two different quantities.
   */
  private pushChildren(
    node: number,
    limit: number,
    stack: number[],
    ray: boolean,
  ): void {
    const near = node + 1;
    const far = this.right[node];

    const nearAt = ray ? this.entry(near, limit) : this.away(near, limit);
    const farAt = ray ? this.entry(far, limit) : this.away(far, limit);

    // **Only the ray needs a different key.** A point inside a box is at distance zero from
    // it, so the two can tie — but measured over a sphere at three resolutions, ordering the
    // point's children by their box's centre rather than by their box made the traversal *worse*
    // (35 to 61 microseconds a query), because the centre is a poor proxy for which box holds
    // the nearest triangle. The ray's case is not symmetric: there, entry distance is zero for
    // every box the ray has already entered, which is most of them, and the centre is a
    // genuinely better key. So the two keep different ones.
    const nearKey = ray
      ? nearAt < 0
        ? Infinity
        : this.centreAlong(near)
      : nearAt;
    const farKey = ray ? (farAt < 0 ? Infinity : this.centreAlong(far)) : farAt;

    /**
     * Whether a box with this much clearance is worth putting on the stack.
     *
     * **A ray's `-1` and a point's `Infinity` are the same answer and neither survives a
     * comparison.** A ray that has found nothing has a limit of `Infinity`, and `-1 <= Infinity`
     * is *true* — so every box the ray misses would be queued and then rejected on the way out,
     * which is a wasted box test each rather than the subtree descent it was before the miss was
     * given its own answer. A point's clearance is never negative, so it only needs the limit.
     */
    const queue = (at: number): boolean => (ray ? at >= 0 : at <= limit);

    if (nearKey <= farKey) {
      if (queue(farAt)) stack.push(far);
      if (queue(nearAt)) stack.push(near);
    } else {
      if (queue(nearAt)) stack.push(near);
      if (queue(farAt)) stack.push(far);
    }
  }

  /**
   * How far along the ray the middle of `node`'s box lies.
   *
   * **The ordering key for a ray, and deliberately not the entry distance.** A box the ray has
   * already entered reports an entry of zero, so *every* box between the ray's origin and its
   * first hit ties at zero — which is exactly the region a ray spends most of its time in. Ordering
   * by entry distance therefore degenerates to "always descend into whichever child happens to be
   * the left one", and the traversal stops being a search and becomes a walk of the leftmost
   * path with backtracking. The centre's parameter is distinct for every box and orders them the
   * way the ray meets them, which is what the search wants.
   *
   * Unscaled by a half, since a factor common to both children cannot change their order.
   */
  private centreAlong(node: number): number {
    return (
      (this.min[node * 3] + this.max[node * 3] - 2 * this.at[0]) *
        this.along[0] +
      (this.min[node * 3 + 1] + this.max[node * 3 + 1] - 2 * this.at[1]) *
        this.along[1] +
      (this.min[node * 3 + 2] + this.max[node * 3 + 2] - 2 * this.at[2]) *
        this.along[2]
    );
  }

  /**
   * How far along the ray `node`'s box is first entered, or `-1` for a box the ray does not
   * reach within `limit`.
   *
   * **A slab test, seeded with `far = limit` so a box entirely past the best hit so far is
   * rejected by the same comparison that rejects one behind the origin.** One test rather than
   * two, and the "is it in front of us at all" question falls out of it.
   *
   * **`-1` and not `Infinity`, and that is the whole reason this is a correct traversal.** A
   * miss answers "further than any hit so far", and `Infinity > Infinity` is *false*: until the
   * ray finds something, a box it misses compares equal to the limit and would be descended into
   * rather than skipped — which turns every ray into a walk of the whole tree, and turns a ray
   * that grazes one triangle into the most expensive query there is. A negative answer cannot be
   * confused with a distance.
   *
   * **The zero-direction case is a branch rather than an infinite reciprocal.** `1 / 0` is
   * `Infinity`, and multiplying that by a `0` offset — a ray exactly on a slab plane, which
   * happens whenever a camera looks along a model axis — is a `NaN`. A `NaN` in the slab test
   * compares false against both bounds, so the node would be reported as entered at whatever `near`
   * happened to be. Testing the axis instead costs one comparison per axis per node and cannot
   * produce a `NaN` at all.
   */
  private entry(node: number, limit: number): number {
    let near = 0;
    let far = limit;

    for (let axis = 0; axis < 3; axis++) {
      const from = this.at[axis];
      const step = this.along[axis];
      const low = this.min[node * 3 + axis];
      const high = this.max[node * 3 + axis];

      if (step === 0) {
        if (from < low || from > high) return -1;
        continue;
      }

      let first = (low - from) / step;
      let second = (high - from) / step;
      if (first > second) {
        const swap = first;
        first = second;
        second = swap;
      }
      if (first > near) near = first;
      if (second < far) far = second;
      if (near > far) return -1;
    }

    return near;
  }

  /**
   * The squared distance from the query point to `node`'s box.
   *
   * **A lower bound on the distance to anything inside the node**, which is the whole pruning
   * argument: a node further away than the best hit so far cannot improve it.
   */
  private away(node: number, limit: number): number {
    let total = 0;

    for (let axis = 0; axis < 3; axis++) {
      const at = this.at[axis];
      const low = this.min[node * 3 + axis];
      const high = this.max[node * 3 + axis];
      const gap = at < low ? low - at : at > high ? at - high : 0;
      total += gap * gap;
      if (total > limit * limit) return total;
    }

    return total;
  }

  /**
   * Where `triangle` meets the ray, or `undefined` for a miss or one past `limit`.
   *
   * **Möller–Trumbore, two-sided.** `u` and `v` carry `det`'s sign through `1 / det`, so the
   * same two range tests are correct for either winding and nothing has to be flipped or negated
   * per face.
   */
  private meet(triangle: number, limit: number): number | undefined {
    const base = triangle * 3;
    const a = this.indices[base] * 3;
    const b = this.indices[base + 1] * 3;
    const c = this.indices[base + 2] * 3;
    const positions = this.positions;
    const at = this.at;
    const along = this.along;

    const e1x = positions[b] - positions[a];
    const e1y = positions[b + 1] - positions[a + 1];
    const e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a];
    const e2y = positions[c + 1] - positions[a + 1];
    const e2z = positions[c + 2] - positions[a + 2];

    const px = along[1] * e2z - along[2] * e2y;
    const py = along[2] * e2x - along[0] * e2z;
    const pz = along[0] * e2y - along[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < PARALLEL_EPS) return undefined;

    const inverse = 1 / det;
    const tx = at[0] - positions[a];
    const ty = at[1] - positions[a + 1];
    const tz = at[2] - positions[a + 2];

    const u = (tx * px + ty * py + tz * pz) * inverse;
    if (u < 0 || u > 1) return undefined;

    const qx = ty * e1z - tz * e1y;
    const qy = tz * e1x - tx * e1z;
    const qz = tx * e1y - ty * e1x;

    const v = (along[0] * qx + along[1] * qy + along[2] * qz) * inverse;
    if (v < 0 || u + v > 1) return undefined;

    const t = (e2x * qx + e2y * qy + e2z * qz) * inverse;
    if (t < 0 || t >= limit) return undefined;

    trial.triangle = triangle;
    trial.distance = t;
    trial.weights[0] = 1 - u - v;
    trial.weights[1] = u;
    trial.weights[2] = v;
    trial.point[0] = at[0] + along[0] * t;
    trial.point[1] = at[1] + along[1] * t;
    trial.point[2] = at[2] + along[2] * t;
    // **The normal is taken here, where all three corners are still in registers.** Reading them
    // back out of the index and position arrays for a caller that wants a direction would be the
    // same three corners twice.
    faceNormal(
      positions[a],
      positions[a + 1],
      positions[a + 2],
      positions[b],
      positions[b + 1],
      positions[b + 2],
      positions[c],
      positions[c + 1],
      positions[c + 2],
      trial.normal,
    );
    return t;
  }

  /**
   * How far the query point is from `triangle`, squared.
   *
   * **The name is deliberately not `meet`.** Two queries, two scratch records, and the same
   * triangle in each; a shared name would be the first thing a later edit gets wrong.
   */
  private meetPoint(triangle: number): number {
    const base = triangle * 3;
    const a = this.indices[base] * 3;
    const b = this.indices[base + 1] * 3;
    const c = this.indices[base + 2] * 3;
    const positions = this.positions;

    closestOnTriangle(
      this.at[0],
      this.at[1],
      this.at[2],
      positions[a],
      positions[a + 1],
      positions[a + 2],
      positions[b],
      positions[b + 1],
      positions[b + 2],
      positions[c],
      positions[c + 1],
      positions[c + 2],
      trial,
    );

    faceNormal(
      positions[a],
      positions[a + 1],
      positions[a + 2],
      positions[b],
      positions[b + 1],
      positions[b + 2],
      positions[c],
      positions[c + 1],
      positions[c + 2],
      trial.normal,
    );

    const dx = this.at[0] - trial.point[0];
    const dy = this.at[1] - trial.point[1];
    const dz = this.at[2] - trial.point[2];
    const squared = dx * dx + dy * dy + dz * dz;
    trial.triangle = triangle;
    trial.distance = squared;
    return squared;
  }

  /**
   * Copies the held hit into an object a caller can keep.
   *
   * **`distance` arrives already in world units** — squared for a point query, not for a ray
   * query — so the un-squaring is at the call site that knows which it was, rather than here
   * where the two would have to be told apart.
   */
  private hit(distance: number): TriangleHit & { readonly distance: number } {
    const base = held.triangle * 3;
    return {
      triangle: held.triangle,
      vertices: [
        this.indices[base],
        this.indices[base + 1],
        this.indices[base + 2],
      ],
      point: { x: held.point[0], y: held.point[1], z: held.point[2] },
      weights: [held.weights[0], held.weights[1], held.weights[2]],
      normal: {
        x: held.normal[0]!,
        y: held.normal[1]!,
        z: held.normal[2]!,
      },
      distance,
    };
  }
}

/**
 * The unit normal of a triangle, written into `out`.
 *
 * **A cross product, falling back to +Y on a degenerate triangle.** The fallback matters: a
 * zero-length normal would put a `NaN` into a cursor's rotation, and a `NaN` there is a cursor
 * that vanishes — which is worse than one that is briefly facing the wrong way on the sliver a
 * mesher emitted at a cell where the field crossed within rounding.
 */
const faceNormal = (
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
  out: Float64Array,
): void => {
  const ux = bx - ax;
  const uy = by - ay;
  const uz = bz - az;
  const vx = cx - ax;
  const vy = cy - ay;
  const vz = cz - az;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz);
  if (!(length > 0)) {
    out[0] = 0;
    out[1] = 1;
    out[2] = 0;
    return;
  }
  nx /= length;
  ny /= length;
  nz /= length;
  out[0] = nx;
  out[1] = ny;
  out[2] = nz;
};

/** Copies a trial hit into the one a traversal is holding, for when the trial won. */
const commit = (from: ScratchHit, to: ScratchHit): void => {
  to.triangle = from.triangle;
  to.distance = from.distance;
  to.point.set(from.point);
  to.weights.set(from.weights);
  to.normal.set(from.normal);
};
