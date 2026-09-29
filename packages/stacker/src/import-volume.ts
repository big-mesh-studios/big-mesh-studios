// A box of voxels brought in as a part that can be drawn on.
//
// A model is drawn as six faces of a box, and a `.cvox` is a box of voxels rather
// than six faces, so bringing one in is a projection and then an account of what
// the projection lost. The projection is `sidesOfVolume`, and the loss is the
// edit: the two together are the part, and a file written from it holds only the
// loss.
import { Bitmap, type RGBA } from "@big-mesh-studios/maths";
import { centrePivot, sideKinds, type Part, type Sides } from "./data";
import { REMOVED, editVolumeFor } from "./edits";
import { nearestIndex, readCvox, type LoadedVolume } from "./cvox";
import { sidesOfVolume } from "./sides";
import { solveVoxels } from "./solver";
import { standOn, type Volume } from "./volume";

/**
 * The palette slots the figure is already drawing in, across every part's six
 * sides, its cuts' faces and its edits.
 *
 * A slot nothing is drawn in is one a colour brought in can take without moving
 * anything already on the canvas, which is what makes joining a figure with a
 * part usually a matter of pointing the part at colours it already has.
 */
export const paletteSlotsInUse = (parts: Part[]): Set<number> => {
  const used = new Set<number>();

  const note = (data: Uint8Array) => {
    for (const index of data) {
      if (index !== Bitmap.EMPTY) {
        used.add(index);
      }
    }
  };

  for (const part of parts) {
    for (const kind of sideKinds) {
      note(part.sides[kind].data);
    }
    for (const section of part.sections) {
      note(section.before.data);
      note(section.after.data);
    }
    // An edit that takes a voxel away is not a colour, so it names no slot.
    if (part.edits !== undefined) {
      for (const index of part.edits.voxels) {
        if (index !== Bitmap.EMPTY && index !== REMOVED) {
          used.add(index);
        }
      }
    }
  }

  return used;
};

/** A part brought in from a box of voxels, and the colours it is drawn in. */
export interface ImportedVolume {
  part: Part;
  palette: RGBA[];
  /**
   * The colours the file used that no slot was left for, each of which came back
   * as whichever colour was nearest to it. A file is free to hold more colours
   * than a model can address, and this is what became of the ones it could not.
   */
  dropped: RGBA[];
}

/**
 * A part that draws `volume` when its six drawings are solved, using edits for
 * what those drawings cannot say.
 *
 * The part has no cuts: a cut is a way of drawing a shape that is different along
 * an axis, and this one is not being drawn, it is being measured.
 *
 * Its drawings and its edits both address the colours in `volume` by position, so
 * whatever palette the volume was read against is the one this part is drawn in.
 * A part joining a figure that has a palette of its own has to have the two
 * brought together first, which is the figure's business rather than this one's.
 */
export const partFromVolume = (volume: Volume, name: string): Part => {
  const sides = sidesOfVolume(volume);
  const dimensions = volume.dimensions;

  return {
    name,
    sides,
    sections: [],
    root: { x: 0, y: 0, z: 0 },
    pivot: centrePivot(dimensions),
    turn: { x: 0, y: 0, z: 0 },
    scale: 1,
    parent: null,
    edits: editVolumeFor(
      dimensions,
      solveVoxels(dimensions, sides, []),
      volume,
    ),
  };
};

/**
 * A part brought in from the bytes of a `.cvox`, drawn in the file's own colours.
 *
 * The colours are the file's own so that the part's drawings address them without
 * being renumbered, which a file written against a palette this figure does not
 * have could not survive. A figure this part joins may already have a palette, in
 * which case the two have to be brought together by `placePart` before anything
 * is drawn.
 *
 * The volume is stood on its y before it becomes a part. A `.cvox` stands its
 * model on the axis its `z` is, and a part is drawn on its height, so a file read
 * here without the turn is a model on its side.
 *
 * @param name What the part is called in the figure it joins.
 */
export const partFromCvox = (
  bytes: Uint8Array,
  name: string,
): ImportedVolume => {
  const loaded: LoadedVolume = readCvox(bytes);

  return {
    part: partFromVolume(standOn(loaded.volume, "z", "y"), name),
    palette: loaded.palette,
    dropped: loaded.dropped,
  };
};

/** A part whose colours have been brought into a palette the figure already has. */
export interface PlacedPart {
  part: Part;
  /** The figure's palette, with the part's colours in it. */
  palette: RGBA[];
  /**
   * The colours that had nowhere to go, each of which the part is now drawn in
   * the palette entry nearest to it.
   */
  dropped: RGBA[];
}

/**
 * A part brought in from a file, moved onto the palette of the figure it is
 * joining.
 *
 * A drawing names a colour by the slot it sits in, so a part whose colours were
 * numbered against the file it came from draws in the wrong colours the moment it
 * joins a figure numbered against something else. Every index is therefore
 * re-pointed: a colour the figure already has keeps its own slot, a colour it
 * lacks takes one nothing is drawn in, and a colour it lacks with no slot to
 * spare is drawn in the nearest it has and reported.
 *
 * @param taken The palette slots the figure already draws in.
 */
export const placePart = (
  imported: ImportedVolume,
  palette: readonly RGBA[],
  taken: ReadonlySet<number>,
): PlacedPart => {
  const merged = palette.map((colour) => ({ ...colour }));
  // Copied, because a slot claimed here is not one the caller's set knows about
  // and it should not be left holding a slot it does not own.
  const held = new Set(taken);
  const moved = new Map<number, number>();
  const dropped: RGBA[] = [];

  imported.palette.forEach((colour, index) => {
    const where = palette.findIndex((kept) => sameColour(kept, colour));

    if (where >= 0) {
      moved.set(index, where);
      return;
    }

    const free = [...merged.keys()].find((slot) => !held.has(slot));

    if (free !== undefined) {
      moved.set(index, free);
      merged[free] = { ...colour };
      held.add(free);
      return;
    }

    // No slot of its own and nowhere to put one, so the colour stands in for
    // whichever is nearest rather than the import being refused over it.
    moved.set(index, nearestIndex(merged, colour));
    dropped.push(colour);
  });

  return {
    part: remapPart(imported.part, moved),
    palette: merged,
    dropped: [...imported.dropped, ...dropped],
  };
};

/**
 * `part` naming its colours by the slots they sit in, where `moved` says which
 * slot a colour of the file it came from is now in.
 *
 * The values that are not colours are left alone: a cell with nothing drawn in it
 * is nothing in any palette, and an edit that takes a voxel away is not a colour
 * at all.
 */
const remapPart = (part: Part, moved: ReadonlyMap<number, number>): Part => {
  const move = (index: number) => moved.get(index) ?? index;

  const side = (bitmap: Bitmap): Bitmap => ({
    ...bitmap,
    data: Uint8Array.from(bitmap.data, (index) =>
      index === Bitmap.EMPTY ? Bitmap.EMPTY : move(index),
    ),
  });

  return {
    ...part,
    sides: Object.fromEntries(
      sideKinds.map((kind) => [kind, side(part.sides[kind])]),
    ) as Sides,
    edits:
      part.edits === undefined
        ? undefined
        : {
            ...part.edits,
            voxels: Uint8Array.from(part.edits.voxels, (index) =>
              index === Bitmap.EMPTY || index === REMOVED ? index : move(index),
            ),
          },
  };
};

const sameColour = (one: RGBA, other: RGBA): boolean =>
  one.r === other.r &&
  one.g === other.g &&
  one.b === other.b &&
  one.a === other.a;
