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
    /** Close the previous stroke first, which is what separates one dab from the next. */
    newStroke?: boolean;
  }[],
): PaintJournal => {
  const journal = new PaintJournal();
  for (const dab of dabs) {
    if (dab.newStroke) journal.endStroke();
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
    // single-voxel assertion and obvious here. Six voxels is well past the brush's half-voxel
    // antialiasing ramp, which is the furthest a dab is allowed to reach.
    expect(f.get(106, 100, 100).a).toBe(0);
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
      {
        at: [10, 10, 10],
        radius: 0.5,
        colour: { r: 255, g: 0, b: 0, a: 255 },
        newStroke: true,
      },
    ]);
    // **Two strokes, so two composites** — the stroke is the unit of compositing now, which is
    // the whole of what `live` counts. One stroke of two dabs is one write, and one write is
    // what it has to be.
    expect(rasterise(journal, f, asWritten).live).toBe(2);
  });

  it("paints later dabs over earlier ones", () => {
    // **Order is the whole of compositing**, and the journal is ordered.
    const f = field();
    const journal = journalWith([
      { at: [10, 10, 10], radius: 0.5, colour: { r: 0, g: 255, b: 0, a: 255 } },
      {
        at: [10, 10, 10],
        radius: 0.5,
        colour: { r: 255, g: 0, b: 0, a: 255 },
        newStroke: true,
      },
    ]);
    rasterise(journal, f, asWritten);
    expect(f.get(100, 100, 100)).toMatchObject({ r: 255, g: 0 });
  });

  it("averages the colours within one stroke and orders strokes over each other", () => {
    // **The two halves of stroke grouping, and they are different rules.** Within a stroke the
    // dabs are one gesture and land on one colour — a brush takes its colour once, when the
    // stroke starts, so a stroke that changed colour part-way is not a thing a person can draw.
    // Between strokes it is order, and the later one wins.
    const f = field();
    const journal = new PaintJournal();
    journal.append({
      centre: [10, 10, 10],
      normal: [0, 1, 0],
      radius: 0.5,
      hardness: 1,
      colour: { r: 255, g: 0, b: 0, a: 255 },
      part: 0,
    });
    journal.append({
      centre: [10, 10, 10],
      normal: [0, 1, 0],
      radius: 0.5,
      hardness: 1,
      colour: { r: 0, g: 0, b: 255, a: 255 },
      part: 0,
    });
    journal.endStroke();
    journal.append({
      centre: [10, 10, 10],
      normal: [0, 1, 0],
      radius: 0.5,
      hardness: 1,
      colour: { r: 0, g: 255, b: 0, a: 255 },
      part: 0,
    });
    journal.endStroke();
    rasterise(journal, f, asWritten);
    // The second stroke is opaque, so the blend underneath does not show through at all.
    expect(f.get(100, 100, 100)).toMatchObject({ r: 0, g: 255, b: 0 });

    const mixed = field();
    const one = new PaintJournal();
    one.append({
      centre: [10, 10, 10],
      normal: [0, 1, 0],
      radius: 0.5,
      hardness: 1,
      colour: { r: 255, g: 0, b: 0, a: 255 },
      part: 0,
    });
    one.append({
      centre: [10, 10, 10],
      normal: [0, 1, 0],
      radius: 0.5,
      hardness: 1,
      colour: { r: 0, g: 0, b: 255, a: 255 },
      part: 0,
    });
    one.endStroke();
    rasterise(one, mixed, asWritten);
    expect(mixed.get(100, 100, 100)).toMatchObject({ r: 128, g: 0, b: 128 });
  });

  it("keeps a soft brush soft, however many dabs the stroke is made of", () => {
    // **The defect this whole rule exists for.** Every dab used to composite its own falloff
    // over the last one's, and compositing is multiplicative in the coverage: three dabs at a
    // third of a radius apart turned a falloff from the hardness to the rim into a cliff at
    // ninety-six per cent of the radius. The cross-section of this stroke read
    // `9 9 9 9 9 9 9 9 6 2 0`; it reads `9 9 9 9 5 3 2 1 0` now, which is the ramp the brush
    // was asked for.
    const f = field();
    const journal = new PaintJournal();
    for (let i = 0; i <= 12; i++) {
      journal.append({
        centre: [10 + (i * 0.5) / 3, 10, 10],
        normal: [0, 1, 0],
        radius: 0.5,
        hardness: 0,
        colour: { r: 255, g: 255, b: 255, a: 255 },
        part: 0,
      });
    }
    journal.endStroke();
    rasterise(journal, f, asWritten);
    // **Outwards from the middle of the stroke, one voxel at a time, across the disc.** The
    // normal is y, so the disc lies in x and z and z is the radius; probing along the normal
    // would read the shell, not the brush.
    const alphas = [0, 1, 2, 3, 4].map((out) => f.get(100, 100, 100 + out).a);
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]!).toBeLessThan(alphas[i - 1]!);
    }
    expect(alphas[0]!).toBeGreaterThan(200);
  });

  it("still builds up where a translucent brush is held still", () => {
    // **The other half of the rule, and the reason coverage is a maximum but opacity is not.**
    // Six dabs of a quarter-opaque brush in one place have to get darker together, or an
    // airbrush is a highlighter.
    const f = field();
    const one = field();
    const journal = new PaintJournal();
    const single = new PaintJournal();
    const translucent = { r: 255, g: 255, b: 255, a: 64 };
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
    single.append({
      centre: [10, 10, 10],
      normal: [0, 1, 0],
      radius: 0.5,
      hardness: 1,
      colour: translucent,
      part: 0,
    });
    single.endStroke();
    rasterise(journal, f, asWritten);
    rasterise(single, one, asWritten);
    expect(f.get(100, 100, 100).a).toBeGreaterThan(one.get(100, 100, 100).a);
    expect(f.get(100, 100, 100).a).toBeGreaterThan(64);
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
    // **In the plane, the disc is opaque well inside its radius and fades from there.** Voxel
    // 104 is 0.45 from the centre, which is inside the 0.5 radius and inside the antialiasing
    // ramp, so it is solid; the antialiasing is what "not five" means now, and the separate
    // test below is what asserts it.
    expect(f.get(104, 100, 100).a).toBe(255);
    // **Across the normal, the shell and nothing more.** This is the assertion's other half and
    // it moved when the shell did: the shell is a voxel and a half, so at this test's 0.1 voxel
    // it reaches half of that across. It used to reach half a world unit, which was ten voxels
    // of tolerance at a fiftieth and meant a dab scanned a 33³ box to fill a 3³ one.
    expect(f.get(100, 100, 100).a).toBe(255);
    expect(f.get(100, 103, 100).a).toBe(0);
  });

  it("antialiases a hard edge rather than stepping it", () => {
    // **A coverage that goes from solid to nothing between two adjacent voxel centres is a
    // staircase**, and trilinear filtering can only round it over the one voxel it spans. The
    // ramp is widened to half a voxel either side of the rim for exactly that reason, and this
    // is the test that says so: a hard brush still has a partial voxel at its edge.
    const f = field();
    rasterise(
      journalWith([{ at: [10, 10, 10], normal: [0, 1, 0], radius: 0.5 }]),
      f,
      asWritten,
    );
    // **Scanned out to the rim rather than probed at a fixed index**, because the voxel holding
    // the partial coverage is wherever the widened ramp lands it and asking for a particular one
    // would be asserting the arithmetic twice instead of the behaviour.
    const rim: number[] = [];
    for (let z = 100; z < 112; z++) rim.push(f.get(100, 100, z).a);
    const partial = rim.filter((a) => a > 0 && a < 255);
    expect(partial.length).toBeGreaterThan(0);
    // **The outermost painted voxel is partial and the one past it is clear.** That is what a
    // ramp is, as opposed to a step, and it is what gives the trilinear sampler something to
    // interpolate: 255, then this, then nothing, is a gradient across three samples where a
    // step would leave it with two identical ones.
    const last = rim.reduce((at, a, i) => (a > 0 ? i : at), -1);
    expect(last).toBeGreaterThan(0);
    expect(rim[last]!).toBeGreaterThan(0);
    expect(rim[last]!).toBeLessThan(255);
    expect(rim[last + 1]).toBe(0);
  });

  it("does not widen a brush narrower than the grid", () => {
    // **The antialiasing ramp is capped at the brush's own radius**, and this is what that cap
    // is for. A brush a tenth of a world unit across, at a 0.1 voxel, is one voxel wide; an
    // uncapped ramp would be a voxel and a half *of normalised distance*, which is three times
    // the brush, and the smallest brush on the panel would paint a soft blob three times the
    // size it says it has.
    const f = field();
    rasterise(
      journalWith([{ at: [10, 10, 10], normal: [0, 1, 0], radius: 0.1 }]),
      f,
      asWritten,
    );
    // **Two voxels across, not five.** The disc's own radius is one voxel and the ramp is
    // capped at that, so the painted run stops at two.
    expect(f.get(99, 100, 100).a).toBeGreaterThan(0);
    expect(f.get(102, 100, 100).a).toBe(0);
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
