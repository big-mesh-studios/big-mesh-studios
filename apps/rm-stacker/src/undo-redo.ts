import { Accessor, createSignal, Signal } from "solid-js";
import { Command } from "./command/Command";

export class UndoRedoManager {
  private _undoStack: { command: Command; description: string }[] = [];
  private _redoStack: { command: Command; description: string }[] = [];
  private _hasUndo: Signal<boolean> = createSignal(false);
  private _hasRedo: Signal<boolean> = createSignal(false);
  private _undoDescription: Signal<string | undefined> = createSignal();
  private _redoDescription: Signal<string | undefined> = createSignal();
  private _performCommand: (command: Command) => Command;

  get hasUndo(): Accessor<boolean> {
    return this._hasUndo[0];
  }

  get hasRedo(): Accessor<boolean> {
    return this._hasRedo[0];
  }

  get undoDescription(): Accessor<string | undefined> {
    return this._undoDescription[0];
  }

  get redoDescription(): Accessor<string | undefined> {
    return this._redoDescription[0];
  }

  constructor(performCommand: (command: Command) => Command) {
    this._performCommand = performCommand;
  }

  clear() {
    this._undoStack.length = 0;
    this._redoStack.length = 0;
    this._hasUndo[1](false);
    this._hasRedo[1](false);
    this._undoDescription[1](undefined);
    this._redoDescription[1](undefined);
  }

  clearRedo() {
    this._redoStack.splice(0, this._redoStack.length);
    this._hasRedo[1](false);
    this._redoDescription[1](undefined);
  }

  pushUndo(undo: { command: Command; description: string }) {
    this._undoStack.push(undo);
    this._hasUndo[1](this._undoStack.length !== 0);
    this._undoDescription[1](undo.description);
  }

  pushRedo(redo: { command: Command; description: string }) {
    this._redoStack.push(redo);
    this._hasRedo[1](this._redoStack.length !== 0);
    this._redoDescription[1](redo.description);
  }

  undo() {
    let command = this._undoStack.pop();
    if (command === undefined) {
      return;
    }
    let command2 = this._performCommand(command.command);
    this._redoStack.push({ command: command2, description: command.description });
    this._hasUndo[1](this._undoStack.length !== 0);
    this._hasRedo[1](this._redoStack.length !== 0);
    this._undoDescription[1](this._undoStack?.[0]?.description);
    this._redoDescription[1](this._redoStack?.[0]?.description);
  }

  redo() {
    let command = this._redoStack.pop();
    if (command === undefined) {
      return;
    }
    let command2 = this._performCommand(command.command);
    this._undoStack.push({ command: command2, description: command.description });
    this._hasUndo[1](this._undoStack.length !== 0);
    this._hasRedo[1](this._redoStack.length !== 0);
    this._undoDescription[1](this._undoStack?.[0]?.description);
    this._redoDescription[1](this._redoStack?.[0]?.description);
  }

  getStacks(): {
    undoStack: { command: Command; description: string }[];
    redoStack: { command: Command; description: string }[];
  } {
    return {
      undoStack: this._undoStack,
      redoStack: this._redoStack,
    };
  }

  setStacks(params: {
    undoStack: { command: Command; description: string }[];
    redoStack: { command: Command; description: string }[];
  }) {
    this._undoStack = params.undoStack;
    this._redoStack = params.redoStack;
    this._hasUndo[1](this._undoStack.length !== 0);
    this._hasRedo[1](this._redoStack.length !== 0);
    this._undoDescription[1](this._undoStack?.[0]?.description);
    this._redoDescription[1](this._redoStack?.[0]?.description);
  }
}
