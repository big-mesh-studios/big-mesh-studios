// @vitest-environment jsdom
import { Bitmap, Vector3D, type RGBA } from "@big-mesh-studios/maths";
import {
  centrePivot,
  keyAt,
  keysFor,
  NO_MOTION,
  partDimensions,
  REMOVED,
  sideAxes,
  sideKinds,
  type Key,
  type Motion,
  type Part,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { volumeOffset } from "@big-mesh-studios/stacker/volume";
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

/** A commander over one part, the part it draws on, and the motion it poses it in. */
const commanderOf = (part: Part) => {
  let parts = [part];
  let motions = [{ ...NO_MOTION, name: "walk" }];

  return {
    ...createCommander({
      parts: (() => parts) as Accessor<Part[]>,
      setParts: ((next: Part[] | ((current: Part[]) => Part[])) => {
        parts = typeof next === "function" ? next(parts) : next;
      }) as unknown as Setter<Part[]>,
      motions: (() => motions) as Accessor<Motion[]>,
      setMotions: ((next: Motion[] | ((current: Motion[]) => Motion[])) => {
        motions = typeof next === "function" ? next(motions) : next;
      }) as unknown as Setter<Motion[]>,
      palette: (() => PALETTE) as Accessor<RGBA[]>,
      setPalette: (() => {}) as unknown as Setter<RGBA[]>,
      updateVoxels() {},
      requestRender() {},
      requestAutoSave() {},
    }),
    motion: () => motions[0],
    parts: () => parts,
  };
};

/** A key standing at `at`, as far along the width as it stands frames in. */
const keyOf = (at: number): Key => ({
  at,
  root: Vector3D.create(at, 0, 0),
  turn: Vector3D.create(),
  scale: 1,
  ease: "linear",
});

describe("KeyPart", () => {
  it("stands a key at the frame it names", async () => {
    const { doCommand, motion } = commanderOf(partOf());

    await doCommand(Command.keyPart("walk", "body", 4, keyOf(4)));

    expect(keysFor(motion(), "body").map(({ at }) => at)).toEqual([4]);
  });

  it("hands back the key that stood there, so taking it back puts it again", async () => {
    const { doCommand, motion } = commanderOf(partOf());

    await doCommand(Command.keyPart("walk", "body", 4, keyOf(4)));

    const undo = await doCommand(
      Command.keyPart("walk", "body", 4, { ...keyOf(4), scale: 2 }),
    );

    expect(keyAt(motion(), "body", 4)?.scale).toBe(2);

    await doCommand(undo);

    expect(keyAt(motion(), "body", 4)?.scale).toBe(1);
  });

  it("takes a key away, and hands back the one it took", async () => {
    const { doCommand, motion } = commanderOf(partOf());

    await doCommand(Command.keyPart("walk", "body", 4, keyOf(4)));

    const undo = await doCommand(Command.keyPart("walk", "body", 4, null));

    expect(keysFor(motion(), "body")).toHaveLength(0);

    await doCommand(undo);

    expect(keysFor(motion(), "body")).toHaveLength(1);
  });

  it("keeps the key a part starts in while a later key stands", async () => {
    const { doCommand, motion } = commanderOf(partOf());

    await doCommand(Command.keyPart("walk", "body", 0, keyOf(0)));
    await doCommand(Command.keyPart("walk", "body", 4, keyOf(4)));

    expect(
      (await doCommand(Command.keyPart("walk", "body", 0, null))).type,
    ).toBe("NoOperation");
    expect(keysFor(motion(), "body")).toHaveLength(2);
  });

  it("does nothing where it is asked to take away a key that is not there", async () => {
    const { doCommand } = commanderOf(partOf());

    expect(
      (await doCommand(Command.keyPart("walk", "body", 4, null))).type,
    ).toBe("NoOperation");
  });
});

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

/** What a part's edits hold at a cell of its own box. */
const heldAt = (part: Part, x: number, y: number, z: number): number =>
  part.edits?.voxels[volumeOffset(partDimensions(part), x, y, z)] ??
  Bitmap.EMPTY;

describe("EditVoxel", () => {
  it("holds a value in the part's edits at that cell", async () => {
    const { doCommand, parts } = commanderOf(partOf());

    await doCommand(Command.editVoxel("body", { x: 1, y: 2, z: 3 }, 7));

    expect(heldAt(parts()[0], 1, 2, 3)).toBe(7);
  });

  it("holds nothing at a cell it was never told about", async () => {
    const { doCommand, parts } = commanderOf(partOf());

    await doCommand(Command.editVoxel("body", { x: 1, y: 2, z: 3 }, 7));

    expect(heldAt(parts()[0], 0, 0, 0)).toBe(Bitmap.EMPTY);
  });

  it("hands back the value that was there, so taking it back puts it again", async () => {
    const { doCommand, parts } = commanderOf(partOf());

    const first = await doCommand(
      Command.editVoxel("body", { x: 1, y: 2, z: 3 }, 7),
    );
    const second = await doCommand(
      Command.editVoxel("body", { x: 1, y: 2, z: 3 }, 9),
    );

    expect(heldAt(parts()[0], 1, 2, 3)).toBe(9);

    await doCommand(second);
    expect(heldAt(parts()[0], 1, 2, 3)).toBe(7);

    await doCommand(first);
    expect(heldAt(parts()[0], 1, 2, 3)).toBe(Bitmap.EMPTY);
  });

  it("leaves the cell to the drawings again where it is told to hold nothing", async () => {
    // Nothing held is not the same as a voxel taken away: the drawings answer
    // for the cell, and a taken voxel is the other side of the box.
    const { doCommand, parts } = commanderOf(partOf());

    await doCommand(Command.editVoxel("body", { x: 1, y: 1, z: 1 }, 4));
    await doCommand(
      Command.editVoxel("body", { x: 1, y: 1, z: 1 }, Bitmap.EMPTY),
    );

    expect(heldAt(parts()[0], 1, 1, 1)).toBe(Bitmap.EMPTY);
  });

  it("takes a voxel away where it is told to", async () => {
    const { doCommand, parts } = commanderOf(partOf());

    await doCommand(Command.editVoxel("body", { x: 1, y: 1, z: 1 }, REMOVED));

    expect(heldAt(parts()[0], 1, 1, 1)).toBe(REMOVED);
  });

  it("does nothing where the cell already holds what was asked for", async () => {
    const { doCommand } = commanderOf(partOf());

    await doCommand(Command.editVoxel("body", { x: 1, y: 1, z: 1 }, 4));
    const again = await doCommand(
      Command.editVoxel("body", { x: 1, y: 1, z: 1 }, 4),
    );

    // A stroke over ground already the colour it puts down leaves nothing to
    // take back, so it does not fill the history with steps that do nothing.
    expect(again.type).toBe("NoOperation");
  });

  it("does nothing for a part the figure no longer holds", async () => {
    const { doCommand } = commanderOf(partOf());

    const reverse = await doCommand(
      Command.editVoxel("gone", { x: 0, y: 0, z: 0 }, 4),
    );

    expect(reverse.type).toBe("NoOperation");
  });

  it("does nothing for a cell outside the part's own box", async () => {
    const { doCommand, parts } = commanderOf(partOf());

    for (const voxel of [
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 4, z: 0 },
      { x: 0, y: 0, z: 4 },
    ]) {
      const reverse = await doCommand(Command.editVoxel("body", voxel, 4));

      expect(reverse.type, `${voxel.x},${voxel.y},${voxel.z}`).toBe(
        "NoOperation",
      );
    }

    expect(parts()[0].edits).toBeUndefined();
  });

  it("leaves a part that a reader can tell has been written to", async () => {
    // Everything that reads the figure asks its parts what they hold rather than
    // looking at the figure again, so an edit written into a part in place would
    // go on being reported as what it held before — which is how a part whose
    // last hand edit has been taken back goes on being marked as having one.
    const { doCommand, parts } = commanderOf(partOf());
    const before = parts()[0];

    await doCommand(Command.editVoxel("body", { x: 1, y: 1, z: 1 }, 4));

    expect(parts()[0]).not.toBe(before);
    expect(parts()[0].edits).not.toBe(before.edits);
  });

  it("leaves the part's drawings the same objects it had", async () => {
    // The six drawings are large and are written into in place by every stroke on
    // a panel, so copying them for one voxel would be the one edit of the day
    // that cost more than it was worth.
    const { doCommand, parts } = commanderOf(partOf());
    const before = parts()[0];

    await doCommand(Command.editVoxel("body", { x: 1, y: 1, z: 1 }, 4));

    expect(parts()[0].sides).toBe(before.sides);
    expect(parts()[0].sides.front.data).toBe(before.sides.front.data);
  });

  it("gives a part that has never had an edit a box to hold them in", async () => {
    const { doCommand, parts } = commanderOf(partOf());

    expect(parts()[0].edits).toBeUndefined();

    await doCommand(Command.editVoxel("body", { x: 0, y: 0, z: 0 }, 4));

    const edits = parts()[0].edits;

    expect(edits).toBeDefined();
    expect(edits?.dimensions).toEqual(DIMENSIONS);
    expect(heldAt(parts()[0], 0, 0, 0)).toBe(4);
  });
});

describe("an EditVoxel on the undo history", () => {
  it("comes back the same after being written to disk and read again", async () => {
    const command = Command.editVoxel("body", { x: 2, y: 1, z: 0 }, REMOVED);
    const read = Command.fromJSON(
      JSON.parse(JSON.stringify(await Command.toJSON(command))),
    );

    expect(read).toEqual(command);
  });

  it("comes back for a value that holds nothing", async () => {
    const command = Command.editVoxel(
      "body",
      { x: 0, y: 0, z: 0 },
      Bitmap.EMPTY,
    );
    const read = Command.fromJSON(
      JSON.parse(JSON.stringify(await Command.toJSON(command))),
    );

    expect(read).toEqual(command);
  });

  it("is read as nothing where the value written is not one", () => {
    // A history written before a command shape change must not take down the
    // rest of the stack, so a value that is not an edit's is refused whole.
    for (const value of [-1, 256, 1.5, undefined, "3", null]) {
      expect(
        Command.fromJSON({
          type: "EditVoxel",
          part: "body",
          x: 0,
          y: 0,
          z: 0,
          value,
        }).type,
        String(value),
      ).toBe("NoOperation");
    }
  });
});
