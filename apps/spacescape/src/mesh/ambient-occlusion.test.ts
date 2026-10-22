import { describe, expect, it } from "vitest";
import { writeOctahedralNormal } from "@big-mesh-studios/core";
import type { ChunkMesh } from "@big-mesh-studios/meshing";

import { MIN_OCCLUSION_SHADE, bakeAmbientOcclusion } from "./ambient-occlusion";

/**
 * The occlusion pass is a multiplier on a colour, so what it must not do is as important as
 * what it must: a flat wall may not darken itself, the material byte must survive, and a
 * strength of zero must leave the mesh exactly as it was.
 *
 * The field is stubbed rather than modelled, because these tests are about the arithmetic
 * between a distance and a colour — a real field would test the field.
 */

const meshOf = (
  at: readonly [number, number, number],
  normal: readonly [number, number, number],
  colour: readonly [number, number, number, number] = [200, 160, 90, 3],
): ChunkMesh => {
  const mesh: ChunkMesh = {
    positions: new Float32Array(at),
    normalOct: new Int16Array(2),
    colours: new Uint8Array(colour),
    indices: new Uint32Array(0),
    vertexCount: 1,
    triangleCount: 0,
  };
  writeOctahedralNormal(mesh.normalOct, 0, {
    x: normal[0],
    y: normal[1],
    z: normal[2],
  });
  return mesh;
};

const rgb = (mesh: ChunkMesh): number[] => [...mesh.colours];

describe("baking ambient occlusion", () => {
  it("leaves a flat surface alone, whichever way it faces", () => {
    // A plane's distance is exactly the reach for every ray, because the ray is measured by
    // its normal component rather than its length. Comparing against the length would make
    // every flat surface read as occluded; that is the mistake this pins.
    for (const normal of [
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, -1],
    ] as const) {
      const flat = meshOf([0, 0, 0], normal);
      bakeAmbientOcclusion(
        flat,
        {
          distance: (x, y, z) =>
            Math.abs(x * normal[0] + y * normal[1] + z * normal[2]),
        },
        { strength: 1, scale: 3.2 },
      );
      expect(rgb(flat), String(normal)).toEqual([200, 160, 90, 3]);
    }
  });

  it("darkens in proportion to how much the ray is closed in", () => {
    // The field answers half the distance from the surface, so every ray is equally
    // occluded and the shade is a number the test can compute. The half is measured from
    // the vertex, which is what makes this check the *distance* the pass compares, not the
    // ray's length.
    const at = [10, -3, 7] as const;
    const mesh = meshOf(at, [0, 1, 0]);
    bakeAmbientOcclusion(
      mesh,
      {
        distance: (x, y, z) =>
          0.5 * Math.hypot(x - at[0], y - at[1], z - at[2]),
      },
      { strength: 0.8, scale: 3.2 },
    );

    // The ray is `reach * sqrt(2)` long, so half of it is `reach / sqrt(2)`; the fraction of
    // the reach that is missing is `1 - 1/sqrt(2)`, the same for every ray.
    const shade = 1 - 0.8 * (1 - Math.SQRT1_2);
    expect(mesh.colours[0]).toBe(Math.round(200 * shade));
    expect(mesh.colours[1]).toBe(Math.round(160 * shade));
    expect(mesh.colours[2]).toBe(Math.round(90 * shade));
    // **A darker brick is still brick.** The material id is the fourth byte and this pass
    // must not touch it.
    expect(mesh.colours[3]).toBe(3);
  });

  it("clamps a fully enclosed vertex instead of turning it black", () => {
    const mesh = meshOf([0, 0, 0], [0, 1, 0]);
    bakeAmbientOcclusion(
      mesh,
      { distance: () => 0 },
      { strength: 1, scale: 3.2 },
    );
    expect(mesh.colours[0]).toBe(Math.round(200 * MIN_OCCLUSION_SHADE));
    expect(mesh.colours[1]).toBe(Math.round(160 * MIN_OCCLUSION_SHADE));
    expect(mesh.colours[2]).toBe(Math.round(90 * MIN_OCCLUSION_SHADE));
    expect(mesh.colours[3]).toBe(3);
  });

  it("leaves the mesh alone at zero strength", () => {
    // Zero and absent are the same request; the mesher normalises them away, and the pass
    // is allowed to be called with it directly.
    const mesh = meshOf([0, 0, 0], [0, 1, 0]);
    bakeAmbientOcclusion(
      mesh,
      { distance: () => 0 },
      { strength: 0, scale: 3.2 },
    );
    expect(rgb(mesh)).toEqual([200, 160, 90, 3]);
  });

  it("leaves a convex surface alone, however close the sample is", () => {
    // A field reporting much more than the reach is air: the ray is not enclosed.
    const mesh = meshOf([0, 0, 0], [0, 1, 0]);
    bakeAmbientOcclusion(
      mesh,
      { distance: () => 1e6 },
      { strength: 1, scale: 3.2 },
    );
    expect(rgb(mesh)).toEqual([200, 160, 90, 3]);
  });

  it("does nothing to a mesh with no vertices", () => {
    const mesh: ChunkMesh = {
      positions: new Float32Array(0),
      normalOct: new Int16Array(0),
      colours: new Uint8Array(0),
      indices: new Uint32Array(0),
      vertexCount: 0,
      triangleCount: 0,
    };
    expect(() =>
      bakeAmbientOcclusion(
        mesh,
        { distance: () => 0 },
        { strength: 1, scale: 3.2 },
      ),
    ).not.toThrow();
  });

  it("treats a non-finite distance as unknown rather than as a dark corner", () => {
    const mesh = meshOf([0, 0, 0], [0, 1, 0]);
    bakeAmbientOcclusion(
      mesh,
      { distance: () => Number.NaN },
      { strength: 1, scale: 3.2 },
    );
    expect(rgb(mesh)).toEqual([200, 160, 90, 3]);
  });
});
