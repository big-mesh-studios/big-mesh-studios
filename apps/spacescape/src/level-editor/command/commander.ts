/**
 * Applying commands to a level, and handing back each one's reverse.
 *
 * ## Why there is no flatten and no unflatten
 *
 * voxelscape's version has `planItems` and `planFromItems`, which fold a level's three
 * arrays into one list and split them back out — the whole thing exists because a selection
 * is a single index and the plan it indexes is three separate lists. Here the items *are*
 * one list, so a selection is an index into the thing itself and both functions would be
 * `plan.items` and `{ ...plan, items }`.
 *
 * That is not only shorter. voxelscape's flatten has to choose an order between the three
 * arrays, and any order it chooses is an order the author did not write down; here the order
 * in the file is the order in the world, which is the order the fold needs
 * ([ADR 0016](../../../../../docs/adr/0016-a-place-is-a-named-group-of-operations.md)).
 */

import { untrack } from "solid-js";

import type { LevelPlan } from "../../places/level/types";
import { Command } from "./Command";

/**
 * Where the level a command applies to actually lives.
 *
 * ## Why this is not a pair of signals
 *
 * The obvious version of this takes `{ plan, setPlan }` — two Solid signals — and every
 * command reads the plan and writes it back. It is wrong in a way that only shows up under
 * two edits at once.
 *
 * **In Solid 2 a signal read after a write answers with the *previous* value until the next
 * flush.** That is a documented, deliberate behaviour (`create-place-editor.test.ts` exists
 * to pin it down) and it is invisible to a UI, which reads state during a render that has
 * already flushed. It is not invisible here, because a command is a read-modify-write that
 * happens *outside* a render: two `addShapeAt` calls in one turn would both compute
 * `items().length` as 0, both insert at 0, and the level would come out with the second
 * click's shape **first** — a file whose order is the opposite of the order it was built
 * in, which is the fold order (ADR 0016).
 *
 * So the level the commands work on is a **plain value**. It is always current, because
 * there is nothing to flush. The store mirrors it into a signal for the panels to read,
 * and the mirror is allowed to be a frame behind — that is what a signal is for.
 */
export interface LevelDocument {
  /** The level as it now stands. Always current. */
  current(): LevelPlan;
  /** Replaces it, and tells whoever is watching. */
  write(plan: LevelPlan): void;
}

/**
 * Applies commands and returns each one's reverse.
 *
 * **The whole body runs `untracked`.** Applying a command reads the level and writes it,
 * and a reader that stayed subscribed would be re-run by its own write — so `apply` would
 * build a second command, which would push a second undo entry, which would write again.
 * `untrack` is what makes "read the level and change it" a single reaction rather than a
 * loop.
 *
 * **Every command leaves a new level object.** Nothing is mutated in place, so an item
 * sitting on an undo stack cannot be changed by an edit made after it was pushed — which is
 * the failure that makes an undo history wrong in a way nobody can reproduce. It also means
 * a `LoadPlan` command's own array is never the one a later command edits.
 */
export function createCommander(document: LevelDocument) {
  /** The level as it stands, as a command that puts it back. */
  function snapshot(): Command {
    return Command.loadPlan(structuredClone(document.current()));
  }

  /**
   * A fresh plan holding `items`, replacing what is there.
   *
   * A new array every time, for the reason the file header gives.
   */
  const withItems = (items: LevelPlan["items"]): void => {
    document.write({ version: document.current().version, items });
  };

  async function doCommand(command: Command): Promise<Command> {
    return untrack(async () => {
      switch (command.type) {
        case "NoOperation":
          return Command.noOperation();

        case "Sequence": {
          // Applied in order, reversed in reverse order — because reversing a sequence
          // means undoing its last member first, which is the definition of a sequence.
          const reverseCommands = new Array<Command>(command.commands.length);
          for (let i = 0; i < command.commands.length; ++i) {
            reverseCommands[command.commands.length - 1 - i] = await doCommand(
              command.commands[i],
            );
          }
          return Command.sequence(reverseCommands);
        }

        case "AddItem": {
          const items = [...document.current().items];
          const index = command.index ?? items.length;
          items.splice(index, 0, command.item);
          withItems(items);
          return Command.removeItem(index);
        }

        case "RemoveItem": {
          const items = [...document.current().items];
          const item = items[command.index];
          // A no-op rather than a throw: a command read back from a stack written against
          // a longer level would otherwise take the whole history down with it.
          if (item === undefined) return Command.noOperation();
          items.splice(command.index, 1);
          withItems(items);
          return Command.addItem(item, command.index);
        }

        case "SetItem": {
          const items = [...document.current().items];
          const previous = items[command.index];
          if (previous === undefined) return Command.noOperation();
          items[command.index] = command.item;
          withItems(items);
          return Command.setItem(command.index, previous);
        }

        case "ReorderItem": {
          const items = [...document.current().items];
          if (
            command.from === command.to ||
            items[command.from] === undefined ||
            items[command.to] === undefined
          ) {
            return Command.noOperation();
          }
          const [moved] = items.splice(command.from, 1);
          items.splice(command.to, 0, moved);
          withItems(items);
          return Command.reorderItem(command.to, command.from);
        }

        case "LoadPlan": {
          const previous = snapshot();
          // The items are copied rather than adopted, for the reason the header gives.
          document.write({
            version: command.plan.version,
            items: [...command.plan.items],
          });
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
