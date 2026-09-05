// @vitest-environment jsdom
import { Bitmap, Vector3D, type RGBA } from "@big-mesh-studios/maths";
import {
  centrePivot,
  keyAt,
  keysFor,
  NO_MOTION,
  sideAxes,
  sideKinds,
  type Key,
  type Motion,
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

/** A commander over one part, the part it draws on, and the motion it poses it in. */
const commanderOf = (part: Part) => {
  let parts = [part];
  let motions = [{ ...NO_MOTION, name: "walk" }];

  return {
    ...createCommander({
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
    }),
    motion: () => motions[0],
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
