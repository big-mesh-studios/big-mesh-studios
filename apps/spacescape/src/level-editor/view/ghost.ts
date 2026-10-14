/**
 * The copy of a level item being moved, shown where it is going.
 *
 * **Ported from `apps/sdf-modeller/src/view/ghost.ts`**, with the source of the mesh changed
 * to fit this editor's two kinds of item.
 *
 * ## Why a ghost and not the real thing moving
 *
 * **Because a level edit re-meshes the world, and the world is not the thing being edited.**
 * sdf-modeller's model is a signed distance field folded in a worker and meshed by Surface
 * Nets; this editor's shapes fold into a *place* and the chunks holding them are re-meshed by
 * the worker pool. Writing the store on every pointer move would ask the mesher for a new
 * set of chunks sixty times a second, each one cancelling the one before it — and it would
 * put sixty entries on the undo stack.
 *
 * So the item stays where it is and a copy of it follows the pointer. The level is not
 * touched until the drag ends, at which point there is exactly one apply and exactly one undo
 * step. `apply-level.ts` records the same property from the other end: an edit that changes a
 * shape's parameters keeps its fold index, so a drag's one write is a cheap one.
 *
 * ## Why the copy is built once and then moved or turned
 *
 * **Because neither a move nor a turn changes its shape.** The ghost is the same primitive as
 * the item, and a drag along one axis cannot change its size, nor can a drag round one ring —
 * so the mesh is right the moment it is built and stays right for every frame of either drag.
 * What a drag costs per frame is a position write or a quaternion write.
 *
 * **The mesh is built in the primitive's own frame**, with the item's turn carried on this
 * object rather than baked into the vertices. A move drag sets the position and leaves the
 * turn; a rotate drag turns the quaternion. Baking the orientation into the mesh would make a
 * rotate drag re-mesh on every frame, which is the whole cost this avoids — which is why
 * `shapeGhostMesh` hands `primitiveMesh` the identity rather than the shape's own turn.
 *
 * ## Why there is a group, and not a mesh added to the scene
 *
 * **Because rmsl draws in scene-graph order and a mesh re-added to the scene lands at the
 * end of it** ([ADR 0014](../../../../docs/adr/0014-the-sky-dome-is-drawn-first.md)). The
 * gizmo handles set `depthTest` to false and rely on being traversed *last* to be visible at
 * all, so a ghost added straight to the scene would draw over the arrows being dragged the
 * second time somebody dragged something. This owns a `Group` added once, at construction,
 * and swaps the mesh inside it — so its place in the scene is fixed by the order the caller
 * creates these in, and a drag cannot move it.
 *
 * ## Why it is drawn unlit, translucent, and without depth writes
 *
 * **Because it is a proposal, not a fact.** The level on screen is the level; this is what it
 * would look like if the pointer were let go. Unlit keeps it the item's own colour rather
 * than a shaded solid that could be mistaken for a second one; translucent keeps the item
 * underneath visible, so it is obvious that the original has not moved. Depth writes off is
 * what lets two of them overlap without either punching a hole in the other.
 */
import {
  Blending,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Material,
  type Scene,
} from "@random-mesh/rmsl/scene";

import type { Quat, Vec3 } from "@big-mesh-studios/core";
import { primitiveMesh } from "@big-mesh-studios/meshing";

import { toChunkGeometry } from "../../render/chunk-geometry";
import { placeOperation } from "../../places/place-registry";
import { FIGURE_MESH_BUDGET } from "../../places/model-library";
import type { LevelShape } from "../../places/level/types";

/**
 * Between a half and three-quarters, rather than very faint.
 *
 * Too faint and the ghost cannot be seen against a dark background, which is most of this
 * world's background; opaque and it stops reading as a proposal and starts reading as a
 * second item. It is also drawn over the item it is a copy of, so it has to hold its own
 * against that item's own shading.
 */
const GHOST_OPACITY = 0.65;

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

/** The part of a geometry `dispose` needs, without taking on rmsl's whole type. */
type BufferLike = { dispose(): void };

export interface Ghost {
  /**
   * The material the ghost is drawn in, for a caller building a mesh to `show`.
   *
   * **Exposed rather than built here**, because the two kinds of item get their mesh from
   * two different places — a shape is meshed on demand, a figure's model already holds one —
   * and neither of those belongs in a module whose whole job is moving a `Mesh`.
   */
  readonly material: Material;
  /**
   * Shows `mesh` at the item's place, and follows it until it is hidden.
   *
   * `ownGeometry` says whether `hide` should free the geometry. **It is not a detail**: a
   * shape's ghost geometry is built per drag and belongs to nobody else, while a figure's is
   * the model's own, shared by every placement of it and freed only by the library
   * ([ADR 0047](../../../../docs/adr/0047-a-figure-is-its-own-mesh.md)). Disposing the shared
   * one takes the model's furniture out of the world.
   */
  readonly show: (mesh: Mesh | undefined, ownGeometry: boolean) => void;
  /** Moves the ghost. Separate from `show` because this is what a move drag does per frame. */
  readonly moveTo: (centre: Vec3) => void;
  /** Turns the ghost. Separate from `show` because this is what a rotate drag does per frame. */
  readonly turnTo: (orientation: Quat) => void;
  readonly hide: () => void;
  readonly dispose: () => void;
}

/**
 * Adds a ghost's own group to `scene`.
 *
 * **Between the highlight and the handles.** The highlight draws over the world, and the
 * handles draw over the highlight because their depth test is off. The ghost is a proposal
 * over both, so this is where it goes — see the header on the group.
 */
export const createGhost = (scene: Scene): Ghost => {
  const group = new Group();
  scene.add(group);

  const material = new MeshBasicMaterial({});
  material.transparent = true;
  material.blending = Blending.NormalBlending;
  material.depthWrite = false;
  material.opacity = GHOST_OPACITY;

  let drawn: Mesh | undefined;
  let owned: BufferLike | undefined;

  /** One function called from two places, for the reason the sibling's release is one. */
  const release = (): void => {
    if (drawn !== undefined) group.remove(drawn);
    // **Only a geometry this ghost built.** A figure's ghost is drawn over the model's own
    // geometry and freeing it would take every other placement of that model out of the
    // world with it.
    owned?.dispose();
    owned = undefined;
    drawn = undefined;
  };

  return {
    material,

    show: (mesh, ownGeometry) => {
      release();
      if (mesh === undefined) return;
      drawn = mesh;
      owned = ownGeometry ? mesh.geometry : undefined;
      group.add(mesh);
    },

    moveTo: (centre) => {
      drawn?.position.set(centre.x, centre.y, centre.z);
    },

    turnTo: (orientation) => {
      drawn?.quaternion.set(
        orientation.x,
        orientation.y,
        orientation.z,
        orientation.w,
      );
    },

    hide: release,

    dispose: () => {
      release();
      scene.remove(group);
    },
  };
};

/**
 * The mesh a dragged shape's ghost is drawn from.
 *
 * **One mesh per drag, on this thread, at the figure mesh budget.** `primitiveMesh` forces
 * `Add` and a hard edge, so a `Subtract` wall previews as a wall — a lone subtract folded
 * against a base of `Infinity` comes out as nothing at all, which is a very confusing thing
 * to show somebody dragging a doorway somewhere.
 *
 * **The figure budget, and why not the modeller's.** `FIGURE_MESH_BUDGET` is derived from
 * this world's own `VOXEL_SIZE` (`places/model-library.ts`) and is the same budget a prop
 * standing in this world is meshed at. A level shape is a wall or a crate in the same units,
 * so it is the same question. The cost is a few tens of milliseconds once, on the press that
 * starts the drag — which is the same place sdf-modeller pays it and the same place it is
 * worth paying it, because the alternative is paying it every frame.
 *
 * **Returns `undefined` for a shape with no surface**, so the caller has nothing to draw and
 * the drag still works — a mesh is the proposal's face, not its mechanism.
 */
export const shapeGhostMesh = (
  item: LevelShape,
  material: Material,
): Mesh | undefined => {
  const built = primitiveMesh(
    placeOperation(
      { x: item.at[0], y: item.at[1], z: item.at[2] },
      item.shape,
      item.combine,
      {
        ...(item.softness === undefined ? {} : { softness: item.softness }),
        // **The identity, deliberately.** The turn goes on the ghost as a quaternion so a
        // rotate drag costs one write per frame rather than a re-mesh. See the header.
        orientation: IDENTITY,
      },
    ),
    FIGURE_MESH_BUDGET,
  );
  if (built === undefined) return undefined;
  const geometry = toChunkGeometry(built.mesh);
  if (geometry === undefined) return undefined;
  return new Mesh(geometry, material);
};
