// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Scene } from "@random-mesh/rmsl/scene";
import { VERTEX_BYTES } from "./mesh";
import { VoxelMeshMaterial } from "./material-mesh";
import { encodePalette } from "./solver";

const PALETTE = [
  { r: 10, g: 20, b: 30, a: 255 },
  { r: 40, g: 50, b: 60, a: 255 },
];

describe("VoxelMeshMaterial", () => {
  it("reads exactly the two attributes the mesher writes", () => {
    const material = new VoxelMeshMaterial();
    const program = material.build(new Scene());

    // A vertex is a position and a packed lane group and nothing else: the
    // normal is rebuilt from the face byte rather than carried, and the palette
    // index is looked up rather than resolved to a colour at mesh time.
    expect(
      program.attributes.map((attribute) => attribute.name).sort(),
    ).toEqual(["packed", "position"]);
  });

  it("spends sixteen bytes a vertex, which is what the mesher writes", () => {
    // Three floats of position and four bytes of packed lanes.
    expect(VERTEX_BYTES).toBe(3 * 4 + 4);
  });

  it("draws both sides, so a model can be seen into", () => {
    // Three is Side.DoubleSide. A hollow model shows the inside of its far wall
    // rather than a hole through to whatever is behind it.
    expect(new VoxelMeshMaterial().side).toBe(2);
  });

  it("starts lit, with no light but the ambient term", () => {
    const material = new VoxelMeshMaterial();
    expect(material.unlit).toBe(false);
    expect(material.ambientColour).toEqual([0, 0, 0]);
  });

  it("has a palette texture to sample before any palette is baked", () => {
    // One row of a single texel, so a material built before it is told a palette
    // still samples something rather than nothing.
    const material = new VoxelMeshMaterial();
    expect(material.paletteTexture.width).toBe(1);
    expect(material.paletteTexture.height).toBe(1);
  });
});

describe("encodePalette, as the mesh material samples it", () => {
  it("writes the palette as one row of RGBA texels", () => {
    const pixels = encodePalette(PALETTE);

    expect(pixels).toEqual(new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]));
    expect(pixels.length / 4).toBe(PALETTE.length);
  });

  it("keeps a colour's own alpha, which is how a tinted voxel reads", () => {
    const pixels = encodePalette([{ r: 1, g: 2, b: 3, a: 128 }]);
    expect(pixels[3]).toBe(128);
  });
});
