// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { EditingController } from "./editing-controller";
import { Inventory } from "./inventory";
import { buildBlock } from "../world/level-data";
import { EditLayer } from "../world/edit-layer";
import { VOXEL_GRASS, VOXEL_DIRT, VOXEL_AIR } from "../world/voxel-store";

/** World voxel of local index `l` for a block at the origin (n/2 = 32 per axis). */
const wv = (lx: number, ly: number, lz: number): [number, number, number] => [
  lx - 32,
  ly - 32,
  lz - 32,
];

const makeHarness = () => {
  const block = buildBlock({
    center: [0, 0, 0],
    customFillStore: (store) => store.set(32, 40, 32, VOXEL_GRASS),
  });
  const layer = new EditLayer();
  const inventory = new Inventory();
  const onBlockEdited = vi.fn();
  const onEditRecorded = vi.fn();
  const onEdit = vi.fn();
  let look = {
    origin: [0, 0, 0] as [number, number, number],
    direction: [0, -1, 0] as [number, number, number],
  };
  let playerVoxels: Array<[number, number, number]> | null = null;
  const controller = new EditingController({
    blocks: [block],
    layer,
    inventory,
    onBlockEdited,
    onEditRecorded,
    onEdit,
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
    onEdit,
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
  const [wx, wy] = wv(32, 40, 32);
  // camera a few voxels above the target, aiming straight down
  return [
    [wx * 2, (wy + 4) * 2, wx * 2],
    [0, -1, 0],
  ];
};

describe("EditingController.breakBlock", () => {
  it("breaks a collectable voxel into the inventory as dirt", () => {
    const h = makeHarness();
    const target = wv(32, 40, 32);
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

  it("reports each recorded edit through onEdit for broadcasting", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_234_567);
    const h = makeHarness();
    const target = wv(32, 40, 32);
    const [origin, direction] = downOntoTarget();
    h.setLook(origin, direction);
    h.controller.breakBlock();
    expect(h.onEdit).toHaveBeenCalledWith(target, VOXEL_AIR, 1_234_567);
    vi.restoreAllMocks();
  });

  it("does not fire onEdit for a refused edit", () => {
    const h = makeHarness();
    h.setLook([0, 60, 0], [0, -1, 0]); // far above, target out of reach
    expect(h.controller.breakBlock()).toBeNull();
    expect(h.onEdit).not.toHaveBeenCalled();
  });

  it("does nothing when there is no target in reach", () => {
    const h = makeHarness();
    h.setLook([0, 60, 0], [0, -1, 0]); // far above, target out of reach
    expect(h.controller.breakBlock()).toBeNull();
    expect(h.inventory.count(VOXEL_DIRT)).toBe(0);
  });

  it("breaks the bottom row of a block — the world has no floor to guard", () => {
    const floorBlock = buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => store.set(32, 0, 32, VOXEL_GRASS),
    });
    const layer = new EditLayer();
    const inventory = new Inventory();
    const controller = new EditingController({
      blocks: [floorBlock],
      layer,
      inventory,
      onBlockEdited: vi.fn(),
      onEditRecorded: vi.fn(),
      getLook: () => ({
        // camera one voxel above the bottom voxel, aiming straight down
        origin: [
          wv(32, 0, 32)[0] * 2,
          (wv(32, 0, 32)[1] + 1) * 2,
          wv(32, 0, 32)[0] * 2,
        ],
        direction: [0, -1, 0],
      }),
      getPlayerVoxels: () => null,
    });
    const msg = controller.breakBlock();
    expect(msg).not.toBeNull();
    expect(layer.size).toBe(1);
    expect(inventory.count(VOXEL_DIRT)).toBe(1);
  });
});

describe("EditingController.placeBlock", () => {
  it("places the selected block into the face-adjacent cell", () => {
    const h = makeHarness();
    const target = wv(32, 40, 32);
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
    const target = wv(32, 40, 32);
    h.inventory.add(VOXEL_DIRT, 2);
    h.setLook([(target[0] - 3) * 2, target[1] * 2, target[2] * 2], [1, 0, 0]);
    h.setPlayerVoxels([]);
    // place cell local (31,40,32); fill the cell above it so no grass should grow
    h.block.store.set(31, 41, 32, VOXEL_DIRT);
    h.controller.placeBlock();
    expect(h.layer.get([target[0] - 1, target[1], target[2]])?.id).toBe(
      VOXEL_DIRT,
    );
  });

  it("refuses to place into the player's own voxels", () => {
    const h = makeHarness();
    const target = wv(32, 40, 32);
    h.inventory.add(VOXEL_DIRT, 2);
    h.setLook([(target[0] - 1) * 2, target[1] * 2, target[2] * 2], [1, 0, 0]);
    h.setPlayerVoxels([[target[0] - 1, target[1], target[2]]]);
    const msg = h.controller.placeBlock();
    expect(msg).toContain("inside");
    expect(h.inventory.count(VOXEL_DIRT)).toBe(2);
  });

  it("refuses to place with an empty inventory", () => {
    const h = makeHarness();
    const target = wv(32, 40, 32);
    h.setPlayerVoxels([]);
    h.setLook([(target[0] - 3) * 2, target[1] * 2, target[2] * 2], [1, 0, 0]);
    expect(h.controller.placeBlock()).toContain("no dirt to place");
    expect(h.layer.get([target[0] - 1, target[1], target[2]])).toBeUndefined();
  });

  it("refuses to place outside the loaded blocks", () => {
    // a voxel in the block's top row: the cell above it lies in no loaded block
    const ceilingBlock = buildBlock({
      center: [0, 0, 0],
      customFillStore: (store) => store.set(32, 63, 32, VOXEL_GRASS),
    });
    const layer = new EditLayer();
    const inventory = new Inventory();
    inventory.add(VOXEL_DIRT, 2);
    const top = wv(32, 63, 32);
    const controller = new EditingController({
      blocks: [ceilingBlock],
      layer,
      inventory,
      onBlockEdited: vi.fn(),
      onEditRecorded: vi.fn(),
      getLook: () => ({
        // camera one voxel above the top voxel, aiming straight down at it
        origin: [top[0] * 2, (top[1] + 2) * 2, top[2] * 2],
        direction: [0, -1, 0],
      }),
      getPlayerVoxels: () => [],
    });
    expect(controller.placeBlock()).toContain("outside the world");
    expect(layer.size).toBe(0);
    expect(inventory.count(VOXEL_DIRT)).toBe(2);
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
