// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { Inventory, HOTBAR_SIZE } from "./inventory";
import { BREAK_YIELD, ITEM_ORDER } from "./items";
import {
  VOXEL_BRICK,
  VOXEL_CLOUD,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_LEAVES,
  VOXEL_LOG,
  VOXEL_WOOD,
} from "../world/voxel-store";

describe("Inventory", () => {
  it("starts with the sword count of 1 (non-stackable) and defaults to first item selected", () => {
    const inv = new Inventory();
    expect(inv.count("sword")).toBe(1);
    expect(inv.count("dirt")).toBe(0);
    // selectedId is the first item in ITEM_ORDER
    expect(inv.selectedId).toBe(ITEM_ORDER[0]);
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

  it("items() returns only items with count > 0", () => {
    const inv = new Inventory();
    inv.add("dirt", 2);
    const items = inv.items();
    // Only items with count > 0 are returned
    // sword (non-stackable) always has count 1; dirt has 2; all others are 0.
    expect(items.some((i) => i.id === "dirt")).toBe(true);
    expect(items.some((i) => i.id === "sword")).toBe(true);
    expect(items.every((i) => i.count > 0)).toBe(true);
    // stone has count 0 and should be absent
    expect(items.some((i) => i.id === "stone")).toBe(false);
  });

  it("selects items by id", () => {
    const inv = new Inventory();
    inv.add("dirt", 2);
    // re-selecting the same item is a no-op
    expect(inv.setSelected(inv.selectedId)).toBe(false);
    expect(inv.setSelected("sword")).toBe(true);
    expect(inv.selectedId).toBe("sword");
  });

  it("cycles the selection among hotbar items with the wheel step", () => {
    const inv = new Inventory();
    // Default hotbar: first HOTBAR_SIZE items of ITEM_ORDER
    // Set up a known hotbar
    inv.setHotbarSlot(0, "dirt");
    inv.setHotbarSlot(1, "stone");
    inv.setHotbarSlot(2, "cloud");
    inv.setHotbarSlot(3, "brick");
    inv.setHotbarSlot(4, "wood");
    inv.setSelected("dirt");
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe("stone");
    expect(inv.selectStep(1)).toBe(true);
    expect(inv.selectedId).toBe("cloud");
    expect(inv.selectStep(-1)).toBe(true);
    expect(inv.selectedId).toBe("stone");
    expect(inv.selectStep(-1)).toBe(true);
    expect(inv.selectedId).toBe("dirt");
    // wrap backwards
    expect(inv.selectStep(-1)).toBe(true);
    expect(inv.selectedId).toBe("wood");
  });

  it("selects hotbar slots in order", () => {
    const inv = new Inventory();
    // set up a simple hotbar
    inv.setHotbarSlot(0, "dirt");
    inv.setHotbarSlot(1, "stone");
    inv.setHotbarSlot(2, "cloud");
    inv.setHotbarSlot(3, "brick");
    inv.setHotbarSlot(4, "wood");
    expect(inv.selectSlot(1)).toBe(true);
    expect(inv.selectedId).toBe("stone");
    expect(inv.selectSlot(0)).toBe(true);
    expect(inv.selectedId).toBe("dirt");
    expect(inv.selectSlot(2)).toBe(true);
    expect(inv.selectedId).toBe("cloud");
    expect(inv.selectSlot(HOTBAR_SIZE)).toBe(false);
  });

  it("setHotbarSlot swaps items between slots", () => {
    const inv = new Inventory();
    inv.setHotbarSlot(0, "dirt");
    inv.setHotbarSlot(1, "stone");
    // placing stone into slot 0 should swap: stone→0, dirt→1
    inv.setHotbarSlot(0, "stone");
    expect(inv.hotbarSlots()[0]).toBe("stone");
    expect(inv.hotbarSlots()[1]).toBe("dirt");
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

  it("notifies onChange when a hotbar slot changes", () => {
    const inv = new Inventory();
    const spy = vi.fn();
    inv.onChange = spy;
    inv.setHotbarSlot(0, "sword");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("automatically assigns mined items to blank hotbar slots and selects them", () => {
    const inv = new Inventory();
    inv.setHotbarSlot(2, null);
    inv.setHotbarSlot(3, null);
    inv.setHotbarSlot(4, null);

    inv.add("cloud", 1);
    expect(inv.hotbarSlots()[2]).toBe("cloud");
    expect(inv.selectedId).toBe("cloud");

    inv.add("brick", 1);
    expect(inv.hotbarSlots()[3]).toBe("brick");
    expect(inv.selectedId).toBe("brick");
  });
});

it("yields the item each breakable voxel turns into", () => {
  expect(BREAK_YIELD[VOXEL_GRASS]).toBe("dirt");
  expect(BREAK_YIELD[VOXEL_DIRT]).toBe("dirt");
  expect(BREAK_YIELD[VOXEL_CLOUD]).toBe("cloud");
  expect(BREAK_YIELD[VOXEL_BRICK]).toBe("brick");
  expect(BREAK_YIELD[VOXEL_WOOD]).toBe("wood");
  expect(BREAK_YIELD[VOXEL_LOG]).toBe("wood");
  expect(BREAK_YIELD[VOXEL_LEAVES]).toBe("wood");
});
