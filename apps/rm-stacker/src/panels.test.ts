import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  centrePivot,
  sideAxes,
  sideKinds,
  solveVoxels,
  type Part,
  type Section,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { describe, expect, it } from "vitest";
import {
  blockAcrossTheRun,
  cellAcrossTheRun,
  cutFromPanelLine,
  cutSection,
  panelLabel,
  panelTable,
} from "./panels";

// A part five voxels wide, seven high and three deep, so that no two axes are
// the same length and a line read off the wrong one shows up as a wrong place.
const DIMENSIONS = { width: 5, height: 7, depth: 3 };

const sides = (): Sides =>
  Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      return [kind, Bitmap.create(DIMENSIONS[across], DIMENSIONS[down])];
    }),
  ) as Sides;

const partOf = (...sections: Section[]): Part => ({
  name: "body",
  sides: sides(),
  sections,
  root: Vector3D.create(),
  pivot: centrePivot(DIMENSIONS),
  parent: null,
});

/** A cut across the width, with faces the size the left and right are. */
const acrossTheWidth = (at: number): Section => ({
  axis: "width",
  at,
  before: Bitmap.create(DIMENSIONS.depth, DIMENSIONS.height),
  after: Bitmap.create(DIMENSIONS.depth, DIMENSIONS.height),
});

describe("cutFromPanelLine", () => {
  it("reads a line down the front panel as a cut across the width", () => {
    // The front counts the width up the way the panel does, so a line before
    // its second column stands two voxels from the low end.
    expect(
      cutFromPanelLine({
        drawnLike: "front",
        axis: "x",
        line: 2,
        dimensions: DIMENSIONS,
      }),
    ).toEqual({ axis: "width", at: 2 });
  });

  it("reads a line across the front panel as a cut across the height", () => {
    // The front is drawn with the top of the part at its top row, and the
    // height counts up from the bottom, so the line is measured from the far
    // end: two rows down a part seven high stands five voxels up.
    expect(
      cutFromPanelLine({
        drawnLike: "front",
        axis: "y",
        line: 2,
        dimensions: DIMENSIONS,
      }),
    ).toEqual({ axis: "height", at: 5 });
  });

  it("reads the same cut off the panel looking the other way", () => {
    // The back looks at the width from the other direction, so the cut two
    // voxels from the low end lies before its third column from the far side.
    expect(
      cutFromPanelLine({
        drawnLike: "back",
        axis: "x",
        line: 3,
        dimensions: DIMENSIONS,
      }),
    ).toEqual({ axis: "width", at: 2 });
  });

  it("reads a line down the left panel as a cut across the depth", () => {
    expect(
      cutFromPanelLine({
        drawnLike: "left",
        axis: "x",
        line: 1,
        dimensions: DIMENSIONS,
      }),
    ).toEqual({ axis: "depth", at: 2 });
  });

  it("reads a line across the top panel as a cut across the depth", () => {
    expect(
      cutFromPanelLine({
        drawnLike: "top",
        axis: "y",
        line: 1,
        dimensions: DIMENSIONS,
      }),
    ).toEqual({ axis: "depth", at: 2 });
  });
});

describe("panelTable", () => {
  it("lists the six sides of an uncut part and nothing else", () => {
    expect(panelTable(partOf()).kinds).toEqual([...sideKinds]);
  });

  it("lists a cut's two faces after the sides", () => {
    expect(panelTable(partOf(acrossTheWidth(2))).kinds).toEqual([
      ...sideKinds,
      "section-0-before",
      "section-0-after",
    ]);
  });

  it("draws a cut's faces the way the sides they parallel are drawn", () => {
    const table = panelTable(partOf(acrossTheWidth(2)));

    // A cut across the width is closed by a face looking the way the right
    // looks, and opened by one looking the way the left looks.
    expect(table.side("section-0-before")).toBe("right");
    expect(table.side("section-0-after")).toBe("left");
  });

  it("puts a cut's two faces opposite each other, being two sides of one plane", () => {
    const table = panelTable(partOf(acrossTheWidth(2)));

    expect(table.opposing("section-0-before")).toBe("section-0-after");
    expect(table.opposing("section-0-after")).toBe("section-0-before");
    expect(table.opposing("front")).toBe("back");
  });

  it("hands back the drawing each panel names, and nothing for a cut that is not there", () => {
    const part = partOf(acrossTheWidth(2));
    const table = panelTable(part);

    expect(table.bitmap("section-0-before")).toBe(part.sections[0].before);
    expect(table.bitmap("section-1-before")).toBeUndefined();
  });
});

describe("panelTable, across the run a face carves", () => {
  it("pairs the sides facing each other across an uncut axis", () => {
    const table = panelTable(partOf());

    expect(table.across("left")).toBe("right");
    expect(table.across("right")).toBe("left");
    expect(table.across("front")).toBe("back");
    expect(table.across("top")).toBe("bottom");
  });

  it("puts a cut's faces at the near end of each stretch it leaves", () => {
    const table = panelTable(partOf(acrossTheWidth(2)));

    expect(table.across("left")).toBe("section-0-before");
    expect(table.across("section-0-before")).toBe("left");
    expect(table.across("section-0-after")).toBe("right");
    expect(table.across("right")).toBe("section-0-after");
  });

  it("never pairs a cut's two faces, which bound stretches either side of it", () => {
    const table = panelTable(partOf(acrossTheWidth(2)));

    // Their being paired is what would carve both stretches at once, and an
    // undercut is exactly carving one and leaving the other.
    expect(table.across("section-0-before")).not.toBe("section-0-after");
    expect(table.across("section-0-after")).not.toBe("section-0-before");
  });

  it("chains the faces along an axis cut more than once, in the order they stand", () => {
    // Listed out of the order they stand in, to show the chain follows the
    // cuts along the axis rather than the order the part holds them.
    const table = panelTable(partOf(acrossTheWidth(3), acrossTheWidth(1)));

    expect(table.across("left")).toBe("section-1-before");
    expect(table.across("section-1-after")).toBe("section-0-before");
    expect(table.across("section-0-after")).toBe("right");
  });

  it("leaves a cut across another axis out of the chain", () => {
    const table = panelTable(
      partOf({
        axis: "height",
        at: 3,
        before: Bitmap.create(DIMENSIONS.width, DIMENSIONS.depth),
        after: Bitmap.create(DIMENSIONS.width, DIMENSIONS.depth),
      }),
    );

    expect(table.across("left")).toBe("right");
    expect(table.across("bottom")).toBe("section-0-before");
  });
});

describe("cellAcrossTheRun and blockAcrossTheRun", () => {
  it("counts the axis the two panels disagree about the other way about", () => {
    const table = panelTable(partOf());

    // The front and the back are five across; the front's leftmost column is
    // the back's rightmost, and both count their rows the same way.
    expect(cellAcrossTheRun(table, "front", { x: 1, y: 2 })).toEqual({
      panel: "back",
      position: { x: 3, y: 2 },
    });

    // The top and the bottom disagree about their rows rather than their
    // columns, and are three rows deep.
    expect(cellAcrossTheRun(table, "top", { x: 1, y: 0 })).toEqual({
      panel: "bottom",
      position: { x: 1, y: 2 },
    });
  });

  it("carries a cell onto the face a cut puts at the end of its run", () => {
    const table = panelTable(partOf(acrossTheWidth(2)));

    expect(cellAcrossTheRun(table, "left", { x: 0, y: 1 })).toEqual({
      panel: "section-0-before",
      position: { x: 2, y: 1 },
    });
  });

  it("takes a block's corners back to its lower and higher ends", () => {
    const table = panelTable(partOf());

    // Reading the block's own corners through the flip swaps its ends over.
    expect(
      blockAcrossTheRun(table, {
        panel: "front",
        min: { x: 0, y: 0 },
        max: { x: 1, y: 2 },
      }),
    ).toEqual({
      panel: "back",
      min: { x: 3, y: 0 },
      max: { x: 4, y: 2 },
    });
  });
});

describe("panelLabel", () => {
  it("calls a side by its own name", () => {
    expect(panelLabel(partOf(), "front")).toBe("front");
  });

  it("calls a cut's face by the way it looks and where the cut stands", () => {
    const part = partOf(acrossTheWidth(2));

    expect(panelLabel(part, "section-0-before")).toBe("right at 2");
    expect(panelLabel(part, "section-0-after")).toBe("left at 2");
  });
});

describe("cutSection", () => {
  /** A part with something drawn on every side, so that a carve shows. */
  const drawn = (...sections: Section[]): Part => {
    const part = partOf(...sections);

    for (const kind of sideKinds) {
      part.sides[kind].data.fill(1);
    }

    // A notch out of the front, so the shape is not simply the whole box.
    part.sides.front.data[2 * DIMENSIONS.width + 1] = Bitmap.EMPTY;

    return part;
  };

  const solved = (part: Part) =>
    solveVoxels(DIMENSIONS, part.sides, part.sections);

  it("leaves the part exactly the shape it was", () => {
    const part = drawn();
    const before = solved(part);

    part.sections.push(cutSection(part, "width", 2)!);

    expect(solved(part)).toEqual(before);
  });

  it("leaves it alone through a second cut across the same axis", () => {
    const part = drawn();
    const before = solved(part);

    for (const at of [3, 1, 2]) {
      part.sections.push(cutSection(part, "width", at)!);
    }

    expect(solved(part)).toEqual(before);
  });

  it("leaves it alone through cuts across every axis at once", () => {
    const part = drawn();
    const before = solved(part);

    part.sections.push(cutSection(part, "width", 2)!);
    part.sections.push(cutSection(part, "height", 3)!);
    part.sections.push(cutSection(part, "depth", 1)!);

    expect(solved(part)).toEqual(before);
  });

  it("carves one stretch of an axis and leaves the next standing", () => {
    const part = drawn();
    part.sections.push(cutSection(part, "width", 2)!);

    // Erasing the whole face that opens the run after the cut takes that run
    // away and leaves everything before it where it was.
    part.sections[0].after.data.fill(Bitmap.EMPTY);

    const voxels = solved(part);
    const isSolid = (x: number, y: number, z: number) =>
      voxels[
        (z * DIMENSIONS.width * DIMENSIONS.height + y * DIMENSIONS.width + x) *
          4 +
          3
      ] !== 0;

    expect(isSolid(1, 1, 1)).toBe(true);
    expect(isSolid(3, 1, 1)).toBe(false);
  });

  it("makes no cut outside the box, or where the part is already cut", () => {
    const part = drawn();

    expect(cutSection(part, "width", 0)).toBeUndefined();
    expect(cutSection(part, "width", DIMENSIONS.width)).toBeUndefined();

    part.sections.push(cutSection(part, "width", 2)!);

    expect(cutSection(part, "width", 2)).toBeUndefined();
  });
});
