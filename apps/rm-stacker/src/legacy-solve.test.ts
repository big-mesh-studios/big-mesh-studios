/**
 * Times the CPU solve the port deleted, on the same fixture the GPU benchmark
 * draws, so the cost an edit used to pay can be put beside the cost a frame
 * pays. Benchmark scaffolding, not part of the app.
 */

import { expect, test } from "vitest";
import { solveVoxels } from "./legacy-voxel-solver";
import { Bitmap, Dimensions3D } from "./maths";
import type { SideKind, Sides } from "./types";

const COLOUR = 5;

const panel = (width: number, height: number): Bitmap => {
  const bitmap = Bitmap.create(width, height);
  bitmap.data.fill(COLOUR);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x + y) % 7 === 0) bitmap.data[y * width + x] = Bitmap.EMPTY;
    }
  }
  return bitmap;
};

const mirrorEmptiness = (sides: Sides, { width, height, depth }: Dimensions3D) => {
  const pairs: Array<[SideKind, SideKind, (x: number, y: number) => [number, number]]> = [
    ["front", "back", (x, y) => [width - 1 - x, y]],
    ["left", "right", (x, y) => [depth - 1 - x, y]],
    ["top", "bottom", (x, y) => [x, depth - 1 - y]],
  ];
  for (const [near, far, map] of pairs) {
    const a = sides[near];
    const b = sides[far];
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        const [fx, fy] = map(x, y);
        if (a.data[y * a.width + x] === Bitmap.EMPTY || b.data[fy * b.width + fx] === Bitmap.EMPTY) {
          a.data[y * a.width + x] = Bitmap.EMPTY;
          b.data[fy * b.width + fx] = Bitmap.EMPTY;
        }
      }
    }
  }
};

const makeSides = (dimensions: Dimensions3D): Sides => {
  const { width, height, depth } = dimensions;
  const sides: Sides = {
    front: panel(width, height),
    back: panel(width, height),
    left: panel(depth, height),
    right: panel(depth, height),
    top: panel(width, depth),
    bottom: panel(width, depth),
  };
  mirrorEmptiness(sides, dimensions);
  return sides;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
};

test("legacy CPU solve cost per edit", () => {
  const rows: string[] = [];
  for (const size of [15, 32, 64]) {
    const dimensions = { width: size, height: size, depth: size };
    const sides = makeSides(dimensions);
    const out = new Uint8Array(size * size * size * 4);

    // The signal held one array and the solve allocated a fresh one each time,
    // so both are timed: reusing the buffer is the floor, allocating is what
    // the app actually did.
    for (let i = 0; i < 20; i++) solveVoxels(dimensions, sides, out);

    const reused: number[] = [];
    const allocated: number[] = [];
    for (let i = 0; i < 40; i++) {
      const a = performance.now();
      solveVoxels(dimensions, sides, out);
      const b = performance.now();
      solveVoxels(dimensions, sides);
      const c = performance.now();
      reused.push(b - a);
      allocated.push(c - b);
    }
    const bytes = size * size * size * 4;
    rows.push(
      `${size}³: reused ${median(reused).toFixed(3)} ms, allocated ${median(allocated).toFixed(
        3,
      )} ms, upload ${(bytes / 1024).toFixed(0)} KiB`,
    );
  }
  console.log(rows.join("\n"));
  expect(rows.length).toBe(3);
});
