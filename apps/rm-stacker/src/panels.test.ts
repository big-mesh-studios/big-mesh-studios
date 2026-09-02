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
  computePanelLabels,
  computePanelPositions,
  computeSliceLayouts,
  computeSliceMarkers,
  withPadding,
  zipLanes,
} from "./PixelEditorView/side-layout";
import {
  blockAcrossTheRun,
  cellAcrossTheRun,
  cutFromPanelLine,
  cutSection,
  panelLabel,
  panelLineFromCut,
  panelTable,
  sectionLines,
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

describe("panelLineFromCut", () => {
  it("puts a cut back where the line that made it was drawn", () => {
    // Whatever line a panel is cut along, reading the cut back onto that panel
    // lands on the line it was drawn at.
    for (const drawnLike of sideKinds) {
      for (const along of ["x", "y"] as const) {
        for (const line of [1, 2, 3]) {
          const cut = cutFromPanelLine({
            drawnLike,
            axis: along,
            line,
            dimensions: DIMENSIONS,
          });

          expect(
            panelLineFromCut({
              drawnLike,
              axis: cut.axis,
              at: cut.at,
              dimensions: DIMENSIONS,
            }),
            `${drawnLike} cut along ${along} at ${line}`,
          ).toEqual({ along, line });
        }
      }
    }
  });

  it("says nothing for a panel the cut does not cross", () => {
    // The left is drawn depth across and height down, and does not span the
    // width, so a cut across the width does not show on it.
    expect(
      panelLineFromCut({
        drawnLike: "left",
        axis: "width",
        at: 2,
        dimensions: DIMENSIONS,
      }),
    ).toBeUndefined();
  });
});

describe("sectionLines", () => {
  it("shows a cut on the four panels that span the axis it crosses", () => {
    const part = partOf(acrossTheWidth(2));

    // The front and the top span the width and carry the cut; the left and the
    // right look along it and do not.
    expect(sectionLines(part, "front", DIMENSIONS)).toEqual([
      { along: "x", line: 2, axis: "width" },
    ]);
    expect(sectionLines(part, "top", DIMENSIONS)).toEqual([
      { along: "x", line: 2, axis: "width" },
    ]);
    expect(sectionLines(part, "left", DIMENSIONS)).toEqual([]);
    expect(sectionLines(part, "right", DIMENSIONS)).toEqual([]);
  });

  it("shows it on the panel looking the other way, measured from that side", () => {
    const part = partOf(acrossTheWidth(2));

    expect(sectionLines(part, "back", DIMENSIONS)).toEqual([
      { along: "x", line: DIMENSIONS.width - 2, axis: "width" },
    ]);
  });

  it("shows a cut across one axis on the faces of a cut across another", () => {
    const part = partOf(acrossTheWidth(2), {
      axis: "height",
      at: 3,
      before: Bitmap.create(DIMENSIONS.width, DIMENSIONS.depth),
      after: Bitmap.create(DIMENSIONS.width, DIMENSIONS.depth),
    });

    // A cut across the height has faces drawn the way the top and bottom are,
    // width across and depth down, so the cut across the width stands on them.
    expect(sectionLines(part, "section-1-before", DIMENSIONS)).toEqual([
      { along: "x", line: 2, axis: "width" },
    ]);
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

describe("computeSliceLayouts and computeSliceMarkers", () => {
  const part = partOf(acrossTheWidth(2));

  it("gives each slice a box under the net, numbered from one", () => {
    const [slice] = computeSliceLayouts(part, DIMENSIONS);

    expect(slice.number).toBe("1");
    expect(slice.axis).toBe("width");
    // Below the bottom panel, which is the lowest thing in the net.
    expect(slice.box.min.y).toBeGreaterThan(
      DIMENSIONS.height + DIMENSIONS.depth,
    );
    // Wide enough for the two faces side by side, and its number stands inside
    // the corner rather than on top of it.
    expect(slice.box.max.x - slice.box.min.x).toBeGreaterThan(
      DIMENSIONS.depth * 2,
    );
    expect(slice.label.min).toEqual(slice.box.min);
  });

  it("stands both faces of the slice inside its box", () => {
    const [slice] = computeSliceLayouts(part, DIMENSIONS);
    const positions = computePanelPositions(part, DIMENSIONS);

    for (const face of ["section-0-before", "section-0-after"] as const) {
      const at = positions[face]!;

      expect(at.x).toBeGreaterThanOrEqual(slice.box.min.x);
      expect(at.y).toBeGreaterThanOrEqual(slice.box.min.y);
      expect(at.x + DIMENSIONS.depth).toBeLessThanOrEqual(slice.box.max.x);
      expect(at.y + DIMENSIONS.height).toBeLessThanOrEqual(slice.box.max.y);
    }
  });

  it("stands a square for taking the cut away on the corner opposite its number", () => {
    const [slice] = computeSliceLayouts(part, DIMENSIONS);

    expect(slice.remove.max.x - slice.remove.min.x).toBe(
      slice.remove.max.y - slice.remove.min.y,
    );
    expect(slice.remove.max.x).toBe(slice.box.max.x);
    expect(slice.remove.min.y).toBe(slice.box.min.y);
    // Standing clear of the number at the other corner.
    expect(slice.remove.min.x).toBeGreaterThan(slice.label.max.x);
  });

  it("stacks a second slice under the first", () => {
    const [first, second] = computeSliceLayouts(
      partOf(acrossTheWidth(2), acrossTheWidth(3)),
      DIMENSIONS,
    );

    expect(second.number).toBe("2");
    expect(second.box.min.y).toBeGreaterThan(first.box.max.y);
  });

  it("marks the cut outside every side it crosses, and none of the others", () => {
    const positions = computePanelPositions(part, DIMENSIONS);
    const markers = computeSliceMarkers(part, DIMENSIONS, positions);

    // A cut across the width crosses the four sides that span it.
    expect(markers.length).toBe(4);
    expect(markers.every((marker) => marker.number === "1")).toBe(true);

    // Above the front panel, at the line it cuts along.
    const front = markers.find(
      (marker) => marker.box.min.y < positions.front.y,
    )!;

    // Standing on the cut, which is two voxels along the front panel, and
    // halfway across the space between that panel and the one above it.
    expect((front.box.min.x + front.box.max.x) / 2).toBe(positions.front.x + 2);
    expect((front.box.min.y + front.box.max.y) / 2).toBe(positions.front.y - 3);
  });

  it("steps two numbers a voxel apart out into lanes, each on its own cut", () => {
    const crowded = partOf(acrossTheWidth(2), acrossTheWidth(3));
    const positions = computePanelPositions(crowded, DIMENSIONS);
    const above = computeSliceMarkers(crowded, DIMENSIONS, positions).filter(
      (marker) => marker.box.max.y <= positions.front.y,
    );
    // The lanes closest to the front panel are the front panel's own: the top
    // panel spans the width as well, and is marked further up again.
    const nearest = Math.max(...above.map((marker) => marker.box.max.y));
    const [first, second] = above
      .filter((marker) => marker.box.max.y >= nearest - 2)
      .sort((one, other) => one.box.min.x - other.box.min.x);

    const middleOf = (box: { min: { x: number }; max: { x: number } }) =>
      (box.min.x + box.max.x) / 2;

    // Neither has moved off the cut it belongs to, and each is joined to the
    // panel's edge where that cut meets it.
    expect(middleOf(first.box)).toBe(positions.front.x + 2);
    expect(middleOf(second.box)).toBe(positions.front.x + 3);
    expect(first.at).toEqual({
      x: positions.front.x + 2,
      y: positions.front.y,
    });
    expect(second.at).toEqual({
      x: positions.front.x + 3,
      y: positions.front.y,
    });
    // The second stands a lane further out, so the circles clear each other,
    // and the two lanes together stand halfway across the space beside the
    // panel rather than the near one taking the middle for itself.
    expect(first.box.max.y - second.box.max.y).toBe(2);
    expect((second.box.min.y + first.box.max.y) / 2).toBe(
      positions.front.y - 3,
    );
    expect(first.number).toBe("1");
    expect(second.number).toBe("2");
  });
});

describe("computePanelLabels", () => {
  const part = partOf(acrossTheWidth(2));
  const positions = computePanelPositions(part, DIMENSIONS);
  const labels = computePanelLabels(part, positions);

  it("names every drawing the part is made of, sides and faces alike", () => {
    expect(labels.map((label) => label.panel)).toEqual([
      ...sideKinds,
      "section-0-before",
      "section-0-after",
    ]);
  });

  it("stands a name under the panel it names, as wide as that panel", () => {
    const front = labels.find((label) => label.panel === "front")!;

    expect(front.box.min).toEqual({
      x: positions.front.x,
      y: positions.front.y + DIMENSIONS.height,
    });
    expect(front.box.max.x).toBe(positions.front.x + DIMENSIONS.width);
    expect(front.box.max.y).toBeGreaterThan(front.box.min.y);
  });

  it("carries the panel itself, which is what its name brings into view", () => {
    const left = labels.find((label) => label.panel === "left")!;

    expect(left.panelBox).toEqual({
      min: positions.left,
      max: {
        x: positions.left.x + DIMENSIONS.depth,
        y: positions.left.y + DIMENSIONS.height,
      },
    });
  });
});

describe("withPadding", () => {
  it("grows a box by the space the net leaves around its panels", () => {
    const part = partOf(acrossTheWidth(2));
    const positions = computePanelPositions(part, DIMENSIONS);
    const front = computePanelLabels(part, positions).find(
      (label) => label.panel === "front",
    )!;
    const brought = withPadding(front.panelBox);

    // Wide enough to hold the numbers standing either side of the panel and
    // the name written under it, rather than the drawing on its own.
    const markers = computeSliceMarkers(part, DIMENSIONS, positions).filter(
      (marker) => marker.box.max.y <= positions.front.y,
    );
    const above = markers.sort(
      (one, other) => other.box.min.y - one.box.min.y,
    )[0];

    expect(brought.min.y).toBeLessThanOrEqual(above.box.min.y);
    expect(brought.max.y).toBeGreaterThanOrEqual(front.box.max.y);
  });
});

describe("zipLanes", () => {
  it("keeps everything in the near lane when there is room for it", () => {
    expect(zipLanes([0, 10, 20], 2)).toEqual([0, 0, 0]);
  });

  it("steps out and back again for a run of them standing too close", () => {
    expect(zipLanes([0, 1, 2, 3], 2)).toEqual([0, 1, 0, 1]);
  });

  it("takes the least lane that is free rather than the next one along", () => {
    // The third stands clear of the first, so it goes back to the near lane
    // even though the one before it did not.
    expect(zipLanes([0, 1, 4], 2)).toEqual([0, 1, 0]);
  });

  it("opens a third lane for three standing on top of each other", () => {
    expect(zipLanes([0, 0, 0], 2)).toEqual([0, 1, 2]);
  });
});
