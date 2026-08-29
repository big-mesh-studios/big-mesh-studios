// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import { TriangleRenderer } from "./triangle-renderer";
import { buildBlockShell, type WorldBlock } from "../world/level-data";
import { VOXEL_GRASS } from "../world/voxel-store";
import type { TileRect } from "./atlas";

/** A block with a floor of grass across one corner, so it has faces to mesh. */
const blockWithFloor = (): WorldBlock => {
  const block = buildBlockShell({ center: [0, 0, 0] });
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      block.store.set(x, 0, z, VOXEL_GRASS);
    }
  }
  return block;
};

/** A renderer holding these blocks, with a tile for the voxel they are drawn in. */
const rendererFor = (...blocks: WorldBlock[]) => {
  const renderer = new TriangleRenderer({
    blocks,
    waterExtinction: 0.1,
    seaLevel: undefined,
    onBlockMeshed: () => {},
  });
  /** The whole atlas as one tile: these tests are about what is drawn, not where from. */
  const whole: TileRect = [0, 0, 1, 1];
  renderer.setTiles(
    [{ id: VOXEL_GRASS, top: whole, side: whole, bottom: whole }],
    {} as never,
  );
  return renderer;
};

/** Runs enough frames for a meshed block to be merged into its superchunk. */
const settle = (renderer: TriangleRenderer): void => {
  const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  for (let frame = 0; frame < 10; frame++) {
    renderer.tick(0.016, camera);
  }
};

describe("TriangleRenderer", () => {
  it("shows a block it has meshed", () => {
    // Nothing tells the renderer to become visible: there is one renderer, so
    // a block with geometry is a block that is drawn. This is the whole of
    // what a player sees of the world, and it went unnoticed once already.
    const renderer = rendererFor(blockWithFloor());

    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    settle(renderer);

    expect(renderer.triangleCount).toBeGreaterThan(0);
    expect(renderer.terrain.children).toHaveLength(1);
    expect(renderer.terrain.children[0].visible).toBe(true);
  });

  it("draws nothing for a block with no voxels in it", () => {
    const renderer = rendererFor(buildBlockShell({ center: [0, 0, 0] }));

    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    settle(renderer);

    expect(renderer.triangleCount).toBe(0);
    for (const mesh of renderer.terrain.children) {
      expect(mesh.visible).toBe(false);
    }
  });

  it("holds a superchunk back until every block of one edit has landed", () => {
    // A voxel on a chunk's boundary belongs to several blocks. Showing the
    // one that no longer draws it, before the ones that still cull a face
    // against it have caught up, is the hole. Here the second block never
    // reports back, so the first stays held.
    const renderer = rendererFor(blockWithFloor(), blockWithFloor());
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    renderer.repositionBlock(0, [0, 0, 0]);

    renderer.onBlocksChanged([0, 1]);
    renderer.meshNow(0);
    renderer.tick(0.016, camera);

    expect(renderer.terrain.children.filter((m) => m.visible)).toHaveLength(0);
  });

  it("gives up holding when a block of the group never comes back", () => {
    // Nothing may be kept off the screen forever. Past the stall backstop
    // whatever has landed is shown, and a straggler uploads on its own.
    const renderer = rendererFor(blockWithFloor(), blockWithFloor());
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    renderer.repositionBlock(0, [0, 0, 0]);

    renderer.onBlocksChanged([0, 1]);
    renderer.meshNow(0);
    for (let frame = 0; frame < 12; frame++) {
      renderer.tick(0.016, camera);
    }

    expect(renderer.terrain.children.filter((m) => m.visible)).toHaveLength(1);
  });
});
