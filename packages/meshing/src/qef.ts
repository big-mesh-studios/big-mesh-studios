/**
 * The quadratic error function a Dual Contouring vertex minimizes.
 *
 * ## What it is for
 *
 * A dual mesher puts one vertex in every cell the surface crosses. Surface Nets places
 * that vertex at the mean of the cell's edge crossings; Dual Contouring places it where
 * the planes through those crossings agree best. Each crossing `p` carries the surface
 * normal `n` there, and the error of a candidate point `x` is
 *
 *     E(x) = Σ (n · (x - p))²
 *
 * which is the squared distance from `x` to each oriented plane. Minimizing it moves the
 * vertex onto the line where two faces meet, or onto the point where three meet, instead
 * of leaving it halfway between them. That is the whole of what makes a box's corner
 * sharp rather than chamfered.
 *
 * ## Why the arithmetic is relative to the mass point
 *
 * A world position is hundreds of units from the origin and a cell is a few units across,
 * so writing the normal equations in world coordinates asks a 3×3 solve to recover a few
 * units of answer from numbers of order hundreds. The solve below subtracts the crossing
 * mean `m` first, accumulates `q = p - m`, and returns `d = x - m`. `d` is a fraction of a
 * cell, which is the quantity the cell clamp is about anyway, and the conditioning is set
 * by the normals rather than by where in the world the chunk happens to be.
 *
 * ## Why it is regularised
 *
 * **A cell on a flat face has one plane, not three, and the QEF has no single minimum.**
 * Every point on the plane scores zero, and an unregularised solve either divides by a
 * near-zero determinant or fires the vertex off along the plane. Adding `λI` to the normal
 * matrix and pulling toward the mass point is the standard fix: on a flat face it selects
 * the point on the plane nearest the crossings' mean, and at a corner it is small enough
 * to be invisible. `<0.001` of the matrix's own trace is the range that does that without
 * softening a real crease; see `QEF_BIAS`.
 *
 * **The result is still clamped to the cell**, because a QEF minimum is allowed to lie
 * outside it and a vertex that leaves its cell belongs to its neighbour's quads. The clamp
 * is deliberately in this file rather than in the mesher: it is part of deciding the point,
 * not part of knowing which cell it is in.
 */

/** The most crossings a cube's twelve edges can have. */
export const QEF_MAX_CROSSINGS = 12;

/**
 * How strongly the solve is pulled toward the crossing mass point, relative to the trace
 * of the normal matrix.
 *
 * **A regulariser, not a shaping parameter.** At `1e-4` a real three-plane corner moves by
 * a tiny fraction of a cell while a flat face, whose matrix has rank one, still has a
 * well-defined answer. Raising it pulls every corner toward the middle of the cell; that
 * is a different mesher, not a different tuning.
 */
export const QEF_BIAS = 1e-4;

/**
 * How far apart two corner normals may point before the cell is treated as a feature and
 * refined with the field's own normals, as a cosine (30°).
 *
 * **The two-stage answer to "cheap normals or exact ones".** A trilinear corner gradient is
 * free and seam-safe, and on a flat face or a smooth sphere it describes the surface as well
 * as the field does. Where two planes meet, it is a blend, and a QEF built from blends lands
 * near the crease rather than on it — measured at about a third of a sample in the first
 * version. So a cell whose corner normals disagree by more than this asks the field for its
 * crossings' normals, and pays the field samples only where the surface actually turns.
 */
export const QEF_REFINE_COS = Math.cos((30 * Math.PI) / 180);

/**
 * How much a cell's eight samples may deviate from a linear function before the cell is
 * refined, as a fraction of the cell's longest span.
 *
 * **The test for the feature a normal spread cannot see.** A box corner's eight distances
 * are symmetric, so the trilinear gradient at all three of its crossings points the same
 * diagonal way and the normals agree — while the surface has three planes. The mixed
 * differences of the eight corners are what distinguishes that from a plane: they are zero
 * for any linear field, about a hundredth of a cell for a resolved sphere, and most of a cell
 * for a corner. Measured on a ten-unit cell: a box corner is 7.19, a sphere is 0.08 to 0.11,
 * and a plane is 0. Two tenths of a cell separates those by a wide margin while leaving most
 * of a smoothly curved surface on the free path.
 */
export const QEF_REFINE_MIXED = 0.2;

/** One solved point. Reused by `QefScratch`, so a caller must read it before solving again. */
export interface QefPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Per-thread crossings and the solve for the cell being placed.
 *
 * **Preallocated and reused because the mesher calls it once per crossing cell**, which on
 * a chunk is thousands of times. Allocating a dozen-vector per cell would put the allocator
 * in the middle of the cell loop; the arrays here are the size a cube's edges can need and
 * never grow.
 */
export class QefScratch {
  private readonly positions = new Float64Array(QEF_MAX_CROSSINGS * 3);
  private readonly normals = new Float64Array(QEF_MAX_CROSSINGS * 3);
  private count = 0;
  private readonly point: QefPoint = { x: 0, y: 0, z: 0 };

  /** How many crossings have been added since `clear`. Exposed for tests and diagnostics. */
  get crossings(): number {
    return this.count;
  }

  /** Empties the cell. Called once per cell that is not refused. */
  clear(): void {
    this.count = 0;
  }

  /**
   * Adds one edge crossing and the surface normal there.
   *
   * A base point is always added, even when its normal is unusable, because the mass point
   * is the mean of the crossings rather than the mean of the usable normals. A cell with
   * no usable normal therefore still has the Surface Nets answer available as a fallback.
   */
  add(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
  ): void {
    if (this.count >= QEF_MAX_CROSSINGS) return;
    const at = this.count * 3;
    this.positions[at] = x;
    this.positions[at + 1] = y;
    this.positions[at + 2] = z;
    this.normals[at] = nx;
    this.normals[at + 1] = ny;
    this.normals[at + 2] = nz;
    this.count++;
  }

  /**
   * The smallest dot product between any two usable normals, or `1` when there are fewer
   * than two.
   *
   * **The feature test, and it is about agreement rather than about magnitude.** Two normals
   * ninety degrees apart are two planes meeting; two normals a degree apart are one plane
   * measured twice. A cell whose corner normals all agree is a cell where the free
   * trilinear gradient is as good as the field's, and one where they disagree is where the
   * extra samples earn their cost. Twelve crossings is sixty-six dot products, which is
   * cheaper than one field evaluation.
   */
  spreadCos(): number {
    const count = this.count;
    const normals = this.normals;
    let smallest = 1;
    for (let i = 0; i < count; i++) {
      const at = i * 3;
      const ax = normals[at] as number;
      const ay = normals[at + 1] as number;
      const az = normals[at + 2] as number;
      const al = Math.hypot(ax, ay, az);
      if (!(al > 0)) continue;
      for (let j = i + 1; j < count; j++) {
        const bt = j * 3;
        const bx = normals[bt] as number;
        const by = normals[bt + 1] as number;
        const bz = normals[bt + 2] as number;
        const bl = Math.hypot(bx, by, bz);
        if (!(bl > 0)) continue;
        const dot = (ax * bx + ay * by + az * bz) / (al * bl);
        if (dot < smallest) smallest = dot;
      }
    }
    return smallest;
  }

  /**
   * Replaces every crossing's normal with the field's answer at that crossing.
   *
   * **Only the normals change.** The mass point is still the crossings' mean, and the
   * positions are the ones the cell loop computed, so a refined solve differs from the cheap
   * one by the planes it fits rather than by the data it fits them to.
   */
  refine(
    normalAt: (
      x: number,
      y: number,
      z: number,
    ) => readonly [number, number, number],
  ): void {
    for (let i = 0; i < this.count; i++) {
      const at = i * 3;
      const normal = normalAt(
        this.positions[at] as number,
        this.positions[at + 1] as number,
        this.positions[at + 2] as number,
      );
      this.normals[at] = normal[0];
      this.normals[at + 1] = normal[1];
      this.normals[at + 2] = normal[2];
    }
  }

  /**
   * Solves for the cell's vertex, clamped into `[low, high]`.
   *
   * **Falls back to the crossing mean whenever an answer would be invented rather than
   * solved**: no usable normal, a determinant too close to zero, or a non-finite result.
   * The mean is the one answer that is always inside the cell and always near the surface,
   * which is why it is the right failure rather than a corner of the box.
   */
  solve(
    lowX: number,
    lowY: number,
    lowZ: number,
    highX: number,
    highY: number,
    highZ: number,
    bias: number = QEF_BIAS,
  ): QefPoint {
    const count = this.count;
    const positions = this.positions;
    const normals = this.normals;
    const point = this.point;

    let mx = 0;
    let my = 0;
    let mz = 0;
    for (let i = 0; i < count; i++) {
      const at = i * 3;
      mx += positions[at] as number;
      my += positions[at + 1] as number;
      mz += positions[at + 2] as number;
    }
    if (count === 0) {
      point.x = (lowX + highX) / 2;
      point.y = (lowY + highY) / 2;
      point.z = (lowZ + highZ) / 2;
      return point;
    }
    mx /= count;
    my /= count;
    mz /= count;

    // A + λI is symmetric, so only six of its nine entries are kept. `b` is measured from
    // the mass point, which is why it is small even on a world-sized coordinate.
    let a00 = 0;
    let a01 = 0;
    let a02 = 0;
    let a11 = 0;
    let a12 = 0;
    let a22 = 0;
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let usable = 0;

    for (let i = 0; i < count; i++) {
      const at = i * 3;
      let nx = normals[at] as number;
      let ny = normals[at + 1] as number;
      let nz = normals[at + 2] as number;
      const length = Math.hypot(nx, ny, nz);
      if (!(length > 0) || !Number.isFinite(length)) continue;
      nx /= length;
      ny /= length;
      nz /= length;

      a00 += nx * nx;
      a01 += nx * ny;
      a02 += nx * nz;
      a11 += ny * ny;
      a12 += ny * nz;
      a22 += nz * nz;

      const qx = (positions[at] as number) - mx;
      const qy = (positions[at + 1] as number) - my;
      const qz = (positions[at + 2] as number) - mz;
      const along = nx * qx + ny * qy + nz * qz;
      b0 += nx * along;
      b1 += ny * along;
      b2 += nz * along;
      usable++;
    }

    if (usable === 0) {
      point.x = mx;
      point.y = my;
      point.z = mz;
      return point;
    }

    // The trace is the natural scale for both the regulariser and the determinant test:
    // it is the number of planes' worth of curvature in the cell, not a world unit.
    const trace = a00 + a11 + a22;
    const lambda = Math.max(trace / 3, Number.MIN_VALUE) * bias;
    a00 += lambda;
    a11 += lambda;
    a22 += lambda;

    // Cramer's rule for the symmetric 3×3 system. The matrix is positive definite after
    // regularisation, so a small determinant is the only degenerate case left.
    const c00 = a11 * a22 - a12 * a12;
    const c01 = a02 * a12 - a01 * a22;
    const c02 = a01 * a12 - a02 * a11;
    const det = a00 * c00 + a01 * c01 + a02 * c02;
    const limit = Math.max(trace, Number.MIN_VALUE) ** 3 * 1e-18;
    if (!Number.isFinite(det) || Math.abs(det) <= limit) {
      point.x = mx;
      point.y = my;
      point.z = mz;
      return point;
    }

    const c11 = a00 * a22 - a02 * a02;
    const c12 = a01 * a02 - a00 * a12;
    const c22 = a00 * a11 - a01 * a01;
    const inverse = 1 / det;
    const dx = (c00 * b0 + c01 * b1 + c02 * b2) * inverse;
    const dy = (c01 * b0 + c11 * b1 + c12 * b2) * inverse;
    const dz = (c02 * b0 + c12 * b1 + c22 * b2) * inverse;

    point.x = clamp(mx + dx, lowX, highX);
    point.y = clamp(my + dy, lowY, highY);
    point.z = clamp(mz + dz, lowZ, highZ);
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.z)
    ) {
      point.x = mx;
      point.y = my;
      point.z = mz;
    }
    return point;
  }
}

/**
 * Clamped into the cell, with an inset so a vertex never sits exactly on a shared face.
 *
 * **The inset is not cosmetic.** A box corner that lands on a grid point is inside eight
 * cells at once, and a QEF that returns the point exactly makes all eight vertices
 * coincident — a cluster of zero-area quads. A ten-thousandth of a cell is far below what
 * any lighting or collision can see and far enough to keep every quad's four vertices
 * distinct.
 *
 * A cell whose two faces coincide (a degenerate lane) has no interior; its midpoint is
 * the only answer that does not depend on which face won.
 */
const clamp = (value: number, low: number, high: number): number => {
  if (!(high > low)) return (low + high) / 2;
  const inset = (high - low) * 1e-4;
  if (value < low + inset) return low + inset;
  if (value > high - inset) return high - inset;
  return value;
};
