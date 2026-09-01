import { Bitmap } from "@big-mesh-studios/maths";
import { type Sides } from "@big-mesh-studios/stacker/renderer";
import { describe, expect, it } from "vitest";
import { NO_MIRROR, mirrorBlocks, mirrorMarks } from "./mirror";
import { Mirror } from "./types";

// A part five voxels wide, five high and three deep, so that a panel carrying
// the depth axis is a different size from one carrying the width — enough for a
// reflection that lands on the wrong panel to show up as a wrong coordinate.
const SIDES: Sides = {
  front: Bitmap.create(5, 5),
  back: Bitmap.create(5, 5),
  left: Bitmap.create(3, 5),
  right: Bitmap.create(3, 5),
  top: Bitmap.create(5, 3),
  bottom: Bitmap.create(5, 3),
};

const mirror = (over: Partial<Mirror>): Mirror => ({ ...NO_MIRROR, ...over });

const panel = (x: boolean, y: boolean) => mirror({ panel: { x, y } });

const opposing = mirror({ opposing: true });

const marks = (_mirror: Mirror, side: keyof Sides, x: number, y: number) =>
  mirrorMarks(_mirror, SIDES, { side, position: { x, y } });

describe("mirrorMarks, reflecting within the panel", () => {
  it("leaves a mark where it was put when nothing is mirrored", () => {
    expect(marks(NO_MIRROR, "front", 1, 2)).toEqual([
      { side: "front", position: { x: 1, y: 2 } },
    ]);
  });

  it("reflects across the panel's vertical middle", () => {
    expect(marks(panel(true, false), "front", 1, 2)).toEqual([
      { side: "front", position: { x: 1, y: 2 } },
      { side: "front", position: { x: 3, y: 2 } },
    ]);
  });

  it("reflects across the panel's horizontal middle", () => {
    expect(marks(panel(false, true), "front", 1, 0)).toEqual([
      { side: "front", position: { x: 1, y: 0 } },
      { side: "front", position: { x: 1, y: 4 } },
    ]);
  });

  it("covers all four quarters when both panel axes are mirrored", () => {
    expect(marks(panel(true, true), "front", 1, 0)).toEqual([
      { side: "front", position: { x: 1, y: 0 } },
      { side: "front", position: { x: 3, y: 0 } },
      { side: "front", position: { x: 1, y: 4 } },
      { side: "front", position: { x: 3, y: 4 } },
    ]);
  });

  it("stays on the panel it was drawn on", () => {
    const sides = marks(panel(true, true), "left", 0, 0).map(
      (mark) => mark.side,
    );
    expect(new Set(sides)).toEqual(new Set(["left"]));
  });

  it("lists a mark on the panel's middle cell once", () => {
    expect(marks(panel(true, true), "front", 2, 2)).toEqual([
      { side: "front", position: { x: 2, y: 2 } },
    ]);
  });

  it("reflects within a panel using that panel's own size", () => {
    // The left panel is three cells across, not five like the front panel.
    expect(marks(panel(true, false), "left", 0, 1)).toEqual([
      { side: "left", position: { x: 0, y: 1 } },
      { side: "left", position: { x: 2, y: 1 } },
    ]);
  });
});

describe("mirrorMarks, reflecting onto the opposing panel", () => {
  it("carries a mark on the front panel to the back one", () => {
    expect(marks(opposing, "front", 1, 2)).toEqual([
      { side: "front", position: { x: 1, y: 2 } },
      { side: "back", position: { x: 3, y: 2 } },
    ]);
  });

  it("carries a mark on the back panel to the front one", () => {
    expect(marks(opposing, "back", 3, 2)).toEqual([
      { side: "back", position: { x: 3, y: 2 } },
      { side: "front", position: { x: 1, y: 2 } },
    ]);
  });

  it("carries a mark on the top panel to the bottom one", () => {
    expect(marks(opposing, "top", 1, 0)).toEqual([
      { side: "top", position: { x: 1, y: 0 } },
      { side: "bottom", position: { x: 1, y: 2 } },
    ]);
  });

  it("carries a mark on the left panel to the right one", () => {
    expect(marks(opposing, "left", 0, 1)).toEqual([
      { side: "left", position: { x: 0, y: 1 } },
      { side: "right", position: { x: 2, y: 1 } },
    ]);
  });

  it("carrying a mark back returns it to where it began", () => {
    for (const side of [
      "front",
      "back",
      "left",
      "right",
      "top",
      "bottom",
    ] as const) {
      const [origin, carried] = marks(opposing, side, 0, 0);

      expect(carried).toBeDefined();
      expect(mirrorMarks(opposing, SIDES, carried)).toEqual([carried, origin]);
    }
  });

  it("reaches all four cells alongside a panel reflection", () => {
    expect(
      marks(
        mirror({ panel: { x: true, y: false }, opposing: true }),
        "left",
        0,
        1,
      ),
    ).toEqual([
      { side: "left", position: { x: 0, y: 1 } },
      { side: "left", position: { x: 2, y: 1 } },
      { side: "right", position: { x: 2, y: 1 } },
      { side: "right", position: { x: 0, y: 1 } },
    ]);
  });
});

describe("mirrorBlocks", () => {
  const block = {
    side: "front" as const,
    min: { x: 0, y: 0 },
    max: { x: 1, y: 2 },
  };

  it("leaves a block where it was drawn when nothing is mirrored", () => {
    expect(mirrorBlocks(NO_MIRROR, SIDES, block)).toEqual([block]);
  });

  it("swaps a block's ends when it reflects it", () => {
    expect(mirrorBlocks(panel(true, false), SIDES, block)).toEqual([
      block,
      { side: "front", min: { x: 3, y: 0 }, max: { x: 4, y: 2 } },
    ]);
  });

  it("lists a block that already spans the panel once", () => {
    const across = {
      side: "front" as const,
      min: { x: 0, y: 1 },
      max: { x: 4, y: 1 },
    };
    expect(mirrorBlocks(panel(true, false), SIDES, across)).toEqual([across]);
  });

  it("carries a block to the panel opposite it", () => {
    expect(mirrorBlocks(opposing, SIDES, block)).toEqual([
      block,
      { side: "back", min: { x: 3, y: 0 }, max: { x: 4, y: 2 } },
    ]);
  });
});
