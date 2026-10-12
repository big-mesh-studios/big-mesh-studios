import { describe, expect, it } from "vitest";

import { cullOccluded, regionOf } from "./paint-cull";
import { PaintField } from "./paint-field";
import { PaintJournal } from "./paint-journal";
import type { Placed } from "./paint-rasterise";

const field = (): PaintField =>
  PaintField.over(0.1, [0, 0, 0], [50, 50, 50], 4);

const red = { r: 255, g: 0, b: 0, a: 255 };

/** Part zero, no transform. */
const at = (
  _part: number,
  centre: { x: number; y: number; z: number },
  _normal: { x: number; y: number; z: number },
): Placed => ({ centre, normal: { x: 0, y: 1, z: 0 } });

const journalWith = (
  dabs: readonly {
    at: readonly [number, number, number];
    radius: number;
    hardness?: number;
    colour?: { r: number; g: number; b: number; a: number };
  }[],
): PaintJournal => {
  const journal = new PaintJournal();
  for (const dab of dabs) {
    journal.append({
      centre: dab.at,
      normal: [0, 1, 0],
      radius: dab.radius,
      hardness: dab.hardness ?? 1,
      colour: dab.colour ?? red,
      part: 0,
    });
  }
  journal.endStroke();
  return journal;
};

/** A scratch buffer big enough for any region these tests make. */
const scratch = (): Uint8Array => new Uint8Array(4_000_000);

/** Cull a whole journal, sorted, because the order the walk finds them is not the contract. */
const cull = (journal: PaintJournal): number[] => {
  const region = regionOf(journal, field(), 0, journal.count, at)!;
  const result = cullOccluded(
    journal,
    field(),
    0,
    journal.count,
    region,
    at,
    scratch(),
    0,
  );
  return result.dead.sort((a, b) => a - b);
};

describe("culling occluded dabs", () => {
  it("finds a dab completely covered by a later one dead", () => {
    // **The exact case it exists for.** Repainting the same spot with the same brush a
    // thousand times leaves one visible dab and nine hundred and ninety-nine that changed
    // nothing — and in `randoms-3d-paint` each of those was an `Operation` on an append-only
    // list that was never pruned.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [10, 10, 10], radius: 1 },
      { at: [10, 10, 10], radius: 1 },
    ]);
    expect(cull(journal)).toEqual([0, 1]);
  });

  it("keeps the last of a run of identical dabs", () => {
    // **Because backwards, the first to reach a voxel owns it** — and that is the one painted
    // last.
    expect(cull(journalWith([{ at: [10, 10, 10], radius: 1 }]))).toEqual([]);
  });

  it("keeps a dab that only partly shows", () => {
    // **One uncovered voxel is enough, however small.** A dab half-hidden behind a later one
    // is still half a stroke, and culling it would take a person's paint off the model.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [10, 10, 10.5], radius: 1 },
    ]);
    expect(cull(journal)).toEqual([]);
  });

  it("keeps a dab at a different place", () => {
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [20, 10, 10], radius: 1 },
    ]);
    expect(cull(journal)).toEqual([]);
  });

  it("does not let a translucent dab occlude", () => {
    // **The rule that has to be right.** A dab at half alpha leaves half of what was
    // underneath it, so the dab underneath is still visible. Treating partial coverage as
    // occlusion would delete real paint the moment somebody used a soft brush twice, which is
    // the most common thing a soft brush is for.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1, hardness: 1 },
      { at: [10, 10, 10], radius: 1, hardness: 1, colour: { ...red, a: 128 } },
    ]);
    expect(cull(journal)).toEqual([]);
  });

  it("does not let a soft-edged dab occlude with its rim", () => {
    // **A `hardness` below 1 only claims its solid core**, so the softer rim of a later dab
    // cannot hide an earlier one.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [10, 10, 10], radius: 1, hardness: 0.5 },
    ]);
    expect(cull(journal)).toEqual([]);
  });

  it("never removes a dab from the journal", () => {
    // **The invariant the whole scheme rests on.** A culled dab is needed again the moment the
    // stroke covering it is undone, so this reports indices and changes nothing; a culler that
    // deleted would turn ctrl-z into losing paint.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [10, 10, 10], radius: 1 },
    ]);
    expect(cull(journal)).toEqual([0]);
    expect(journal.count).toBe(2);
  });

  it("answers only about the dabs it was given", () => {
    // **Order is the whole of it.** Asked about dab 1 alone, with nothing after it to cover
    // it, it is alive — which is what makes an incremental cull of a single stroke sound, and
    // also why a cull range has to be walked backwards from its own end.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [10, 10, 10], radius: 1 },
    ]);
    const f = field();
    const region = regionOf(journal, f, 0, journal.count, at)!;
    const alone = cullOccluded(
      journal,
      f,
      1,
      journal.count,
      region,
      at,
      scratch(),
      0,
    );
    expect(alone.dead).toEqual([]);
    const together = cullOccluded(
      journal,
      f,
      0,
      journal.count,
      region,
      at,
      scratch(),
      0,
    );
    expect(together.dead).toEqual([0]);
  });

  it("gives the same answer on a reused buffer as on a fresh one", () => {
    // **The bug this guards is silent and expensive.** A culler that did not clear its scratch
    // would inherit claims from the previous call and report live paint dead — and nothing
    // would say so, because the field still looks right right up until a dab that should be
    // there is not.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [10, 10, 10], radius: 1 },
    ]);
    const f = field();
    const region = regionOf(journal, f, 0, journal.count, at)!;
    const shared = scratch();
    const first = cullOccluded(
      journal,
      f,
      0,
      journal.count,
      region,
      at,
      shared,
      0,
    );
    const second = cullOccluded(
      journal,
      f,
      0,
      journal.count,
      region,
      at,
      shared,
      0,
    );
    const fresh = cullOccluded(
      journal,
      f,
      0,
      journal.count,
      region,
      at,
      scratch(),
      0,
    );
    expect(second.dead).toEqual(first.dead);
    expect(fresh.dead).toEqual(first.dead);
  });
});

describe("the region a set of dabs can touch", () => {
  it("covers every dab", () => {
    // **Because a cull that considered less than the rasteriser would consider would declare a
    // dab dead on the strength of voxels nothing had claimed** — which is exactly how paint
    // goes missing.
    const journal = journalWith([
      { at: [10, 10, 10], radius: 1 },
      { at: [30, 10, 10], radius: 1 },
    ]);
    const f = field();
    const region = regionOf(journal, f, 0, journal.count, at)!;
    // **Voxel indices, not world coordinates.** The region is what the cull indexes its
    // scratch with, and an earlier version built it in world units — a mismatch that made
    // every dab come back dead, because no voxel index fell inside a box measured from a
    // different origin.
    const [firstVoxel] = f.voxelAt(10, 10, 10);
    const [lastVoxel] = f.voxelAt(30, 10, 10);
    expect(region.x0).toBeLessThanOrEqual(firstVoxel);
    expect(region.x1).toBeGreaterThanOrEqual(lastVoxel);
  });

  it("is nothing when there is nothing", () => {
    expect(regionOf(new PaintJournal(), field(), 0, 0, at)).toBeUndefined();
  });

  it("skips a dab the placer refuses", () => {
    const journal = journalWith([{ at: [10, 10, 10], radius: 1 }]);
    expect(
      regionOf(journal, field(), 0, journal.count, () => undefined),
    ).toBeUndefined();
  });
});
