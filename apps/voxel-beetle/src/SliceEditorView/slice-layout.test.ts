import { describe, expect, it } from "vitest";
import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import {
  createVolume,
  writeVoxel,
  type Plane,
} from "@big-mesh-studios/stacker/volume";
import {
  ABOVE,
  computeLayout,
  computeStripRows,
  drawingCell,
  layoutSize,
  nearestDrawingCell,
  pressAt,
  sliceOccupancy,
  STRIP_ROWS,
} from "./slice-layout";
import { sliceAt } from "@big-mesh-studios/stacker/volume";

const box = (width: number, height: number, depth: number) => ({
  width,
  height,
  depth,
});

const solid = (dimensions: ReturnType<typeof box>, count: number) => {
  const volume = createVolume(dimensions);
  for (let i = 0; i < count; i++) {
    writeVoxel(volume, i % dimensions.width, 0, 0, 1);
  }
  return volume;
};

describe("computeLayout", () => {
  it("puts the drawing to the left of the strip, with room between them", () => {
    const layout = computeLayout(sliceAt(box(10, 12, 8), "xy", 0));
    expect(layout.size).toEqual(Vector2D.create(10, 12));
    expect(layout.strip.at.x).toBeGreaterThan(layout.drawing.x + 10);
  });

  it("is nine rows tall whatever height the drawing is", () => {
    // The strip counts slices and the drawing counts cells: a box four voxels
    // deep is still worth being able to step four slices either side of.
    expect(computeLayout(sliceAt(box(10, 20, 8), "xy", 0)).strip.size.y).toBe(
      STRIP_ROWS,
    );
    expect(computeLayout(sliceAt(box(10, 4, 8), "xy", 0)).strip.size.y).toBe(
      STRIP_ROWS,
    );
  });

  it("centres the strip against the drawing, which it may stand taller than", () => {
    // Nine rows of slices centred on a drawing four cells tall stand above its
    // top edge and below its bottom one by the same half a row each.
    const tall = computeLayout(sliceAt(box(10, 4, 8), "xy", 0));
    const short = computeLayout(sliceAt(box(10, 20, 8), "xy", 0));
    for (const layout of [tall, short]) {
      const above = layout.strip.at.y - layout.drawing.y;
      const below =
        layout.drawing.y + layout.size.y - (layout.strip.at.y + STRIP_ROWS);
      expect(above).toBeCloseTo(below);
    }
    expect(tall.strip.at.y).toBeLessThan(tall.drawing.y);
  });
});

describe("layoutSize", () => {
  it("is the drawing and the strip and the margin around them", () => {
    const layout = computeLayout(sliceAt(box(10, 12, 8), "xy", 0));
    const size = layoutSize(layout);
    expect(size.x).toBeGreaterThanOrEqual(10);
    expect(size.y).toBeGreaterThanOrEqual(12);
  });
});

describe("drawingCell", () => {
  const layout = computeLayout(sliceAt(box(4, 3, 4), "xy", 0));

  it("is the cell a point lands in, measured from the drawing's corner", () => {
    const inside = Vector2D.add(layout.drawing, Vector2D.create(2, 1));
    expect(drawingCell(layout, inside)).toEqual(Vector2D.create(2, 1));
  });

  it("is a whole cell for a point between cells, which is where a pointer stands", () => {
    // A pointer on a canvas lands at a fractional number of cells, and every
    // point within one cell is that cell and not the one beside it.
    for (const within of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(
        drawingCell(
          layout,
          Vector2D.add(layout.drawing, Vector2D.create(2 + within, 1 + within)),
        ),
      ).toEqual(Vector2D.create(2, 1));
    }
  });

  it("is nothing where a point lands outside the drawing", () => {
    expect(drawingCell(layout, layout.drawing)).toEqual(Vector2D.create(0, 0));
    expect(
      drawingCell(layout, Vector2D.add(layout.drawing, Vector2D.create(-1, 0))),
    ).toBeUndefined();
    expect(
      drawingCell(layout, Vector2D.add(layout.drawing, Vector2D.create(4, 0))),
    ).toBeUndefined();
  });
});

describe("nearestDrawingCell", () => {
  const layout = computeLayout(sliceAt(box(4, 4, 4), "xy", 0));

  it("is the same cell a press on the point lands in, so a stroke starts where it was pressed", () => {
    const point = Vector2D.add(layout.drawing, Vector2D.create(2.6, 1.4));
    expect(nearestDrawingCell(layout, point)).toEqual(
      drawingCell(layout, point),
    );
    expect(nearestDrawingCell(layout, point)).toEqual(Vector2D.create(2, 1));
  });

  it("stays on the drawing for a point that has left it entirely", () => {
    const outside = Vector2D.add(layout.drawing, Vector2D.create(-40, 900));
    const cell = nearestDrawingCell(layout, outside);
    expect(cell.x).toBeGreaterThanOrEqual(0);
    expect(cell.x).toBeLessThan(4);
    expect(cell.y).toBeGreaterThanOrEqual(0);
    expect(cell.y).toBeLessThan(4);
  });
});

describe("computeStripRows", () => {
  const volume = solid(box(4, 4, 8), 4);
  const occupancy = () => 0.5;

  it("puts the slice in front of you in the middle of the strip", () => {
    const rows = computeStripRows(volume, "xy", 3, occupancy);
    expect(rows).toHaveLength(STRIP_ROWS);
    expect(rows[ABOVE].at).toBe(3);
    expect(rows[ABOVE].current).toBe(true);
  });

  it("puts the slices either side of it in order, before and after", () => {
    // Four either side of the one in front, in a box nine deep, which is the
    // most the strip has room for.
    const deep = solid(box(4, 4, 9), 4);
    const rows = computeStripRows(deep, "xy", 4, occupancy);
    expect(rows.map((row) => row.at)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("leaves the rows that run off the box empty, at either end", () => {
    // Four by four by four: four slices either way, and a strip nine rows long.
    const shallow = solid(box(4, 4, 4), 4);
    const low = computeStripRows(shallow, "xy", 0, occupancy);
    const high = computeStripRows(shallow, "xy", 3, occupancy);
    expect(low[ABOVE].at).toBe(0);
    expect(low[ABOVE - 1].at).toBeUndefined();
    expect(high[ABOVE].at).toBe(3);
    expect(high[ABOVE + 1].at).toBeUndefined();
  });

  it("keeps its shape at the ends, so the strip does not shrink towards them", () => {
    const rows = computeStripRows(volume, "xy", 0, occupancy);
    expect(rows).toHaveLength(STRIP_ROWS);
  });

  it("shows every slice of a box shallower than the strip, and no more", () => {
    // Four by four by four: four slices on every one of its three planes, and a
    // strip with room for nine.
    const shallow = solid(box(4, 4, 4), 4);
    for (const plane of ["xy", "yz", "zx"] as Plane[]) {
      const rows = computeStripRows(shallow, plane, 0, occupancy);
      expect(rows.filter((row) => row.at !== undefined).length).toBe(4);
    }
  });

  it("shows as many of a deeper box as the strip has rows for", () => {
    // Four by four by nine: nine slices, and a strip exactly nine rows long.
    const deep = solid(box(4, 4, 9), 4);
    const rows = computeStripRows(deep, "xy", 4, occupancy);
    expect(rows.filter((row) => row.at !== undefined).length).toBe(STRIP_ROWS);
  });

  it("counts the slices of the plane it is on, not the depth of the box", () => {
    // The xy plane is cut along the box's depth, so it has that many slices,
    // and the yz plane has as many as the box is wide however deep it is.
    const deep = solid(box(4, 4, 20), 4);
    expect(
      computeStripRows(deep, "xy", 10, occupancy).filter(
        (row) => row.at !== undefined,
      ).length,
    ).toBe(STRIP_ROWS);
    expect(
      computeStripRows(deep, "yz", 2, occupancy).filter(
        (row) => row.at !== undefined,
      ).length,
    ).toBe(4);
  });
});

describe("pressAt", () => {
  const volume = solid(box(4, 4, 4), 4);

  it("is a cell where a press lands on the drawing", () => {
    const layout = computeLayout(sliceAt(volume.dimensions, "xy", 0));
    const press = pressAt(
      volume,
      "xy",
      0,
      Vector2D.add(layout.drawing, Vector2D.create(1, 1)),
    );
    expect(press).toEqual({ kind: "cell", cell: Vector2D.create(1, 1) });
  });

  it("is a slice to go to where a press lands on a row of the strip", () => {
    const layout = computeLayout(sliceAt(volume.dimensions, "xy", 1));
    const press = pressAt(
      volume,
      "xy",
      1,
      Vector2D.add(layout.strip.at, Vector2D.create(1, ABOVE + 1)),
    );
    expect(press).toEqual({ kind: "slice", at: 2 });
  });

  it("is a slice to go to for a row above the middle as well as below", () => {
    const layout = computeLayout(sliceAt(volume.dimensions, "xy", 2));
    const press = pressAt(
      volume,
      "xy",
      2,
      Vector2D.add(layout.strip.at, Vector2D.create(1, ABOVE - 1)),
    );
    expect(press).toEqual({ kind: "slice", at: 1 });
  });

  it("is nothing on the row of the strip that is the slice already in front of you", () => {
    const layout = computeLayout(sliceAt(volume.dimensions, "xy", 1));
    expect(
      pressAt(
        volume,
        "xy",
        1,
        Vector2D.add(layout.strip.at, Vector2D.create(1, ABOVE)),
      ),
    ).toBeUndefined();
  });

  it("is nothing on a row of the strip that runs off the box", () => {
    // A box one slice deep has nowhere above or below the one in front, so every
    // row of the strip but that one is a press on nothing.
    const shallow = solid(box(4, 4, 1), 1);
    const layout = computeLayout(sliceAt(shallow.dimensions, "xy", 0));
    expect(
      pressAt(
        shallow,
        "xy",
        0,
        Vector2D.add(layout.strip.at, Vector2D.create(1, ABOVE - 1)),
      ),
    ).toBeUndefined();
    expect(
      pressAt(
        shallow,
        "xy",
        0,
        Vector2D.add(layout.strip.at, Vector2D.create(1, ABOVE + 1)),
      ),
    ).toBeUndefined();
  });

  it("is nothing off both the drawing and the strip", () => {
    expect(pressAt(volume, "xy", 0, Vector2D.create(-5, -5))).toBeUndefined();
  });
});

describe("sliceOccupancy", () => {
  it("is nothing at all for a slice with nothing in it", () => {
    expect(sliceOccupancy(createVolume(box(4, 4, 4)), "xy", 0)).toBe(0);
  });

  it("is everything for a slice that is full", () => {
    const volume = createVolume(box(4, 4, 4));
    volume.voxels.fill(1);
    expect(sliceOccupancy(volume, "xy", 0)).toBe(1);
  });

  it("is the fraction of the slice that has a voxel in it", () => {
    const volume = createVolume(box(4, 4, 4));
    writeVoxel(volume, 0, 0, 0, 1);
    expect(sliceOccupancy(volume, "xy", 0)).toBe(1 / 16);
  });

  it("counts a slice of one plane without counting the same voxel in another", () => {
    const volume = createVolume(box(4, 4, 4));
    writeVoxel(volume, 1, 1, 1, 1);
    // The voxel is in the front slice of the xy plane and the middle slice of
    // the yz plane, and in neither of the two slices either of those planes
    // puts it at.
    expect(sliceOccupancy(volume, "xy", 1)).toBe(1 / 16);
    expect(sliceOccupancy(volume, "xy", 0)).toBe(0);
    expect(sliceOccupancy(volume, "yz", 1)).toBe(1 / 16);
    expect(sliceOccupancy(volume, "zx", 1)).toBe(1 / 16);
  });

  it("leaves a slice with nothing in it at nothing however big the box is", () => {
    const volume = createVolume(box(64, 64, 64));
    expect(volume.voxels.every((i) => i === Bitmap.EMPTY)).toBe(true);
    expect(sliceOccupancy(volume, "xy", 32)).toBe(0);
  });
});
