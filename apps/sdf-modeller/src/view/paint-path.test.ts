import { describe, expect, it } from "vitest";
import { conjugate, rotate } from "@big-mesh-studios/csg";

import {
  DEFAULT_BUDGET,
  operationsField,
  partsToOperations,
} from "../model/mesh-model";
import { modelBounds, placedPart, type Part } from "../model/part";
import { BRICK, GRID_RES, PaintField, SLOT } from "../unwrapping/paint-field";
import { PaintJournal } from "../unwrapping/paint-journal";
import { PaintBrush, type Localiser } from "../unwrapping/paint-brush";
import { rasterise, type Placed } from "../unwrapping/paint-rasterise";
import { distanceToPart, pointInPartFrame } from "./pick-part";
import { fieldHitAlong, type BrushSurface } from "./field-hit";

/**
 * The whole paint path, end to end, against a real model.
 *
 * **This is the test the unit tests cannot be.** Each piece is tested against numbers in its own
 * file — a journal that appends and undoes, a field that stores a texel, a hit that lands
 * somewhere. What none of them can say is whether a ray into a capsule resolves to a point on
 * the capsule, a dab lands there, and a rasterise puts paint at that point. A mistake in any of
 * the four is invisible from inside any one of them, and all four had never been run together.
 *
 * So this builds a real capsule, meshes it with the mesher the app uses, builds the real field,
 * aims a real ray at it, and asks whether the paint turns up where the ray went.
 */

/** A capsule standing on the floor, the same shape `newModel` makes. */
const capsule = (): Part[] => [
  placedPart(
    "body",
    { type: "Capsule", len: 2.2, radius: 0.7 },
    { x: 0, y: 1.1, z: 0 },
  ),
];

/**
 * A brush surface over real parts, built the way `app.tsx` builds one.
 *
 * **No mesh.** The brush sphere-traces the field — the same question `pickPart` asks for a tap,
 * and the same answer — so a mesh would be something to keep in step with the model for nothing.
 */
const surfaceFor = (parts: readonly Part[]): BrushSurface => ({
  field: operationsField(partsToOperations(parts), DEFAULT_BUDGET),
  partCount: parts.length,
  partDistance: (part, point) => distanceToPart(parts[part]!, point),
});

/** The two ends of the part transform, copied from `app.tsx`'s `partTransforms`. */
const transforms = (parts: readonly Part[]) => {
  const localise: Localiser = (part, point, normal) => {
    const own = pointInPartFrame(parts[part]!, point);
    const turned = rotate(normal, conjugate(parts[part]!.orientation));
    return {
      centre: [own.x, own.y, own.z] as const,
      normal: [turned.x, turned.y, turned.z] as const,
    };
  };
  const place = (
    part: number,
    centre: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
  ): Placed | undefined => {
    const own = parts[part];
    if (own === undefined) return undefined;
    const turned = rotate(centre, own.orientation);
    const facing = rotate(normal, own.orientation);
    const length = Math.hypot(facing.x, facing.y, facing.z);
    return {
      centre: {
        x: turned.x + own.origin.x,
        y: turned.y + own.origin.y,
        z: turned.z + own.origin.z,
      },
      normal:
        length === 0
          ? { x: 0, y: 1, z: 0 }
          : {
              x: facing.x / length,
              y: facing.y / length,
              z: facing.z / length,
            },
    };
  };
  return { localise, place };
};

/** A field covering a four-unit pad either side of the default model's centre. */
const fieldOver = (): PaintField =>
  PaintField.over(0.05, [-6, -6, -6], [12, 12, 12], 6);

/**
 * What the shader will do, in JavaScript.
 *
 * **A transcription of `ModelMaterial.sampleField`, deliberately not shared with it.** The point
 * is to compare the shader's arithmetic against the rasteriser's, and a shared helper would
 * give the same answer on both sides — which is how two different answers ended up in one
 * codebase, agreeing with every test and disagreeing with the screen.
 */
const shaderRead = (
  field: PaintField,
  world: readonly [number, number, number],
): number[] | undefined => {
  const uvw = [0, 1, 2].map(
    (i) => (world[i]! - field.origin[i]!) / field.extent[i]!,
  );
  const inside = Math.max(Math.min(Math.min(...uvw), 1 - Math.max(...uvw)), 0);
  if (!(inside > 0)) return undefined;

  const gridFloat = uvw.map((v, i) => v * field.bricksPerAxis[i]!);
  const brick = gridFloat.map(Math.floor);
  const cellLocal = gridFloat.map((v, i) => v - brick[i]!);

  const at = ((brick[2]! * GRID_RES + brick[1]!) * GRID_RES + brick[0]!) * 4;
  const ind = [
    field.indirection[at]!,
    field.indirection[at + 1]!,
    field.indirection[at + 2]!,
    field.indirection[at + 3]!,
  ];
  if (ind[3]! < 128) return undefined;

  const texel = [0, 1, 2].map(
    (i) => ind[i]! * SLOT + Math.floor(cellLocal[i]! * BRICK) + 1,
  );
  const edge = field.poolDim;
  const off = ((texel[2]! * edge + texel[1]!) * edge + texel[0]!) * 4;
  return Array.from(field.pool.slice(off, off + 4));
};

describe("painting a real model", () => {
  it("puts a painting where the shader will find it", () => {
    // **The assertion that was missing while this feature showed nothing at all.**
    //
    // The shader turned a world position into a brick by multiplying its volume coordinate by
    // `GRID_RES`, on the reasoning that the indirection grid is 64 a side. It is — but that is
    // how many cells the grid *can* address, not how many bricks the volume *spans*, which for a
    // twelve-unit box is thirty. So it read brick 32 where the rasteriser had written brick 15,
    // every lookup found an unallocated cell, and every surface came back unpainted.
    //
    // The brush recorded, rasterised and uploaded the whole time. There was nothing wrong with any
    // of it except which brick was asked for, and no test compared the two.
    const parts = capsule();
    const hit = fieldHitAlong(
      surfaceFor(parts),
      { x: 0, y: 8, z: 0 },
      { x: 0, y: -1, z: 0 },
    )!;
    const bounds = modelBounds(parts)!;
    const pad = 4;
    const span = (lo: number, hi: number): number => hi - lo + pad * 2;
    const side = Math.max(
      span(bounds.min.x, bounds.max.x),
      span(bounds.min.y, bounds.max.y),
      span(bounds.min.z, bounds.max.z),
    );
    const field = PaintField.over(
      0.05,
      [bounds.min.x - pad, bounds.min.y - pad, bounds.min.z - pad],
      [side, side, side],
      12,
    );
    const journal = new PaintJournal();
    journal.append({
      centre: [hit.point.x, hit.point.y, hit.point.z],
      normal: [hit.normal.x, hit.normal.y, hit.normal.z],
      radius: 0.5,
      hardness: 1,
      colour: { r: 255, g: 0, b: 0, a: 255 },
      part: 0,
    });
    journal.endStroke();
    rasterise(journal, field, (_part, centre, normal) => ({ centre, normal }));

    const at: readonly [number, number, number] = [
      hit.point.x,
      hit.point.y,
      hit.point.z,
    ];
    const voxel = field.voxelAt(at[0], at[1], at[2]);
    const written = field.get(voxel[0], voxel[1], voxel[2]);
    const read = shaderRead(field, at);

    expect(written).toMatchObject({ r: 255, a: 255 });
    expect(read).not.toBeUndefined();
    expect(read).toMatchObject([255, 0, 0, 255]);
  });
  it("writes every dab inside the box the shader samples", () => {
    // **The one assertion that would have caught the unit bug.** Every other test in this file
    // agreed with every other about which unit the field's box was in, so a field built for a
    // twelve-unit model out of twelve *voxels* — six tenths of a unit — passed all of them while
    // the painting sat outside the volume the shader ever looks at.
    //
    // The fix was to make the field take world units, and this is what holds it there: a dab at
    // a real surface point, put through the same normalisation the shader does, must land
    // inside `0..1` on every axis.
    const parts = capsule();
    const hit = fieldHitAlong(
      surfaceFor(parts),
      { x: 0, y: 8, z: 0 },
      { x: 0, y: -1, z: 0 },
    )!;
    const bounds = modelBounds(parts)!;
    const pad = 4;
    const span = (lo: number, hi: number): number => hi - lo + pad * 2;
    const side = Math.max(
      span(bounds.min.x, bounds.max.x),
      span(bounds.min.y, bounds.max.y),
      span(bounds.min.z, bounds.max.z),
    );
    const field = PaintField.over(
      0.05,
      [bounds.min.x - pad, bounds.min.y - pad, bounds.min.z - pad],
      [side, side, side],
      12,
    );
    const journal = new PaintJournal();
    const { localise, place } = transforms(parts);
    journal.append({
      centre: localise(0, hit.point, hit.normal).centre,
      normal: localise(0, hit.point, hit.normal).normal,
      radius: 0.125,
      hardness: 1,
      colour: { r: 255, g: 0, b: 0, a: 255 },
      part: 0,
    });
    journal.endStroke();
    const painted = place(0, hit.point, hit.normal)!;

    for (const axis of [0, 1, 2] as const) {
      const key = (["x", "y", "z"] as const)[axis];
      const u = (painted.centre[key] - field.origin[axis]) / field.extent[axis];
      expect(u).toBeGreaterThan(0);
      expect(u).toBeLessThan(1);
    }
    // **And the field can address it**, which is the other half: the voxel index has to be
    // inside the grid, not merely inside the box.
    const voxel = field.voxelAt(
      painted.centre.x,
      painted.centre.y,
      painted.centre.z,
    );
    for (let axis = 0; axis < 3; axis++) {
      expect(voxel[axis]).toBeLessThan(field.voxels[axis]!);
    }
    expect(field.voxels[0]! * field.voxelSize).toBeGreaterThanOrEqual(side);
  });

  it("lands a stroke where the ray went", () => {
    const parts = capsule();
    const surface = surfaceFor(parts);
    const field = fieldOver();

    // **Straight down the axis at the middle of the capsule** — a point the ray cannot miss and
    // the answer is not in doubt. Straight down keeps the test about the path rather than about
    // which part of the model was aimed at.
    const hit = fieldHitAlong(
      surface,
      { x: 0, y: 8, z: 0 },
      { x: 0, y: -1, z: 0 },
    );
    expect(hit).toBeDefined();
    expect(hit!.part).toBe(0);

    // **On the surface, to within the epsilon the hit file promises.** This is the assertion
    // that the Newton refinement ran; without it the broad phase alone would put a dab up to
    // half a voxel off and every one of these numbers would still be nearly right.
    expect(
      Math.abs(
        surface.field.distance(hit!.point.x, hit!.point.y, hit!.point.z),
      ),
    ).toBeLessThanOrEqual(0.011);

    const journal = new PaintJournal();
    const { localise, place } = transforms(parts);
    const brush = new PaintBrush(
      journal,
      field,
      { radius: 0.4, hardness: 1, colour: { r: 255, g: 0, b: 0, a: 255 } },
      localise,
      place,
    );
    brush.moveTo(hit!);

    // **Paint is already there, before the finger lifts.** This is the assertion that says so:
    // `finish` used to be the only thing that wrote to the field, so a stroke was invisible for
    // its whole length and appeared in one go at the end.
    const duringVoxel = field.voxelAt(hit!.point.x, hit!.point.y, hit!.point.z);
    expect(
      field.get(duringVoxel[0], duringVoxel[1], duringVoxel[2]),
    ).toMatchObject({
      r: 255,
      a: 255,
    });

    const result = brush.finish();
    expect(result.dabs).toBe(1);
    expect(result.live).toBe(1);

    // **And the paint is where the hit was, in world units.** This is the only assertion that
    // says the four pieces agree with each other rather than each being right alone.
    const voxel = field.voxelAt(hit!.point.x, hit!.point.y, hit!.point.z);
    expect(field.get(voxel[0], voxel[1], voxel[2])).toMatchObject({
      r: 255,
      a: 255,
    });
  });

  it("takes paint with a part when it moves", () => {
    // **The property the whole part-local design exists for.** A dab stored in world space would
    // be left behind the instant its part moved.
    const parts = capsule();
    // **A real surface point, taken from a real hit.** The obvious choice of the part's own
    // origin is inside the capsule — a capsule's origin is the middle of its body — and a dab
    // there is more than a shell away from any surface, so nothing is painted at all and the
    // test passes for the wrong reason.
    const hit = fieldHitAlong(
      surfaceFor(parts),
      { x: 0, y: 8, z: 0 },
      { x: 0, y: -1, z: 0 },
    )!;
    const journal = new PaintJournal();
    const { localise } = transforms(parts);
    const local = localise(0, hit.point, hit.normal);
    journal.append({
      centre: local.centre,
      normal: local.normal,
      radius: 0.4,
      hardness: 1,
      colour: { r: 255, g: 0, b: 0, a: 255 },
      part: 0,
    });
    journal.endStroke();

    const moved: Part[] = [
      { ...parts[0]!, origin: { ...parts[0]!.origin, x: 3 } },
    ];
    const before = fieldOver();
    rasterise(journal, before, transforms(parts).place);
    const after = fieldOver();
    rasterise(journal, after, transforms(moved).place);

    // **Painted where the hit was, and again three units along.** Had the dab been stored in
    // world space the two fields would be identical; because it is stored part-local they differ,
    // and the difference is exactly the part's move.
    const here = before.voxelAt(hit.point.x, hit.point.y, hit.point.z);
    const there = after.voxelAt(hit.point.x + 3, hit.point.y, hit.point.z);
    expect(before.get(here[0], here[1], here[2]).a).toBe(255);
    expect(after.get(there[0], there[1], there[2]).a).toBe(255);
    // **And nothing is left behind**, which is the half of the claim that would be missed if
    // only the new position were checked.
    expect(after.get(here[0], here[1], here[2]).a).toBe(0);
  });

  it("loses nothing when a stroke is undone and redone", () => {
    // **The round trip the undo entry performs**, and the invariant M5's persistence rests on.
    const journal = new PaintJournal();
    for (let i = 0; i < 5; i++) {
      journal.append({
        centre: [i * 0.1, 0, 0],
        normal: [0, 1, 0],
        radius: 0.3,
        hardness: 1,
        colour: { r: 255, g: 0, b: 0, a: 255 },
        part: 0,
      });
    }
    journal.endStroke();
    const place = transforms(capsule()).place;
    const small = (): PaintField =>
      PaintField.over(0.05, [-2, -2, -2], [4, 4, 4], 4);

    const before = small();
    rasterise(journal, before, place);
    const wanted = Array.from(before.pool);

    const removed = journal.undoStroke()!;
    const emptied = small();
    rasterise(journal, emptied, place);
    expect(Array.from(emptied.pool)).not.toEqual(wanted);

    journal.redoStroke(removed);
    const after = small();
    rasterise(journal, after, place);
    expect(Array.from(after.pool)).toEqual(wanted);
  });

  it("takes the paint off when a stroke is undone", () => {
    // **The operation `app.tsx`'s `rasteriseJournal` performs**, which is a truncate *and a
    // clear* and then a replay. It is here rather than in `app.tsx` because the thing worth
    // asserting is the pair — the journal and the field — and that is what this file builds.
    //
    // **The clear is the half that was missing.** Compositing only ever adds, so replaying the
    // remaining dabs over a field that still holds the removed ones draws the rest on top of the
    // stroke that was supposed to be gone: the dab count falls and nothing on the model changes.
    // That is undo appearing to do nothing, which is the worst failure mode undo has.
    const journal = new PaintJournal();
    // **Part-local, and on the capsule's side.** `place` adds the part's origin, so `[0.7, 0, z]`
    // is the point on the surface at world `(0.7, 1.1, z)` — two strokes along it that overlap
    // at the ends, because a stroke next to a stroke is the case where a leak would show.
    for (const at of [0, 0.3]) {
      for (let i = 0; i < 4; i++) {
        journal.append({
          centre: [0.7, 0, at + i * 0.1],
          normal: [1, 0, 0],
          radius: 0.3,
          hardness: 1,
          colour: { r: 255, g: 0, b: 0, a: 255 },
          part: 0,
        });
      }
      journal.endStroke();
    }
    const place = transforms(capsule()).place;
    const field = PaintField.over(0.05, [-2, -2, -2], [4, 4, 4], 4);

    // **Both strokes down.**
    rasterise(journal, field, place);
    const painted = field.brickCount;
    expect(painted).toBeGreaterThan(0);

    // **The second one undone, and the field derived again from what is left.**
    const removed = journal.undoStroke()!;
    expect(removed.count).toBe(4);
    field.clearAll();
    rasterise(journal, field, place);

    // **Half the bricks and none of the removed stroke's colour anywhere.** The far end of the
    // stroke is four tenths of a unit from anything the first stroke touched, so a voxel that is
    // still red out there is a voxel nothing in the journal accounts for.
    expect(field.brickCount).toBeLessThan(painted);
    expect(field.brickCount).toBeGreaterThan(0);
    const [vx, vy, vz] = field.voxelAt(0.7, 1.1, 0.15);
    expect(field.get(vx, vy, vz).a).toBe(255);
    const [wx, wy, wz] = field.voxelAt(0.7, 1.1, 0.75);
    expect(field.get(wx, wy, wz).a).toBe(0);
  });

  it("leaves the paint on when the field is not cleared first", () => {
    // **The same thing with the clear left out, so the test above cannot pass by accident.**
    // If this ever starts failing the clear has become unnecessary, which would be worth
    // knowing; if the one above ever starts failing the clear has stopped happening.
    const journal = new PaintJournal();
    // **Part-local, and on the capsule's side.** `place` adds the part's origin, so `[0.7, 0, z]`
    // is the point on the surface at world `(0.7, 1.1, z)` — two strokes along it that overlap
    // at the ends, because a stroke next to a stroke is the case where a leak would show.
    for (const at of [0, 0.3]) {
      for (let i = 0; i < 4; i++) {
        journal.append({
          centre: [0.7, 0, at + i * 0.1],
          normal: [1, 0, 0],
          radius: 0.3,
          hardness: 1,
          colour: { r: 255, g: 0, b: 0, a: 255 },
          part: 0,
        });
      }
      journal.endStroke();
    }
    const place = transforms(capsule()).place;
    const field = PaintField.over(0.05, [-2, -2, -2], [4, 4, 4], 4);
    rasterise(journal, field, place);

    journal.undoStroke();
    rasterise(journal, field, place);
    const [wx, wy, wz] = field.voxelAt(0.7, 1.1, 0.75);
    // **Still red, and it should not be.** This is the bug the other test is a regression guard
    // for, written down so that the shape of it is not lost.
    expect(field.get(wx, wy, wz).a).toBe(255);
  });

  it("puts a cleared-and-replayed field back exactly as it was", () => {
    // **The property every one of these depends on**: clear, replay, and the bytes are the same
    // bytes. A field that is a pure function of the journal is what makes undo, "clear paint",
    // "the model moved" and reopening a file one operation rather than four.
    const journal = new PaintJournal();
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < 4; i++) {
        journal.append({
          centre: [0.7, 0, s * 0.4 + i * 0.1],
          normal: [1, 0, 0],
          radius: 0.25,
          hardness: s * 0.3,
          colour: { r: 24 * s, g: 255, b: 239, a: 255 },
          part: 0,
        });
      }
      journal.endStroke();
    }
    const place = transforms(capsule()).place;
    const field = PaintField.over(0.05, [-2, -2, -2], [4, 4, 4], 4);
    rasterise(journal, field, place);
    const wanted = Array.from(field.pool);

    for (let round = 0; round < 3; round++) {
      field.clearAll();
      rasterise(journal, field, place);
    }
    expect(Array.from(field.pool)).toEqual(wanted);
  });
});
