import { untrack, type Accessor, type Setter } from "solid-js";
import type { StructurePlan } from "../types";
import { Command } from "./Command";

export interface CommanderDeps {
  plan: Accessor<StructurePlan>;
  setPlan: Setter<StructurePlan>;
}

/**
 * Applies commands to the structure plan and hands back each one's reverse, so
 * the caller can keep an undo stack. The whole apply runs untracked, so reading
 * the plan while applying never subscribes the caller.
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

        case "AddShape": {
          const structures = plan().slice();
          const index = command.index ?? structures.length;
          structures.splice(index, 0, command.shape);
          setPlan(structures);
          return Command.removeShape(index);
        }

        case "RemoveShape": {
          const structures = plan();
          const shape = structures[command.index];
          if (shape === undefined) {
            return Command.noOperation();
          }
          const next = structures.slice();
          next.splice(command.index, 1);
          setPlan(next);
          return Command.addShape(shape, command.index);
        }

        case "SetShape": {
          const structures = plan();
          const previous = structures[command.index];
          if (previous === undefined) {
            return Command.noOperation();
          }
          const next = structures.slice();
          next[command.index] = command.shape;
          setPlan(next);
          return Command.setShape(command.index, previous);
        }

        case "ReorderShape": {
          const structures = plan();
          if (
            command.from === command.to ||
            structures[command.from] === undefined ||
            structures[command.to] === undefined
          ) {
            return Command.noOperation();
          }
          const next = structures.slice();
          const [moved] = next.splice(command.from, 1);
          next.splice(command.to, 0, moved);
          setPlan(next);
          return Command.reorderShape(command.to, command.from);
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
