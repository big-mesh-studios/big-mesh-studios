// What a press on the slice canvas is for, and what it does once it is under way.
//
// The drawing on the canvas is one slice of the box, and everything here is a
// decision about cells of that slice. A stroke is a run of cells, a fill is the
// run of cells joined to the one pressed, and both end up as one command the
// history can take back as a single thing however many cells they cover.
import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import {
  mirrorCells,
  sliceCell,
  strokeCells,
  type Plane,
  type Slice,
  type Volume,
} from "@big-mesh-studios/stacker/volume";
import { pointer } from "@big-mesh-studios/utils/pointer";
import { Command, type Command as CommandType } from "../command/Command";
import { gestureFor } from "../touch";
import {
  computeLayout,
  nearestDrawingCell,
  pressAt,
  type Layout,
} from "./slice-layout";
import type { ModeKind, Mirror } from "../types";

/** Where a stroke has got to: where it started, where it was, and what it drew. */
interface Stroke {
  from: Vector2D;
  last: Vector2D;
  drawn: Set<string>;
}

export interface SliceControllerParams {
  canvas(): HTMLCanvasElement | undefined;
  volume(): Volume;
  slice(): Slice;
  plane(): Plane;
  mode(): ModeKind;
  mirror(): Mirror;
  /** The palette index being drawn in, which is `Bitmap.EMPTY` while erasing. */
  paletteIndex(): number;
  /** The cell the pointer is over, for the cell drawn under it. */
  onHover(cell: Vector2D | undefined): void;
  /** The slice a press on the strip asked to go to. */
  onSlice(at: number): void;
  /** A colour taken off a cell by the eyedropper. */
  onPick(index: number): void;
  doCommand(command: CommandType, description: string): void;
  onView(pan: Vector2D, scale: number): void;
  onDraw(): void;
}

export interface SliceController {
  layout(): Layout;
  pan(): Vector2D;
  scale(): number;
  onPointerDown(
    event: PointerEvent & { currentTarget: HTMLCanvasElement },
  ): Promise<void>;
  onPointerMove(
    event: PointerEvent & { currentTarget: HTMLCanvasElement },
  ): void;
  onPointerOut(): void;
  onWheel(event: WheelEvent): void;
  /** The cells a stroke in flight has drawn, and where it started. */
  stroke(): { from: Vector2D; cells: Vector2D[] } | undefined;
  /** The block a rectangle in flight has covered, or nothing. */
  block(): { from: Vector2D; to: Vector2D } | undefined;
  /** Whether a drag is moving the view rather than drawing. */
  panning(): boolean;
}

const cellKey = ({ x, y }: Vector2D) => `${x},${y}`;

const cellsOf = (drawn: Set<string>) =>
  [...drawn].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return Vector2D.create(x, y);
  });

export function createSliceController({
  canvas,
  volume,
  slice,
  plane,
  mode,
  mirror,
  paletteIndex,
  onHover,
  onSlice,
  onPick,
  doCommand,
  onView,
  onDraw,
}: SliceControllerParams): SliceController {
  let pan = Vector2D.create(0, 0);
  let scale = 8;
  let stroke: Stroke | undefined;
  let block: { from: Vector2D; to: Vector2D } | undefined;
  let hovered: Vector2D | undefined;
  let panning = false;
  let panFrom: Vector2D | undefined;
  let previousSpan: number | undefined;

  const layout = () => computeLayout(slice());

  /** The point on the canvas a press stands at, in cells from the drawing. */
  const worldAt = (event: { clientX: number; clientY: number }): Vector2D => {
    const element = canvas();
    if (element === undefined) {
      return Vector2D.create(0, 0);
    }
    const rect = element.getBoundingClientRect();
    return Vector2D.create(
      (event.clientX - rect.left - pan.x) / scale,
      (event.clientY - rect.top - pan.y) / scale,
    );
  };

  const view = () => onView(pan, scale);

  /** The cells a mark is also drawn at, for the mirroring in hand. */
  const marksFor = (cell: Vector2D): Vector2D[] =>
    mirrorCells(slice(), cell, mirror().across, mirror().down);

  const describe = (index: number, drawing: string, taking: string) =>
    index === Bitmap.EMPTY ? taking : drawing;

  const extend = (from: Vector2D, to: Vector2D) => {
    for (const cell of strokeCells(slice(), from, to)) {
      stroke?.drawn.add(cellKey(cell));
    }
  };

  /**
   * The commands a stroke has earned, one per cell it drew and one per mark of
   * each, and nothing for a cell that already held what is being put in it.
   */
  const strokeCommands = (index: number): CommandType[] => {
    if (stroke === undefined) {
      return [];
    }
    const at = slice();
    const commands: CommandType[] = [];
    for (const cell of cellsOf(stroke.drawn)) {
      for (const mark of marksFor(cell)) {
        const { x, y, z } = sliceCell(at, mark.x, mark.y);
        const was = readIndex(at, x, y, z);
        if (was === index) {
          continue;
        }
        commands.push(
          index === Bitmap.EMPTY
            ? Command.eraseVoxel({ x, y, z })
            : Command.writeVoxel({ x, y, z }, index),
        );
      }
    }
    return commands;
  };

  const readIndex = (at: Slice, x: number, y: number, z: number) =>
    volume().voxels[
      z * volume().dimensions.width * volume().dimensions.height +
        y * volume().dimensions.width +
        x
    ];

  async function panAndZoom(
    event: PointerEvent & { currentTarget: HTMLCanvasElement },
  ) {
    panning = true;
    panFrom = Vector2D.create(event.clientX - pan.x, event.clientY - pan.y);
    previousSpan = undefined;

    await pointer(event, ({ event: move, pointers }) => {
      if (pointers.size > 1) {
        const [first, second] = [...pointers.values()];
        if (first !== undefined && second !== undefined) {
          const span = Math.hypot(first.x - second.x, first.y - second.y);
          if (span > 0) {
            scale = Math.max(
              0.5,
              Math.min(64, scale * (span / (previousSpan ?? span))),
            );
            previousSpan = span;
          }
        }
      }
      pan = Vector2D.create(
        move.clientX - panFrom!.x,
        move.clientY - panFrom!.y,
      );
      view();
    });

    panning = false;
    panFrom = undefined;
    previousSpan = undefined;
  }

  async function drawRectangle(
    event: PointerEvent & { currentTarget: HTMLCanvasElement },
    index: number,
  ) {
    const from = nearestDrawingCell(layout(), worldAt(event));
    block = { from, to: from };

    await pointer(event, ({ event: move }) => {
      if (block === undefined) {
        return;
      }
      block.to = nearestDrawingCell(layout(), worldAt(move));
      onDraw();
    });

    const drawn = block;
    block = undefined;
    if (drawn === undefined) {
      return;
    }

    const at = slice();
    const commands: CommandType[] = [];
    for (
      let v = Math.min(drawn.from.y, drawn.to.y);
      v <= Math.max(drawn.from.y, drawn.to.y);
      v++
    ) {
      for (
        let u = Math.min(drawn.from.x, drawn.to.x);
        u <= Math.max(drawn.from.x, drawn.to.x);
        u++
      ) {
        for (const mark of marksFor(Vector2D.create(u, v))) {
          const { x, y, z } = sliceCell(at, mark.x, mark.y);
          if (readIndex(at, x, y, z) === index) {
            continue;
          }
          commands.push(
            index === Bitmap.EMPTY
              ? Command.eraseVoxel({ x, y, z })
              : Command.writeVoxel({ x, y, z }, index),
          );
        }
      }
    }

    if (commands.length > 0) {
      doCommand(
        commands.length === 1 ? commands[0] : Command.sequence(commands),
        describe(index, "Fill Block", "Erase Block"),
      );
    }
  }

  return {
    layout,
    pan: () => pan,
    scale: () => scale,

    stroke: () =>
      stroke === undefined
        ? undefined
        : { from: stroke.from, cells: cellsOf(stroke.drawn) },

    block: () => block,

    panning: () => panning,

    onPointerOut: () => {
      hovered = undefined;
      onHover(undefined);
    },

    onWheel: (event) => {
      // A wheel with the shift key held steps through the slices, and one
      // without zooms: on a trackpad both are common, and neither should be
      // reachable by accident.
      if (event.shiftKey) {
        onSlice(slice().at + (event.deltaY < 0 ? 1 : -1));
        return;
      }
      scale = Math.max(
        0.5,
        Math.min(64, scale * Math.pow(1.1, -Math.sign(event.deltaY))),
      );
      view();
    },

    onPointerMove: (event) => {
      const world = worldAt(event);

      if (panning) {
        return;
      }

      if (stroke !== undefined) {
        const cell = nearestDrawingCell(layout(), world);
        hovered = cell;
        onHover(cell);
        extend(stroke.last, cell);
        stroke.last = cell;
        onDraw();
        return;
      }

      if (block !== undefined) {
        block.to = nearestDrawingCell(layout(), world);
        onDraw();
        return;
      }

      const hit = pressAt(volume(), plane(), slice().at, world);
      hovered = hit?.kind === "cell" ? hit.cell : undefined;
      onHover(hovered);
    },

    onPointerDown: async (event) => {
      const gesture = gestureFor(
        mode(),
        event.isPrimary ? 1 : 2,
        event.pointerType as "mouse" | "touch" | "pen",
      );
      const world = worldAt(event);
      const hit = pressAt(volume(), plane(), slice().at, world);

      if (gesture === "pan" || hit === undefined) {
        await panAndZoom(event);
        return;
      }

      if (hit.kind === "slice") {
        onSlice(hit.at);
        return;
      }

      const index = paletteIndex();
      const cell = hit.cell;

      if (mode() === "Pick") {
        const { x, y, z } = sliceCell(slice(), cell.x, cell.y);
        onPick(readIndex(slice(), x, y, z));
        return;
      }

      if (mode() === "Fill") {
        const { x, y, z } = sliceCell(slice(), cell.x, cell.y);
        doCommand(
          Command.fillVoxel({ x, y, z }, plane(), index),
          describe(index, "Fill", "Erase"),
        );
        return;
      }

      if (mode() === "Rectangle") {
        await drawRectangle(event, index);
        return;
      }

      stroke = { from: cell, last: cell, drawn: new Set([cellKey(cell)]) };
      onDraw();

      await pointer(event, ({ event: move }) => {
        if (stroke === undefined) {
          return;
        }
        const next = nearestDrawingCell(layout(), worldAt(move));
        hovered = next;
        onHover(next);
        extend(stroke.last, next);
        stroke.last = next;
        onDraw();
      });

      const commands = strokeCommands(index);
      stroke = undefined;
      onDraw();
      if (commands.length > 0) {
        doCommand(
          commands.length === 1 ? commands[0] : Command.sequence(commands),
          describe(index, "Draw", "Erase"),
        );
      }
    },
  };
}
