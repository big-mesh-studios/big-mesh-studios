// @vitest-environment jsdom
import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import type { PlanShape, StructurePlan } from "./types";
import { createLevelEditor } from "./level-editor-store";

// jsdom does not implement `matchMedia`, which the store's narrow-layout query
// calls. A query that never matches is enough here.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

/** Lets the enqueued commands and their microtasks settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeEditor = () =>
  createRoot((dispose) => {
    const [plan, setPlan] = createSignal<StructurePlan>([]);
    const editor = createLevelEditor({
      structures: plan,
      setStructures: setPlan,
    });
    return { editor, plan, dispose };
  });

const box: PlanShape = {
  kind: "box",
  min: [0, 0, 0],
  max: [1, 1, 1],
  id: 1,
};

describe("createLevelEditor", () => {
  it("adds a shape, then undoes and redoes it", async () => {
    const { editor, plan, dispose } = makeEditor();

    editor.addShape(box);
    await settle();
    expect(editor.structures()).toHaveLength(1);
    expect(editor.selectedIndex()).toBe(0);
    expect(editor.hasUndo()).toBe(true);
    // The change reached the host world's plan.
    expect(plan()).toHaveLength(1);

    editor.undo();
    await settle();
    expect(editor.structures()).toHaveLength(0);
    expect(editor.hasRedo()).toBe(true);

    editor.redo();
    await settle();
    expect(editor.structures()).toHaveLength(1);

    dispose();
  });

  it("moves a shape by a delta", async () => {
    const { editor, dispose } = makeEditor();
    editor.addShape(box);
    await settle();
    editor.moveShape(0, [0, 4, 0]);
    await settle();
    const moved = editor.structures()[0];
    expect(moved.kind).toBe("box");
    if (moved.kind === "box") {
      expect(moved.min).toEqual([0, 4, 0]);
      expect(moved.max).toEqual([1, 5, 1]);
    }
    dispose();
  });

  it("refuses JSON that is not a plan and keeps the current one", async () => {
    const { editor, dispose } = makeEditor();
    editor.addShape(box);
    await settle();

    expect(editor.importJson("not a plan")).toBe(false);
    await settle();
    expect(editor.notice()).toBeDefined();
    expect(editor.structures()).toHaveLength(1);

    expect(editor.importJson(JSON.stringify([box]))).toBe(true);
    await settle();
    expect(editor.structures()).toHaveLength(1);
    dispose();
  });

  it("exports a plan and an onPlan snippet", async () => {
    const { editor, dispose } = makeEditor();
    editor.addShape(box);
    await settle();
    expect(JSON.parse(editor.exportJson())).toEqual([box]);
    expect(editor.script()).toContain("onPlan(");
    dispose();
  });
});
