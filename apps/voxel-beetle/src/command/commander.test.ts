import { describe, expect, it } from "vitest";
import { Bitmap, type RGBA, Vector3D } from "@big-mesh-studios/maths";
import { createVolume, type Volume } from "@big-mesh-studios/stacker/volume";
import { writeModel } from "../cvox-io";
import { Command } from "./Command";
import { createCommander } from "./commander";

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };

interface Harness {
  volume(): Volume;
  palette(): RGBA[];
  doCommand(
    command: ReturnType<typeof Command.writeVoxel>,
  ): Promise<ReturnType<typeof Command.noOperation>>;
  snapshot(): ReturnType<typeof Command.loadVolume>;
  renders: number;
  saves: number;
}

function harness(dimensions = { width: 4, height: 4, depth: 4 }): Harness {
  let current = createVolume(dimensions);
  let colours = [RED, BLUE];
  const h: Harness = {
    volume: () => current,
    palette: () => colours,
    renders: 0,
    saves: 0,
    doCommand: (command) => undefined as never,
    snapshot: () => undefined as never,
  };

  const commander = createCommander({
    volume: () => current,
    setVolume: (next) => {
      current = next;
    },
    palette: () => colours,
    setPalette: (next) => {
      colours = next;
    },
    requestRender: () => {
      h.renders++;
    },
    requestAutoSave: () => {
      h.saves++;
    },
  });

  h.doCommand = (command) => commander.doCommand(command) as never;
  h.snapshot = () => commander.snapshot();
  return h;
}

const at = (volume: Volume, x: number, y: number, z: number) =>
  volume.voxels[
    z * volume.dimensions.width * volume.dimensions.height +
      y * volume.dimensions.width +
      x
  ];

describe("writeVoxel", () => {
  it("puts the index in the voxel it names", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 1, y: 2, z: 3 }, 1));
    expect(at(h.volume(), 1, 2, 3)).toBe(1);
    expect(at(h.volume(), 0, 0, 0)).toBe(Bitmap.EMPTY);
  });

  it("answers with the command that takes it back", async () => {
    const h = harness();
    const reverse = await h.doCommand(
      Command.writeVoxel({ x: 1, y: 1, z: 1 }, 1),
    );
    expect(reverse.type).toBe("EraseVoxel");
  });

  it("answers with what was there when there was something there", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 0, y: 0, z: 0 }, 1));
    const reverse = await h.doCommand(
      Command.writeVoxel({ x: 0, y: 0, z: 0 }, 0),
    );
    expect(reverse).toMatchObject({ type: "WriteVoxel", paletteIndex: 1 });
  });

  it("does nothing at all where the voxel is already what is being put in it", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 2, y: 2, z: 2 }, 0));
    const before = h.renders;
    const reverse = await h.doCommand(
      Command.writeVoxel({ x: 2, y: 2, z: 2 }, 0),
    );
    expect(reverse.type).toBe("NoOperation");
    expect(h.renders).toBe(before);
  });

  it("does nothing outside the box", async () => {
    const h = harness();
    const reverse = await h.doCommand(
      Command.writeVoxel({ x: 9, y: 0, z: 0 }, 1),
    );
    expect(reverse.type).toBe("NoOperation");
  });
});

describe("eraseVoxel", () => {
  it("empties the voxel and answers with what was in it", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 1, y: 1, z: 1 }, 1));
    const reverse = await h.doCommand(Command.eraseVoxel({ x: 1, y: 1, z: 1 }));
    expect(at(h.volume(), 1, 1, 1)).toBe(Bitmap.EMPTY);
    expect(reverse).toMatchObject({ type: "WriteVoxel", paletteIndex: 1 });
  });
});

describe("fillVoxel", () => {
  it("fills the run of one value around the press, and no more", async () => {
    const h = harness();
    // A wall across the middle of the box, with air either side of it.
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        await h.doCommand(Command.writeVoxel({ x: 2, y, z }, 0));
      }
    }
    const reverse = await h.doCommand(
      Command.fillVoxel({ x: 0, y: 0, z: 0 }, "xy", 1),
    );
    // The half of the slice in front of the wall is filled, and the half behind
    // it is left alone, because a fill spreads within the plane it is drawn on.
    expect(at(h.volume(), 0, 0, 0)).toBe(1);
    expect(at(h.volume(), 1, 3, 0)).toBe(1);
    expect(at(h.volume(), 2, 0, 0)).toBe(0);
    expect(at(h.volume(), 3, 0, 0)).toBe(Bitmap.EMPTY);
    expect(reverse.type).toBe("Sequence");
  });

  it("stays inside the plane it is given, whichever plane that is", async () => {
    const h = harness();
    for (const [x, y, z] of [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ] as [number, number, number][]) {
      await h.doCommand(Command.writeVoxel({ x, y, z }, 0));
    }
    // Filling from a corner on the yz plane runs over y and z, and must not
    // cross to the voxel beside it in x.
    await h.doCommand(Command.fillVoxel({ x: 0, y: 0, z: 0 }, "yz", 1));
    expect(at(h.volume(), 0, 1, 0)).toBe(1);
    expect(at(h.volume(), 1, 0, 0)).toBe(0);
  });

  it("takes the filled run back as one thing", async () => {
    const h = harness();
    const fill = await h.doCommand(
      Command.fillVoxel({ x: 0, y: 0, z: 0 }, "xy", 1),
    );
    const restores = await h.doCommand(fill as never);
    expect(restores.type).toBe("Sequence");
    expect(at(h.volume(), 0, 0, 0)).toBe(Bitmap.EMPTY);
  });

  it("does nothing where the press is outside the box", async () => {
    const h = harness();
    const reverse = await h.doCommand(
      Command.fillVoxel({ x: 7, y: 7, z: 7 }, "xy", 1),
    );
    expect(reverse.type).toBe("NoOperation");
  });
});

describe("fillBlock", () => {
  it("fills the box it names and answers with what each voxel held", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 0, y: 0, z: 0 }, 0));
    const reverse = await h.doCommand(
      Command.fillBlock(Vector3D.create(0, 0, 0), Vector3D.create(1, 1, 1), 1),
    );
    expect(at(h.volume(), 1, 1, 1)).toBe(1);
    expect(at(h.volume(), 0, 0, 0)).toBe(1);
    expect(at(h.volume(), 2, 2, 2)).toBe(Bitmap.EMPTY);
    // The one voxel that held something takes that back; the rest took away.
    expect(reverse.type).toBe("Sequence");
  });

  it("leaves the part of the block that runs off the box alone", async () => {
    const h = harness();
    await h.doCommand(
      Command.fillBlock(Vector3D.create(2, 2, 2), Vector3D.create(9, 9, 9), 1),
    );
    expect(at(h.volume(), 3, 3, 3)).toBe(1);
    expect(h.volume().dimensions).toEqual({ width: 4, height: 4, depth: 4 });
  });
});

describe("a sequence", () => {
  it("answers with its own steps in the order they were made", async () => {
    const h = harness();
    const reverse = await h.doCommand(
      Command.sequence([
        Command.writeVoxel({ x: 0, y: 0, z: 0 }, 1),
        Command.writeVoxel({ x: 0, y: 0, z: 0 }, 0),
      ]) as never,
    );
    // The second write lands on top of the first, so it is the one taken back
    // first and the first one is found underneath it.
    expect(reverse.type).toBe("Sequence");
    expect(at(h.volume(), 0, 0, 0)).toBe(0);
  });

  it("takes a stroke back to nothing at all", async () => {
    const h = harness();
    const reverse = await h.doCommand(
      Command.sequence([
        Command.writeVoxel({ x: 0, y: 0, z: 0 }, 1),
        Command.writeVoxel({ x: 1, y: 0, z: 0 }, 1),
        Command.writeVoxel({ x: 2, y: 0, z: 0 }, 1),
      ]) as never,
    );
    await h.doCommand(reverse as never);
    expect(h.volume().voxels.every((i) => i === Bitmap.EMPTY)).toBe(true);
  });
});

describe("resize", () => {
  it("re-frames the box and answers with the one it was", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 0, y: 0, z: 0 }, 1));
    const reverse = await h.doCommand(
      Command.resize({ x: 8, y: 8, z: 8 }, { x: "min" }) as never,
    );
    expect(h.volume().dimensions).toEqual({ width: 8, height: 8, depth: 8 });
    // The box grew along its width alone, so the voxel moved along it alone.
    expect(at(h.volume(), 4, 0, 0)).toBe(1);

    await h.doCommand(reverse as never);
    expect(h.volume().dimensions).toEqual({ width: 4, height: 4, depth: 4 });
    expect(at(h.volume(), 0, 0, 0)).toBe(1);
  });
});

describe("loadVolume", () => {
  it("replaces the model and its palette, and answers with both as they were", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 0, y: 0, z: 0 }, 1));

    const other = createVolume({ width: 2, height: 2, depth: 2 });
    other.voxels.fill(0);
    const reverse = await h.doCommand(
      Command.loadVolume(
        writeModel(other, [BLUE]).buffer as ArrayBuffer,
      ) as never,
    );

    expect(h.volume().dimensions).toEqual({ width: 2, height: 2, depth: 2 });
    expect(h.palette()).toEqual([BLUE]);

    await h.doCommand(reverse as never);
    expect(h.volume().dimensions).toEqual({ width: 4, height: 4, depth: 4 });
    expect(h.palette()).toEqual([RED, BLUE]);
    expect(at(h.volume(), 0, 0, 0)).toBe(1);
  });
});

describe("snapshot", () => {
  it("is the model as it stands, as the file the model is written in", () => {
    const h = harness();
    const snapshot = h.snapshot();
    expect(snapshot.type).toBe("LoadVolume");
    if (snapshot.type !== "LoadVolume") {
      return;
    }
    expect(new Uint8Array(snapshot.data)).toEqual(
      writeModel(h.volume(), h.palette()),
    );
  });
});

describe("the render and the autosave", () => {
  it("are asked for once per change that did something", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 0, y: 0, z: 0 }, 1));
    expect(h.renders).toBe(1);
    expect(h.saves).toBe(1);
  });

  it("are not asked for a change that did nothing", async () => {
    const h = harness();
    await h.doCommand(Command.writeVoxel({ x: 0, y: 0, z: 0 }, Bitmap.EMPTY));
    expect(h.renders).toBe(0);
    expect(h.saves).toBe(0);
  });
});
