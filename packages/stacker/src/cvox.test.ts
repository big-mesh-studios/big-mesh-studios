import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Bitmap, type RGBA, Vector3D } from "@big-mesh-studios/maths";
import {
  createVolume,
  readVoxel,
  volumeLength,
  writeVoxel,
  type Volume,
} from "./volume";
import {
  CVOX_VERSION,
  MAX_COLOURS,
  packCubes,
  readCvox,
  writeCvox,
  type LoadedVolume,
} from "./cvox";

/** One of the files the format's own author published, read off disk. */
const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/${name}.cvox`, import.meta.url));

/** Where a version chunk's content stands, after the eight bytes of its own header. */
const VERSION_CONTENT = 8;

/** Where a `SIZE` chunk's content stands, after the eight bytes of its own header. */
const SIZE_CONTENT = 20;

const LILAC: RGBA = { r: 153, g: 153, b: 255, a: 255 };

/** The solid voxels of a loaded model, as `x,y,z:paletteIndex`. */
function solidOf(loaded: LoadedVolume) {
  const { dimensions } = loaded.volume;
  const solid = new Map<string, number>();
  for (let z = 0; z < dimensions.depth; z++) {
    for (let y = 0; y < dimensions.height; y++) {
      for (let x = 0; x < dimensions.width; x++) {
        const index = readVoxel(loaded.volume, x, y, z);
        if (index !== Bitmap.EMPTY) {
          solid.set(`${x},${y},${z}`, index);
        }
      }
    }
  }
  return solid;
}

const countSolid = (volume: Volume) =>
  volume.voxels.filter((index) => index !== Bitmap.EMPTY).length;

describe("readCvox", () => {
  it("reads a file the format's author published", () => {
    const { volume, palette, dropped } = readCvox(fixture("3x3x3"));
    expect(volume.dimensions).toEqual({ width: 3, height: 3, depth: 3 });
    expect(palette).toEqual([LILAC]);
    expect(dropped).toEqual([]);
    expect(countSolid(volume)).toBe(20);
  });

  it("reads a cube's high corner as the last voxel it holds, not the one past", () => {
    // The author's 3x3x3 is a solid box with the six face centres and the core
    // left out, which is twenty voxels and no more.
    const { volume } = readCvox(fixture("3x3x3"));
    expect(countSolid(volume)).toBe(20);
    // The near face is a ring of eight: everything but its middle.
    const ring = Array.from({ length: 9 }, (_, i) =>
      readVoxel(volume, i % 3, Math.floor(i / 3), 0),
    );
    expect(ring.filter((i) => i === Bitmap.EMPTY)).toEqual([Bitmap.EMPTY]);
  });

  it("reads cubes and single voxels out of the same file", () => {
    const { volume, palette } = readCvox(fixture("castle"));
    expect(volume.dimensions).toEqual({ width: 21, height: 21, depth: 21 });
    expect(palette).toHaveLength(1);
    // Two thousand six hundred and twenty-eight voxels, and every one of them
    // is a cube in the file rather than a loose voxel.
    expect(countSolid(volume)).toBe(2628);
  });

  it("reads a model drawn in many colours, giving each a slot of its own", () => {
    const { volume, palette, dropped } = readCvox(fixture("chr_knight"));
    expect(volume.dimensions).toEqual({ width: 20, height: 21, depth: 20 });
    expect(countSolid(volume)).toBe(398);
    expect(palette).toHaveLength(21);
    expect(dropped).toEqual([]);
    // Every colour is a distinct slot, so no two of them landed on the same one.
    expect(new Set(palette).size).toBe(21);
  });

  it("refuses a file that does not start with a version chunk", () => {
    const bytes = new Uint8Array(12);
    bytes.set([78, 79, 84, 67, 4, 0, 0, 0, 1, 0, 0, 0]);
    expect(() => readCvox(bytes)).toThrow(/not a \.cvox file/);
  });

  it("refuses a version it does not read, and says which version it is", () => {
    const bytes = writeCvox(
      createVolume({ width: 1, height: 1, depth: 1 }),
      [],
    );
    new DataView(bytes.buffer).setInt32(
      VERSION_CONTENT,
      CVOX_VERSION + 1,
      true,
    );
    expect(() => readCvox(bytes)).toThrow(/version 2/);
  });

  it("refuses a file holding no model", () => {
    const bytes = new Uint8Array(12);
    bytes.set([67, 86, 79, 88]);
    new DataView(bytes.buffer).setUint32(4, 4, true);
    new DataView(bytes.buffer).setInt32(8, CVOX_VERSION, true);
    expect(() => readCvox(bytes)).toThrow(/holds no model/);
  });

  it("refuses a chunk that runs past the end of the file", () => {
    // Cut the file short with the last chunk's own header still standing, so
    // its declared length reaches past what is left of the file.
    const bytes = fixture("3x3x3");
    expect(() => readCvox(bytes.slice(0, bytes.length - 6))).toThrow(
      /runs past the end/,
    );
  });

  it("steps over a chunk it does not know, so another tool's extension is kept out of the way", () => {
    const bytes = writeCvox(createVolume({ width: 2, height: 2, depth: 2 }), [
      LILAC,
    ]);
    // A chunk of a name the format reserves for applications, holding nothing.
    const extension = new Uint8Array(8 + 3);
    extension.set([65, 88, 84, 82, 3, 0, 0, 0], 0);
    const size = bytes.length + extension.length;
    const padded = new Uint8Array(size);
    padded.set(bytes, 0);
    padded.set(extension, bytes.length);

    const { volume } = readCvox(padded);
    expect(volume.dimensions).toEqual({ width: 2, height: 2, depth: 2 });
  });

  it("brings several models in one file together into the one box they fill", () => {
    const corner = (x: number, y: number, z: number) => {
      const volume = createVolume({ width: 2, height: 2, depth: 2 });
      writeVoxel(volume, x, y, z, 0);
      return volume;
    };

    const first = writeCvox(corner(0, 0, 0), [LILAC]);
    // A second model, standing three voxels along the width, which the first
    // does not reach.
    const second = writeCvox(corner(1, 1, 1), [LILAC]);
    new DataView(second.buffer).setInt32(SIZE_CONTENT + 3, 3, true);

    const joined = new Uint8Array(first.length + second.length);
    joined.set(first, 0);
    joined.set(second, first.length);

    const { volume } = readCvox(joined);
    // The box reaches from the first model's origin to the second's far corner.
    expect(volume.dimensions).toEqual({ width: 5, height: 2, depth: 2 });
    expect(readVoxel(volume, 0, 0, 0)).not.toBe(Bitmap.EMPTY);
    expect(readVoxel(volume, 4, 1, 1)).not.toBe(Bitmap.EMPTY);
  });

  it("keeps a model that stands at a negative position whole", () => {
    const volume = createVolume({ width: 2, height: 2, depth: 2 });
    writeVoxel(volume, 1, 1, 1, 0);
    const bytes = writeCvox(volume, [LILAC]);
    new DataView(bytes.buffer).setInt32(SIZE_CONTENT + 3, -4, true);

    const loaded = readCvox(bytes);
    expect(loaded.volume.dimensions).toEqual({ width: 2, height: 2, depth: 2 });
    expect(readVoxel(loaded.volume, 1, 1, 1)).toBe(0);
  });

  it("keeps the thirty-two busiest colours and says what it stood in for", () => {
    const many = Array.from({ length: MAX_COLOURS + 8 }, (_, i) => ({
      r: i,
      g: 0,
      b: 0,
      a: 255,
    }));
    const volume = createVolume({ width: many.length, height: 1, depth: 1 });
    many.forEach((_, i) => writeVoxel(volume, i, 0, 0, i % (MAX_COLOURS + 8)));

    const bytes = writeCvox(volume, many);
    const { palette, dropped } = readCvox(bytes);

    expect(palette.length).toBeLessThanOrEqual(MAX_COLOURS);
    expect(dropped.length).toBe(many.length - MAX_COLOURS);
  });
});

describe("packCubes", () => {
  it("draws a whole box as one cube", () => {
    const volume = createVolume({ width: 4, height: 3, depth: 2 });
    volume.voxels.fill(0);
    const { cubes, voxels } = packCubes(volume);
    expect(cubes).toEqual([
      {
        low: Vector3D.create(0, 0, 0),
        high: Vector3D.create(3, 2, 1),
        index: 0,
      },
    ]);
    expect(voxels).toEqual([]);
  });

  it("draws one solid voxel as one cube rather than a loose voxel", () => {
    const volume = createVolume({ width: 3, height: 3, depth: 3 });
    writeVoxel(volume, 1, 1, 1, 4);
    expect(packCubes(volume).cubes).toEqual([
      {
        low: Vector3D.create(1, 1, 1),
        high: Vector3D.create(1, 1, 1),
        index: 4,
      },
    ]);
  });

  it("draws two colours in one box as two cubes", () => {
    const volume = createVolume({ width: 2, height: 2, depth: 2 });
    volume.voxels.fill(0);
    volume.voxels.fill(1, 4, 8);
    const { cubes } = packCubes(volume);
    expect(cubes).toHaveLength(2);
    expect(cubes.map((cube) => cube.index).sort()).toEqual([0, 1]);
  });

  it("never lets a cube take a voxel of another colour with it", () => {
    const volume = createVolume({ width: 4, height: 1, depth: 1 });
    volume.voxels.set([0, 0, 1, 0]);
    const { cubes, voxels } = packCubes(volume);
    // The run of one colour is one cube, the voxel between the two runs is its
    // own, and the run after it is its own: a cube cannot grow across the voxel
    // of another colour without taking it with it.
    expect(cubes).toEqual([
      {
        low: Vector3D.create(0, 0, 0),
        high: Vector3D.create(1, 0, 0),
        index: 0,
      },
      {
        low: Vector3D.create(2, 0, 0),
        high: Vector3D.create(2, 0, 0),
        index: 1,
      },
      {
        low: Vector3D.create(3, 0, 0),
        high: Vector3D.create(3, 0, 0),
        index: 0,
      },
    ]);
    expect(voxels).toEqual([]);
  });

  it("packs the same volume the same way every time", () => {
    const volume = createVolume({ width: 5, height: 5, depth: 5 });
    volume.voxels.forEach((_, i) => (volume.voxels[i] = i % 3));
    expect(JSON.stringify(packCubes(volume))).toBe(
      JSON.stringify(packCubes(volume)),
    );
  });
});

describe("writeCvox", () => {
  it("refuses a box that will not fit in a coordinate's single byte", () => {
    const volume = createVolume({ width: 256, height: 1, depth: 1 });
    expect(() => writeCvox(volume, [])).toThrow(/width of 256/);
  });

  it("carries the palette through even where no cube uses a colour", () => {
    const volume = createVolume({ width: 2, height: 2, depth: 2 });
    volume.voxels.fill(0);
    const palette = [
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
    ];

    const { palette: read } = readCvox(writeCvox(volume, palette));
    // The green is drawn nowhere, and is still on the palette afterwards.
    expect(read).toEqual(palette);
  });
});

describe("a round trip", () => {
  for (const name of ["3x3x3", "chr_knight", "castle"]) {
    it(`reads ${name} back as itself`, () => {
      const first = readCvox(fixture(name));
      const second = readCvox(writeCvox(first.volume, first.palette));

      expect(second.volume.dimensions).toEqual(first.volume.dimensions);
      expect(second.palette).toEqual(first.palette);
      expect(solidOf(second)).toEqual(solidOf(first));
    });
  }

  it("packs the author's castle into a couple of thousand bytes", () => {
    // The reason the format exists. A volume of this size is nine thousand
    // voxels, and packed for the graphics card it is five times that again.
    const { volume } = readCvox(fixture("castle"));
    const written = writeCvox(volume, [LILAC]);
    expect(volumeLength(volume.dimensions)).toBe(9261);
    expect(written.length).toBeLessThan(2000);
  });

  it("is the same size again when written twice, so saving is repeatable", () => {
    const first = readCvox(fixture("chr_knight"));
    const once = writeCvox(first.volume, first.palette);
    const twice = writeCvox(readCvox(once).volume, readCvox(once).palette);
    expect(twice).toEqual(once);
  });
});
