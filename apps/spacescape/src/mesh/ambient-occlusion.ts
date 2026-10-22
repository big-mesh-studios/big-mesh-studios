/**
 * Baking ambient occlusion into a chunk's vertex colours.
 *
 * ## Why the mesher does this
 *
 * **A place's corners are drawn as flatly as its open floor.** The surface material has one
 * directional sun, one moon, a flat ambient and the place's point lights, and no shadow map.
 * A wall meeting a floor is therefore lit as though the two were floating apart: the crease
 * has no darkness, the inside of a doorway has none, and a chair sits on a floor with no
 * contact tone. A screen-space pass would need a depth buffer and a second draw; a vertex
 * term needs only the field the mesher has already sampled, and it survives the chunk being
 * uploaded as it is.
 *
 * **The fourth colour byte is the material id**, so there is no spare channel for an
 * occlusion value and no vertex-format change worth making for one byte. Multiplying the
 * colour is the honest version of "this corner sees less light": the material pattern still
 * multiplies in afterwards, so a brick wall keeps its courses and gets darker in the corner.
 * The cost is that the shade is baked rather than relit when the hour changes; ambient
 * occlusion is a property of the geometry, not of where the sun is, so that is the right
 * thing to bake.
 *
 * ## What it measures
 *
 * A vertex on a surface has a normal. A ray leaving the surface at an angle to that normal
 * and travelling a fixed **normal** distance `r` is in open air if the field's distance at
 * the far end is about `r`; it is in a corner if that distance is smaller. Four rays, spread
 * evenly around the normal, are enough to tell a crease from a plane:
 *
 * - A plane answers `r` for every ray, so nothing is darkened. (The ray is longer than `r`
 *   by `1 / cos(tilt)`; comparing against the ray length instead of the normal distance would
 *   make every flat surface read as occluded, which is why the reach is divided out here.)
 * - A convex edge answers more than `r`, so it stays bright.
 * - A concave corner answers less, in proportion to how close the other surface is.
 *
 * **The reach is scaled by the place's finest sample spacing, not by the level's own.**
 * Otherwise a wall would get a band twice as wide when its chunk coarsens, and the LOD step
 * would show as a change in shading as well as in silhouette. The finest spacing also makes
 * the band proportional to the place: a room at 3.2 units gets a band a few cells wide, which
 * is the scale of a skirting board rather than of the room.
 *
 * ## Where it sits in the pipeline
 *
 * **After `splitColourBoundaries`, never before.** That pass decides where a colour changes by
 * comparing the four bytes at the ends of a mesh edge. A vertex darkened by this pass would
 * disagree with its neighbour even on a surface of one colour, so the cut would run along every
 * change in the occlusion gradient and turn a smooth wall into a patchwork of tiny triangles.
 * The cut gets the field's exact colours; this pass gets the finished mesh.
 *
 * **Sharp normals are what make the crease read on both sides.** `splitSharpNormals` duplicates
 * the vertices along a hard edge and gives each copy its face's normal, so the floor copy of a
 * crease vertex measures the wall above it and the wall copy measures the floor below. A single
 * averaged normal would have pointed into the room and seen neither surface.
 */

import {
  decodeOctahedral,
  decodeOctahedralSnorm16,
  type Vec3,
} from "@big-mesh-studios/core";
import type { ChunkMesh } from "@big-mesh-studios/meshing";

/** The part of a field this pass asks for. */
export interface OcclusionField {
  distance(x: number, y: number, z: number): number;
}

export interface OcclusionOptions {
  /** How much of the measured occlusion reaches the colour. 0 to 1. */
  readonly strength: number;
  /**
   * The world distance one unit of reach spans: the place's finest sample spacing.
   *
   * **The finest rather than the level's own**, so a wall's shade is the same at every level
   * of detail. Zero or negative turns the pass off, which the validator has already refused.
   */
  readonly scale: number;
}

/**
 * How far out a sample is taken, in `scale`s.
 *
 * **One reach, and a generous one.** A single point along a ray only tells a crease from
 * open air; it cannot also measure a gradient, which is why the shade at a corner is a band
 * rather than a curve into the room. Two reaches measured that curve and doubled the field
 * calls for it. At 2.5 samples the band is wide enough to read under a point light and
 * narrow enough not to grey a whole floor; on the hospital level four taps a vertex added
 * **6.6%** to meshing time (min of three runs, 3.2-unit samples).
 */
const REACHES = [2.5] as const;

/**
 * The tangent-to-normal ratio of the four rays, which is 45°.
 *
 * **A fixed angle rather than a hemisphere of samples**, because the surfaces that need this
 * are planes meeting at right angles and one ray per quadrant finds them. More rays would
 * measure a curved surface more accurately and cost proportionally more; a place that wants
 * that can raise the strength and let the four carry it.
 */
const TILT = 1;

/** The darkest a fully occluded vertex may get. */
export const MIN_OCCLUSION_SHADE = 0.4;

/**
 * How far from a vertex this pass may ask the field for a distance, in `scale`s.
 *
 * **The mesher needs this to declare a region wide enough.** A field's candidate cache
 * serves a declared region exactly and rebuilds when a point strays outside it, so a pass
 * that samples past the chunk's own samples would turn a cache built for one chunk into a
 * rebuild per vertex. Growing the region by this distance before the pass keeps the whole
 * sweep on one cache.
 */
export const OCCLUSION_REACH = Math.max(...REACHES) * Math.hypot(1, TILT);

/** The four directions around the normal, in the tangent plane. */
const ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;

/** The cosines and sines the four directions need, computed once. */
const COS_TILT = 1 / Math.hypot(1, TILT);
const SIN_TILT = TILT / Math.hypot(1, TILT);
const RAY_PER_REACH = Math.hypot(1, TILT);
const SAMPLES = ANGLES.length * REACHES.length;

/** A vertex's normal, unfolded from the two signed bytes the mesh carries. */
const normalAt = (mesh: ChunkMesh, vertex: number): Vec3 =>
  decodeOctahedral(
    decodeOctahedralSnorm16(
      mesh.normalOct[vertex * 2] as number,
      mesh.normalOct[vertex * 2 + 1] as number,
    ),
  );

/**
 * Multiplies every vertex's colour by the ambient occlusion at its position, in place.
 *
 * **The mesh is the one that leaves the mesher**, so there is no copy: the arrays were just
 * built for this chunk and nothing else holds them. The fourth byte is left alone, because a
 * darker brick is still brick.
 */
export const bakeAmbientOcclusion = (
  mesh: ChunkMesh,
  field: OcclusionField,
  options: OcclusionOptions,
): void => {
  const strength = Math.max(0, Math.min(1, options.strength));
  if (strength === 0 || !(options.scale > 0)) return;

  const { positions, colours, vertexCount } = mesh;

  for (let vertex = 0; vertex < vertexCount; vertex++) {
    const normal = normalAt(mesh, vertex);
    if (
      !Number.isFinite(normal.x) ||
      !Number.isFinite(normal.y) ||
      !Number.isFinite(normal.z)
    ) {
      continue;
    }

    // **A tangent basis chosen from the normal's smallest component**, so the cross product
    // cannot collapse for a normal that happens to lie along an axis. Two unit vectors span
    // the plane the four rays tilt in.
    const ax = Math.abs(normal.x);
    const ay = Math.abs(normal.y);
    const az = Math.abs(normal.z);
    let ux = 0;
    let uy = 0;
    let uz = 0;
    if (ax <= ay && ax <= az) ux = 1;
    else if (ay <= az) uy = 1;
    else uz = 1;

    let t1x = uy * normal.z - uz * normal.y;
    let t1y = uz * normal.x - ux * normal.z;
    let t1z = ux * normal.y - uy * normal.x;
    const t1Length = Math.hypot(t1x, t1y, t1z);
    if (!(t1Length > 0)) continue;
    t1x /= t1Length;
    t1y /= t1Length;
    t1z /= t1Length;

    const t2x = normal.y * t1z - normal.z * t1y;
    const t2y = normal.z * t1x - normal.x * t1z;
    const t2z = normal.x * t1y - normal.y * t1x;

    const x = positions[vertex * 3] as number;
    const y = positions[vertex * 3 + 1] as number;
    const z = positions[vertex * 3 + 2] as number;

    let occlusion = 0;
    for (const reach of REACHES) {
      const distance = reach * options.scale;
      // The ray whose *normal* component is `distance`; a flat plane then answers exactly
      // `distance` no matter which way around the normal the ray leans.
      const ray = distance * RAY_PER_REACH;
      for (const angle of ANGLES) {
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const dx = normal.x * COS_TILT + (t1x * cosine + t2x * sine) * SIN_TILT;
        const dy = normal.y * COS_TILT + (t1y * cosine + t2y * sine) * SIN_TILT;
        const dz = normal.z * COS_TILT + (t1z * cosine + t2z * sine) * SIN_TILT;
        const measured = field.distance(
          x + dx * ray,
          y + dy * ray,
          z + dz * ray,
        );
        if (!Number.isFinite(measured)) continue;
        occlusion += Math.max(0, Math.min(1, (distance - measured) / distance));
      }
    }

    const shade = Math.max(
      MIN_OCCLUSION_SHADE,
      1 - strength * (occlusion / SAMPLES),
    );
    colours[vertex * 4] = Math.round((colours[vertex * 4] as number) * shade);
    colours[vertex * 4 + 1] = Math.round(
      (colours[vertex * 4 + 1] as number) * shade,
    );
    colours[vertex * 4 + 2] = Math.round(
      (colours[vertex * 4 + 2] as number) * shade,
    );
  }
};
