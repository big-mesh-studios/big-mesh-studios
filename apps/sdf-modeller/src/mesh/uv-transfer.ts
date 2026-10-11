/**
 * Carrying a baked set of texture coordinates onto a mesh that has been rebuilt.
 *
 * ## Why the coordinates have to move at all
 *
 * **Because an unwrap is a global operation and an edit is not.** xatlas — or any unwrapper —
 * decides the whole layout at once: which vertices share a chart, where each chart lands in the
 * atlas, and how the space is shared out. Move one part by two units and the next unwrap may
 * renumber every chart and repack every rectangle, so a stroke painted through the old layout
 * would land somewhere else entirely — or nowhere, if the chart it was on got smaller.
 *
 * So the layout is **pinned**: unwrapped once, and thereafter carried forward. Each vertex of a
 * newly rebuilt mesh inherits the texture coordinates of the point on the old surface nearest to
 * it, which is stable under any edit small enough that the surface has not moved past its own
 * neighbours.
 *
 * The cost is that the coordinates drift from the geometry as the model changes. That drift is
 * measured rather than assumed — see {@link UvTransfer} — so the caller can offer a rebake at the
 * point where continuing to carry it stops being reasonable.
 *
 * ## Why the nearest point and not the nearest vertex
 *
 * **Because a vertex is not a surface.** Taking the nearest vertex's coordinates makes every
 * coordinate a step function of position, so a smooth surface picks up the coordinates of whatever
 * happened to be nearest and the pattern visibly staircases across it. The nearest *point on the
 * triangles* is a continuous answer, and interpolating the three vertices' coordinates by the
 * barycentric weights at that point is the natural extension of what the baker itself does across
 * a triangle.
 *
 * ## Why the target is a `ChunkMesh` and not a position array
 *
 * **Because the count is what has to line up.** A `Float32Array` of positions does not say how
 * many vertices there are, and reading the count off its length would quietly derive the answer
 * from an invariant nothing checks — the same trap `finish()`'s copies exist to avoid.
 */
import type { ChunkMesh } from "@big-mesh-studios/meshing";

import { TriangleBVH } from "./triangle-bvh";

/** What carrying coordinates onto another mesh produced, and what it cost. */
export interface UvTransfer {
  /**
   * Two numbers a vertex, in the same order as the target mesh's positions.
   *
   * **A fresh array every time rather than a view over anything.** The caller installs this into
   * a `BufferAttribute`, and rmsl uploads whatever an attribute holds on the next draw — an array
   * still being written into underneath it would put half a stroke on the screen and half on the
   * texture.
   */
  readonly uvs: Float32Array;

  /**
   * The furthest any vertex sits from the surface the coordinates came from, in world units.
   *
   * **The measure of how stale the layout is, and the thing the caller warns on.** A vertex
   * exactly on the old surface has a drift of zero and its coordinates are certainly right; a
   * vertex that has wandered is borrowing coordinates from somewhere it is no longer on, which is
   * what makes a painted stroke smear rather than sit still. Carrying this is cheaper than the
   * alternative, which is the user discovering it.
   */
  readonly drift: number;

  /**
   * How many vertices found no surface at all, and so got no coordinates.
   *
   * **Counted rather than folded into `drift`.** A vertex with no nearest point is a different
   * failure from one that is merely far from it: it means the mesh has grown somewhere the old
   * surface does not reach, and its coordinates are absent rather than wrong. A caller that only
   * watched `drift` would see `NaN` propagate into a shader instead of a number to report.
   */
  readonly unmatched: number;
}

/** The coordinates a transfer gives a vertex that found nothing: the origin of the atlas. */
const NOWHERE = 0;

/**
 * Every vertex of `target`, given the texture coordinates of the nearest point on `surface`.
 *
 * **`uvs` is indexed by the surface mesh's own vertices**, so it must be one whose vertices are
 * the ones the coordinates were baked onto — the pinned reference mesh, not whatever is currently
 * on screen. Feeding this the display mesh's coordinates would transfer twice, once onto the
 * reference and once onto the display, and the second pass would be answering with numbers that
 * had already been through the approximation once.
 */
export const transferUvs = (
  surface: TriangleBVH,
  uvs: Float32Array,
  target: ChunkMesh,
): UvTransfer => {
  const carried = new Float32Array(target.vertexCount * 2);
  let drift = 0;
  let unmatched = 0;

  for (let vertex = 0; vertex < target.vertexCount; vertex++) {
    const at = vertex * 3;
    const hit = surface.closestPoint({
      x: target.positions[at],
      y: target.positions[at + 1],
      z: target.positions[at + 2],
    });

    if (hit === undefined) {
      unmatched++;
      carried[vertex * 2] = NOWHERE;
      carried[vertex * 2 + 1] = NOWHERE;
      continue;
    }

    if (hit.distance > drift) drift = hit.distance;

    const [first, second, third] = hit.vertices;
    const [w0, w1, w2] = hit.weights;
    const a = first * 2;
    const b = second * 2;
    const c = third * 2;

    carried[vertex * 2] = uvs[a] * w0 + uvs[b] * w1 + uvs[c] * w2;
    carried[vertex * 2 + 1] =
      uvs[a + 1] * w0 + uvs[b + 1] * w1 + uvs[c + 1] * w2;
  }

  return { uvs: carried, drift, unmatched };
};
