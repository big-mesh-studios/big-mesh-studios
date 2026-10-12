import { describe, expect, it } from "vitest";

import { BRICK, GRID_RES, PaintField, SLOT, type Texel } from "./paint-field";

/**
 * The world-space box every test field covers.
 *
 * **Fifty units, which is just inside what the indirection grid holds** — 64 bricks a side of
 * 8 voxels at 0.1 is 51.2 units, and a box past that is refused at construction. It is a
 * constant rather than a literal in each helper because it used to be 64, which the grid
 * cannot hold, and the refusal was found by twenty tests failing at once.
 */
const BOX: readonly [number, number, number] = [50, 50, 50];

/**
 * A field over {@link BOX} at 0.1 a voxel, which is 500 voxels across.
 *
 * **The box is bigger than any test needs on purpose**, so that a voxel index and a world
 * coordinate are far enough apart to catch a swap between them.
 *
 * **Four slots a side, not sixteen.** The pool is `tiles ** 3` slots of a thousand texels, so
 * the default is 16 MB and a suite that makes twenty fields makes 320 MB of it — which is
 * enough to take a test worker out on a phone. Four is still 64 slots, far more than any test
 * here allocates, and 256 KB each.
 */
const field = (): PaintField => PaintField.over(0.1, [0, 0, 0], BOX, 4);

const red: Texel = { r: 255, g: 0, b: 0, a: 255 };
const blue: Texel = { r: 0, g: 0, b: 255, a: 255 };

/**
 * A raw slot cell, addressed the way the texture will be.
 *
 * **Spelled out here rather than exposed as a method**, because the address is the layout
 * contract between M2 and M3 and a test that called an accessor would be testing the
 * accessor's idea of the layout instead of the layout. The formula is `offsetOf` written long.
 */
const slotCell = (
  f: PaintField,
  slot: number,
  lx: number,
  ly: number,
  lz: number,
): number[] => {
  const edge = f.tiles * SLOT;
  const x = (slot % f.tiles) * SLOT + lx;
  const y = (Math.floor(slot / f.tiles) % f.tiles) * SLOT + ly;
  const z = Math.floor(slot / (f.tiles * f.tiles)) * SLOT + lz;
  const at = ((z * edge + y) * edge + x) * 4;
  return Array.from(f.pool.slice(at, at + 4));
};

describe("a paint field", () => {
  it("allocates nothing until something is written", () => {
    const f = field();
    expect(f.brickCount).toBe(0);
    expect(f.get(100, 100, 100)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("stores and reads back a voxel", () => {
    const f = field();
    expect(f.set(10, 20, 30, red)).toBe(true);
    expect(f.get(10, 20, 30)).toEqual(red);
    expect(f.get(11, 20, 30)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("allocates exactly one brick for voxels inside it", () => {
    // **And not one per voxel.** This is the whole point of the structure: a stroke
    // thousands of voxels across should cost a handful of bricks.
    const f = field();
    f.set(0, 0, 0, red);
    expect(f.brickCount).toBe(1);
    for (let x = 0; x < BRICK; x++) f.set(x, 0, 0, red);
    expect(f.brickCount).toBe(1);
    f.set(BRICK, 0, 0, red);
    expect(f.brickCount).toBe(2);
  });

  it("does not allocate a neighbour brick for a voxel inside this one", () => {
    // **The border-duplicate convention, and the reason it was chosen over cross-brick
    // writes.** An edge voxel's value is copied into its own brick's gutter rather than into
    // the brick next door, so painting a full brick allocates exactly one brick and not a
    // shell around it. The alternative costs 3³ the allocations for the same result.
    const f = field();
    for (let x = 0; x < BRICK; x++) {
      for (let y = 0; y < BRICK; y++) {
        for (let z = 0; z < BRICK; z++) f.set(x, y, z, red);
      }
    }
    expect(f.brickCount).toBe(1);
  });

  it("copies an edge voxel into its own brick's border", () => {
    // **The reason every brick is stored as SLOT rather than BRICK.** Hardware trilinear reads
    // a voxel and its seven neighbours; at a brick's edge those neighbours are outside the
    // brick. Duplicating the edge voxel into the border means a sample near the edge finds
    // what it needs *inside* the brick, so a surface crossing a brick boundary has no
    // one-voxel transparent seam along it.
    const f = field();
    f.set(BRICK - 1, BRICK - 1, BRICK - 1, red);
    expect(f.brickCount).toBe(1);
    // The last interior cell, and its duplicate in the far border.
    expect(slotCell(f, 0, BRICK, BRICK, BRICK)).toEqual([255, 0, 0, 255]);
    expect(slotCell(f, 0, SLOT - 1, SLOT - 1, SLOT - 1)).toEqual([
      255, 0, 0, 255,
    ]);
  });

  it("copies a corner voxel into its own brick's low border too", () => {
    const f = field();
    f.set(0, 0, 0, blue);
    expect(slotCell(f, 0, 1, 1, 1)).toEqual([0, 0, 255, 255]);
    expect(slotCell(f, 0, 0, 0, 0)).toEqual([0, 0, 255, 255]);
  });

  it("keeps a brick's border out of its interior", () => {
    // **The same fact from the other side.** Two voxels at opposite ends of one brick must not
    // collide through the border that stands between them.
    const f = field();
    f.set(0, 0, 0, blue);
    f.set(BRICK - 1, BRICK - 1, BRICK - 1, red);
    expect(f.get(0, 0, 0)).toEqual(blue);
    expect(f.get(BRICK - 1, BRICK - 1, BRICK - 1)).toEqual(red);
  });

  it("leaves an unpainted voxel in a painted brick clear", () => {
    const f = field();
    f.set(0, 0, 0, red);
    expect(f.get(4, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("says nothing changed when the same colour is written twice", () => {
    // **This is what makes Tier-0 culling possible.** Repainting a colour over itself — the
    // exact thing that made `randoms-3d-paint`'s operation list grow forever — has to be
    // detectable, or the dab that did it cannot be culled.
    const f = field();
    expect(f.set(10, 10, 10, red)).toBe(true);
    expect(f.set(10, 10, 10, red)).toBe(false);
  });

  it("says something changed when a different colour is written", () => {
    const f = field();
    f.set(10, 10, 10, red);
    expect(f.set(10, 10, 10, blue)).toBe(true);
  });

  it("maps a world point to the voxel holding it", () => {
    const f = field();
    expect(f.voxelAt(0, 0, 0)).toEqual([0, 0, 0]);
    expect(f.voxelAt(0.05, 0.05, 0.05)).toEqual([0, 0, 0]);
    expect(f.voxelAt(0.15, 0, 0)).toEqual([1, 0, 0]);
    // **Negative, because a brush runs off the edge of a model all the time** and has to land
    // outside the box rather than wrap to the far side.
    expect(f.voxelAt(-0.05, 0, 0)).toEqual([-1, 0, 0]);
  });

  it("round-trips a voxel through its world centre", () => {
    const f = field();
    const world = f.worldAt(10, 20, 30);
    expect(f.voxelAt(...world)).toEqual([10, 20, 30]);
  });

  it("ignores writes outside the grid", () => {
    // **Rather than throwing.** A stroke past the edge of a large model should lose its
    // outermost voxels, not take the app down mid-drag.
    const f = field();
    expect(f.set(-100, 0, 0, red)).toBe(false);
    expect(f.get(-100, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("clears a region and leaves the rest alone", () => {
    // **The re-rasterise path.** Undoing a stroke clears what it touched and re-runs what was
    // there before, so a partial clear has to leave neighbouring paint untouched.
    const f = field();
    f.set(5, 5, 5, red);
    f.set(50, 50, 50, blue);
    f.clearRegion({ x0: 0, y0: 0, z0: 0, x1: 10, y1: 10, z1: 10 });
    expect(f.get(5, 5, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(f.get(50, 50, 50)).toEqual(blue);
  });

  it("clears everything and gives every brick back", () => {
    const f = field();
    for (let x = 0; x < 40; x++) f.set(x, 0, 0, red);
    expect(f.brickCount).toBeGreaterThan(1);
    f.clearAll();
    expect(f.brickCount).toBe(0);
    expect(f.get(5, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("reports the slots it touched, once each", () => {
    // **What a partial upload consumes.** Reporting a slot once per frame matters because a
    // stroke writes the same brick many times over, and re-uploading it for each write is the
    // bandwidth problem M1 exists to fix.
    const f = field();
    for (let x = 0; x < BRICK; x++) f.set(x, 0, 0, red);
    expect(f.takeDirty()).toHaveLength(1);
    expect(f.takeDirty()).toHaveLength(0);
  });

  it("gives the same slot back after a clear, so the pool does not leak", () => {
    // **The regression test for the pool.** A field that allocated a fresh slot on every
    // repaint would exhaust a 4096-slot pool after four thousand strokes and silently stop
    // painting near the end of a session.
    const f = field();
    f.set(5, 5, 5, red);
    f.clearAll();
    expect(f.brickCount).toBe(0);
    for (let round = 0; round < 100; round++) {
      f.set(5, 5, 5, red);
      expect(f.brickCount).toBe(1);
      f.clearAll();
      expect(f.brickCount).toBe(0);
    }
  });

  it("stores a slot's texels where the texture will expect them", () => {
    // **The CPU layout is the texture layout**, so M3 is a `DataTexture` and not a repack.
    // Voxel (0,0,0) of slot 0 is cell (1,1,1) and not cell (0,0,0) — the offset by one is the
    // border, and getting it wrong produces a field that looks right in every CPU test and
    // shifted by a voxel on screen.
    const f = field();
    f.set(0, 0, 0, red);
    expect(slotCell(f, 0, 1, 1, 1)).toEqual([255, 0, 0, 255]);
    // **A neighbour cell that was never written**, which is what catches an off-by-one in the
    // address. Cell (2,2,2) holds voxel (1,1,1), and that voxel has no paint.
    expect(slotCell(f, 0, 2, 2, 2)).toEqual([0, 0, 0, 0]);
  });

  it("keeps the border inside the slot", () => {
    // **A voxel on a brick's far corner writes as far as the slot's last cell.** An off-by-one
    // here writes past the slot and corrupts whichever brick is next, which is invisible until
    // it is very visible.
    expect(SLOT).toBe(BRICK + 2);
    const f = field();
    f.set(BRICK - 1, BRICK - 1, BRICK - 1, red);
    expect(slotCell(f, 0, SLOT - 1, SLOT - 1, SLOT - 1)).toEqual([
      255, 0, 0, 255,
    ]);
    // Nothing spilled into the next slot along.
    expect(slotCell(f, 1, 0, 0, 0)).toEqual([0, 0, 0, 0]);
  });

  it("drops a write once the pool is full, rather than throwing", () => {
    // **The limit is real and silent, and that is the right failure.** A figure too large for
    // its pool loses its outermost millimetre; it does not take the app down in the middle of
    // a drag. `set` saying `false` is what lets the rasteriser carry on with the rest.
    const f = PaintField.over(0.1, [0, 0, 0], BOX, 2);
    // **Two slots a side is eight bricks**, so the ninth distinct brick is the one that fails.
    let written = 0;
    for (let bx = 0; bx < 4 && written < 8; bx++) {
      for (let by = 0; by < 4 && written < 8; by++) {
        for (let bz = 0; bz < 4 && written < 8; bz++) {
          const x = bx * BRICK + BRICK * 4;
          const y = by * BRICK + BRICK * 4;
          const z = bz * BRICK + BRICK * 4;
          if (f.set(x, y, z, red)) written += 1;
        }
      }
    }
    expect(written).toBe(8);
    expect(f.brickCount).toBe(8);
    expect(f.set(4000, 0, 0, red)).toBe(false);
  });

  it("covers every point of its own box", () => {
    // **The bug that made the whole feature invisible, and the test that would have caught it.**
    //
    // `over` used to take its box in *voxels* while every caller had *world units* in hand —
    // `modelBounds` returns world units — so a field for a twelve-unit model was built twelve
    // voxels across, which at a fiftieth of a unit is six tenths of a unit. The brush recorded
    // dabs, rasterised them and uploaded the texture, and nothing appeared, because every dab
    // was written outside the box the shader samples. No unit test failed, because every unit
    // test agreed about the unit they were all using.
    //
    // So the assertion is not about voxels at all: it is that a point inside the box the caller
    // asked for maps to a voxel the field can actually address.
    const f = PaintField.over(0.05, [-6, -6, -6], [12, 12, 12], 6);
    const corners: ReadonlyArray<readonly [number, number, number]> = [
      [-6, -6, -6],
      [0, 0, 0],
      [5.99, 5.99, 5.99],
      [6 - 0.01, -3, 2],
    ];
    for (const point of corners) {
      const [x, y, z] = f.voxelAt(point[0], point[1], point[2]);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(z).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(f.voxels[0]);
      expect(y).toBeLessThan(f.voxels[1]);
      expect(z).toBeLessThan(f.voxels[2]);
      // **And the shader's own test**, which is `0 <= (p - origin) / extent <= 1`.
      for (const axis of [0, 1, 2] as const) {
        const u = (point[axis] - f.origin[axis]) / f.extent[axis];
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps its extent in world units", () => {
    // **The property the API now promises.** `extent` is what the shader divides by, and it is
    // what the caller passed in; `voxels` is the derived internal count.
    const f = PaintField.over(0.05, [0, 0, 0], [10, 10, 10], 4);
    expect(f.extent).toEqual([10, 10, 10]);
    expect(f.voxels).toEqual([200, 200, 200]);
  });

  it("agrees with the shader about which brick a voxel is in", () => {
    // **The bug that stopped the feature showing anything at all.** The shader turns a world
    // position into a brick by multiplying its volume coordinate by `GRID_RES`, on the reasoning
    // that the indirection grid is 64 a side. It is — but 64 is how many cells the grid *can*
    // address, not how many bricks this volume *spans*, which for a twelve-unit box is thirty.
    // So the shader read brick 32 where the CPU had written brick 15, every lookup found an
    // unallocated cell, and every surface came back unpainted.
    //
    // The brush was recording, rasterising and uploading throughout. There was nothing wrong
    // with any of it except which brick was asked for.
    const f = PaintField.over(0.05, [-6, -6, -6], [12, 12, 12], 12);
    const bricks = f.bricksPerAxis;
    expect(bricks[0]).toBeCloseTo(30, 6);

    for (const point of [
      [0, 0, 0],
      [0, 2.9, 0],
      [-0.7, 1.1, 0.7],
      [5.9, 5.9, -5.9],
      [-5.9, 5.9, 0.1],
    ] as const) {
      const world = point as readonly [number, number, number];
      const voxel = f.voxelAt(world[0], world[1], world[2]);
      // **What the CPU indexes by.**
      const cpuBrick = [
        Math.floor(voxel[0] / BRICK),
        Math.floor(voxel[1] / BRICK),
        Math.floor(voxel[2] / BRICK),
      ];
      // **What the shader asks for.**
      const shaderBrick = [0, 1, 2].map((axis) => {
        const u = (world[axis]! - f.origin[axis]!) / f.extent[axis]!;
        return Math.floor(u * bricks[axis]!);
      });
      expect(shaderBrick).toEqual(cpuBrick);
    }
  });

  it("keeps a brick address inside the grid's reach", () => {
    // **The invariant that makes `GRID_RES` a ceiling rather than a coordinate.** The largest
    // box `over` accepts spans exactly `GRID_RES` bricks a side, so a correctly computed brick is
    // always addressable — and if it were ever not, the failure would be an alias onto a brick at
    // the origin rather than a miss.
    for (const side of [4, 12, 25.6]) {
      const f = PaintField.over(0.05, [0, 0, 0], [side, side, side], 12);
      const voxel = f.voxelAt(side - 0.01, side - 0.01, side - 0.01);
      const brick = Math.floor(voxel[0] / BRICK);
      expect(brick).toBeLessThan(GRID_RES);
      expect(f.bricksPerAxis[0]).toBeLessThanOrEqual(GRID_RES);
    }
  });

  it("refuses a box its indirection grid cannot cover", () => {
    // **Which is a different failure from running out of pool, and worth failing on.** Too
    // few slots loses the outermost millimetre; too small a grid would alias every brick past
    // its edge onto the ones at the start, which is paint appearing on the wrong side of the
    // model and is not something to discover by looking at a render.
    const reach = GRID_RES * BRICK * 0.1;
    expect(() =>
      PaintField.over(0.1, [0, 0, 0], [reach + 0.1, 1, 1], 4),
    ).toThrow(RangeError);
    expect(() =>
      PaintField.over(0.1, [0, 0, 0], [reach, reach, reach], 4),
    ).not.toThrow();
  });

  it("refuses a pool it could not address", () => {
    // **A slot's coordinates go in one byte each**, so a wider pool could not be named by the
    // indirection entry pointing at it. Failing at construction is much better than silently
    // wrapping a slot index at 256.
    expect(() => PaintField.over(0.1, [0, 0, 0], [1, 1, 1], 257)).toThrow(
      RangeError,
    );
    expect(() => PaintField.over(0.1, [0, 0, 0], [1, 1, 1], 0)).toThrow(
      RangeError,
    );
  });
});
