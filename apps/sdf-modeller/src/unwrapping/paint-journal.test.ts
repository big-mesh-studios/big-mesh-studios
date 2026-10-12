import { describe, expect, it } from "vitest";

import { PaintJournal, type Dab } from "./paint-journal";

const red: Dab = {
  centre: [1, 2, 3],
  normal: [0, 1, 0],
  radius: 0.25,
  hardness: 0.5,
  colour: { r: 255, g: 0, b: 0, a: 255 },
  part: 0,
};

/** A dab distinguishable from every other by its radius alone. */
const dabWithRadius = (radius: number, part = 0): Dab => ({
  ...red,
  radius,
  part,
});

/** A stroke of `count` dabs, finished. */
const stroke = (journal: PaintJournal, count: number, radius = 1): void => {
  for (let i = 0; i < count; i++) {
    journal.append(dabWithRadius(radius + i));
  }
  journal.endStroke();
};

describe("a paint journal", () => {
  it("starts empty", () => {
    const journal = new PaintJournal();
    expect(journal.count).toBe(0);
    expect(journal.strokeCount).toBe(0);
    expect(journal.openStrokeCount).toBe(0);
  });

  it("keeps every field of a dab", () => {
    const journal = new PaintJournal();
    journal.append(red);
    journal.endStroke();
    expect(Array.from(journal.centre.slice(0, 3))).toEqual([1, 2, 3]);
    expect(Array.from(journal.normal.slice(0, 3))).toEqual([0, 1, 0]);
    expect(journal.radius[0]).toBe(0.25);
    expect(journal.hardness[0]).toBe(0.5);
    expect(Array.from(journal.colour.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(journal.part[0]).toBe(0);
  });

  it("grows past its initial capacity without losing anything", () => {
    // **The doubling path.** A journal starts with room for 64 dabs, so anything that only
    // tests a handful of dabs never runs this line, and a bug here would lose a painting
    // exactly when somebody had painted a lot.
    const journal = new PaintJournal();
    const wanted = 500;
    for (let i = 0; i < wanted; i++) journal.append(dabWithRadius(i));
    journal.endStroke();
    expect(journal.count).toBe(wanted);
    for (let i = 0; i < wanted; i++) {
      expect(journal.radius[i]).toBe(i);
    }
  });

  it("does not record a stroke that painted nothing", () => {
    // **So a tap that landed off the model leaves no trace.** Otherwise every stray tap pastes
    // an entry onto the history and ctrl-z steps through them doing nothing.
    const journal = new PaintJournal();
    journal.endStroke();
    expect(journal.strokeCount).toBe(0);
  });

  it("counts a stroke in progress without finishing it", () => {
    const journal = new PaintJournal();
    journal.append(red);
    journal.append(red);
    expect(journal.openStrokeCount).toBe(2);
    expect(journal.strokeCount).toBe(0);
    journal.endStroke();
    expect(journal.openStrokeCount).toBe(0);
    expect(journal.strokeCount).toBe(1);
  });

  it("undoes one stroke at a time, newest first", () => {
    const journal = new PaintJournal();
    stroke(journal, 3, 10);
    stroke(journal, 4, 20);
    stroke(journal, 5, 30);
    expect(journal.count).toBe(12);

    expect(journal.undoStroke()!.count).toBe(5);
    expect(journal.count).toBe(7);
    expect(journal.strokeCount).toBe(2);

    expect(journal.undoStroke()!.count).toBe(4);
    expect(journal.count).toBe(3);
    expect(journal.strokeCount).toBe(1);

    expect(journal.undoStroke()!.count).toBe(3);
    expect(journal.count).toBe(0);
    expect(journal.strokeCount).toBe(0);
  });

  it("undoes the stroke before the one in progress, not the one in progress", () => {
    // **The boundary bug this file's header is about.** `openStart` has to survive a stroke
    // being closed and another opened; the first version let `append` overwrite the marker
    // saying where the previous stroke ended, which made the stroke *before* the one being
    // drawn un-undoable — and silently so, because the count still looked right.
    const journal = new PaintJournal();
    stroke(journal, 3, 10);
    journal.append(dabWithRadius(99));
    journal.append(dabWithRadius(98));
    expect(journal.openStrokeCount).toBe(2);

    const removed = journal.undoStroke()!;
    expect(removed.count).toBe(3);
    expect(journal.count).toBe(0);
    // The two dabs of the interrupted stroke are gone with it.
    expect(journal.radius[0]).not.toBe(98);
  });

  it("hands back the dabs it removed, not just how many", () => {
    const journal = new PaintJournal();
    stroke(journal, 2, 10);
    stroke(journal, 2, 50);
    const removed = journal.undoStroke()!;
    expect(Array.from(removed.radius)).toEqual([50, 51]);
    expect(removed.colour[0]).toBe(255);
  });

  it("puts dabs back where they were on redo", () => {
    const journal = new PaintJournal();
    stroke(journal, 2, 10);
    stroke(journal, 3, 50);
    const before = Array.from(journal.radius.slice(0, 5));

    const second = journal.undoStroke()!;
    const first = journal.undoStroke()!;
    expect(journal.count).toBe(0);
    journal.redoStroke(first);
    journal.redoStroke(second);

    expect(journal.count).toBe(5);
    expect(journal.strokeCount).toBe(2);
    expect(Array.from(journal.radius.slice(0, 5))).toEqual(before);
  });

  it("survives undo and redo of every stroke, ending where it started", () => {
    // **The property that matters rather than any one step:** undo/redo must be lossless, or
    // ctrl-z is destructive.
    const journal = new PaintJournal();
    for (let s = 0; s < 6; s++) stroke(journal, 3, 100 + s);
    const wanted = Array.from(journal.radius.slice(0, journal.count));

    const stack = [];
    while (journal.strokeCount > 0) stack.push(journal.undoStroke()!);
    expect(journal.count).toBe(0);
    while (stack.length > 0) journal.redoStroke(stack.pop()!);
    expect(Array.from(journal.radius.slice(0, journal.count))).toEqual(wanted);
  });

  it("returns nothing when there is nothing to undo", () => {
    const journal = new PaintJournal();
    expect(journal.undoStroke()).toBeUndefined();
    stroke(journal, 1);
    expect(journal.undoStroke()).not.toBeUndefined();
    expect(journal.undoStroke()).toBeUndefined();
  });

  it("clears to empty", () => {
    const journal = new PaintJournal();
    stroke(journal, 3);
    journal.clear();
    expect(journal.count).toBe(0);
    expect(journal.strokeCount).toBe(0);
  });

  it("keeps dabs from different parts apart", () => {
    // **Because a dab's part decides which transform it is rasterised through**, so a field
    // rebuilt after a part moves can put each dab back where its own part put it.
    const journal = new PaintJournal();
    journal.append(dabWithRadius(1, 0));
    journal.append(dabWithRadius(2, 7));
    journal.endStroke();
    expect(Array.from(journal.part.slice(0, journal.count))).toEqual([0, 7]);
  });
});
