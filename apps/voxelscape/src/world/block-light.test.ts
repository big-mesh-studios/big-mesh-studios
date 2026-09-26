// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EMISSIVE_LEVEL, LightStore, MAX_LIGHT } from "./light-store";
import { fillBlockLight } from "./block-light";
import { blocksQuery, buildBlockShell, getWorldBlockLight } from "./level-data";
import {
  VOXEL_AIR,
  VOXEL_DIRT,
  VOXEL_GLOWSTONE,
  VOXEL_LAVA,
  VoxelStore,
} from "./voxel-store";

const smallStore = (): VoxelStore =>
  new VoxelStore({
    dims: [8, 8, 8],
    voxels: [8, 8, 8],
    scale: 2,
  });

describe("LightStore", () => {
  it("adopts the light it is handed instead of allocating channels to overwrite", () => {
    // The worker lights a slot into the arrays it was given and hands them
    // back; a store allocating its own here would zero two volumes nobody
    // reads.
    const store = smallStore();
    const data = new Uint8Array(store.data.length);
    const light = new LightStore(store.voxels, data);
    light.setSkylightAt(0, MAX_LIGHT);
    expect(light.data).toBe(data);
    expect(light.skylightAt(0)).toBe(MAX_LIGHT);
    // The channels share a byte, so writing one must leave the other alone.
    expect(light.blocklightAt(0)).toBe(0);
  });

  it("allocates its own channels when it is handed none", () => {
    const store = smallStore();
    const light = new LightStore(store.voxels);
    expect(light.data.length).toBe(store.data.length);
  });
});

describe("fillBlockLight", () => {
  it("seeds an emissive voxel at its listed level", () => {
    const store = smallStore();
    store.set(4, 4, 4, VOXEL_LAVA);
    const light = new LightStore(store.voxels);
    fillBlockLight(store, light);
    expect(light.blocklightAt(light.paddedIndex(4, 4, 4))).toBe(
      EMISSIVE_LEVEL[VOXEL_LAVA],
    );
  });

  it("spreads a diamond that decays with distance through the air", () => {
    const store = smallStore();
    store.set(4, 4, 4, VOXEL_LAVA);
    const light = new LightStore(store.voxels);
    fillBlockLight(store, light);
    const near = light.blocklightAt(light.paddedIndex(5, 4, 4));
    const far = light.blocklightAt(light.paddedIndex(7, 4, 4));
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it("does not shine through solid rock", () => {
    const store = smallStore();
    store.set(4, 4, 4, VOXEL_LAVA);
    store.set(5, 4, 4, VOXEL_DIRT);
    store.set(6, 4, 4, VOXEL_AIR);
    const light = new LightStore(store.voxels);
    fillBlockLight(store, light);
    expect(light.blocklightAt(light.paddedIndex(5, 4, 4))).toBeLessThan(
      MAX_LIGHT,
    );
  });

  it("clears the channel before refilling so removed emitters go dark", () => {
    const store = smallStore();
    store.set(4, 4, 4, VOXEL_LAVA);
    const light = new LightStore(store.voxels);
    fillBlockLight(store, light);
    store.set(4, 4, 4, VOXEL_AIR);
    fillBlockLight(store, light);
    expect(light.blocklightAt(light.paddedIndex(4, 4, 4))).toBe(0);
  });

  it("seeds a glowstone at its listed level", () => {
    // The one way a glowstone can be silently useless is a missing
    // `EMISSIVE_LEVEL` entry, which leaves the block a plain solid voxel and
    // every room it was set into dark.
    const store = smallStore();
    store.set(4, 4, 4, VOXEL_GLOWSTONE);
    const light = new LightStore(store.voxels);
    fillBlockLight(store, light);
    expect(light.blocklightAt(light.paddedIndex(4, 4, 4))).toBe(
      EMISSIVE_LEVEL[VOXEL_GLOWSTONE],
    );
  });

  it("lights the floor of a sealed room from a glowstone in its ceiling", () => {
    // A roof, four walls and a floor of stone with one glowstone set into the
    // roof, which is the shape a convenience store's ceiling panels make.
    const store = smallStore();
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        for (let x = 0; x < 8; x++) {
          const shell = x === 0 || x === 7 || z === 0 || z === 7;
          if (y === 0 || y === 7 || shell) {
            store.set(x, y, z, VOXEL_DIRT);
          }
        }
      }
    }
    store.set(4, 7, 4, VOXEL_GLOWSTONE);
    const light = new LightStore(store.voxels);
    fillBlockLight(store, light);

    // The floor under the panel is lit, and the far corner of the same floor is
    // lit less: the pool falls off with distance rather than filling the room
    // evenly.
    const under = light.blocklightAt(light.paddedIndex(4, 1, 4));
    const corner = light.blocklightAt(light.paddedIndex(1, 1, 1));
    expect(under).toBeGreaterThan(corner);
    expect(corner).toBeGreaterThan(0);
  });
});

describe("getWorldBlockLight", () => {
  /**
   * One real block holding a sealed room with a glowstone in its ceiling, and a
   * query over it. The room's floor is voxel row 32 and its panels row 36, which
   * is where the Get a Snack at 4 AM store puts them. The roof is two voxels
   * deep because an emitter radiates to all six of its neighbours, so a panel
   * set into a roof one voxel thick also lights the open air above the
   * building — light this test would otherwise read as leaking through a wall.
   */
  const litRoom = () => {
    const block = buildBlockShell({ center: [0, 0, 0], lod: 0 });
    for (let y = 32; y <= 37; y++) {
      for (let z = 24; z <= 40; z++) {
        for (let x = 24; x <= 40; x++) {
          const shell = x === 24 || x === 40 || z === 24 || z === 40;
          if (shell || y === 32 || y === 36 || y === 37) {
            block.store.set(x, y, z, VOXEL_DIRT);
          }
        }
      }
    }
    for (const z of [29, 35]) {
      for (const x of [27, 31]) {
        block.store.set(x, 36, z, VOXEL_GLOWSTONE);
      }
    }
    fillBlockLight(block.store, block.light);
    return blocksQuery([block]);
  };

  /** The world point at the centre of one voxel of the block above. */
  const worldOf = (
    x: number,
    y: number,
    z: number,
  ): [number, number, number] => [
    (x - 32) * 2 + 1,
    (y - 32) * 2 + 1,
    (z - 32) * 2 + 1,
  ];

  it("reads the light the terrain's mesher baked for the same voxel", () => {
    // A figure standing on the store floor is drawn at the middle of its own
    // height, which is a world point rather than a voxel, so the query has to
    // resolve one to the other. Anywhere inside a voxel must read as that
    // voxel, and a voxel over must read one level dimmer.
    const query = litRoom();
    const atPanel = worldOf(27, 34, 29);
    expect(getWorldBlockLight(query, ...atPanel)).toBeGreaterThan(0);
    // A hair to either side of the centre is the same voxel, not its neighbour.
    expect(
      getWorldBlockLight(query, atPanel[0] - 0.5, atPanel[1], atPanel[2]),
    ).toBe(getWorldBlockLight(query, ...atPanel));
    expect(
      getWorldBlockLight(query, atPanel[0] + 0.5, atPanel[1], atPanel[2]),
    ).toBe(getWorldBlockLight(query, ...atPanel));
    // One voxel along the floor away from the panel, the light has decayed by
    // one — which is only true if the world point landed in the voxel asked
    // for rather than a fixed distance from the block's centre.
    const oneOver = getWorldBlockLight(query, ...worldOf(28, 34, 29));
    expect(oneOver).toBe(getWorldBlockLight(query, ...atPanel) - 1);
  });

  it("is stopped by the room's walls, as the terrain's is", () => {
    // A model outside a sealed room must come out as dark as the floor outside
    // it, or a figure would stand in the open lit by a fitting it cannot see.
    const query = litRoom();
    expect(getWorldBlockLight(query, ...worldOf(28, 34, 29))).toBeGreaterThan(
      0,
    );
    expect(getWorldBlockLight(query, ...worldOf(20, 34, 29))).toBe(0);
  });

  it("reads nothing outside the loaded blocks", () => {
    // The block spans -64..64 world units on each axis; past that a figure has
    // streamed out of the window and there is no light to report.
    const query = litRoom();
    expect(getWorldBlockLight(query, 4096, 0, 0)).toBe(0);
  });
});
