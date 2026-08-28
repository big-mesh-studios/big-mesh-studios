// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SUPERCHUNK_SPAN, superchunkCellOf } from "./triangle-renderer";
import { BLOCK_WORLD, type Dim3 } from "../world/level-data";

/** The world-space centre of the block at a chunk cell. */
const blockCenter = (x: number, y: number, z: number): Dim3 => [
  x * BLOCK_WORLD[0],
  y * BLOCK_WORLD[1],
  z * BLOCK_WORLD[2],
];

const groupOf = (x: number, y: number, z: number): string =>
  superchunkCellOf(blockCenter(x, y, z)).join(",");

describe("superchunkCellOf", () => {
  it("puts every block of one 2x2x2 group of cells in the same superchunk", () => {
    const groups = new Set<string>();
    for (let x = 0; x < SUPERCHUNK_SPAN; x++) {
      for (let y = 0; y < SUPERCHUNK_SPAN; y++) {
        for (let z = 0; z < SUPERCHUNK_SPAN; z++) {
          groups.add(groupOf(x, y, z));
        }
      }
    }

    expect([...groups]).toEqual(["0,0,0"]);
  });

  it("puts the cell across a boundary in the next superchunk", () => {
    expect(groupOf(SUPERCHUNK_SPAN - 1, 0, 0)).toBe("0,0,0");
    expect(groupOf(SUPERCHUNK_SPAN, 0, 0)).toBe("1,0,0");
  });

  it("groups cells below the origin the same width as those above it", () => {
    // Blocks stack downward now, so negative cells are reached in ordinary
    // play. Rounding toward zero would put -1 and 0 in one group and leave a
    // group of four cells straddling the origin.
    expect(groupOf(0, -1, 0)).toBe(groupOf(0, -2, 0));
    expect(groupOf(0, -1, 0)).not.toBe(groupOf(0, 0, 0));
    expect(groupOf(0, -3, 0)).not.toBe(groupOf(0, -2, 0));
  });

  it("gives every superchunk exactly as many cells below the origin as above", () => {
    const counts = new Map<string, number>();
    for (let y = -8; y < 8; y++) {
      const key = groupOf(0, y, 0);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    expect([...counts.values()]).toEqual(
      new Array(counts.size).fill(SUPERCHUNK_SPAN),
    );
  });

  it("separates the three axes", () => {
    expect(groupOf(SUPERCHUNK_SPAN, 0, 0)).toBe("1,0,0");
    expect(groupOf(0, SUPERCHUNK_SPAN, 0)).toBe("0,1,0");
    expect(groupOf(0, 0, SUPERCHUNK_SPAN)).toBe("0,0,1");
  });
});
