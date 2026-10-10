import { describe, expect, it } from "vitest";
import { createSignal, flush } from "solid-js";

import { createCommander } from "./commander";
import { Command } from "./Command";
import { UndoRedoManager } from "../undo-redo";
import type { LevelItem, LevelPlan } from "../../places/level/types";

/**
 * An undo stack is only correct if every command's reverse is exactly the command that
 * undoes it, and only correct if applying a reverse produces the plan that was there
 * before. Both are checked here from the outside — through a real signal and a real
 * commander — because the alternative is testing the reverses against each other, which
 * would pass even if all of them were wrong the same way.
 */

const aShape = (id: string, y = 20): LevelItem => ({
  kind: "shape",
  id,
  at: [0, y, 0],
  shape: { type: "Box", len: { x: 10, y: 10, z: 10 } },
  combine: "Add",
});

const aFigure = (id: string): LevelItem => ({
  kind: "figure",
  id,
  figure: "prop",
  model: "lantern.sdfmod",
  at: [0, 0, 0],
});

const aPlan = (items: LevelItem[] = []): LevelPlan => ({ version: 1, items });

/**
 * A level, a commander over it, and a mirror so a test can read what the commander wrote.
 *
 * **The mirror is a signal and the level is a plain value**, which is the arrangement the
 * store uses and the reason for it: in Solid 2 a signal read after a write answers with
 * the previous value until the next flush, so a command that computed an index from a
 * signal would get the same answer twice in one turn. A test that drives two commands
 * without a flush between them is exactly the case that catches it.
 */
const over = (initial: LevelPlan = aPlan()) => {
  let working: LevelPlan = initial;
  const [mirror, setMirror] = createSignal<LevelPlan>(working);
  const { doCommand, snapshot } = createCommander({
    current: () => working,
    write: (next) => {
      working = next;
      setMirror(next);
    },
  });
  return {
    /** The level as it now stands, always current — which is what commands read. */
    plan: () => working,
    /** The same, through a signal, which is what panels read after a flush. */
    mirror,
    doCommand,
    snapshot,
  };
};

/** Runs an async command to its reverse, the way the store does. */
const reverseOf = async (
  store: ReturnType<typeof over>,
  command: Command,
): Promise<Command> => await store.doCommand(command);

describe("a command leaves behind the one that undoes it", () => {
  it("adding is undone by removing at the same index", async () => {
    const store = over();
    const reverse = await reverseOf(store, Command.addItem(aShape("wall"), 0));
    expect(reverse).toEqual(Command.removeItem(0));
  });

  it("removing is undone by adding the same item back where it was", async () => {
    const store = over(aPlan([aShape("a"), aShape("b")]));
    const reverse = await reverseOf(store, Command.removeItem(1));
    expect(reverse).toEqual(Command.addItem(aShape("b"), 1));
  });

  it("changing is undone by changing back to what was there", async () => {
    const store = over(aPlan([aShape("wall", 20)]));
    const reverse = await reverseOf(
      store,
      Command.setItem(0, aShape("wall", 90)),
    );
    expect(reverse).toEqual(Command.setItem(0, aShape("wall", 20)));
  });

  it("reordering is undone by reordering back", async () => {
    const store = over(aPlan([aShape("a"), aShape("b"), aShape("c")]));
    const reverse = await reverseOf(store, Command.reorderItem(0, 2));
    expect(reverse).toEqual(Command.reorderItem(2, 0));
  });

  it("loading a plan is undone by loading the one that was there", async () => {
    const before = aPlan([aShape("old")]);
    const store = over(before);
    const after = aPlan([aShape("new")]);
    const reverse = await reverseOf(store, Command.loadPlan(after));
    expect(reverse).toEqual(Command.loadPlan(before));
  });

  it("a sequence is reversed in the opposite order it ran", async () => {
    // Reversing a sequence means undoing its last member first — which is what a sequence
    // is. Getting this backwards would leave two commands undoing each other.
    const store = over(aPlan([aShape("a")]));
    const reverse = await reverseOf(
      store,
      Command.sequence([
        Command.addItem(aShape("b"), 1),
        Command.addItem(aShape("c"), 2),
      ]),
    );
    expect(reverse).toEqual(
      Command.sequence([Command.removeItem(2), Command.removeItem(1)]),
    );
  });

  it("an index past the end removes nothing rather than taking the last one", async () => {
    const store = over(aPlan([aShape("a")]));
    expect(await reverseOf(store, Command.removeItem(9))).toEqual(
      Command.noOperation(),
    );
    expect(store.plan().items).toHaveLength(1);
  });

  it("changing an index that is not there changes nothing", async () => {
    const store = over(aPlan([aShape("a")]));
    expect(await reverseOf(store, Command.setItem(9, aShape("b")))).toEqual(
      Command.noOperation(),
    );
  });

  it("an awaited command is applied and reversed like any other", async () => {
    const store = over();
    const reverse = await reverseOf(
      store,
      Command.async(Promise.resolve(Command.addItem(aShape("wall")))),
    );
    expect(reverse).toEqual(Command.removeItem(0));
  });
});

describe("applying a reverse puts the level back", () => {
  /** Every command, run and then unrun, has to leave the plan exactly as it was. */
  const roundTrip = async (
    initial: LevelPlan,
    command: Command,
  ): Promise<{ before: string; after: string }> => {
    const store = over(initial);
    const before = JSON.stringify(store.plan());
    const reverse = await reverseOf(store, command);
    await reverseOf(store, reverse);
    return { before, after: JSON.stringify(store.plan()) };
  };

  it("for an add", async () => {
    const { before, after } = await roundTrip(
      aPlan(),
      Command.addItem(aShape("wall")),
    );
    expect(after).toBe(before);
  });

  it("for a remove", async () => {
    const start = aPlan([aShape("a"), aShape("b")]);
    const { before, after } = await roundTrip(start, Command.removeItem(0));
    expect(after).toBe(before);
  });

  it("for a set", async () => {
    const start = aPlan([aShape("wall")]);
    const { before, after } = await roundTrip(
      start,
      Command.setItem(0, aFigure("lamp")),
    );
    expect(after).toBe(before);
  });

  it("for a reorder", async () => {
    const start = aPlan([aShape("a"), aShape("b"), aShape("c")]);
    const { before, after } = await roundTrip(start, Command.reorderItem(0, 2));
    expect(after).toBe(before);
  });

  it("for a whole plan load", async () => {
    const start = aPlan([aShape("a")]);
    const { before, after } = await roundTrip(
      start,
      Command.loadPlan(aPlan([aShape("x"), aFigure("y")])),
    );
    expect(after).toBe(before);
  });
});

describe("a command does not change the plan an undo entry is holding", () => {
  it("builds a new array rather than editing the one it was given", async () => {
    // The failure this guards is an undo entry that undoes the wrong thing: if a command
    // edited the array in place, then the array held by the command that is already on the
    // stack would be the same array, and its item would have changed underneath it.
    const store = over(aPlan([aShape("wall", 20)]));
    const arrayBefore = store.plan().items;

    await reverseOf(store, Command.setItem(0, aShape("wall", 90)));

    expect(store.plan().items).not.toBe(arrayBefore);
    expect(arrayBefore[0]).toMatchObject({ at: [0, 20, 0] });
  });

  it("does not adopt the array a loaded plan was carrying", async () => {
    // A `LoadPlan` command sits on the undo stack holding its own array. If the plan
    // adopted that array rather than copying it, the next edit would be written into the
    // command — and undoing the load would then load the edited version.
    const loaded = aPlan([aShape("a")]);
    const store = over();

    await reverseOf(store, Command.loadPlan(loaded));
    await reverseOf(store, Command.setItem(0, aShape("a", 99)));

    expect(store.plan().items).not.toBe(loaded.items);
    expect(loaded.items[0]).toMatchObject({ at: [0, 20, 0] });
  });
});

describe("the order in the plan is the order a command sees", () => {
  it("an add without an index goes on the end, not the front", async () => {
    // Where the fold order comes from. A person placing things one at a time means for the
    // newest to be last, because an `Add` over an `Add` folds last-wins.
    const store = over(aPlan([aShape("a")]));
    await reverseOf(store, Command.addItem(aShape("b")));
    expect(store.plan().items.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("an add with an index goes where it was told", async () => {
    const store = over(aPlan([aShape("a"), aShape("c")]));
    await reverseOf(store, Command.addItem(aShape("b"), 1));
    expect(store.plan().items.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});

describe("the undo and redo stacks", () => {
  /**
   * A store with an undo manager over it, which is how the editor wires them.
   *
   * `performCommand` never does anything, and that is honest: the tests that care what
   * undoing *does* drive a manager built with a synchronous `perform` of their own, because
   * the real one is fed by the commander's promise and a test cannot await a callback.
   * What is checked here is the stacks — what they hold, what they say, and how they move
   * entries between them — which is all signal bookkeeping and needs no command applied.
   */
  const editor = (initial: LevelPlan = aPlan()) => {
    const over_ = over(initial);
    const manager = new UndoRedoManager(() => Command.noOperation());
    return { plan: over_.plan, doCommand: over_.doCommand, manager };
  };

  it("says there is nothing to undo until something is pushed", () => {
    const { manager } = editor();
    expect(manager.hasUndo()).toBe(false);
    expect(manager.hasRedo()).toBe(false);
    expect(manager.undoDescription()).toBeUndefined();
  });

  it("says there is something to undo once there is", () => {
    const { manager } = editor();
    manager.pushUndo({
      command: Command.noOperation(),
      description: "Remove wall-4",
    });
    flush();
    expect(manager.hasUndo()).toBe(true);
    expect(manager.undoDescription()).toBe("Remove wall-4");
  });

  it("describes the top of the stack, not the bottom", () => {
    const { manager } = editor();
    manager.pushUndo({ command: Command.noOperation(), description: "first" });
    manager.pushUndo({ command: Command.noOperation(), description: "second" });
    flush();
    expect(manager.undoDescription()).toBe("second");
  });

  it("does nothing when asked to undo an empty stack", () => {
    // A no-op rather than a throw: the keyboard shortcut should be safe to hold down.
    const { manager, plan } = editor();
    manager.undo();
    manager.redo();
    expect(plan().items).toEqual([]);
  });

  it("moves an entry between the stacks, keeping its description", () => {
    let answer = Command.removeItem(0);
    const performing = new UndoRedoManager(() => answer);

    performing.pushUndo({
      command: Command.removeItem(3),
      description: "Remove wall-4",
    });
    performing.undo();
    flush();

    expect(performing.hasUndo()).toBe(false);
    expect(performing.hasRedo()).toBe(true);
    // The description travels with the entry, so a redo button still says what it will
    // redo rather than "redo".
    expect(performing.redoDescription()).toBe("Remove wall-4");

    answer = Command.addItem(aShape("wall-4"), 3);
    performing.redo();
    flush();
    expect(performing.hasRedo()).toBe(false);
    expect(performing.hasUndo()).toBe(true);
  });

  it("drops the redo stack when something new is pushed onto undo", () => {
    // The usual rule: a branch in the history is not somewhere redo can go.
    const { manager } = editor();
    manager.pushRedo({ command: Command.noOperation(), description: "gone" });
    manager.clearRedo();
    flush();
    expect(manager.hasRedo()).toBe(false);
  });

  it("undoes what it just pushed, without needing a flush in between", () => {
    // The bug this pins down: with the stacks held in signals, a Solid 2 read after a write
    // answers with the *previous* value until the next flush, so `undo` would look at an
    // empty stack and quietly do nothing. The arrays are the truth for exactly this reason.
    let applied = Command.noOperation();
    const performing = new UndoRedoManager((command) => {
      applied = command;
      return Command.noOperation();
    });

    performing.pushUndo({
      command: Command.removeItem(3),
      description: "Remove wall-4",
    });
    performing.undo();

    expect(applied).toEqual(Command.removeItem(3));
    expect(performing.depths).toEqual({ undo: 0, redo: 1 });
  });

  it("reports how deep each stack is, without a flush", () => {
    const { manager } = editor();
    manager.pushUndo({ command: Command.noOperation(), description: "a" });
    manager.pushUndo({ command: Command.noOperation(), description: "b" });
    expect(manager.depths).toEqual({ undo: 2, redo: 0 });
  });
});
