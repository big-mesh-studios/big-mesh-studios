import type { PlanShape, StructurePlan } from "../types";

/**
 * A change to the level's structures, in a form that can be applied, reversed,
 * and written to the undo history. `AddShape` and `RemoveShape` are inverses of
 * one another, as are `SetShape`/`SetShape` and `ReorderShape`/`ReorderShape`.
 */
export type Command =
  | { type: "NoOperation" }
  | { type: "Sequence"; commands: Command[] }
  | { type: "AddShape"; shape: PlanShape; index?: number }
  | { type: "RemoveShape"; index: number }
  | { type: "SetShape"; index: number; shape: PlanShape }
  | { type: "ReorderShape"; from: number; to: number }
  | { type: "LoadPlan"; plan: StructurePlan }
  | { type: "Async"; command: Promise<Command> };

export namespace Command {
  export function noOperation(): Command {
    return { type: "NoOperation" };
  }

  export function sequence(commands: Command[]): Command {
    return { type: "Sequence", commands };
  }

  export function addShape(shape: PlanShape, index?: number): Command {
    return { type: "AddShape", shape, index };
  }

  export function removeShape(index: number): Command {
    return { type: "RemoveShape", index };
  }

  export function setShape(index: number, shape: PlanShape): Command {
    return { type: "SetShape", index, shape };
  }

  export function reorderShape(from: number, to: number): Command {
    return { type: "ReorderShape", from, to };
  }

  export function loadPlan(plan: StructurePlan): Command {
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
      case "AddShape":
        return { type: "AddShape", shape: command.shape, index: command.index };
      case "RemoveShape":
        return command;
      case "SetShape":
        return { type: "SetShape", index: command.index, shape: command.shape };
      case "ReorderShape":
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
      case "AddShape":
        return typeof command.shape === "object" && command.shape !== null
          ? Command.addShape(
              command.shape as PlanShape,
              typeof command.index === "number" ? command.index : undefined,
            )
          : Command.noOperation();
      case "RemoveShape":
        return typeof command.index === "number"
          ? Command.removeShape(command.index)
          : Command.noOperation();
      case "SetShape":
        return typeof command.index === "number" &&
          typeof command.shape === "object" &&
          command.shape !== null
          ? Command.setShape(command.index, command.shape as PlanShape)
          : Command.noOperation();
      case "ReorderShape":
        return typeof command.from === "number" &&
          typeof command.to === "number"
          ? Command.reorderShape(command.from, command.to)
          : Command.noOperation();
      case "LoadPlan":
        return Array.isArray(command.plan)
          ? Command.loadPlan(command.plan as StructurePlan)
          : Command.noOperation();
      default:
        return Command.noOperation();
    }
  }
}
