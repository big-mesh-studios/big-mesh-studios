/**
 * The editor's state: the working level, what is selected, which tool is active, and the
 * undo history over it all.
 *
 * ## The seam onto the running world
 *
 * The editor does not own a level — it edits one and writes every change straight back, so
 * the world updates as things are placed rather than when a save button is pressed.
 * `LevelEditorHost` is that seam, and it is the only thing in this file that knows anything
 * about the world at all.
 *
 * ## Why every command goes through a queue
 *
 * `doCommand` is async because applying a command can be, and the edits arrive faster than
 * they settle. Two clicks a moment apart must apply **in the order they were made**, and a
 * pair of promises racing would apply them in whichever order they finished — which shows up
 * as an undo that undoes the wrong edit, months later, with no way to reproduce it.
 * `enqueue` is that ordering.
 */

import {
  createEffect,
  createMemo,
  createSignal,
  type Accessor,
} from "solid-js";
import { createMediaQuery } from "@big-mesh-studios/ui/create-media-query";

import { createCommander, type LevelDocument } from "./command/commander";
import { Command } from "./command/Command";
import { UndoRedoManager } from "./undo-redo";
import {
  itemLabel,
  MAX_LEVEL_ITEMS,
  readLevelPlan,
  writeLevelPlan,
} from "../places/level/level-plan";
import type {
  Combine,
  LevelFigure,
  LevelItem,
  LevelPlan,
  LevelShape,
  LevelWalls,
  ShapeKind,
} from "../places/level/types";
import {
  isLevelFigure,
  isLevelShape,
  isLevelWalls,
} from "../places/level/types";
import type { Quat, Vec3 } from "@big-mesh-studios/core";
import { wallsCentre } from "../places/level/walls";
import { createEnqueue, tryCatch } from "./utils";
import {
  DEFAULT_SHAPE_SIZES,
  DEFAULT_WALL_THICKNESS,
  MIN_SHAPE_SIZES,
} from "./panels/vocabulary";

/** How the editor's camera is driven. Both are implementations of one shape. */
export type CameraControlsKind = "orbit" | "no-clip";

/** What the editor edits: the level the world is currently showing. */
export interface LevelEditorHost {
  /** The level as it now stands, which the editor starts from. */
  level: Accessor<LevelPlan>;
  /** Puts a level into the world. The editor keeps a working copy and writes every change back. */
  setLevel(plan: LevelPlan): void;
  /** Which style drives the editor's camera. */
  cameraKind: Accessor<CameraControlsKind>;
  /** Switches the editor between the orbit and no-clip cameras. */
  setCameraKind(kind: CameraControlsKind): void;
}

/**
 * The shape a tool makes at a point, sized to be recognisable before it is adjusted.
 *
 * **Every parameter is given, because a level reader refuses an undeclared one.** The
 * primitive table is what the field checks a shape against, and a `Capsule` with no `radius`
 * is not a capsule that defaults to something — it is a refusal.
 *
 * The sizes come from `panels/vocabulary.ts`, which has one per primitive because one
 * number for all of them would make a sphere twice the size of a cylinder.
 */
export const defaultShape = (
  at: readonly [number, number, number],
  kind: ShapeKind,
  combine: Combine,
): LevelShape => {
  const size = DEFAULT_SHAPE_SIZES[kind];
  const round = Math.max(size / 4, MIN_SHAPE_SIZES[kind]);
  const shapes: Record<ShapeKind, LevelShape["shape"]> = {
    Sphere: { type: "Sphere", radius: size },
    Ellipsoid: { type: "Ellipsoid", radius: { x: size, y: size, z: size } },
    Box: { type: "Box", len: { x: size, y: size, z: size } },
    RoundBox: {
      type: "RoundBox",
      len: { x: size, y: size, z: size },
      radius: round,
    },
    Capsule: { type: "Capsule", len: size, radius: round },
    Cone: { type: "Cone", len: size, radius: round },
    Cylinder: { type: "Cylinder", len: size, radius: round },
    Torus: {
      type: "Torus",
      majorRadius: Math.max(size * 0.75, round * 2),
      minorRadius: round,
    },
    HexPrism: { type: "HexPrism", len: size, radius: round },
    // **A square, because a floor's outline is drawn rather than typed and this is the
    // shape somebody gets before they have drawn one.** A rectangle rather than a square,
    // so it reads as a floor slab rather than a table top; counter-clockwise, which the
    // SDF does not need but which makes a level file diffable against the one a draw
    // tool would write. The thickness is the walls' default, for the same reason the
    // height is: it is a floor panel rather than a slab of concrete.
    Polygon: {
      type: "Polygon",
      points: [
        { x: -size, z: -size / 2 },
        { x: size, z: -size / 2 },
        { x: size, z: size / 2 },
        { x: -size, z: size / 2 },
      ],
      len: DEFAULT_WALL_THICKNESS,
    },
  };
  const shape = shapes[kind];
  return {
    kind: "shape",
    id: "",
    at,
    shape,
    combine,
    // A paint with no colour is a paint that paints whatever was there. Giving it one means
    // the colour field has something to show, which is what makes it adjustable at all.
    ...(combine === "Paint" ? { colour: { r: 200, g: 200, b: 200 } } : {}),
  };
};

export function createLevelEditor(host: LevelEditorHost) {
  /**
   * The level the commands work on: a plain value, and the thing they are always right
   * about.
   *
   * The signal below is a *mirror* of this, for the panels to read. It is allowed to be a
   * frame behind — that is what a signal is for — but a command is a read-modify-write
   * outside any render, and Solid 2 answers a read-after-write with the previous value
   * until the next flush. Two placements in one turn would then both read an empty list,
   * both insert at 0, and the level would come out in the opposite order to the one it was
   * built in — which is the fold order. See `LevelDocument`.
   */
  let working: LevelPlan = host.level();
  const [plan, setPlanSignal] = createSignal<LevelPlan>(working);
  const document: LevelDocument = {
    current: () => working,
    write: (next) => {
      working = next;
      setPlanSignal(next);
    },
  };
  const [selectedIndex, setSelectedIndex] = createSignal<number | undefined>(
    undefined,
  );
  const [tool, setTool] = createSignal<ToolKind>("shape");
  /**
   * Which gizmo the world shows. See the note on the returned `gizmo`.
   *
   * **A plain signal rather than a piece of `tool`,** because the two answer different
   * questions — what a click does, against what a press on a handle does.
   */
  const [gizmo, setGizmo] = createSignal<GizmoKind>("move");
  const [shapeKind, setShapeKind] = createSignal<ShapeKind>("Box");
  const [combine, setCombine] = createSignal<Combine>("Add");
  const [notice, setNotice] = createSignal<string | undefined>(undefined);

  const narrow = createMediaQuery("(max-width: 720px)");
  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  /**
   * Whether the panels go in a sheet below the canvas rather than beside it.
   *
   * **Width *or* a coarse pointer, not width alone.** A phone held sideways is wider than
   * the threshold and still has no mouse — the same reasoning as voxelscape's sheet.
   */
  const mobile = createMemo(() => narrow() || coarsePointer());

  // Every change to the working level reaches the world. The applier decides what that
  // costs; this effect is only the write-through.
  //
  // **It watches the mirror, not `document.current()`.** The plain value has no reactive
  // dependency, so an effect reading it would run once and never again — the editor would
  // keep working perfectly and the world would sit still. The mirror is a signal, so the
  // effect re-runs whenever a command lands.
  createEffect(
    () => plan(),
    (level) => {
      host.setLevel(level);
    },
  );

  const items = createMemo(() => plan().items);
  const selectedItem = createMemo<LevelItem | undefined>(() => {
    const index = selectedIndex();
    return index === undefined ? undefined : items()[index];
  });
  const selectedShape = createMemo<LevelShape | undefined>(() => {
    const item = selectedItem();
    return item !== undefined && isLevelShape(item) ? item : undefined;
  });
  const selectedFigure = createMemo<LevelFigure | undefined>(() => {
    const item = selectedItem();
    return item !== undefined && isLevelFigure(item) ? item : undefined;
  });
  const selectedWalls = createMemo<LevelWalls | undefined>(() => {
    const item = selectedItem();
    return item !== undefined && isLevelWalls(item) ? item : undefined;
  });

  const { doCommand } = createCommander(document);

  /**
   * Chains tasks so they run in the order they were asked for, not the order they settle.
   *
   * **A closure over one queue, rather than a shared `let`,** because the queue has to be
   * per-editor: two editors open at once would otherwise interleave their edits into one
   * chain, and the ordering this exists to guarantee is per-level.
   */
  const enqueue = createEnqueue<Command>();

  /**
   * Applies a command and returns it as something reversible, without waiting for it.
   *
   * **This is the only place an `Async` command is made.** `UndoRedoManager` is
   * synchronous — a button pushes and pops — while applying a command is queued, so the
   * manager cannot be handed the reverse and get one. `Command.async` is the answer: the
   * manager stores a command that *will* reverse, and reversing it later awaits the
   * promise and then does the work.
   *
   * The edit path does not need any of this — `apply` below knows its own reverse by the
   * time it has one — so it pushes the plain command.
   */
  const perform = (command: Command): Command =>
    Command.async(enqueue(() => doCommand(command)));

  const undoRedo = new UndoRedoManager(perform);

  /**
   * Runs one undoable step, labelled for the button's tooltip.
   *
   * **`build` is called inside the queue, not before it.** A command that needs to know
   * where to put something — an append, which needs the current length — has to compute
   * that *after* the steps queued ahead of it have landed. Building the command first and
   * queuing it second looks equivalent and is not: two placements made in one turn would
   * both read an empty list, both insert at zero, and the level would come out with the
   * second click's shape first. Since the list order is the fold order (ADR 0016), that is
   * a level whose file reads backwards.
   *
   * Returning `undefined` from `build` means "there was nothing to do" and records no undo
   * step — which is what an edit to an item that is not there should be.
   */
  const apply = (
    build: (level: LevelPlan) => Command | undefined,
    description: string,
    after?: () => void,
  ): void => {
    void enqueue(async () => {
      const command = build(working);
      // Nothing to do: an edit to an item that is not there. No undo step for a step
      // that never happened, or the button would undo something invisible.
      if (command === undefined) return Command.noOperation();
      const reverse = await doCommand(command);
      undoRedo.pushUndo({ command: reverse, description });
      undoRedo.clearRedo();
      after?.();
      return reverse;
    });
  };

  /** The item's own description, so a tooltip says "Remove wall-4" rather than "Remove item". */
  const describe = (item: LevelItem, verb: string): string =>
    `${verb} ${item.id}`;

  /** Selects by name, which is what an add knows and an index is not yet. */
  const select = (id: string): void => {
    const index = working.items.findIndex((item) => item.id === id);
    setSelectedIndex(index === -1 ? undefined : index);
  };

  /** A stand-in name for a step that turned out to have nothing to do. */
  const EMPTY_ITEM: LevelItem = {
    kind: "shape",
    id: "nothing",
    at: [0, 0, 0],
    shape: { type: "Sphere", radius: 1 },
    combine: "Add",
  };

  return {
    plan,
    items,
    selectedIndex,
    selectedItem,
    selectedShape,
    selectedFigure,
    selectedWalls,
    setSelectedIndex,

    tool,
    setTool,
    shapeKind,
    setShapeKind,
    combine,
    setCombine,

    cameraKind: host.cameraKind,
    setCameraKind: host.setCameraKind,

    /**
     * Which gizmo the world shows, or none.
     *
     * **Not part of `tool`, and deliberately so.** `ToolKind` decides what a click on the
     * world *does* — place a shape, stand a prop, pick something. This decides what a press
     * on a handle does, and a press on a handle is never a click. Putting them in one list
     * would mean every place that branches on the tool also had to answer the gizmo
     * question, and would let a mode exist where a click placed a shape and a handle moved
     * the same thing at once.
     *
     * **Defaults to `move`, not to `off`.** A selected item with nothing on it is an item
     * somebody has chosen and cannot do anything with; the move handles are the cheapest
     * useful thing to offer them.
     */
    gizmo,
    setGizmo,

    narrow,
    coarsePointer,
    mobile,
    notice,
    setNotice,

    /** The editor's undo state, for a toolbar. */
    hasUndo: undoRedo.hasUndo,
    hasRedo: undoRedo.hasRedo,
    undoDescription: undoRedo.undoDescription,
    redoDescription: undoRedo.redoDescription,

    undo: () => undoRedo.undo(),
    redo: () => undoRedo.redo(),

    /** Selects an item by its position in the list, or nothing. */
    select(index: number | undefined): void {
      setSelectedIndex(index === undefined ? undefined : index);
    },

    /** Selects whichever item has this id, which is what a click in the world knows. */
    selectById(id: string | undefined): void {
      if (id === undefined) {
        setSelectedIndex(undefined);
        return;
      }
      const index = working.items.findIndex((item) => item.id === id);
      setSelectedIndex(index === -1 ? undefined : index);
    },

    /**
     * Places a shape of the current kind at a point.
     *
     * **The id is made from the item's position**, so a level has names a person can read
     * in a file rather than `shape-7`. Two shapes stamped on the same spot get the same
     * name, which the level reader refuses as a duplicate — a real answer for an ambiguous
     * gesture, rather than two items quietly sharing one identity.
     */
    addShapeAt(
      at: readonly [number, number, number],
      kind: ShapeKind,
      how: Combine,
    ): void {
      const id = idFor("shape", kind, at);
      const item: LevelShape = { ...defaultShape(at, kind, how), id };
      apply(
        (level) => Command.addItem(item, level.items.length),
        "Add shape",
        () => select(id),
      );
    },

    /** Stands a figure up at a point, under a model the place carries. */
    addFigureAt(figure: LevelFigure): void {
      const id = idFor(figure.figure, figure.model, figure.at);
      apply(
        (level) => Command.addItem({ ...figure, id }, level.items.length),
        `Add ${figure.figure}`,
        () => select(id),
      );
    },

    /**
     * Adds a drawn set of walls as one item.
     *
     * **The id comes from the point count and the middle**, the same way a shape's comes from
     * its kind and position: `walls-24--135000-40-0` says what it is and roughly where. The
     * middle is derived from the points here rather than trusted from the caller, so the two
     * cannot drift — `wallsCentre` is the same function `apply-level.ts` uses to place the
     * operations, and one answer for "where is this" is what keeps a selection on the walls it
     * selected.
     */
    addWalls(drawn: {
      readonly up: readonly [number, number, number];
      readonly lines: readonly (readonly [number, number, number][])[];
      readonly height: number;
      readonly thickness: number;
      readonly combine: Combine;
    }): void {
      const at = wallsCentre(drawn);
      const points = drawn.lines.reduce(
        (total, line) => total + line.length,
        0,
      );
      const id = idFor("walls", `${points}`, [at.x, at.y, at.z]);
      const item: LevelWalls = {
        kind: "walls",
        id,
        at: [at.x, at.y, at.z],
        up: drawn.up,
        lines: drawn.lines,
        height: drawn.height,
        thickness: drawn.thickness,
        combine: drawn.combine,
        ...(drawn.combine === "Paint"
          ? { colour: { r: 210, g: 200, b: 180 } }
          : {}),
      };
      apply(
        (level) => Command.addItem(item, level.items.length),
        "Add walls",
        () => select(id),
      );
    },

    /**
     * Adds a drawn outline as one floor, as a shape rather than as a kind of its own.
     *
     * **The id comes from the point count and the middle**, the same shape as `addWalls`'s,
     * so a level has names a person can read: `floor-6-200-0-0` says how many corners and
     * roughly where. Two floors stamped on the same spot get the same name, and the reader
     * refuses that as a duplicate — a real answer for an ambiguous gesture rather than two
     * items sharing one identity.
     *
     * **`Add` rather than the editor's current combine, and that is the one thing here worth
     * arguing for.** A floor's outline is a shape's parameters, so this is `addShapeAt` with
     * an outline instead of a default rectangle, and the toolbar's combine button says what
     * the *next shape placed by a click* will do. Nobody clicked to place this one — they
     * drew it, and a draw that came out as a `Subtract` because a button was left on
     * `Subtract` last time would be a hole in the ground.
     */
    addFloor(placement: {
      readonly at: Vec3;
      readonly orientation: Quat;
      readonly points: readonly { readonly x: number; readonly z: number }[];
      /** The walls' default panel thickness, which is a floor panel too. */
      readonly thickness: number;
    }): void {
      const at: readonly [number, number, number] = [
        placement.at.x,
        placement.at.y,
        placement.at.z,
      ];
      const id = idFor("floor", `${placement.points.length}`, at);
      const item: LevelShape = {
        kind: "shape",
        id,
        at,
        shape: {
          type: "Polygon",
          points: placement.points.map((point) => ({
            x: point.x,
            z: point.z,
          })),
          len: placement.thickness,
        },
        orientation: [
          placement.orientation.x,
          placement.orientation.y,
          placement.orientation.z,
          placement.orientation.w,
        ],
        combine: "Add",
      };
      apply(
        (level) => Command.addItem(item, level.items.length),
        "Add floor",
        () => select(id),
      );
    },

    /** Changes one item, which is every edit the inspector makes. */
    updateItem(index: number, next: LevelItem): void {
      apply(
        (level) => {
          const previous = level.items[index];
          if (previous === undefined) return undefined;
          return Command.setItem(index, next);
        },
        describe(working.items[index] ?? next, "Change"),
      );
    },

    removeItem(index: number): void {
      apply(
        (level) => {
          const item = level.items[index];
          if (item === undefined) return undefined;
          return Command.removeItem(index);
        },
        describe(working.items[index] ?? EMPTY_ITEM, "Remove"),
      );
      // The list closes up behind the selection, so an index that pointed at the removed
      // item now points at whatever took its place — or past the end. Clearing it is the
      // only answer that is right in both cases.
      setSelectedIndex(undefined);
    },

    /**
     * A copy of an item, immediately after it, selected.
     *
     * **Immediately after rather than at the end, and this is about the fold.** The list
     * order *is* the fold order (ADR 0016) and the fold combines with a smooth minimum —
     * symmetric but not associative — so appending a copy of a `Subtract` would put it
     * behind everything else and change what the terrain looks like. Putting it next to its
     * original keeps the copy cutting where the original cuts.
     *
     * **One `apply`, so one undo step**, and the whole edit is the add: the copy arrives
     * already selected, so there is no second command to record for the selection.
     *
     * **The copy lands on top of the original**, which is the point — it is a copy and
     * somebody is going to want to move it. The caller switches to the move gizmo; this does
     * not, because a store that changed the editor's tool as a side effect of an add would be
     * a store reaching into the UI.
     *
     * **Every field comes across by spread**, including `material`, `colour`, `softness` and
     * `orientation`. A copy built field by field is a copy that silently loses whatever
     * somebody adds to `LevelShape` next, and the shape that comes back is not the one that
     * was duplicated.
     */
    duplicateItem(index: number): void {
      const source = working.items[index];
      if (source === undefined) return;
      /**
       * **The id is made here rather than inside the queue.** It has to be unique against
       * what is already in the level, and `working` is the settled truth the panels are
       * reading — asking inside `build` would be asking a frame behind, and a duplicate id
       * is refused outright by the level reader rather than repaired.
       */
      const id = freeId(working, source.id);
      apply(
        (level) => {
          if (level.items[index] === undefined) return undefined;
          if (level.items.length >= MAX_LEVEL_ITEMS) return undefined;
          return Command.addItem({ ...level.items[index], id }, index + 1);
        },
        describe(source, "Duplicate"),
        () => select(id),
      );
    },

    /**
     * Moves an item to another position in the list.
     *
     * **This is fold order, not depth order**, and it is the ▲▼ buttons in the list rather
     * than a drag in the world. Two shapes can be at the same height and fold differently,
     * and this is the only control that says so.
     */
    reorderItem(index: number, to: number): void {
      apply(
        (level) => {
          if (to < 0 || to >= level.items.length || index === to)
            return undefined;
          const item = level.items[index];
          if (item === undefined) return undefined;
          return Command.reorderItem(index, to);
        },
        describe(working.items[index] ?? EMPTY_ITEM, "Reorder"),
        () => setSelectedIndex(to),
      );
    },

    /** The level as text, for a download. */
    exportJson: (): string => writeLevelPlan(plan()),

    /**
     * Replaces the level with one from text, as one undoable step.
     *
     * **A bad file leaves the level alone and says why.** Returning `false` rather than
     * throwing keeps a half-read file from becoming half a world, and the notice line is
     * where the refusal is written.
     */
    importJson(text: string): boolean {
      const parsed = tryCatch(() => JSON.parse(text) as unknown)();
      if (!parsed.ok) {
        setNotice(`that is not JSON: ${parsed.error}`);
        return false;
      }
      const read = readLevelPlan(parsed.value);
      if ("plan" in read) {
        apply(
          () => Command.loadPlan(read.plan),
          "Load level",
          () => setSelectedIndex(undefined),
        );
        setNotice(
          `loaded ${read.plan.items.length} item${read.plan.items.length === 1 ? "" : "s"}`,
        );
        return true;
      }
      setNotice(`${read.refusal.where || "the level"} ${read.refusal.why}`);
      return false;
    },

    /** Starts again from the world's level, throwing away the history. */
    reseed(): void {
      document.write(host.level());
      undoRedo.clear();
      setSelectedIndex(undefined);
    },

    itemLabel,
  };
}

/**
 * Everything the panels are handed.
 *
 * **Named because a panel's props would otherwise be an inferred structural type**, which
 * means every panel that imports the store to describe its props imports half of it. One
 * name, taken from the thing that makes it.
 */
export type LevelEditor = ReturnType<typeof createLevelEditor>;

/** What the editor can do with a click. */
export type ToolKind = "select" | "shape" | "prop" | "npc" | "walls" | "floor";

export const TOOL_KINDS: readonly ToolKind[] = [
  "select",
  "shape",
  "prop",
  "npc",
  "walls",
  "floor",
];

/**
 * The two tools that draw in a plane, as one predicate.
 *
 * **`walls` and `floor` are the same gesture** — aim, commit, finish, in a plane the first
 * press established — and they differ only in what counts as finished: a wall wants chains,
 * a floor wants one closed loop. Every place that has to behave the same for both was
 * otherwise a pair of `tool() === "walls" || tool() === "floor"` tests, and a pair of those is
 * two places to forget one of. There are about ten such places in `app.tsx`.
 *
 * **Named as a predicate over the kind rather than read from the signal at each site**, so
 * that the question is asked in one place and the answer is the same everywhere. A tool added
 * to `TOOL_KINDS` and not here is a tool that silently stops claiming the pointer.
 */
export const drawsInAPlane = (kind: ToolKind): boolean =>
  kind === "walls" || kind === "floor";

/**
 * What the world shows on a selected item, if anything.
 *
 * **`"off"` is part of it rather than a boolean beside it**, because "no gizmo" and "which
 * gizmo" are the same question and a pair of them is two ways to be wrong at once — most
 * obviously the combination of "not off" and "showing none", which is what a selection
 * cannot turn produces.
 */
export type GizmoKind = "off" | "move" | "rotate";

export const GIZMO_KINDS: readonly GizmoKind[] = ["move", "rotate", "off"];

/**
 * A name a person can read in a file.
 *
 * **Built from what the item is and where it is, not from a counter**, so `wall-4-20-0`
 * says something in six months.
 *
 * **The coordinates are rounded to whole units, and that is what the name is for.** It was
 * `shape-Box--135000.123456789--1234.5678901234567--89.0123456789012` before — sixty-five
 * characters, which is longer than a name may be, so a level file the editor had just
 * written was a file its own reader refused. Two things were wrong with it and only one of
 * them was the length: a name nobody can read is not a name, and the seventeen digits after
 * the point are not information anybody acting on the file will use or can act on. At this
 * world's scale — a voxel is ten units, so the finest thing anybody can see is a tenth of
 * that — a whole unit is the finest an id needs to distinguish two placements, and
 * `shape-Box--135000--1235--89` says the same thing and fits on a line.
 *
 * **The cost is that two placements within a unit of each other now collide**, where before
 * they did not. That is a collision the level reader already refuses by name
 * (`level-plan.ts`), and it is the honest trade: a name that says where something is, to the
 * precision the world has, over one that is unique and unreadable. Somebody who needs two
 * shapes a few centimetres apart names them.
 */
const idFor = (
  what: string,
  detail: string,
  at: readonly [number, number, number],
): string =>
  `${what}-${detail}-${Math.round(at[0])}-${Math.round(at[1])}-${Math.round(at[2])}`;

/**
 * An id nobody in the level is already using, built from one that is taken.
 *
 * **A suffix rather than a new name.** The id says what the item is and where it stands, and
 * a copy standing where the original stands says exactly the same thing — so the useful part
 * of the name is kept and a number is added, which is what makes a level file full of copies
 * still readable (`wall-Box-0-20-0`, `wall-Box-0-20-0-2`, `wall-Box-0-20-0-3`).
 *
 * **Starting at 2, because the plain id is the original's.** Somebody who duplicated the same
 * wall four times gets `-2` through `-5`, which reads as a count of copies rather than as a
 * count of items.
 *
 * **Walking the numbers rather than counting what is already there**, because the suffixes
 * need not be contiguous — a `-2` somebody deleted and a `-2` a later duplicate would both
 * be free the same way, and a level reader is right to refuse either.
 */
const freeId = (level: LevelPlan, taken: string): string => {
  if (!level.items.some((item) => item.id === taken)) return taken;
  for (let copy = 2; ; copy++) {
    const candidate = `${taken}-${copy}`;
    if (!level.items.some((item) => item.id === candidate)) return candidate;
  }
};
