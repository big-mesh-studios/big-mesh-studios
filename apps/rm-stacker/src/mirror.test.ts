import { describe, expect, it } from "vitest";
import { mirrorPositions, mirrorRectangles, NO_MIRROR } from "./mirror";

const ODD = { width: 5, height: 5 };
const EVEN = { width: 4, height: 4 };

describe("mirrorPositions", () => {
  it("leaves a mark where it was put when neither axis is mirrored", () => {
    expect(mirrorPositions(NO_MIRROR, ODD, { x: 1, y: 2 })).toEqual([
      { x: 1, y: 2 },
    ]);
  });

  it("reflects across the vertical middle on the horizontal axis", () => {
    expect(mirrorPositions({ x: true, y: false }, ODD, { x: 1, y: 2 })).toEqual(
      [
        { x: 1, y: 2 },
        { x: 3, y: 2 },
      ],
    );
  });

  it("reflects across the horizontal middle on the vertical axis", () => {
    expect(mirrorPositions({ x: false, y: true }, ODD, { x: 1, y: 0 })).toEqual(
      [
        { x: 1, y: 0 },
        { x: 1, y: 4 },
      ],
    );
  });

  it("covers all four quarters when both axes are mirrored", () => {
    expect(mirrorPositions({ x: true, y: true }, EVEN, { x: 0, y: 1 })).toEqual(
      [
        { x: 0, y: 1 },
        { x: 3, y: 1 },
        { x: 0, y: 2 },
        { x: 3, y: 2 },
      ],
    );
  });

  it("lists a mark on an odd panel's middle column once", () => {
    expect(mirrorPositions({ x: true, y: false }, ODD, { x: 2, y: 1 })).toEqual(
      [{ x: 2, y: 1 }],
    );
  });

  it("lists a mark on an odd panel's middle cell once", () => {
    expect(mirrorPositions({ x: true, y: true }, ODD, { x: 2, y: 2 })).toEqual([
      { x: 2, y: 2 },
    ]);
  });
});

describe("mirrorRectangles", () => {
  const rectangle = { min: { x: 0, y: 0 }, max: { x: 1, y: 2 } };

  it("leaves a block where it was drawn when neither axis is mirrored", () => {
    expect(mirrorRectangles(NO_MIRROR, ODD, rectangle)).toEqual([rectangle]);
  });

  it("swaps a block's ends when it reflects it", () => {
    expect(mirrorRectangles({ x: true, y: false }, ODD, rectangle)).toEqual([
      rectangle,
      { min: { x: 3, y: 0 }, max: { x: 4, y: 2 } },
    ]);
  });

  it("lists a block that already spans the panel once", () => {
    const across = { min: { x: 0, y: 1 }, max: { x: 4, y: 1 } };
    expect(mirrorRectangles({ x: true, y: false }, ODD, across)).toEqual([
      across,
    ]);
  });

  it("covers all four quarters when both axes are mirrored", () => {
    expect(mirrorRectangles({ x: true, y: true }, EVEN, rectangle)).toEqual([
      rectangle,
      { min: { x: 2, y: 0 }, max: { x: 3, y: 2 } },
      { min: { x: 0, y: 1 }, max: { x: 1, y: 3 } },
      { min: { x: 2, y: 1 }, max: { x: 3, y: 3 } },
    ]);
  });
});
