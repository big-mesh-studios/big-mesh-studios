import {
  createEffect,
  createMemo,
  createSignal,
  type Accessor,
} from "solid-js";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import { isStructurePlan, parseStructurePlan } from "../places/plan";
import { Command } from "./command/Command";
import { createCommander } from "./command/commander";
import { cloneShape, planScript, translateShape } from "./structures/plan";
import type { PlanShape, StructurePlan, ToolKind } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { createEnqueue } from "./utils/utils";
import { VOXEL_STONE } from "../world/voxel-store";

/**
 * What the editor edits: the running world's structure plan. The editor keeps a
 * working copy while it is open and writes every change straight back, so the
 * world restamps as shapes are added and moved.
 */
export interface LevelEditorHost {
  /** The plan the world currently stamps. */
  structures: Accessor<StructurePlan>;
  /** Replaces the world's plan, restamping the chunks it touches. */
  setStructures(plan: StructurePlan): void;
}

/**
 * The editor's state: the working plan, what is selected, which tool and block
 * are active, and the undo history over it all. Panels read it through
 * `LevelEditorContext`.
 */
export function createLevelEditor(host: LevelEditorHost) {
  const [plan, setPlan] = createSignal<StructurePlan>(host.structures());
  const [selectedIndex, setSelectedIndex] = createSignal<number | undefined>(
    undefined,
  );
  const [tool, setTool] = createSignal<ToolKind>("select");
  const [activeBlockId, setActiveBlockId] = createSignal(VOXEL_STONE);
  const [notice, setNotice] = createSignal<string | undefined>(undefined);
  const narrow = createMediaQuery("(max-width: 720px)");
  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  /** Whether the panels go in a sheet below the canvas rather than beside it. */
  const mobile = createMemo(() => narrow() || coarsePointer());

  // Every change to the working plan reaches the world; `setStructures` diffs
  // by value, so an unchanged plan costs nothing.
  createEffect(
    () => plan(),
    (structures) => {
      host.setStructures(structures);
    },
  );

  const structures = createMemo(() => plan());
  const selectedShape = createMemo(() => {
    const index = selectedIndex();
    return index === undefined ? undefined : structures()[index];
  });

  const { doCommand } = createCommander({ plan, setPlan });

  const enqueue = createEnqueue<Command>();
  const perform = (command: Command): Command =>
    Command.async(
      enqueue(async () => {
        return doCommand(command);
      }),
    );

  const undoRedo = new UndoRedoManager(perform);

  const apply = (command: Command, description: string): Command => {
    const reverse = perform(command);
    undoRedo.pushUndo({ command: reverse, description });
    undoRedo.clearRedo();
    return reverse;
  };

  const reorderShape = (index: number, to: number) => {
    if (to < 0 || to >= structures().length || index === to) {
      return;
    }
    apply(Command.reorderShape(index, to), "Reorder shape");
    setSelectedIndex(to);
  };

  return {
    structures,
    selectedIndex,
    selectedShape,
    setSelectedIndex,
    selectShape(index: number | undefined) {
      setSelectedIndex(index);
    },

    tool,
    setTool,
    activeBlockId,
    setActiveBlockId,

    narrow,
    coarsePointer,
    mobile,
    notice,
    setNotice,

    addShape(shape: PlanShape) {
      const index = structures().length;
      apply(Command.addShape(shape, index), "Add shape");
      setSelectedIndex(index);
    },
    removeShape(index: number) {
      apply(Command.removeShape(index), "Remove shape");
      if (selectedIndex() === index) {
        setSelectedIndex(undefined);
      }
    },
    setShape(index: number, shape: PlanShape) {
      apply(Command.setShape(index, cloneShape(shape)), "Edit shape");
    },
    moveShape(index: number, delta: [number, number, number]) {
      const shape = structures()[index];
      if (shape === undefined) {
        return;
      }
      apply(
        Command.setShape(index, translateShape(shape, delta)),
        "Move shape",
      );
    },
    moveShapeUp(index: number) {
      reorderShape(index, index - 1);
    },
    moveShapeDown(index: number) {
      reorderShape(index, index + 1);
    },

    undo() {
      undoRedo.undo();
    },
    redo() {
      undoRedo.redo();
    },
    get hasUndo(): Accessor<boolean> {
      return undoRedo.hasUndo;
    },
    get hasRedo(): Accessor<boolean> {
      return undoRedo.hasRedo;
    },
    get undoDescription(): Accessor<string | undefined> {
      return undoRedo.undoDescription;
    },
    get redoDescription(): Accessor<string | undefined> {
      return undoRedo.redoDescription;
    },

    /** The plan as pretty JSON, ready to save to a file. */
    exportJson(): string {
      return JSON.stringify(structures(), null, 2);
    },

    /** The `onPlan` snippet a place script runs to stamp this plan. */
    script(): string {
      return planScript(structures());
    },

    /** Replaces the plan from JSON text; returns false where it is not a plan. */
    importJson(text: string): boolean {
      const parsed = parseStructurePlan(text);
      if (parsed === null) {
        setNotice("That is not a structure plan this world can generate.");
        return false;
      }
      apply(Command.loadPlan(parsed), "Import plan");
      setSelectedIndex(undefined);
      setNotice(
        `Imported ${parsed.length} shape${parsed.length === 1 ? "" : "s"}.`,
      );
      return true;
    },

    /** Re-reads the world's plan, as when the editor opens or a script reruns. */
    reseed() {
      const current = host.structures();
      if (isStructurePlan(current)) {
        setPlan(current);
        setSelectedIndex(undefined);
        undoRedo.clear();
      }
    },
  };
}

export type LevelEditor = ReturnType<typeof createLevelEditor>;
