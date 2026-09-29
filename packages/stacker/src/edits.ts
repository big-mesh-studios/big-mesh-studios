// What a box of voxels cannot say in six drawings, said as a box of voxels beside
// them.
//
// Six drawings describe a shape by what each face carves: a face closes a run of
// voxels and colours the ends of it, and a cell with nothing drawn in it takes the
// whole run away. Two things follow from that, and both are losses a file from
// elsewhere is quite likely to have.
//
// A voxel with a voxel in front of it on all six sides has no drawing of its own,
// and its faces take the colours of whatever is nearest it on each axis. And a run
// that has a gap in the middle cannot be told from a solid one, because a face
// that is drawn once carves the whole run it looks along.
//
// An edit is the difference between the volume the six drawings give and the one
// the model is actually made of. It is applied to the packed volume after the
// solver has written it, so that everything downstream — the mesher, the picker,
// whatever measures how far a part reaches — reads the corrected volume without
// knowing any of this.
import {
  Bitmap,
  type Dimensions3D,
  type RGBA,
  type Vector3D,
} from "@big-mesh-studios/maths";
import type { LoadedVolume } from "./cvox";
import { packedFaces, writePackedVoxel } from "./solver";
import { createVolume, volumeOffset, type Volume } from "./volume";

/**
 * The value an edit holds to say a voxel is to be taken away.
 *
 * An edit is a box of the same shape as the part it corrects, and almost every
 * cell of it has nothing to say, which `Bitmap.EMPTY` already means. A cell that
 * takes a colour makes its voxel that colour, so something else has to mean
 * "rather not" and "taken away" at once, which is why a third value exists: 254
 * is past every palette a model can address, so it can never be read as a colour
 * however many entries a palette has.
 */
export const REMOVED = 254;

/**
 * The edits that make a solved volume `wanted`, as a box over the same cells.
 *
 * A cell is left alone where the six drawings already give what was wanted, and
 * otherwise takes the value that was. A wanted voxel is left alone only when the
 * solved one is solid with all six of its faces already that colour: an edit
 * gives a voxel one colour rather than one per face, so a voxel the drawings got
 * right on the face that shows and wrong on the five behind it still has to be
 * written down, or the five behind it are what stays.
 *
 * @param solved The packed volume the six drawings give.
 * @param wanted The volume the model is made of.
 */
export function editVolumeFor(
  dimensions: Dimensions3D,
  solved: Uint8Array,
  wanted: Volume,
): Volume {
  const { width, height, depth } = dimensions;

  if (
    wanted.dimensions.width !== width ||
    wanted.dimensions.height !== height ||
    wanted.dimensions.depth !== depth
  ) {
    throw new Error(
      `a volume of ${wanted.dimensions.width} by ${wanted.dimensions.height} by ${wanted.dimensions.depth} cannot be compared with a ${width} by ${height} by ${depth} one`,
    );
  }

  const edits = createVolume(dimensions);
  const faces = packedFaces(dimensions, solved);

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const want = wanted.voxels[volumeOffset(dimensions, x, y, z)];

        if (agrees(faces, x, y, z, want)) {
          continue;
        }

        edits.voxels[volumeOffset(dimensions, x, y, z)] =
          want === Bitmap.EMPTY ? REMOVED : want;
      }
    }
  }

  return edits;
}

/**
 * The value an edit holds at one cell for the volume to be made of `wanted`
 * there, or nothing where the six drawings already make it that way.
 *
 * A cell that needs no edit says nothing, so a part with nothing the drawings
 * cannot say has no edits at all — and a voxel put there by hand that the
 * drawings would have put there themselves is not remembered as a hand edit, and
 * does not keep contradicting a drawing made there afterwards.
 *
 * @param drawings The packed volume the six drawings give, before any edits.
 * @param cell Which cell of the part, which must be within `dimensions`.
 * @param wanted What that voxel is to be: `Bitmap.EMPTY` for nothing there, or a
 * palette index.
 */
export function editFor(
  dimensions: Dimensions3D,
  drawings: Uint8Array,
  cell: Vector3D,
  wanted: number,
): number {
  const { x, y, z } = cell;

  if (agrees(packedFaces(dimensions, drawings), x, y, z, wanted)) {
    return Bitmap.EMPTY;
  }

  return wanted === Bitmap.EMPTY ? REMOVED : wanted;
}

/**
 * A packed box with the voxels an edit disagrees with overwritten, in place.
 *
 * @param edits The corrections, over a box the same shape as `dimensions`.
 * @returns The same `packed`, for a caller that has nothing else to do with it.
 */
export function applyEdits(
  packed: Uint8Array,
  dimensions: Dimensions3D,
  edits: Volume,
): Uint8Array {
  const { width, height, depth } = dimensions;

  if (
    edits.dimensions.width !== width ||
    edits.dimensions.height !== height ||
    edits.dimensions.depth !== depth
  ) {
    throw new Error(
      `an edit over a ${edits.dimensions.width} by ${edits.dimensions.height} by ${edits.dimensions.depth} box cannot be applied to a ${width} by ${height} by ${depth} one`,
    );
  }

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const at = volumeOffset(dimensions, x, y, z);
        const index = edits.voxels[at];

        if (index === Bitmap.EMPTY) {
          continue;
        }

        const offset = at << 2;

        if (index === REMOVED) {
          packed[offset + 0] = 0;
          packed[offset + 1] = 0;
          packed[offset + 2] = 0;
          packed[offset + 3] = 0;
          continue;
        }

        writePackedVoxel(packed, offset, index);
      }
    }
  }

  return packed;
}

/** Whether an edit says anything at all, which is what a file's presence means. */
export const editsHaveSomething = (edits: Volume): boolean =>
  edits.voxels.some((index) => index !== Bitmap.EMPTY);

/**
 * The colour a file writes to mean a voxel is to be taken away.
 *
 * A `.cvox` says a coordinate is this colour, so it cannot say a coordinate is
 * nothing: a cell it does not mention is a cell it has nothing to say about,
 * which is what the rest of an edit is. Fully transparent is a colour no palette
 * a model is drawn with holds, so it cannot be mistaken for one of the model's
 * own — and a palette may be reordered or have an entry added without a file
 * written against it breaking, which is why the figure's own palette is not the
 * one the file is written with.
 */
export const REMOVED_COLOUR: RGBA = { r: 0, g: 0, b: 0, a: 0 };

/** An edit as a file holds it: a palette to write and a volume addressing it. */
export interface EditsFile {
  volume: Volume;
  palette: RGBA[];
}

/**
 * `edits` as a file holds it, with a palette of its own holding only the colours
 * it uses and the mark for a voxel taken away.
 *
 * The palette is the file's own rather than the figure's so that a figure's
 * palette being reordered or gaining an entry does not leave a file written
 * against the old one drawing in the wrong colours. It holds only what the edits
 * use, so a model drawn in thirty-two colours whose edits name two of them still
 * has room for the mark.
 */
export const editFileFor = (
  edits: Volume,
  palette: readonly RGBA[],
): EditsFile => {
  const used = new Set<number>();
  let removes = false;

  for (const index of edits.voxels) {
    if (index === Bitmap.EMPTY) {
      continue;
    }
    if (index === REMOVED) {
      removes = true;
    } else {
      used.add(index);
    }
  }

  const out: RGBA[] = removes ? [REMOVED_COLOUR] : [];
  const moved = new Map<number, number>();

  for (const index of [...used].sort((one, other) => one - other)) {
    const colour = palette[index];

    if (colour === undefined) {
      throw new Error(
        `an edit is in colour ${index}, which a palette of ${palette.length} has no colour for`,
      );
    }

    moved.set(index, out.length);
    out.push(colour);
  }

  const volume = createVolume(edits.dimensions);

  for (let at = 0; at < edits.voxels.length; at++) {
    const index = edits.voxels[at];

    if (index === Bitmap.EMPTY) {
      continue;
    }

    volume.voxels[at] = index === REMOVED ? 0 : (moved.get(index) ?? 0);
  }

  return { volume, palette: out };
};

/**
 * A file's edit as the figure's own palette addresses it.
 *
 * A `.cvox` renumbers the colours it reads by the order it declares them in, so
 * an index in a loaded volume means nothing until it has been looked up as a
 * colour. A colour the figure's palette has no entry for is a file written
 * against a palette this figure does not have, and is said so rather than drawn
 * in whichever colour happened to land nearest.
 *
 * @param loaded The file as it was read, with the palette it declared.
 */
export const editsFrom = (
  loaded: LoadedVolume,
  palette: readonly RGBA[],
): Volume => {
  const edits = createVolume(loaded.volume.dimensions);

  for (let at = 0; at < loaded.volume.voxels.length; at++) {
    const index = loaded.volume.voxels[at];

    if (index === Bitmap.EMPTY) {
      continue;
    }

    const colour = loaded.palette[index];

    if (colour === undefined) {
      continue;
    }

    if (sameColour(colour, REMOVED_COLOUR)) {
      edits.voxels[at] = REMOVED;
      continue;
    }

    const moved = palette.findIndex((kept) => sameColour(kept, colour));

    if (moved < 0) {
      throw new Error(
        `an edit is in a colour this figure's palette does not have, rgb(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})`,
      );
    }

    edits.voxels[at] = moved;
  }

  return edits;
};

const sameColour = (one: RGBA, other: RGBA): boolean =>
  one.r === other.r &&
  one.g === other.g &&
  one.b === other.b &&
  one.a === other.a;

/**
 * Whether the solved voxel at a cell already is what was wanted there, and so
 * needs no edit.
 */
const agrees = (
  faces: ReturnType<typeof packedFaces>,
  x: number,
  y: number,
  z: number,
  want: number,
): boolean => {
  const solid = faces.solid(x, y, z);

  if (want === Bitmap.EMPTY) {
    return !solid;
  }

  if (!solid) {
    return false;
  }

  for (let face = 0; face < 6; face++) {
    if (faces.colour(x, y, z, face) !== want) {
      return false;
    }
  }

  return true;
};
