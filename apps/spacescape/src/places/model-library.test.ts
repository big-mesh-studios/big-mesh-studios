import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import {
  makeOperation,
  serialiseOperations,
  type Operation,
} from "@big-mesh-studios/csg";

import { NodeMaterial } from "@random-mesh/rmsl/scene";

import {
  FIGURE_MESH_BUDGET,
  ModelLibrary,
  readModelFile,
} from "./model-library";

/** A material, because `draw` takes one and a figure has to be drawn in something. */
const MATERIAL = new NodeMaterial();

/** A capsule, which is the smallest thing that reads as a figure. */
const capsule = (index: number, at: { x: number; y: number; z: number }) =>
  makeOperation(
    index,
    at,
    { type: "Capsule", len: 4, radius: 1 },
    "Add",
    index === 0 ? { colour: { r: 200, g: 30, b: 30 } } : {},
  );

/**
 * A `.sdfmod` built here rather than committed.
 *
 * **The format is four numbers and a manifest, and writing it is a better test than shipping a
 * binary would be.** A committed fixture stops saying anything the moment the format changes —
 * it becomes an opaque blob whose only remaining claim on the reader is that it once parsed.
 * Built here, it also has to be built *correctly* by every test that uses it, which is a
 * constraint the format ought to have.
 */
const sdfmod = async (
  operations: readonly Operation[],
  overrides: Record<string, unknown> = {},
): Promise<Uint8Array> => {
  const zip = new JSZip();
  zip.file(
    "manifest.json",
    JSON.stringify({
      version: 1,
      ids: operations.map((_, i) => `p${i}`),
      coloured: [],
      palette: [],
      view: { mode: "marching-cubes", resolution: 0.25 },
      ...overrides,
    }),
    { createFolders: false },
  );
  zip.file("model.bin", serialiseOperations(operations), {
    createFolders: false,
  });
  return zip.generateAsync({ type: "uint8array" });
};

describe("readModelFile", () => {
  it("reads a model into operations, a field, a box and a mesh", async () => {
    const model = await readModelFile(
      "can",
      await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]),
    );

    expect(model.name).toBe("can");
    expect(model.operations).toHaveLength(1);
    // **A capsule is a closed surface, so it cannot come back as nothing.** The three "has it"
    // answers are separately true: the operations are the model, the field is how a pick sees
    // it, the triangle count is what the mesher spent.
    expect(model.triangles).toBeGreaterThan(0);
    // **And it draws.** `draw` is the only way to get a mesh out of a model, so this is the
    // test that the model is drawable rather than merely well formed.
    const drawn = model.draw(MATERIAL);
    expect(drawn).toBeDefined();
    expect(drawn!.geometry).toBeDefined();
    expect(model.field.distance(0, 0, 0)).toBeLessThan(0);
    expect(model.field.distance(40, 40, 40)).toBeGreaterThan(0);
  });

  it("gives a box that reaches the whole model and pads it for picking", async () => {
    const model = await readModelFile(
      "can",
      await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]),
    );

    // **A capsule of `len: 4, radius: 1` has half-extents 1 along x and z and 3 along y**, so
    // the model is two wide and six tall — and the box is that plus `FIGURE_VOXEL_SIZE · 4` of
    // padding on every side. Asserting the numbers rather than a shape, because the padding is
    // load-bearing: `meshRegion` derives its sample count from the box, and a box flush against
    // its own surface puts every flat face exactly on a sample, which resolves nothing.
    const pad = FIGURE_MESH_BUDGET.voxelSize * 4;
    expect(model.half.x).toBeCloseTo(1 + pad, 9);
    expect(model.half.z).toBeCloseTo(1 + pad, 9);
    expect(model.half.y).toBeCloseTo(3 + pad, 9);
    // **And the box is centred on the model**, which is what a yaw-rotation about the figure's
    // own origin assumes. A box offset from the origin would make a rotated instance's
    // collision box swing away from its mesh.
    expect(model.bounds.min.x + model.half.x).toBeCloseTo(0, 9);
    expect(model.bounds.min.y + model.half.y).toBeCloseTo(0, 9);
  });

  it("refuses a zip with no manifest, and says which file is missing", async () => {
    const zip = new JSZip();
    zip.file(
      "model.bin",
      serialiseOperations([capsule(0, { x: 0, y: 0, z: 0 })]),
    );
    await expect(
      readModelFile("bad", await zip.generateAsync({ type: "uint8array" })),
    ).rejects.toThrow(/no manifest\.json/);
  });

  it("refuses a model.bin that is not one, by version", async () => {
    const bytes = await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]);
    // **A stamped version rather than a hand-built buffer**, which is how the format's own test
    // does it: the bytes are otherwise perfectly well formed, so a reader that refused only
    // malformed input would not be exercised at all.
    const zip = await JSZip.loadAsync(bytes);
    const model = await zip.file("model.bin")!.async("uint8array");
    new DataView(model.buffer, model.byteOffset).setUint16(0, 3, true);
    const rebuilt = new JSZip();
    rebuilt.file(
      "manifest.json",
      await zip.file("manifest.json")!.async("text"),
    );
    rebuilt.file("model.bin", model);

    await expect(
      readModelFile("old", await rebuilt.generateAsync({ type: "uint8array" })),
    ).rejects.toThrow(/version/i);
  });

  it("refuses a manifest that names a different number of parts than the model holds", async () => {
    // **The cross-check that makes position meaningful.** `Operation.index` is a position in a
    // fold and carries no name, so the manifest's `ids` are the only thing joining a part to
    // its identity — and a manifest of the wrong length is describing a model nothing here can
    // represent.
    const bytes = await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })], {
      ids: ["a", "b"],
    });
    await expect(readModelFile("bad", bytes)).rejects.toThrow(
      /names 2 parts and model\.bin holds 1/,
    );
  });

  it("refuses a model with nothing in it, which is a different thing from a model that draws nothing", async () => {
    const bytes = await sdfmod([]);
    await expect(readModelFile("empty", bytes)).rejects.toThrow(
      /no operations/,
    );
  });
});

describe("ModelLibrary", () => {
  it("gives every instance of a model the same geometry", async () => {
    // **The whole reason this is a library, and the thing that would be quietly undone by a
    // `geometry` field on the model.** A place with forty instances of one fridge pays for it
    // once; if each instance cloned the geometry it would pay for it forty times, which is the
    // sort of cost that never shows up in a test that only places one.
    const library = await ModelLibrary.from({
      "can.sdfmod": await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]),
    });
    const model = library.get("can.sdfmod")!;

    expect(library.size).toBe(1);
    // The same *model* every read, which is the first half.
    expect(library.get("can.sdfmod")).toBe(model);
    expect(library.has("can.sdfmod")).toBe(true);
    expect(library.has("nothing")).toBe(false);
    expect(library.get("nothing")).toBeUndefined();

    // And twelve instances, which is the second half: **one geometry, twelve meshes.**
    const instances = Array.from({ length: 12 }, () => model.draw(MATERIAL));
    expect(instances.every((mesh) => mesh !== undefined)).toBe(true);
    const geometries = new Set(instances.map((mesh) => mesh!.geometry));
    expect(geometries.size, "twelve instances, one geometry").toBe(1);

    // **And the meshes are still separate objects**, because a `Mesh` carries a transform and
    // two instances sharing one would be one thing standing in two places.
    expect(new Set(instances).size).toBe(12);

    instances[0]!.position.set(10, 0, 0);
    expect(instances[1]!.position.x).toBe(0);
  });

  it("keeps a bad model from taking the good ones with it", async () => {
    // **A place attaching forty models should not fail to open over one of them.** The
    // alternative is that a file somebody has not looked at in years decides whether the whole
    // place runs.
    const good = await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]);
    const library = await ModelLibrary.from({
      "can.sdfmod": good,
      "broken.sdfmod": new TextEncoder().encode("this is not a zip"),
    });

    expect(library.size).toBe(1);
    expect(library.has("can.sdfmod")).toBe(true);
    expect(library.has("broken.sdfmod")).toBe(false);
    expect(library.problems).toHaveLength(1);
    expect(library.problems[0]!.name).toBe("broken.sdfmod");
    expect(library.problems[0]!.reason).toBeTruthy();
  });

  it("names every model in the order it was given them", async () => {
    const library = await ModelLibrary.from({
      "b.sdfmod": await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]),
      "a.sdfmod": await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]),
    });
    // **Insertion order rather than sorted**, so the report a person reads names the files in
    // the order the manifest did.
    expect(library.names()).toEqual(["b.sdfmod", "a.sdfmod"]);
  });

  it("forgets every model when it is disposed, so nothing is left on the GPU", async () => {
    const library = await ModelLibrary.from({
      "can.sdfmod": await sdfmod([capsule(0, { x: 0, y: 0, z: 0 })]),
    });
    expect(library.size).toBe(1);

    library.dispose();
    // **A geometry is kept by the renderer's buffer map for as long as the renderer lives**, so
    // merely dropping the library would hold every model's buffers for the rest of the session.
    expect(library.size).toBe(0);
    expect(library.get("can.sdfmod")).toBeUndefined();
  });
});

describe("FIGURE_MESH_BUDGET", () => {
  it("samples a figure far finer than the landscape does, and says why in numbers", () => {
    // **A tenth of a terrain voxel.** This is the resolution question, and the test is that the
    // ratio is written down: a figure is the thing a person stands next to, and at the
    // landscape's own `VOXEL_SIZE` of ten a soda can would be a single sample.
    expect(FIGURE_MESH_BUDGET.voxelSize).toBe(1);
    // A ceiling that keeps forty-one models inside a load, and a floor that stops a coin being
    // one cell — which is one vertex, and a vertex with no faces to average a normal from.
    expect(FIGURE_MESH_BUDGET.maxSamplesPerAxis).toBeGreaterThanOrEqual(8);
    expect(FIGURE_MESH_BUDGET.minSamplesPerAxis).toBeGreaterThanOrEqual(4);
  });
});
