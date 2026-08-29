// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { Inventory, COLLECTABLE, BREAK_YIELD, SWORD, TOOLS } from "./inventory";
import { VOXEL_GRASS, VOXEL_DIRT, VOXEL_WATER } from "../world/voxel-store";

describe("Inventory", () => {
  it("starts carrying the sword and defaults to dirt selected", () => {
    const inv = new Inventory();
    expect(inv.count(SWORD)).toBe(1);
    expect(inv.count(VOXEL_DIRT)).toBe(0);
    expect(inv.selectedId).toBe(VOXEL_DIRT);
  });

  it("adds and removes dirt", () => {
    const inv = new Inventory();
    inv.add(VOXEL_DIRT, 3);
    inv.add(VOXEL_DIRT, 2);
    expect(inv.count(VOXEL_DIRT)).toBe(5);
    expect(inv.remove(VOXEL_DIRT, 4)).toBe(true);
    expect(inv.count(VOXEL_DIRT)).toBe(1);
    expect(inv.remove(VOXEL_DIRT, 2)).toBe(false);
    expect(inv.count(VOXEL_DIRT)).toBe(1);
  });

  it("ignores non-collectable blocks (grass, water, unknown ids)", () => {
    const inv = new Inventory();
    inv.add(VOXEL_GRASS, 5);
    inv.add(VOXEL_WATER, 5);
    inv.add(99, 5);
    expect(inv.count(VOXEL_GRASS)).toBe(0);
    expect(inv.count(VOXEL_WATER)).toBe(0);
    expect(inv.count(99)).toBe(0);
  });

  it("never stacks or consumes the sword", () => {
    const inv = new Inventory();
    inv.add(SWORD, 5);
    expect(inv.count(SWORD)).toBe(1);
    expect(inv.remove(SWORD)).toBe(false);
    expect(inv.count(SWORD)).toBe(1);
  });

  it("selects dirt and the sword and reports them in hotbar order", () => {
    const inv = new Inventory();
    inv.add(VOXEL_DIRT, 2);
    // dirt is selected by default; re-selecting it is a no-op
    expect(inv.setSelected(VOXEL_DIRT)).toBe(false);
    expect(inv.selectedId).toBe(VOXEL_DIRT);
    expect(inv.setSelected(SWORD)).toBe(true);
    expect(inv.selectedId).toBe(SWORD);
    expect(inv.setSelected(VOXEL_GRASS)).toBe(false);
    expect(inv.setSelected(99)).toBe(false);
    expect(inv.items()).toEqual([
      { id: VOXEL_DIRT, name: "Dirt", count: 2, stackable: true },
      { id: SWORD, name: "Sword", count: 1, stackable: false },
    ]);
  });

  it("cycles the selection with the wheel step", () => {
    const inv = new Inventory();
    expect(inv.selectedId).toBe(VOXEL_DIRT);
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe(SWORD);
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe(VOXEL_DIRT);
    expect(inv.selectStep(-1)).toBe(true);
    expect(inv.selectedId).toBe(SWORD);
  });

  it("selects the sword as hotbar slot 1", () => {
    const inv = new Inventory();
    expect(inv.selectedId).toBe(VOXEL_DIRT);
    expect(inv.selectSlot(1)).toBe(true);
    expect(inv.selectedId).toBe(SWORD);
    expect(inv.selectSlot(0)).toBe(true);
    expect(inv.selectedId).toBe(VOXEL_DIRT);
    expect(inv.selectSlot(2)).toBe(false);
  });

  it("notifies onChange when a count changes", () => {
    const inv = new Inventory();
    const spy = vi.fn();
    inv.onChange = spy;
    inv.add(VOXEL_DIRT, 1);
    expect(spy).toHaveBeenCalledTimes(1);
    inv.remove(VOXEL_DIRT, 1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("notifies onChange when the selection changes", () => {
    const inv = new Inventory();
    const spy = vi.fn();
    inv.onChange = spy;
    inv.setSelected(SWORD);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

it("grass and dirt both break into a single dirt item", () => {
  expect(COLLECTABLE).toEqual({ [VOXEL_DIRT]: "Dirt" });
  expect(TOOLS).toEqual({ [SWORD]: "Sword" });
  expect(BREAK_YIELD[VOXEL_GRASS]).toBe(VOXEL_DIRT);
  expect(BREAK_YIELD[VOXEL_DIRT]).toBe(VOXEL_DIRT);
});
