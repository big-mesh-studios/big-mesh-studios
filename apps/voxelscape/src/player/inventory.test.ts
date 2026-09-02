// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { Inventory } from "./inventory";
import { BREAK_YIELD, ITEM_ORDER } from "./items";
import { VOXEL_CLOUD, VOXEL_DIRT, VOXEL_GRASS } from "../world/voxel-store";

describe("Inventory", () => {
  it("starts carrying the sword and defaults to dirt selected", () => {
    const inv = new Inventory();
    expect(inv.count("sword")).toBe(1);
    expect(inv.count("dirt")).toBe(0);
    expect(inv.selectedId).toBe("dirt");
  });

  it("adds and removes dirt", () => {
    const inv = new Inventory();
    inv.add("dirt", 3);
    inv.add("dirt", 2);
    expect(inv.count("dirt")).toBe(5);
    expect(inv.remove("dirt", 4)).toBe(true);
    expect(inv.count("dirt")).toBe(1);
    expect(inv.remove("dirt", 2)).toBe(false);
    expect(inv.count("dirt")).toBe(1);
  });

  it("never stacks or consumes the sword", () => {
    const inv = new Inventory();
    inv.add("sword", 5);
    expect(inv.count("sword")).toBe(1);
    expect(inv.remove("sword")).toBe(false);
    expect(inv.count("sword")).toBe(1);
  });

  it("selects items and reports them in hotbar order", () => {
    const inv = new Inventory();
    inv.add("dirt", 2);
    // dirt is selected by default; re-selecting it is a no-op
    expect(inv.setSelected("dirt")).toBe(false);
    expect(inv.setSelected("sword")).toBe(true);
    expect(inv.selectedId).toBe("sword");
    expect(inv.items()).toEqual([
      { id: "dirt", name: "Dirt", count: 2, stackable: true },
      { id: "stone", name: "Stone", count: 0, stackable: true },
      { id: "cloud", name: "Cloud", count: 0, stackable: true },
      { id: "sword", name: "Sword", count: 1, stackable: false },
    ]);
  });

  it("cycles the selection with the wheel step", () => {
    const inv = new Inventory();
    expect(inv.selectedId).toBe("dirt");
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe("stone");
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe("cloud");
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe("sword");
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe("dirt");
    expect(inv.selectStep(-1)).toBe(true);
    expect(inv.selectedId).toBe("sword");
  });

  it("selects hotbar slots in order", () => {
    const inv = new Inventory();
    expect(inv.selectSlot(1)).toBe(true);
    expect(inv.selectedId).toBe("stone");
    expect(inv.selectSlot(0)).toBe(true);
    expect(inv.selectedId).toBe("dirt");
    expect(inv.selectSlot(2)).toBe(true);
    expect(inv.selectedId).toBe("cloud");
    expect(inv.selectSlot(3)).toBe(true);
    expect(inv.selectedId).toBe("sword");
    expect(inv.selectSlot(ITEM_ORDER.length)).toBe(false);
  });

  it("notifies onChange when a count changes", () => {
    const inv = new Inventory();
    const spy = vi.fn();
    inv.onChange = spy;
    inv.add("dirt", 1);
    expect(spy).toHaveBeenCalledTimes(1);
    inv.remove("dirt", 1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("notifies onChange when the selection changes", () => {
    const inv = new Inventory();
    const spy = vi.fn();
    inv.onChange = spy;
    inv.setSelected("sword");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

it("yields a single dirt item from grass and dirt, and cloud from cloud", () => {
  expect(BREAK_YIELD[VOXEL_GRASS]).toBe("dirt");
  expect(BREAK_YIELD[VOXEL_DIRT]).toBe("dirt");
  expect(BREAK_YIELD[VOXEL_CLOUD]).toBe("cloud");
});
