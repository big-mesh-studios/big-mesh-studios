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
 * **After the world and before the gizmo handles.** The handles set `depthTest` to false and
 * rely on being traversed last to be visible at all (ADR 0051), so a highlight added after
 * them would be drawn under them whichever way round the scene list went.
 *
 * ## Why it is a box and not the shape
 *
 * The box is cheaper, needs no per-primitive branch, and stays legible when the shape inside
 * it is a sphere. It is the primitive's own half-extents read straight out of the primitive
 * table (`picking.ts`), which is what keeps an editor offering nine shapes from having nine
 * box shapes to keep in step.
 *
 * **It is turned with the thing it surrounds.** An un-turned box around a wall lying at 45°
 * is a box much larger than the wall, and a selection that grows as its subject is turned
 * reads as a bug rather than as a box. rmsl applies scale, then rotation, then translation,
 * so a unit cube scaled to twice `half` and turned about its own middle stays centred on the
 * shape's origin.
 *
 * The colour is voxelscape's, and its opacity is deliberate: translucent enough to see the
 * surface through, solid enough to find from across a room.
 */

import { BoxGeometry, Mesh, MeshBasicMaterial } from "@random-mesh/rmsl/scene";
import { Color } from "@random-mesh/rmsl/scene";
import type { Scene } from "@random-mesh/rmsl/scene";
import type { Vec3 } from "@big-mesh-studios/core";

import { figureBox, shapeBox, type OrientedBox } from "./picking";
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

/**
 * The box to draw around whatever is selected.
 *
 * **A shape's from its primitive and a figure's from its model, which are the two things
 * that actually know how big each is.** Neither is something the level file carries — a level
 * says where a figure stands and which model it is — so this asks rather than assumes, and
 * a shape's answer comes from the primitive table rather than from a second list of
 * primitives here.
 *
 * **A figure's yaw is applied**, which it was not before ADR 0051. An upright box around a
 * turned prop was documented as "a forgiving direction"; now that a turned thing can be drawn
 * turned, an upright box round it is just a box round the wrong shape.
 */
export const highlightBounds = (
  item: LevelShape | LevelFigure,
  half?: Vec3,
): OrientedBox =>
  item.kind === "shape" ? shapeBox(item) : figureBox(item, half);

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
  show(bounds: OrientedBox): void;
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
    show(bounds: OrientedBox): void {
      mesh.position.set(bounds.centre.x, bounds.centre.y, bounds.centre.z);
      // **The geometry is a unit cube, so the scale is the box's own reach**, doubled.
      // The floor stops a figure whose model has no extent on one axis becoming invisible,
      // which would read as a selection that stopped taking rather than as a bad model.
      mesh.scale.set(
        Math.max(bounds.half.x * 2, 0.001),
        Math.max(bounds.half.y * 2, 0.001),
        Math.max(bounds.half.z * 2, 0.001),
      );
      // **After the scale and before the translation, by rmsl's own order**, so the box turns
      // about its own middle and stays centred on the shape's origin rather than swinging
      // away from it.
      mesh.quaternion.set(
        bounds.orientation.x,
        bounds.orientation.y,
        bounds.orientation.z,
        bounds.orientation.w,
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
