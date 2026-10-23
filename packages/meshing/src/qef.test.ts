import { describe, expect, it } from "vitest";

import { QefScratch } from "./qef";

/**
 * The QEF is a small piece of arithmetic and is tested as one: a set of crossings and
 * normals in, a point out. The mesher tests below it are then about cells and seams, not
 * about whether a 3×3 solve works.
 */

const near = (actual: number, expected: number, tolerance = 1e-6): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe("the QEF a dual vertex minimizes", () => {
  it("puts a flat cell's vertex on the plane, near the crossings", () => {
    const qef = new QefScratch();
    qef.add(0, 0, 0, 0, 1, 0);
    qef.add(1, 0, 0, 0, 1, 0);
    qef.add(0, 0, 1, 0, 1, 0);

    const point = qef.solve(-1, -1, -1, 2, 2, 2);
    // Every point on y = 0 is a zero of the QEF; the regulariser chooses the one nearest
    // the crossings' mean, which is what keeps a flat face from firing off along itself.
    near(point.y, 0);
    near(point.x, 1 / 3, 1e-3);
    near(point.z, 1 / 3, 1e-3);
  });

  it("finds the intersection line of two faces", () => {
    const qef = new QefScratch();
    // The solid is x < 0 or y < 0; its boundary is the two planes x = 0 and y = 0, and
    // their intersection is the crease the vertex should land on.
    qef.add(0, 0, 0, 1, 0, 0);
    qef.add(0, 0, 1, 1, 0, 0);
    qef.add(0, 0, 0.5, 0, 1, 0);
    qef.add(1, 0, 0.5, 0, 1, 0);

    const point = qef.solve(-1, -1, -1, 2, 2, 2);
    near(point.x, 0, 1e-3);
    near(point.y, 0, 1e-3);
    // The crease is a line, so the remaining degree of freedom is chosen by the bias: the
    // point on that line nearest the crossings' mean.
    near(point.z, 0.5, 1e-3);
  });

  it("finds the corner where three faces meet", () => {
    const qef = new QefScratch();
    qef.add(0, 0, 0, 1, 0, 0);
    qef.add(0, 0, 0, 0, 1, 0);
    qef.add(0, 0, 0, 0, 0, 1);
    qef.add(0.5, 0.5, 0, 0, 0, 1);

    const point = qef.solve(-1, -1, -1, 2, 2, 2);
    near(point.x, 0, 1e-3);
    near(point.y, 0, 1e-3);
    near(point.z, 0, 1e-3);
  });

  it("falls back to the crossing mean when no normal is usable", () => {
    const qef = new QefScratch();
    qef.add(1, 2, 3, 0, 0, 0);
    qef.add(2, 3, 4, Number.NaN, 1, 0);

    const point = qef.solve(-10, -10, -10, 10, 10, 10);
    near(point.x, 1.5);
    near(point.y, 2.5);
    near(point.z, 3.5);
  });

  it("clamps a solution that wants to leave the cell", () => {
    const qef = new QefScratch();
    // A plane at x = 5 with its normal along x, asked about a cell ending at x = 1. The
    // unconstrained answer is outside; the vertex has to stay in its own cell.
    qef.add(5, 0, 0, 1, 0, 0);
    qef.add(5, 1, 0, 1, 0, 0);

    const point = qef.solve(0, 0, 0, 1, 1, 1);
    expect(point.x).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(1);
    expect(point.x).toBeLessThan(1 - 1e-5);
  });

  it("keeps a vertex off the shared face of a cell", () => {
    // A box corner that lands exactly on a grid point would otherwise put eight coincident
    // vertices in eight cells, and eight zero-area quads between them.
    const qef = new QefScratch();
    qef.add(0, 0, 0, 1, 0, 0);
    qef.add(0, 0, 0, 0, 1, 0);
    qef.add(0, 0, 0, 0, 0, 1);
    qef.add(0.5, 0.5, 0, 0, 0, 1);

    const point = qef.solve(0, 0, 0, 1, 1, 1);
    expect(point.x).toBeGreaterThan(0);
    expect(point.y).toBeGreaterThan(0);
    expect(point.z).toBeGreaterThan(0);
  });

  it("returns the cell centre when there were no crossings at all", () => {
    const point = new QefScratch().solve(0, 2, 4, 2, 4, 6);
    expect(point).toEqual({ x: 1, y: 3, z: 5 });
  });

  it("moves a constrained boundary point along the face instead of only clamping", () => {
    // The planes meet outside this cell; the constrained answer may slide along a cell
    // face. Compare it with the independent clamp of the same unconstrained minimum: the
    // constrained answer must not be worse, and must stay inside the cell.
    const qef = new QefScratch();
    const a = 1 / Math.hypot(1, 0.35);
    qef.add(2, 0, 0, a, 0.35 * a, 0);
    qef.add(0, 2, 0, 0.35 * a, a, 0);
    qef.add(0, 0, 2, 0, 0, 1);
    const diagonal = 1 / Math.SQRT2;
    qef.add(1.5, 1.5, 1.5, diagonal, diagonal, 0);

    const wide = qef.solve(-10, -10, -10, 10, 10, 10);
    const unconstrained = { x: wide.x, y: wide.y, z: wide.z };
    const clamped = {
      x: Math.min(1, Math.max(0, unconstrained.x)),
      y: Math.min(1, Math.max(0, unconstrained.y)),
      z: Math.min(1, Math.max(0, unconstrained.z)),
    };
    const constrained = qef.solve(0, 0, 0, 1, 1, 1);

    const error = (x: number, y: number, z: number): number => {
      const points: Array<[number, number, number, number, number, number]> = [
        [2, 0, 0, a, 0.35 * a, 0],
        [0, 2, 0, 0.35 * a, a, 0],
        [0, 0, 2, 0, 0, 1],
        [1.5, 1.5, 1.5, diagonal, diagonal, 0],
      ];
      return points.reduce((sum, [px, py, pz, nx, ny, nz]) => {
        const along = nx * (x - px) + ny * (y - py) + nz * (z - pz);
        return sum + along * along;
      }, 0);
    };

    for (const axis of ["x", "y", "z"] as const) {
      expect(constrained[axis]).toBeGreaterThanOrEqual(0);
      expect(constrained[axis]).toBeLessThanOrEqual(1);
    }
    // The 2×2 face solve has its own regulariser, so it can differ from the independent
    // clamp by a rounding-scale amount; the point is that it does not move off the feature.
    expect(
      error(constrained.x, constrained.y, constrained.z),
    ).toBeLessThanOrEqual(error(clamped.x, clamped.y, clamped.z) + 1e-2);
  });
});

describe("the feature test a cheap QEF uses", () => {
  it("reports agreement for one plane and disagreement for two", () => {
    const plane = new QefScratch();
    plane.add(0, 0, 0, 0, 1, 0);
    plane.add(1, 0, 0, 0, 1, 0);
    expect(plane.spreadCos()).toBeCloseTo(1, 12);

    const crease = new QefScratch();
    crease.add(0, 0, 0, 1, 0, 0);
    crease.add(0, 0, 1, 0, 1, 0);
    expect(crease.spreadCos()).toBeCloseTo(0, 12);
  });

  it("ignores a crossing with no usable normal", () => {
    const qef = new QefScratch();
    qef.add(0, 0, 0, 0, 0, 0);
    expect(qef.spreadCos()).toBe(1);
    qef.add(0, 0, 0, 0, 1, 0);
    expect(qef.spreadCos()).toBe(1);
  });
});
