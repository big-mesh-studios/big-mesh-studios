import { describe, expect, it } from "vitest";
import { Command } from "./command/Command";
import { changedCells } from "./mesh-dirty";

const cell = (x: number, y: number, z: number) => ({ x, y, z });

describe("changedCells", () => {
  it("reads a single written voxel as that one cell", () => {
    expect(changedCells(Command.writeVoxel(cell(3, 4, 5), 7))).toEqual({
      box: { low: cell(3, 4, 5), high: cell(3, 4, 5) },
    });
  });

  it("reads an erased voxel the same as a written one", () => {
    expect(changedCells(Command.eraseVoxel(cell(3, 4, 5)))).toEqual({
      box: { low: cell(3, 4, 5), high: cell(3, 4, 5) },
    });
  });

  it("reads a filled block as the box it covers", () => {
    expect(
      changedCells(Command.fillBlock(cell(1, 2, 3), cell(8, 9, 10), 4)),
    ).toEqual({ box: { low: cell(1, 2, 3), high: cell(8, 9, 10) } });
  });

  it("reads a resize and a load as the whole model", () => {
    // Both replace the box, so every chunk of it is a different shape or holds
    // different voxels than it did.
    expect(
      changedCells(Command.resize(cell(64, 64, 64), { x: "max" })),
    ).toEqual({ everything: true });
    expect(changedCells(Command.loadVolume(new ArrayBuffer(8)))).toEqual({
      everything: true,
    });
  });

  it("reads nothing as nothing changed", () => {
    expect(changedCells(Command.noOperation())).toBeUndefined();
  });

  it("covers a stroke with the box around every voxel in it", () => {
    // A stroke is a sequence, and its box is a slab through the model rather
    // than the model — which is what keeps a stroke to one chunk of rebuilding.
    const stroke = Command.sequence([
      Command.writeVoxel(cell(2, 5, 1), 3),
      Command.writeVoxel(cell(6, 5, 1), 3),
      Command.writeVoxel(cell(4, 5, 1), 3),
    ]);
    expect(changedCells(stroke)).toEqual({
      box: { low: cell(2, 5, 1), high: cell(6, 5, 1) },
    });
  });

  it("takes the box of a sequence's own parts, not the whole model", () => {
    const stroke = Command.sequence([
      Command.writeVoxel(cell(2, 5, 1), 3),
      Command.writeVoxel(cell(6, 2, 4), 3),
    ]);
    expect(changedCells(stroke)).toEqual({
      box: { low: cell(2, 2, 1), high: cell(6, 5, 4) },
    });
  });

  it("skips the parts of a stroke that changed nothing", () => {
    const stroke = Command.sequence([
      Command.noOperation(),
      Command.writeVoxel(cell(2, 5, 1), 3),
      Command.noOperation(),
    ]);
    expect(changedCells(stroke)).toEqual({
      box: { low: cell(2, 5, 1), high: cell(2, 5, 1) },
    });
  });

  it("reads a sequence of nothing as nothing changed", () => {
    expect(
      changedCells(
        Command.sequence([Command.noOperation(), Command.noOperation()]),
      ),
    ).toBeUndefined();
    expect(changedCells(Command.sequence([]))).toBeUndefined();
  });

  it("lets one part of a sequence take the whole of it", () => {
    // A stroke that also loads a file replaces the model, so the box around
    // the other parts is beside the point.
    const mixed = Command.sequence([
      Command.writeVoxel(cell(2, 5, 1), 3),
      Command.loadVolume(new ArrayBuffer(8)),
    ]);
    expect(changedCells(mixed)).toEqual({ everything: true });
  });

  it("reads an undo and the change it undoes as the same cells", () => {
    // The preview is rebuilt from the reverse of what was applied, so the two
    // having to agree is what makes an undo redraw the right geometry.
    const forward = Command.writeVoxel(cell(7, 8, 9), 3);
    const reverse = Command.eraseVoxel(cell(7, 8, 9));
    expect(changedCells(reverse)).toEqual(changedCells(forward));
  });
});
