// @vitest-environment jsdom
import { Bitmap, Vector3D, type RGBA } from "@big-mesh-studios/maths";
import {
  centrePivot,
  NO_MOTION,
  sideAxes,
  sideKinds,
  type Motion,
  type Part,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { Accessor, Setter } from "@solidjs/signals";
import { describe, expect, it } from "vitest";
import { Command, type Command as CommandType } from "./command/Command";
import { createCommander } from "./command/commander";
import { changedGeometry } from "./mesh-dirty";

const DIMS = { width: 4, height: 4, depth: 4 };
const PALETTE: RGBA[] = Array.from({ length: 32 }, (_, i) => ({
  r: i,
  g: i,
  b: i,
  a: 255,
}));

/** A part whose front drawing is drawn in 1, with a hole at (1,1). */
const partOf = (): Part => {
  const part: Part = {
    name: "body",
    sides: Object.fromEntries(
      sideKinds.map((kind) => {
        const [across, down] = sideAxes[kind];
        const bitmap = Bitmap.create(DIMS[across], DIMS[down]);
        bitmap.data.fill(1);
        return [kind, bitmap];
      }),
    ) as Sides,
    sections: [],
    turn: Vector3D.create(),
    scale: 1,
    root: Vector3D.create(),
    pivot: centrePivot(DIMS),
    parent: null,
  };
  part.sides.front.data[1 * DIMS.width + 1] = Bitmap.EMPTY;
  return part;
};

const commanderOf = (part: Part) => {
  let parts = [part];
  let motions: Motion[] = [{ ...NO_MOTION, name: "walk" }];

  return createCommander({
    parts: (() => parts) as Accessor<Part[]>,
    setParts: ((next: Part[]) => {
      parts = next;
    }) as unknown as Setter<Part[]>,
    motions: (() => motions) as Accessor<Motion[]>,
    setMotions: ((next: Motion[]) => {
      motions = next;
    }) as unknown as Setter<Motion[]>,
    palette: (() => PALETTE) as Accessor<RGBA[]>,
    setPalette: (() => {}) as unknown as Setter<RGBA[]>,
    updateVoxels() {},
    requestRender() {},
    requestAutoSave() {},
  });
};

const front = (part: Part) => Array.from(part.sides.front.data);

describe("undoing a fill", () => {
  it("puts back every cell the flood filled, including the one it started on", async () => {
    const part = partOf();
    const before = front(part);
    const { doCommand } = commanderOf(part);

    // The flood starts in the hole at (1,1), and takes the colour it starts
    // from, so it spreads over the empty cells around it and no further.
    const undo = await doCommand(
      Command.fillPixel("body", "front", { x: 1, y: 1 }, 7),
    );

    expect(Bitmap.get(part.sides.front, 1, 1)).toBe(7);
    expect(Bitmap.get(part.sides.front, 0, 0)).toBe(1);

    await doCommand(undo);

    expect(front(part)).toEqual(before);
  });

  it("puts back a hole of several cells a flood filled", async () => {
    const part = partOf();
    // A pocket of empty cells, which a flood started inside runs through.
    part.sides.front.data[1 * DIMS.width + 1] = Bitmap.EMPTY;
    part.sides.front.data[1 * DIMS.width + 2] = Bitmap.EMPTY;
    part.sides.front.data[2 * DIMS.width + 1] = Bitmap.EMPTY;
    const before = front(part);
    const { doCommand } = commanderOf(part);

    const undo = await doCommand(
      Command.fillPixel("body", "front", { x: 1, y: 1 }, 7),
    );

    expect(Bitmap.get(part.sides.front, 2, 1)).toBe(7);
    expect(Bitmap.get(part.sides.front, 1, 2)).toBe(7);
    expect(Bitmap.get(part.sides.front, 0, 0)).toBe(1);

    await doCommand(undo);

    expect(front(part)).toEqual(before);
  });

  it("puts back every cell a rectangle covered", async () => {
    const part = partOf();
    const before = front(part);
    const { doCommand } = commanderOf(part);

    const undo = await doCommand(
      Command.fillRectangle("body", "front", { x: 0, y: 0 }, { x: 2, y: 2 }, 7),
    );

    expect(Bitmap.get(part.sides.front, 0, 0)).toBe(7);
    expect(Bitmap.get(part.sides.front, 2, 2)).toBe(7);
    // Outside the rectangle, untouched.
    expect(Bitmap.get(part.sides.front, 3, 3)).toBe(1);

    await doCommand(undo);

    expect(front(part)).toEqual(before);
  });

  it("puts back only the empty cells a rectangle filled in", async () => {
    const part = partOf();
    const before = front(part);
    const { doCommand } = commanderOf(part);

    const undo = await doCommand(
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

    await doCommand(undo);

    expect(front(part)).toEqual(before);
  });

  it("does nothing where a fill is asked for the colour a cell already holds", async () => {
    const part = partOf();
    const before = front(part);
    const { doCommand } = commanderOf(part);

    const undo = await doCommand(
      Command.fillPixel("body", "front", { x: 0, y: 0 }, 1),
    );

    expect(undo.type).toBe("NoOperation");
    expect(front(part)).toEqual(before);
  });

  it("does nothing where a rectangle covers only the colour it draws in", async () => {
    const part = partOf();
    const before = front(part);
    const { doCommand } = commanderOf(part);

    // The far corner, which is drawn in 1 throughout and so is left as it is.
    const undo = await doCommand(
      Command.fillRectangle("body", "front", { x: 3, y: 3 }, { x: 3, y: 3 }, 1),
    );

    expect(undo.type).toBe("NoOperation");
    expect(front(part)).toEqual(before);
  });

  it("leaves the rest of the figure alone when a fill is taken back", async () => {
    const part = partOf();
    const { doCommand } = commanderOf(part);

    const undo = await doCommand(
      Command.fillPixel("body", "front", { x: 1, y: 1 }, 7),
    );

    // Every other panel of the same part, and therefore the whole figure, is
    // still drawn in what it was.
    expect(Bitmap.get(part.sides.back, 0, 0)).toBe(1);
    expect(Bitmap.get(part.sides.top, 0, 0)).toBe(1);

    await doCommand(undo);

    expect(Bitmap.get(part.sides.back, 0, 0)).toBe(1);
    expect(Bitmap.get(part.sides.top, 0, 0)).toBe(1);
  });
});

describe("what a fill and a rectangle tell the mesh", () => {
  const narrow = (command: CommandType, part: Part) =>
    changedGeometry(command, (name) => (name === part.name ? part : undefined));

  it("names the cells a fill covered, and no other part", async () => {
    const part = partOf();
    // A pocket of empty cells, so the flood covers a region of its own.
    part.sides.front.data[1 * DIMS.width + 1] = Bitmap.EMPTY;
    part.sides.front.data[1 * DIMS.width + 2] = Bitmap.EMPTY;
    part.sides.front.data[2 * DIMS.width + 1] = Bitmap.EMPTY;

    const { doCommand } = commanderOf(part);

    const reverse = await doCommand(
      Command.fillPixel("body", "front", { x: 1, y: 1 }, 7),
    );

    const changed = narrow(reverse, part);

    // The pocket, lifted onto the front's two axes, and across the whole run the
    // front looks down.
    expect(changed).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 1, y: 1, z: 0 },
            high: { x: 2, y: 2, z: DIMS.depth - 1 },
          },
        },
      ],
    });
  });

  it("names the cells a rectangle covered", async () => {
    const part = partOf();
    const { doCommand } = commanderOf(part);

    const reverse = await doCommand(
      Command.fillRectangle("body", "front", { x: 1, y: 1 }, { x: 2, y: 2 }, 7),
    );

    expect(narrow(reverse, part)).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 1, y: 1, z: 0 },
            high: { x: 2, y: 2, z: DIMS.depth - 1 },
          },
        },
      ],
    });
  });

  it("says a fill changes no geometry where the figure no longer holds the part", async () => {
    const part = partOf();
    const { doCommand } = commanderOf(part);

    const reverse = await doCommand(
      Command.fillPixel("body", "front", { x: 1, y: 1 }, 7),
    );

    expect(narrow(reverse, { ...part, name: "other" })).toBeUndefined();
  });
});
