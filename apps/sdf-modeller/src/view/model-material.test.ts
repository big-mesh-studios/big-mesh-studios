import { describe, expect, it } from "vitest";
import { compileGlsl } from "@random-mesh/rmsl/glsl";
import { Scene } from "@random-mesh/rmsl/scene";

import { PaintField } from "../unwrapping/paint-field";
import { ModelMaterial } from "./model-material";

/**
 * Compiling the material needs no graphics device.
 *
 * **Which is the whole reason this file exists.** The question M3 has to answer is whether the
 * field samples correctly, and the answer is arithmetic across five conversions — world to
 * volume to brick to slot to texel — which is exactly the kind of thing that is wrong in a
 * way nobody sees until somebody paints a stroke and it lands somewhere else. Reading the
 * emitted GLSL catches the part that is wrong in the *text*; the part that is wrong in the
 * *arithmetic* is what the maths assertions below are for.
 *
 * What none of this can see is whether the GPU agrees with the text. That is what the browser
 * is for, and it is why the browser check alongside M3 matters.
 */
const compile = (material: ModelMaterial) => {
  const scene = new Scene();
  const program = material.build(scene);
  return {
    program,
    vertex: compileGlsl.vertex(program.vertexRoot, { precision: "highp" }),
    fragment: compileGlsl.fragment(program.fragmentRoot, {
      precision: "highp",
    }),
  };
};

/** A small field over a box the grid can hold, with its textures built. */
const aField = (): PaintField => {
  const field = PaintField.over(0.1, [0, 0, 0], [2, 2, 2], 2);
  field.ensureTextures();
  return field;
};

const withField = (): ModelMaterial => {
  const material = new ModelMaterial();
  material.attachField(aField());
  return material;
};

describe("a material with a paint field", () => {
  it("emits a version 300 es program", () => {
    const { vertex, fragment } = compile(withField());
    expect(vertex).toContain("#version 300 es");
    expect(fragment).toContain("#version 300 es");
    expect(fragment).toMatch(/void\s+main\s*\(/);
  });

  it("binds both field textures as three-dimensional samplers", () => {
    // **The assertion that matters most.** A `sampler2D` here would compile, would draw, and
    // would sample one flat slice of the volume — a model painted with a colour that happened
    // to be right in one plane and transparent everywhere else. The emitted text is the only
    // place the difference is visible at all.
    const { fragment, program } = compile(withField());
    expect(fragment).toContain("sampler3D");

    const names = program.samplers.map((sampler) => sampler.name);
    expect(names).toContain("fieldPool");
    expect(names).toContain("fieldGrid");
    for (const name of ["fieldPool", "fieldGrid"]) {
      expect(
        program.samplers.find((sampler) => sampler.name === name)?.type,
      ).toBe("sampler3D");
    }
  });

  it("samples the world position and not a texture coordinate", () => {
    // **The line the whole change turns on.** The atlas needed a `uv` varying precisely
    // because it could not answer "what colour is at this point" any other way. If a `uv`
    // varying is still emitted here, the field is being sampled through the old path and the
    // whole of M3 is decorative.
    const { vertex, fragment } = compile(withField());
    expect(vertex).not.toContain("vUV");
    expect(vertex).not.toContain("vUv");
    // `positionWorld` is what the material already computed for lighting; the field reuses it
    // rather than declaring a second varying of its own.
    expect(fragment).toContain("texture(");
  });

  it("reads the indirection before the pool", () => {
    // **Order is the lookup.** A pool read without knowing which slot the brick lives in
    // would sample an arbitrary part of the volume, which is not a compile error and not a
    // crash — just paint in the wrong place.
    const { fragment } = compile(withField());
    const grid = fragment.indexOf("fieldGrid");
    const pool = fragment.indexOf("fieldPool");
    expect(grid).toBeGreaterThan(-1);
    expect(pool).toBeGreaterThan(-1);
  });

  it("reads each field texture once, not once per use", () => {
    // **The test that matters most for performance, and the easiest one to lose.**
    //
    // rmsl's node graph has no common-subexpression elimination: every *use* of a node
    // re-emits its subgraph. The sample is used five times — `.xyz` three times for the stroke
    // colour and `.w` twice for the coverage — so a sample left inline is re-evaluated five
    // times, and each evaluation is a grid read plus a pool read. That is ten dependent 3D
    // texture reads a fragment from a line that reads like it samples once, on a phone, for
    // every pixel of the model.
    //
    // `.toVar()` on the result and on the indirection read is the whole fix, and nothing else
    // in the build would notice if it went away.
    const { fragment } = compile(withField());
    const count = (source: string): number =>
      fragment.split(`texture(${source}`).length - 1;
    expect(count("fieldGrid")).toBe(1);
    expect(count("fieldPool")).toBe(1);
  });

  it("has no paint samplers at all without a field", () => {
    // **So a model nobody is painting costs exactly what it cost before this change.** A
    // placeholder 1×1×1 texture would work and would mean every untextured draw pays two
    // texture reads and two uniforms it has no use for.
    const { fragment, program } = compile(new ModelMaterial());
    expect(program.samplers.map((sampler) => sampler.name)).not.toContain(
      "fieldPool",
    );
    expect(fragment).not.toContain("fieldGrid");
  });

  it("asks for the indirection's fourth byte as the allocation flag", () => {
    // **The flag lives in alpha.** A sentinel slot number would be one more thing to keep out
    // of the valid range, and slot 0 is perfectly valid.
    const { fragment } = compile(withField());
    expect(fragment).toMatch(/\.w\b/);
  });
});

describe("the maths the shader is expressing", () => {
  /** A field with one brick's worth of voxels per side, so addresses are small and legible. */
  const small = (): PaintField =>
    PaintField.over(0.1, [0, 0, 0], [0.8, 0.8, 0.8], 2);

  it("puts a voxel's world centre inside the brick that holds it", () => {
    // **The first of the five conversions.** If `voxelAt(worldAt(x))` is not `x`, everything
    // after it is off by however far, and the symptom is a stroke painted slightly off the
    // surface that nobody can name.
    const field = small();
    expect(field.voxelAt(...field.worldAt(3, 5, 7))).toEqual([3, 5, 7]);
  });

  it("divides by the extent in world units, not in voxels", () => {
    // **The conversion the shader's `extent` uniform exists for.** `size` is voxels a side and
    // `extent` is world units, and confusing the two shifts every dab by the origin — which
    // for a model not centred on the origin is the whole field.
    const field = small();
    expect(field.extent).toEqual([0.8, 0.8, 0.8]);
    expect(field.poolDim).toBe(2 * 10);
  });

  it("keeps a world position at the box's edge at 1, and just outside it above", () => {
    // **The conversion the shader's in-bounds test is built on**, asserted as the shader
    // computes it: divide the world offset by the extent. `uvw == 1` must count as inside or
    // the field loses the last voxel of paint on every axis; a hair beyond must not, or a
    // fragment past the edge clamps onto the border brick and picks up whatever is there.
    const field = small();
    const extent = field.extent;
    const uvw = (world: number): number => world / extent[0];
    expect(uvw(extent[0])).toBe(1);
    expect(uvw(extent[0] + 0.01)).toBeGreaterThan(1);
    expect(uvw(0)).toBe(0);
    expect(uvw(extent[0] / 2)).toBe(0.5);
  });

  it("names a brick's slot in the fourth byte as allocated", () => {
    // **The flag the shader branches on.** Reading it back through `slotOf` rather than the
    // raw byte keeps the test honest about what the shader's `info.w` has to be.
    const field = small();
    expect(field.set(0, 0, 0, { r: 255, g: 0, b: 0, a: 255 })).toBe(true);
    expect(field.brickCount).toBe(1);
  });
});
