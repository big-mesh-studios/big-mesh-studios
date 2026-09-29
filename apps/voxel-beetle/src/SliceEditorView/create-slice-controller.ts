// What a press on the slice canvas is for, and what it does once it is under way.
//
// The drawing on the canvas is one slice of the box, and everything here is a
// decision about cells of that slice. A stroke is a run of cells, a fill is the
// run of cells joined to the one pressed, and both end up as one command the
// history can take back as a single thing however many cells they cover.
import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import { createMemo, createSignal } from "solid-js";
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
  layoutSize,
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

/**
 * Where the drawing stands on the canvas: how many pixels a cell is drawn across,
 * and where the top-left corner of the layout is put down. A press is turned back
 * into a point of the layout by inverting exactly this, so what is drawn and what
 * is pressed on are the same picture seen from two ends.
 */
export interface Transform {
  /** How many pixels a cell is drawn across. */
  scale: number;
  /** Where the fit to the canvas alone would put the drawing. */
  centre: Vector2D;
  /** Where the drawing is put down, the fit and the view's own move apart. */
  at: Vector2D;
}

export interface SliceControllerParams {
  canvas(): HTMLCanvasElement | undefined;
  /** How large the canvas is in CSS pixels, or nothing before it has been measured. */
  size(): Vector2D | undefined;
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
  onDraw(): void;
}

export interface SliceController {
  layout(): Layout;
  transform(): Transform;
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
}

/** How many pixels a cell is across with the drawing fitted to the canvas. */
const fitScale = (whole: Vector2D, size: Vector2D) =>
  Math.min(size.x / whole.x, size.y / whole.y) * 0.94;

/**
 * How many pixels a cell is across at a zoom, held between the one pixel that
 * still shows a cell at all and the largest a cell is worth being drawn.
 */
const cellScale = (whole: Vector2D, size: Vector2D, zoom: number) =>
  Math.max(1, Math.min(64, fitScale(whole, size) * zoom));

/** Where the fit alone would put the drawing, with nothing zoomed or moved. */
const fittedAt = (whole: Vector2D, size: Vector2D, scale: number) =>
  Vector2D.create(
    (size.x - whole.x * scale) / 2,
    (size.y - whole.y * scale) / 2,
  );

/** How far the view may be zoomed in either direction from the fit. */
const ZOOM_LIMITS = { from: 0.5, to: 64 } as const;

const cellKey = ({ x, y }: Vector2D) => `${x},${y}`;

const cellsOf = (drawn: Set<string>) =>
  [...drawn].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return Vector2D.create(x, y);
  });

export function createSliceController({
  canvas,
  size: canvasSize,
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
  onDraw,
}: SliceControllerParams): SliceController {
  let stroke: Stroke | undefined;
  let block: { from: Vector2D; to: Vector2D } | undefined;
  let hovered: Vector2D | undefined;
  let panning = false;
  let pinch: { span: number; at: { clientX: number; clientY: number } } | undefined;

  // How far the view has been zoomed and moved away from the fit to the canvas.
  // Both are signals rather than remembered numbers because the drawing is read
  // back out of them to be painted: a zoom or a move that changed only what a
  // press meant, and not what is on the canvas, would be a view that cannot be
  // looked at.
  const [zoom, setZoom] = createSignal(1);
  const [pan, setPan] = createSignal(Vector2D.create(0, 0));

  const layout = () => computeLayout(slice());

  const transform = createMemo<Transform>(() => {
    const size = canvasSize();
    const whole = layoutSize(layout());
    if (size === undefined) {
      return {
        scale: 1,
        centre: Vector2D.create(0, 0),
        at: Vector2D.create(0, 0),
      };
    }
    const scale = cellScale(whole, size, zoom());
    const centre = fittedAt(whole, size, scale);
    return { scale, centre, at: Vector2D.add(centre, pan()) };
  });

  /** The point of the layout a press stands at. */
  const worldAt = (event: { clientX: number; clientY: number }): Vector2D => {
    const element = canvas();
    if (element === undefined) {
      return Vector2D.create(0, 0);
    }
    const rect = element.getBoundingClientRect();
    const { scale, at } = transform();
    return Vector2D.create(
      (event.clientX - rect.left - at.x) / scale,
      (event.clientY - rect.top - at.y) / scale,
    );
  };

  /**
   * The view put `from` of the layout back under `point` of the canvas, at a
   * zoom of `to`. This is what a drag carries the drawing along by, and what
   * keeps a cell under the wheel or under the middle of two fingers while the
   * view is being moved and changed in size about it, so that what is being
   * looked at does not slide out from under the thing looking at it.
   */
  const hold = (
    from: Vector2D,
    point: { clientX: number; clientY: number },
    to: number,
  ) => {
    const element = canvas();
    const size = canvasSize();
    if (element === undefined || size === undefined) {
      setZoom(to);
      return;
    }
    const rect = element.getBoundingClientRect();
    const whole = layoutSize(layout());
    const scale = cellScale(whole, size, to);
    const centre = fittedAt(whole, size, scale);
    setZoom(to);
    setPan(
      Vector2D.create(
        point.clientX - rect.left - from.x * scale - centre.x,
        point.clientY - rect.top - from.y * scale - centre.y,
      ),
    );
  };

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

  /**
   * A drag that is moving the view rather than drawing on it. One pointer carries
   * the drawing along under itself, and two fingers open it apart about the middle
   * of the two, each holding the point of the drawing that was under the gesture
   * still under it.
   */
  async function panAndZoom(
    event: PointerEvent & { currentTarget: HTMLCanvasElement },
  ) {
    panning = true;
    const grabbed = worldAt(event);
    pinch = undefined;

    await pointer(event, ({ event: move, pointers }) => {
      if (pointers.size > 1) {
        const [first, second] = [...pointers.values()];
        if (first !== undefined && second !== undefined) {
          const between = {
            clientX: (first.x + second.x) / 2,
            clientY: (first.y + second.y) / 2,
          };
          const span = Math.hypot(second.x - first.x, second.y - first.y);
          const previous = pinch;
          pinch = { span, at: between };
          if (previous !== undefined && previous.span > 0 && span > 0) {
            hold(
              worldAt(previous.at),
              between,
              Math.max(
                ZOOM_LIMITS.from,
                Math.min(ZOOM_LIMITS.to, zoom() * (span / previous.span)),
              ),
            );
            onDraw();
          }
          return;
        }
      }
      hold(grabbed, move, zoom());
      onDraw();
    });

    panning = false;
    pinch = undefined;
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
    transform,

    stroke: () =>
      stroke === undefined
        ? undefined
        : { from: stroke.from, cells: cellsOf(stroke.drawn) },

    block: () => block,

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
      hold(
        worldAt(event),
        event,
        Math.max(
          ZOOM_LIMITS.from,
          Math.min(
            ZOOM_LIMITS.to,
            zoom() * Math.pow(1.1, -Math.sign(event.deltaY)),
          ),
        ),
      );
      onDraw();
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
