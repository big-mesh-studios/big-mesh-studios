// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isNearCell,
  packId,
  probeColor,
  queryIsDue,
  scanVisible,
  targetSizeFor,
  unpackId,
  type OcclusionTiming,
} from "./occlusion";

describe("packId / unpackId", () => {
  it("round-trips ids spread across the 24-bit channel space", () => {
    for (const id of [1, 2, 0xff, 0x100, 0xffff, 0x10000, 0xffffff]) {
      expect(unpackId(...packId(id))).toBe(id);
    }
  });

  it("keeps id 0 free as the clear colour", () => {
    expect(packId(0)).toEqual([0, 0, 0]);
    expect(unpackId(0, 0, 0)).toBe(0);
  });
});

describe("probeColor", () => {
  it("maps the id into 0..1 channels that read back to the same id", () => {
    for (const id of [1, 7, 0x1234, 0xabcdef]) {
      const [r, g, b] = probeColor(id);
      // the shader writes the multiplied value; the readback rounds to bytes
      expect(
        unpackId(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)),
      ).toBe(id);
    }
  });
});

describe("scanVisible", () => {
  /** A readback buffer the height of one pixel; `rows` is one pixel per chunk id. */
  const oneRowOf = (...ids: number[]): Uint8Array => {
    const out = new Uint8Array(ids.length * 4);
    ids.forEach((id, i) => {
      const [r, g, b] = packId(id);
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    });
    return out;
  };

  it("reports exactly the chunk ids present", () => {
    const visible = scanVisible(oneRowOf(3, 1, 9, 1), [1, 3, 9, 40]);
    expect([...visible].sort((a, b) => a - b)).toEqual([1, 3, 9]);
  });

  it("ignores the alpha channel and ids no chunk uses", () => {
    // pixel 0 writes id 0xffffff; pixel 1 writes id 12 but with junk alpha
    const pixels = new Uint8Array([255, 255, 255, 0, 12, 0, 0, 128]);
    const visible = scanVisible(pixels, [12]);
    expect([...visible]).toEqual([12]);
  });

  it("never reports the id-0 clear colour", () => {
    expect(scanVisible(oneRowOf(0, 0), [1, 2]).size).toBe(0);
  });

  it("treats a sky pixel matching some chunk's id as visible (worst case is harmless over-draw)", () => {
    const visible = scanVisible(oneRowOf(255), [255]);
    expect(visible.has(255)).toBe(true);
  });

  it("ignores stale bytes past the given byte count", () => {
    // Two current pixels, then stale bytes for chunk 7 left over from a
    // larger target the readback buffer was already reused for. Only the
    // leading byteCount bytes describe this target.
    const pixels = Uint8Array.from([...oneRowOf(1, 2), 0, 0, ...packId(7), 0]);
    const visible = scanVisible(pixels, [1, 2, 7], 8);
    expect([...visible].sort((a, b) => a - b)).toEqual([1, 2]);
  });
});

describe("queryIsDue", () => {
  const timing: OcclusionTiming = {
    intervalFrames: 200,
    moveFastTrack: 256,
    turnFastTrack: 0.75,
  };

  it("is not due while the interval has not elapsed and the camera holds still", () => {
    expect(queryIsDue(199, 0, 1, timing)).toBe(false);
  });

  it("becomes due once the interval has elapsed", () => {
    expect(queryIsDue(200, 0, 1, timing)).toBe(true);
  });

  it("fast-tracks on enough camera movement and no sooner", () => {
    expect(queryIsDue(1, 256 * 256 - 1, 1, timing)).toBe(false);
    expect(queryIsDue(1, 256 * 256, 1, timing)).toBe(true);
  });

  it("fast-tracks once the forward has turned far enough", () => {
    expect(queryIsDue(1, 0, 0.76, timing)).toBe(false);
    expect(queryIsDue(1, 0, 0.75, timing)).toBe(true);
  });
});

describe("isNearCell", () => {
  it("includes the player's own cell and its immediate neighbours", () => {
    expect(isNearCell("2,8,-4", "2,8,-4", 1)).toBe(true);
    expect(isNearCell("3,8,-4", "2,8,-4", 1)).toBe(true);
    expect(isNearCell("2,9,-5", "2,8,-4", 1)).toBe(true);
  });

  it("excludes cells beyond the radius on any axis", () => {
    expect(isNearCell("4,8,-4", "2,8,-4", 1)).toBe(false);
    expect(isNearCell("2,10,-4", "2,8,-4", 1)).toBe(false);
  });

  it("handles negative coordinates on both sides of zero", () => {
    expect(isNearCell("-1,-1,-1", "0,0,0", 1)).toBe(true);
    expect(isNearCell("-2,0,0", "0,0,0", 1)).toBe(false);
  });
});

describe("targetSizeFor", () => {
  it("scales a display down by a factor of eight", () => {
    expect(targetSizeFor(1024)).toBe(128);
  });

  it("never goes below a floor of 64 pixels per side", () => {
    expect(targetSizeFor(200)).toBe(64);
    expect(targetSizeFor(1)).toBe(64);
  });
});
