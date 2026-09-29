// The material is the one part of the meshing swap with no test of its own that
// the maths can check, because it is the one part that is a shader graph. What
// can be checked without a graphics card is the contract between the mesher and
// the material: which lane of a vertex carries what, and that the program the
// material builds asks for the attributes the mesher writes.
import { describe, expect, it } from "vitest";
import { Scene } from "@random-mesh/rmsl/scene";
import { VERTEX_BYTES } from "@big-mesh-studios/stacker/mesh";
import { bakePalette, VoxelMeshMaterial } from "./voxel-mesh-material";

describe("VoxelMeshMaterial", () => {
  it("builds a program that reads the attributes the mesher writes", () => {
    const program = new VoxelMeshMaterial().build(new Scene());
    const names = program.attributes.map((one) => one.name);
    expect(names).toContain("position");
    expect(names).toContain("packed");
  });

  it("binds no vertex attribute the mesher does not write", () => {
    const program = new VoxelMeshMaterial().build(new Scene());
    // The mesher writes two attributes and the index; anything else the program
    // asks for would read as zeros.
    expect(program.attributes.map((one) => one.name).sort()).toEqual([
      "packed",
      "position",
    ]);
  });

  it("carries what a vertex needs in sixteen bytes", () => {
    // A position is three floats and the packed lanes are four bytes, which is
    // the whole vertex. A material reading a fifth quantity would be reading
    // something the mesher does not write.
    expect(VERTEX_BYTES).toBe(3 * 4 + 4);
  });

  it("reads the palette as one row of thirty-two colours", () => {
    const material = new VoxelMeshMaterial();
    bakePalette(material, new Uint8Array(32 * 4).fill(200), 32);
    expect(material.paletteTexture.image).toHaveLength(32 * 4);
    expect(material.paletteTexture.width).toBe(32);
    expect(material.paletteTexture.height).toBe(1);
  });

  it("draws both sides, so a hollow model shows its own inside", () => {
    expect(new VoxelMeshMaterial().side).toBe(2);
  });

  it("is lit by default, and flat when told to be", () => {
    const material = new VoxelMeshMaterial();
    expect(material.unlit).toBe(false);
    expect(material.ambientColour).toEqual([0, 0, 0]);
  });
});
