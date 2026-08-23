// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { VoxelTileConfig } from "./atlas";
import {
  buildBlockMesh,
  buildWaterMesh,
  extractBlockShells,
  makeBlockResolver,
  makeShellResolver,
  meshArraysToGeometry,
  setGeometryData,
  type BlockGridResolver,
  type MeshArrays,
} from "./mesh";
import {
  VOXEL_AIR,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_WATER,
  VoxelStore,
} from "../world/voxel-store";

const smallStore = (): VoxelStore =>
  new VoxelStore({ dims: [8, 8, 8], voxels: [4, 4, 4], scale: 2 });

/**
 * No neighbouring blocks: horizontal out-of-bounds resolves to air, the
 * floor below y=0 is solid and the ceiling above is air (same rules as
 * `sweepSurface`).
 */
const noNeighbors = (store: VoxelStore): BlockGridResolver =>
  makeBlockResolver(store, 0, 0, () => undefined);

const faceCount = (mesh: MeshArrays): number => mesh.indices.length / 6;
const vertexCount = (mesh: MeshArrays): number => mesh.positions.length / 3;

/** Collects each vertex's normal, keyed to its uv. */
const facesByNormal = (
  mesh: MeshArrays,
): Map<string, Array<[number, number]>> => {
  const out = new Map<string, Array<[number, number]>>();
  for (let i = 0; i < vertexCount(mesh); i++) {
    const key = `${mesh.normals[i * 3]},${mesh.normals[i * 3 + 1]},${mesh.normals[i * 3 + 2]}`;
    let list = out.get(key);
    if (list === undefined) {
      list = [];
      out.set(key, list);
    }
    list.push([mesh.uvs[i * 2], mesh.uvs[i * 2 + 1]]);
  }
  return out;
};

const hasNormal = (
  mesh: MeshArrays,
  x: number,
  y: number,
  z: number,
): boolean => {
  for (let i = 0; i < vertexCount(mesh); i++) {
    if (
      mesh.normals[i * 3] === x &&
      mesh.normals[i * 3 + 1] === y &&
      mesh.normals[i * 3 + 2] === z
    ) {
      return true;
    }
  }
  return false;
};

describe("buildBlockMesh", () => {
  it("emits all six faces of an isolated voxel", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const mesh = buildBlockMesh(store, noNeighbors(store), []);
    expect(faceCount(mesh)).toBe(6);
    expect(vertexCount(mesh)).toBe(24);
    for (const normal of [
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]) {
      expect(hasNormal(mesh, normal[0], normal[1], normal[2])).toBe(true);
    }
  });

  it("does not mesh the interior of a solid cube", () => {
    const store = smallStore();
    for (let z = 1; z <= 3; z++) {
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
    }
    const mesh = buildBlockMesh(store, noNeighbors(store), []);
    // 3x3x3 cube: 6 faces x 9 unit faces
    expect(faceCount(mesh)).toBe(54);
    expect(vertexCount(mesh)).toBe(54 * 4);
    // the shell only: each cube face contributes 9 unit quads (4 verts each)
    const yShell = facesByNormal(mesh);
    expect(yShell.get("1,0,0")?.length).toBe(36);
    expect(yShell.get("-1,0,0")?.length).toBe(36);
    expect(yShell.get("0,0,1")?.length).toBe(36);
    expect(yShell.get("0,0,-1")?.length).toBe(36);
    expect(yShell.get("0,1,0")?.length).toBe(36);
    expect(yShell.get("0,-1,0")?.length).toBe(36);
  });

  it("never surfaces the block floor of a fully solid store", () => {
    const store = smallStore();
    for (let z = 0; z < 4; z++) {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
    }
    const mesh = buildBlockMesh(store, noNeighbors(store), []);
    expect(hasNormal(mesh, 0, -1, 0)).toBe(false);
    // every column's top voxel exposes its top face (16 quads x 4 verts)
    const faces = facesByNormal(mesh);
    expect(faces.get("0,1,0")?.length ?? 0).toBe(64);
  });

  it("keeps terrain that touches water", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_DIRT);
    store.set(1, 2, 1, VOXEL_DIRT);
    store.set(1, 3, 1, VOXEL_WATER);
    const mesh = buildBlockMesh(store, noNeighbors(store), []);
    // the top terrain voxel is exposed by the water above it
    expect(hasNormal(mesh, 0, 1, 0)).toBe(true);
  });

  it("does not double-emit the face shared with a neighbouring block", () => {
    const a = smallStore();
    const b = smallStore();
    a.set(3, 1, 1, VOXEL_DIRT);
    b.set(0, 1, 1, VOXEL_DIRT);
    const lookup = (gx: number, gz: number): VoxelStore | undefined => {
      if (gx === 0 && gz === 0) return a;
      if (gx === 1 && gz === 0) return b;
      return undefined;
    };
    const meshA = buildBlockMesh(a, makeBlockResolver(a, 0, 0, lookup), []);
    const meshB = buildBlockMesh(b, makeBlockResolver(b, 1, 0, lookup), []);
    // each block loses exactly the face touching the other: 5 faces each
    expect(faceCount(meshA)).toBe(5);
    expect(faceCount(meshB)).toBe(5);
    expect(hasNormal(meshA, 1, 0, 0)).toBe(false); // no +X seam face
    expect(hasNormal(meshB, -1, 0, 0)).toBe(false); // no -X seam face
  });

  it("resolves seams identically via neighbour shells (worker path)", () => {
    const a = smallStore();
    const b = smallStore();
    a.set(3, 1, 1, VOXEL_DIRT);
    b.set(0, 1, 1, VOXEL_DIRT);
    const lookup = (gx: number, gz: number): VoxelStore | undefined => {
      if (gx === 0 && gz === 0) return a;
      if (gx === 1 && gz === 0) return b;
      return undefined;
    };
    // direct lookup, as the synchronous path uses
    const direct = buildBlockMesh(a, makeBlockResolver(a, 0, 0, lookup), []);
    // shell resolver, as the web worker uses
    const shellsA = extractBlockShells(a, 0, 0, lookup);
    const viaShells = buildBlockMesh(a, makeShellResolver(a, shellsA), []);
    expect(faceCount(viaShells)).toBe(faceCount(direct));
    expect(hasNormal(viaShells, 1, 0, 0)).toBe(false);
    expect(hasNormal(viaShells, -1, 0, 0)).toBe(true);
  });

  it("treats missing neighbour shells as air (world edge)", () => {
    const store = smallStore();
    store.set(3, 1, 1, VOXEL_DIRT);
    const noNeighbors = makeBlockResolver(store, 0, 0, () => undefined);
    const shells = extractBlockShells(store, 0, 0, () => undefined);
    const direct = buildBlockMesh(store, noNeighbors, []);
    const viaShells = buildBlockMesh(
      store,
      makeShellResolver(store, shells),
      [],
    );
    expect(faceCount(viaShells)).toBe(faceCount(direct));
    // the +X face is exposed (neighbour beyond the world is air)
    expect(hasNormal(viaShells, 1, 0, 0)).toBe(true);
  });

  it("bakes the atlas rects into per-face UVs", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const tiles: VoxelTileConfig[] = [
      {
        id: VOXEL_GRASS,
        top: [0, 0, 0.5, 0.5],
        side: [0.5, 0, 1, 0.5],
        bottom: [0.25, 0.25, 0.75, 0.75],
      },
    ];
    const mesh = buildBlockMesh(store, noNeighbors(store), tiles);
    const byNormal = facesByNormal(mesh);
    const within = (uvs: Array<[number, number]>, rect: number[]): boolean =>
      uvs.every(
        ([u, v]) =>
          u >= rect[0] && u <= rect[2] && v >= rect[1] && v <= rect[3],
      );
    expect(within(byNormal.get("0,1,0")!, tiles[0].top)).toBe(true);
    expect(within(byNormal.get("0,-1,0")!, tiles[0].bottom)).toBe(true);
    // every side face (any non-axis-aligned normal) uses the side rect
    const sideRects = [
      byNormal.get("1,0,0")!,
      byNormal.get("-1,0,0")!,
      byNormal.get("0,0,1")!,
      byNormal.get("0,0,-1")!,
    ];
    for (const rect of sideRects) {
      expect(within(rect, tiles[0].side)).toBe(true);
    }
  });
});

describe("buildWaterMesh", () => {
  it("emits only faces of a water voxel that border air", () => {
    const store = smallStore();
    store.set(1, 0, 1, VOXEL_DIRT);
    store.set(1, 1, 1, VOXEL_DIRT);
    store.set(1, 2, 1, VOXEL_WATER);
    const mesh = buildWaterMesh(store, noNeighbors(store));
    // top + four sides border air; the bottom rests on terrain
    expect(faceCount(mesh)).toBe(5);
    expect(hasNormal(mesh, 0, 1, 0)).toBe(true);
    expect(hasNormal(mesh, 0, -1, 0)).toBe(false);
  });

  it("does not emit faces of interior water", () => {
    const store = smallStore();
    for (let z = 1; z <= 3; z++) {
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          store.set(x, y, z, VOXEL_WATER);
        }
      }
    }
    const mesh = buildWaterMesh(store, noNeighbors(store));
    // 3x3x3 water cube: exactly the 6 surface faces x 9 unit faces, never the
    // centre voxel
    expect(faceCount(mesh)).toBe(54);
  });
});

describe("meshArraysToGeometry", () => {
  it("builds an indexed geometry from the arrays", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const mesh = buildBlockMesh(store, noNeighbors(store), []);
    const geometry = meshArraysToGeometry(mesh);
    expect(geometry.drawCount).toBe(mesh.indices.length);
    expect(geometry.position?.count).toBe(vertexCount(mesh));
    expect(geometry.normal?.count).toBe(vertexCount(mesh));
    expect(geometry.uv?.count).toBe(vertexCount(mesh));
  });

  it("omits the uv attribute for the water mesh", () => {
    const store = smallStore();
    store.set(1, 2, 1, VOXEL_WATER);
    const geometry = meshArraysToGeometry(
      buildWaterMesh(store, noNeighbors(store)),
    );
    expect(geometry.uv).toBeUndefined();
  });
});

describe("setGeometryData", () => {
  it("updates a geometry in place without replacing it", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const geometry = meshArraysToGeometry(
      buildBlockMesh(store, noNeighbors(store), []),
    );
    const geometryRef = geometry;
    const firstCount = geometry.drawCount;

    // grow the mesh: a second voxel adds faces
    store.set(2, 1, 1, VOXEL_DIRT);
    const grown = buildBlockMesh(store, noNeighbors(store), []);
    setGeometryData(geometry, grown);

    // same geometry object (so the renderer's buffer-cache entry is reused)
    expect(geometry).toBe(geometryRef);
    expect(geometry.drawCount).toBe(grown.indices.length);
    expect(geometry.drawCount).toBeGreaterThan(firstCount);
    expect(geometry.position?.count).toBe(grown.positions.length / 3);
    expect(geometry.position?.needsUpdate).toBe(true);
    expect(geometry.normal?.needsUpdate).toBe(true);
    expect(geometry.index?.count).toBe(grown.indices.length);
  });

  it("clears a geometry with empty arrays", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const geometry = meshArraysToGeometry(
      buildBlockMesh(store, noNeighbors(store), []),
    );
    expect(geometry.drawCount).toBeGreaterThan(0);
    setGeometryData(geometry, {
      positions: [],
      normals: [],
      uvs: [],
      indices: [],
    });
    expect(geometry.drawCount).toBe(0);
  });
});
