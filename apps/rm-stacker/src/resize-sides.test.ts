import { Bitmap, type Dimensions3D } from "@big-mesh-studios/maths";
import {
  sideAxes,
  sideKinds,
  type Section,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { describe, expect, it } from "vitest";
import { resizeSections, type ResizeOptions } from "./resize-sides";

const DIMENSIONS = { width: 5, height: 7, depth: 3 };

const sidesOf = (dimensions: Dimensions3D): Sides =>
  Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      const bitmap = Bitmap.create(dimensions[across], dimensions[down]);
      bitmap.data.fill(1);
      return [kind, bitmap];
    }),
  ) as Sides;

/** A cut across the width, with faces the size the left and the right are. */
const acrossTheWidth = (at: number): Section => {
  const face = () => {
    const bitmap = Bitmap.create(DIMENSIONS.depth, DIMENSIONS.height);
    bitmap.data.fill(1);
    return bitmap;
  };

  return { axis: "width", at, before: face(), after: face() };
};

const resizing = (
  sections: Section[],
  to: ResizeOptions["to"],
): ResizeOptions => ({
  from: { sides: sidesOf(DIMENSIONS), sections, dimensions: DIMENSIONS },
  to,
});

describe("resizeSections", () => {
  it("leaves a cut where it stands when the box grows at the far end", () => {
    const [section] = resizeSections(
      resizing([acrossTheWidth(2)], {
        dimensions: { ...DIMENSIONS, width: 7 },
        alignment: { width: "max" },
      }),
    );

    expect(section.at).toBe(2);
  });

  it("carries a cut along when the box grows at the end it is measured from", () => {
    const [section] = resizeSections(
      resizing([acrossTheWidth(2)], {
        dimensions: { ...DIMENSIONS, width: 7 },
        alignment: { width: "min" },
      }),
    );

    // Everything drawn has moved two voxels along, the cut with it.
    expect(section.at).toBe(4);
  });

  it("re-frames a cut's faces the way the sides they parallel are re-framed", () => {
    const [section] = resizeSections(
      resizing([acrossTheWidth(2)], {
        dimensions: { ...DIMENSIONS, height: 9 },
        alignment: { height: "max" },
      }),
    );

    // A width cut's faces are drawn depth across and height down, so a taller
    // box makes them taller and leaves them as wide as they were.
    for (const face of [section.before, section.after]) {
      expect(face.width).toBe(DIMENSIONS.depth);
      expect(face.height).toBe(9);
    }
  });

  it("leaves a cut nowhere to stand when the axis shrinks past it", () => {
    expect(
      resizeSections(
        resizing([acrossTheWidth(4)], {
          dimensions: { ...DIMENSIONS, width: 3 },
          alignment: { width: "max" },
        }),
      ),
    ).toEqual([]);
  });

  it("re-frames every cut from where it stood, however many times it is asked", () => {
    // A drag asks again on every move, each time from the box the drag started
    // from, so asking twice with the same change has to give the same answer.
    const options = resizing([acrossTheWidth(2)], {
      dimensions: { ...DIMENSIONS, width: 7 },
      alignment: { width: "min" },
    });

    expect(resizeSections(options)).toEqual(resizeSections(options));
  });
});
