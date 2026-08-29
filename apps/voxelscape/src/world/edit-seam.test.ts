// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBlock, BLOCK_WORLD, type Dim3 } from "./level-data";
import { EditLayer, worldVoxelToLocal, type WorldVoxel } from "./edit-layer";
import { DEFAULT_TERRAIN } from "./noise";
import { VOXEL_AIR } from "./voxel-store";

/**
 * The block holding the origin, and the one directly below it. A voxel on
 * their shared plane is in the first's interior and in the second's border.
 */
const stacked = () => ({
  here: buildBlock({ center: [0, 0, 0], terrain: DEFAULT_TERRAIN }),
  below: buildBlock({
    center: [0, -BLOCK_WORLD[1], 0] as Dim3,
    terrain: DEFAULT_TERRAIN,
  }),
});

/** A voxel on the bottom face of the block at the origin. */
const onTheSeam: WorldVoxel = [-32, -32, -6];

describe("an edit to a voxel two blocks hold", () => {
  it("reaches the neighbour's border, not just the owner's interior", () => {
    const { here, below } = stacked();
    const layer = new EditLayer();

    layer.set(onTheSeam, VOXEL_AIR, Date.now());
    expect(layer.applyToBlock(here)).toBe(1);
    expect(layer.applyToBlock(below)).toBe(1);

    // The owner sees it in its interior; the block underneath sees it in the
    // border row it culls its top faces against. A border still saying dirt
    // culls a face that should be drawn, which is a hole where they meet.
    const local = worldVoxelToLocal(here.store, here.center, onTheSeam);
    expect(here.store.get(local[0], local[1], local[2])).toBe(VOXEL_AIR);
    expect(
      below.store.atPadded(local[0], below.store.voxels[1], local[2]),
    ).toBe(VOXEL_AIR);
  });

  it("is restored into a border when a block is refilled", () => {
    const layer = new EditLayer();
    layer.set(onTheSeam, VOXEL_AIR, Date.now());

    // A block whose slot is refilled from noise has its border regenerated as
    // terrain; the overlay has to put the edit back into it.
    const { below } = stacked();
    const local = worldVoxelToLocal(below.store, below.center, onTheSeam);
    expect(below.store.atPadded(local[0], local[1], local[2])).not.toBe(
      VOXEL_AIR,
    );

    layer.applyToBlock(below);

    expect(below.store.atPadded(local[0], local[1], local[2])).toBe(VOXEL_AIR);
  });
});
