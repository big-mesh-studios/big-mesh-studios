// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBlockShell } from "./level-data";
import { FireEmbers, fireFloorVoxel, fireAnchor } from "./fire-ember";
import { worldVoxelToLocal } from "./edit-layer";
import { LightEngine } from "./light-engine";
import { VOXEL_BRICK, VOXEL_EMBER } from "./voxel-store";
import { EMISSIVE_LEVEL, MAX_LIGHT } from "./light-store";
import type { ScriptedFire } from "./fire-ember";

const fire = (x: number, z: number): ScriptedFire => ({
  id: "fire-0",
  x,
  z,
  y: 62,
  height: 3.5,
});

const lightOf = (blocks: import("./level-data").WorldBlock[]): LightEngine =>
  new LightEngine({ blocks, onChanged: () => {} });

describe("fire embers", () => {
  it("names the solid floor voxel under the fire's base", () => {
    expect(fireFloorVoxel(fire(10, 18))).toEqual([5, 30, 9]);
  });

  it("draws the flame from the centre of the ember voxel", () => {
    // A base not centred on a voxel snaps to the voxel it kindles anyway.
    expect(fireAnchor(fire(10.5, 18.4))).toEqual({ x: 11, y: 62, z: 19 });
  });

  it("kindles the floor voxel and seeds the holder's block light", () => {
    const block = buildBlockShell({ center: [0, 0, 0] });
    const changed: number[][] = [];
    const light = lightOf([block]);
    const embers = new FireEmbers(
      [block],
      (indices) => changed.push(indices),
      light,
    );
    embers.seed(fire(10, 18));
    light.flush();
    expect(changed).toEqual([[0]]);
    const [x, y, z] = worldVoxelToLocal(
      block.store,
      block.center,
      fireFloorVoxel(fire(10, 18)),
    );
    expect(block.store.get(x, y, z)).toBe(VOXEL_EMBER);
    expect(block.light.blocklightAt(block.light.paddedIndex(x, y, z))).toBe(
      EMISSIVE_LEVEL[VOXEL_EMBER],
    );
    // Light has spread one voxel into the air beside the ember, decaying by
    // one, exactly as it does from a lava id.
    expect(block.light.blocklightAt(block.light.paddedIndex(x + 1, y, z))).toBe(
      MAX_LIGHT - 1,
    );
  });

  it("puts the floor back when the fires go out", () => {
    const block = buildBlockShell({ center: [0, 0, 0] });
    const [x, y, z] = worldVoxelToLocal(block.store, block.center, [5, 30, 9]);
    block.store.set(x, y, z, VOXEL_BRICK);
    const light = lightOf([block]);
    const embers = new FireEmbers([block], () => {}, light);
    embers.seed(fire(10, 18));
    light.flush();
    expect(block.store.get(x, y, z)).toBe(VOXEL_EMBER);
    embers.clear();
    light.flush();
    expect(block.store.get(x, y, z)).toBe(VOXEL_BRICK);
    expect(block.light.blocklightAt(block.light.paddedIndex(x, y, z))).toBe(0);
  });

  it("leaves the world untouched when no loaded block covers the floor voxel", () => {
    const block = buildBlockShell({ center: [0, 0, 0] });
    const changed: number[][] = [];
    const light = lightOf([block]);
    const embers = new FireEmbers(
      [block],
      (indices) => changed.push(indices),
      light,
    );
    embers.seed(fire(500, 500));
    light.flush();
    expect(changed).toEqual([]);
    const [x, y, z] = worldVoxelToLocal(block.store, block.center, [5, 30, 9]);
    expect(block.light.blocklightAt(block.light.paddedIndex(x, y, z))).toBe(0);
  });
});
