/**
 * A change to a level, in a form that can be applied and reversed.
 *
 * ## Why the undo stack holds the reverse and not the original
 *
 * An undo entry holds **the command that undoes the change it made**, so applying an entry
 * is itself reversible and `undo` and `redo` are the same operation pointed at different
 * stacks. The alternative — keeping the original and working out the inverse when asked —
 * has to answer "what would reverse this?" at undo time, which means every command needs a
 * rule for its own inverse, and every rule is a chance to get one wrong.
 *
 * Ported from voxelscape's level editor, which solves the same problem the same way.
 *
 * ## Why there is no `toJSON` here
 *
 * voxelscape's version has one, because a voxel level is saved as a plan *and* a history.
 * A level here is saved as items only (`types.ts`) — the history is what happened in this
 * session and is not part of the level. So a serialiser would have no caller, and this
 * repository does not carry API that nothing reaches.
 */

import type { LevelItem, LevelPlan } from "../../places/level/types";

export type Command =
  | { type: "NoOperation" }
  | { type: "Sequence"; commands: Command[] }
  | { type: "AddItem"; item: LevelItem; index?: number }
  | { type: "RemoveItem"; index: number }
  | { type: "SetItem"; index: number; item: LevelItem }
  | { type: "ReorderItem"; from: number; to: number }
  | { type: "LoadPlan"; plan: LevelPlan }
  | { type: "Async"; command: Promise<Command> };

export namespace Command {
  export function noOperation(): Command {
    return { type: "NoOperation" };
  }

  /**
   * Several commands as one, so they undo as one step.
   *
   * Applied in order and reversed in reverse order, because reversing a sequence means
   * undoing its last member first — which is what a sequence is.
   */
  export function sequence(commands: Command[]): Command {
    return { type: "Sequence", commands };
  }

  /** Adds an item, on the end unless an index says where. */
  export function addItem(item: LevelItem, index?: number): Command {
    return { type: "AddItem", item, index };
  }

  export function removeItem(index: number): Command {
    return { type: "RemoveItem", index };
  }

  /**
   * Replaces one item.
   *
   * **The level's own document, not the world.** The world is changed by
   * `apply-level.ts`, which uses `PlaceHandle.set` so an edit does not move a shape in the
   * fold; this command is what remembers what the item was before.
   */
  export function setItem(index: number, item: LevelItem): Command {
    return { type: "SetItem", index, item };
  }

  /**
   * Moves an item to another position in the list.
   *
   * **This is fold order, not depth order.** Two shapes can both be at index 7 in the list
   * and fold in a different order — see `apply-level.ts`.
   */
  export function reorderItem(from: number, to: number): Command {
    return { type: "ReorderItem", from, to };
  }

  /** Replaces the whole level, which is what importing a file does. */
  export function loadPlan(plan: LevelPlan): Command {
    return { type: "LoadPlan", plan };
  }

  /**
   * Wraps a command that is not ready yet.
   *
   * So a burst of edits arrives in the order it was made rather than in the order its
   * promises settle — which is not the same thing, and getting it wrong shows as an undo
   * that undoes the wrong edit.
   */
  export function async(command: Promise<Command>): Command {
    return { type: "Async", command };
  }
}
