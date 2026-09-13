// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { BufferGeometry } from "@random-mesh/rmsl/scene";
import { scBounds, TriangleRenderer } from "./triangle-renderer";
import { probeColor } from "./occlusion";
import type { Superchunk } from "./superchunk";
import {
  BLOCK_WORLD,
  buildBlockShell,
  type WorldBlock,
} from "../world/level-data";
import { VOXEL_GRASS } from "../world/voxel-store";

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
const rendererFor = (...blocks: WorldBlock[]): TriangleRenderer =>
  rendererForBudget(undefined, ...blocks);

/** As `rendererFor`, but capping each frame's merged upload at `budget` bytes. */
const rendererForBudget = (
  budget: number | undefined,
  ...blocks: WorldBlock[]
): TriangleRenderer => {
  const renderer = new TriangleRenderer({
    blocks,
    waterExtinction: 0.1,
    seaLevel: undefined,
    onBlockMeshed: () => {},
    uploadBytesPerFrame: budget,
  });
  /** The sheet's only tile: these tests are about what is drawn, not where from. */
  const whole = 0;
  renderer.setTiles(
    [{ id: VOXEL_GRASS, top: whole, side: whole, bottom: whole }],
    {} as never,
    { columns: 1, tilePixels: [1, 1], sheetPixels: [1, 1] },
  );
  return renderer;
};

/** Runs enough frames for a meshed block to be merged into its superchunk. */
const settle = (renderer: TriangleRenderer): void => {
  const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  // Past the stall backstop, so a change with nothing new to append — a
  // retired member with no rebuild of its own, say — still forces its
  // upload rather than waiting on a merge nothing here will ever trigger.
  for (let frame = 0; frame < 50; frame++) {
    renderer.tick(0.016, camera);
  }
};

describe("TriangleRenderer", () => {
  it("shows a block it has meshed", () => {
    // The camera at the origin and the block's superchunk contain each other,
    // so the frustum hides nothing: a block with geometry is a block that is
    // drawn. This is the whole of what a player sees of the world, and it
    // went unnoticed once already.
    const renderer = rendererFor(blockWithFloor());

    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    settle(renderer);

    expect(renderer.triangleCount).toBeGreaterThan(0);
    expect(renderer.terrain.children).toHaveLength(1);
    expect(renderer.terrain.children[0].visible).toBe(true);
  });

  it("unseats a slot's mesh when it is repositioned, so recycled geometry cannot flash", () => {
    // Slot 0 and slot 1 sit in different superchunks. Once slot 0's mesh is
    // seated in its own superchunk, recycling the slot to a cell in slot 1's
    // superchunk drops its old superchunk's geometry pair into the pool — a
    // pair the slot's world mesh still referenced. The mesh must stop drawing
    // (empty range) at the moment of the move, not when the new cell's data
    // arrives, or it shows whatever geometry that pair is next filled with.
    const renderer = rendererFor(blockWithFloor(), blockWithFloor());
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(512, 0, 0); // face +x so both superchunks stay in the frustum
    const tick = (): void => renderer.tick(0.016, camera);

    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.repositionBlock(1, [256, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    for (let frame = 0; frame < 10; frame++) {
      tick();
    }
    const rendererState = renderer as unknown as {
      scChunkTerrain: Map<number, { drawRange: { count: number } }>;
      slotCenter: Map<number, unknown>;
    };
    expect(
      rendererState.scChunkTerrain.get(0)!.drawRange.count,
    ).toBeGreaterThan(0);

    renderer.repositionBlock(0, [384, 0, 0]);
    expect(rendererState.scChunkTerrain.get(0)!.drawRange.count).toBe(0);
    expect(rendererState.slotCenter.has(0)).toBe(false);

    // The new cell's data lands and is meshed: the slot draws again, seated in
    // its new superchunk.
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    for (let frame = 0; frame < 10; frame++) {
      tick();
    }
    expect(
      rendererState.scChunkTerrain.get(0)!.drawRange.count,
    ).toBeGreaterThan(0);
    expect(renderer.triangleCount).toBeGreaterThan(0);
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

  it("hides a superchunk the camera cannot see", () => {
    // Geometry is uploaded and kept, but a superchunk out of the frustum is
    // not drawn; the frame the camera turns onto it shows it without a rebuild.
    const renderer = rendererFor(blockWithFloor());

    renderer.repositionBlock(0, [100000, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    settle(renderer);

    for (const mesh of renderer.terrain.children) {
      expect(mesh.visible).toBe(false);
    }
  });

  it("bounds a superchunk by the box its merged geometry fills", () => {
    // A superchunk's two block centroids sit one BLOCK_WORLD apart, so the
    // merged geometry reaches a block-half before the superchunk's own centre
    // and a block-half plus a superchunk beyond it. A box centred on the
    // superchunk itself misses that far block-half, hiding it while it was
    // still on screen — the vanish this culling took for a frustum bug.
    const cellZero = scBounds([0, 0, 0]);
    expect(cellZero.half).toBe(128);
    expect(cellZero.center).toEqual([64, 64, 64]);
    expect(scBounds([1, -1, 2]).center).toEqual([320, -192, 576]);
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

  it("keeps holding an edit's group past a lone job's own meshing time", () => {
    // The pool's few worker threads carry both fill and mesh jobs, so a
    // straggler queued behind a scroll's burst can take far longer to land
    // than the block that reported back first. The hold has to outlast that
    // queueing, not just the time a single job takes to mesh.
    const renderer = rendererFor(blockWithFloor(), blockWithFloor());
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    renderer.repositionBlock(0, [0, 0, 0]);

    renderer.onBlocksChanged([0, 1]);
    renderer.meshNow(0);
    for (let frame = 0; frame < 40; frame++) {
      renderer.tick(0.016, camera);
    }

    expect(renderer.terrain.children.filter((m) => m.visible)).toHaveLength(0);
  });

  it("defers merging a superchunk the occlusion pass has proved covered", () => {
    // A scroll hands the renderer a lot of chunks whose superchunks sit behind
    // terrain the culler has already seen. Merging and uploading those is the
    // main-thread cost the gate exists to skip: a superchunk whose every
    // content member a query found covered stays dirty, and only merges the
    // frame a later query (or a move that re-exposes it) sees a member again.
    const renderer = rendererFor(blockWithFloor());
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(512, 0, 0); // face the block so the frustum keeps its cell

    renderer.repositionBlock(0, [512, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    const tick = (): void => renderer.tick(0.016, camera);

    // The last query measured slot 0 and never saw it win a pixel.
    const occlusion = renderer as unknown as {
      lastQueryTested: Set<number>;
      lastVisible: Set<number>;
    };
    occlusion.lastQueryTested = new Set([0]);
    occlusion.lastVisible = new Set();
    for (let frame = 0; frame < 10; frame++) {
      tick();
    }

    // Covered by occlusion, so the merged geometry never reaches the GPU even
    // though the block is meshed and its superchunk is in the frustum.
    expect(renderer.triangleCount).toBe(0);

    // A later query sees it; the next tick merges and shows it.
    occlusion.lastVisible = new Set([0]);
    tick();
    expect(renderer.triangleCount).toBeGreaterThan(0);
  });

  it("gives up holding when a block of the group never comes back", () => {
    // Nothing may be kept off the screen forever. Past the stall backstop
    // whatever has landed is shown, and a straggler uploads on its own.
    const renderer = rendererFor(blockWithFloor(), blockWithFloor());
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    renderer.repositionBlock(0, [0, 0, 0]);

    renderer.onBlocksChanged([0, 1]);
    renderer.meshNow(0);
    // Past the stall backstop's frame count, however many frames that is.
    for (let frame = 0; frame < 50; frame++) {
      renderer.tick(0.016, camera);
    }

    expect(renderer.terrain.children.filter((m) => m.visible)).toHaveLength(1);
  });

  it("paces in-frustum superchunk uploads across frames within the byte budget", () => {
    // Three blocks in three superchunks, all in the camera's frustum and
    // unmeasured by the occlusion pass: merging and uploading them all on one
    // frame is the stall the budget exists to prevent. A one-byte frame budget
    // leaves each tick enough for the nearest outstanding superchunk alone, so
    // the visible world gains one chunk at a time.
    const renderer = rendererForBudget(
      1,
      blockWithFloor(),
      blockWithFloor(),
      blockWithFloor(),
    );
    const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
    camera.lookAt(1024, 0, 0); // face +x so every superchunk stays in the frustum

    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.repositionBlock(1, [256, 0, 0]);
    renderer.repositionBlock(2, [512, 0, 0]);
    for (const index of [0, 1, 2]) {
      renderer.onBlockChanged(index);
      renderer.meshNow(index);
    }

    const visible = (): number =>
      renderer.terrain.children.filter((mesh) => mesh.visible).length;

    renderer.tick(0.016, camera);
    expect(visible()).toBe(1);
    renderer.tick(0.016, camera);
    expect(visible()).toBe(2);
    renderer.tick(0.016, camera);
    expect(visible()).toBe(3);
    expect(renderer.triangleCount).toBeGreaterThan(0);
  });
});

describe("the occlusion probe's slot id", () => {
  /** Every probe mesh the renderer put in its occlusion scene. */
  const probes = (
    renderer: TriangleRenderer,
  ): { material: unknown; onBeforeRender?: () => void }[] => {
    const inside = renderer as unknown as {
      occlusionScene: { children: { material: unknown }[] };
    };
    return inside.occlusionScene.children;
  };

  /** A renderer with one meshed block, merged into its superchunk. */
  const meshed = (): TriangleRenderer => {
    const renderer = rendererFor(blockWithFloor());
    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    settle(renderer);
    return renderer;
  };

  it("is painted on by the mesh that draws it, not carried on its vertices", () => {
    const renderer = meshed();
    const [probe] = probes(renderer);
    expect(probe).toBeDefined();
    const material = probe.material as { slotColor: [number, number, number] };
    material.slotColor = [0, 0, 0];
    probe.onBeforeRender?.();
    expect(material.slotColor).toEqual(probeColor(0));
  });

  it("leaves no colour on the merged geometry", () => {
    const renderer = meshed();
    const [probe] = probes(renderer);
    const geometry = (probe as unknown as { geometry: BufferGeometryLike })
      .geometry;
    expect(geometry.getAttribute("occlusionColor")).toBeUndefined();
  });
});

describe("what the renderer says it is holding", () => {
  it("keeps drawing a chunk whose merge is waiting for a later frame", () => {
    // Two superchunks change in the same frame and a frame may upload only so
    // many bytes, so one merges now and the other waits. The waiting one has
    // given its member's room in the merged arrays back and has not taken new
    // room yet, while the card still holds the geometry it last uploaded. It
    // has to go on drawing that until the merge catches up: stopping leaves a
    // hole where a chunk was, for as many frames as the budget takes to come
    // round.
    const near = blockWithFloor();
    const far = blockWithFloor();
    const renderer = rendererForBudget(1, near, far);
    const camera = new PerspectiveCamera(60, 1, 0.1, 4000);
    camera.position.set(0, 0, 0);
    camera.lookAt(2000, 0, 0);

    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.repositionBlock(1, [BLOCK_WORLD[0] * 4, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.onBlockChanged(1);
    renderer.meshNow(0);
    renderer.meshNow(1);
    for (let frame = 0; frame < 6; frame++) {
      renderer.tick(0.016, camera);
    }

    const meshes = (
      renderer as unknown as {
        scChunkTerrain: Map<
          number,
          { drawRange: { start: number; count: number }; visible: boolean }
        >;
      }
    ).scChunkTerrain;
    const onTheCard = { ...meshes.get(1)!.drawRange };
    expect(onTheCard.count).toBeGreaterThan(0);

    // A checkerboard cannot be merged into one rectangle the way a solid floor
    // can, so each block's new build is far larger than the room it gave back.
    for (const block of [near, far]) {
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          block.store.set(x, 0, z, (x + z) % 2 === 0 ? VOXEL_GRASS : 0);
        }
      }
    }
    renderer.onBlockChanged(0);
    renderer.onBlockChanged(1);
    renderer.meshNow(0);
    renderer.meshNow(1);
    renderer.tick(0.016, camera);

    expect(meshes.get(1)!.visible).toBe(true);
    expect(meshes.get(1)!.drawRange).toEqual(onTheCard);
  });

  it("lets a block's own mesh go once a superchunk has merged it in", () => {
    const renderer = rendererFor(blockWithFloor());
    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);

    // The block's mesh has landed and nothing has merged it yet, so the only
    // geometry held is the block's own.
    expect(renderer.blockGeometryBytes).toBeGreaterThan(0);
    expect(renderer.mergedGeometryBytes).toBe(0);

    settle(renderer);

    // The superchunk has copied those vertices into its own arrays, and the
    // block's are let go: the same geometry is held once, by whoever draws it.
    expect(renderer.mergedGeometryBytes).toBeGreaterThan(0);
    expect(renderer.blockGeometryBytes).toBe(0);
  });
});

describe("the recycled geometry pool", () => {
  /** The pairs waiting in the pool, which no public surface exposes. */
  const pool = (
    renderer: TriangleRenderer,
  ): { terrain: BufferGeometry; water: BufferGeometry; bytes: number }[] =>
    (
      renderer as unknown as {
        geometryPool: {
          terrain: BufferGeometry;
          water: BufferGeometry;
          bytes: number;
        }[];
      }
    ).geometryPool;

  /** The pair the renderer's one superchunk is holding. */
  const held = (
    renderer: TriangleRenderer,
  ): { terrain: BufferGeometry; water: BufferGeometry } => {
    const inside = renderer as unknown as {
      superchunks: Map<string, Superchunk>;
    };
    const [superchunk] = [...inside.superchunks.values()];
    return { terrain: superchunk.terrain, water: superchunk.water };
  };

  /** A renderer whose one block is meshed and merged into a superchunk at the origin. */
  const merged = (budget?: number): TriangleRenderer => {
    const renderer = rendererForBudget(budget, blockWithFloor());
    renderer.repositionBlock(0, [0, 0, 0]);
    renderer.onBlockChanged(0);
    renderer.meshNow(0);
    settle(renderer);
    return renderer;
  };

  it("hands back the arrays of the superchunk that left", () => {
    // A pooled pair is filled from the arrays of whichever superchunk takes it
    // next, so holding the departed superchunk's arrays until then keeps a
    // superchunk's worth of geometry in memory for nothing.
    const renderer = merged();
    const pair = held(renderer);
    expect(pair.terrain.getAttribute("position")!.count).toBeGreaterThan(0);
    expect(pair.terrain.index!.count).toBeGreaterThan(0);

    // The block moves to a far cell, which empties its old superchunk.
    renderer.repositionBlock(0, [1024, 0, 0]);

    expect(pool(renderer)).toHaveLength(1);
    expect(pair.terrain.getAttribute("position")!.count).toBe(0);
    expect(pair.terrain.index!.count).toBe(0);
  });

  it("gives a pair back to the card once the pool is full", () => {
    // The renderer keys its GPU buffers by geometry object and holds them for
    // as long as it holds the geometry, so a pair the pool has no room for has
    // to be disposed rather than dropped. A one-byte frame budget leaves the
    // pool eight bytes, which the first pair recycled already exceeds.
    const renderer = merged(1);
    const pair = held(renderer);
    let disposed = 0;
    pair.terrain.addEventListener("dispose", () => {
      disposed++;
    });
    pair.water.addEventListener("dispose", () => {
      disposed++;
    });

    renderer.repositionBlock(0, [1024, 0, 0]);

    expect(pool(renderer)).toHaveLength(0);
    expect(disposed).toBe(2);
  });

  it("gives every pair back when the renderer is torn down", () => {
    const renderer = merged();
    const pair = held(renderer);
    let disposed = 0;
    for (const geometry of [pair.terrain, pair.water]) {
      geometry.addEventListener("dispose", () => {
        disposed++;
      });
    }

    renderer.dispose();

    expect(disposed).toBe(2);
  });
});

/** As much of a geometry as the test above reads. */
interface BufferGeometryLike {
  getAttribute(name: string): unknown;
}

describe("resizing to a smaller window", () => {
  it("stops drawing a slot the window no longer has", () => {
    const renderer = rendererFor(blockWithFloor(), blockWithFloor());
    for (const slot of [0, 1]) {
      renderer.repositionBlock(slot, [0, 0, 0]);
      renderer.onBlockChanged(slot);
      renderer.meshNow(slot);
    }
    settle(renderer);
    const drawnWithBoth = renderer.triangleCount;
    expect(drawnWithBoth).toBeGreaterThan(0);

    renderer.resizeTo(1);
    settle(renderer);

    // The departed slot draws nothing, and the one that stayed still does.
    expect(renderer.triangleCount).toBeGreaterThan(0);
    expect(renderer.triangleCount).toBeLessThan(drawnWithBoth);
  });

  it("keeps uploading after a member is taken out from under a superchunk", () => {
    // A superchunk left counting a slot the window no longer holds waits for
    // a block that can never mesh, and stops settling — which is the failure
    // this guards: geometry that never reaches the card again.
    const renderer = rendererFor(blockWithFloor(), blockWithFloor());
    for (const slot of [0, 1]) {
      renderer.repositionBlock(slot, [0, 0, 0]);
      renderer.onBlockChanged(slot);
      renderer.meshNow(slot);
    }
    settle(renderer);

    renderer.resizeTo(1);
    settle(renderer);

    // The surviving slot's geometry is on the card: it is merged, and nothing
    // is left waiting to be.
    expect(renderer.mergedGeometryBytes).toBeGreaterThan(0);
    expect(renderer.dirtySuperchunkCount).toBe(0);
  });
});
