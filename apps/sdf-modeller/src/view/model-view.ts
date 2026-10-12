/**
 * Putting a model's mesh on the screen, and taking the old one off it first.
 *
 * ## Why this is twenty lines and not a shared package
 *
 * **Because it is twenty lines.** `packages/meshing` hands back a packed `ChunkMesh` —
 * twenty bytes a vertex — and turning that into rmsl's `BufferGeometry` is three attribute
 * calls and an index. The alternative is a package that exists to wrap three calls, whose
 * only content is an rmsl dependency that `packages/meshing` deliberately does not have
 * (ADR 0024: meshing returns vertex data, not node graphs).
 *
 * ## Why the outgoing geometry is disposed *before* the new one is built
 *
 * **So a slot is never holding two sets of buffers even momentarily**, and so a rebuild
 * that throws leaves the model with nothing rather than with something that does not
 * match its parts. The second half is the one that matters: a mesh on screen that does not
 * correspond to the model is a lie a person cannot see through, and it is exactly what a
 * half-finished rebuild would leave behind.
 *
 * ## Why the texture coordinates are an argument and not part of the mesh
 *
 * **Because `ChunkMesh` is twenty bytes a vertex and stays that way.** Texture coordinates
 * are two more numbers a vertex, which for a model nobody is painting is a megabyte of
 * nothing; they are a parallel array the caller owns and hands over, and `toGeometry`
 * binds a `uv` attribute only when one is given. A model with no texture therefore costs
 * exactly what it cost before, which is the whole of ADR 0048's argument for leaving the
 * vertex at twenty bytes.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  type Object3D,
} from "@random-mesh/rmsl/scene";
import type { ChunkMesh } from "@big-mesh-studios/meshing";

import type { MeshResult } from "../model/mesh-model";
import type { TextureBake } from "../unwrapping/bake";
import type { PaintSurface } from "../unwrapping/paint-surface";
import type { PaintField } from "../unwrapping/paint-field";
import { modelMaterial } from "./model-material";

/**
 * rmsl geometry from a packed mesh.
 *
 * **`undefined` for a mesh with no vertices**, which is different from a mesh that failed:
 * the caller draws nothing rather than installing an empty geometry that will still cost
 * a draw call and still be wrong if the model changes.
 *
 * **The `uv` attribute is bound only when `uvs` is given**, and that conditional is the point of
 * the parameter: no texture means no array allocated, no attribute bound and no shader reading
 * one, so an untextured model is byte-for-byte what it was.
 */
export const toGeometry = (
  mesh: ChunkMesh,
  uvs?: Float32Array,
): BufferGeometry | undefined => {
  if (mesh.vertexCount === 0) return undefined;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(mesh.positions, 3, false, "vertex"),
  );
  geometry.setAttribute(
    "normalOct",
    new BufferAttribute(mesh.normalOct, 2, true, "vertex"),
  );
  geometry.setAttribute(
    "colour",
    new BufferAttribute(mesh.colours, 4, true, "vertex"),
  );
  if (uvs !== undefined) {
    geometry.setAttribute("uv", new BufferAttribute(uvs, 2, false, "vertex"));
  }
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  return geometry;
};

export interface ModelView {
  /** The mesh on screen, or undefined when the model has nothing to draw. */
  readonly mesh: () => Mesh | undefined;
  readonly triangles: () => number;
  /**
   * Swaps in a new mesh. Passing `undefined` for the result removes what is there.
   *
   * **Rebuilding the material is the price of carrying the texture.** A material compiles its
   * sampler only if a texture exists when it is built, so a bake arriving has to rebuild one —
   * and a rebuild therefore hands back the blend rather than expecting it to have survived.
   */
  readonly install: (
    result: MeshResult | undefined,
    options: InstallOptions,
  ) => void;

  /**
   * Pushes a freshly painted atlas to the GPU, if it has changed.
   *
   * **On the view rather than reached through `mesh()?.material`,** because the material is
   * replaced on every install and the caller that owns the atlas is the one that should not have
   * to know a mesh exists to find it. It is also a per-frame call, and doing a field walk and an
   * optional chain sixty times a second to reach a method that mostly does nothing is the kind of
   * thing that reads as a bug later.
   */
  readonly sync: (
    surface: PaintSurface | undefined,
    field?: PaintField,
  ) => void;

  /**
   * Puts a field on the material already on screen.
   *
   * **Separate from `install` because a field is made on the first stroke, not on load.** A
   * field is sized to the painted area, so an untouched document has none — and rebuilding the
   * whole model to attach one would remesh and reinstall a figure in order to add a sampler to
   * a material that is already compiled and correct.
   *
   * Attaching changes what the material samples, so **this costs a recompile**; that is the
   * same price `attach` pays and for the same reason — the samplers are decided when the
   * material is built, and a field appearing is a change of what is true.
   */
  readonly attachField: (field: PaintField | undefined) => void;
  readonly dispose: () => void;
}

/** What an install is told beyond the mesh itself. */
export interface InstallOptions {
  /**
   * Whether anything in the model is translucent.
   *
   * **Passed rather than derived from the mesh, because a mesh cannot say.** Every vertex
   * carries an alpha either way, and the packed format's fourth byte is opaque for a model with
   * no transparency in it. An always-transparent material would put a fully opaque model into
   * the transparent queue with depth writes off, which is the arrangement that makes a solid
   * self-overlap wrongly.
   */
  readonly translucent: boolean;

  /**
   * The model's baked texture, when it has one.
   *
   * **Passed rather than held**, because it arrives with the rebuild that produced the mesh it
   * belongs to, and holding it would be holding coordinates that no longer match what is on
   * screen the moment the next rebuild lands.
   */
  readonly bake?: TextureBake;

  /**
   * How much of the texture replaces the part colour rather than tinting it, `0..1`.
   *
   * **Passed rather than held for the same reason the material is rebuilt at all.** An install
   * makes a new material, and a blend left on the old one would silently reset to modulate on
   * every rebuild — which is to say, on every edit, which is the first time somebody would notice
   * and the worst time to notice.
   */
  readonly blend?: number;

  /**
   * The paint field, when the model has one.
   *
   * **Passed rather than held, like `bake`** — but for a stronger reason: the field is the
   * thing being written to *while* the model is drawn, and holding it here would mean holding a
   * reference to the object the brush is mutating, which is how a material ends up pointing at
   * a field from two models ago.
   */
  readonly field?: PaintField;
}

/**
 * `parent` is where the mesh is put, rather than the scene itself.
 *
 * **Because the move handles have to be drawn after it and the renderer draws in scene-graph
 * order.** Both live under the scene, but the caller adds the mesh's own group first and the
 * handles group second. A rebuild re-adds the mesh, and adding it straight to the scene would
 * put it after the handles and paint the model over the arrows; giving it this group means a
 * rebuild can only reorder children inside the group, never overtake the handles.
 */
export const createModelView = (parent: Object3D): ModelView => {
  let geometry: BufferGeometry | undefined;
  let drawn: Mesh | undefined;
  let triangles = 0;
  /** The material on screen, so a bake can be attached to it without rebuilding the mesh. */
  let material: ReturnType<typeof modelMaterial> | undefined;

  const release = (): void => {
    // Guarded rather than passed through, because `parent.remove` takes a non-optional
    // `Object3D` and there is nothing to remove before the first install.
    if (drawn !== undefined) parent.remove(drawn);
    geometry?.dispose();
    // **The material is dropped rather than disposed**, because rmsl's `Material` has no
    // `dispose` — only textures and geometries do. The texture it may hold is disposed with
    // the bake that owns it, so nothing here leaks GPU memory.
    geometry = undefined;
    drawn = undefined;
    material = undefined;
    triangles = 0;
  };

  return {
    mesh: () => drawn,

    triangles: () => triangles,

    install: (result, options) => {
      // **Disposed first, before the new geometry is even built.** See the header.
      release();
      const { translucent, bake, blend, field } = options;
      if (result === undefined) return;
      // **The coordinates are carried onto the mesh being installed, not read off the bake.**
      // The bake's own coordinates belong to the reference mesh and there is one coordinate a
      // vertex of this mesh for every one of that mesh's vertices, not for its own — this is the
      // whole of `./mesh/uv-transfer`, and doing it here rather than in the caller is what keeps
      // the two meshes' vertex orders from being confused anywhere.
      const carried = bake?.carry(result.mesh);
      const built = toGeometry(result.mesh, carried?.uvs);
      if (built === undefined) return;
      geometry = built;
      material = modelMaterial(translucent, blend);
      drawn = new Mesh(built, material);
      if (bake !== undefined) material.attach(bake.surface);
      // **After the atlas, so a field wins if both are somehow present.** The two cannot both
      // be right: the atlas carries coordinates pinned to a mesh and the field carries none, and
      // a material sampling both would draw the atlas's paint in the field's places.
      if (field !== undefined) material.attachField(field);
      parent.add(drawn);
      triangles = result.triangles;
    },

    attachField: (field) => {
      // **Guarded rather than passed through**, for the reason `sync` is: before the first
      // install there is no material, and a stroke cannot have happened without one.
      if (material === undefined) return;
      material.attachField(field);
    },

    sync: (surface, field) => {
      // **Through the current material, which may be none.** Before the first install there is
      // nothing to upload to, and no stroke can have happened without one, so this is a no-op
      // rather than an error.
      material?.sync(surface, field);
    },

    dispose: release,
  };
};
