import { describe, expect, it } from "vitest";

import { PaintField } from "./paint-field";
import { PaintJournal } from "./paint-journal";
import { PaintBrush, type Localiser } from "./paint-brush";
import type { Placed } from "./paint-rasterise";

/** A field over a box the grid can hold, with a small pool. */
const field = (): PaintField =>
  PaintField.over(0.1, [0, 0, 0], [50, 50, 50], 4);

const red = { r: 255, g: 0, b: 0, a: 255 };

/** Part zero, no transform, so a dab lands where the journal says. */
const asWritten: Localiser = (_part, point, normal) => ({
  centre: [point.x, point.y, point.z],
  normal: [normal.x, normal.y, normal.z],
});

const anywhere: (
  part: number,
  centre: { x: number; y: number; z: number },
  normal: { x: number; y: number; z: number },
) => Placed | undefined = (_part, centre, normal) => ({ centre, normal });

/**
 * A brush over a field of its own.
 *
 * **Each brush gets a fresh field**, because a test that shares one would see the previous
 * test's paint and be asserting on somebody else's painting.
 */
const brush = (
  journal: PaintJournal,
  radius = 0.5,
  hardness = 1,
  target: PaintField = field(),
): PaintBrush =>
  new PaintBrush(
    journal,
    target,
    { radius, hardness, colour: red },
    asWritten,
    anywhere,
  );

const hit = (x: number, z = 10, part = 0) => ({
  point: { x, y: 10, z },
  normal: { x: 0, y: 1, z: 0 },
  part,
});

describe("a paint brush", () => {
  it("puts one dab down for a tap", () => {
    // **Because a tap is how somebody puts a single mark on a model**, and a brush that
    // painted nothing on a tap reads as broken rather than as strict.
    const journal = new PaintJournal();
    brush(journal).moveTo(hit(10));
    expect(journal.count).toBe(1);
  });

  it("does not add a second dab for a sample too close to the last", () => {
    // **Spacing is by distance, and a pointer event is a rate rather than a place.** A slow
    // drag emits few events; without this a brush would lay down one dab per event and the
    // stroke's density would depend on how fast somebody drew it.
    const journal = new PaintJournal();
    const stroke = brush(journal, 1);
    stroke.moveTo(hit(10));
    stroke.moveTo(hit(10.05));
    expect(journal.count).toBe(1);
  });

  it("fills in the gap between two distant samples", () => {
    // **Otherwise a quick drag is a dotted line.** The dabs are laid at the brush's own
    // spacing, so the result is the same stroke whoever drew it and however fast.
    const journal = new PaintJournal();
    const stroke = brush(journal, 1);
    stroke.moveTo(hit(10));
    stroke.moveTo(hit(12));
    expect(journal.count).toBeGreaterThan(3);
  });

  it("does not jump between parts", () => {
    // **Because the distance between two parts is not a distance along one surface.** Joining
    // across the gap would leave a chain of discs running through empty space — the same
    // failure the atlas's chart check prevented, arriving by a different route.
    const journal = new PaintJournal();
    const stroke = brush(journal, 1);
    stroke.moveTo(hit(10, 10, 0));
    stroke.moveTo(hit(10, 10, 1));
    expect(journal.count).toBe(2);
  });

  it("caps how far one pointer event can fill", () => {
    // **A pointer jump is a teleport, not a stroke.** A drag that starts on the model and
    // leaves the canvas produces one enormous event, and laying a dab at every spacing along
    // the chord would paint a stripe through the inside of the figure.
    const journal = new PaintJournal();
    const stroke = brush(journal, 1);
    stroke.moveTo(hit(1));
    stroke.moveTo(hit(45));
    expect(journal.count).toBeLessThanOrEqual(1 + 256 + 1);
  });

  it("paints what it stamps while the finger is still down", () => {
    // **The live-painting assertion.** `finish` used to be the only thing that wrote to the
    // field, so a stroke was invisible for its whole length and appeared all at once when the
    // finger came up — which is what a tool that saves looks like, and which is not what a brush
    // is for.
    const f = field();
    const journal = new PaintJournal();
    const stroke = brush(journal, 0.5, 1, f);
    stroke.moveTo(hit(10));
    expect(f.get(100, 100, 100)).toMatchObject({ r: 255, a: 255 });
    const result = stroke.finish();
    expect(result.dabs).toBe(1);
    expect(result.live).toBe(1);
  });

  it("records one finished stroke however many samples it took", () => {
    // **Because a drag is dozens of pointer events and one undo entry.**
    const journal = new PaintJournal();
    const stroke = brush(journal, 1);
    stroke.moveTo(hit(10));
    stroke.moveTo(hit(11));
    stroke.moveTo(hit(12));
    stroke.finish();
    expect(journal.strokeCount).toBe(1);
  });

  it("reports nothing for a stroke that touched nothing", () => {
    const journal = new PaintJournal();
    expect(brush(journal).finish()).toEqual({ dabs: 0, live: 0 });
    expect(journal.strokeCount).toBe(0);
  });

  it("uses the brush's radius and hardness as given", () => {
    // **So the world-unit width the panel asks for is the width that arrives**, which is the
    // property `brush-panel.tsx:11-16` exists to guarantee.
    const journal = new PaintJournal();
    brush(journal, 1.5, 0.25).moveTo(hit(10));
    journal.endStroke();
    expect(journal.radius[0]).toBe(1.5);
    expect(journal.hardness[0]).toBe(0.25);
    expect(Array.from(journal.colour.slice(0, 4))).toEqual([255, 0, 0, 255]);
  });

  it("starts a fresh run after finishing", () => {
    // **So a second stroke lays its own first dab** rather than measuring from the last
    // sample of the stroke before it, which would join two separate marks with a chain.
    const journal = new PaintJournal();
    brush(journal).moveTo(hit(10));
    brush(journal).moveTo(hit(10));
    expect(journal.count).toBe(2);
  });
});
