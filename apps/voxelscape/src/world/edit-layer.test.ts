// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBlock } from "./level-data";
import {
  EditLayer,
  editLayerFromSnapshot,
  localToWorldVoxel,
  worldVoxelToLocal,
  blockWorldVoxelRange,
} from "./edit-layer";
import { VOXEL_GRASS, VOXEL_DIRT, VOXEL_AIR } from "./voxel-store";

const emptyBlock = () =>
  buildBlock({
    center: { x: 0, y: 0, z: 0 },
    customFillStore: (store) => {
      void store;
    },
  });

describe("EditLayer", () => {
  it("records, reads and overwrites edits by world voxel", () => {
    const layer = new EditLayer();
    expect(layer.size).toBe(0);
    expect(layer.set([4, 5, 6], VOXEL_GRASS, 10)).toBe(true);
    expect(layer.set([4, 5, 7], VOXEL_DIRT, 11)).toBe(true);
    expect(layer.size).toBe(2);
    expect(layer.get([4, 5, 6])?.id).toBe(VOXEL_GRASS);
    expect(layer.set([4, 5, 6], VOXEL_DIRT, 20)).toBe(true);
    expect(layer.get([4, 5, 6])?.id).toBe(VOXEL_DIRT);
    expect(layer.size).toBe(2);
  });

  it("keeps the latest updatedAt on a same-id rewrite", () => {
    const layer = new EditLayer();
    layer.set([1, 1, 1], VOXEL_GRASS, 5);
    layer.set([1, 1, 1], VOXEL_GRASS, 9);
    expect(layer.get([1, 1, 1])?.updatedAt).toBe(9);
  });

  it("queries a bounding range inclusively", () => {
    const layer = new EditLayer();
    layer.set([-1, 0, 0], 1, 1);
    layer.set([0, 0, 0], 2, 2);
    layer.set([1, 0, 0], 3, 3);
    layer.set([10, 0, 0], 4, 4);
    const found = layer.queryRange([-1, -1, -1], [1, 1, 1]);
    expect(found.map((f) => f.w)).toEqual([
      [-1, 0, 0],
      [0, 0, 0],
      [1, 0, 0],
    ]);
  });

  it("applies intersecting edits to a block's store", () => {
    const block = emptyBlock();
    const layer = new EditLayer();
    layer.set([1, 2, 3], VOXEL_GRASS, 1);
    // a far-away edit must not leak into the block
    layer.set([5000, 0, 0], VOXEL_DIRT, 1);
    const written = layer.applyToBlock(block);
    expect(written).toBe(1);
    const local = worldVoxelToLocal(block.store, block.center, [1, 2, 3]);
    expect(block.store.get(local.x, local.y, local.z)).toBe(VOXEL_GRASS);
  });

  it("round-trips through snapshot and back", () => {
    const layer = new EditLayer();
    layer.set([-3, 4, -5], VOXEL_DIRT, 42);
    const restored = editLayerFromSnapshot(layer.snapshot());
    expect(restored.get([-3, 4, -5])?.id).toBe(VOXEL_DIRT);
    expect(restored.get([-3, 4, -5])?.updatedAt).toBe(42);
    expect(restored.size).toBe(1);
  });
});

describe("world voxel mapping", () => {
  it("maps a block's local voxel to its world voxel and back", () => {
    const block = emptyBlock();
    for (const l of [
      [0, 0, 0],
      [96, 96, 96],
      [191, 255, 191],
      [1, 200, 3],
    ] as const) {
      const w = localToWorldVoxel(block.store, block.center, {
        x: l[0],
        y: l[1],
        z: l[2],
      });
      const back = worldVoxelToLocal(block.store, block.center, w);
      expect(back.x, `x round-trip for ${l}`).toBe(l[0]);
      expect(back.y, `y round-trip for ${l}`).toBe(l[1]);
      expect(back.z, `z round-trip for ${l}`).toBe(l[2]);
    }
  });

  it("covers the block's full span in the LOD-0 grid", () => {
    const block = emptyBlock();
    const { min, max } = blockWorldVoxelRange(block.center);
    // 192 world units / 2 = 96 voxels per axis
    expect(max[0] - min[0] + 1).toBe(96);
    expect(max[1] - min[1] + 1).toBe(128);
    expect(max[2] - min[2] + 1).toBe(96);
  });

  it("an applied air edit removes the voxel", () => {
    const block = emptyBlock();
    // fill one voxel of terrain, then erase it via the overlay
    const local = [96, 40, 96] as const;
    block.store.set(local[0], local[1], local[2], VOXEL_GRASS);
    const w = localToWorldVoxel(block.store, block.center, {
      x: local[0],
      y: local[1],
      z: local[2],
    });
    const layer = new EditLayer();
    layer.set(w, VOXEL_AIR, 1);
    layer.applyToBlock(block);
    expect(block.store.get(local[0], local[1], local[2])).toBe(VOXEL_AIR);
  });
});
