// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  partDimensions,
  sideKinds,
  type Part,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { Command } from "./command/Command";
import { changedGeometry } from "./mesh-dirty";

const DIMS = { width: 4, height: 5, depth: 6 };

const partNamed = (name: string): Part => {
  const sides = {} as Sides;
  for (const kind of sideKinds) {
    const bitmap = Bitmap.create(
      kind === "left" || kind === "right" ? DIMS.depth : DIMS.width,
      kind === "top" || kind === "bottom" ? DIMS.depth : DIMS.height,
    );
    bitmap.data.fill(1);
    sides[kind] = bitmap;
  }
  return {
    name,
    sides,
    sections: [],
    root: Vector3D.create(),
    pivot: Vector3D.create(),
    turn: Vector3D.create(),
    scale: 1,
    parent: null,
  };
};

const BODY = partNamed("body");
const ARM = partNamed("arm");
const find = (name: string): Part | undefined =>
  [BODY, ARM].find((part) => part.name === name);

describe("changedGeometry", () => {
  it("names the part and the cells a stroke on a panel can have changed", () => {
    const changed = changedGeometry(
      Command.writePixel("body", "front", { x: 1, y: 1 }, 3),
      find,
    );

    // The front looks along z, so the whole of that run is in question however
    // small a cell of the drawing the stroke was on.
    expect(changed).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 1, y: 3, z: 0 },
            high: { x: 1, y: 3, z: DIMS.depth - 1 },
          },
        },
      ],
    });
  });

  it("covers a rectangle between the cells a command names", () => {
    const changed = changedGeometry(
      Command.fillRectangle(
        "body",
        "left",
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        3,
        false,
      ),
      find,
    );

    // The left looks along x and counts its depth up, so the rectangle's x is its
    // depth and the run is the whole width.
    expect(changed).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 0, y: 3, z: 1 },
            high: { x: DIMS.width - 1, y: 4, z: 2 },
          },
        },
      ],
    });
  });

  it("marks a pose as changing no geometry at all", () => {
    // A part turned or moved stands somewhere else with the same drawings, so the
    // triangles are the ones it was already drawn with. Packing its volume again
    // would be the cost the mesher exists to take away.
    const root = Vector3D.create(1, 2, 3);
    const turn = Vector3D.create(0.1, 0.2, 0.3);

    expect(
      changedGeometry(Command.movePart("body", root), find),
    ).toBeUndefined();
    expect(
      changedGeometry(Command.turnPart("body", turn), find),
    ).toBeUndefined();
    expect(changedGeometry(Command.scalePart("body", 2), find)).toBeUndefined();
    expect(
      changedGeometry(Command.keyPart("walk", "body", 0, null), find),
    ).toBeUndefined();
  });

  it("marks a load as changing the whole figure", () => {
    // Nothing about which parts a file holds can be read from the blob it is
    // written in.
    expect(changedGeometry(Command.loadData(new Blob()), find)).toEqual({
      everything: true,
    });
  });

  it("gathers a sequence into one box per part rather than one per command", () => {
    // A stroke that crossed two panels of one part left one hole in it, not two,
    // and what is stale is the part rather than the stroke.
    const changed = changedGeometry(
      Command.sequence([
        Command.writePixel("body", "front", { x: 0, y: 0 }, 2),
        Command.writePixel("body", "front", { x: 3, y: 0 }, 2),
      ]),
      find,
    );

    expect(changed).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 0, y: 4, z: 0 },
            high: { x: 3, y: 4, z: DIMS.depth - 1 },
          },
        },
      ],
    });
  });

  it("keeps a sequence's parts apart where it reaches more than one", () => {
    const changed = changedGeometry(
      Command.sequence([
        Command.writePixel("body", "front", { x: 0, y: 0 }, 2),
        Command.writePixel("arm", "top", { x: 1, y: 1 }, 2),
      ]),
      find,
    );

    expect(changed).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 0, y: 4, z: 0 },
            high: { x: 0, y: 4, z: DIMS.depth - 1 },
          },
        },
        {
          // The top spans width and depth, and looks down the height.
          part: "arm",
          box: {
            low: { x: 1, y: 0, z: 1 },
            high: { x: 1, y: DIMS.height - 1, z: 1 },
          },
        },
      ],
    });
  });

  it("takes a whole-figure change over a sequence that reaches two parts", () => {
    const changed = changedGeometry(
      Command.sequence([
        Command.writePixel("body", "front", { x: 0, y: 0 }, 2),
        Command.loadData(new Blob()),
      ]),
      find,
    );

    expect(changed).toEqual({ everything: true });
  });

  it("changes nothing where every command in a sequence does", () => {
    expect(
      changedGeometry(
        Command.sequence([
          Command.noOperation(),
          Command.movePart("body", Vector3D.create(1, 1, 1)),
        ]),
        find,
      ),
    ).toBeUndefined();
  });

  it("changes nothing for a part the figure no longer holds", () => {
    // A command read off the undo stack may name a part taken since, and there
    // is no box left to rebuild.
    expect(
      changedGeometry(
        Command.writePixel("gone", "front", { x: 0, y: 0 }, 2),
        find,
      ),
    ).toBeUndefined();
  });

  it("answers a panel naming a cut the part does not have with its whole box", () => {
    const changed = changedGeometry(
      Command.writePixel("body", "section-0-before", { x: 1, y: 1 }, 2),
      find,
    );

    expect(changed).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 0, y: 0, z: 0 },
            high: {
              x: DIMS.width - 1,
              y: DIMS.height - 1,
              z: DIMS.depth - 1,
            },
          },
        },
      ],
    });
  });

  it("reads a cut the part does have as a panel like any other", () => {
    const cut = {
      axis: "depth" as const,
      at: 2,
      before: BODY.sides.front,
      after: BODY.sides.front,
    };
    const withCut: Part = { ...BODY, sections: [cut] };
    const findCut = (name: string) =>
      name === BODY.name ? withCut : undefined;

    const changed = changedGeometry(
      Command.writePixel("body", "section-0-before", { x: 1, y: 1 }, 2),
      findCut,
    );

    // A cut across the depth is revealed as a front face, so the cell is read the
    // way the front is read rather than as a cut of its own.
    expect(changed).toEqual({
      parts: [
        {
          part: "body",
          box: {
            low: { x: 1, y: 3, z: 0 },
            high: { x: 1, y: 3, z: DIMS.depth - 1 },
          },
        },
      ],
    });
  });

  it("reads a stroke and its reverse as covering the same cells", () => {
    // The geometry is dirtied off the reverse of a command, so what matters is
    // that an undo dirties where the stroke did. A write and an erase name the
    // same cell of the same panel and differ only in the colour they leave there.
    const stroke = changedGeometry(
      Command.writePixel("body", "front", { x: 2, y: 2 }, 5),
      find,
    );
    const undone = changedGeometry(
      Command.writePixel("body", "front", { x: 2, y: 2 }, 1),
      find,
    );

    expect(undone).toEqual(stroke);
    expect(partDimensions(BODY)).toEqual(DIMS);
  });
});
