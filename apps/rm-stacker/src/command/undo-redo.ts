import { Accessor, createMemo, createSignal, Signal } from "solid-js";
import { Command } from "./Command";

export interface CommandEntry {
  command: Command;
  description: string;
}

export class UndoRedoManager {
  private _undoStack: Signal<CommandEntry[]>;
  private _redoStack: Signal<CommandEntry[]>;
  private _hasUndo: Accessor<boolean>;
  private _hasRedo: Accessor<boolean>;
  private _undoDescription: Accessor<string | undefined>;
  private _redoDescription: Accessor<string | undefined>;
  private _performCommand: (command: Command) => Command;

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

  /**
   * @param restoredUndoStack the history the model was saved with, and likewise
   * `restoredRedoStack`. They are read rather than given outright because the
   * model they belong to is read from a database and so arrives later than this
   * does. A stack works its first value out from one of these and can still be
   * set afterwards, which is how a history both starts where it was left and
   * goes on growing.
   */
  constructor(
    performCommand: (command: Command) => Command,
    restoredUndoStack: Accessor<CommandEntry[]> = () => [],
    restoredRedoStack: Accessor<CommandEntry[]> = () => [],
  ) {
    this._performCommand = performCommand;
    this._undoStack = createSignal(restoredUndoStack);
    this._redoStack = createSignal(restoredRedoStack);

    // What can be undone, and what it is called, follow from the stacks rather
    // than being kept in step with them by hand. The next thing to be undone is
    // the last one pushed, which is the end of the stack.
    this._hasUndo = createMemo(() => this._undoStack[0]().length !== 0);
    this._hasRedo = createMemo(() => this._redoStack[0]().length !== 0);
    this._undoDescription = createMemo(() => this._undoStack[0]().at(-1)?.description);
    this._redoDescription = createMemo(() => this._redoStack[0]().at(-1)?.description);
  }

  clear() {
    this._undoStack[1]([]);
    this._redoStack[1]([]);
  }

  clearRedo() {
    this._redoStack[1]([]);
  }

  pushUndo(undo: CommandEntry) {
    this._undoStack[1](stack => [...stack, undo]);
  }

  pushRedo(redo: CommandEntry) {
    this._redoStack[1](stack => [...stack, redo]);
  }

  undo() {
    const stack = this._undoStack[0]();
    const entry = stack.at(-1);

    if (entry === undefined) {
      return;
    }

    const reverseCommand = this._performCommand(entry.command);

    this._undoStack[1](stack.slice(0, -1));
    this._redoStack[1](redoStack => [
      ...redoStack,
      { command: reverseCommand, description: entry.description },
    ]);
  }

  redo() {
    const stack = this._redoStack[0]();
    const entry = stack.at(-1);

    if (entry === undefined) {
      return;
    }

    const reverseCommand = this._performCommand(entry.command);

    this._redoStack[1](stack.slice(0, -1));
    this._undoStack[1](undoStack => [
      ...undoStack,
      { command: reverseCommand, description: entry.description },
    ]);
  }

  getStacks(): { undoStack: CommandEntry[]; redoStack: CommandEntry[] } {
    return {
      undoStack: this._undoStack[0](),
      redoStack: this._redoStack[0](),
    };
  }
}
