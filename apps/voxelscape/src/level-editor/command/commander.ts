import { untrack, type Accessor, type Setter } from "solid-js";
import type { LevelPlan, PlanItem } from "../types";
import { Command } from "./Command";

export interface CommanderDeps {
  plan: Accessor<LevelPlan>;
  setPlan: Setter<LevelPlan>;
}

export const planItems = (plan: LevelPlan): PlanItem[] => [
  ...plan.structures.map((value) => ({ type: "structure" as const, value })),
  ...plan.npcs.map((value) => ({ type: "npc" as const, value })),
  ...plan.props.map((value) => ({ type: "prop" as const, value })),
];

export const planFromItems = (items: PlanItem[]): LevelPlan => ({
  structures: items
    .filter((item): item is Extract<PlanItem, { type: "structure" }> =>
      item.type === "structure"
    )
    .map((item) => item.value),
  npcs: items
    .filter((item): item is Extract<PlanItem, { type: "npc" }> =>
      item.type === "npc"
    )
    .map((item) => item.value),
  props: items
    .filter((item): item is Extract<PlanItem, { type: "prop" }> =>
      item.type === "prop"
    )
    .map((item) => item.value),
});

/**
 * Applies commands to the level plan and hands back each one's reverse, so the
 * caller can keep an undo stack. The whole apply runs untracked, so reading the
 * plan while applying never subscribes the caller.
 */
export function createCommander({ plan, setPlan }: CommanderDeps) {
  /** The plan as it stands, as a command that puts it back. */
  function snapshot(): Command {
    return Command.loadPlan(structuredClone(plan()));
  }

  async function doCommand(command: Command): Promise<Command> {
    return untrack(async () => {
      switch (command.type) {
        case "NoOperation":
          return Command.noOperation();

        case "Sequence": {
          const reverseCommands = new Array<Command>(command.commands.length);
          for (let i = 0; i < command.commands.length; ++i) {
            reverseCommands[command.commands.length - 1 - i] = await doCommand(
              command.commands[i],
            );
          }
          return Command.sequence(reverseCommands);
        }

        case "AddItem": {
          const items = planItems(plan());
          const index = command.index ?? items.length;
          items.splice(index, 0, command.item);
          setPlan(planFromItems(items));
          return Command.removeItem(index);
        }

        case "RemoveItem": {
          const items = planItems(plan());
          const item = items[command.index];
          if (item === undefined) {
            return Command.noOperation();
          }
          items.splice(command.index, 1);
          setPlan(planFromItems(items));
          return Command.addItem(item, command.index);
        }

        case "SetItem": {
          const items = planItems(plan());
          const previous = items[command.index];
          if (previous === undefined) {
            return Command.noOperation();
          }
          items[command.index] = command.item;
          setPlan(planFromItems(items));
          return Command.setItem(command.index, previous);
        }

        case "ReorderItem": {
          const items = planItems(plan());
          if (
            command.from === command.to ||
            items[command.from] === undefined ||
            items[command.to] === undefined
          ) {
            return Command.noOperation();
          }
          const [moved] = items.splice(command.from, 1);
          items.splice(command.to, 0, moved);
          setPlan(planFromItems(items));
          return Command.reorderItem(command.to, command.from);
        }

        case "LoadPlan": {
          const previous = snapshot();
          setPlan(command.plan);
          return previous;
        }

        case "Async": {
          const resolved = await command.command;
          return doCommand(resolved);
        }
      }
    });
  }

  return { snapshot, doCommand };
}
