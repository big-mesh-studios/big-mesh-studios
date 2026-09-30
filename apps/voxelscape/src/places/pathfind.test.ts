// @vitest-environment node
import { describe, expect, it } from "vitest";
import { findVoxelPath } from "./pathfind";

const flat = (): ((x: number, z: number) => number) => () => 0;
const nowhereSolid = (): ((x: number, y: number, z: number) => boolean) => () =>
  false;

/** The cell a world-unit waypoint sits in. */
const cell = (point: [number, number, number]): [number, number] => [
  Math.floor(point[0] / 2),
  Math.floor(point[2] / 2),
];

describe("findVoxelPath", () => {
  it("returns cell-centre waypoints from the start to the goal on flat ground", () => {
    const path = findVoxelPath([1, 0, 1], [9, 0, 9], flat(), nowhereSolid());
    expect(path).not.toBeNull();
    expect(path).toHaveLength(9);
    expect(cell(path![0])).toEqual([0, 0]);
    expect(cell(path![path!.length - 1])).toEqual([4, 4]);
  });

  it("returns a single waypoint when start and goal share a cell", () => {
    const path = findVoxelPath(
      [1, 0, 1],
      [1.5, 0, 1.5],
      flat(),
      nowhereSolid(),
    );
    expect(path).toHaveLength(1);
  });

  it("routes around a finite wall", () => {
    const wall = (x: number, _y: number, z: number): boolean => {
      const cx = Math.floor(x / 2);
      const cz = Math.floor(z / 2);
      return cx === 2 && cz >= -2 && cz <= 2;
    };
    const path = findVoxelPath([1, 0, 1], [9, 0, 1], flat(), wall);
    expect(path).not.toBeNull();
    for (const point of path!) {
      const [cx, cz] = cell(point);
      expect(cx === 2 && cz >= -2 && cz <= 2).toBe(false);
    }
  });

  it("refuses route a wall with no way around", () => {
    const wall = (x: number, _y: number, _z: number): boolean =>
      Math.floor(x / 2) === 2;
    expect(findVoxelPath([1, 0, 1], [9, 0, 1], flat(), wall)).toBeNull();
  });

  it("refuses a route past the cell bound", () => {
    expect(
      findVoxelPath([1, 0, 1], [101, 0, 1], flat(), nowhereSolid(), {
        maxCells: 4,
      }),
    ).toBeNull();
  });
});
