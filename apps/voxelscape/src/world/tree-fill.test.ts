// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN } from "./noise";
import { VOXEL_LOG, type VoxelStore } from "./voxel-store";
import { buildBlock } from "./level-data";

/**
 * Returns `[x, y, z]` for every log voxel in `store`, in interior coordinates
 * (`0..n-1` on each axis).
 */
const logVoxels = (store: VoxelStore): Array<[number, number, number]> => {
  const [nx, ny, nz] = store.voxels;
  const out: Array<[number, number, number]> = [];
  for (let y = 0; y < ny; y++) {
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        if (store.atPadded(x, y, z) === VOXEL_LOG) {
          out.push([x, y, z]);
        }
      }
    }
  }
  return out;
};

describe("placeTrees", () => {
  it("sits every trunk flush on solid ground, never floating", () => {
    const blocks = [
      { center: [0, 64, 0] as const },
      { center: [128, 64, 0] as const },
      { center: [0, 64, 128] as const },
      { center: [-128, 64, -128] as const },
    ].map(({ center }) =>
      buildBlock({
        center: [...center] as [number, number, number],
        terrain: DEFAULT_TERRAIN,
      }),
    );

    let totalTreeColumns = 0;

    for (const block of blocks) {
      const store = block.store;
      const byColumn = new Map<string, Array<[number, number, number]>>();
      for (const voxel of logVoxels(store)) {
        const [x, , z] = voxel;
        const key = `${x},${z}`;
        const list = byColumn.get(key) ?? [];
        list.push(voxel);
        byColumn.set(key, list);
      }
      totalTreeColumns += byColumn.size;

      for (const [key, voxels] of byColumn) {
        const [x, z] = key.split(",").map(Number);

        let lowest = voxels[0][1];
        for (const [, y] of voxels) {
          if (y < lowest) lowest = y;
        }

        const below = store.atPadded(x, lowest - 1, z);
        expect(below, `air below trunk at column ${key}`).not.toBe(0);

        expect(store.atPadded(x, lowest, z)).toBe(VOXEL_LOG);

        const trunkRows = voxels.map(([, y]) => y).sort((a, b) => a - b);
        for (let i = 0; i < trunkRows.length - 1; i++) {
          expect(trunkRows[i + 1] - trunkRows[i]).toBe(1);
        }
        expect(trunkRows.length).toBeGreaterThanOrEqual(2);
      }
    }

    expect(totalTreeColumns).toBeGreaterThan(0);
  });
});
