import { describe, expect, it } from "vitest";

import type { Rgb8, Vec3 } from "@big-mesh-studios/core";
import { sdBox } from "@big-mesh-studios/sdf";

import { reportMesh, type ChunkMesh } from "@big-mesh-studios/meshing";
import type { MeshResolution } from "../world";
import { SurfaceNetsChunkMesher, type MeshField } from "./chunk-mesher";

/**
 * The animal-hospital case: a blue wall standing on a green floor.
 *
 * A colour is per vertex and the rasteriser blends between vertices, so without a cut every
 * triangle that touches the join is drawn as a ramp. `splitColours` runs the same
 * `splitColourBoundaries` pass the modeller uses, which bisects `colourAt` along each
 * disagreeing edge and cuts there.
 *
 * The fixture's numbers are `sharp-edges.test.ts`'s: a floor top just off a sample plane, and
 * a wall embedded two units into it so the two solids genuinely overlap.
 */

const SAMPLE = 3.2;
const SHARP: MeshResolution = {
  lodSampleSizes: [SAMPLE, SAMPLE * 2, SAMPLE * 4],
  sharpEdges: 35,
  splitColours: true,
};
const PLAIN: MeshResolution = {
  lodSampleSizes: [SAMPLE, SAMPLE * 2, SAMPLE * 4],
};
/** The same surface with the cut off, so a test can compare what the cut itself did. */
const NO_CUT: MeshResolution = { ...PLAIN, sharpEdges: 35 };

const FLOOR_TOP = 0.37;
const WALL_SIDE = 10.37;
const WALL_THICKNESS = 20;

const FLOOR = {
  centre: { x: 0, y: FLOOR_TOP - 100, z: 0 },
  half: { x: 1000, y: 100, z: 1000 },
} as const;
const WALL = {
  centre: { x: 0, y: FLOOR_TOP + 18, z: WALL_SIDE - WALL_THICKNESS / 2 },
  half: { x: 1000, y: 20, z: WALL_THICKNESS / 2 },
} as const;

const GREEN: Rgb8 = { r: 29, g: 93, b: 77 };
const BLUE: Rgb8 = { r: 33, g: 63, b: 96 };

const distanceOf = (
  box: typeof FLOOR | typeof WALL,
  x: number,
  y: number,
  z: number,
): number =>
  sdBox(box.half, {
    x: x - box.centre.x,
    y: y - box.centre.y,
    z: z - box.centre.z,
  });

const normalOf = (
  box: typeof FLOOR | typeof WALL,
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
  if (qx >= qy && qx >= qz) return { x: Math.sign(px) || 1, y: 0, z: 0 };
  if (qy >= qz) return { x: 0, y: Math.sign(py) || 1, z: 0 };
  return { x: 0, y: 0, z: Math.sign(pz) || 1 };
};

const distance = (x: number, y: number, z: number): number =>
  Math.min(distanceOf(FLOOR, x, y, z), distanceOf(WALL, x, y, z));

const field: MeshField = {
  distance,
  distanceForStepping: distance,
  gradient: (x, y, z) =>
    distanceOf(FLOOR, x, y, z) <= distanceOf(WALL, x, y, z)
      ? normalOf(FLOOR, x, y, z)
      : normalOf(WALL, x, y, z),
  // **The field's own ownership rule: nearest own surface, ties to the later operation.**
  colourAt: (x, y, z) => ({
    colour:
      distanceOf(WALL, x, y, z) <= distanceOf(FLOOR, x, y, z) ? BLUE : GREEN,
    material: 0,
  }),
  couldHoldSurface: () => true,
};

const meshCell = (
  cell: { readonly x: number; readonly y: number; readonly z: number },
  resolution: MeshResolution,
): ChunkMesh =>
  new SurfaceNetsChunkMesher(field, 32, undefined, resolution).mesh({
    cell,
    lod: 0,
  });

const mesh = (resolution: MeshResolution): ChunkMesh =>
  meshCell({ x: 0, y: 0, z: 0 }, resolution);

const positionAt = (mesh: ChunkMesh, vertex: number): Vec3 => ({
  x: mesh.positions[vertex * 3] as number,
  y: mesh.positions[vertex * 3 + 1] as number,
  z: mesh.positions[vertex * 3 + 2] as number,
});

const colourKey = (mesh: ChunkMesh, vertex: number): number =>
  ((mesh.colours[vertex * 4] as number) << 16) |
  ((mesh.colours[vertex * 4 + 1] as number) << 8) |
  (mesh.colours[vertex * 4 + 2] as number);

/** Triangles whose three corners would be drawn as a ramp. */
const blendedTriangles = (mesh: ChunkMesh): number => {
  let count = 0;
  for (let t = 0; t < mesh.triangleCount; t++) {
    const first = colourKey(mesh, mesh.indices[t * 3] as number);
    if (
      colourKey(mesh, mesh.indices[t * 3 + 1] as number) !== first ||
      colourKey(mesh, mesh.indices[t * 3 + 2] as number) !== first
    ) {
      count++;
    }
  }
  return count;
};

/** How far a point is from the nearest of the wall's two long creases with the floor. */
const fromCrease = (p: Vec3): number =>
  Math.min(
    Math.abs(p.y - FLOOR_TOP),
    Math.abs(p.z - WALL_SIDE),
    Math.abs(p.z - (WALL_SIDE - WALL_THICKNESS)),
  );

describe("a coloured wall on a coloured floor", () => {
  it("blends across the join when the cut is off", () => {
    const plain = mesh(PLAIN);
    expect(blendedTriangles(plain)).toBeGreaterThan(0);
  });

  it("leaves no triangle blending when the cut is on", () => {
    const cut = mesh(SHARP);
    expect(cut.triangleCount).toBeGreaterThan(0);
    expect(blendedTriangles(cut)).toBe(0);
  });

  it("puts the colour boundary on the crease rather than across the cell", () => {
    const cut = mesh(SHARP);
    // The cut duplicates the vertices on the boundary, so the boundary is found by position:
    // a position named by triangles of both colours is on it.
    const byPosition = new Map<
      string,
      { readonly point: Vec3; readonly colours: Set<number> }
    >();
    for (let t = 0; t < cut.triangleCount; t++) {
      const colour = colourKey(cut, cut.indices[t * 3] as number);
      for (let k = 0; k < 3; k++) {
        const vertex = cut.indices[t * 3 + k] as number;
        const point = positionAt(cut, vertex);
        const key = `${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
        const entry = byPosition.get(key);
        if (entry === undefined) {
          byPosition.set(key, { point, colours: new Set([colour]) });
        } else {
          entry.colours.add(colour);
        }
      }
    }

    let boundary = 0;
    for (const { point, colours } of byPosition.values()) {
      if (colours.size < 2) continue;
      boundary++;
      // **One sample is the budget**, which is the width the blend used to have. The cut
      // should be a small fraction of it; the fixture's crease is deliberately off the
      // sample planes, so the only error is the bisection's tolerance.
      expect(fromCrease(point)).toBeLessThan(SAMPLE);
    }
    expect(boundary).toBeGreaterThan(0);
  });

  it("does not change whether the mesh is manifold or consistently wound", () => {
    const before = reportMesh(mesh(NO_CUT));
    const after = reportMesh(mesh(SHARP));
    // **Not `boundaryEdges`, which the cut is allowed to raise.** A cut that lands on an edge
    // the chunk already leaves open subdivides it, so the perimeter has more edges in it while
    // being the same perimeter. Manifoldness and winding are the properties the cut must not
    // touch, and the enclosed volume is the check that the surface did not move.
    expect(after.nonManifoldEdges).toBe(before.nonManifoldEdges);
    expect(after.inconsistentEdges).toBe(before.inconsistentEdges);
    expect(after.degenerateTriangles).toBe(0);
    expect(Math.abs(after.volume - before.volume)).toBeLessThan(1e-3);
  });

  it("cuts the colour boundary identically on both sides of a chunk seam", () => {
    // **The seam is the risk the pass introduces.** Each chunk is cut on its own, so the two
    // must agree on the end of the wall and the floor where they meet the shared column of
    // cells. Both chunks run the same rule on the same shared vertex, so what this checks is
    // that the cut neither moved nor recoloured one side of it.
    const left = meshCell({ x: 0, y: 0, z: 0 }, SHARP);
    const right = meshCell({ x: 1, y: 0, z: 0 }, SHARP);
    expect(blendedTriangles(left)).toBe(0);
    expect(blendedTriangles(right)).toBe(0);

    // **A cut leaves two vertices at one position, one per colour.** Those positions are the
    // colour boundary, so comparing them compares the two seams' understanding of where it is.
    const boundaryPositions = (mesh: ChunkMesh): Vec3[] => {
      const byPosition = new Map<
        string,
        { point: Vec3; colours: Set<number> }
      >();
      for (let t = 0; t < mesh.triangleCount; t++) {
        const colour = colourKey(mesh, mesh.indices[t * 3] as number);
        for (let k = 0; k < 3; k++) {
          const vertex = mesh.indices[t * 3 + k] as number;
          const point = positionAt(mesh, vertex);
          const key = `${point.x.toFixed(4)},${point.y.toFixed(4)},${point.z.toFixed(4)}`;
          const entry = byPosition.get(key);
          if (entry === undefined) {
            byPosition.set(key, { point, colours: new Set([colour]) });
          } else {
            entry.colours.add(colour);
          }
        }
      }
      return [...byPosition.values()]
        .filter((entry) => entry.colours.size > 1)
        .map((entry) => entry.point);
    };

    const leftBoundary = boundaryPositions(left);
    const rightBoundary = boundaryPositions(right);
    expect(leftBoundary.length).toBeGreaterThan(0);
    expect(rightBoundary.length).toBeGreaterThan(0);

    // The last column the left chunk owns and the first the right one owns are the same world
    // cells, so they sit at the same `x`. Everything on that column must agree.
    const seam = Math.max(...leftBoundary.map((point) => point.x));
    expect(Math.min(...rightBoundary.map((point) => point.x))).toBeCloseTo(
      seam,
      3,
    );
    const profile = (points: Vec3[]): string[] =>
      points
        .filter((point) => Math.abs(point.x - seam) < 1e-3)
        .map((point) => `${point.y.toFixed(4)},${point.z.toFixed(4)}`)
        .sort();
    expect(profile(leftBoundary).length).toBeGreaterThan(0);
    expect(profile(rightBoundary)).toEqual(profile(leftBoundary));
  });

  it("costs nothing on a place with one colour", () => {
    const monochrome: MeshField = {
      ...field,
      colourAt: () => ({ colour: GREEN, material: 0 }),
    };
    const run = (resolution: MeshResolution): ChunkMesh =>
      new SurfaceNetsChunkMesher(monochrome, 32, undefined, resolution).mesh({
        cell: { x: 0, y: 0, z: 0 },
        lod: 0,
      });
    const plain = run(NO_CUT);
    const cut = run(SHARP);
    expect(cut.triangleCount).toBe(plain.triangleCount);
    expect(cut.vertexCount).toBe(plain.vertexCount);
  });

  it("darkens the floor where it meets the wall, and not in the open", () => {
    // **The same geometry with occlusion baked in.** The pass is a multiplier on the colour,
    // so the triangle and vertex counts are the identity check: if it moved anything, it
    // would be visible here before the colour was even compared.
    const plain = mesh(NO_CUT);
    const shaded = mesh({ ...NO_CUT, bakeOcclusion: 0.8 });
    expect(shaded.triangleCount).toBe(plain.triangleCount);
    expect(shaded.vertexCount).toBe(plain.vertexCount);

    // Vertices keep their order, so one scan finds both meshes' samples. The wall's side is at
    // `z = WALL_SIDE`; the floor outside it is the only floor here that is not under the wall.
    let near = -1;
    let open = -1;
    for (let vertex = 0; vertex < plain.vertexCount; vertex++) {
      const point = positionAt(plain, vertex);
      if (Math.abs(point.y - FLOOR_TOP) > 0.5) continue;
      if (point.z > WALL_SIDE && point.z < WALL_SIDE + SAMPLE * 2)
        near = vertex;
      if (point.z > WALL_SIDE + SAMPLE * 7) open = vertex;
    }
    expect(near).toBeGreaterThanOrEqual(0);
    expect(open).toBeGreaterThanOrEqual(0);

    const brightness = (mesh: ChunkMesh, vertex: number): number =>
      (mesh.colours[vertex * 4] as number) +
      (mesh.colours[vertex * 4 + 1] as number) +
      (mesh.colours[vertex * 4 + 2] as number);

    // A crease is darker; a floor seven samples from it is far enough that the reach cannot
    // see the wall, so it must be untouched.
    expect(brightness(shaded, near)).toBeLessThan(brightness(plain, near));
    expect(brightness(shaded, open)).toBe(brightness(plain, open));
    // The material byte is still the field's answer, not a shade.
    expect(shaded.colours[near * 4 + 3]).toBe(plain.colours[near * 4 + 3]);
  });
});
