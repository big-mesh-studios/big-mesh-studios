import { describe, expect, it } from "vitest";

import {
  DEFAULT_MESH_RESOLUTION,
  MAX_MESH_SAMPLES,
  MIN_MESH_SAMPLES,
  isMeshResolution,
  meshSampleSize,
  meshSamples,
  sameMeshResolution,
} from "./mesh-resolution";

/**
 * A place's mesh grid is a manifest field, so it is untrusted input with an arithmetic
 * consequence: a spacing that does not divide the chunk leaves a sliver at its edge and
 * silently moves every wall in the place. These are the refusals that keep that promise.
 */
describe("a place's mesh resolution", () => {
  it("accepts the default grid and a finer one that divides the chunk", () => {
    expect(isMeshResolution(DEFAULT_MESH_RESOLUTION)).toBe(true);
    expect(isMeshResolution({ lodSampleSizes: [3.2, 6.4, 12.8] })).toBe(true);
    // Equal levels are a legitimate way to say "no coarsening".
    expect(isMeshResolution({ lodSampleSizes: [4, 4, 4] })).toBe(true);
  });

  it("inherits the default grid when a place names only a look", () => {
    // **The spacing is a request, not a required restatement of the default.** A place that
    // wants hard edges on the landscape's grid should be able to say just that.
    expect(isMeshResolution({})).toBe(true);
    expect(isMeshResolution({ sharpEdges: 35 })).toBe(true);
    expect(meshSampleSize(0, { sharpEdges: 35 })).toBe(
      DEFAULT_MESH_RESOLUTION.lodSampleSizes[0],
    );
    expect(meshSamples(2, { splitColours: true })).toBe(8);
    // Naming the default explicitly is the same request as leaving it out, so loading a
    // place must not re-mesh for it.
    expect(
      sameMeshResolution(
        { sharpEdges: 35 },
        { lodSampleSizes: [10, 20, 40], sharpEdges: 35 },
      ),
    ).toBe(true);
    // A different grid is still a different request.
    expect(
      sameMeshResolution(
        { sharpEdges: 35 },
        { lodSampleSizes: [3.2, 6.4, 12.8], sharpEdges: 35 },
      ),
    ).toBe(false);
  });

  it("accepts a sharp-edge angle on any grid it accepts", () => {
    expect(
      isMeshResolution({
        lodSampleSizes: [3.2, 6.4, 12.8],
        sharpEdges: 35,
      }),
    ).toBe(true);
    // Both ends are meaningful: just above flat, and just below a face turned back on
    // itself. A number is what a manifest says; nothing is rounded.
    expect(
      isMeshResolution({ lodSampleSizes: [10, 20, 40], sharpEdges: 0.5 }),
    ).toBe(true);
    expect(
      isMeshResolution({ lodSampleSizes: [10, 20, 40], sharpEdges: 90 }),
    ).toBe(true);
  });

  it("refuses a sharp-edge angle that is not an angle", () => {
    for (const sharpEdges of [
      0,
      -1,
      90.5,
      180,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "35",
    ]) {
      expect(
        isMeshResolution({ lodSampleSizes: [10, 20, 40], sharpEdges }),
        String(sharpEdges),
      ).toBe(false);
    }
  });

  it("accepts colour cutting as a boolean and refuses anything else", () => {
    expect(
      isMeshResolution({
        lodSampleSizes: [3.2, 6.4, 12.8],
        splitColours: true,
      }),
    ).toBe(true);
    expect(
      isMeshResolution({
        lodSampleSizes: [3.2, 6.4, 12.8],
        splitColours: false,
      }),
    ).toBe(true);
    // **A string is a typo, not a request.** Coercing `"true"` would turn a place's colour
    // boundaries into a different mesh without the manifest ever saying so.
    for (const splitColours of ["true", 1, 0, null, {}]) {
      expect(
        isMeshResolution({ lodSampleSizes: [10, 20, 40], splitColours }),
        String(splitColours),
      ).toBe(false);
    }
  });

  it("treats turning colour cutting on as a different mesh", () => {
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40], splitColours: true },
        { lodSampleSizes: [10, 20, 40], splitColours: true },
      ),
    ).toBe(true);
    // Absent and explicit `false` are the same request: no cut.
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40] },
        { lodSampleSizes: [10, 20, 40], splitColours: false },
      ),
    ).toBe(true);
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40] },
        { lodSampleSizes: [10, 20, 40], splitColours: true },
      ),
    ).toBe(false);
  });

  it("accepts baked occlusion as a strength from zero to one and refuses anything else", () => {
    expect(
      isMeshResolution({
        lodSampleSizes: [3.2, 6.4, 12.8],
        bakeOcclusion: 0.8,
      }),
    ).toBe(true);
    // Zero is a legitimate way to say "none", and the same request as leaving it out.
    expect(
      isMeshResolution({ lodSampleSizes: [10, 20, 40], bakeOcclusion: 0 }),
    ).toBe(true);
    // **A string is a typo, not an amount**, for the same reason `"true"` is not a boolean.
    for (const bakeOcclusion of [
      -0.1,
      1.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "0.8",
      true,
      null,
    ]) {
      expect(
        isMeshResolution({ lodSampleSizes: [10, 20, 40], bakeOcclusion }),
        String(bakeOcclusion),
      ).toBe(false);
    }
  });

  it("treats a change of occlusion strength as a different mesh", () => {
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40], bakeOcclusion: 0.8 },
        { lodSampleSizes: [10, 20, 40], bakeOcclusion: 0.8 },
      ),
    ).toBe(true);
    // Absent and zero are the same request: no occlusion.
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40] },
        { lodSampleSizes: [10, 20, 40], bakeOcclusion: 0 },
      ),
    ).toBe(true);
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40] },
        { lodSampleSizes: [10, 20, 40], bakeOcclusion: 0.8 },
      ),
    ).toBe(false);
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40], bakeOcclusion: 0.8 },
        { lodSampleSizes: [10, 20, 40], bakeOcclusion: 0.6 },
      ),
    ).toBe(false);
  });

  it("derives the sample counts from the chunk, not from the number of levels", () => {
    expect(meshSamples(0)).toBe(32);
    expect(meshSamples(1)).toBe(16);
    expect(meshSamples(2)).toBe(8);
    expect(
      [0, 1, 2].map((lod) =>
        meshSamples(lod, { lodSampleSizes: [3.2, 6.4, 12.8] }),
      ),
    ).toEqual([100, 50, 25]);
    expect(meshSampleSize(1, { lodSampleSizes: [3.2, 6.4, 12.8] })).toBe(6.4);
  });

  it("refuses a spacing that does not tile the chunk", () => {
    // 320 / 3 is 106.67, so a chunk would leave a third of a sample at its edge.
    expect(isMeshResolution({ lodSampleSizes: [3, 6, 12] })).toBe(false);
  });

  it("refuses a grid outside the sample bounds", () => {
    // 320 / 1 = 320 samples, past the scratch memory bound.
    expect(isMeshResolution({ lodSampleSizes: [1, 2, 4] })).toBe(false);
    // 320 / 100 = 3.2 samples, fewer than Surface Nets needs to describe a surface.
    expect(isMeshResolution({ lodSampleSizes: [100, 200, 400] })).toBe(false);
    expect(
      MAX_MESH_SAMPLES,
      "the bound is what the test above depends on",
    ).toBeGreaterThan(100);
    expect(MIN_MESH_SAMPLES).toBeGreaterThan(3);
  });

  it("refuses coarse levels finer than fine ones", () => {
    expect(isMeshResolution({ lodSampleSizes: [10, 5, 20] })).toBe(false);
  });

  it("refuses shapes and values a manifest could carry but not mean", () => {
    for (const value of [
      null,
      undefined,
      10,
      "10",
      { lodSampleSizes: null },
      { lodSampleSizes: [10, 20] },
      { lodSampleSizes: [10, 20, 40, 80] },
      { lodSampleSizes: [10, "20", 40] },
      { lodSampleSizes: [10, 20, Number.NaN] },
      { lodSampleSizes: [10, 20, Number.POSITIVE_INFINITY] },
      { lodSampleSizes: [0, 20, 40] },
    ]) {
      expect(isMeshResolution(value), JSON.stringify(value)).toBe(false);
    }
  });

  it("compares settings by their numbers", () => {
    expect(
      sameMeshResolution(DEFAULT_MESH_RESOLUTION, {
        lodSampleSizes: [10, 20, 40],
      }),
    ).toBe(true);
    expect(
      sameMeshResolution(DEFAULT_MESH_RESOLUTION, {
        lodSampleSizes: [3.2, 6.4, 12.8],
      }),
    ).toBe(false);
    // **A changed angle is a changed surface**, even when the samples are identical.
    // `Session.setMeshSettings` uses this to decide whether to re-mesh, so forgetting it
    // would make the setting appear to do nothing until the next load.
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40], sharpEdges: 35 },
        { lodSampleSizes: [10, 20, 40], sharpEdges: 35 },
      ),
    ).toBe(true);
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40], sharpEdges: 35 },
        { lodSampleSizes: [10, 20, 40], sharpEdges: 30 },
      ),
    ).toBe(false);
    expect(
      sameMeshResolution(
        { lodSampleSizes: [10, 20, 40], sharpEdges: 35 },
        { lodSampleSizes: [10, 20, 40] },
      ),
    ).toBe(false);
  });
});
