// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { EditingController } from "./editing-controller";
import { Inventory } from "./inventory";
import { buildBlock } from "./world/level-data";
import { EditLayer } from "./world/edit-layer";
import { VOXEL_GRASS, VOXEL_DIRT, VOXEL_AIR } from "./world/voxel-store";

const wv = (lx: number, ly: number, lz: number): [number, number, number] => [
  lx - 48,
  ly - 64,
  lz - 48,
];

const makeHarness = () => {
  const block = buildBlock({
    center: [0, 0, 0],
    customFillStore: (store) => store.set(48, 40, 48, VOXEL_GRASS),
  });
  const layer = new EditLayer();
  const inventory = new Inventory();
  const onBlockEdited = vi.fn();
  const onEditRecorded = vi.fn();
  let look = {
    origin: [0, 0, 0] as [number, number, number],
    direction: [0, -1, 0] as [number, number, number],
  };
  let playerVoxels: Array<[number, number, number]> | null = null;
  const controller = new EditingController({
    blocks: [block],
    layer,
    inventory,
    surfaceOnly: true,
    onBlockEdited,
    onEditRecorded,
    getLook: () => look,
    getPlayerVoxels: () => playerVoxels,
  });
  return {
    block,
    layer,
    inventory,
    controller,
    onBlockEdited,
    onEditRecorded,
    setLook: (o: [number, number, number], d: [number, number, number]) => {
      look = { origin: o, direction: d };
    },
    setPlayerVoxels: (v: Array<[number, number, number]> | null) => {
      playerVoxels = v;
    },
  };
};

const downOntoTarget = (): [
  [number, number, number],
  [number, number, number],
] => {
  const [wx, wy] = wv(48, 40, 48);
  // camera one voxel above the target (voxel -20), aiming straight down
  return [
    [wx * 2, (wy + 4) * 2, wx * 2],
    [0, -1, 0],
  ];
};

describe("EditingController.breakBlock", () => {
  it("breaks a collectable voxel into the inventory as dirt", () => {
    const h = makeHarness();
    const target = wv(48, 40, 48);
    const [origin, direction] = downOntoTarget();
    h.setLook(origin, direction);
    const msg = h.controller.breakBlock();
    // grass and dirt both collect as a single dirt item
    expect(msg).toContain("Dirt");
    expect(h.layer.get(target)?.id).toBe(VOXEL_AIR);
    expect(h.inventory.count(VOXEL_DIRT)).toBe(1);
    expect(h.onBlockEdited).toHaveBeenCalledWith(0);
    expect(h.onEditRecorded).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there is no target in reach", () => {
    const h = makeHarness();
    h.setLook([0, 60, 0], [0, -1, 0]); // far above, target out of reach
    expect(h.controller.breakBlock()).toBeNull();
    expect(h.inventory.count(VOXEL_DIRT)).toBe(0);
  });

  it("refuses to break the world floor", () => {
    const floorBlock = buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => store.set(48, 0, 48, VOXEL_GRASS),
    });
    const layer = new EditLayer();
    const inventory = new Inventory();
    const controller = new EditingController({
      blocks: [floorBlock],
      layer,
      inventory,
      surfaceOnly: true,
      onBlockEdited: vi.fn(),
      onEditRecorded: vi.fn(),
      getLook: () => ({
        // camera one voxel above the floor voxel, aiming straight down
        origin: [
          wv(48, 0, 48)[0] * 2,
          (wv(48, 0, 48)[1] + 1) * 2,
          wv(48, 0, 48)[0] * 2,
        ],
        direction: [0, -1, 0],
      }),
      getPlayerVoxels: () => null,
    });
    expect(controller.breakBlock()).toContain("floor");
    expect(layer.size).toBe(0);
    expect(inventory.count(VOXEL_DIRT)).toBe(0);
  });
});

describe("EditingController.placeBlock", () => {
  it("places the selected block into the face-adjacent cell", () => {
    const h = makeHarness();
    const target = wv(48, 40, 48);
    h.inventory.add(VOXEL_DIRT, 2);
    h.setLook([(target[0] - 3) * 2, target[1] * 2, target[2] * 2], [1, 0, 0]);
    h.setPlayerVoxels([]);
    const msg = h.controller.placeBlock();
    expect(msg).toContain("Dirt");
    // the cell above the placement is open air, so the dirt grows grass
    expect(h.layer.get([target[0] - 1, target[1], target[2]])?.id).toBe(
      VOXEL_GRASS,
    );
    expect(h.inventory.count(VOXEL_DIRT)).toBe(1);
  });

  it("places plain dirt when a block sits above the placement cell", () => {
    const h = makeHarness();
    const target = wv(48, 40, 48);
    h.inventory.add(VOXEL_DIRT, 2);
    h.setLook([(target[0] - 3) * 2, target[1] * 2, target[2] * 2], [1, 0, 0]);
    h.setPlayerVoxels([]);
    // place cell local (47,40,48); fill the cell above it so no grass should grow
    h.block.store.set(47, 41, 48, VOXEL_DIRT);
    h.controller.placeBlock();
    expect(h.layer.get([target[0] - 1, target[1], target[2]])?.id).toBe(
      VOXEL_DIRT,
    );
  });

  it("refuses to place into the player's own voxels", () => {
    const h = makeHarness();
    const target = wv(48, 40, 48);
    h.inventory.add(VOXEL_DIRT, 2);
    h.setLook([(target[0] - 1) * 2, target[1] * 2, target[2] * 2], [1, 0, 0]);
    h.setPlayerVoxels([[target[0] - 1, target[1], target[2]]]);
    const msg = h.controller.placeBlock();
    expect(msg).toContain("inside");
    expect(h.inventory.count(VOXEL_DIRT)).toBe(2);
  });

  it("refuses to place with an empty inventory", () => {
    const h = makeHarness();
    const target = wv(48, 40, 48);
    h.setPlayerVoxels([]);
    h.setLook([(target[0] - 3) * 2, target[1] * 2, target[2] * 2], [1, 0, 0]);
    expect(h.controller.placeBlock()).toContain("no dirt to place");
    expect(h.layer.get([target[0] - 1, target[1], target[2]])).toBeUndefined();
  });

  it("reports when the crosshair points at empty air, no floating placements", () => {
    const h = makeHarness();
    h.inventory.add(VOXEL_DIRT, 2);
    h.setPlayerVoxels([]);
    // aim straight up into empty sky: no target face, so nothing is placed
    h.setLook([0, 60, 0], [0, 1, 0]);
    expect(h.controller.placeBlock()).toContain("point at a block face");
    expect(h.layer.size).toBe(0);
  });
});
