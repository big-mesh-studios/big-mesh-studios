import { describe, expect, it } from "vitest";

import {
  decodeOctahedral,
  decodeOctahedralSnorm16,
  type Vec3,
} from "@big-mesh-studios/core";

import { ChunkMeshBuilder, type ChunkMesh } from "./chunk-mesh";
import {
  DEFAULT_SHARP_ANGLE,
  SharpNormalScratch,
  splitSharpNormals,
} from "./sharp-normals";

/** A vertex's stored normal, decoded from the packed attribute. */
const normalOf = (mesh: ChunkMesh, vertex: number): Vec3 =>
  decodeOctahedral(
    decodeOctahedralSnorm16(
      mesh.normalOct[vertex * 2] as number,
      mesh.normalOct[vertex * 2 + 1] as number,
    ),
  );

/** A triangle's geometric normal from its three positions. */
const faceOf = (mesh: ChunkMesh, triangle: number): Vec3 => {
  const index = (corner: number): number =>
    mesh.indices[triangle * 3 + corner] as number;
  const position = (vertex: number): Vec3 => ({
    x: mesh.positions[vertex * 3] as number,
    y: mesh.positions[vertex * 3 + 1] as number,
    z: mesh.positions[vertex * 3 + 2] as number,
  });
  const a = position(index(0));
  const b = position(index(1));
  const c = position(index(2));
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
  return { x: nx / length, y: ny / length, z: nz / length };
};

const unit = (x: number, y: number, z: number): Vec3 => {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
};

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Two triangles meeting at a 90° ridge along x, with the two shared vertices carrying the
 * bisector normal and the other two carrying their own face's normal.
 *
 *     A(0,0,0) --- B(1,0,0)      one face in z = 0, one in y = 0
 *      |             |
 *      D(0,0,1)      C(0,1,0)
 */
const bentPair = (): ChunkMesh => {
  const builder = new ChunkMeshBuilder();
  const bisector = unit(0, 1, 1);
  const a = builder.vertex(0, 0, 0);
  const b = builder.vertex(1, 0, 0);
  const c = builder.vertex(0, 1, 0);
  const d = builder.vertex(0, 0, 1);
  builder.setNormal(a, bisector.x, bisector.y, bisector.z);
  builder.setNormal(b, bisector.x, bisector.y, bisector.z);
  builder.setNormal(c, 0, 0, 1);
  builder.setNormal(d, 0, 1, 0);
  builder.setColour(a, { r: 10, g: 20, b: 30 });
  builder.setColour(b, { r: 40, g: 50, b: 60 });
  builder.setColour(c, { r: 70, g: 80, b: 90 });
  builder.setColour(d, { r: 100, g: 110, b: 120 });
  // The face in z = 0 is (a, b, c); the face in y = 0 is (a, d, b).
  builder.triangle(a, b, c);
  builder.triangle(a, d, b);
  return builder.finish();
};

describe("sharp normals", () => {
  it("has a threshold above a resolved sphere and below a box's 45°", () => {
    expect(DEFAULT_SHARP_ANGLE).toBeGreaterThan(20);
    expect(DEFAULT_SHARP_ANGLE).toBeLessThan(45);
  });

  it("leaves a flat triangle alone, returning the same mesh", () => {
    const builder = new ChunkMeshBuilder();
    const a = builder.vertex(0, 0, 0);
    const b = builder.vertex(1, 0, 0);
    const c = builder.vertex(0, 0, 1);
    builder.setNormal(a, 0, -1, 0);
    builder.setNormal(b, 0, -1, 0);
    builder.setNormal(c, 0, -1, 0);
    builder.triangle(a, b, c);
    const mesh = builder.finish();

    expect(splitSharpNormals(mesh, {}, new SharpNormalScratch())).toBe(mesh);
  });

  it("duplicates both sides of a crease and gives each side its face normal", () => {
    const mesh = bentPair();
    const out = splitSharpNormals(
      mesh,
      { angle: DEFAULT_SHARP_ANGLE },
      new SharpNormalScratch(),
    );

    expect(out.triangleCount).toBe(2);
    expect(out.vertexCount).toBe(10);

    for (let triangle = 0; triangle < out.triangleCount; triangle++) {
      const face = faceOf(out, triangle);
      for (let corner = 0; corner < 3; corner++) {
        const vertex = out.indices[triangle * 3 + corner] as number;
        expect(dot(normalOf(out, vertex), face)).toBeGreaterThan(0.999);
      }
    }

    // The two faces are still the two faces, not a bisector.
    const normals = [faceOf(out, 0), faceOf(out, 1)];
    expect(Math.abs(dot(normals[0] as Vec3, normals[1] as Vec3))).toBeLessThan(
      1e-6,
    );
  });

  it("keeps every position and colour it copies", () => {
    const mesh = bentPair();
    const out = splitSharpNormals(
      mesh,
      { angle: DEFAULT_SHARP_ANGLE },
      new SharpNormalScratch(),
    );

    // The first four vertices are the originals, in order, and the six copies follow.
    for (let vertex = 0; vertex < mesh.vertexCount; vertex++) {
      for (let axis = 0; axis < 3; axis++) {
        expect(out.positions[vertex * 3 + axis]).toBe(
          mesh.positions[vertex * 3 + axis],
        );
      }
      for (let lane = 0; lane < 4; lane++) {
        expect(out.colours[vertex * 4 + lane]).toBe(
          mesh.colours[vertex * 4 + lane],
        );
      }
    }

    // Copies of `a` and `b` follow, each holding the colour of the vertex it copied.
    expect(out.vertexCount).toBe(10);
    expect(out.colours[4 * 4]).toBe(10);
    expect(out.colours[4 * 4 + 1]).toBe(20);
    expect(out.colours[5 * 4]).toBe(40);
    expect(out.colours[5 * 4 + 1]).toBe(50);
  });

  it("splits only the triangles whose corners disagree with them", () => {
    // The same geometry, but with each vertex carrying the exact face normal it belongs
    // to. The crease is in the positions; the shading says it is already two faces.
    const builder = new ChunkMeshBuilder();
    const a = builder.vertex(0, 0, 0);
    const b = builder.vertex(1, 0, 0);
    const c = builder.vertex(0, 1, 0);
    const d = builder.vertex(0, 0, 1);
    for (const vertex of [a, b]) builder.setNormal(vertex, 0, 0, 1);
    builder.setNormal(c, 0, 0, 1);
    builder.setNormal(d, 0, 1, 0);
    builder.triangle(a, b, c);
    builder.triangle(a, d, b);
    // The second triangle's a and b still say +z, so it *does* need a split; one triangle
    // is enough to prove the pass is selective.
    const mesh = builder.finish();
    const out = splitSharpNormals(
      mesh,
      { angle: DEFAULT_SHARP_ANGLE },
      new SharpNormalScratch(),
    );
    expect(out.vertexCount).toBe(7);
    // The flat triangle kept its original three indices; the disagreeing one took copies.
    expect([...out.indices.slice(0, 3)]).toEqual([0, 1, 2]);
    expect([...out.indices.slice(3, 6)]).toEqual([4, 5, 6]);
  });

  it("leaves a degenerate triangle alone rather than inventing a normal", () => {
    const builder = new ChunkMeshBuilder();
    const a = builder.vertex(0, 0, 0);
    const b = builder.vertex(0, 0, 0);
    const c = builder.vertex(0, 0, 0);
    builder.setNormal(a, 0, 1, 0);
    builder.setNormal(b, 0, 0, 1);
    builder.setNormal(c, 1, 0, 0);
    builder.triangle(a, b, c);
    const mesh = builder.finish();

    expect(splitSharpNormals(mesh, {}, new SharpNormalScratch())).toBe(mesh);
  });
});
