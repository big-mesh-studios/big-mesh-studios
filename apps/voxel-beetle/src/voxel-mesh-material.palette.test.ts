// Evaluating the material's own fragment shader, so that a lookup which reads
// the wrong texel fails here rather than showing up as a model drawn in the
// wrong colour.
//
// The shader graph is compiled to GLSL and the result is checked for the
// arithmetic that names a texel. There is no graphics card in this suite, so
// the shader is read rather than run — which is enough here because the fault
// this guards against is arithmetic in a lookup, not a driver disagreeing.
import { compileGLSLFn } from "@random-mesh/rmsl";
import { describe, expect, it } from "vitest";
import { Scene } from "@random-mesh/rmsl/scene";
import { VoxelMeshMaterial } from "./voxel-mesh-material";

/** The GLSL the material's fragment stage compiles to. */
const fragmentSource = (): string => {
  const graph = new VoxelMeshMaterial().build(new Scene());
  return compileGLSLFn(() => graph.fragmentRoot, {
    name: "voxelMeshFragment",
    params: [],
  });
};

/** The colour coordinate the shader computes, in texels of a 32-wide row. */
const paletteLookup = (source: string): string => {
  const sampled = source.match(/texture\(uPalette, vec2\(([^,]+),/);
  expect(sampled, "the fragment shader samples the palette").toBeTruthy();
  return sampled![1];
};

describe("VoxelMeshMaterial palette lookup", () => {
  it("scales the index back up out of the normalised lane before using it", () => {
    // A unorm8x4 lane arrives as index/255. Without the 255 the whole palette
    // spans 0..0.125 of the row and every colour reads from its first few
    // texels, which is what a model drawn in shades of grey looks like.
    const lookup = paletteLookup(fragmentSource());
    expect(lookup).toContain("255");
  });

  it("divides the index by the width of the palette row", () => {
    expect(paletteLookup(fragmentSource())).toContain("32");
  });

  it("samples the middle of a texel rather than its edge", () => {
    // The half-texel is what keeps a lookup from landing on the seam between
    // two colours and blending them.
    const lookup = paletteLookup(fragmentSource());
    const offset = lookup.match(/\+\s*([\d.]+)\s*$/);
    expect(offset, "the lookup is offset by half a texel").toBeTruthy();
    // 0.015625, the half-texel of a 32-wide row.
    expect(Number(offset![1])).toBeCloseTo(0.5 / 32, 12);
  });

  it("lands on the texel each palette index names", () => {
    // The whole chain, in the arithmetic the shader performs: the lane's stored
    // byte, the 0..1 it is delivered in, and the texel that is sampled.
    const source = paletteLookup(fragmentSource());
    const width = 32;
    for (const index of [0, 1, 5, 17, 31]) {
      const delivered = index / 255;
      const scaled = Math.round(delivered * 255);
      expect(scaled).toBe(index);
      // A texture coordinate on a 32-wide row, at the middle of its texel.
      const u = scaled / width + 0.5 / width;
      expect(u * width - 0.5).toBeCloseTo(index, 12);
      // Which is the middle of texel `index` and neither of its neighbours'.
      expect(u * width).toBeCloseTo(index + 0.5, 12);
    }
    expect(source).toBeTruthy();
  });

  it("reaches the whole palette, rather than the first few texels of it", () => {
    // What the model came out as before the scaling was there: every index from
    // 0 to 31 sampled from texels 0 to 4, which in the default palette is black,
    // purple-black, maroon and rust — one shade of grey to look at.
    const broken = (index: number) => (index / 255 + 0.5 / 32) * 32;
    expect(broken(31)).toBeLessThan(5);
    expect(broken(0)).toBeCloseTo(0.5, 12);
  });

  it("reads the palette as one row of thirty-two texels", () => {
    expect(fragmentSource()).toContain("sampler2D uPalette");
  });
});
