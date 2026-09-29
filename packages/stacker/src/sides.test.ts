// @vitest-environment node
//
// The projection is the riskiest thing in this feature: six drawings have to come
// out facing the right way, or every colour lands on the wrong face of a box that
// is the wrong shape. The check that settles it needs no reference implementation
// — project a volume, solve the drawings back, and ask whether the box that comes
// out is the one that went in.
import { describe, expect, it } from "vitest";
import { Bitmap, type RGBA } from "@big-mesh-studios/maths";
import { partDimensions, sideKinds, type Part } from "./data";
import { REMOVED, applyEdits, editVolumeFor } from "./edits";
import { writeCvox } from "./cvox";
import {
  paletteSlotsInUse,
  partFromCvox,
  partFromVolume,
  placePart,
} from "./import-volume";
import { sidesOfVolume } from "./sides";
import { packVolume, packedFaces, solveVoxels } from "./solver";
import { solvePart } from "./figure-meshes";
import { createVolume, resizeVolume, standOn, type Volume } from "./volume";

/** A volume painted through a function of its coordinates. */
const volumeOf = (
  width: number,
  height: number,
  depth: number,
  at: (x: number, y: number, z: number) => number,
): Volume => {
  const volume = createVolume({ width, height, depth });

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        volume.voxels[z * width * height + y * width + x] = at(x, y, z);
      }
    }
  }

  return volume;
};

/** A hollow box one colour on the outside and another where it is solid inside. */
const shell = (size: number, outside: number, inside: number): Volume =>
  volumeOf(size, size, size, (x, y, z) => {
    const onFace =
      x === 0 ||
      y === 0 ||
      z === 0 ||
      x === size - 1 ||
      y === size - 1 ||
      z === size - 1;
    return onFace ? outside : inside;
  });

/** Whether a cell is on the outside of a cube of that size. */
const onFaceOf = (size: number, x: number, y: number, z: number) =>
  x === 0 ||
  y === 0 ||
  z === 0 ||
  x === size - 1 ||
  y === size - 1 ||
  z === size - 1;

/** What the six drawings of a volume solve to. */
const solvedOf = (volume: Volume): Uint8Array =>
  solveVoxels(volume.dimensions, sidesOfVolume(volume), []);

/** The model a volume is brought back in as: solved, then corrected. */
const correctedOf = (volume: Volume): Uint8Array => {
  const solved = solvedOf(volume);
  return applyEdits(
    solved,
    volume.dimensions,
    editVolumeFor(volume.dimensions, solved, volume),
  );
};

/**
 * Every voxel of a packed box, as a string: its flag and its six colours, or the
 * word for nothing being there.
 *
 * Compared as bytes rather than read back into palette indices, because what is
 * being asked is whether the two boxes are the same, not whether they agree about
 * a palette.
 */
const packedAs = (volume: Volume, packed: Uint8Array): string => {
  const { width, height, depth } = volume.dimensions;
  const out: string[] = [];

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const o = (z * width * height + y * width + x) << 2;
        out.push(
          (packed[o + 3] & 0b11000000) === 0
            ? `${x},${y},${z}:air`
            : `${x},${y},${z}:${packed[o]},${packed[o + 1]},${packed[o + 2]},${packed[o + 3]}`,
        );
      }
    }
  }

  return out.join(" ");
};

describe("sidesOfVolume", () => {
  it("draws a face the size the side it is drawn on measures", () => {
    // The front and back are drawn width across and height down; the left and
    // right depth across and height down; the top and bottom width across and
    // depth down. Each of the three extents is carried by four of the six.
    const sides = sidesOfVolume(volumeOf(4, 5, 6, () => 1));

    for (const kind of sideKinds) {
      const across = kind === "left" || kind === "right" ? 6 : 4;
      const down = kind === "top" || kind === "bottom" ? 6 : 5;
      expect([sides[kind].width, sides[kind].height]).toEqual([across, down]);
    }
  });

  it("shows the nearest voxel along the run each face looks down", () => {
    // A box with a red wall at z = 0 and a green one behind it: the back, which
    // closes the low end of the depth, is what stands at z = 0 and so is red,
    // while the front sees green over the top of it. A face colours the end of a
    // run rather than looking through it, because that is what the solver reads
    // it back as.
    const sides = sidesOfVolume(
      volumeOf(3, 3, 3, (_x, _y, z) => (z === 0 ? 4 : 7)),
    );

    expect(new Set(sides.back.data)).toEqual(new Set([4]));
    expect(new Set(sides.front.data)).toEqual(new Set([7]));
  });

  it("gives every exposed face the colour of the voxel it is on", () => {
    // The orientation check, and it has to be made without the edits in it: the
    // edits are computed against the volume that was wanted, so they put back
    // whatever the drawings got wrong and a whole round trip passes however
    // wrongly the drawings were taken. Asking about the faces the box can see
    // cannot be argued with.
    //
    // A colour per voxel standing for where that voxel is, so a drawing turned
    // the wrong way about either of its axes, or a run walked from the wrong end,
    // puts a colour on a different voxel and shows up here. Twenty-seven colours
    // is within what a palette can address, which is why the box is three a side.
    const volume = volumeOf(3, 3, 3, (x, y, z) => 1 + (z * 9 + y * 3 + x));
    const solved = solvedOf(volume);
    const faces = packedFaces(volume.dimensions, solved);
    const { width, height, depth } = volume.dimensions;
    const at = (x: number, y: number, z: number) =>
      volume.voxels[z * 9 + y * 3 + x];

    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let face = 0; face < 6; face++) {
            // +x, −x, +y, −y, +z, −z, as `faceIndexOf` numbers them.
            const axis = face >> 1;
            const step = face % 2 === 0 ? 1 : -1;
            const here = [x, y, z];
            const there = [x, y, z];
            here[axis] += step;

            const openTo =
              there[0] < 0 ||
              there[1] < 0 ||
              there[2] < 0 ||
              there[0] >= width ||
              there[1] >= height ||
              there[2] >= depth ||
              at(there[0], there[1], there[2]) === Bitmap.EMPTY;

            if (!openTo) {
              continue;
            }

            // Nothing stands between this face and the sight along it, so the
            // nearest voxel the face could show is this one.
            expect(faces.colour(x, y, z, face)).toBe(at(x, y, z));
          }
        }
      }
    }
  });

  it("colours a whole run from the voxel at the face of it", () => {
    // The other half of what a face is, and the reason there is no box whose
    // drawings are the whole model except a single voxel: a face colours every
    // voxel in the run it looks along, not only the one it touches. A box one cell
    // deep has nothing behind anything, and its side faces still take their colour
    // from the end of the row, because that is what looking along a row reaches.
    const volume = volumeOf(3, 3, 1, (x, y) => 1 + (y * 3 + x));
    const faces = packedFaces(volume.dimensions, solvedOf(volume));

    // A voxel's +x face is read off the drawing that closes the high end of the
    // width, and its −x face off the one that closes the low end, so every voxel
    // in a row shows the same colour on that side: the row's own far end.
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(faces.colour(x, y, 0, 0)).toBe(1 + y * 3 + 2);
        expect(faces.colour(x, y, 0, 1)).toBe(1 + y * 3);
      }
    }
  });

  it("is the whole model for a single voxel", () => {
    const volume = volumeOf(1, 1, 1, () => 5);
    const solved = solvedOf(volume);

    expect(packedAs(volume, solved)).toBe(packedAs(volume, packVolume(volume)));
    expect(
      editVolumeFor(volume.dimensions, solved, volume).voxels.every(
        (index) => index === Bitmap.EMPTY,
      ),
    ).toBe(true);
  });

  it("leaves a face empty where a whole column of the box is empty", () => {
    // A face is a silhouette of a run rather than of the surface, so a part
    // filling one end of a column still has that column drawn on the face at the
    // other end. A face comes back empty only where nothing at all stands anywhere
    // along the column it looks down, and that is a drawing saying so — it carves
    // that part of the box away — rather than a failure to draw.
    const volume = volumeOf(3, 3, 3, () => Bitmap.EMPTY);
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        volume.voxels[z * 9 + y * 3] = 1;
      }
    }

    const sides = sidesOfVolume(volume);
    // A face drawn across the depth — the left and the right — has every one of
    // its columns standing, because the wall at x = 0 is in all of them whichever
    // end they are looked at from.
    for (const kind of ["left", "right"] as const) {
      expect(new Set(sides[kind].data)).toEqual(new Set([1]));
    }

    // A face drawn across the width — the back and the front — has only one
    // column standing, because nothing at all is in the other two. The back
    // counts its width against the way the box counts it and the front counts it
    // up, so the standing column is at the far end of one drawing and the near
    // end of the other: the same wall, drawn two ways round.
    for (let py = 0; py < 3; py++) {
      expect(sides.front.data[py * 3 + 0]).toBe(1);
      expect(sides.front.data[py * 3 + 1]).toBe(Bitmap.EMPTY);
      expect(sides.front.data[py * 3 + 2]).toBe(Bitmap.EMPTY);

      expect(sides.back.data[py * 3 + 2]).toBe(1);
      expect(sides.back.data[py * 3 + 1]).toBe(Bitmap.EMPTY);
      expect(sides.back.data[py * 3 + 0]).toBe(Bitmap.EMPTY);
    }
  });

  it("gives a solid box of one colour back the whole of that box", () => {
    // The orientation check, and it needs no reference to compare against: a
    // volume of one colour has an obvious answer, because every voxel must come
    // back solid with that colour on all six of its faces whatever order the
    // drawings were taken in or whichever end each run was walked from. A flip on
    // any axis, or a run looked at from the far end, still solves to a solid box
    // of one colour, so this is a floor rather than the whole check.
    for (const size of [
      { width: 3, height: 3, depth: 3 },
      { width: 4, height: 5, depth: 6 },
      // Odd extents, so a box with no whole middle to be symmetric about.
      { width: 7, height: 3, depth: 5 },
    ]) {
      const volume = volumeOf(size.width, size.height, size.depth, () => 9);
      expect(packedAs(volume, solvedOf(volume))).toBe(
        packedAs(volume, packVolume(volume)),
      );
    }
  });

  it("keeps a differently coloured surface on the face it belongs to", () => {
    // The check that catches a flip, done through the whole way a file is
    // brought in: project, solve, put the lost voxels back, and the model is the
    // one that went in. A drawing turned the wrong way about either of its axes
    // puts a wall's colour on another face, and neither the solved box nor the
    // edits recover it, so the comparison fails.
    for (const size of [3, 4, 5]) {
      const volume = volumeOf(size, size, size, (x, y, z) => {
        if (onFaceOf(size, x, y, z)) {
          // The face at z = 0 is red and the other five are blue.
          return z === 0 ? 4 : 5;
        }
        // And the core is green, which no face can see.
        return 3;
      });

      expect(packedAs(volume, correctedOf(volume))).toBe(
        packedAs(volume, packVolume(volume)),
      );
    }
  });

  it("loses what six drawings cannot hold, which is what the edits are for", () => {
    // A hollow shell: the core is behind a wall on all six sides, so no drawing
    // shows it and the six drawings give a solid box. The core is not carved away
    // either, because a run drawn once is solid the whole way along.
    const volume = shell(4, 2, Bitmap.EMPTY);
    const solved = solvedOf(volume);

    for (let z = 0; z < 4; z++) {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const o = (z * 16 + y * 4 + x) << 2;
          // Every cell is standing, the core included: the drawings cannot say
          // otherwise, and that is the loss.
          expect(solved[o + 3] & 0b11000000).toBe(0b11000000);
        }
      }
    }

    // So the core is all edits, taken away.
    const edits = editVolumeFor(volume.dimensions, solved, volume);
    expect(edits.voxels.filter((index) => index === REMOVED)).toHaveLength(8);
  });
});

describe("editVolumeFor", () => {
  it("leaves a box of one colour alone, because the drawings already say it", () => {
    const volume = volumeOf(4, 4, 4, () => 3);
    const edits = editVolumeFor(volume.dimensions, solvedOf(volume), volume);

    expect(edits.voxels.every((index) => index === Bitmap.EMPTY)).toBe(true);
  });

  it("puts back the core of a shell that no face can see", () => {
    const volume = shell(3, 2, 5);
    const edits = editVolumeFor(volume.dimensions, solvedOf(volume), volume);

    // The one cell no face can see, and the twenty-six the drawings got right.
    expect(edits.voxels.filter((index) => index === 5)).toHaveLength(1);
    expect(edits.voxels.filter((index) => index === Bitmap.EMPTY)).toHaveLength(
      26,
    );
  });

  it("takes away a voxel the drawings filled in that should be hollow", () => {
    // A gap with a voxel in front of it on all six sides cannot be drawn: a face
    // drawn once carves the whole run it looks along, and every one of the six
    // faces of this box is drawn over the gap's own cell. The drawings give a
    // solid box, and the gap has to be said to be empty.
    //
    // The box has to be three a side for that. A box one tall has the gap on its
    // own top and bottom, so those two faces see straight to it and carve it away
    // without any edit at all.
    const volume = volumeOf(3, 3, 3, (x, y, z) =>
      x === 1 && y === 1 && z === 1 ? Bitmap.EMPTY : 6,
    );

    const solved = solvedOf(volume);
    // The drawings filled it in.
    expect(solved[((1 * 9 + 1 * 3 + 1) << 2) + 3] & 0b11000000).toBe(
      0b11000000,
    );

    const edits = editVolumeFor(volume.dimensions, solved, volume);
    expect(edits.voxels[1 * 9 + 1 * 3 + 1]).toBe(REMOVED);
    // And the other twenty-six are left alone, because the drawings got them.
    expect(edits.voxels.filter((index) => index === Bitmap.EMPTY)).toHaveLength(
      26,
    );
  });

  it("rejects a volume of another shape rather than comparing half of it", () => {
    const volume = volumeOf(3, 3, 3, () => 1);

    expect(() =>
      editVolumeFor(
        { width: 4, height: 3, depth: 3 },
        solvedOf(volume),
        volume,
      ),
    ).toThrow(/cannot be compared/);
  });
});

describe("applyEdits", () => {
  it("reproduces the volume the edits were made for", () => {
    // The property the whole feature rests on: solve the drawings, apply what is
    // left of the original, and the model is the model that went in.
    for (const volume of [
      volumeOf(3, 3, 3, () => 4),
      shell(3, 2, 5),
      volumeOf(5, 4, 6, (x, y, z) =>
        x + y + z > 6 ? Bitmap.EMPTY : ((x + y + z) % 7) + 1,
      ),
    ]) {
      const solved = solvedOf(volume);
      const edits = editVolumeFor(volume.dimensions, solved, volume);

      expect(
        packedAs(volume, applyEdits(solved, volume.dimensions, edits)),
      ).toBe(packedAs(volume, packVolume(volume)));
    }
  });

  it("leaves a box with nothing to say exactly as it found it", () => {
    const volume = volumeOf(3, 3, 3, (x, y, z) => ((x + y + z) % 5) + 1);
    const solved = solvedOf(volume);
    const before = Uint8Array.from(solved);

    applyEdits(solved, volume.dimensions, createVolume(volume.dimensions));

    expect(solved).toEqual(before);
  });

  it("refuses an edit over a box of another shape rather than guessing", () => {
    const volume = volumeOf(3, 3, 3, () => 1);

    expect(() =>
      applyEdits(
        solvedOf(volume),
        volume.dimensions,
        createVolume({ width: 2, height: 3, depth: 3 }),
      ),
    ).toThrow(/cannot be applied/);
  });
});

describe("partFromVolume", () => {
  it("draws the volume it was brought in from, stood the way a part is drawn", () => {
    // The whole way round, through a file: write a volume as a `.cvox`, bring it
    // back in as a part, and ask whether the part draws the model that went out.
    // Anything lost in the projection and not put back by the edits shows up here
    // as a packed box that is not the one that was written.
    //
    // Compared against the file's volume stood on its height, because that is
    // what a `.cvox` is: a model stored on its z, and a part drawn on its y. A
    // file brought in without the turn would be a model on its side, and this
    // comparison is what would notice.
    for (const volume of [
      volumeOf(3, 3, 3, () => 4),
      shell(3, 2, 5),
      volumeOf(3, 3, 3, (x, y, z) => 1 + (z * 9 + y * 3 + x)),
      // A shell with a differently coloured face on each side, so every wall is
      // tested and the core behind them is lost and put back.
      volumeOf(3, 3, 3, (x, y, z) => {
        if (!onFaceOf(3, x, y, z)) {
          return 7;
        }
        if (x === 0) return 1;
        if (x === 2) return 2;
        if (y === 0) return 3;
        if (y === 2) return 4;
        return z === 0 ? 5 : 6;
      }),
    ]) {
      const palette = Array.from({ length: 32 }, (_, i) => ({
        r: i * 8,
        g: 255 - i * 8,
        b: i * 4,
        a: 255,
      }));

      const bytes = writeCvox(volume, palette);
      const brought = partFromCvox(bytes, "imported");
      const upright = standOn(volume, "z", "y");

      expect(packedAs(upright, solvePart(brought.part).voxels)).toBe(
        packedAs(upright, packVolume(upright)),
      );
    }
  });

  it("brings a file's own colours in, so nothing has to be renumbered", () => {
    const palette = [
      { r: 1, g: 2, b: 3, a: 255 },
      { r: 4, g: 5, b: 6, a: 255 },
    ];
    const volume = volumeOf(2, 2, 2, () => 1);

    const brought = partFromCvox(writeCvox(volume, palette), "imported");

    expect(brought.palette).toEqual(palette);
    expect(brought.dropped).toEqual([]);
    // And the drawings address the file's own palette, so colour 1 is colour 1.
    expect(
      new Set(Object.values(brought.part.sides).map((side) => side.data[0])),
    ).toEqual(new Set([1]));
  });

  it("stands a file on its height, which is what a part is drawn on", () => {
    // A bar lying along the depth of a file arrives standing along the height,
    // so the two are not the same and a part that did not turn would be on its
    // side. Nothing about a box says which way is up, so this is said here rather
    // than left to be found.
    const volume = volumeOf(4, 1, 1, () => 1);
    const brought = partFromVolume(standOn(volume, "z", "y"), "imported");

    expect(partDimensions(brought)).toEqual({ width: 4, height: 1, depth: 1 });
  });

  it("brings a part in with no cuts, standing on its own centre", () => {
    const volume = volumeOf(4, 2, 6, () => 1);

    const part = partFromVolume(volume, "imported");

    expect(part.name).toBe("imported");
    expect(part.sections).toEqual([]);
    expect(part.scale).toBe(1);
    expect(part.parent).toBeNull();
    // A box of an even extent has its middle on a cell boundary, which is what a
    // part pivoting on its own middle stands at.
    expect(part.pivot).toEqual({ x: 2, y: 1, z: 3 });
    expect(part.edits?.dimensions).toEqual(volume.dimensions);
  });
});

describe("a part's edits under a resize", () => {
  it("stay on the voxel they were made on when the box grows at the far end", () => {
    const edits = createVolume({ width: 3, height: 3, depth: 3 });
    edits.voxels[1 * 9 + 1 * 3 + 1] = 4;

    const grown = resizeVolume(
      edits,
      { width: 5, height: 3, depth: 3 },
      { width: "max" },
    );

    // The same cell, at the same place in the box, because the new room went at
    // the far end and nothing moved.
    expect(grown.voxels[1 * 15 + 1 * 5 + 1]).toBe(4);
    expect(grown.voxels).toHaveLength(5 * 3 * 3);
  });

  it("move with the box when it grows at the near end", () => {
    const edits = createVolume({ width: 3, height: 3, depth: 3 });
    edits.voxels[1 * 9 + 1 * 3 + 1] = 4;

    const grown = resizeVolume(
      edits,
      { width: 5, height: 3, depth: 3 },
      { width: "min" },
    );

    // The new room went in front, so what was at the low end moved along by it —
    // the same answer the drawings are re-framed with, so a hand-made voxel and
    // a drawn one end up in step.
    expect(grown.voxels[1 * 15 + 1 * 5 + 3]).toBe(4);
  });

  it("go with the cell when the new size does not reach it", () => {
    const edits = createVolume({ width: 3, height: 3, depth: 3 });
    edits.voxels[1 * 9 + 1 * 3 + 1] = 4;

    const shrunk = resizeVolume(
      edits,
      { width: 1, height: 3, depth: 3 },
      { width: "max" },
    );

    expect(shrunk.voxels.every((index) => index === Bitmap.EMPTY)).toBe(true);
  });
});

describe("placePart", () => {
  const GREY = { r: 8, g: 8, b: 8, a: 255 };
  const RED = { r: 200, g: 10, b: 10, a: 255 };
  const BLUE = { r: 10, g: 10, b: 200, a: 255 };

  /**
   * A file's worth of part: two cells wide, the near column one colour and the far
   * one another, which puts both in every face drawn across that axis.
   */
  const aFile = (palette: RGBA[]) => ({
    part: partFromVolume(
      volumeOf(2, 2, 2, (x) => (x === 0 ? 0 : 1)),
      "imported",
    ),
    palette,
    dropped: [],
  });

  it("moves a colour the figure already has onto the slot it is in", () => {
    // The figure says red is slot one and the file says its red is slot zero.
    // Left alone, the part would be drawn in grey wherever it meant red.
    const placed = placePart(aFile([GREY, RED]), [RED, GREY, BLUE], new Set());

    expect(placed.palette).toEqual([RED, GREY, BLUE]);
    expect(placed.dropped).toEqual([]);
    // The near column was the file's zero, which was its grey, which is the
    // figure's one.
    expect(Array.from(placed.part.sides.front.data)).toEqual([1, 0, 1, 0]);
  });

  it("puts a colour the figure lacks into a slot nothing is drawn in", () => {
    // Red is nowhere in the figure, so it takes the one slot nothing is drawn in,
    // and the far column is named by that rather than by the file's own numbering.
    const placed = placePart(
      aFile([GREY, RED]),
      [BLUE, GREY, { r: 1, g: 2, b: 3, a: 255 }],
      new Set([0, 1]),
    );

    expect(placed.palette[2]).toEqual(RED);
    expect(Array.from(placed.part.sides.front.data)).toEqual([1, 2, 1, 2]);
    expect(placed.dropped).toEqual([]);
  });

  it("draws a colour with no slot in the nearest it has, and says so", () => {
    // Thirty-two colours in a figure all of which are drawn in, and a thirty-third
    // on the way in. The import is not refused over one colour, and the colour it
    // could not have is reported rather than quietly swapped.
    const palette = Array.from({ length: 32 }, (_, i): RGBA => ({
      r: i * 8,
      g: 0,
      b: 0,
      a: 255,
    }));
    const bright = { r: 250, g: 0, b: 0, a: 255 };

    const placed = placePart(
      {
        part: partFromVolume(
          volumeOf(2, 2, 2, () => 0),
          "imported",
        ),
        palette: [bright],
        dropped: [],
      },
      palette,
      new Set(palette.map((_, i) => i)),
    );

    expect(placed.dropped).toEqual([bright]);
    // The reddest colour there is the last slot, so this stands in for it.
    expect(new Set(placed.part.sides.front.data)).toEqual(new Set([31]));
  });

  it("leaves a cell with nothing drawn in it, and an edit that removes one, alone", () => {
    // Neither is a colour, so neither is anything to move. A renumbering that
    // touched them would turn an erased cell into a drawn one.
    const part = partFromVolume(
      volumeOf(2, 2, 2, (x) => (x === 0 ? 0 : 1)),
      "imported",
    );
    const edits = createVolume(partDimensions(part));
    edits.voxels[0] = REMOVED;
    edits.voxels[1] = 1;

    const placed = placePart(
      { part: { ...part, edits }, palette: [GREY, RED], dropped: [] },
      [BLUE, GREY],
      new Set([0]),
    );

    expect(placed.part.edits?.voxels[0]).toBe(REMOVED);
    expect(placed.part.edits?.voxels[1]).toBe(1);
  });
});

describe("paletteSlotsInUse", () => {
  /** A part painted in the colours named, and with the cuts' faces given. */
  const painted = (name: string, indices: number[], cuts = 0): Part => {
    const part = partFromVolume(
      volumeOf(2, 2, 2, (x) => indices[x % indices.length]),
      name,
    );
    part.sections = Array.from({ length: cuts }, () => ({
      axis: "depth" as const,
      at: 1,
      before: Bitmap.create(2, 2),
      after: Bitmap.create(2, 2),
    }));
    return part;
  };

  it("counts every colour any part of the figure is drawn in", () => {
    // Two parts between them, so a slot only one of them draws in is still a slot
    // that is taken.
    const used = paletteSlotsInUse([
      painted("body", [3]),
      painted("arm", [7, Bitmap.EMPTY]),
    ]);

    expect([...used].sort((one, other) => one - other)).toEqual([3, 7]);
  });

  it("counts a colour only a cut's face is drawn in", () => {
    // A part's cuts are drawn on too, and a colour that reaches the model nowhere
    // else is still spoken for.
    const part = painted("body", [1], 1);
    part.sections[0].before.data.fill(9);

    expect([...paletteSlotsInUse([part])].sort((a, b) => a - b)).toEqual([
      1, 9,
    ]);
  });

  it("counts a colour only an edit is in, and not one that removes a voxel", () => {
    const part = painted("body", [1]);
    const edits = createVolume(partDimensions(part));
    edits.voxels[0] = 5;
    edits.voxels[1] = REMOVED;

    expect(
      [...paletteSlotsInUse([{ ...part, edits }])].sort((a, b) => a - b),
    ).toEqual([1, 5]);
  });

  it("leaves a slot free for a figure with nothing drawn in it", () => {
    expect(paletteSlotsInUse([]).size).toBe(0);
  });
});
