/**
 * The paint journal as bytes: the only durable form paint has.
 *
 * ## Why this file exists at all
 *
 * **Because the field is derived and derived things are not saved.** The shader samples a
 * `PaintField`; the field is rebuilt from a `PaintJournal` by `rasterise` in milliseconds; and
 * the journal — forty bytes a dab — is the thing that is actually true. Saving the field
 * would mean writing megabytes of voxels that any change of resolution throws away, and would
 * still lose the stroke boundaries that undo is made of.
 *
 * This was the last reason paint did not survive a reload, and the symptom was total: a model
 * painted in one session saved with no paint in it at all, because nothing in the save path had
 * a parameter through which a journal could travel.
 *
 * ## Why the layout is the atlas's, not this journal's own
 *
 * **Because `reference-file.ts` already solved every question this format asks.** A
 * self-contained, fixed-width, versioned blob in its own zip entry, described by a manifest
 * field that is optional and validated when present. A forty-byte header padded so every
 * `u32` and `f32` sits on a four-byte boundary; counts bounded before allocation; the declared
 * byte length checked last and treated as the final word. A reader that shared none of that
 * would be a second set of rules to keep straight, and this codebase has already lost a day to
 * two sets of rules.
 *
 * ## Why the dabs are structure-of-arrays, which is what they already were
 *
 * **Because the journal holds them that way and copying them into a flat interleaved record
 * would mean a repack in both directions.** Six parallel arrays go out as six typed-array views
 * at four-byte-aligned offsets and come back the same way. The alternative — one record of
 * fifteen fields per dab — is the shape a file format usually has, and it would cost a loop
 * over every dab on every save and on every open to go in and out of it.
 */

import { MAX_PAINT_DABS } from "@big-mesh-studios/csg";

import type { PaintJournal } from "./paint-journal";

/**
 * The header's size, padded so every field below sits on a four-byte boundary.
 *
 * **A header of twenty-eight bytes padded to thirty-two.** The alternative — packing fields
 * tightly — costs four bytes once per file and saves anyone from thinking about whether an
 * unaligned typed-array view is legal on some engine, which `reference-file.ts` decided
 * against once already.
 */
const HEADER_BYTES = 32;

/** The version this build writes, and the only one it reads. */
const PAINT_VERSION = 1;

/**
 * What one dab costs on disk.
 *
 * **Three `f32` of centre, three of normal, one `f32` of radius, one `f32` of hardness, four
 * bytes of colour and one `u32` of part** — twenty-four, eight, four and four. Every field is
 * four-byte aligned because the arrays are copied into aligned views rather than interleaved by
 * hand, so the total is forty.
 *
 * **Stated here rather than imported from `paint-journal.ts`, and checked against it by a test
 * rather than by the import.** The journal's `DAB_BYTES` is derived from its own field widths,
 * which is the number that matters; a codec that trusted it would not notice the journal
 * changing it, which is the whole reason the two are written down separately.
 */
const DAB_BYTES = 40;

/** The offsets of each array, all derived from `HEADER_BYTES` once rather than per write. */
const offsets = (dabs: number) => ({
  centre: HEADER_BYTES,
  normal: HEADER_BYTES + dabs * 12,
  radius: HEADER_BYTES + dabs * 24,
  hardness: HEADER_BYTES + dabs * 28,
  colour: HEADER_BYTES + dabs * 32,
  part: HEADER_BYTES + dabs * 36,
});

/** The whole file's length, which both sides compute so they can contradict each other. */
const fileBytes = (dabs: number, strokes: number): number =>
  offsets(dabs).part + dabs * 4 + strokes * 4;

/** What a journal file holds once read, before it is handed to a journal to adopt. */
export interface PaintFile {
  /** How many dabs, in journal order. */
  readonly dabs: number;
  /** Where every finished stroke ends, as dab indices. */
  readonly strokes: readonly number[];
  readonly centre: Float32Array;
  readonly normal: Float32Array;
  readonly radius: Float32Array;
  readonly hardness: Float32Array;
  readonly colour: Uint8Array;
  readonly part: Uint32Array;
}

/**
 * Writes a journal as the bytes of one zip entry.
 *
 * **An empty journal writes `undefined` rather than a header with nothing in it**, which the
 * caller turns into "no `paint.bin` entry and no `paint` field in the manifest". An unpainted
 * model then writes exactly the entries it wrote before paint had a file format, which is the
 * same compatibility argument `texture` makes.
 */
export const writePaint = (
  journal: PaintJournal | undefined,
): ArrayBuffer | undefined => {
  // **No journal is the same as an empty one**, and the caller turns this into "no `paint.bin`
  // entry and no `paint` field in the manifest" rather than having to ask twice.
  if (journal === undefined) return undefined;
  const dabs = journal.count;
  if (dabs === 0) return undefined;

  const strokes = journal.strokeEnds;
  const at = offsets(dabs);
  const buffer = new ArrayBuffer(fileBytes(dabs, strokes.length));
  const fields = new DataView(buffer);
  fields.setUint16(0, PAINT_VERSION, true);
  fields.setUint32(4, dabs, true);
  fields.setUint32(8, strokes.length, true);

  // **Copied through `set` rather than viewed.** A typed-array view over a buffer may start
  // partway into it and be shorter than the buffer, which is exactly where writing a whole
  // buffer and slicing views back out goes wrong.
  new Float32Array(buffer, at.centre, dabs * 3).set(
    journal.centre.subarray(0, dabs * 3),
  );
  new Float32Array(buffer, at.normal, dabs * 3).set(
    journal.normal.subarray(0, dabs * 3),
  );
  new Float32Array(buffer, at.radius, dabs).set(
    journal.radius.subarray(0, dabs),
  );
  new Float32Array(buffer, at.hardness, dabs).set(
    journal.hardness.subarray(0, dabs),
  );
  new Uint8Array(buffer, at.colour, dabs * 4).set(
    journal.colour.subarray(0, dabs * 4),
  );
  new Uint32Array(buffer, at.part, dabs).set(journal.part.subarray(0, dabs));
  new Uint32Array(buffer, at.part + dabs * 4, strokes.length).set(strokes);

  return buffer;
};

/**
 * Reads what {@link writePaint} wrote, or throws a sentence about why it is not that.
 *
 * **Every bound checked before anything is allocated, in the order that protects rather than the
 * order that is natural.** The counts are read out of the same bytes that are about to size the
 * arrays, so a file claiming four billion dabs is refused against the cap *before* the length
 * arithmetic is trusted not to overflow.
 */
export const readPaint = (buffer: ArrayBuffer): PaintFile => {
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error(
      `paint.bin is ${buffer.byteLength} bytes and a header is ${HEADER_BYTES}`,
    );
  }

  const fields = new DataView(buffer);
  const version = fields.getUint16(0, true);
  if (version !== PAINT_VERSION) {
    throw new Error(
      `paint.bin is version ${version} and this build reads version ${PAINT_VERSION}`,
    );
  }

  const dabs = fields.getUint32(4, true);
  const strokeCount = fields.getUint32(8, true);

  // **Bounded before the arithmetic, because the arithmetic is what allocates.** Forty-four
  // bytes a dab times four billion is a number that is already wrong before it becomes an
  // `ArrayBuffer`, and this is the one check that has to come first.
  if (dabs === 0 || dabs > MAX_PAINT_DABS) {
    throw new Error(
      `paint.bin names ${dabs} dabs and the limit is ${MAX_PAINT_DABS}`,
    );
  }
  if (strokeCount === 0 || strokeCount > dabs) {
    throw new Error(
      `paint.bin names ${strokeCount} strokes over ${dabs} dabs, which is not a shape a stroke list can have`,
    );
  }

  // **The declared length is the final word.** Every count above is a claim; this is the one
  // that is arithmetic over the same claims, so the two can contradict each other and the
  // refusal can name both sides.
  const expected = fileBytes(dabs, strokeCount);
  if (expected !== buffer.byteLength) {
    throw new Error(
      `paint.bin holds ${buffer.byteLength} bytes and ${dabs} dabs over ${strokeCount} strokes need ${expected}`,
    );
  }

  const at = offsets(dabs);
  const strokes = Array.from(
    new Uint32Array(buffer, at.part + dabs * 4, strokeCount),
  );
  // **Stroke ends are checked against the dab count rather than trusted.** They are indices
  // into the arrays just sliced, and an index past the end is not a number a reader may act on:
  // `undoStroke` slices with it.
  let previous = 0;
  for (const end of strokes) {
    if (end <= previous || end > dabs) {
      throw new Error(
        `paint.bin puts a stroke end at ${end}, after ${previous} and within ${dabs} dabs`,
      );
    }
    previous = end;
  }

  // **Every dab's own numbers are range-checked.** A radius of zero or a negative one is not a
  // dab this build could have written, and a `NaN` centre would propagate through `rasterise`
  // into an index and out the other side as a write to whatever voxel index it produced.
  const centre = new Float32Array(buffer, at.centre, dabs * 3).slice();
  const normal = new Float32Array(buffer, at.normal, dabs * 3).slice();
  const radius = new Float32Array(buffer, at.radius, dabs).slice();
  const hardness = new Float32Array(buffer, at.hardness, dabs).slice();
  for (let dab = 0; dab < dabs; dab++) {
    if (!Number.isFinite(radius[dab]!) || radius[dab]! <= 0) {
      throw new Error(`paint.bin gives dab ${dab} a radius of ${radius[dab]}`);
    }
    if (
      !Number.isFinite(hardness[dab]!) ||
      hardness[dab]! < 0 ||
      hardness[dab]! > 1
    ) {
      throw new Error(
        `paint.bin gives dab ${dab} a hardness of ${hardness[dab]}`,
      );
    }
    for (const axis of [0, 1, 2]) {
      if (!Number.isFinite(centre[dab * 3 + axis]!)) {
        throw new Error(
          `paint.bin gives dab ${dab} a centre that is not finite`,
        );
      }
    }
    // **A normal has to be a normal.** `rasterise` divides nothing by it but it projects onto
    // it, and a zero-length one makes every voxel in the dab's box look like it is on the
    // surface, which paints a slab.
    const length = Math.hypot(
      normal[dab * 3]!,
      normal[dab * 3 + 1]!,
      normal[dab * 3 + 2]!,
    );
    if (!Number.isFinite(length) || length < 0.5) {
      throw new Error(`paint.bin gives dab ${dab} a normal ${length} long`);
    }
  }

  return {
    dabs,
    strokes,
    centre,
    normal,
    radius,
    hardness,
    colour: new Uint8Array(buffer, at.colour, dabs * 4).slice(),
    part: new Uint32Array(buffer, at.part, dabs).slice(),
  };
};

/** How many bytes a dab costs, exported so a test can hold the two ends of the codec to it. */
export const PAINT_DAB_BYTES = DAB_BYTES;
