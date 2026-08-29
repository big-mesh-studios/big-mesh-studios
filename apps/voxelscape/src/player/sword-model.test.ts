// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Bitmap } from "@big-mesh-studios/maths";
import {
  buildSwordModel,
  sampleSpriteRegion,
  type SpritePixels,
} from "./sword-model";

/** A sprite whose drawn pixels form a circle, so its corners stay empty. */
const circleSprite = (size: number, radius: number): SpritePixels => {
  const data = new Uint8Array(size * size * 4);
  const centre = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      if (dx * dx + dy * dy <= radius * radius) {
        const t = (y * size + x) << 2;
        data[t] = 200;
        data[t + 1] = 120;
        data[t + 2] = 60;
        data[t + 3] = 255;
      }
    }
  }
  return { width: size, height: size, data };
};

/** Whether the cell holds a drawn sword colour, not the black outline. */
const drawn = (front: Bitmap, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < 24 && y < 24 && front.data[y * 24 + x] >= 1;

describe("buildSwordModel", () => {
  const model = buildSwordModel(circleSprite(96, 40));
  const { front, back, left, right, top, bottom } = model.sides;

  it("builds a 24×24×24 box", () => {
    expect(model.dimensions).toEqual({ width: 24, height: 24, depth: 24 });
    expect(front.width).toBe(24);
    expect(front.height).toBe(24);
  });

  it("puts black first in the palette", () => {
    expect(model.palette[0]).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    expect(model.palette.length).toBeLessThanOrEqual(32);
  });

  it("keeps the circle's empty corners, outlines its silhouette", () => {
    const hasEmpty = front.data.some((index) => index === Bitmap.EMPTY);
    expect(hasEmpty).toBe(true);
    const outlineCells: { x: number; y: number }[] = [];
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        if (front.data[y * 24 + x] === 0) {
          outlineCells.push({ x, y });
        }
      }
    }
    expect(outlineCells.length).toBeGreaterThan(0);
    for (const { x, y } of outlineCells) {
      // The outline must sit directly against the sword's drawn colours, not
      // against cells the outline itself painted, or it would spread outward.
      const nextToDrawn =
        drawn(front, x - 1, y) ||
        drawn(front, x + 1, y) ||
        drawn(front, x, y - 1) ||
        drawn(front, x, y + 1) ||
        drawn(front, x - 1, y - 1) ||
        drawn(front, x + 1, y - 1) ||
        drawn(front, x - 1, y + 1) ||
        drawn(front, x + 1, y + 1);
      expect(nextToDrawn).toBe(true);
    }
  });

  it("draws some solid sword cells in a drawn colour", () => {
    expect(
      front.data.some((index) => index !== Bitmap.EMPTY && index !== 0),
    ).toBe(true);
  });

  it("mirrors the front to the back", () => {
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        expect(back.data[y * 24 + (23 - x)]).toBe(front.data[y * 24 + x]);
      }
    }
  });

  it("draws each edge face as a single black line", () => {
    const lineAt = (bitmap: Bitmap, column: number): void => {
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          expect(bitmap.data[y * 24 + x]).toBe(x === column ? 0 : Bitmap.EMPTY);
        }
      }
    };
    lineAt(left, 12);
    lineAt(right, 11);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        expect(top.data[y * 24 + x]).toBe(y === 12 ? 0 : Bitmap.EMPTY);
        expect(bottom.data[y * 24 + x]).toBe(y === 11 ? 0 : Bitmap.EMPTY);
      }
    }
  });

  it("builds a sprite with no drawn pixels as an empty model", () => {
    const empty = buildSwordModel({
      width: 8,
      height: 8,
      data: new Uint8Array(8 * 8 * 4),
    });
    expect(
      empty.sides.front.data.every((index) => index === Bitmap.EMPTY),
    ).toBe(true);
  });
});

describe("sampleSpriteRegion", () => {
  it("reads an indexed region through the palette", () => {
    const png = {
      width: 2,
      channels: 1,
      data: new Uint8Array([0, 1, 0, 0]),
      palette: [
        [0, 0, 0, 0],
        [10, 20, 30, 255],
      ],
    };
    const out = sampleSpriteRegion(png, png.palette, {
      x: 1,
      y: 0,
      w: 1,
      h: 1,
    });
    expect([...out.data]).toEqual([10, 20, 30, 255]);
  });
});
