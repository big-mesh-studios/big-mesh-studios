import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type { PlanShape, StructurePlan } from "../types";
import { Command } from "./Command";
import { createCommander } from "./commander";

const harness = () => {
  const [plan, setPlan] = createSignal<StructurePlan>([]);
  const { doCommand } = createCommander({ plan, setPlan });
  return { plan, doCommand };
};

const box = (x: number): PlanShape => ({
  kind: "box",
  min: [x, 0, 0],
  max: [x + 1, 1, 1],
  id: 1,
});

describe("createCommander", () => {
  it("adds a shape and hands back its removal", async () => {
    const { plan, doCommand } = harness();
    const reverse = await doCommand(Command.addShape(box(0)));
    expect(plan()).toHaveLength(1);
    expect(reverse.type).toBe("RemoveShape");

    await doCommand(reverse);
    expect(plan()).toHaveLength(0);
  });

  it("removes a shape and hands back an add at the same index", async () => {
    const { plan, doCommand } = harness();
    await doCommand(Command.addShape(box(0)));
    await doCommand(Command.addShape(box(4)));

    const reverse = await doCommand(Command.removeShape(0));
    expect(plan()).toHaveLength(1);
    expect(reverse.type).toBe("AddShape");
    if (reverse.type === "AddShape") {
      expect(reverse.index).toBe(0);
      expect(reverse.shape).toEqual(box(0));
    }
  });

  it("replaces a shape and hands back the previous one", async () => {
    const { plan, doCommand } = harness();
    await doCommand(Command.addShape(box(0)));
    const reverse = await doCommand(Command.setShape(0, box(8)));
    expect(plan()[0]).toEqual(box(8));
    if (reverse.type === "SetShape") {
      expect(reverse.shape).toEqual(box(0));
    } else {
      throw new Error("expected a SetShape reverse");
    }
  });

  it("reorders a shape and hands back the swap", async () => {
    const { plan, doCommand } = harness();
    await doCommand(Command.addShape(box(0)));
    await doCommand(Command.addShape(box(4)));
    await doCommand(Command.addShape(box(8)));

    const reverse = await doCommand(Command.reorderShape(0, 2));
    expect(plan()).toEqual([box(4), box(8), box(0)]);
    expect(reverse).toEqual(Command.reorderShape(2, 0));

    await doCommand(reverse);
    expect(plan()).toEqual([box(0), box(4), box(8)]);
  });

  it("applies a sequence in order and reverses it in reverse", async () => {
    const { plan, doCommand } = harness();
    const reverse = await doCommand(
      Command.sequence([
        Command.addShape(box(0)),
        Command.addShape(box(4)),
        Command.addShape(box(8)),
      ]),
    );
    expect(plan()).toHaveLength(3);
    expect(reverse.type).toBe("Sequence");
    if (reverse.type === "Sequence") {
      expect(reverse.commands.map((command) => command.type)).toEqual([
        "RemoveShape",
        "RemoveShape",
        "RemoveShape",
      ]);
      await doCommand(reverse);
      expect(plan()).toHaveLength(0);
    }
  });

  it("returns a no-op for an out-of-range removal", async () => {
    const { doCommand } = harness();
    const reverse = await doCommand(Command.removeShape(3));
    expect(reverse.type).toBe("NoOperation");
  });

  it("round-trips a command through JSON", () => {
    const command = Command.setShape(2, box(0));
    expect(Command.fromJSON(Command.toJSON(command))).toEqual(command);
  });
});
