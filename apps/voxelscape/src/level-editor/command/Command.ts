import type { LevelPlan, PlanItem } from "../types";

/**
 * A change to the level plan, in a form that can be applied, reversed, and
 * written to the undo history.
 */
export type Command =
  | { type: "NoOperation" }
  | { type: "Sequence"; commands: Command[] }
  | { type: "AddItem"; item: PlanItem; index?: number }
  | { type: "RemoveItem"; index: number }
  | { type: "SetItem"; index: number; item: PlanItem }
  | { type: "ReorderItem"; from: number; to: number }
  | { type: "LoadPlan"; plan: LevelPlan }
  | { type: "Async"; command: Promise<Command> };

export namespace Command {
  export function noOperation(): Command {
    return { type: "NoOperation" };
  }

  export function sequence(commands: Command[]): Command {
    return { type: "Sequence", commands };
  }

  export function addItem(item: PlanItem, index?: number): Command {
    return { type: "AddItem", item, index };
  }

  export function removeItem(index: number): Command {
    return { type: "RemoveItem", index };
  }

  export function setItem(index: number, item: PlanItem): Command {
    return { type: "SetItem", index, item };
  }

  export function reorderItem(from: number, to: number): Command {
    return { type: "ReorderItem", from, to };
  }

  export function loadPlan(plan: LevelPlan): Command {
    return { type: "LoadPlan", plan };
  }

  export function async(command: Promise<Command>): Command {
    return { type: "Async", command };
  }

  /** A plain-JSON form of `command`, for persistence. Async commands are dropped. */
  export function toJSON(command: Command): unknown {
    switch (command.type) {
      case "NoOperation":
        return command;
      case "Sequence":
        return {
          type: "Sequence",
          commands: command.commands.map(toJSON),
        };
      case "AddItem":
        return { type: "AddItem", item: command.item, index: command.index };
      case "RemoveItem":
        return command;
      case "SetItem":
        return { type: "SetItem", index: command.index, item: command.item };
      case "ReorderItem":
        return command;
      case "LoadPlan":
        return command;
      case "Async":
        return Command.noOperation();
    }
  }

  /**
   * Rebuilds a command from its JSON form, returning a no-op for anything that
   * does not match a known shape so one stale entry cannot take down a loaded
   * undo stack.
   */
  export function fromJSON(value: unknown): Command {
    if (typeof value !== "object" || value === null) {
      return Command.noOperation();
    }
    const command = value as Record<string, unknown>;
    switch (command.type) {
      case "NoOperation":
        return Command.noOperation();
      case "Sequence":
        return Array.isArray(command.commands)
          ? Command.sequence(command.commands.map(fromJSON))
          : Command.noOperation();
      case "AddItem":
        return typeof command.item === "object" && command.item !== null
          ? Command.addItem(
              command.item as PlanItem,
              typeof command.index === "number" ? command.index : undefined,
            )
          : Command.noOperation();
      case "RemoveItem":
        return typeof command.index === "number"
          ? Command.removeItem(command.index)
          : Command.noOperation();
      case "SetItem":
        return typeof command.index === "number" &&
          typeof command.item === "object" &&
          command.item !== null
          ? Command.setItem(command.index, command.item as PlanItem)
          : Command.noOperation();
      case "ReorderItem":
        return typeof command.from === "number" &&
          typeof command.to === "number"
          ? Command.reorderItem(command.from, command.to)
          : Command.noOperation();
      case "LoadPlan":
        return typeof command.plan === "object" && command.plan !== null
          ? Command.loadPlan(command.plan as LevelPlan)
          : Command.noOperation();
      default:
        return Command.noOperation();
    }
  }
}
