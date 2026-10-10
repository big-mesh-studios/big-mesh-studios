/**
 * The box drawn around whatever is selected.
 *
 * ## Why this is a mesh in the scene rather than an outline pass
 *
 * rmsl has no render-order key: **draw order is the order things were added to the scene**
 * ([ADR 0014](../../../../docs/adr/0014-the-sky-dome-is-drawn-first.md)). So a highlight
 * that should draw *over* the terrain has to be added after it, and one that should draw
 * under the figures has to be added before them. That is a property of the scene graph,
 * not of the material, and it is why this is a module with a `createHighlight` that adds
 * itself rather than a component that declares where it goes.
 *
 * `scene-order.test.ts` pins the ordering, because the failure is not a crash: the
 * highlight still draws, just behind the thing it is highlighting, and nothing says so.
 *
 * ## Why it is a box and not the shape
 *
 * The level editor has no rotation and no scale control, so a shape's own bounds are its
 * box — and a box is cheaper, needs no per-primitive branch, and stays legible when the
 * shape inside it is a sphere. A rotated shape would want an oriented box, which is the
 * same change this file would take.
 *
 * The colour is voxelscape's, and its opacity is deliberate: translucent enough to see the
 * surface through, solid enough to find from across a room.
 */

import { BoxGeometry, Mesh, MeshBasicMaterial } from "@random-mesh/rmsl/scene";
import { Color } from "@random-mesh/rmsl/scene";
import type { Scene } from "@random-mesh/rmsl/scene";
import type { Bounds, Vec3 } from "@big-mesh-studios/core";

import { shapeBox } from "./picking";
import type { LevelFigure, LevelShape } from "../../places/level/types";

/** The amber voxelscape uses, kept so the two editors read as the same tool. */
const HIGHLIGHT_COLOUR = 0xffe066;

/** Translucent, so the surface underneath is still readable through it. */
const HIGHLIGHT_OPACITY = 0.35;

/**
 * What the highlight can be drawn around.
 *
 * **A level's position is a three-number tuple, and so is this.** Both `LevelShape.at` and
 * `LevelFigure.at` are `Vec3Like`, because that is what JSON makes of them and what the
 * guest takes — so the highlight reads the same shape and there is no second coordinate
 * convention to convert between. `half` is a `Vec3` because that is what a model's own
 * bounds are, and it comes from the world rather than from the file.
 */
export interface Highlightable {
  readonly at: readonly [number, number, number];
  /** A figure's own size, in world units. Absent for a shape, which has its own box. */
  readonly half?: Vec3;
  readonly yaw?: number;
}

/** The box to draw around whatever is selected. */
export const highlightBounds = (
  item: LevelShape | LevelFigure,
  half?: Vec3,
): Bounds => {
  if (item.kind === "shape") return shapeBox(item);
  // A figure's box is the model's own half-extents, moved to where it stands. The yaw is
  // not applied: an upright box around a turned prop is a slightly larger hit than the
  // prop, which is the forgiving direction, and the alternative is a rotated box for a
  // control the editor does not have.
  const at = pointOf(item);
  const extent = half ?? { x: 1, y: 2, z: 1 };
  return {
    min: { x: at.x - extent.x, y: at.y - extent.y, z: at.z - extent.z },
    max: { x: at.x + extent.x, y: at.y + extent.y, z: at.z + extent.z },
  };
};

const pointOf = (item: Highlightable): Vec3 => ({
  x: item.at[0],
  y: item.at[1],
  z: item.at[2],
});

/**
 * A box that draws around the selection, or nothing when there is no selection.
 *
 * **Owns its geometry and its material**, so one `dispose` frees both. Sharing a geometry
 * across a scene is a deliberate and separate decision (`model-library.ts` makes it for
 * figures, for a per-instance cost model); a single box has no such pressure and sharing
 * would only mean a second thing to reason about when it is torn down.
 */
export interface Highlight {
  /** The mesh, so a caller can position it by hand if it needs to. */
  readonly mesh: Mesh;
  /** Puts the box around `bounds`, or hides it. */
  show(bounds: Bounds): void;
  /** Hides it. Called on cleanup, so a closed editor does not leave a box in the world. */
  hide(): void;
  dispose(): void;
}

/**
 * Adds a highlight to `scene`.
 *
 * **Added last**, so it draws over the terrain, the water, the clouds and the figures. A
 * highlight behind the thing it highlights is worse than no highlight, because it looks
 * like a selection that is not taking.
 */
export const createHighlight = (scene: Scene): Highlight => {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({
    color: new Color(HIGHLIGHT_COLOUR),
    transparent: true,
    opacity: HIGHLIGHT_OPACITY,
  });
  const mesh = new Mesh(geometry, material);
  mesh.visible = false;
  scene.add(mesh);

  return {
    mesh,
    show(bounds: Bounds): void {
      // Centred, and scaled to the full extent — the geometry is a unit cube.
      mesh.position.set(
        (bounds.min.x + bounds.max.x) / 2,
        (bounds.min.y + bounds.max.y) / 2,
        (bounds.min.z + bounds.max.z) / 2,
      );
      mesh.scale.set(
        Math.max(bounds.max.x - bounds.min.x, 0.001),
        Math.max(bounds.max.y - bounds.min.y, 0.001),
        Math.max(bounds.max.z - bounds.min.z, 0.001),
      );
      mesh.visible = true;
    },
    hide(): void {
      mesh.visible = false;
    },
    dispose(): void {
      scene.remove(mesh);
      // **The geometry only.** rmsl's `MeshBasicMaterial` has no `dispose` — it holds no
      // GPU buffers of its own — so calling one would be a line that only ever runs in
      // development and never in a browser.
      geometry.dispose();
    },
  };
};
