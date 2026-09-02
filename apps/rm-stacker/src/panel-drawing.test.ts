import { Bitmap, Vector3D, type RGBA } from "@big-mesh-studios/maths";
import {
  axisSides,
  dimensionAxes,
  facingAxis,
  sideAxes,
  sideKinds,
  solveVoxels,
  type DimensionKind,
  type SideKind,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { describe, expect, it } from "vitest";
import { drawingFlip, drawingPicture } from "./panel-drawing";
import { AGAINST, type Picture } from "./standing-plane";

// A part five voxels wide, seven high and three deep, so that no two axes are
// the same length and a cell put on the wrong one shows up as a wrong place.
const DIMENSIONS = { width: 5, height: 7, depth: 3 };

const PALETTE: RGBA[] = [{ r: 10, g: 20, b: 30, a: 255 }];

/**
 * The cell cleared on the drawing under test. It sits inside every one of the
 * six, the smallest of which is three cells each way, and away from the middle
 * of both axes so that counting either of them the wrong way about moves it.
 */
const CLEARED = { x: 1, y: 2 };

/** A drawing with every cell filled, so that the one cell cleared carves alone. */
function filled(width: number, height: number): Bitmap {
  const drawing = Bitmap.create(width, height);
  drawing.data.fill(0);
  return drawing;
}

const solidSides = (): Sides => {
  const { width, height, depth } = DIMENSIONS;
  return {
    front: filled(width, height),
    back: filled(width, height),
    left: filled(depth, height),
    right: filled(depth, height),
    top: filled(width, depth),
    bottom: filled(width, depth),
  };
};

/** Where the run of voxels a cleared cell carved stands, or nowhere if none was. */
function carved(voxels: Uint8Array): Vector3D | undefined {
  const { width, height, depth } = DIMENSIONS;

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (voxels[((z * width * height + y * width + x) << 2) + 3] === 0) {
          return Vector3D.create(x, y, z);
        }
      }
    }
  }

  return undefined;
}

/** The one cell of `picture` nothing was drawn in. */
function clearCell(picture: Picture): { column: number; row: number } {
  for (let row = 0; row < picture.height; row++) {
    for (let column = 0; column < picture.width; column++) {
      if (picture.texels[(row * picture.width + column) * 4 + 3] === 0) {
        return { column, row };
      }
    }
  }

  throw new Error("every cell of the picture was drawn in");
}

/**
 * Where a cell of the picture shown on the plane standing at `side` stands in
 * the part, along each of the two axes that plane spans.
 */
function cellInTheModel(
  side: SideKind,
  { column, row }: { column: number; row: number },
): Partial<Record<DimensionKind, number>> {
  const axis = facingAxis[side];
  const [across, down] = sideAxes[axisSides[axis][0]];
  const against = AGAINST[axis];

  return {
    [across]: against.across ? DIMENSIONS[across] - 1 - column : column,
    [down]: against.down ? DIMENSIONS[down] - 1 - row : row,
  };
}

describe("drawingPicture", () => {
  it("shows a cell over the run of voxels that cell carves", () => {
    for (const side of sideKinds) {
      const sides = solidSides();

      Bitmap.set(sides[side], CLEARED.x, CLEARED.y, Bitmap.EMPTY);

      const run = carved(solveVoxels(DIMENSIONS, sides));
      const picture = drawingPicture(sides[side], PALETTE, drawingFlip(side));
      const cell = cellInTheModel(side, clearCell(picture));

      expect({ side, ...cell }).toEqual({
        side,
        ...Object.fromEntries(
          Object.keys(cell).map((dimension) => [
            dimension,
            run?.[dimensionAxes[dimension as DimensionKind]],
          ]),
        ),
      });
    }
  });

  it("shows every cell in the colour the palette gives it", () => {
    const drawing = filled(2, 2);
    const { texels } = drawingPicture(drawing, PALETTE, {
      x: false,
      y: false,
    });

    expect([...texels.slice(0, 4)]).toEqual([10, 20, 30, 255]);
  });
});
