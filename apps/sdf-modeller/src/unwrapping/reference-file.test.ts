// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { serialiseOperations } from "@big-mesh-studios/csg";

import {
  readReference,
  referenceMatches,
  writeReference,
  type ReferenceFile,
} from "../unwrapping/reference-file";
import { readProject, writeProject } from "../file/project";
import {
  PROJECT_MANIFEST_FILE,
  PROJECT_MODEL_FILE,
  PROJECT_REFERENCE_FILE,
  PROJECT_TEXTURE_FILE,
  isSaveableProject,
  projectManifest,
} from "../file/project-file";

/**
 * Two triangles over four welded vertices — the shape the mesher produces.
 *
 * **`PAINTED` is that same surface with its cuts open**: six vertices, because the vertex the two
 * triangles share appears twice with two different atlas coordinates. Every fixture here carries
 * both, because a file that can only describe one of them is the bug this whole arrangement was
 * written to prevent — see `unwrap.ts` for what painting against the welded mesh actually does.
 */
const MESH = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
  indices: new Uint32Array([0, 1, 2, 1, 3, 2]),
  vertexCount: 4,
};

const PAINTED = {
  positions: new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
  ]),
  indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
  // **Two charts, because the two triangles do not share one** — the same vertex appearing in
  // both is the seam, and the fact that it has two different coordinates is why this fixture has
  // two copies of it at all.
  charts: new Uint32Array([0, 0, 0, 1, 1, 1]),
  vertexCount: 6,
  triangleCount: 2,
};

const UVS = new Float32Array([0, 0, 0.5, 0, 0, 0.5, 0.2, 0, 1, 0.5, 0, 0.5]);

const ATLAS = {
  width: 64,
  height: 48,
  texelsPerUnit: 12.5,
  utilization: 0.8125,
  chartCount: 3,
};

describe("texture.bin round trip", () => {
  it("gives back every number it was given", () => {
    // **The whole contract in one assertion.** A reference that loses a field is not a smaller
    // file, it is a picture that comes back attached to the wrong place — and a field dropped
    // silently is exactly the failure a spot check of the first few values would miss.
    const read = readReference(writeReference(ATLAS, UVS, PAINTED, MESH));

    expect(read.width).toBe(64);
    expect(read.height).toBe(48);
    expect(read.painted.vertexCount).toBe(6);
    expect(read.texelsPerUnit).toBe(12.5);
    expect(read.utilization).toBe(0.8125);
    expect(read.chartCount).toBe(3);
    expect(Array.from(read.uvs)).toEqual(Array.from(UVS));
    expect(Array.from(read.painted.positions)).toEqual(
      Array.from(PAINTED.positions),
    );
    expect(Array.from(read.painted.indices)).toEqual(
      Array.from(PAINTED.indices),
    );
    expect(Array.from(read.source.positions)).toEqual(
      Array.from(MESH.positions),
    );
  });

  it("keeps the coordinates paired with the right vertex", () => {
    // **Interleaving is the one thing a fixed-width layout can get wrong quietly.** If the
    // positions were written one vertex ahead of their coordinates, every number would still be
    // present and every one of them would belong to a different corner of the figure.
    const read = readReference(writeReference(ATLAS, UVS, PAINTED, MESH));
    // Painted vertex 4 is at (1, 1, 0) and its coordinate is (1, 0.5).
    expect(Array.from(read.painted.positions.slice(12, 15))).toEqual([1, 1, 0]);
    expect(Array.from(read.uvs.slice(8, 10))).toEqual([1, 0.5]);
  });

  it("refuses a version it does not read", () => {
    // **A future build's file says so rather than being read at this build's widths.** Reading
    // it anyway would mean interpreting somebody else's fields as ours, which produces numbers
    // that are plausible and wrong.
    const bytes = writeReference(ATLAS, UVS, PAINTED, MESH);
    new DataView(bytes).setUint16(0, 99, true);

    expect(() => readReference(bytes)).toThrow(
      /version 99 and this build reads/,
    );
  });

  it("refuses a vertex count the bytes do not back up", () => {
    // **A count is a claim and the byte length is the fact.** A file whose header says four
    // vertices while holding eight would otherwise have eight vertices read as four, and the
    // other four silently discarded.
    const bytes = writeReference(ATLAS, UVS, PAINTED, MESH);
    // **The painted count at offset 20**, which is the one that sizes the arrays and the one a
    // corrupt file would lie about.
    new DataView(bytes).setUint32(20, 3, true);

    expect(() => readReference(bytes)).toThrow(
      /3 painted vertices with 6 indices over 4 source vertices need/,
    );
  });

  it("refuses an index past the end of the vertices", () => {
    // **The one array in this file that indexes another.** A tree built over an index beyond
    // the positions reads whatever follows in memory and reports it as a triangle.
    const bytes = writeReference(ATLAS, UVS, PAINTED, MESH);
    new Uint32Array(
      bytes,
      40 + PAINTED.vertexCount * 8 + MESH.vertexCount * 12,
      6,
    )[5] = 4000;

    expect(() => readReference(bytes)).toThrow(/painted vertex 4000 of 6/);
  });

  it("refuses a vertex count that would allocate without limit", () => {
    // **Checked against the cap before the length**, because the cap is the only thing standing
    // between a corrupt header and a four-billion-vertex allocation.
    const bytes = writeReference(ATLAS, UVS, PAINTED, MESH);
    new DataView(bytes).setUint32(20, 4_000_000_000, true);

    expect(() => readReference(bytes)).toThrow(/the limit is/);
  });
});

describe("referenceMatches", () => {
  const saved: ReferenceFile = readReference(
    writeReference(ATLAS, UVS, PAINTED, MESH),
  );

  it("accepts the surface it was written from", () => {
    // **The exact path exists only because this says yes**, and every saving in it — the
    // coordinates, the chart count, the scale the brush is sized from — depends on this being
    // right rather than merely usually right.
    expect(referenceMatches(saved, MESH)).toBe(true);
  });

  it("refuses a surface whose vertices have moved", () => {
    // **A tolerance would be a guess nobody measured.** Even a hair's breadth means the saved
    // coordinates are describing a surface that is not there.
    const moved = { ...MESH, positions: MESH.positions.slice() };
    moved.positions[0] = 0.001;

    expect(referenceMatches(saved, moved)).toBe(false);
  });

  it("refuses a surface whose vertices are in a different order", () => {
    // **Compared in full, element by element, rather than by count.** The same four vertices in
    // a different order is a different surface as far as a picture laid out over it is
    // concerned, and a count would call that a match.
    const reordered = { ...MESH, positions: MESH.positions.slice() };
    reordered.positions[0] = reordered.positions[3]!;
    reordered.positions[3] = 0;

    expect(referenceMatches(saved, reordered)).toBe(false);
  });

  it("refuses a surface with a different number of vertices", () => {
    const longer = { ...MESH, vertexCount: 5 };
    expect(referenceMatches(saved, longer)).toBe(false);
  });
});

/**
 * Reads a written file back, without going near a PNG.
 *
 * **A hand-built zip rather than a written one**, because these tests are about what a file
 * *says* and the writer would only ever say something correct — the refusals being checked here
 * are the ones a well-behaved writer cannot produce.
 */
const repacked = async (
  manifest: unknown,
  entries: Record<string, ArrayBuffer | string | null> = {},
): Promise<Blob> => {
  const zip = new JSZip();
  zip.file(PROJECT_MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  zip.file(
    PROJECT_MODEL_FILE,
    serialiseOperations([
      {
        index: 0,
        origin: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        shape: { type: "Box", len: { x: 1, y: 1, z: 1 } },
        softness: 0,
        combine: "Add",
        colour: { r: 255, g: 255, b: 255 },
        opacity: 1,
      },
    ]),
  );
  for (const [name, data] of Object.entries(entries)) {
    if (data !== null) zip.file(name, data);
  }
  return await zip.generateAsync({ type: "blob" });
};

/**
 * Bytes standing in for `texture.png`.
 *
 * **Never decoded, and that is deliberate.** Every refusal below is checked against the
 * manifest and the coordinates *before* the picture is looked at, so the tests are about what a
 * file claims rather than about what a PNG decoder can do — and a decoder is the one thing here
 * that this environment has no way to provide.
 */
const A_PICTURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;

const baseManifest = {
  version: 1,
  ids: ["body"],
  coloured: [],
  palette: [],
  view: { mode: "surface-nets", resolution: 0.25 },
};

describe("a project with no texture", () => {
  it("writes the two entries and no texture field", async () => {
    // **The compatibility claim, stated as bytes.** An untextured model must produce exactly
    // the file it produced before texturing existed — not a similar one, the same one — or
    // every model in every place that was never painted on has silently acquired a new format.
    const zip = await JSZip.loadAsync(
      await writeProject([], [], { mode: "surface-nets", resolution: 0.25 }),
    );

    expect(Object.keys(zip.files).sort()).toEqual(
      [PROJECT_MANIFEST_FILE, PROJECT_MODEL_FILE].sort(),
    );

    const manifest = JSON.parse(
      (await zip.file(PROJECT_MANIFEST_FILE)?.async("text")) ?? "{}",
    ) as Record<string, unknown>;
    // **Absent rather than null or empty**, because a validator that has to tell three kinds of
    // "no texture" apart is three chances to get one of them wrong.
    expect("texture" in manifest).toBe(false);
  });

  it("writes four entries and a manifest that describes them", async () => {
    // **The save side, end to end, which is the half a round trip through a decoder would not
    // have covered anyway.** Four entries rather than two, and a manifest whose numbers are the
    // numbers actually in the archive — because a manifest describing a different atlas than the
    // one beside it is refused on load, which would make every textured save unopenable and look
    // like a bug in the reader.
    const zip = await JSZip.loadAsync(
      await writeProject(
        [],
        [],
        { mode: "surface-nets", resolution: 0.25 },
        {
          png: new Blob([A_PICTURE], { type: "image/png" }),
          atlas: ATLAS,
          uvs: UVS,
          painted: PAINTED,
          source: MESH,
          blend: 1,
        },
      ),
    );

    expect(Object.keys(zip.files).sort()).toEqual(
      [
        PROJECT_MANIFEST_FILE,
        PROJECT_MODEL_FILE,
        PROJECT_REFERENCE_FILE,
        PROJECT_TEXTURE_FILE,
      ].sort(),
    );

    const manifest = JSON.parse(
      (await zip.file(PROJECT_MANIFEST_FILE)?.async("text")) ?? "{}",
    ) as { texture: Record<string, number> };

    expect(manifest.texture).toEqual({
      width: 64,
      height: 48,
      vertices: 6,
      blend: 1,
    });

    // **The numbers checked against the bytes beside them**, which is the pairing that makes the
    // file reopenable at all.
    const read = readReference(
      (await zip
        .file(PROJECT_REFERENCE_FILE)
        ?.async("arraybuffer")) as ArrayBuffer,
    );
    expect(read.width).toBe(manifest.texture.width);
    expect(read.height).toBe(manifest.texture.height);
    expect(read.painted.vertexCount).toBe(manifest.texture.vertices);
    expect(Array.from(read.uvs)).toEqual(Array.from(UVS));
    expect(read.source.vertexCount).toBe(MESH.vertexCount);
  });

  it("reads back without a texture", async () => {
    const project = await readProject(
      await writeProject([], [], { mode: "surface-nets", resolution: 0.25 }),
    );
    expect(project.texture).toBeUndefined();
  });
});

describe("a project that names a texture", () => {
  const described = {
    ...baseManifest,
    texture: { width: 64, height: 48, vertices: 6, blend: 1 },
  };

  it("refuses a manifest whose picture is not in the file", async () => {
    // **A manifest naming an atlas that is absent is a promise the file does not keep**, and it
    // is the one damage a reader cannot repair. Opening it as an untextured model would look
    // like working; opening it as an error is the truth.
    const bytes = writeReference(ATLAS, UVS, PAINTED, MESH);

    await expect(
      readProject(
        await repacked(described, { [PROJECT_REFERENCE_FILE]: bytes }),
      ),
    ).rejects.toThrow(new RegExp(`no ${PROJECT_TEXTURE_FILE}`));
  });

  it("refuses a manifest whose coordinates are not in the file", async () => {
    // **The other direction, and the more insidious one.** A picture without coordinates would
    // still *look* right — it is the right image — and would only be found out at the first
    // stroke, which lands somewhere arbitrary.
    await expect(
      readProject(
        await repacked(described, { [PROJECT_TEXTURE_FILE]: A_PICTURE }),
      ),
    ).rejects.toThrow(new RegExp(`no ${PROJECT_REFERENCE_FILE}`));
  });

  it("refuses a manifest and a reference that disagree about the mesh", async () => {
    // **Both numbers are in the sentence on purpose.** Either side could be the liar, and
    // knowing which is the difference between a message somebody can act on and one they have
    // to guess at.
    const bytes = writeReference(ATLAS, UVS, PAINTED, MESH);

    await expect(
      readProject(
        await repacked(
          { ...described, texture: { ...described.texture, vertices: 99 } },
          {
            [PROJECT_TEXTURE_FILE]: A_PICTURE,
            [PROJECT_REFERENCE_FILE]: bytes,
          },
        ),
      ),
    ).rejects.toThrow(/manifest names 99 reference vertices and .* holds 6/);
  });

  it("refuses a reference and a manifest that disagree about the atlas size", async () => {
    // **The size is the other half of the promise.** A picture sized differently is not a
    // picture that can be sampled with the saved coordinates, and every coordinate would land
    // in the wrong place by a scale factor.
    const bytes = writeReference(ATLAS, UVS, PAINTED, MESH);

    await expect(
      readProject(
        await repacked(
          { ...described, texture: { ...described.texture, width: 128 } },
          {
            [PROJECT_TEXTURE_FILE]: A_PICTURE,
            [PROJECT_REFERENCE_FILE]: bytes,
          },
        ),
      ),
    ).rejects.toThrow(
      /describes a 64 by 48 atlas and the manifest says 128 by 48/,
    );
  });
});

describe("a manifest written before texturing existed", () => {
  it("is still a valid manifest", async () => {
    // **The single most important test in this file.** Every model saved before this feature
    // has a manifest with no `texture` field, and a validator that refused one would make
    // adding a texture a reason nobody could open their own work.
    expect(isSaveableProject(baseManifest)).toBe(true);
    expect(isSaveableProject({ ...baseManifest, texture: undefined })).toBe(
      true,
    );
  });

  it("opens as an untextured model", async () => {
    // **And the other half: the absence is not an error and not a degraded mode.** It is what
    // every model was until somebody painted one.
    const project = await readProject(await repacked(baseManifest));

    expect(project.parts).toHaveLength(1);
    expect(project.texture).toBeUndefined();
  });
});

describe("the manifest's texture field", () => {
  const withTexture = (texture: unknown): unknown => ({
    ...baseManifest,
    texture,
  });

  it("accepts one that describes a real atlas", () => {
    expect(
      isSaveableProject(
        withTexture({ width: 64, height: 48, vertices: 4, blend: 0 }),
      ),
    ).toBe(true);
  });

  it("refuses one whose edges are not a texel count", () => {
    // **Checked as a shape rather than merely "a number".** A width of 0 or a negative one is a
    // file that would allocate nothing and sample nothing, and `0` passing as "no texture
    // given" is the sort of thing that only shows up as a blank model.
    for (const width of [0, -8, 1.5, "64", Number.NaN]) {
      expect(
        isSaveableProject(
          withTexture({ width, height: 48, vertices: 4, blend: 0 }),
        ),
      ).toBe(false);
    }
  });

  it("refuses one whose blend is outside the shader's range", () => {
    // **A number, not a pair of names — but the same range the uniform is read in.** A blend of
    // four would not fail at load; it would fail as a model that renders as nothing.
    for (const blend of [-0.1, 1.1, Number.POSITIVE_INFINITY, "tint"]) {
      expect(
        isSaveableProject(
          withTexture({ width: 64, height: 48, vertices: 4, blend }),
        ),
      ).toBe(false);
    }
  });

  it("refuses a half-written one rather than reading it as no texture at all", () => {
    // **The asymmetry that matters.** An absent field means untextured and is fine; a present
    // one that is wrong is a file that does not match its own description, and reading it as
    // "untextured" would open a painted model as a blank one with no word to anybody.
    expect(isSaveableProject(withTexture({ width: 64 }))).toBe(false);
    expect(isSaveableProject(withTexture({}))).toBe(false);
    expect(isSaveableProject(withTexture(null))).toBe(false);
  });
});

describe("projectManifest", () => {
  it("will not write a texture it does not believe", () => {
    // **The same constructor the writer uses, refusing what the reader would refuse.** Without
    // this the writer and the reader could drift into disagreeing about what a manifest is, and
    // the file that proves it would be one somebody has to lose work to.
    expect(() =>
      projectManifest(
        { mode: "surface-nets", resolution: 0.25 },
        {
          texture: { width: 64, height: 48, vertices: 0, blend: 0 },
        },
      ),
    ).toThrow(/cannot open/);
  });
});
