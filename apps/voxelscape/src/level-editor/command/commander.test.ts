import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type { LevelPlan, PlanItem, PlanShape } from "../types";
import { Command } from "./Command";
import { createCommander } from "./commander";

const harness = () => {
  const [plan, setPlan] = createSignal<LevelPlan>({
    structures: [],
    npcs: [],
    props: [],
  });
  const { doCommand } = createCommander({ plan, setPlan });
  return { plan, doCommand };
};

const box = (x: number): PlanShape => ({
  kind: "box",
  min: [x, 0, 0],
  max: [x + 1, 1, 1],
  id: 1,
});

const structure = (shape: PlanShape): PlanItem => ({
  type: "structure",
  value: shape,
});

describe("createCommander", () => {
  it("adds a shape and hands back its removal", async () => {
    const { plan, doCommand } = harness();
    const reverse = await doCommand(Command.addItem(structure(box(0))));
    expect(plan().structures).toHaveLength(1);
    expect(reverse.type).toBe("RemoveItem");

    await doCommand(reverse);
    expect(plan().structures).toHaveLength(0);
  });

  it("removes a shape and hands back an add at the same index", async () => {
    const { plan, doCommand } = harness();
    await doCommand(Command.addItem(structure(box(0))));
    await doCommand(Command.addItem(structure(box(4))));

    const reverse = await doCommand(Command.removeItem(0));
    expect(plan().structures).toHaveLength(1);
    expect(reverse.type).toBe("AddItem");
    if (reverse.type === "AddItem") {
      expect(reverse.index).toBe(0);
      expect(reverse.item).toEqual(structure(box(0)));
    }
  });

  it("replaces a shape and hands back the previous one", async () => {
    const { plan, doCommand } = harness();
    await doCommand(Command.addItem(structure(box(0))));
    const reverse = await doCommand(Command.setItem(0, structure(box(8))));
    expect(plan().structures[0]).toEqual(box(8));
    if (reverse.type === "SetItem") {
      expect(reverse.item).toEqual(structure(box(0)));
    } else {
      throw new Error("expected a SetItem reverse");
    }
  });

  it("reorders a shape and hands back the swap", async () => {
    const { plan, doCommand } = harness();
    await doCommand(Command.addItem(structure(box(0))));
    await doCommand(Command.addItem(structure(box(4))));
    await doCommand(Command.addItem(structure(box(8))));

    const reverse = await doCommand(Command.reorderItem(0, 2));
    expect(plan().structures).toEqual([box(4), box(8), box(0)]);
    expect(reverse).toEqual(Command.reorderItem(2, 0));

    await doCommand(reverse);
    expect(plan().structures).toEqual([box(0), box(4), box(8)]);
  });

  it("applies a sequence in order and reverses it in reverse", async () => {
    const { plan, doCommand } = harness();
    const reverse = await doCommand(
      Command.sequence([
        Command.addItem(structure(box(0))),
        Command.addItem(structure(box(4))),
        Command.addItem(structure(box(8))),
      ]),
    );
    expect(plan().structures).toHaveLength(3);
    expect(reverse.type).toBe("Sequence");
    if (reverse.type === "Sequence") {
      expect(reverse.commands.map((command) => command.type)).toEqual([
        "RemoveItem",
        "RemoveItem",
        "RemoveItem",
      ]);
      await doCommand(reverse);
      expect(plan().structures).toHaveLength(0);
    }
  });

  it("returns a no-op for an out-of-range removal", async () => {
    const { doCommand } = harness();
    const reverse = await doCommand(Command.removeItem(3));
    expect(reverse.type).toBe("NoOperation");
  });

  it("round-trips a command through JSON", () => {
    const command = Command.setItem(2, structure(box(0)));
    expect(Command.fromJSON(Command.toJSON(command))).toEqual(command);
  });
});
