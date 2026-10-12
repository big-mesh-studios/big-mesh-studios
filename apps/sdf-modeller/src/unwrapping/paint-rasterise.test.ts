import { describe, expect, it } from "vitest";

import { PaintField } from "./paint-field";
import { PaintJournal } from "./paint-journal";
import { rasterise, type Placed } from "./paint-rasterise";

/**
 * A field over a fifty-unit box at 0.1 a voxel.
 *
 * **0.1 rather than 0.02**, so that a dab's brush work is a few hundred voxels and a test runs
 * in milliseconds. The geometry under test is the same at either size; only the count changes.
 *
 * **Fifty units, because the indirection grid holds 51.2** at this voxel size and a larger box
 * is refused at construction.
 *
 * **Four slots a side**, because the default pool is 16 MB and a suite making twenty of them
 * makes 320 MB — enough to take a test worker out on a phone.
 */
const field = (): PaintField =>
  PaintField.over(0.1, [0, 0, 0], [50, 50, 50], 4);

/** Places every dab exactly where the journal says, with no part transform and no occlusion. */
const asWritten = (
  _part: number,
  centre: { x: number; y: number; z: number },
  normal: { x: number; y: number; z: number },
): Placed => ({ centre, normal });

const journalWith = (
  dabs: readonly {
    at: readonly [number, number, number];
    normal?: readonly [number, number, number];
    radius: number;
    hardness?: number;
    colour?: { r: number; g: number; b: number; a: number };
  }[],
): PaintJournal => {
  const journal = new PaintJournal();
  for (const dab of dabs) {
    journal.append({
      centre: dab.at,
      normal: dab.normal ?? [0, 1, 0],
      radius: dab.radius,
      hardness: dab.hardness ?? 1,
      colour: dab.colour ?? { r: 255, g: 0, b: 0, a: 255 },
      part: 0,
    });
  }
  journal.endStroke();
  return journal;
};

/**
 * How many voxels of a given alpha a dab painted.
 *
 * **Scans a box around one dab rather than the whole field**, because a full sweep of a
 * 640-voxel box is 2.6 × 10⁸ `get` calls and each allocates a result object — which is enough
 * to take the test worker out. The question this answers is always about one dab's footprint.
 */
const paintedNear = (
  f: PaintField,
  centre: readonly [number, number, number],
  reach: number,
  a: number,
): number => {
  const [vx, vy, vz] = f.voxelAt(...centre);
  const span = Math.ceil(reach / f.voxelSize);
  let found = 0;
  for (let z = vz - span; z <= vz + span; z++) {
    for (let y = vy - span; y <= vy + span; y++) {
      for (let x = vx - span; x <= vx + span; x++) {
        if (f.get(x, y, z).a === a) found += 1;
      }
    }
  }
  return found;
};

describe("rasterising a journal into a field", () => {
  it("paints a dab where the journal says", () => {
    const f = field();
    rasterise(journalWith([{ at: [10, 10, 10], radius: 0.5 }]), f, asWritten);
    expect(f.get(100, 100, 100)).toMatchObject({ r: 255, a: 255 });
    // **And nowhere near it.** A dab that leaked across the model would be invisible in a
    // single-voxel assertion and obvious here.
    expect(f.get(105, 100, 100).a).toBe(0);
  });

  it("counts a dab that changed something as live", () => {
    const f = field();
    const result = rasterise(
      journalWith([{ at: [10, 10, 10], radius: 0.5 }]),
      f,
      asWritten,
    );
    expect(result.live).toBe(1);
  });

  it("counts a repaint of the same colour as dead", () => {
    // **Tier 0, and the whole point of it.** Repainting the same colour over the same spot is
    // exactly what made `randoms-3d-paint`'s operation list grow forever; here it writes no
    // bytes and is reported dead, so a caller can skip it on the next rasterise.
    const f = field();
    const journal = journalWith([
      { at: [10, 10, 10], radius: 0.5 },
      { at: [10, 10, 10], radius: 0.5 },
    ]);
    expect(rasterise(journal, f, asWritten).live).toBe(1);
  });

  it("counts a repaint over an opaque dab of another colour as live", () => {
    // **Because only an identical write is a no-op.** Red over red changes nothing; red over
    // green does, and culling it would lose the stroke.
    const f = field();
    const journal = journalWith([
      { at: [10, 10, 10], radius: 0.5, colour: { r: 0, g: 255, b: 0, a: 255 } },
      { at: [10, 10, 10], radius: 0.5, colour: { r: 255, g: 0, b: 0, a: 255 } },
    ]);
    expect(rasterise(journal, f, asWritten).live).toBe(2);
  });

  it("paints later dabs over earlier ones", () => {
    // **Order is the whole of compositing**, and the journal is ordered.
    const f = field();
    const journal = journalWith([
      { at: [10, 10, 10], radius: 0.5, colour: { r: 0, g: 255, b: 0, a: 255 } },
      { at: [10, 10, 10], radius: 0.5, colour: { r: 255, g: 0, b: 0, a: 255 } },
    ]);
    rasterise(journal, f, asWritten);
    expect(f.get(100, 100, 100)).toMatchObject({ r: 255, g: 0 });
  });

  it("keeps a voxel round rather than stretching along the surface normal", () => {
    // **The disc is measured in the plane, not the sphere.** A dab whose normal is the world
    // +y must cover the same radius sideways as it does along y; a sphere would not, and a
    // brush that stretched with the surface would be the bug a person notices first.
    const f = field();
    rasterise(
      journalWith([{ at: [10, 10, 10], normal: [0, 1, 0], radius: 0.5 }]),
      f,
      asWritten,
    );
    // **Four voxels, not five.** A voxel centre sits half a voxel past its index, so voxel 104
    // is 0.45 away and inside a 0.5 radius while voxel 105 is 0.55 away and outside it. Both
    // axes have to be probed at the same offset or this asserts two different things.
    expect(f.get(104, 100, 100).a).toBe(255);
    expect(f.get(100, 104, 100).a).toBe(255);
    expect(f.get(105, 100, 100).a).toBe(0);
  });

  it("does not paint far off the surface, however wide the brush", () => {
    // **The shell.** A thick brush on a flat field would fill a ball if the shell were not
    // there, and a figure would be painted through from the inside out.
    const f = field();
    rasterise(journalWith([{ at: [10, 10, 10], radius: 2 }]), f, asWritten);
    // The centre voxel is painted; one three world units away along the normal is not.
    expect(f.get(100, 100, 100).a).toBeGreaterThan(0);
    expect(f.get(100, 130, 100).a).toBe(0);
  });

  it("builds up where a translucent brush is used repeatedly", () => {
    // **Straight-alpha over what is there**, which is what the atlas did at
    // `paint-surface.ts:196-204`. A soft brush that could never build up would be useless.
    const f = field();
    const translucent = { r: 0, g: 0, b: 255, a: 64 };
    const journal = new PaintJournal();
    for (let i = 0; i < 6; i++) {
      journal.append({
        centre: [10, 10, 10],
        normal: [0, 1, 0],
        radius: 0.5,
        hardness: 1,
        colour: translucent,
        part: 0,
      });
    }
    journal.endStroke();
    rasterise(journal, f, asWritten);
    expect(f.get(100, 100, 100).a).toBeGreaterThan(64);
  });

  it("skips a dab the placer refuses", () => {
    // **How M5's occlusion rule is expressed**: a dab whose part is not the visible one is not
    // written, without the journal learning anything about it.
    const f = field();
    const journal = journalWith([{ at: [10, 10, 10], radius: 0.5 }]);
    const result = rasterise(journal, f, () => undefined);
    expect(result.live).toBe(0);
    expect(f.brickCount).toBe(0);
  });

  it("passes the journal's part index to the placer", () => {
    // **Because that is how a dab finds its part's transform.**
    const f = field();
    const journal = new PaintJournal();
    journal.append({
      centre: [10, 10, 10],
      normal: [0, 1, 0],
      radius: 0.5,
      hardness: 1,
      colour: { r: 255, g: 0, b: 0, a: 255 },
      part: 4,
    });
    journal.endStroke();
    const seen: number[] = [];
    rasterise(journal, f, (part, centre, normal) => {
      seen.push(part);
      return { centre, normal };
    });
    expect(seen).toEqual([4]);
  });

  it("produces the same field twice", () => {
    // **The property the whole derived-state design rests on.** Two rasterisations of the same
    // journal must be byte-identical, or a re-rasterise after a part moves changes the
    // painting and nobody can say why.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 0.5 },
      { at: [12, 11, 10], radius: 0.3 },
      { at: [10, 13, 11], radius: 0.4 },
    ]);
    const first = field();
    const second = field();
    rasterise(journal, first, asWritten);
    rasterise(journal, second, asWritten);
    expect(Array.from(second.pool)).toEqual(Array.from(first.pool));
  });

  it("leaves an empty journal painting nothing", () => {
    const f = field();
    expect(rasterise(new PaintJournal(), f, asWritten).live).toBe(0);
    expect(f.brickCount).toBe(0);
  });

  it("paints a wide brush across more voxels than a narrow one", () => {
    // **So the brush size the panel asks for is the size that arrives**, which is the property
    // `brush-panel.tsx:11-16` says world-unit widths exist to guarantee.
    const narrow = field();
    const wide = field();
    rasterise(
      journalWith([{ at: [10, 10, 10], radius: 0.2 }]),
      narrow,
      asWritten,
    );
    rasterise(journalWith([{ at: [10, 10, 10], radius: 1 }]), wide, asWritten);
    expect(paintedNear(wide, [10, 10, 10], 3, 255)).toBeGreaterThan(
      paintedNear(narrow, [10, 10, 10], 3, 255),
    );
  });
});
