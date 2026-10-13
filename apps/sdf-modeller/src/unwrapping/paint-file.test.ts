/**
 * The journal as bytes: the round trip, and the refusals.
 *
 * **The round trip is the whole point of this file existing**, so it is the first test and it is
 * byte-for-byte rather than field-for-field: a journal that comes back equal in every value but
 * laid out differently is still a journal that rasterises differently, because the field is
 * built from these numbers in this order.
 */
import { describe, expect, it } from "vitest";

import {
  PAINT_DAB_BYTES,
  readPaint,
  writePaint,
  type PaintFile,
} from "./paint-file";
import { PaintJournal } from "./paint-journal";

/** A journal with two strokes of three and two dabs, in a colour and a brush of its own. */
const painted = (): PaintJournal => {
  const journal = new PaintJournal();
  for (let i = 0; i < 3; i++) {
    journal.append({
      centre: [i * 0.25, 1.5, -2],
      normal: [0, 1, 0],
      radius: 0.1 + i * 0.05,
      hardness: i / 2,
      colour: { r: 24, g: 255 - i, b: 239, a: 255 },
      part: i,
    });
  }
  journal.endStroke();
  journal.append({
    centre: [9, 9, 9],
    normal: [1, 0, 0],
    radius: 0.75,
    hardness: 0.25,
    colour: { r: 1, g: 2, b: 3, a: 4 },
    part: 7,
  });
  journal.endStroke();
  return journal;
};

const roundTrip = (journal: PaintJournal): PaintFile => {
  const written = writePaint(journal);
  expect(written).toBeInstanceOf(ArrayBuffer);
  return readPaint(written as ArrayBuffer);
};

describe("the paint journal as bytes", () => {
  it("writes nothing at all for an empty journal", () => {
    // **Rather than a header with nothing in it.** An unpainted model must keep writing exactly
    // the entries it wrote before paint had a file format, and a `paint.bin` full of zeroes is
    // an entry it does not.
    expect(writePaint(new PaintJournal())).toBeUndefined();
    expect(writePaint(undefined)).toBeUndefined();
  });

  it("comes back with every dab exactly as it went in", () => {
    const journal = painted();
    const file = roundTrip(journal);
    expect(file.dabs).toBe(4);
    expect(Array.from(file.strokes)).toEqual([3, 4]);
    expect(Array.from(file.centre)).toEqual(
      Array.from(journal.centre.subarray(0, 12)),
    );
    expect(Array.from(file.normal)).toEqual(
      Array.from(journal.normal.subarray(0, 12)),
    );
    expect(Array.from(file.radius)).toEqual(
      Array.from(journal.radius.subarray(0, 4)),
    );
    expect(Array.from(file.hardness)).toEqual(
      Array.from(journal.hardness.subarray(0, 4)),
    );
    expect(Array.from(file.colour)).toEqual(
      Array.from(journal.colour.subarray(0, 16)),
    );
    expect(Array.from(file.part)).toEqual(
      Array.from(journal.part.subarray(0, 4)),
    );
  });

  it("costs forty bytes a dab plus a stroke list", () => {
    // **Held to a number written down twice.** `DAB_BYTES` is stated here and derived from the
    // journal's own field widths in `paint-journal.ts`; nothing checks them against each other
    // but this, which is why this is a test and not a comment.
    const journal = painted();
    const written = writePaint(journal) as ArrayBuffer;
    const perDab = (written.byteLength - 32 - journal.strokeCount * 4) / 4;
    expect(perDab).toBe(PAINT_DAB_BYTES);
  });

  it("keeps growing past the journal's initial capacity", () => {
    // **Past the sixty-four dabs the journal starts with**, because a document's first stroke
    // can be longer than that and a codec that only ever saw a short one would write the
    // capacity rather than the contents.
    const journal = new PaintJournal();
    for (let i = 0; i < 200; i++) {
      journal.append({
        centre: [i * 0.01, 0, 0],
        normal: [0, 1, 0],
        radius: 0.2,
        hardness: 0.5,
        colour: { r: i % 256, g: 0, b: 0, a: 255 },
        part: 0,
      });
    }
    journal.endStroke();
    const file = roundTrip(journal);
    expect(file.dabs).toBe(200);
    expect(file.radius[199]).toBeCloseTo(0.2);
    expect(file.colour[199 * 4]).toBe(199);
  });

  it("refuses a file too short to hold a header", () => {
    expect(() => readPaint(new ArrayBuffer(8))).toThrow(/header is 32/);
  });

  it("refuses a version it does not know", () => {
    const buffer = writePaint(painted()) as ArrayBuffer;
    new DataView(buffer).setUint16(0, 99, true);
    expect(() => readPaint(buffer)).toThrow(/version 99/);
  });

  it("refuses a length that does not match its own counts", () => {
    // **The count is a claim and the length is arithmetic over it**, so a file can make the two
    // disagree — and the refusal has to name both sides or it is not actionable.
    const buffer = writePaint(painted()) as ArrayBuffer;
    const lying = new DataView(buffer);
    lying.setUint32(4, 3, true);
    expect(() => readPaint(buffer)).toThrow(
      /paint\.bin holds \d+ bytes and 3 dabs/,
    );
  });

  it("refuses a stroke end that is not inside the journal", () => {
    // **`undoStroke` slices with these**, so an index past the end is not a number a reader may
    // act on — it is a slice of nothing.
    const buffer = writePaint(painted()) as ArrayBuffer;
    // **The last stroke's end, which is the only u32 after the dabs.** Four dabs at forty
    // bytes, so the stroke list starts at the header plus 4 × 40 and the second entry is the
    // one that can be pushed out of range without the length check noticing.
    new Uint32Array(buffer, 32 + 4 * 40 + 4, 1)[0] = 99;
    expect(() => readPaint(buffer)).toThrow(/stroke end at 99/);
  });

  it("refuses a radius that is not a radius", () => {
    // **A zero radius would divide by zero in `rasterise`** — the falloff is asked for a
    // distance divided by the radius — and a negative one would put the ramp inside out.
    const buffer = writePaint(painted()) as ArrayBuffer;
    new Float32Array(buffer, 32 + 4 * 24, 1)[0] = 0;
    expect(() => readPaint(buffer)).toThrow(/radius of 0/);
  });

  it("refuses a hardness outside zero to one", () => {
    const buffer = writePaint(painted()) as ArrayBuffer;
    new Float32Array(buffer, 32 + 4 * 28, 1)[0] = 4;
    expect(() => readPaint(buffer)).toThrow(/hardness of 4/);
  });

  it("refuses a normal that is not a normal", () => {
    // **`rasterise` projects every voxel in the box onto this**, and a zero-length one makes
    // them all look like they are on the surface, which paints a slab rather than a dab.
    const buffer = writePaint(painted()) as ArrayBuffer;
    // **The normals start after the centres**, which is four dabs of three floats past the
    // header rather than one dab's worth.
    new Float32Array(buffer, 32 + 4 * 12, 3).set([0, 0, 0]);
    expect(() => readPaint(buffer)).toThrow(/normal 0 long/);
  });

  it("refuses a centre that is not a number", () => {
    // **A `NaN` would propagate into a voxel index and come out as a write to whatever voxel
    // that index names**, which is the same class of bug the grid's own bound check exists for.
    const buffer = writePaint(painted()) as ArrayBuffer;
    new Float32Array(buffer, 32, 1)[0] = Number.NaN;
    expect(() => readPaint(buffer)).toThrow(/centre that is not finite/);
  });

  it("refuses more strokes than dabs", () => {
    const buffer = writePaint(painted()) as ArrayBuffer;
    new DataView(buffer).setUint32(8, 40, true);
    expect(() => readPaint(buffer)).toThrow(
      /not a shape a stroke list can have/,
    );
  });
});

describe("a journal adopting one", () => {
  it("takes on the dabs and the strokes, and holds nothing open", () => {
    const source = painted();
    const file = roundTrip(source);
    const journal = new PaintJournal();
    journal.adopt(file);
    expect(journal.count).toBe(4);
    expect(journal.strokeCount).toBe(2);
    // **Nothing open**, because a file cannot hold a half-drawn stroke: the next dab a brush
    // adds starts a new stroke rather than joining one that was saved half-finished.
    expect(journal.openStrokeCount).toBe(0);
  });

  it("keeps appending after adopting", () => {
    // **The arrays are the journal's own, not views onto the decoded buffer.** `grow` doubles
    // and replaces them, so a view would detach silently the first time anything was added and
    // the rest of the session would paint into a buffer nothing was reading.
    const journal = new PaintJournal();
    journal.adopt(roundTrip(painted()));
    for (let i = 0; i < 200; i++) {
      journal.append({
        centre: [i, 0, 0],
        normal: [0, 1, 0],
        radius: 0.2,
        hardness: 0.5,
        colour: { r: 0, g: 255, b: 0, a: 255 },
        part: 0,
      });
    }
    journal.endStroke();
    expect(journal.count).toBe(204);
    expect(journal.strokeCount).toBe(3);
    expect(journal.radius[203]).toBeCloseTo(0.2);
    // **And it survives another round trip**, which is the only way to know the grow did not
    // leave the arrays pointing somewhere else.
    expect(roundTrip(journal).dabs).toBe(204);
  });

  it("replaces whatever was in it", () => {
    // **Adopting over a live journal is not something the load path does** — it makes a new
    // document first — but the method has to mean what it says rather than append.
    const journal = painted();
    const other = new PaintJournal();
    other.append({
      centre: [1, 1, 1],
      normal: [0, 1, 0],
      radius: 0.2,
      hardness: 0.5,
      colour: { r: 0, g: 255, b: 0, a: 255 },
      part: 0,
    });
    other.endStroke();
    journal.adopt(roundTrip(other));
    expect(journal.count).toBe(1);
    expect(journal.strokeCount).toBe(1);
    expect(journal.part[0]).toBe(0);
  });
});
