// The `.cvox` file: a losslessly compressed voxel format, read and written here
// as a box of voxels with a palette. A file is a flat list of chunks — a version
// chunk, then for each model a size chunk and the colour maps, cube chunks and
// voxel chunks that fill it. A chunk whose identifier is not one of those is
// stepped over rather than refused, so a file carrying an extension another tool
// wrote still opens here.
import { Bitmap, type RGBA, Vector3D } from "@big-mesh-studios/maths";
import {
  createVolume,
  volumeContains,
  volumeLength,
  volumeOffset,
  type Volume,
} from "./volume";

/** The version of the format this reads and writes. */
export const CVOX_VERSION = 1;

/**
 * The most colours a model can address. The ray marcher samples a palette
 * texture one row of thirty-two texels wide, and a packed voxel has five bits to
 * hold each of its faces' colour index in, so thirty-two is both.
 */
export const MAX_COLOURS = 32;

/** How far a box can reach along one axis, a coordinate being a single byte. */
export const MAX_EXTENT = 255;

/** A box of voxels read from a file, and the palette they address. */
export interface LoadedVolume {
  volume: Volume;
  palette: RGBA[];
  /**
   * The colours the file used that no slot was left for, each of which stands
   * in for the kept colour nearest to it. A file is free to use more colours
   * than a model can address, and this is what became of the ones it could not.
   */
  dropped: RGBA[];
}

/** A cube of voxels, and a single voxel, each carrying a palette index. */
export interface Cube {
  low: Vector3D;
  high: Vector3D;
  index: number;
}

export interface SingleVoxel {
  at: Vector3D;
  index: number;
}

const CHUNK_CVOX = "CVOX";
const CHUNK_SIZE = "SIZE";
const CHUNK_CMAP = "CMAP";
const CHUNK_CUBE = "CUBE";
const CHUNK_VMAP = "VMAP";
const CHUNK_XYZ = "XYZ ";

const CHUNK_HEADER = 8;
const COLOUR_ENTRY = 7;
const CUBE_ENTRY = 6;
const VOXEL_ENTRY = 3;
const SIZE_LENGTH = 15;

const colourKey = ({ r, g, b, a }: RGBA): string => `${r},${g},${b},${a}`;

/** Every three-byte count in the format is little-endian and unsigned. */
const readCount = (bytes: Uint8Array, at: number): number =>
  bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);

const writeCount = (into: Uint8Array, at: number, count: number): void => {
  into[at] = count & 0xff;
  into[at + 1] = (count >> 8) & 0xff;
  into[at + 2] = (count >> 16) & 0xff;
};

const readColour = (bytes: Uint8Array, at: number): RGBA => ({
  r: bytes[at],
  g: bytes[at + 1],
  b: bytes[at + 2],
  a: bytes[at + 3],
});

const writeColour = (into: Uint8Array, at: number, { r, g, b, a }: RGBA) => {
  into[at] = r;
  into[at + 1] = g;
  into[at + 2] = b;
  into[at + 3] = a;
};

const readInt32 = (bytes: Uint8Array, at: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
    at,
    true,
  );

/** A chunk of a file: its identifier, and where its content starts and ends. */
interface Chunk {
  id: string;
  start: number;
  size: number;
}

/** The chunks of a file, in the order they stand, known or not. */
function readChunks(bytes: Uint8Array): Chunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Chunk[] = [];

  for (let at = 0; at + CHUNK_HEADER <= bytes.length;) {
    const id = String.fromCharCode(
      bytes[at],
      bytes[at + 1],
      bytes[at + 2],
      bytes[at + 3],
    );
    const size = view.getUint32(at + 4, true);
    const start = at + CHUNK_HEADER;

    if (start + size > bytes.length) {
      throw new Error(
        `this .cvox file's ${JSON.stringify(id)} chunk claims ${size} bytes and runs past the end of the file`,
      );
    }

    chunks.push({ id, start, size });
    at = start + size;
  }

  return chunks;
}

/**
 * A colour map read: the colours it declares, in the order it declares them, and
 * the colours of the entries it is followed by.
 *
 * If a map starts with cyan and a hundred, the first hundred entries are cyan.
 * A colour with a count of none takes none of them, and is how a palette
 * carries a colour the model does not use — which is the only way a colour can
 * reach a file without being drawn, so the declared colours are kept whatever
 * their count.
 */
function readColourMap(
  bytes: Uint8Array,
  map: Chunk,
): { colours: RGBA[]; runs: RGBA[] } {
  if (map.size % COLOUR_ENTRY !== 0) {
    throw new Error(
      `this .cvox file's ${map.id.trim()} chunk is ${map.size} bytes, which is not a whole number of colours`,
    );
  }

  const colours: RGBA[] = [];
  const runs: RGBA[] = [];
  for (let b = 0; b + COLOUR_ENTRY <= map.size; b += COLOUR_ENTRY) {
    const colour = readColour(bytes, map.start + b);
    colours.push(colour);
    for (let n = readCount(bytes, map.start + b + 4); n > 0; n--) {
      runs.push(colour);
    }
  }
  return { colours, runs };
}

/** What one model of a file is, before its cubes and voxels are read. */
type SizedModel = Omit<PackedModel, "cubes" | "voxels" | "colours">;

/** A model read apart: what is in it, and the palette its colour maps declare. */
interface PackedModel {
  dimensions: Vector3D;
  translation: Vector3D;
  cubes: { low: Vector3D; high: Vector3D; colour: RGBA }[];
  voxels: { at: Vector3D; colour: RGBA }[];
  /** Every colour the file's maps name, whether any entry takes it or not. */
  colours: RGBA[];
}

const readSize = (bytes: Uint8Array, at: number) => ({
  dimensions: Vector3D.create(bytes[at], bytes[at + 1], bytes[at + 2]),
  translation: Vector3D.create(
    readInt32(bytes, at + 3),
    readInt32(bytes, at + 7),
    readInt32(bytes, at + 11),
  ),
});

function readCubes(
  bytes: Uint8Array,
  map: Chunk | undefined,
  chunk: Chunk,
): PackedModel["cubes"] {
  if (map === undefined) {
    throw new Error(
      "this .cvox file has a CUBE chunk with no CMAP chunk to give its cubes their colours",
    );
  }
  if (chunk.size % CUBE_ENTRY !== 0) {
    throw new Error(
      `this .cvox file's CUBE chunk is ${chunk.size} bytes, which is not a whole number of cubes`,
    );
  }

  const { runs } = readColourMap(bytes, map);
  const cubes: PackedModel["cubes"] = [];

  for (let b = 0, n = 0; b + CUBE_ENTRY <= chunk.size; b += CUBE_ENTRY, n++) {
    const low = Vector3D.create(
      bytes[chunk.start + b],
      bytes[chunk.start + b + 1],
      bytes[chunk.start + b + 2],
    );
    cubes.push({
      low,
      // A cube's high corner is the last voxel it holds, not the one past it.
      high: Vector3D.create(
        bytes[chunk.start + b + 3],
        bytes[chunk.start + b + 4],
        bytes[chunk.start + b + 5],
      ),
      colour: runs[n] ?? BLACK,
    });
  }

  return cubes;
}

function readVoxels(
  bytes: Uint8Array,
  map: Chunk | undefined,
  chunk: Chunk,
): PackedModel["voxels"] {
  if (map === undefined) {
    throw new Error(
      "this .cvox file has an XYZ chunk with no VMAP chunk to give its voxels their colours",
    );
  }
  if (chunk.size % VOXEL_ENTRY !== 0) {
    throw new Error(
      `this .cvox file's XYZ chunk is ${chunk.size} bytes, which is not a whole number of voxels`,
    );
  }

  const { runs } = readColourMap(bytes, map);
  const voxels: PackedModel["voxels"] = [];

  for (let b = 0, n = 0; b + VOXEL_ENTRY <= chunk.size; b += VOXEL_ENTRY, n++) {
    voxels.push({
      at: Vector3D.create(
        bytes[chunk.start + b],
        bytes[chunk.start + b + 1],
        bytes[chunk.start + b + 2],
      ),
      colour: runs[n] ?? BLACK,
    });
  }

  return voxels;
}

const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };

/**********************************************************************************/
/*                                     Reading                                     */
/**********************************************************************************/

/**
 * A `.cvox` file read as one box of voxels and the palette they address.
 *
 * A file may hold several models, each standing somewhere in the world, and they
 * are all brought together into the one box the editor holds: the result reaches
 * from the lowest voxel of any of them to the highest, so nothing is lost and
 * the box on screen is the whole of the file.
 *
 * @throws when the file does not start with a `CVOX` version chunk, when that
 *   chunk holds a version this does not read, or when the file holds no model
 */
export function readCvox(bytes: Uint8Array): LoadedVolume {
  const chunks = readChunks(bytes);
  const header = chunks[0];

  if (header === undefined || header.id !== CHUNK_CVOX) {
    throw new Error(
      "this is not a .cvox file: it does not start with a CVOX chunk",
    );
  }
  if (header.size < 4) {
    throw new Error(
      "this .cvox file's version chunk is too short to hold a version",
    );
  }

  const version = readInt32(bytes, header.start);
  if (version !== CVOX_VERSION) {
    throw new Error(
      `this .cvox file is version ${version}, and only version ${CVOX_VERSION} is read`,
    );
  }

  const models: PackedModel[] = [];
  let current: SizedModel | undefined;
  let cubes: PackedModel["cubes"] = [];
  let voxels: PackedModel["voxels"] = [];
  let colours: RGBA[] = [];
  // Each list of coordinates is read where it stands, and the colour map it
  // takes its colours from is the one that stood before it, so a file holding
  // several models gives each of them their own.
  let cubeMap: Chunk | undefined;
  let voxelMap: Chunk | undefined;

  for (const chunk of chunks.slice(1)) {
    switch (chunk.id) {
      case CHUNK_SIZE: {
        if (current !== undefined) {
          models.push({ ...current, cubes, voxels, colours });
        }
        if (chunk.size < SIZE_LENGTH) {
          throw new Error(
            `this .cvox file's SIZE chunk is ${chunk.size} bytes, too short to hold a size and a position`,
          );
        }
        current = readSize(bytes, chunk.start);
        cubes = [];
        voxels = [];
        colours = [];
        cubeMap = undefined;
        voxelMap = undefined;
        break;
      }
      case CHUNK_CMAP:
        cubeMap = chunk;
        colours = [...colours, ...readColourMap(bytes, chunk).colours];
        break;
      case CHUNK_VMAP:
        voxelMap = chunk;
        colours = [...colours, ...readColourMap(bytes, chunk).colours];
        break;
      case CHUNK_CUBE:
        cubes = readCubes(bytes, cubeMap, chunk);
        break;
      case CHUNK_XYZ:
        voxels = readVoxels(bytes, voxelMap, chunk);
        break;
    }
  }

  if (current === undefined) {
    throw new Error("this .cvox file holds no model");
  }
  models.push({ ...current, cubes, voxels, colours });

  return gather(models);
}

/** Every model of a file brought together into the one box, and the palette. */
function gather(models: PackedModel[]): LoadedVolume {
  // The box the models together fill, measured from the lowest of them, which is
  // where a model standing at a negative position has to shift up to reach.
  const low = Vector3D.create(Infinity, Infinity, Infinity);
  const high = Vector3D.create(-Infinity, -Infinity, -Infinity);
  for (const model of models) {
    low.x = Math.min(low.x, model.translation.x);
    low.y = Math.min(low.y, model.translation.y);
    low.z = Math.min(low.z, model.translation.z);
    high.x = Math.max(high.x, model.translation.x + model.dimensions.x);
    high.y = Math.max(high.y, model.translation.y + model.dimensions.y);
    high.z = Math.max(high.z, model.translation.z + model.dimensions.z);
  }

  const dimensions = {
    width: high.x - low.x,
    height: high.y - low.y,
    depth: high.z - low.z,
  };

  const { palette, indexFor, dropped } = buildPalette(models);
  const volume = createVolume(dimensions);

  for (const model of models) {
    const origin = Vector3D.subtract(model.translation, low);
    for (const cube of model.cubes) {
      for (let x = cube.low.x; x <= cube.high.x; x++) {
        for (let y = cube.low.y; y <= cube.high.y; y++) {
          for (let z = cube.low.z; z <= cube.high.z; z++) {
            put(volume, dimensions, indexFor(cube.colour), {
              x: origin.x + x,
              y: origin.y + y,
              z: origin.z + z,
            });
          }
        }
      }
    }
    for (const voxel of model.voxels) {
      put(volume, dimensions, indexFor(voxel.colour), {
        x: origin.x + voxel.at.x,
        y: origin.y + voxel.at.y,
        z: origin.z + voxel.at.z,
      });
    }
  }

  return { volume, palette, dropped };
}

const put = (
  volume: Volume,
  dimensions: Volume["dimensions"],
  index: number,
  at: Vector3D,
) => {
  if (volumeContains(dimensions, at.x, at.y, at.z)) {
    volume.voxels[volumeOffset(dimensions, at.x, at.y, at.z)] = index;
  }
};

/**
 * The colours of a file turned into a palette of the size a model can address.
 *
 * The order is the order the file's colour maps name their colours in, and a
 * colour they name is kept whether or not any voxel takes it, so that a palette
 * survives a trip through a file unchanged. A colour the maps do not name but a
 * voxel is drawn in — a file whose maps are short of what it holds — is added
 * after them, busiest first.
 *
 * A colour with no slot takes the kept colour nearest to it, and is reported
 * rather than quietly dropped: the model is drawn, just not in quite the colours
 * it was written in.
 */
function buildPalette(models: PackedModel[]): {
  palette: RGBA[];
  dropped: RGBA[];
  indexFor(colour: RGBA): number;
} {
  const declared: RGBA[] = [];
  const seen = new Set<string>();
  const note = (colour: RGBA) => {
    const key = colourKey(colour);
    if (!seen.has(key)) {
      seen.add(key);
      declared.push(colour);
    }
  };

  for (const model of models) {
    for (const colour of model.colours) {
      note(colour);
    }
  }

  // Colours a voxel is drawn in that no map names, the busiest first, so that a
  // file whose maps are short of its contents still draws in its own colours.
  const uses = new Map<string, { colour: RGBA; count: number }>();
  const count = (colour: RGBA, by: number) => {
    const key = colourKey(colour);
    const found = uses.get(key);
    if (found === undefined) {
      uses.set(key, { colour, count: by });
    } else {
      found.count += by;
    }
  };

  for (const model of models) {
    for (const cube of model.cubes) {
      const { x, y, z } = Vector3D.subtract(cube.high, cube.low);
      count(cube.colour, (x + 1) * (y + 1) * (z + 1));
    }
    for (const voxel of model.voxels) {
      count(voxel.colour, 1);
    }
  }

  const undeclared = [...uses.values()]
    .filter(({ colour }) => !seen.has(colourKey(colour)))
    .sort(
      (a, b) =>
        b.count - a.count ||
        colourKey(a.colour).localeCompare(colourKey(b.colour)),
    )
    .map(({ colour }) => colour);

  const all = [...declared, ...undeclared];
  const palette = all.slice(0, MAX_COLOURS);
  const dropped = all.slice(MAX_COLOURS);
  const kept = new Map(palette.map((colour, i) => [colourKey(colour), i]));
  const nearest = new Map(
    dropped.map((colour) => [colourKey(colour), nearestIndex(palette, colour)]),
  );

  return {
    palette,
    dropped,
    indexFor: (colour) =>
      kept.get(colourKey(colour)) ?? nearest.get(colourKey(colour)) ?? 0,
  };
}

/**
 * Where in a palette the colour nearest to `colour` is, by how far each of its
 * channels is from it — so that a colour with no slot of its own can be drawn in
 * the one that stands closest to it rather than dropped.
 */
export const nearestIndex = (palette: RGBA[], colour: RGBA): number => {
  let nearest = 0;
  let nearestDistance = Infinity;
  palette.forEach((kept, i) => {
    const distance =
      (colour.r - kept.r) ** 2 +
      (colour.g - kept.g) ** 2 +
      (colour.b - kept.b) ** 2 +
      (colour.a - kept.a) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = i;
    }
  });
  return nearest;
};

/**********************************************************************************/
/*                                    Packing                                      */
/**********************************************************************************/

/**
 * Every solid voxel of a volume drawn as as few cubes of one colour as possible,
 * and whatever is left over as single voxels.
 *
 * A cube is grown from a seed outwards: as wide as the row it starts in allows,
 * then as deep as every one of those rows allows, then as far through the volume
 * as that whole face allows. The sweep runs in a fixed order, so the same volume
 * always packs the same way.
 */
export function packCubes(volume: Volume): {
  cubes: Cube[];
  voxels: SingleVoxel[];
} {
  const { dimensions, voxels } = volume;
  const { width, height, depth } = dimensions;
  const at = (x: number, y: number, z: number) =>
    volumeOffset(dimensions, x, y, z);

  const taken = new Uint8Array(volumeLength(dimensions));
  const cubes: Cube[] = [];
  const loose: SingleVoxel[] = [];

  const free = (x: number, y: number, z: number, index: number) =>
    x < width &&
    y < height &&
    z < depth &&
    taken[at(x, y, z)] === 0 &&
    voxels[at(x, y, z)] === index;

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (taken[at(x, y, z)] !== 0) {
          continue;
        }

        const index = voxels[at(x, y, z)];
        if (index === Bitmap.EMPTY) {
          // Nothing here at all, marked so a later cube stops short of it rather
          // than swallowing it and taking a colour with it.
          taken[at(x, y, z)] = 1;
          continue;
        }

        let wide = 1;
        while (free(x + wide, y, z, index)) {
          wide++;
        }

        let deep = 1;
        grow: while (y + deep < height) {
          for (let i = 0; i < wide; i++) {
            if (!free(x + i, y + deep, z, index)) {
              break grow;
            }
          }
          deep++;
        }

        let through = 1;
        stack: while (z + through < depth) {
          for (let j = 0; j < deep; j++) {
            for (let i = 0; i < wide; i++) {
              if (!free(x + i, y + j, z + through, index)) {
                break stack;
              }
            }
          }
          through++;
        }

        for (let k = 0; k < through; k++) {
          for (let j = 0; j < deep; j++) {
            for (let i = 0; i < wide; i++) {
              taken[at(x + i, y + j, z + k)] = 1;
            }
          }
        }

        cubes.push({
          low: Vector3D.create(x, y, z),
          high: Vector3D.create(x + wide - 1, y + deep - 1, z + through - 1),
          index,
        });
      }
    }
  }

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (taken[at(x, y, z)] === 0 && voxels[at(x, y, z)] !== Bitmap.EMPTY) {
          loose.push({
            at: Vector3D.create(x, y, z),
            index: voxels[at(x, y, z)],
          });
        }
      }
    }
  }

  return { cubes, voxels: loose };
}

/**********************************************************************************/
/*                                     Writing                                     */
/**********************************************************************************/

/**
 * A box of voxels written as a `.cvox` file.
 *
 * The whole palette is written into the cube colour map, with a count of none for
 * any colour no cube uses, which is how a colour the model has stopped using
 * survives a trip through a file and is still on the palette when it opens
 * again. A model is written as one model at the origin, which the format allows
 * to be several.
 *
 * @throws when the box reaches further than a coordinate's single byte along any
 *   axis, which is as far as the format can say where a voxel is
 */
export function writeCvox(volume: Volume, palette: RGBA[]): Uint8Array {
  const { dimensions } = volume;

  for (const [name, extent] of [
    ["width", dimensions.width],
    ["height", dimensions.height],
    ["depth", dimensions.depth],
  ] as const) {
    if (extent > MAX_EXTENT) {
      throw new Error(
        `a .cvox file says where a voxel is in one byte along each axis, so a model's ${name} of ${extent} will not fit in one`,
      );
    }
  }

  const { cubes, voxels } = packCubes(volume);

  // A colour map says "the first so many entries are this colour, the next so
  // many are that one", so the entries it counts have to stand in that order
  // rather than in whatever order the packing found them in.
  const group = <T>(entries: T[], index: (entry: T) => number) =>
    palette.flatMap((_, i) => entries.filter((entry) => index(entry) === i));

  const orderedCubes = group(cubes, (cube) => cube.index);
  const orderedVoxels = group(voxels, (voxel) => voxel.index);

  const cubeCounts = palette.map(
    (_, i) => orderedCubes.filter((cube) => cube.index === i).length,
  );
  const voxelCounts = palette.map(
    (_, i) => orderedVoxels.filter((voxel) => voxel.index === i).length,
  );

  const content: Uint8Array[] = [
    new Uint8Array(4),
    sizeBytes(dimensions),
    mapBytes(palette, cubeCounts),
    cubeBytes(orderedCubes),
    mapBytes(palette, voxelCounts),
    voxelBytes(orderedVoxels),
  ];
  const ids = [
    CHUNK_CVOX,
    CHUNK_SIZE,
    CHUNK_CMAP,
    CHUNK_CUBE,
    CHUNK_VMAP,
    CHUNK_XYZ,
  ];
  new DataView(content[0].buffer).setInt32(0, CVOX_VERSION, true);

  const size = content.reduce(
    (total, chunk) => total + CHUNK_HEADER + chunk.length,
    0,
  );
  const bytes = new Uint8Array(size);
  let at = 0;

  ids.forEach((id, i) => {
    for (let c = 0; c < 4; c++) {
      bytes[at + c] = id.charCodeAt(c);
    }
    new DataView(bytes.buffer).setUint32(at + 4, content[i].length, true);
    at += CHUNK_HEADER;
    bytes.set(content[i], at);
    at += content[i].length;
  });

  return bytes;
}

function sizeBytes({ width, height, depth }: Volume["dimensions"]) {
  const bytes = new Uint8Array(SIZE_LENGTH);
  bytes[0] = width;
  bytes[1] = height;
  bytes[2] = depth;
  const view = new DataView(bytes.buffer);
  view.setInt32(3, 0, true);
  view.setInt32(7, 0, true);
  view.setInt32(11, 0, true);
  return bytes;
}

function mapBytes(palette: RGBA[], counts: number[]) {
  const bytes = new Uint8Array(palette.length * COLOUR_ENTRY);
  palette.forEach((colour, i) => {
    writeColour(bytes, i * COLOUR_ENTRY, colour);
    writeCount(bytes, i * COLOUR_ENTRY + 4, counts[i]);
  });
  return bytes;
}

const cubeBytes = (cubes: Cube[]) => {
  const bytes = new Uint8Array(cubes.length * CUBE_ENTRY);
  cubes.forEach(({ low, high }, i) => {
    const at = i * CUBE_ENTRY;
    bytes[at] = low.x;
    bytes[at + 1] = low.y;
    bytes[at + 2] = low.z;
    bytes[at + 3] = high.x;
    bytes[at + 4] = high.y;
    bytes[at + 5] = high.z;
  });
  return bytes;
};

const voxelBytes = (voxels: SingleVoxel[]) => {
  const bytes = new Uint8Array(voxels.length * VOXEL_ENTRY);
  voxels.forEach(({ at: v }, i) => {
    bytes[i * VOXEL_ENTRY] = v.x;
    bytes[i * VOXEL_ENTRY + 1] = v.y;
    bytes[i * VOXEL_ENTRY + 2] = v.z;
  });
  return bytes;
};
