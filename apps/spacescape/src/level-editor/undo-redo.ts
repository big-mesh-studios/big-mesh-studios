/**
 * The undo and redo stacks, each entry holding the command that reverses the change it
 * made, so applying an entry is itself reversible.
 *
 * ## Why the stacks are plain arrays and not signals
 *
 * Ported from voxelscape's level editor, which keeps both stacks in signals — and which
 * gets away with it because everything that reaches its manager goes through an async
 * queue, so a signal write has always been flushed by the time the next read happens.
 *
 * That is luck, not a property, and this manager does not need it. **In Solid 2 a signal
 * read after a write answers with the previous value until the next flush** — `untrack`
 * makes no difference — so a synchronous `pushUndo` followed by an `undo` would read a
 * stack that does not have the entry in it, and the undo would do nothing. It is the same
 * class of bug the rest of this repository documents about setters
 * (`create-place-editor.test.ts`), and worse here because the symptom is a button that
 * silently does nothing rather than a value that is briefly stale.
 *
 * So the arrays are the truth and the signal is only the *notification* the UI subscribes
 * to. Every read the manager makes for its own decisions is a plain array read, which is
 * always current.
 *
 * ## The stacks still react
 *
 * The four accessors below are memos that read the version signal before reading an array.
 * A memo reading only an array would compute once and never again, so that read is not
 * decoration — it is the dependency that makes the toolbar's undo button enable itself.
 *
 * ## `description` is on the entry rather than computed from the command
 *
 * A command knows what it does; only the thing that issued it knows what to *call* that.
 * "Remove item" is a worse tooltip than "Remove wall-4", and only the caller has the words
 * "wall-4".
 */

import { createMemo, createSignal, type Accessor, type Setter } from "solid-js";

import { Command } from "./command/Command";

export interface CommandEntry {
  /** The command that reverses the change this entry made. */
  command: Command;
  /** What to say about it, for a button's title. */
  description: string;
}

export class UndoRedoManager {
  private undoStack: CommandEntry[] = [];
  private redoStack: CommandEntry[] = [];

  /** Bumped whenever either stack changes. See the file header for why this is not the stack. */
  private readonly version: Accessor<number>;
  private readonly bump: Setter<number>;

  private readonly _hasUndo: Accessor<boolean>;
  private readonly _hasRedo: Accessor<boolean>;
  private readonly _undoDescription: Accessor<string | undefined>;
  private readonly _redoDescription: Accessor<string | undefined>;

  constructor(private readonly performCommand: (command: Command) => Command) {
    const [version, bump] = createSignal(0);
    this.version = version;
    this.bump = bump;

    const watches = <T>(read: () => T): Accessor<T> =>
      createMemo(() => {
        this.version();
        return read();
      });

    this._hasUndo = watches(() => this.undoStack.length !== 0);
    this._hasRedo = watches(() => this.redoStack.length !== 0);
    this._undoDescription = watches(() => this.undoStack.at(-1)?.description);
    this._redoDescription = watches(() => this.redoStack.at(-1)?.description);
  }

  get hasUndo(): Accessor<boolean> {
    return this._hasUndo;
  }

  get hasRedo(): Accessor<boolean> {
    return this._hasRedo;
  }

  get undoDescription(): Accessor<string | undefined> {
    return this._undoDescription;
  }

  get redoDescription(): Accessor<string | undefined> {
    return this._redoDescription;
  }

  /** Both stacks empty. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.bump(this.version() + 1);
  }

  /** The redo stack empty, which is what a new edit on top of one does. */
  clearRedo(): void {
    this.redoStack = [];
    this.bump(this.version() + 1);
  }

  pushUndo(entry: CommandEntry): void {
    this.undoStack = [...this.undoStack, entry];
    this.bump(this.version() + 1);
  }

  pushRedo(entry: CommandEntry): void {
    this.redoStack = [...this.redoStack, entry];
    this.bump(this.version() + 1);
  }

  /**
   * Applies the top entry's reverse, and moves what that produced onto the redo stack.
   *
   * **The entry's own description travels with it**, so undoing and redoing a thing are
   * both labelled by what the thing was rather than by which direction the button was.
   *
   * A no-op on an empty stack, rather than a throw: the keyboard shortcut should be safe
   * to hold down.
   */
  undo(): void {
    const entry = this.undoStack.at(-1);
    if (entry === undefined) return;
    const reverse = this.performCommand(entry.command);
    this.undoStack = this.undoStack.slice(0, -1);
    this.redoStack = [
      ...this.redoStack,
      { command: reverse, description: entry.description },
    ];
    this.bump(this.version() + 1);
  }

  redo(): void {
    const entry = this.redoStack.at(-1);
    if (entry === undefined) return;
    const reverse = this.performCommand(entry.command);
    this.redoStack = this.redoStack.slice(0, -1);
    this.undoStack = [
      ...this.undoStack,
      { command: reverse, description: entry.description },
    ];
    this.bump(this.version() + 1);
  }

  /** How many steps each way, for a readout. */
  get depths(): { undo: number; redo: number } {
    return { undo: this.undoStack.length, redo: this.redoStack.length };
  }
}
