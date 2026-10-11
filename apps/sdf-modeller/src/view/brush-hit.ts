/**
 * Where the brush is, and how big it is, in the two places it has to be.
 *
 * ## Why the arithmetic is here and not in the component
 *
 * **Because "which texel does this ray land on" is arithmetic that can be wrong in a way nothing
 * on screen reveals.** A cursor that is a texel off looks like a cursor; a cursor two texels off
 * looks like a cursor. But a ray that hit the wrong triangle — the display mesh rather than the
 * pinned one — would paint a stroke that appears somewhere the pointer is not, which is the kind
 * of bug that gets believed rather than reported.
 *
 * So this is a file of functions with no renderer in it, tested against numbers, exactly as
 * `move-handle.ts` and `rotate-handle.ts` are for their tools.
 */
import type { Vec3 } from "@big-mesh-studios/core";
import { rayThroughScreen, toNdc, type Ray } from "@big-mesh-studios/picking";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";

import { TriangleBVH, type RayHit } from "../mesh/triangle-bvh";
import type { ScreenPoint, ScreenSize } from "./move-handle";

/** A place on the model, in the two coordinate systems a brush needs at once. */
export interface BrushHit {
  /** Where on the surface, in world units. The cursor stands here. */
  readonly point: Vec3;
  /** The outward normal there, which the cursor is laid flat against. */
  readonly normal: Vec3;
  /** Where in the atlas that point is, `0..1` in both axes. The stroke is stamped here. */
  readonly uv: readonly [number, number];
  /** Distance along the ray, which the cursor uses to sit a little proud of the surface. */
  readonly distance: number;

  /**
   * Which chart of the atlas this point is in.
   *
   * **The one number that says whether two samples can be joined by a line.** The atlas is a
   * packing of separate pieces of the model, and two samples in different charts have no path
   * between them that means anything — a straight line from one to the other crosses whatever
   * charts happen to be packed in between. So a stroke that knows its chart can refuse to draw
   * across a seam, and one that does not paints a stripe through the middle of the model.
   *
   * `-1` where the mesh has no chart information to give, which makes the recorder fall back to
   * joining the samples — the behaviour before this existed, and the right answer for a mesh
   * with no seams in it.
   */
  readonly chart: number;
}

/**
 * Where a screen point lands on the baked model, in both coordinate systems.
 *
 * **The ray goes at the reference mesh rather than at the mesh on screen.** The texture
 * coordinates belong to the reference — that is what "pinned" means, and everything downstream
 * carries them from there — so a stroke placed from a hit on the display mesh would be reading
 * coordinates off a triangle that does not have any. It also means a stroke means the same thing
 * at every resolution the viewport happens to be showing.
 *
 * **`undefined` for a ray that misses**, which is a tap on the sky, a tap past the model, or a
 * tap while a bake is still running.
 */
export const brushHit = (
  surface: TriangleBVH,
  uvs: Float32Array,
  camera: PerspectiveCamera,
  size: ScreenSize,
  pointer: ScreenPoint,
  charts?: Uint32Array,
): BrushHit | undefined => {
  const ndc = toNdc(pointer.x, pointer.y, size.width, size.height);
  return brushHitAlong(
    surface,
    uvs,
    rayThroughScreen(camera, ndc.x, ndc.y),
    charts,
  );
};

/** The same question asked of a ray rather than of a screen point, so it can be tested directly. */
export const brushHitAlong = (
  surface: TriangleBVH,
  uvs: Float32Array,
  ray: Ray,
  charts?: Uint32Array,
): BrushHit | undefined => {
  const hit: RayHit | undefined = surface.intersectRay(ray);
  if (hit === undefined) return undefined;

  return {
    point: hit.point,
    // **The triangle's own normal, not a smoothed one.** A brush cursor wants to know which way
    // this face points, and on a meshed figure a smoothed normal is an average across an edge the
    // cursor is sitting on top of — so it would lie about exactly where the edge is. The hit
    // carries the face's own because the BVH had all three corners loaded to test the ray.
    normal: hit.normal,
    uv: uvAt(uvs, hit),
    // **Read off the triangle's first corner**, and that is safe rather than lazy: the invariant
    // that all three corners of a triangle share a chart is the thing `unwrap.ts` exists to
    // guarantee, and it is asserted over every triangle in `unwrap.test.ts`.
    chart: charts === undefined ? -1 : (charts[hit.vertices[0]] ?? -1),
    distance: hit.distance,
  };
};

/** Where on the atlas a triangle's hit is, by the same three weights everything else uses. */
export const uvAt = (
  uvs: Float32Array,
  hit: {
    vertices: readonly [number, number, number];
    weights: readonly [number, number, number];
  },
): readonly [number, number] => {
  const [first, second, third] = hit.vertices;
  const [w0, w1, w2] = hit.weights;
  return [
    uvs[first * 2]! * w0 + uvs[second * 2]! * w1 + uvs[third * 2]! * w2,
    uvs[first * 2 + 1]! * w0 +
      uvs[second * 2 + 1]! * w1 +
      uvs[third * 2 + 1]! * w2,
  ];
};

/**
 * How wide the brush is, in texels, for a given world-space diameter.
 *
 * **Through the atlas's own density rather than through a constant.** A brush is a circle on a
 * model and a disc in a texture, and the number that joins them is texels per world unit — which
 * is the unwrap's `texelsPerUnit` and is different for every model, because a figure twice as big
 * gets the same atlas and therefore half the density. Without this a brush would be twice as wide
 * on a large model as on a small one, which is the one thing a brush must never be.
 */
export const brushWidthTexels = (
  worldDiameter: number,
  texelsPerUnit: number,
): number => Math.max(1, worldDiameter * texelsPerUnit);

/**
 * How far off the surface the cursor is drawn, in world units.
 *
 * **A fraction of the camera's distance rather than a constant**, so the ring keeps its size on
 * screen the way the move handles' arrows do. See `move-handle.ts`'s `VIEW_SHARE`.
 */
export const CURSOR_LIFT = 0.002;
