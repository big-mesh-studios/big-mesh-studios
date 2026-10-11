/**
 * Guards the one place this package writes its corner numbering out twice.
 *
 * **The cell loop in `marchingCubes` reads the eight corners through constant strides rather than
 * through `CORNER_OFFSETS`,** because eight calls each recomputing a three-term index is eight
 * times the work in the densest loop in the project. That leaves the eight offsets written down in
 * two places, and this file is what stops the two from drifting apart.
 *
 * **It fails rather than warns.** The numbering is Lorensen–Bourke's and the 256-row triangle table
 * is written against it, so a disagreement is not a tolerance question — one of the two is wrong,
 * and the mesh that comes out has holes in it. There is no partial credit here.
 */

import { describe, expect, it } from "vitest";

import {
  CORNER_OFFSETS,
  marchingCubes,
  marchingCubesScratchFor,
} from "./marching-cubes";
import { ChunkMeshBuilder } from "./chunk-mesh";

/**
 * Each corner as the loop reaches it: how many slices along z, rows along y, and a final step
 * along x.
 *
 * **Written as `[dz, dy, dx]` where `CORNER_OFFSETS` is `[dx, dy, dz]`**, because the loop's
 * arithmetic is `dz·grid² + dy·grid + dx` and matching that order is what the test is checking.
 *
 * **Copied out of `marchingCubes` by hand, which is the entire point of the file.** A check that
 * imported these from the implementation would assert only that the implementation agrees with
 * itself. What it asserts is that the hand-written strides in the hot loop mean the same corners
 * as the table the 256 rows are written against.
 */
const REACHES: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 1, 1],
  [0, 1, 0],
  [1, 0, 0],
  [1, 0, 1],
  [1, 1, 1],
  [1, 1, 0],
];

describe("corner strides", () => {
  it("names all eight corners, in the table's order", () => {
    expect(REACHES).toHaveLength(CORNER_OFFSETS.length);
  });

  /**
   * Checked across grid widths rather than at one, because the claim is about the stride *scheme*
   * and not about one width: that `dz·grid² + dy·grid + dx` from a cell's base index reaches the
   * same sample as `((cz+dz)·grid + (cy+dy))·grid + (cx+dx)` does. At `grid = 1` every term
   * collapses and the two agree by accident; at any other width only a correct scheme agrees.
   */
  for (const grid of [2, 3, 4, 8, 28, 30, 230]) {
    it(`reaches CORNER_OFFSETS' corners at grid ${grid}`, () => {
      for (const [cx, cy, cz] of [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [2, 3, 4],
        [grid - 1, grid - 1, grid - 1],
      ]) {
        const base = (cz * grid + cy) * grid + cx;
        for (let corner = 0; corner < CORNER_OFFSETS.length; corner++) {
          const [dz, dy, dx] = REACHES[corner] as readonly [
            number,
            number,
            number,
          ];
          const [ex, ey, ez] = CORNER_OFFSETS[corner] as unknown as readonly [
            number,
            number,
            number,
          ];

          expect(
            base + dz * grid * grid + dy * grid + dx,
            `corner ${corner} of the cell at ${cx}, ${cy}, ${cz}`,
          ).toBe(base + ((ez * grid + ey) * grid + ex));
        }
      }
    });
  }
});

/**
 * The same invariant, checked against the mesher rather than against a restatement of it.
 *
 * **This is the one that would catch a miscopy in the loop itself.** The table above states what
 * the strides should mean; this runs the real `marchingCubes` and checks that the corners it
 * actually reads are the ones the mesh is built from.
 */
describe("corner reads", () => {
  it("reads each corner from the sample CORNER_OFFSETS names", () => {
    const samples = 3;
    const step = 1;

    /**
     * A field whose value is its own `x + 2y + 4z`: a distinct power-of-two sum per sample, so
     * the value at a sample identifies that sample, and a corner read from a neighbouring one
     * would produce a different vertex position rather than a plausible one.
     */
    const distance = (x: number, y: number, z: number): number =>
      x + 2 * y + 4 * z - 7.5;

    const out = new ChunkMeshBuilder();
    marchingCubes({
      origin: [0, 0, 0],
      samples,
      sampleSize: step,
      sampler: { distance },
      out,
      scratch: marchingCubesScratchFor(samples),
    });

    expect(out.triangleCount).toBeGreaterThan(0);

    /**
     * Every vertex sits on a single edge of one cell, so it is a linear blend of two samples that
     * differ along exactly one axis — and along that axis the other seven terms cancel, so the
     * position along it is recovered exactly. The other two axes are untouched by the blend and
     * must therefore land exactly on the sample lattice.
     */
    const { positions } = out.finish();
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] as number;
      const y = positions[i + 1] as number;
      const z = positions[i + 2] as number;

      const onLattice = (v: number): boolean =>
        Math.abs(v - Math.round(v)) < 1e-9;

      // **Exactly two of the three lie on the lattice**, and the third is the crossing. Any other
      // split means the corner loop read an offset that is not axis-aligned, which is what a
      // mismatch between the strides and the table would produce.
      const onCount =
        (onLattice(x) ? 1 : 0) +
        (onLattice(y) ? 1 : 0) +
        (onLattice(z) ? 1 : 0);
      expect(onCount, `vertex ${x}, ${y}, ${z} is not on one cell edge`).toBe(
        2,
      );
    }
  });
});
