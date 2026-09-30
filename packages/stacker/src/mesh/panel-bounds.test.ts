// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  facingAxis,
  partDimensions,
  sideKinds,
  type Part,
  type Section,
  type Sides,
} from "../data";
import { panelCellBounds } from "./panel-bounds";
import type { CellBounds } from "./dirty-bounds";
import { solveVoxels } from "../solver";

const DIMS = { width: 4, height: 5, depth: 6 };

const part = (sections: Section[] = []): Part => {
  const sides = {} as Sides;
  for (const kind of sideKinds) {
    const bitmap = Bitmap.create(
      kind === "left" || kind === "right" ? DIMS.depth : DIMS.width,
      kind === "top" || kind === "bottom" ? DIMS.depth : DIMS.height,
    );
    // Painted throughout, so a cell taken away from one drawing is a cell the
    // box loses rather than one it never had.
    bitmap.data.fill(1);
    sides[kind] = bitmap;
  }
  return {
    name: "part",
    sides,
    sections,
    root: Vector3D.create(),
    pivot: Vector3D.create(),
    turn: Vector3D.create(),
    scale: 1,
    parent: null,
  };
};

/** The cells of a box of cells, in a fixed order to be compared in. */
const cells = (bounds: CellBounds): string[] => {
  const out: string[] = [];
  for (let z = bounds.low.z; z <= bounds.high.z; z++) {
    for (let y = bounds.low.y; y <= bounds.high.y; y++) {
      for (let x = bounds.low.x; x <= bounds.high.x; x++) {
        out.push(`${x},${y},${z}`);
      }
    }
  }
  return out.sort();
};

/** The low and high cells of a box along one named axis. */
const ofAxis = (box: CellBounds, name: "width" | "height" | "depth") =>
  name === "width"
    ? [box.low.x, box.high.x]
    : name === "height"
      ? [box.low.y, box.high.y]
      : [box.low.z, box.high.z];

describe("panelCellBounds", () => {
  it("holds one axis open in full and the other two to the one cell it names", () => {
    // Which end of each axis a cell lands at is `sideDirections` to say, and the
    // test below checks that against the solver rather than restating it here.
    // What is checked here is the shape: a face carves the whole run it looks
    // along, so exactly one axis comes back in full and the other two are a single
    // cell each, whatever cell of the drawing the stroke was on.
    const axes = [
      { name: "width", of: (box: CellBounds) => [box.low.x, box.high.x] },
      { name: "height", of: (box: CellBounds) => [box.low.y, box.high.y] },
      { name: "depth", of: (box: CellBounds) => [box.low.z, box.high.z] },
    ] as const;

    for (const kind of sideKinds) {
      for (const corner of [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 1 },
      ]) {
        const box = panelCellBounds(part(), kind, {
          min: corner,
          max: corner,
        });
        const open = axes.filter(({ of }) => {
          const [low, high] = of(box);
          return high > low;
        });

        expect(open.map(({ name }) => name)).toEqual([facingAxis[kind]]);
        expect(ofAxis(box, facingAxis[kind])).toEqual([
          0,
          DIMS[facingAxis[kind]] - 1,
        ]);
      }
    }
  });

  it("turns a drawing end for end the way its side counts against", () => {
    const one = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    const last = { min: { x: 3, y: 0 }, max: { x: 3, y: 0 } };

    // The front counts its width up from the left, so cell zero of its drawing is
    // cell zero of the box and its last cell is the last of the box.
    const frontNear = panelCellBounds(part(), "front", one);
    expect(frontNear.low.x).toBe(0);
    expect(frontNear.high.x).toBe(0);

    const frontFar = panelCellBounds(part(), "front", last);
    expect(frontFar.low.x).toBe(DIMS.width - 1);
    expect(frontFar.high.x).toBe(DIMS.width - 1);

    // The back counts its width the other way, being at the other end of the box.
    const backNear = panelCellBounds(part(), "back", one);
    expect(backNear.low.x).toBe(DIMS.width - 1);
    expect(backNear.high.x).toBe(DIMS.width - 1);
  });

  it("counts every side's height against the box's, being drawn top row first", () => {
    const top = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    const bottomRow = { min: { x: 0, y: 4 }, max: { x: 0, y: 4 } };

    for (const kind of ["front", "back", "left", "right"] as const) {
      expect(panelCellBounds(part(), kind, top).low.y).toBe(DIMS.height - 1);
      expect(panelCellBounds(part(), kind, bottomRow).low.y).toBe(0);
    }
  });

  it("takes the axis a side looks down in full, and no more of the others than the stroke", () => {
    const box = panelCellBounds(part(), "front", {
      min: { x: 1, y: 1 },
      max: { x: 2, y: 3 },
    });

    expect(box).toEqual({
      low: { x: 1, y: 1, z: 0 },
      high: { x: 2, y: 3, z: DIMS.depth - 1 },
    });
  });

  it("answers the same for a rectangle given the wrong way round", () => {
    const forwards = panelCellBounds(part(), "right", {
      min: { x: 1, y: 1 },
      max: { x: 3, y: 2 },
    });
    const backwards = panelCellBounds(part(), "right", {
      min: { x: 3, y: 2 },
      max: { x: 1, y: 1 },
    });

    expect(forwards).toEqual(backwards);
  });

  it("covers a face a cut reveals, the way of the side it parallels", () => {
    const before = Bitmap.create(DIMS.width, DIMS.height);
    const after = Bitmap.create(DIMS.width, DIMS.height);
    const sections: Section[] = [{ axis: "depth", at: 2, before, after }];

    // A cut across the depth is revealed as a front face and a back face, so a
    // face of it is drawn the way the front or the back is drawn.
    const asFront = panelCellBounds(part(sections), "section-0-before", {
      min: { x: 1, y: 1 },
      max: { x: 1, y: 1 },
    });
    expect(asFront.low.x).toBe(1);
    expect(asFront.low.y).toBe(DIMS.height - 2);
    expect(asFront.low.z).toBe(0);
    expect(asFront.high.z).toBe(DIMS.depth - 1);

    const asBack = panelCellBounds(part(sections), "section-0-after", {
      min: { x: 1, y: 1 },
      max: { x: 1, y: 1 },
    });
    expect(asBack.low.x).toBe(DIMS.width - 2);
  });

  it("answers a cut the part does not have with the whole box", () => {
    expect(
      panelCellBounds(part(), "section-0-before", {
        min: { x: 0, y: 0 },
        max: { x: 0, y: 0 },
      }),
    ).toEqual({
      low: { x: 0, y: 0, z: 0 },
      high: {
        x: DIMS.width - 1,
        y: DIMS.height - 1,
        z: DIMS.depth - 1,
      },
    });
  });

  it("agrees with the cells the solver erases, on every cell of every side", () => {
    // The strongest check available, and the reason this is worth pinning. For
    // every cell of every drawing, the box a stroke on that cell could have
    // changed is compared against the voxels that actually stop being solid when
    // that cell of that drawing is erased. The two are worked out from different
    // tables — one from a side's own axes and directions, the other from the
    // segments the solver cuts the box into — so a side counted the wrong way
    // round, or a rectangle placed on the wrong run, shows up here.
    const drawn = part();
    const before = solidVoxels(drawn);

    for (const kind of sideKinds) {
      const on = drawn.sides[kind];

      for (let px = 0; px < on.width; px++) {
        for (let py = 0; py < on.height; py++) {
          Bitmap.set(on, px, py, Bitmap.EMPTY);
          const taken = carvedAway(before, solidVoxels(drawn));
          Bitmap.set(on, px, py, 1);

          expect(taken).toEqual(
            cells(
              panelCellBounds(drawn, kind, {
                min: { x: px, y: py },
                max: { x: px, y: py },
              }),
            ),
          );
        }
      }
    }
  });
});

/** The cells of a part that are solid, as the strings the boxes are compared in. */
function solidVoxels(part: Part): Set<string> {
  const dimensions = partDimensions(part);
  const solved = solveVoxels(dimensions, part.sides, part.sections);
  const out = new Set<string>();

  for (let z = 0; z < dimensions.depth; z++) {
    for (let y = 0; y < dimensions.height; y++) {
      for (let x = 0; x < dimensions.width; x++) {
        const at =
          (z * dimensions.width * dimensions.height +
            y * dimensions.width +
            x) <<
          2;
        if (solved[at + 3] !== 0) {
          out.add(`${x},${y},${z}`);
        }
      }
    }
  }

  return out;
}

/** The cells that were solid and are not, which is what one stroke took away. */
function carvedAway(before: Set<string>, after: Set<string>): string[] {
  return [...before].filter((at) => !after.has(at)).sort();
}
