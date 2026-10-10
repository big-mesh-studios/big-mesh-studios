// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";

import {
  createLevelEditor,
  type CameraControlsKind,
  type LevelEditorHost,
} from "./level-editor-store";
import { createEnqueue, tryCatch } from "./utils";
import {
  LEVEL_PLACE,
  type LevelItem,
  type LevelPlan,
} from "../places/level/types";

/**
 * The store is what the panels talk to, so what is checked here is what a person would
 * notice: that a click puts a thing where they clicked, that an edit is one undo step, and
 * that a file they opened by mistake changes nothing.
 *
 * **Every test flushes.** A setter's value lands after a microtask, so a memo read
 * straight after a write still answers with the previous one — the same trap
 * `create-place-editor.test.ts` exists to pin down.
 */

const EMPTY: LevelPlan = { version: 1, items: [] };

/**
 * jsdom has no `matchMedia`, and the store asks one whether this is a phone.
 *
 * **A never-matching stub rather than a real one**, so the desktop path is what these tests
 * exercise; the sheet is the phone path and is not what is under test here.
 */
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

/**
 * A store over a fake world, recording every level the store wrote back.
 *
 * **The fake is where the "writes through" assertions come from.** The store's job is to
 * edit a copy and hand every version to the world; if that stopped happening the panels
 * would still look right and the world would not move.
 */
const editorOver = (initial: LevelPlan = EMPTY) => {
  const written: LevelPlan[] = [];
  let cameraKind: CameraControlsKind = "orbit";
  return createRoot(() => {
    const host: LevelEditorHost = {
      level: () => initial,
      setLevel: (plan) => written.push(plan),
      cameraKind: () => cameraKind,
      setCameraKind: (kind) => {
        cameraKind = kind;
      },
    };
    const editor = createLevelEditor(host);
    return { editor, written, cameraKind: () => cameraKind };
  });
};

/**
 * `addShapeAt` takes the tool's current choices rather than reading a signal that may not
 * have flushed yet — see the store. Defaults to the toolbar's starting state.
 *
 * **It returns nothing, on purpose.** Where the shape lands is decided inside the queue,
 * after the edits ahead of it have settled, so there is no index to hand back. The two
 * tests that used to check the returned index now check the level itself.
 */
const place = (
  editor: ReturnType<typeof editorOver>["editor"],
  at: readonly [number, number, number],
  kind: "Box" | "Sphere" | "Cylinder" = "Box",
  how: "Add" | "Subtract" | "Paint" = "Add",
): void => editor.addShapeAt(at, kind, how);

/** The enqueue the store uses, run to completion, for a store whose commands are async. */
const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

describe("the editor over a world", () => {
  it("starts from the level the world has", () => {
    const { editor } = editorOver({
      version: 1,
      items: [
        {
          kind: "shape",
          id: "floor",
          at: [0, 0, 0],
          shape: { type: "Box", len: { x: 10, y: 2, z: 10 } },
          combine: "Add",
        },
      ],
    });
    expect(editor.items()).toHaveLength(1);
    expect(editor.selectedIndex()).toBeUndefined();
  });

  it("writes every change back to the world", async () => {
    const { editor, written } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    flush();
    // Once to begin with, once for the edit. What matters is that the world is told.
    expect(written.length).toBeGreaterThan(1);
    expect(written.at(-1)?.items).toHaveLength(1);
  });

  it("hands the world a new level object each time rather than editing one", async () => {
    const { editor, written } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    flush();
    place(editor, [0, 20, 0]);
    await settle();
    flush();
    expect(written.at(-1)).not.toBe(written.at(-2));
  });
});

describe("placing something", () => {
  it("puts a shape of the current kind at the point it was given", async () => {
    const { editor } = editorOver();
    place(editor, [12, 30, -8], "Sphere");
    await settle();

    expect(editor.items()[0]).toMatchObject({
      kind: "shape",
      at: [12, 30, -8],
      shape: { type: "Sphere" },
    });
  });

  it("selects what it just placed, so the inspector has something to show", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0], "Sphere");
    await settle();
    flush();
    expect(editor.selectedIndex()).toBe(0);
    expect(editor.selectedShape()?.id).toBe("shape-Sphere-0-10-0");
  });

  it("names items so a file says what is where", async () => {
    const { editor } = editorOver();
    place(editor, [4, 20, 8]);
    await settle();
    // A counter would say `shape-1`, which means nothing in six months.
    expect(editor.items()[0].id).toBe("shape-Box-4-20-8");
  });

  it("gives a paint a colour to go with it, because it is the only combine that shows one", async () => {
    const { editor } = editorOver();
    place(editor, [0, 0, 0], "Box", "Paint");
    await settle();
    flush();
    expect((editor.items()[0] as { colour?: unknown }).colour).toBeDefined();
  });

  it("stands a figure up and selects it", async () => {
    const { editor } = editorOver();
    editor.addFigureAt({
      kind: "figure",
      id: "",
      figure: "npc",
      model: "chef.sdfmod",
      at: [5, 0, 5],
      name: "Ada",
    });
    await settle();
    expect(editor.selectedFigure()).toMatchObject({
      figure: "npc",
      name: "Ada",
    });
  });

  it("leaves the next item on the end, because the order is the fold order", async () => {
    const { editor } = editorOver();
    place(editor, [0, 0, 0]);
    place(editor, [0, 50, 0]);
    await settle();
    flush();
    expect(editor.items().map((item) => item.id)).toEqual([
      "shape-Box-0-0-0",
      "shape-Box-0-50-0",
    ]);
  });
});

describe("choosing and changing", () => {
  it("finds an item by id, which is what a click in the world knows", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    flush();
    editor.selectById(undefined);
    flush();
    expect(editor.selectedIndex()).toBeUndefined();
    editor.selectById("shape-Box-0-10-0");
    flush();
    expect(editor.selectedIndex()).toBe(0);
    editor.selectById("not-a-thing");
    flush();
    expect(editor.selectedIndex()).toBeUndefined();
  });

  it("changes one item and says so in the tooltip by name", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();

    const current = editor.selectedShape()!;
    editor.updateItem(0, { ...current, at: [0, 99, 0] });
    await settle();

    expect(editor.items()[0]).toMatchObject({ at: [0, 99, 0] });
    expect(editor.undoDescription()).toBe("Change shape-Box-0-10-0");
  });

  it("does nothing when told to change an item that is not there", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    const before = editor.undoDescription();
    editor.updateItem(9, {
      kind: "shape",
      id: "ghost",
      at: [0, 0, 0],
      shape: { type: "Sphere", radius: 1 },
      combine: "Add",
    });
    await settle();
    expect(editor.items()).toHaveLength(1);
    expect(editor.undoDescription()).toBe(before);
  });

  it("moves an item to another position and follows the selection with it", async () => {
    const { editor } = editorOver();
    place(editor, [0, 0, 0]);
    place(editor, [0, 50, 0]);
    place(editor, [0, 90, 0]);
    await settle();

    await settle();
    flush();
    editor.selectById("shape-Box-0-0-0");
    editor.reorderItem(0, 2);
    await settle();
    flush();

    expect(editor.items().map((item) => item.id)).toEqual([
      "shape-Box-0-50-0",
      "shape-Box-0-90-0",
      "shape-Box-0-0-0",
    ]);
    expect(editor.selectedIndex()).toBe(2);
  });

  it("refuses to move an item off either end of the list", async () => {
    const { editor } = editorOver();
    place(editor, [0, 0, 0]);
    await settle();
    const before = editor.items().map((item) => item.id);
    editor.reorderItem(0, 5);
    editor.reorderItem(0, -1);
    await settle();
    expect(editor.items().map((item) => item.id)).toEqual(before);
  });
});

describe("undo", () => {
  it("takes back the last change and can put it again", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    flush();
    expect(editor.items()).toHaveLength(1);

    editor.undo();
    flush();
    await settle();
    flush();
    expect(editor.items()).toHaveLength(0);

    editor.redo();
    flush();
    await settle();
    flush();
    expect(editor.items()).toHaveLength(1);
  });

  it("has nothing to undo before anything has been done", () => {
    const { editor } = editorOver();
    expect(editor.hasUndo()).toBe(false);
    expect(editor.hasRedo()).toBe(false);
  });

  it("takes a removal back", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    editor.removeItem(0);
    await settle();
    flush();
    expect(editor.items()).toHaveLength(0);

    editor.undo();
    flush();
    await settle();
    flush();
    expect(editor.items()).toHaveLength(1);
  });

  it("takes back an inspector change", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    const current = editor.selectedShape()!;

    editor.updateItem(0, { ...current, at: [7, 7, 7] });
    await settle();
    expect(editor.items()[0]).toMatchObject({ at: [7, 7, 7] });

    editor.undo();
    flush();
    await settle();
    flush();
    expect(editor.items()[0]).toMatchObject({ at: [0, 10, 0] });
  });

  it("describes the removal by the item's own name", async () => {
    const { editor } = editorOver();
    place(editor, [3, 4, 5]);
    await settle();
    editor.removeItem(0);
    await settle();
    expect(editor.undoDescription()).toBe("Remove shape-Box-3-4-5");
  });

  it("clears the selection when what was selected is removed", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    expect(editor.selectedIndex()).toBe(0);

    editor.removeItem(0);
    await settle();
    // The list closed up behind it, so the old index points at nothing.
    expect(editor.selectedIndex()).toBeUndefined();
  });

  it("does not undo across a new edit, which is not somewhere redo can go", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    editor.undo();
    flush();
    await settle();
    flush();
    expect(editor.hasRedo()).toBe(true);

    place(editor, [0, 20, 0]);
    await settle();
    flush();
    expect(editor.hasRedo()).toBe(false);
  });

  it("applies two edits in the order they were made", async () => {
    // The reason the commands are queued at all. Two `await`s in a test would pass even if
    // the store raced them; this asks for both at once, as two clicks a moment apart do.
    //
    // **And it checks the order, not just the count** — because the list order is the fold
    // order (ADR 0016). Inserting both at index zero would give the right count and a
    // level whose file reads backwards.
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    place(editor, [0, 20, 0]);
    await settle();
    flush();
    expect(editor.items().map((item) => item.at)).toEqual([
      [0, 10, 0],
      [0, 20, 0],
    ]);

    // And they undo in the opposite order, so the newest goes first.
    editor.undo();
    flush();
    await settle();
    flush();
    expect(editor.items().map((item: LevelItem) => item.id)).toEqual([
      "shape-Box-0-10-0",
    ]);
  });
});

describe("a level coming in from a file", () => {
  it("replaces the level, as one undoable step", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();

    editor.importJson(
      JSON.stringify({
        version: 1,
        items: [
          {
            kind: "shape",
            id: "floor",
            at: [0, 0, 0],
            shape: { type: "Box", len: { x: 10, y: 2, z: 10 } },
            combine: "Add",
          },
          {
            kind: "figure",
            id: "lamp",
            figure: "prop",
            model: "lantern.sdfmod",
            at: [2, 0, 2],
          },
        ],
      }),
    );
    await settle();

    expect(editor.items()).toHaveLength(2);
    expect(editor.selectedIndex()).toBeUndefined();
    expect(editor.notice()).toBe("loaded 2 items");
  });

  it("can be taken back with undo, because loading is an edit", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    editor.importJson(JSON.stringify({ version: 1, items: [] }));
    await settle();
    expect(editor.items()).toHaveLength(0);

    editor.undo();
    flush();
    await settle();
    flush();
    expect(editor.items()).toHaveLength(1);
  });

  it("leaves the level alone and says why when the file is not a level", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    const before = editor.items().map((item) => item.id);

    const taken = editor.importJson(
      JSON.stringify({ version: 1, items: [{ kind: "ufo" }] }),
    );
    await settle();
    flush();

    expect(taken).toBe(false);
    expect(editor.items().map((item) => item.id)).toEqual(before);
    expect(editor.notice()).toMatch(/items\[0\]/);
  });

  it("leaves the level alone when the text is not JSON at all", async () => {
    // The whole reason `tryCatch` exists: a file a person chose should say so on the
    // notice line, not throw where a click handler used to be.
    const { editor } = editorOver();
    expect(editor.importJson("{ not json")).toBe(false);
    await settle();
    flush();
    expect(editor.notice()).toMatch(/not JSON/);
    expect(editor.items()).toHaveLength(0);
  });

  it("exports what it read back, so a round trip is a round trip", async () => {
    const { editor } = editorOver();
    const text = JSON.stringify({
      version: 1,
      items: [
        {
          kind: "shape",
          id: "floor",
          at: [0, 0, 0],
          shape: { type: "Box", len: { x: 10, y: 2, z: 10 } },
          combine: "Add",
        },
      ],
    });
    editor.importJson(text);
    await settle();
    expect(JSON.parse(editor.exportJson())).toEqual(JSON.parse(text));
  });

  it("starts again from the world's level and forgets the history", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    expect(editor.hasUndo()).toBe(true);

    editor.reseed();
    await settle();
    flush();

    expect(editor.items()).toHaveLength(0);
    expect(editor.hasUndo()).toBe(false);
    expect(editor.selectedIndex()).toBeUndefined();
  });
});

describe("the camera style", () => {
  it("is the host's to keep, so the store does not hold a second answer", () => {
    const over = editorOver();
    expect(over.editor.cameraKind()).toBe("orbit");
    over.editor.setCameraKind("no-clip");
    expect(over.editor.cameraKind()).toBe("no-clip");
  });
});

describe("the place the level folds under", () => {
  it("is one name, not something an item chooses", () => {
    // Not a test of behaviour so much as of the decision: the level owns one place, and an
    // item naming another is refused by the reader rather than honoured.
    expect(LEVEL_PLACE).toBe("level");
  });
});

describe("the queue", () => {
  it("runs tasks in the order they were asked for, not the order they settle", async () => {
    const order: number[] = [];
    const enqueue = createEnqueue<void>();
    // The second task finishes first. Without the chain it would be recorded first, and
    // that is the bug: two edits applying backwards.
    const slow = enqueue(async () => {
      await new Promise((done) => setTimeout(done, 10));
      order.push(1);
    });
    const quick = enqueue(async () => {
      order.push(2);
    });
    await Promise.all([slow, quick]);
    expect(order).toEqual([1, 2]);
  });

  it("keeps running after one task throws, rather than wedging the queue", async () => {
    const enqueue = createEnqueue<number>();
    const order: number[] = [];
    void enqueue(async () => {
      throw new Error("no");
    }).catch(() => order.push(0));
    await enqueue(async () => order.push(1));
    expect(order).toEqual([0, 1]);
  });
});

describe("tryCatch", () => {
  it("hands back the value, or the failure as text", () => {
    expect(tryCatch(() => 42)()).toEqual({ ok: true, value: 42 });
    const failed = tryCatch(() => {
      throw new Error("nope");
    })();
    expect(failed.ok).toBe(false);
    expect(failed.ok === false && failed.error).toBe("nope");
  });
});
