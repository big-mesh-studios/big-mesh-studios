// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LightStore, MAX_LIGHT } from "./light-store";
import { type Dim3 } from "./level-data";
import { propagateLight, fillSkyLight, type LightCursor } from "./sky-light";
import {
  VOXEL_AIR,
  VOXEL_CLOUD,
  VOXEL_DIRT,
  VOXEL_STONE,
  VoxelStore,
} from "./voxel-store";

/** A flat, seedable terrain: a level surface at world Y 20. */
const flatConfig = {
  seed: 1,
  frequency: 1,
  amplitude: 0,
  octaves: 1,
  base: 20,
  seaLevel: 10,
};

const smallStore = (): VoxelStore =>
  new VoxelStore({
    dims: [8, 8, 8],
    voxels: [8, 8, 8],
    scale: 2,
  });

/** The store's world Y of a voxel row, matching `fillSkyLight`'s own mapping. */
const worldYOf = (center: Dim3, vy: number): number =>
  center[1] + (vy + 0.5 - 8 / 2) * 2;

const fillDirt = (store: VoxelStore): void => {
  for (let z = 0; z < 8; z++) {
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        store.set(x, y, z, VOXEL_DIRT);
      }
    }
  }
};

describe("fillSkyLight", () => {
  it("fills the air above the surface and leaves rock dark", () => {
    const center: Dim3 = [0, 16, 0];
    const store = smallStore();
    for (let z = 0; z < 8; z++) {
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          store.set(
            x,
            y,
            z,
            worldYOf(center, y) < flatConfig.base ? VOXEL_DIRT : VOXEL_AIR,
          );
        }
      }
    }
    const light = new LightStore(store.voxels);
    fillSkyLight(store, light, center, flatConfig);
    // open-air rows above the surface are full sky
    expect(light.skylight[light.paddedIndex(4, 7, 4)]).toBe(MAX_LIGHT);
    expect(light.skylight[light.paddedIndex(4, 6, 4)]).toBe(MAX_LIGHT);
    // a buried row deep under rock sees no sky at all
    expect(light.skylight[light.paddedIndex(4, 1, 4)]).toBe(0);
  });

  it("lights a shaft open to the sky but not a sealed air pocket", () => {
    const center: Dim3 = [0, 16, 0];
    const store = smallStore();
    fillDirt(store);
    // an open vertical shaft down one column reaches the sky
    for (let y = 0; y < 8; y++) {
      store.set(1, y, 1, VOXEL_AIR);
    }
    // a pocket of air buried and sealed on every side
    store.set(6, 4, 6, VOXEL_AIR);
    const light = new LightStore(store.voxels);
    fillSkyLight(store, light, center, flatConfig);
    // the shaft's top cell is seeded full and its floor holds full sky too
    expect(light.skylight[light.paddedIndex(1, 7, 1)]).toBe(MAX_LIGHT);
    expect(light.skylight[light.paddedIndex(1, 0, 1)]).toBe(MAX_LIGHT);
    // the sealed pocket has no connection to the surface
    expect(light.skylight[light.paddedIndex(6, 4, 6)]).toBe(0);
  });
});

describe("propagateLight (the shared BFS)", () => {
  it("decays one step per voxel and stops at rock", () => {
    const store = smallStore();
    store.set(4, 0, 4, VOXEL_STONE); // blocks the straight-down path
    store.set(4, 1, 4, VOXEL_AIR);
    store.set(4, 2, 4, VOXEL_AIR);
    const light = new LightStore(store.voxels);
    const seeds: LightCursor[] = [
      { x: 4, y: 0, z: 4, level: MAX_LIGHT, fullSky: false },
    ];
    propagateLight(store, light, seeds, "skylight", false);
    expect(light.skylight[light.paddedIndex(4, 0, 4)]).toBe(MAX_LIGHT);
    expect(light.skylight[light.paddedIndex(4, 1, 4)]).toBe(MAX_LIGHT - 1);
    expect(light.skylight[light.paddedIndex(4, 2, 4)]).toBe(MAX_LIGHT - 2);
  });

  it("lets a straight-down sky cursor reach full depth", () => {
    const store = smallStore();
    for (let y = 0; y < 8; y++) {
      store.set(4, y, 4, VOXEL_AIR);
    }
    const light = new LightStore(store.voxels);
    const seeds: LightCursor[] = [
      { x: 4, y: 7, z: 4, level: MAX_LIGHT, fullSky: true },
    ];
    propagateLight(store, light, seeds, "skylight", true);
    expect(light.skylight[light.paddedIndex(4, 0, 4)]).toBe(MAX_LIGHT);
  });

  it("lets a straight-down sky cursor pass through a cloud, stopping at rock", () => {
    const store = smallStore();
    for (let y = 0; y < 8; y++) {
      store.set(4, y, 4, VOXEL_DIRT);
    }
    // a cloud hangs in the column, transparent to the sky
    for (let y = 4; y < 7; y++) {
      store.set(4, y, 4, VOXEL_CLOUD);
    }
    const light = new LightStore(store.voxels);
    const seeds: LightCursor[] = [
      { x: 4, y: 7, z: 4, level: MAX_LIGHT, fullSky: true },
    ];
    propagateLight(store, light, seeds, "skylight", true);
    // the cloud itself and the air row above the dirt hold full sky
    expect(light.skylight[light.paddedIndex(4, 4, 4)]).toBe(MAX_LIGHT);
    // the dirt below the cloud still gets no light
    expect(light.skylight[light.paddedIndex(4, 1, 4)]).toBe(0);
  });
});
