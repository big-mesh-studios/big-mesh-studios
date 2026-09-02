// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { VoxelTileConfig } from "./atlas";
import {
  buildBlockMesh,
  buildWaterMesh,
  meshArraysToGeometry,
  setGeometryData,
  type MeshArrays,
} from "./mesh";
import {
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_WATER,
  VoxelStore,
  fillStore,
} from "../world/voxel-store";

const smallStore = (): VoxelStore =>
  new VoxelStore({ dims: [8, 8, 8], voxels: [4, 4, 4], scale: 2 });

/**
 * Constant terrain whose surface sits at the block's top row (base 2): every
 * column is grass on row 3 over dirt, so top-surface faces are emitted and
 * every seam face is culled against the generated border.
 */
const solidTerrain = {
  seed: 1,
  frequency: 1,
  amplitude: 0,
  octaves: 1,
  base: 2,
};

/**
 * Constant terrain whose surface sits inside the block above the origin one,
 * so that block is solid with a top and the one below it is buried entirely.
 */
const buriedTerrain = {
  seed: 1,
  frequency: 1,
  amplitude: 0,
  octaves: 1,
  base: 10,
};

/** Flat sea at the block top: water fills the top row y=3. */
const seaTerrain = {
  seed: 1,
  frequency: 1,
  amplitude: 0,
  octaves: 1,
  base: 0,
  seaLevel: 2,
};

const faceCount = (mesh: MeshArrays): number => mesh.indices.length / 6;
const vertexCount = (mesh: MeshArrays): number => mesh.positions.length / 3;

/**
 * Whether every triangle's winding, by the right-hand rule over its indices,
 * agrees with its face's baked normal: what back-face culling relies on. The
 * geometry is only front-facing when each quad fronts the side it is exposed
 * on.
 */
const windsOutward = (mesh: MeshArrays): boolean => {
  const { positions, normals, indices } = mesh;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
    const ax = positions[a * 3];
    const ay = positions[a * 3 + 1];
    const az = positions[a * 3 + 2];
    const ux = positions[b * 3] - ax;
    const uy = positions[b * 3 + 1] - ay;
    const uz = positions[b * 3 + 2] - az;
    const vx = positions[c * 3] - ax;
    const vy = positions[c * 3 + 1] - ay;
    const vz = positions[c * 3 + 2] - az;
    const gx = uy * vz - uz * vy;
    const gy = uz * vx - ux * vz;
    const gz = ux * vy - uy * vx;
    const dot =
      gx * normals[a * 3] + gy * normals[a * 3 + 1] + gz * normals[a * 3 + 2];
    if (dot <= 0) {
      return false;
    }
  }
  return true;
};

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
    const mesh = buildBlockMesh(store, []);
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

  it("winds every face on the side it is exposed on", () => {
    // Each face fronts its own outward normal, so the material can cull the
    // back faces and halve what the GPU shades.
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    expect(windsOutward(buildBlockMesh(store, []))).toBe(true);
    store.set(2, 1, 1, VOXEL_WATER);
    expect(windsOutward(buildWaterMesh(store))).toBe(true);
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
    const mesh = buildBlockMesh(store, []);
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
    // the border below carries the equally solid neighbour the real fill
    // would have generated, so the bottom face culls against it
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        store.data[store.paddedIndex(x, -1, z)] = VOXEL_DIRT;
      }
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          store.set(x, y, z, VOXEL_DIRT);
        }
      }
    }
    const mesh = buildBlockMesh(store, []);
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
    const mesh = buildBlockMesh(store, []);
    // the top terrain voxel is exposed by the water above it
    expect(hasNormal(mesh, 0, 1, 0)).toBe(true);
  });

  it("culls the seam face shared with a neighbouring block", () => {
    const a = smallStore();
    const b = smallStore();
    fillStore(a, [0, 0, 0], solidTerrain);
    fillStore(b, [8, 0, 0], solidTerrain);
    const meshA = buildBlockMesh(a, []);
    const meshB = buildBlockMesh(b, []);
    // 4x4 top surfaces; no +X/-X seam face between the two blocks
    expect(faceCount(meshA)).toBe(16);
    expect(faceCount(meshB)).toBe(16);
    expect(hasNormal(meshA, 1, 0, 0)).toBe(false); // no +X seam face
    expect(hasNormal(meshB, -1, 0, 0)).toBe(false); // no -X seam face
    expect(hasNormal(meshA, 0, 1, 0)).toBe(true);
  });

  it("culls the seam face shared with the block stacked above it", () => {
    // Blocks stack in every axis, so the seam between one and the block above
    // it is culled against the border the same way a sideways one is. Terrain
    // whose surface sits inside the upper block leaves the lower one buried.
    const under = smallStore();
    const over = smallStore();
    fillStore(under, [0, 0, 0], buriedTerrain);
    fillStore(over, [0, 8, 0], buriedTerrain);
    const meshUnder = buildBlockMesh(under, []);
    const meshOver = buildBlockMesh(over, []);

    // Nothing of the lower block is exposed: every face of it, its top
    // included, meets solid ground in some neighbour's border.
    expect(faceCount(meshUnder)).toBe(0);
    // The upper block shows its own surface and no floor against the one below.
    expect(hasNormal(meshOver, 0, 1, 0)).toBe(true);
    expect(hasNormal(meshOver, 0, -1, 0)).toBe(false);
  });

  it("emits no vertical water face across a chunk seam", () => {
    const a = smallStore();
    const b = smallStore();
    fillStore(a, [0, 0, 0], seaTerrain);
    fillStore(b, [8, 0, 0], seaTerrain);
    const meshA = buildWaterMesh(a);
    const meshB = buildWaterMesh(b);
    // water surfaces only: a top face per column, never a cliff-side wall
    expect(faceCount(meshA)).toBe(16);
    expect(faceCount(meshB)).toBe(16);
    for (const normal of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]) {
      expect(hasNormal(meshA, normal[0], normal[1], normal[2])).toBe(false);
    }
    expect(hasNormal(meshA, 0, 1, 0)).toBe(true);
  });

  it("generates a border matching the neighbouring block's boundary column", () => {
    const a = smallStore();
    const b = smallStore();
    // rolling terrain so adjacent columns genuinely differ
    const rolling = {
      seed: 11,
      frequency: 0.1,
      amplitude: 40,
      octaves: 2,
      base: 20,
      seaLevel: 30,
    };
    fillStore(a, [0, 0, 0], rolling);
    fillStore(b, [8, 0, 0], rolling);
    // a's east border overlaps b's first column; b's west border overlaps a's last
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        expect(a.atPadded(4, y, z)).toBe(b.get(0, y, z));
        expect(b.atPadded(-1, y, z)).toBe(a.get(3, y, z));
      }
    }
  });

  it("culls the block's outer edge faces against generated padding", () => {
    const store = smallStore();
    fillStore(store, [0, 0, 0], solidTerrain);
    const mesh = buildBlockMesh(store, []);
    // the border is generated terrain, not air, so even a lone block's
    // outermost faces cull against it
    expect(hasNormal(mesh, 1, 0, 0)).toBe(false);
    expect(hasNormal(mesh, -1, 0, 0)).toBe(false);
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
    const mesh = buildBlockMesh(store, tiles);
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
    const mesh = buildWaterMesh(store);
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
    const mesh = buildWaterMesh(store);
    // 3x3x3 water cube: exactly the 6 surface faces x 9 unit faces, never the
    // centre voxel
    expect(faceCount(mesh)).toBe(54);
  });

  it("returns empty water arrays for a store that never reported water", () => {
    const store = smallStore();
    // Terrain only: hasWater was never raised, so the whole-volume sweep is
    // skipped and nothing is emitted.
    store.set(1, 0, 1, VOXEL_DIRT);
    store.set(1, 1, 1, VOXEL_DIRT);
    const mesh = buildWaterMesh(store);
    expect(mesh.indices.length).toBe(0);
    expect(mesh.positions.length).toBe(0);
  });
});

describe("meshArraysToGeometry", () => {
  it("builds an indexed geometry from the arrays", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const mesh = buildBlockMesh(store, []);
    const geometry = meshArraysToGeometry(mesh);
    expect(geometry.drawCount).toBe(mesh.indices.length);
    expect(geometry.position?.count).toBe(vertexCount(mesh));
    expect(geometry.normal?.count).toBe(vertexCount(mesh));
    expect(geometry.uv?.count).toBe(vertexCount(mesh));
  });
});

describe("setGeometryData", () => {
  it("updates a geometry in place without replacing it", () => {
    const store = smallStore();
    store.set(1, 1, 1, VOXEL_GRASS);
    const geometry = meshArraysToGeometry(buildBlockMesh(store, []));
    const geometryRef = geometry;
    const firstCount = geometry.drawCount;

    // grow the mesh: a second voxel adds faces
    store.set(2, 1, 1, VOXEL_DIRT);
    const grown = buildBlockMesh(store, []);
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
    const geometry = meshArraysToGeometry(buildBlockMesh(store, []));
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
