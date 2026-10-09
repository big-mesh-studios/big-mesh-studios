/**
 * The models a place attached, turned into something that can be stood in the world.
 *
 * ## What an attachment is
 *
 * **A `.sdfmod` file: a zip of `manifest.json` and `model.bin`.** That format is written by
 * `apps/sdf-modeller` and its rules live in `@big-mesh-studios/csg` as `model-file.ts`, because
 * the modeller saves them and this reads them and two copies of a format's rules is two things
 * to keep in step. A model has **no name of its own** — no id, no UUID, no content hash — so
 * its *name is its path in the place's manifest*, and that is the only handle there is. ADR 0033
 * is about a project file not being able to say what it is; this is where that bites.
 *
 * ## Meshing is once per model, not once per instance
 *
 * **The whole reason this is a library rather than a call.** A place that stands thirty-nine
 * props and two NPCs has forty-one models and possibly several hundred instances, and a fridge
 * is a fridge whether there is one of it or twelve. The operations, the field, the bounds and the
 * GPU buffers are therefore all built once, here, and every instance is a transform on the same
 * geometry. That is also what makes a figure movable: an NPC's position is a matrix, so walking
 * one costs a write rather than an operation-list rewrite and a re-mesh. ADR 0047.
 *
 * ## Two different shapes, for two different questions
 *
 * **A figure is answered by its own field when something looks at it and by its own box when
 * something walks into it.** Picking sphere-traces `FigureModel.field`, so the cursor goes
 * *through* a gap in the vending machine's shelf and finds the fridge behind it — the same answer
 * the pixels would give. Collision uses `FigureModel.half`, a yaw-aligned box, because the
 * physics asks the question several times a frame per player corner and cannot afford a field
 * trace; a box is a box and the honest consequence is that you cannot stand inside a bench's
 * gap. Two answers to two questions, recorded rather than reconciled.
 *
 * ## Why meshing happens on this thread
 *
 * **Because it is once per model, at load, and the budget bounds it.** The alternative is the
 * chunk worker pool, whose protocol is shaped around chunk cells and LOD strides and would need
 * a second message type for a box with no LOD. A place with thirty-nine models meshes in a few
 * tens of milliseconds at `FIGURE_MESH_BUDGET`, which is a hitch on a deliberate `/place:load`
 * and not a per-frame cost. If it ever stops being a few tens of milliseconds the budget is the
 * first thing to turn and a worker is the second.
 */

import type { Material } from "@random-mesh/rmsl/scene";
import { Mesh } from "@random-mesh/rmsl/scene";

import type { Bounds, Vec3 } from "@big-mesh-studios/core";
import {
  Field,
  OperationBVH,
  PROJECT_MANIFEST_FILE,
  PROJECT_MODEL_FILE,
  boundsOf,
  deserialiseOperations,
  isProjectManifest,
  type Operation,
} from "@big-mesh-studios/csg";
import {
  budgetFor,
  meshModel,
  type MeshBudget,
  type MeshMode,
} from "@big-mesh-studios/meshing";

import { toChunkGeometry } from "../render/chunk-geometry";
import { VOXEL_SIZE } from "../constants";

/**
 * How finely a figure is meshed.
 *
 * **A tenth of a terrain voxel, and derived rather than chosen.** `VOXEL_SIZE` is ten world
 * units, so this samples a figure every world unit — which puts a soda can twelve units tall at
 * about a dozen samples on its long axis and a car at thirty. That is the resolution the
 * landscape itself would use for something a person is standing next to, and it is a long way
 * from the quarter-unit the modeller uses for a model being *edited*, which is the right answer
 * there and the wrong one here: nobody is looking at a fridge from four units away with the
 * intention of moving a vertex.
 *
 * **The ceiling is a time budget rather than a fidelity one.** At `FIGURE_MAX_SAMPLES` the
 * sampling pass is a little over a hundred thousand field evaluations, and forty-one of those is
 * a few tens of milliseconds. A larger model is meshed coarser rather than not at all, which is
 * the right trade for a *bed* and a wrong one for a face somebody is about to press against.
 */
export const FIGURE_VOXEL_SIZE = VOXEL_SIZE / 10;
export const FIGURE_MAX_SAMPLES = 48;
export const FIGURE_MIN_SAMPLES = 6;

/** The budget every figure in this library is meshed at. */
export const FIGURE_MESH_BUDGET: MeshBudget = budgetFor(FIGURE_VOXEL_SIZE, {
  voxelSize: FIGURE_VOXEL_SIZE,
  maxSamplesPerAxis: FIGURE_MAX_SAMPLES,
  minSamplesPerAxis: FIGURE_MIN_SAMPLES,
});

/**
 * One model, ready to be placed any number of times.
 *
 * **Everything here is in the model's own frame**, origin at the model's origin and no rotation
 * applied. An instance's transform belongs to the instance, and keeping the two apart is what
 * lets two fridges share this object.
 *
 * **Not a class, so that nothing can be added to it after the fact** — a `FigureModel` is what
 * reading a file produced, and there is no second way to produce one.
 */
export interface FigureModel {
  /** The name the place's manifest gave it. The only identity a model has. */
  readonly name: string;
  /** The operations it is, as read out of `model.bin`. Kept for anything that wants the list. */
  readonly operations: readonly Operation[];
  /** The same model as a field, which is what a pick traces. */
  readonly field: Field;
  /** Its world box in its own frame, padded for picking. See `readModelFile`. */
  readonly bounds: Bounds;
  /**
   * Half its box, for collision.
   *
   * **The box and not the field, deliberately.** `getSolidAt` runs several times a frame per
   * player corner and a field trace per figure per call does not fit in a frame; a yaw-aligned
   * box is three subtractions. The cost is that a figure's holes are solid, which is the
   * conservative direction and matches what the player sees standing in front of it.
   */
  readonly half: Vec3;
  /** How many triangles it is, for a readout and for the budget test. */
  readonly triangles: number;
  /**
   * A new `Mesh` over this model's own geometry, or `undefined` when the model has no surface.
   *
   * **This is the only way to get a `Mesh` out of a model, and that is the point.** Every
   * instance shares one `BufferGeometry` — the buffers, the typed arrays and the vertex count
   * are paid for once when the file is read and every instance is a `Mesh` over them, which is
   * what "a fridge is a fridge whether there is one of it or twelve" means in practice. A
   * `BufferGeometry.clone()` anywhere would silently undo it, and it is a tempting line to
   * write because a per-instance geometry is what a per-instance colour or a morph target
   * would need. **None of those are wanted here**: a figure's appearance is its model's, and
   * the one thing an instance owns is a transform, which is three numbers on a `Mesh`.
   *
   * **Meshes are not cached either**, and deliberately: a `Mesh` carries its own position,
   * rotation and scale, so two instances sharing one `Mesh` would be one thing in two places.
   * The geometry is shared and the transforms are not, and this function is where that is said
   * rather than repeated at every call site that might get it wrong.
   */
  draw(material: Material): Mesh | undefined;

  /**
   * Frees the model's GPU buffers.
   *
   * **On the model rather than on the library's loop, so that the geometry is only ever
   * reached from the closure that owns it.** `render/chunk-geometry.ts` records the rule this
   * follows: a geometry is held by the renderer's buffer map for as long as the renderer lives,
   * keyed by object, so a model that is merely dropped keeps its buffers — and the typed arrays
   * they point at — for the rest of the session.
   */
  dispose(): void;
}

/** A model that could not be read, and why. Carried rather than thrown, because a place with
 * one bad attachment among forty should still run. */
export interface ModelProblem {
  readonly name: string;
  readonly reason: string;
}

/**
 * Reads one `.sdfmod` into a `FigureModel`.
 *
 * **Everything it can refuse, it refuses by name.** A place attaching forty models should not
 * fail to load because one of them is a text file somebody renamed; the caller gets a
 * `ModelProblem` for that one and a library for the other thirty-nine.
 */
export const readModelFile = async (
  name: string,
  bytes: Uint8Array,
  budget: MeshBudget = FIGURE_MESH_BUDGET,
  mode: MeshMode = "marching-cubes",
): Promise<FigureModel> => {
  // **`jszip` imported here rather than at the top of the module**, for the reason
  // `load-place.ts` gives: a hundred kilobytes that nothing on the first frame needs, and a
  // place without models should not pay for it.
  const { default: JSZipCtor } = await import("jszip");
  const zip = await JSZipCtor.loadAsync(bytes);

  const manifestEntry = zip.file(PROJECT_MANIFEST_FILE);
  if (manifestEntry === null) {
    throw new Error(`no ${PROJECT_MANIFEST_FILE} at the model's root`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await manifestEntry.async("text"));
  } catch {
    throw new Error(`${PROJECT_MANIFEST_FILE} is not valid JSON`);
  }
  if (!isProjectManifest(parsed)) {
    throw new Error(
      `${PROJECT_MANIFEST_FILE} is not a model manifest this build can open`,
    );
  }

  const modelEntry = zip.file(PROJECT_MODEL_FILE);
  if (modelEntry === null) {
    throw new Error(`no ${PROJECT_MODEL_FILE} at the model's root`);
  }
  const operations = deserialiseOperations(
    await modelEntry.async("arraybuffer"),
  );

  // **The manifest's `ids` are checked against the model, for the reason the modeller's own
  // reader checks them.** Position is the only thing joining the two arrays, so a manifest that
  // names a different number of parts describes a model this application cannot represent.
  if (parsed.ids.length !== operations.length) {
    throw new Error(
      `the manifest names ${parsed.ids.length} parts and ${PROJECT_MODEL_FILE} holds ${operations.length}`,
    );
  }

  if (operations.length === 0) {
    throw new Error("the model has no operations in it");
  }

  // **Padded by the voxel size rather than left tight**, because `meshRegion` derives its
  // sample count from this box and a box flush against its own surface puts every flat face
  // exactly on a sample — which resolves nothing. `meshRegion` pads again on top of this; the
  // padding here is what keeps `bounds` usable as a pick's reach.
  const bounds = boundsOf(operations, budget.voxelSize * 4);
  if (bounds === undefined) {
    throw new Error("the model has no surface in its own box");
  }

  const result = meshModel(operations, budget, mode);
  const mesh = result?.mesh;
  // **Held in a closure rather than exposed as a field.** A `geometry` property is something a
  // caller can read, and a readable `BufferGeometry` is a `BufferGeometry` somebody will
  // `clone()` — which copies the buffers and quietly undoes the only reason this is a library.
  // `draw` is the whole of the interface: it hands out a `Mesh` and keeps the geometry itself.
  const geometry = mesh === undefined ? undefined : toChunkGeometry(mesh);

  return {
    name,
    operations,
    field: new Field(new OperationBVH(operations), {
      base: () => Infinity,
      // **The mesher's own spacing, and the reason is written down in `model-mesh.ts`.** A
      // gradient taken across a step much wider than a voxel reads every crease on the model
      // and points at none of them; only a handful of vertices fall back to the field, but
      // those are the ones on a surface thinner than a cell and they are exactly the ones
      // that would be visibly wrong.
      step: result?.region.sampleSize ?? budget.voxelSize,
    }),
    bounds,
    half: {
      x: (bounds.max.x - bounds.min.x) / 2,
      y: (bounds.max.y - bounds.min.y) / 2,
      z: (bounds.max.z - bounds.min.z) / 2,
    },
    triangles: mesh?.triangleCount ?? 0,
    draw: (material: Material): Mesh | undefined =>
      geometry === undefined ? undefined : new Mesh(geometry, material),
    dispose: (): void => geometry?.dispose(),
  };
};

/**
 * Every model a place attached, by the name it attached them under.
 *
 * **Read once and held for the place's life**, because the alternative — a map from name to
 * bytes, meshed on every `createProp` — would mesh the same fridge every time one was placed.
 * A name that was never attached has no entry and `get` says so, which is the answer a script
 * naming a model that is not there should get: not a throw, and not a silent prop that draws
 * nothing.
 */
export class ModelLibrary {
  private readonly byName: Map<string, FigureModel> = new Map();
  /** What could not be read, so `/place:state` and a test can both ask. */
  readonly problems: readonly ModelProblem[];

  private constructor(
    models: ReadonlyMap<string, FigureModel>,
    problems: readonly ModelProblem[],
  ) {
    for (const [name, model] of models) this.byName.set(name, model);
    this.problems = problems;
  }

  /**
   * Reads every attachment, in the order the manifest named them.
   *
   * **One refusal does not stop the rest.** A place with thirty-nine models and one bad file
   * loads thirty-eight of them and reports the one; the alternative is a place that will not
   * open at all over a file the person probably has not looked at in years.
   */
  static async from(
    entries: Readonly<Record<string, Uint8Array>>,
    budget: MeshBudget = FIGURE_MESH_BUDGET,
  ): Promise<ModelLibrary> {
    const models = new Map<string, FigureModel>();
    const problems: ModelProblem[] = [];

    for (const [name, bytes] of Object.entries(entries)) {
      try {
        models.set(name, await readModelFile(name, bytes, budget));
      } catch (error) {
        problems.push({
          name,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new ModelLibrary(models, problems);
  }

  /** The model with that name, or `undefined` when the place attached nothing by it. */
  get(name: string): FigureModel | undefined {
    return this.byName.get(name);
  }

  /** Whether a name is attached. Cheaper than `get` for a check that only wants a yes. */
  has(name: string): boolean {
    return this.byName.has(name);
  }

  /** How many models this library holds, for a readout. */
  get size(): number {
    return this.byName.size;
  }

  /** Every name, in the order they were attached. */
  names(): readonly string[] {
    return [...this.byName.keys()];
  }

  /**
   * Frees every model's GPU buffers.
   *
   * **Called when the place is dropped, and not left to the renderer.** A geometry is kept by
   * the renderer's buffer map for as long as the renderer lives, keyed by object, so a model
   * that is merely dropped is still held — with its buffers and its typed arrays — for the rest
   * of the session. `render/chunk-geometry.ts` documents the same rule for chunks.
   */
  dispose(): void {
    for (const model of this.byName.values()) model.dispose();
    this.byName.clear();
  }
}

// **The path-traversal rules are not repeated here.** `place-file.ts`'s `isSafePathName` is the
// whole of them and a caller that has a manifest checks its names with that before they reach
// this module, which is handed a map of bytes whose names have already been read. A second copy
// of a traversal check is the one duplication in this file that would be a security defect rather
// than a maintenance one.
export {};
