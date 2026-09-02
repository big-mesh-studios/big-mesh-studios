// @vitest-environment jsdom
import { Bitmap, Vector3D, type RGBA } from "@big-mesh-studios/maths";
import {
  centrePivot,
  sideAxes,
  sideKinds,
  type Part,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { Accessor, Setter } from "@solidjs/signals";
import { describe, expect, it } from "vitest";
import { Command } from "./Command";
import { createCommander } from "./commander";

const DIMENSIONS = { width: 4, height: 4, depth: 4 };

const PALETTE: RGBA[] = Array.from({ length: 32 }, (_, i) => ({
  r: i,
  g: i,
  b: i,
  a: 255,
}));

/** A part with every side drawn in palette slot one. */
const partOf = (): Part => ({
  name: "body",
  sides: Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      const bitmap = Bitmap.create(DIMENSIONS[across], DIMENSIONS[down]);
      bitmap.data.fill(1);
      return [kind, bitmap];
    }),
  ) as Sides,
  sections: [],
  turn: Vector3D.create(),
  scale: 1,
  root: Vector3D.create(),
  pivot: centrePivot(DIMENSIONS),
  parent: null,
});

/** A commander over one part, and the part it draws on. */
const commanderOf = (part: Part) => {
  let parts = [part];

  return createCommander({
    parts: (() => parts) as Accessor<Part[]>,
    setParts: ((next: Part[]) => {
      parts = next;
    }) as unknown as Setter<Part[]>,
    palette: (() => PALETTE) as Accessor<RGBA[]>,
    setPalette: (() => {}) as unknown as Setter<RGBA[]>,
    updateVoxels() {},
    requestRender() {},
    requestAutoSave() {},
  });
};

describe("FillRectangle", () => {
  it("paints every cell of the block it covers", async () => {
    const part = partOf();
    const { doCommand } = commanderOf(part);

    await doCommand(
      Command.fillRectangle("body", "front", { x: 1, y: 1 }, { x: 2, y: 2 }, 7),
    );

    expect(Bitmap.get(part.sides.front, 1, 1)).toBe(7);
    expect(Bitmap.get(part.sides.front, 2, 2)).toBe(7);
    expect(Bitmap.get(part.sides.front, 0, 0)).toBe(1);
  });

  it("leaves what is already drawn alone when it is only filling in", async () => {
    const part = partOf();
    // A hole in the middle of the front, which is what a rectangle drawn over
    // it has to fill in, and a cell beside it that is already drawn.
    part.sides.front.data[1 * DIMENSIONS.width + 1] = Bitmap.EMPTY;

    const { doCommand } = commanderOf(part);

    await doCommand(
      Command.fillRectangle(
        "body",
        "front",
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        7,
        true,
      ),
    );

    expect(Bitmap.get(part.sides.front, 1, 1)).toBe(7);
    expect(Bitmap.get(part.sides.front, 2, 2)).toBe(1);
  });
});
