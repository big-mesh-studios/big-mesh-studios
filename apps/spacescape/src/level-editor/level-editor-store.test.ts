// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";

import {
  createLevelEditor,
  drawsInAPlane,
  TOOL_KINDS,
  type CameraControlsKind,
  type LevelEditorHost,
} from "./level-editor-store";
import { createEnqueue, tryCatch } from "./utils";
import {
  LEVEL_PLACE,
  type LevelItem,
  type LevelPlan,
} from "../places/level/types";
import { readLevelPlan } from "../places/level/level-plan";
import type { LevelImagePlane } from "../places/level/image-plane";
import { MAX_NAME_LENGTH } from "../places/limits";

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

  it("adds a drawn wall as one item, selected, with a name from its points", async () => {
    // **One item, however many segments it makes.** A person finished a drawing, not a list
    // of boxes; the item is what the inspector edits and what the list shows.
    const { editor } = editorOver();
    editor.addWalls({
      up: [0, 1, 0],
      lines: [
        [
          [0, 0, 0],
          [40, 0, 0],
        ],
      ],
      height: 30,
      thickness: 6,
      combine: "Add",
    });
    await settle();
    flush();
    expect(editor.selectedWalls()).toMatchObject({
      kind: "walls",
      height: 30,
      thickness: 6,
    });
    // `walls-<points>-<centre>`, the centre being the box's middle at (20, 15, 0).
    expect(editor.items()[0].id).toBe("walls-2-20-15-0");
  });

  it("adds a drawn outline as one floor shape, selected and named after its corners", async () => {
    // **A shape, not a fourth kind** — ADR 0053. The whole of what that buys is visible here:
    // the store's own test does not need to know a floor is anything special, and the item
    // it produces is selected by the same code that selects a box.
    const { editor } = editorOver();
    editor.addFloor({
      at: { x: 20, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      points: [
        { x: -10, z: -10 },
        { x: 10, z: -10 },
        { x: 10, z: 10 },
        { x: -10, z: 10 },
      ],
      thickness: 4,
    });
    await settle();
    flush();
    const item = editor.items()[0];
    expect(item.kind).toBe("shape");
    expect(item.id).toBe("floor-4-20-0-0");
    if (item.kind !== "shape") throw new Error("expected a shape");
    expect(item.shape.type).toBe("Polygon");
    expect(item.shape.type === "Polygon" && item.shape.points).toHaveLength(4);
    expect(item.shape.type === "Polygon" && item.shape.len).toBe(4);
    // Selected, so the inspector opens on it and the outline bar is there.
    expect(editor.selectedIndex()).toBe(0);
  });

  it("keeps a floor's turn, which is the drawn plane's own basis", async () => {
    // **The one thing a level shape has to carry for a floor to lie where it was drawn.**
    // Dropping it would leave the outline in the same numbers on a level that is a
    // different plane — still a floor, still the right size, lying on its side.
    const { editor } = editorOver();
    const orientation = { x: 0.3826834, y: 0, z: 0, w: 0.9238795 };
    editor.addFloor({
      at: { x: 0, y: 0, z: 0 },
      orientation,
      points: [
        { x: -4, z: -4 },
        { x: 4, z: -4 },
        { x: 4, z: 4 },
        { x: -4, z: 4 },
      ],
      thickness: 2,
    });
    await settle();
    flush();
    const item = editor.items()[0];
    if (item.kind !== "shape") throw new Error("expected a shape");
    expect(item.orientation?.[0]).toBeCloseTo(orientation.x, 6);
    expect(item.orientation?.[1]).toBeCloseTo(orientation.y, 6);
    expect(item.orientation?.[2]).toBeCloseTo(orientation.z, 6);
    expect(item.orientation?.[3]).toBeCloseTo(orientation.w, 6);
  });
});

describe("which tools draw in a plane", () => {
  it("are the two that share the aim, commit, finish gesture", () => {
    // **And nothing else.** This is what every pointer handler in `app.tsx` asks instead of
    // naming a tool, so a tool added to the list that does not draw — and so must not claim
    // the pointer — is caught by the second assertion rather than by a person pressing and
    // wondering why the camera stopped moving.
    expect(drawsInAPlane("walls")).toBe(true);
    expect(drawsInAPlane("floor")).toBe(true);
    for (const kind of ["select", "shape", "prop", "npc"] as const) {
      expect(drawsInAPlane(kind), kind).toBe(false);
    }
    // **And the predicate is the only list of them**, spelled out so that adding a third
    // drawing tool has to change this too. `TOOL_KINDS` is what the toolbar offers and
    // `drawsInAPlane` is what claims the pointer; the two drifting apart is a tool that is
    // either unreachable or takes the camera hostage on press.
    expect(TOOL_KINDS.filter(drawsInAPlane)).toEqual(["walls", "floor"]);
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

/**
 * The names the editor hands out.
 *
 * **A level file is read back by the reader that wrote it**, so an id the editor can produce
 * and the reader cannot accept is not a cosmetic problem: the level becomes a file that
 * cannot be loaded. This is the whole of `MAX_NAME_LENGTH`'s history in one place — a level
 * id is not a name a *person* chose, it is three world coordinates rendered as text, and it
 * was carrying all seventeen digits after the point.
 */
describe("the names the editor makes", () => {
  /** What one placement actually costs to name, on this planet. */
  const placedId = async (editor: ReturnType<typeof editorOver>["editor"]) => {
    // **A real placement's coordinates**, not a tidy one: 130,000-odd units inside the
    // planet and a point pushed out along a terrain normal, so it has decimals.
    await settle();
    return editor.items()[0]?.id ?? "";
  };

  it("fits inside the limit its own reader enforces, on this planet's coordinates", async () => {
    const { editor } = editorOver();
    place(editor, [-135000.123456789, -1234.5678901234567, -89.0123456789012]);
    const id = await placedId(editor);

    // **The claim, stated as the bug it was.** Before the coordinates were rounded this was
    // sixty-five characters and the level reader refused the file, so a single wall placed by
    // a single click produced something that could not be opened again.
    expect(id.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(editor.hasUndo()).toBe(true);
  });

  it("stays readable rather than merely short", async () => {
    const { editor } = editorOver();
    place(editor, [-135000.123456789, -1234.5678901234567, -89.0123456789012]);
    const id = await placedId(editor);

    // **Rounded to whole units**, which is finer than a voxel (ten units) and is what a
    // person reads off it. `-135000.123456789` is not information anybody acting on the file
    // can use.
    expect(id).toBe("shape-Box--135000--1235--89");
  });

  it("still says what the item is and where it stands", async () => {
    // **The job of the name**, and the reason it is not a counter. Somebody opening a file
    // in six months reads this and knows a box, on a wall, at those coordinates.
    const { editor } = editorOver();
    place(editor, [12, 30, -7], "Sphere", "Subtract");
    expect(await placedId(editor)).toBe("shape-Sphere-12-30--7");
  });

  it("refuses a shape whose name the reader would not take", () => {
    // **The other end of the same limit**, so the reader's rule is the one under test rather
    // than the editor's arithmetic about it: a name over the limit is a refusal with a
    // reason, not a truncated name that collides with something else.
    const read = readLevelPlan({
      version: 1,
      items: [
        {
          kind: "shape",
          id: "x".repeat(MAX_NAME_LENGTH + 1),
          at: [0, 20, 0],
          shape: { type: "Sphere", radius: 1 },
          combine: "Add",
        },
      ],
    });
    expect("refusal" in read && read.refusal.why).toMatch(
      new RegExp(`longer than ${MAX_NAME_LENGTH}`),
    );
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

describe("duplicating an item", () => {
  it("puts the copy straight after the original, and selects it", async () => {
    // **Next to it and not at the end**, because the list order is the fold order (ADR 0016)
    // and a copy appended behind everything else would fold differently — which for a
    // `Subtract` is a different surface, not the same shape twice.
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    place(editor, [5, 10, 0]);
    await settle();

    editor.duplicateItem(0);
    await settle();
    flush();

    expect(editor.items()).toHaveLength(3);
    // The copy is at index 1 — immediately after the original at 0.
    expect(editor.items()[1]).toMatchObject({ at: [0, 10, 0] });
    expect(editor.items()[2]).toMatchObject({ at: [5, 10, 0] });
    // **Selected, because a copy somebody cannot see is a copy they cannot move.**
    expect(editor.selectedIndex()).toBe(1);
  });

  it("gives the copy a name of its own, because a level reader refuses two", async () => {
    // **The whole reason there is a suffix.** The id says what a shape is and where it
    // stands, and a copy standing where the original stands says exactly the same thing —
    // and `readLevelPlan` refuses two items sharing a name rather than letting the second
    // quietly replace the first.
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    const original = editor.items()[0].id;

    editor.duplicateItem(0);
    await settle();
    flush();

    expect(editor.items()[1].id).not.toBe(original);
    // **Readable rather than opaque** — the original's name plus a number, so a file full
    // of copies still says what each one is.
    expect(editor.items()[1].id).toBe(`${original}-2`);
  });

  it("keeps a flat, readable series however many times the same item is copied", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    const original = editor.items()[0].id;

    editor.duplicateItem(0);
    await settle();
    flush();
    editor.duplicateItem(0);
    await settle();
    flush();

    /**
     * **`-2` and `-3`, not `-2` and `-2-2`.** Duplicating the same item twice walks the
     * suffixes rather than nesting names, so a level with eight copies of a wall reads as
     * eight copies rather than as a tree — which is the difference between a file a person
     * can edit and one they have to decode. `-3` is first because each copy is inserted
     * straight after the original, and the later one is the more recent.
     */
    expect(editor.items().map((item) => item.id)).toEqual([
      original,
      `${original}-3`,
      `${original}-2`,
    ]);
  });

  it("copies the copy, and gives that a name too", async () => {
    // **The other direction, which is what pressing Duplicate twice on a selected copy
    // does.** The suffix nests here, and that is right: the name says what it is a copy
    // *of*, which a flat `-3` would not.
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    const original = editor.items()[0].id;

    editor.duplicateItem(0);
    await settle();
    flush();
    // The copy is selected, so this is the copy's own index.
    editor.duplicateItem(editor.selectedIndex()!);
    await settle();
    flush();

    expect(editor.items().map((item) => item.id)).toEqual([
      original,
      `${original}-2`,
      `${original}-2-2`,
    ]);
  });

  it("carries every field across, including the ones only some items have", async () => {
    // **By spread, not field by field.** A copy built field by field is a copy that
    // silently loses whatever somebody adds to `LevelShape` next — and what comes back is
    // not the thing that was duplicated.
    const { editor } = editorOver({
      version: 1,
      items: [
        {
          kind: "shape",
          id: "painted",
          at: [1, 2, 3],
          shape: { type: "Sphere", radius: 4 },
          combine: "Paint",
          softness: 0.1,
          colour: { r: 1, g: 2, b: 3 },
          material: "brick",
          orientation: [0, 0.7071067811865476, 0, 0.7071067811865476],
        },
      ],
    });
    await settle();

    editor.duplicateItem(0);
    await settle();
    flush();

    const copy = editor.items()[1] as LevelItem;
    expect(copy).toMatchObject({
      at: [1, 2, 3],
      shape: { type: "Sphere", radius: 4 },
      combine: "Paint",
      softness: 0.1,
      colour: { r: 1, g: 2, b: 3 },
      material: "brick",
      orientation: [0, 0.7071067811865476, 0, 0.7071067811865476],
    });
  });

  it("is one undo step, and takes the copy with it", async () => {
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();

    editor.duplicateItem(0);
    await settle();
    flush();
    expect(editor.items()).toHaveLength(2);
    expect(editor.undoDescription()).toBe(`Duplicate shape-Box-0-10-0`);

    editor.undo();
    flush();
    await settle();
    flush();
    expect(editor.items()).toHaveLength(1);
  });

  it("does nothing to an item that is not there, and records no undo step", async () => {
    // The same rule every other edit follows: a step that never happened must not leave
    // something on the undo stack, or the button would undo something invisible. Read off
    // the stack rather than by pressing undo — the placement itself is a step, so pressing
    // undo here would take *that* back and prove nothing about the duplicate.
    const { editor } = editorOver();
    place(editor, [0, 10, 0]);
    await settle();
    expect(editor.undoDescription()).toBe("Add shape");

    editor.duplicateItem(7);
    await settle();

    expect(editor.items()).toHaveLength(1);
    expect(editor.undoDescription()).toBe("Add shape");
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

  it("remembers the place level it came from, and forgets it on a file import", async () => {
    const { editor } = editorOver();
    const level = JSON.stringify({ version: 1, items: [] });

    editor.importJson(level, "hub.json");
    await settle();
    expect(editor.sourceName()).toBe("hub.json");

    editor.importJson(level);
    await settle();
    expect(editor.sourceName()).toBeUndefined();
  });

  it("forgets the place level when it starts again from the world", async () => {
    const { editor } = editorOver();
    editor.importJson(JSON.stringify({ version: 1, items: [] }), "hub.json");
    await settle();

    editor.reseed();
    await settle();

    expect(editor.sourceName()).toBeUndefined();
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

describe("the reference image a level may carry", () => {
  const aReference: LevelImagePlane = {
    at: [5, 0, -5],
    yaw: 0.25,
    width: 90,
    opacity: 0.5,
    mime: "image/png",
    bytes: new Uint8Array([1, 2, 3, 4]),
  };

  /** A store with a reference seam, remembering what was last handed to it. */
  const editorWithReference = () => {
    let stored: LevelImagePlane | undefined;
    const seam = {
      get: () => stored,
      set: (next: LevelImagePlane | undefined) => {
        stored = next;
      },
    };
    return createRoot(() => {
      const host: LevelEditorHost = {
        level: () => EMPTY,
        setLevel: () => {},
        cameraKind: () => "orbit",
        setCameraKind: () => {},
      };
      const editor = createLevelEditor(host, seam);
      return { editor, reference: () => stored, setReference: seam.set };
    });
  };

  it("writes the reference with the level when there is one", async () => {
    const { editor, setReference } = editorWithReference();
    setReference(aReference);
    await settle();
    expect(JSON.parse(editor.exportJson()).imagePlane).toMatchObject({
      mime: "image/png",
      width: 90,
    });
  });

  it("writes no key when there is no reference", async () => {
    const { editor } = editorWithReference();
    await settle();
    expect(JSON.parse(editor.exportJson())).not.toHaveProperty("imagePlane");
  });

  it("adopts a reference read from a file", async () => {
    const { editor, setReference } = editorWithReference();
    setReference(aReference);
    const text = editor.exportJson();

    const { editor: other, reference: otherReference } = editorWithReference();
    other.importJson(text);
    await settle();
    flush();
    expect(otherReference()?.mime).toBe("image/png");
    expect([...(otherReference()?.bytes ?? [])]).toEqual([1, 2, 3, 4]);
    expect(otherReference()?.at).toEqual([5, 0, -5]);
  });

  it("refuses the whole file when the reference is malformed", async () => {
    const { editor, reference } = editorWithReference();
    const taken = editor.importJson(
      JSON.stringify({
        version: 1,
        items: [],
        imagePlane: {
          at: [0, 0, 0],
          yaw: 0,
          width: 1,
          opacity: 5,
          mime: "image/png",
          bytes: "AAAA",
        },
      }),
    );
    await settle();
    flush();
    expect(taken).toBe(false);
    expect(reference()).toBeUndefined();
    expect(editor.notice()).toMatch(/imagePlane/);
  });

  it("clears the reference when the level is reseeded", async () => {
    const { editor, setReference, reference } = editorWithReference();
    setReference(aReference);
    editor.reseed();
    await settle();
    flush();
    expect(reference()).toBeUndefined();
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
