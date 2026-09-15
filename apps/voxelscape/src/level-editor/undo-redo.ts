import { createMemo, createSignal, type Accessor, type Signal } from "solid-js";
import { Command } from "./command/Command";

export interface CommandEntry {
  command: Command;
  description: string;
}

/**
 * The undo and redo stacks, each entry holding the command that reverses the
 * change it undid, so applying an entry is itself reversible.
 */
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
   * @param restoredUndoStack the history the level was saved with, and likewise
   * `restoredRedoStack`. They are read rather than given outright because the
   * level is loaded asynchronously; a stack works its first value out from one
   * of these and can still be set afterwards.
   */
  constructor(
    performCommand: (command: Command) => Command,
    restoredUndoStack: Accessor<CommandEntry[]> = () => [],
    restoredRedoStack: Accessor<CommandEntry[]> = () => [],
  ) {
    this._performCommand = performCommand;
    this._undoStack = createSignal(restoredUndoStack);
    this._redoStack = createSignal(restoredRedoStack);

    this._hasUndo = createMemo(() => this._undoStack[0]().length !== 0);
    this._hasRedo = createMemo(() => this._redoStack[0]().length !== 0);
    this._undoDescription = createMemo(
      () => this._undoStack[0]().at(-1)?.description,
    );
    this._redoDescription = createMemo(
      () => this._redoStack[0]().at(-1)?.description,
    );
  }

  clear(): void {
    this._undoStack[1]([]);
    this._redoStack[1]([]);
  }

  clearRedo(): void {
    this._redoStack[1]([]);
  }

  pushUndo(entry: CommandEntry): void {
    this._undoStack[1]((stack) => [...stack, entry]);
  }

  pushRedo(entry: CommandEntry): void {
    this._redoStack[1]((stack) => [...stack, entry]);
  }

  undo(): void {
    const stack = this._undoStack[0]();
    const entry = stack.at(-1);
    if (entry === undefined) {
      return;
    }
    const reverseCommand = this._performCommand(entry.command);
    this._undoStack[1](stack.slice(0, -1));
    this._redoStack[1]((redoStack) => [
      ...redoStack,
      { command: reverseCommand, description: entry.description },
    ]);
  }

  redo(): void {
    const stack = this._redoStack[0]();
    const entry = stack.at(-1);
    if (entry === undefined) {
      return;
    }
    const reverseCommand = this._performCommand(entry.command);
    this._redoStack[1](stack.slice(0, -1));
    this._undoStack[1]((undoStack) => [
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
