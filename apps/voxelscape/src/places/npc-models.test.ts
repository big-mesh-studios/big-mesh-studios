// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import { solveVoxels } from "@big-mesh-studios/stacker/renderer";

const model = async (file: string) => {
  const url = new URL(`../../public/models/${file}`, import.meta.url);
  const bytes = readFileSync(fileURLToPath(url));
  // jszip reads a `Blob` through the browser's FileReader, which Node's test
  // environment does not provide, so the bytes cross as an array buffer.
  return loadFigure(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as unknown as Blob,
  );
};

const painted = (
  part: { sides: Record<string, { data: Uint8Array }> },
  side: string,
): number => {
  const data = part.sides[side as keyof typeof part.sides].data;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0) {
      count++;
    }
  }
  return count;
};

interface Solved {
  volume: Uint8Array;
  width: number;
  height: number;
  depth: number;
}

const solved = (part: {
  sides: Record<string, { width: number; height: number; data: Uint8Array }>;
}): Solved => {
  const front = part.sides.front;
  const left = part.sides.left;
  const width = front.width;
  const height = front.height;
  const depth = left.width;
  return {
    width,
    height,
    depth,
    volume: solveVoxels({ width, height, depth }, part.sides as never),
  };
};

/** Whether the voxel at (x, y, z) of a solved volume survived the carve. */
const solidAt = (s: Solved, x: number, y: number, z: number): boolean => {
  const o = (z * s.width * s.height + y * s.width + x) * 4;
  return (s.volume[o + 3] & 0xc0) === 0xc0;
};

const solidCount = (s: Solved): number => {
  let count = 0;
  for (let i = 3; i < s.volume.length; i += 4) {
    if ((s.volume[i] & 0xc0) === 0xc0) {
      count++;
    }
  }
  return count;
};

describe("the bundled NPC models", () => {
  it.each(["npc-sable.zip", "npc-rook.zip"])(
    "%s loads as a one-part figure with a painted front",
    async (file) => {
      const figure = await model(file);
      expect(figure.migrated).toBe(true);
      expect(figure.parts).toHaveLength(1);
      expect(figure.palette.length).toBeGreaterThanOrEqual(3);

      const part = figure.parts[0];
      expect(part.name).toBe("body");
      expect(painted(part, "front")).toBeGreaterThan(150);
      expect(painted(part, "top")).toBeGreaterThan(50);
    },
  );

  it.each(["npc-sable.zip", "npc-rook.zip"])(
    "%s carves into a solid, standing figure",
    async (file) => {
      const part = (await model(file)).parts[0];
      const solid = solved(part);
      // A body that fills the ground rows and a head that stands high on it.
      expect(solidAt(solid, 11, 2, 12)).toBe(true);
      expect(solidAt(solid, 11, 17, 12)).toBe(true);
      expect(solidCount(solid)).toBeGreaterThan(800);
      // The margins the face images left empty stay carved away.
      expect(solidAt(solid, 0, 0, 0)).toBe(false);
    },
  );
});
