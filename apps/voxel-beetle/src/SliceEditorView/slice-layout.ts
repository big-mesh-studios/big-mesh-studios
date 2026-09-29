// Where the slice being drawn stands on the canvas, and what stands beside it.
//
// Everything here is a function of the box's dimensions and the slice chosen, so
// a box that is resized lays the drawing out again from the same numbers rather
// than from anything remembered about how it was last drawn.
import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import {
  planeSliceCount,
  readSlice,
  sliceAt,
  type Plane,
  type Slice,
  type Volume,
} from "@big-mesh-studios/stacker/volume";

/** The gap between the drawing and the strip, in cells. */
const STRIP_GAP = 3;

/** How wide the strip is, in cells. */
export const STRIP_WIDTH = 3;

/**
 * How many slices the strip shows, the one in front of you in the middle of
 * them. It is a fixed number rather than one a slice, because a model three
 * hundred voxels deep cannot be shown as three hundred rows of anything.
 */
export const STRIP_ROWS = 9;

/** How far above the middle of the strip the middle of the strip's run starts. */
const ABOVE = (STRIP_ROWS - 1) / 2;

/** How much room the strip and the drawing between them take to the right. */
const MARGIN = 2;

export interface Layout {
  /** Where the drawing's own top-left cell stands. */
  drawing: Vector2D;
  /** How far across and down the drawing is, in cells. */
  size: Vector2D;
  /** Where the strip stands, and how far it runs. */
  strip: { at: Vector2D; size: Vector2D };
}

/** The box the drawing and its strip together occupy. */
export interface Block {
  min: Vector2D;
  max: Vector2D;
}

/** Where everything stands for a slice, and how big the whole of it is. */
export function computeLayout(slice: Slice): Layout {
  const size = Vector2D.create(slice.width, slice.height);
  return {
    drawing: Vector2D.create(MARGIN, MARGIN),
    size,
    strip: {
      at: Vector2D.create(
        MARGIN + size.x + STRIP_GAP,
        MARGIN + (size.y - STRIP_ROWS) / 2,
      ),
      // As many rows as there are slices to show, whatever height the drawing
      // is: the strip counts slices and the drawing counts cells, and a box four
      // voxels deep is still worth stepping four slices either side of.
      size: Vector2D.create(STRIP_WIDTH, STRIP_ROWS),
    },
  };
}

/** How far across and down the whole of it is, in cells. */
export function layoutSize(layout: Layout): Vector2D {
  return Vector2D.create(
    layout.strip.at.x + layout.strip.size.x + MARGIN,
    Math.max(
      layout.drawing.y + layout.size.y,
      layout.strip.at.y + layout.strip.size.y,
    ) + MARGIN,
  );
}

/** Whether a cell is inside a block. */
export function blockContains(block: Block, cell: Vector2D): boolean {
  return (
    cell.x >= block.min.x &&
    cell.y >= block.min.y &&
    cell.x <= block.max.x &&
    cell.y <= block.max.y
  );
}

/**
 * The cell of the drawing a world position lands in, or undefined where it lands
 * outside it. A world position is a point on the canvas measured in cells from
 * the drawing's own top-left corner, which is the way a drawing's rows run: down
 * and to the right.
 *
 * The point a pointer stands at is almost never on a cell boundary, so this is
 * the cell that contains the point rather than the distance to a cell's corner.
 */
export function drawingCell(
  layout: Layout,
  world: Vector2D,
): Vector2D | undefined {
  const cell = Vector2D.create(
    Math.floor(world.x - layout.drawing.x),
    Math.floor(world.y - layout.drawing.y),
  );
  return cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < layout.size.x &&
    cell.y < layout.size.y
    ? cell
    : undefined;
}

/**
 * The cell of the drawing a world position lands in, for a drag in flight, held
 * on the drawing where the point has left it entirely. This is the same cell a
 * press on the same point lands in, so that a stroke begins where it was pressed
 * and a press and a release in the same place are one cell rather than two.
 */
export function nearestDrawingCell(layout: Layout, world: Vector2D): Vector2D {
  return Vector2D.create(
    Math.max(
      0,
      Math.min(layout.size.x - 1, Math.floor(world.x - layout.drawing.x)),
    ),
    Math.max(
      0,
      Math.min(layout.size.y - 1, Math.floor(world.y - layout.drawing.y)),
    ),
  );
}

/** The world position of a cell of the drawing, for a preview drawn over it. */
export function cellWorld(layout: Layout, cell: Vector2D): Vector2D {
  return Vector2D.create(layout.drawing.x + cell.x, layout.drawing.y + cell.y);
}

/**
 * One row of the strip: the slice it stands for, or nothing where the strip has
 * run off either end of the box, and how much of that slice has anything in it.
 */
export interface StripRow {
  /** The slice this row stands for, or undefined where there is no such slice. */
  at: number | undefined;
  min: Vector2D;
  max: Vector2D;
  /** Whether this is the slice in front of you. */
  current: boolean;
  /** How much of the slice has a voxel in it, zero to one. */
  occupancy: number;
}

/**
 * The strip's rows, one a slice, for the slices either side of the one in front
 * of you. A row past either end of the box is still drawn, so the strip keeps
 * its shape at the ends of the model rather than shrinking towards them.
 */
export function computeStripRows(
  volume: Volume,
  plane: Plane,
  at: number,
  occupancy: (at: number) => number,
): StripRow[] {
  const layout = computeLayout(sliceAt(volume.dimensions, plane, at));
  const count = planeSliceCount(volume.dimensions, plane);
  const rows: StripRow[] = [];

  for (let row = 0; row < STRIP_ROWS; row++) {
    const target = at + row - ABOVE;
    const inside = target >= 0 && target < count;
    const y = layout.strip.at.y + row;
    rows.push({
      at: inside ? target : undefined,
      min: Vector2D.create(layout.strip.at.x, y),
      max: Vector2D.create(layout.strip.at.x + layout.strip.size.x, y + 1),
      current: inside && target === at,
      occupancy: inside ? occupancy(target) : 0,
    });
  }

  return rows;
}

/** What a press on the canvas lands on: a cell of the slice, or a slice to go to. */
export type Press =
  { kind: "cell"; cell: Vector2D } | { kind: "slice"; at: number };

export function pressAt(
  volume: Volume,
  plane: Plane,
  at: number,
  world: Vector2D,
): Press | undefined {
  const slice = sliceAt(volume.dimensions, plane, at);
  const layout = computeLayout(slice);
  const count = planeSliceCount(volume.dimensions, plane);

  const onStrip =
    world.x >= layout.strip.at.x &&
    world.x <= layout.strip.at.x + layout.strip.size.x;
  if (onStrip) {
    const row = Math.floor(world.y - layout.strip.at.y);
    const target = at + row - ABOVE;
    if (
      row >= 0 &&
      row < STRIP_ROWS &&
      target >= 0 &&
      target < count &&
      target !== at
    ) {
      return { kind: "slice", at: target };
    }
    return undefined;
  }

  const cell = drawingCell(layout, world);
  return cell === undefined ? undefined : { kind: "cell", cell };
}

/**
 * How much of a slice has a voxel in it, zero to one. The strip is drawn to show
 * where the model has anything at all, so a slice with one voxel in it reads as
 * almost empty rather than as full.
 */
export function sliceOccupancy(
  volume: Volume,
  plane: Plane,
  at: number,
): number {
  const slice = sliceAt(volume.dimensions, plane, at);
  let filled = 0;
  for (let v = 0; v < slice.height; v++) {
    for (let u = 0; u < slice.width; u++) {
      if (readSlice(volume, slice, u, v) !== Bitmap.EMPTY) {
        filled++;
      }
    }
  }
  const cells = slice.width * slice.height;
  return cells === 0 ? 0 : filled / cells;
}

export { STRIP_GAP, MARGIN, ABOVE };
