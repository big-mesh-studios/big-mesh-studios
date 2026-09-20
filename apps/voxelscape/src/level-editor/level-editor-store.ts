import {
  createEffect,
  createMemo,
  createSignal,
  type Accessor,
} from "solid-js";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import {
  isLevelPlan,
  normalizeLevelPlan,
  parseLevelPlan,
} from "../places/plan";
import type { CameraControlsKind } from "./camera/CameraControl";
import { Command } from "./command/Command";
import { createCommander, planItems } from "./command/commander";
import {
  cloneItem,
  cloneShape,
  defaultNpc,
  defaultProp,
  planScript,
  translateItem,
  translateShape,
} from "./structures/plan";
import type { LevelPlan, PlanItem, PlanShape, ToolKind } from "./types";
import { UndoRedoManager } from "./undo-redo";
import { createEnqueue } from "./utils/utils";
import { VOXEL_STONE } from "../world/voxel-store";

/**
 * What the editor edits: the running world's structure plan. The editor keeps a
 * working copy while it is open and writes every change straight back, so the
 * world restamps as shapes are added and moved.
 */
export interface LevelEditorHost {
  /** The plan the world currently uses. */
  plan: Accessor<LevelPlan>;
  /** Replaces the world's plan, restamping the chunks it touches. */
  setPlan(plan: LevelPlan): void;
  /** Which style drives the editor's camera. */
  cameraKind: Accessor<CameraControlsKind>;
  /** Switches the editor between the orbit and no-clip cameras. */
  setCameraKind(kind: CameraControlsKind): void;
}

/**
 * The editor's state: the working plan, what is selected, which tool and block
 * are active, and the undo history over it all. Panels read it through
 * `LevelEditorContext`.
 */
export function createLevelEditor(host: LevelEditorHost) {
  const [plan, setPlan] = createSignal<LevelPlan>(host.plan());
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
      host.setPlan(structures);
    },
  );

  const structures = createMemo(() => plan().structures);
  const items = createMemo(() => planItems(plan()));
  const selectedShape = createMemo(() => {
    const index = selectedIndex();
    const item = index === undefined ? undefined : items()[index];
    return item?.type === "structure" ? item.value : undefined;
  });
  const selectedItem = createMemo(() => {
    const index = selectedIndex();
    return index === undefined ? undefined : items()[index];
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
    if (to < 0 || to >= items().length || index === to) {
      return;
    }
    apply(Command.reorderItem(index, to), "Reorder item");
    setSelectedIndex(to);
  };

  return {
    structures,
    plan,
    items,
    selectedIndex,
    selectedItem,
    selectedShape,
    setSelectedIndex,
    selectShape(index: number | undefined) {
      setSelectedIndex(index);
    },

    tool,
    setTool,
    activeBlockId,
    setActiveBlockId,

    cameraKind: host.cameraKind,
    setCameraKind: host.setCameraKind,

    narrow,
    coarsePointer,
    mobile,
    notice,
    setNotice,

    addShape(shape: PlanShape) {
      const index = items().length;
      apply(
        Command.addItem({ type: "structure", value: shape }, index),
        "Add shape",
      );
      setSelectedIndex(index);
    },
    addNpc(at: [number, number, number]) {
      const index = items().length;
      apply(
        Command.addItem({ type: "npc", value: defaultNpc(at) }, index),
        "Add NPC",
      );
      setSelectedIndex(index);
    },
    addProp(at: [number, number, number]) {
      const index = items().length;
      apply(
        Command.addItem({ type: "prop", value: defaultProp(at) }, index),
        "Add prop",
      );
      setSelectedIndex(index);
    },
    removeItem(index: number) {
      apply(Command.removeItem(index), "Remove item");
      if (selectedIndex() === index) {
        setSelectedIndex(undefined);
      }
    },
    removeShape(index: number) {
      apply(Command.removeItem(index), "Remove item");
      if (selectedIndex() === index) {
        setSelectedIndex(undefined);
      }
    },
    setItem(index: number, item: PlanItem) {
      apply(Command.setItem(index, cloneItem(item)), "Edit item");
    },
    setShape(index: number, shape: PlanShape) {
      apply(
        Command.setItem(index, { type: "structure", value: cloneShape(shape) }),
        "Edit shape",
      );
    },
    moveItem(index: number, delta: [number, number, number]) {
      const item = items()[index];
      if (item === undefined) {
        return;
      }
      apply(Command.setItem(index, translateItem(item, delta)), "Move item");
    },
    moveShape(index: number, delta: [number, number, number]) {
      const item = items()[index];
      if (item?.type !== "structure") {
        return;
      }
      apply(
        Command.setItem(index, {
          type: "structure",
          value: translateShape(item.value, delta),
        }),
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
      return JSON.stringify(plan(), null, 2);
    },

    /** The `onPlan` snippet a place script runs to stamp this plan. */
    script(): string {
      return planScript(plan());
    },

    /** Replaces the plan from JSON text; returns false where it is not a plan. */
    importJson(text: string): boolean {
      const parsed = parseLevelPlan(text);
      if (parsed === null) {
        setNotice("That is not a level plan this world can generate.");
        return false;
      }
      apply(Command.loadPlan(parsed), "Import plan");
      setSelectedIndex(undefined);
      setNotice(
        `Imported ${parsed.structures.length} structure${parsed.structures.length === 1 ? "" : "s"}, ${parsed.npcs.length} NPC${parsed.npcs.length === 1 ? "" : "s"}, ${parsed.props.length} prop${parsed.props.length === 1 ? "" : "s"}.`,
      );
      return true;
    },

    /** Re-reads the world's plan, as when the editor opens or a script reruns. */
    reseed() {
      const current = host.plan();
      if (isLevelPlan(current)) {
        setPlan(normalizeLevelPlan(current));
        setSelectedIndex(undefined);
        undoRedo.clear();
      }
    },
  };
}

export type LevelEditor = ReturnType<typeof createLevelEditor>;
