import { describe, expect, it } from "vitest";

import {
  decodeOctahedral,
  decodeOctahedralSnorm16,
  type Rgb8,
  type Vec3,
} from "@big-mesh-studios/core";
import { sdBox } from "@big-mesh-studios/sdf";

import type { ChunkMesh } from "@big-mesh-studios/meshing";
import type { MeshResolution } from "../world";
import { SurfaceNetsChunkMesher, type MeshField } from "./chunk-mesher";

/**
 * The place case: a floor and a wall made of hard boxes, meeting at a 90° crease.
 *
 * This is what `animal-hospital.json` is — walls are oriented boxes, the floor is a prism,
 * and no item carries softness — so the field is exact and the only thing rounding the
 * crease is the mesher. Surface Nets averages the wall's and the floor's crossings into a
 * point between them; Dual Contouring solves for the line where the two planes meet.
 */

const SHARP: MeshResolution = {
  lodSampleSizes: [10, 20, 40],
  sharpEdges: 35,
};

const PLAIN: MeshResolution = { lodSampleSizes: [10, 20, 40] };

/** The floor's top is just off a sample plane, and the wall runs along x. */
const FLOOR_TOP = 0.37;
const WALL_SIDE = 10.37;
const FLOOR = {
  centre: { x: 0, y: FLOOR_TOP - 10, z: 0 },
  half: { x: 100, y: 10, z: 100 },
} as const;
// **The wall is embedded two units into the floor.** Two solids that touch exactly
// produce a field whose minimum is zero along the contact plane, which is an internal
// surface of the union rather than a boundary of it; a real level should overlap its
// walls into its floor, and this fixture does too.
const WALL = {
  centre: { x: 0, y: FLOOR_TOP + 18, z: WALL_SIDE - 10 },
  half: { x: 100, y: 20, z: 10 },
} as const;

const distanceOf = (
  box: { readonly centre: Vec3; readonly half: Vec3 },
  x: number,
  y: number,
  z: number,
): number =>
  sdBox(box.half, {
    x: x - box.centre.x,
    y: y - box.centre.y,
    z: z - box.centre.z,
  });

/** The outward normal of a box, choosing the nearest face. A valid subgradient. */
const normalOf = (
  box: { readonly centre: Vec3; readonly half: Vec3 },
  x: number,
  y: number,
  z: number,
): Vec3 => {
  const px = x - box.centre.x;
  const py = y - box.centre.y;
  const pz = z - box.centre.z;
  const qx = Math.abs(px) - box.half.x;
  const qy = Math.abs(py) - box.half.y;
  const qz = Math.abs(pz) - box.half.z;
  if (qx >= qy && qx >= qz) {
    return { x: Math.sign(px) || 1, y: 0, z: 0 };
  }
  if (qy >= qz) return { x: 0, y: Math.sign(py) || 1, z: 0 };
  return { x: 0, y: 0, z: Math.sign(pz) || 1 };
};

const field: MeshField = {
  distance: (x, y, z) =>
    Math.min(distanceOf(FLOOR, x, y, z), distanceOf(WALL, x, y, z)),
  distanceForStepping: (x, y, z) =>
    Math.min(distanceOf(FLOOR, x, y, z), distanceOf(WALL, x, y, z)),
  gradient: (x, y, z) =>
    distanceOf(FLOOR, x, y, z) <= distanceOf(WALL, x, y, z)
      ? normalOf(FLOOR, x, y, z)
      : normalOf(WALL, x, y, z),
  colourAt: (): { colour: Rgb8; material: number } => ({
    colour: { r: 180, g: 180, b: 180 },
    material: 0,
  }),
  couldHoldSurface: () => true,
};

const mesh = (resolution: MeshResolution): ChunkMesh =>
  new SurfaceNetsChunkMesher(field, 32, undefined, resolution).mesh({
    cell: { x: 0, y: 0, z: 0 },
    lod: 0,
  });

const normalAt = (mesh: ChunkMesh, vertex: number): Vec3 =>
  decodeOctahedral(
    decodeOctahedralSnorm16(
      mesh.normalOct[vertex * 2] as number,
      mesh.normalOct[vertex * 2 + 1] as number,
    ),
  );

const positionAt = (mesh: ChunkMesh, vertex: number): Vec3 => ({
  x: mesh.positions[vertex * 3] as number,
  y: mesh.positions[vertex * 3 + 1] as number,
  z: mesh.positions[vertex * 3 + 2] as number,
});

/** How far a point is from the long crease, away from the wall's ends. */
const fromCrease = (p: Vec3): number =>
  Math.abs(p.x) < 50
    ? Math.max(Math.abs(p.y - FLOOR_TOP), Math.abs(p.z - WALL_SIDE))
    : Infinity;

const closestToCrease = (mesh: ChunkMesh): number => {
  let best = Infinity;
  for (let i = 0; i < mesh.vertexCount; i++) {
    best = Math.min(best, fromCrease(positionAt(mesh, i)));
  }
  return best;
};

/** A triangle's geometric normal, and the normals stored at its three corners. */
interface Triangle {
  readonly face: Vec3;
  readonly vertices: readonly number[];
}

const trianglesNear = (mesh: ChunkMesh, tolerance: number): Triangle[] => {
  const found: Triangle[] = [];
  for (let t = 0; t < mesh.triangleCount; t++) {
    const vertices = [
      mesh.indices[t * 3] as number,
      mesh.indices[t * 3 + 1] as number,
      mesh.indices[t * 3 + 2] as number,
    ];
    if (!vertices.some((v) => fromCrease(positionAt(mesh, v)) <= tolerance)) {
      continue;
    }

    const [a, b, c] = vertices.map((v) => positionAt(mesh, v)) as [
      Vec3,
      Vec3,
      Vec3,
    ];
    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const uz = b.z - a.z;
    const vx = c.x - a.x;
    const vy = c.y - a.y;
    const vz = c.z - a.z;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    found.push({
      face: { x: nx / length, y: ny / length, z: nz / length },
      vertices,
    });
  }
  return found;
};

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

describe("a hard wall on a floor", () => {
  it("puts the crease's vertices on the crease, not between the two faces", () => {
    const plain = mesh(PLAIN);
    const sharp = mesh(SHARP);
    expect(plain.vertexCount).toBeGreaterThan(0);
    expect(sharp.vertexCount).toBeGreaterThan(0);

    // The crease is a line; a Surface Nets vertex averages the floor crossing and the wall
    // crossing and lands roughly half a cell away from it. A QEF vertex is solved onto it.
    expect(closestToCrease(plain)).toBeGreaterThan(2);
    expect(closestToCrease(sharp)).toBeLessThan(0.1);
  });

  it("gives every triangle on the crease one flat normal", () => {
    const sharp = mesh(SHARP);
    const triangles = trianglesNear(sharp, 1);
    expect(triangles.length).toBeGreaterThan(8);

    let up = 0;
    let side = 0;
    for (const triangle of triangles) {
      for (const vertex of triangle.vertices) {
        // **The split pass's guarantee, checked on the triangles that are actually
        // drawn.** An original vertex may be left behind with its averaged normal when
        // every triangle that named it was split; it is unreferenced, and the rasteriser
        // never sees it.
        expect(dot(normalAt(sharp, vertex), triangle.face)).toBeGreaterThan(
          0.99,
        );
      }
      if (Math.abs(triangle.face.y) > 0.99) up++;
      if (Math.abs(triangle.face.z) > 0.99) side++;
    }

    // Both sides of the crease must be present, or the wall or floor would be missing a
    // face along it.
    expect(up).toBeGreaterThan(0);
    expect(side).toBeGreaterThan(0);
  });

  it("leaves the plain mesh's crease as two offset sheets, which is the bevel", () => {
    const plain = mesh(PLAIN);
    const triangles = trianglesNear(plain, 5.2);
    expect(triangles.length).toBeGreaterThan(0);

    // **The defect this fixture records is geometric, not a normal average.** Surface Nets
    // puts the wall's cell and the floor's cell each in the middle of its own face, half a
    // cell away from the crease, so the two sheets meet at an offset and the corner reads
    // as a chamfer. The QEF turns both cells' vertices into points on the crease; the
    // normal split then stops those now-shared vertices from blending.
    expect(closestToCrease(plain)).toBeGreaterThan(4);
  });

  it("does not split a smooth sphere at the same threshold", () => {
    const sphere: MeshField = {
      distance: (x, y, z) => Math.hypot(x, y, z) - 60,
      distanceForStepping: (x, y, z) => Math.hypot(x, y, z) - 60,
      gradient: (x, y, z) => {
        const length = Math.hypot(x, y, z) || 1;
        return { x: x / length, y: y / length, z: z / length };
      },
      colourAt: () => ({ colour: { r: 180, g: 180, b: 180 }, material: 0 }),
      couldHoldSurface: () => true,
    };

    const plain = new SurfaceNetsChunkMesher(sphere, 32, undefined, PLAIN).mesh(
      {
        cell: { x: 0, y: 0, z: 0 },
        lod: 0,
      },
    );
    const sharp = new SurfaceNetsChunkMesher(sphere, 32, undefined, SHARP).mesh(
      {
        cell: { x: 0, y: 0, z: 0 },
        lod: 0,
      },
    );

    // **The same vertices, because no triangle leaned far enough to split.** QEF placement
    // does move the vertices, so the comparison is of counts rather than positions; the
    // normal pass is the part under test here, and it is the one that would triple a box.
    expect(sharp.triangleCount).toBe(plain.triangleCount);
    expect(sharp.vertexCount).toBe(plain.vertexCount);
  });
});
