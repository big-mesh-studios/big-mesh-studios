// @vitest-environment jsdom
import { Bitmap } from "@big-mesh-studios/maths";
import { encode } from "fast-png";
import { describe, expect, it } from "vitest";
import { decodeSidePng, encodeSidePng } from "./side-image";

describe("encodeSidePng and decodeSidePng", () => {
  it("reads back the bitmap it was given", () => {
    const bitmap = Bitmap.create(3, 2);
    bitmap.data.set([0, 1, 2, 3, 4, 5]);

    const decoded = decodeSidePng(encodeSidePng(bitmap));

    expect(decoded.width).toBe(3);
    expect(decoded.height).toBe(2);
    expect(Array.from(decoded.data)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("refuses a png holding more than eight bits a sample", () => {
    const sixteenBit = encode({
      width: 1,
      height: 1,
      data: new Uint16Array([1000]),
      channels: 1,
      depth: 16,
    });

    expect(() => decodeSidePng(sixteenBit)).toThrow(/eight/);
  });
});
