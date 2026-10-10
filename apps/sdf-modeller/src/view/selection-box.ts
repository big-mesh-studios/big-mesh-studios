/**
 * The box drawn around the selected part.
 *
 * ## Why this is a mesh in the scene rather than an outline pass
 *
 * rmsl has no render-order key: **draw order is the order things were added to the scene**
 * ([ADR 0014](../../../../docs/adr/0014-the-sky-dome-is-drawn-first.md)). So a highlight that
 * should draw *over* the model has to be added after it. The model keeps its own group added
 * first and the move and rotate handles are added after this, so the box covers the surface
 * it marks and the controls a person is reaching for still cover the box.
 *
 * ## Why it is a box and not the shape
 *
 * **Because the tap that selected the part was made against its box too** (see `pick-part`),
 * so the thing that lights up is exactly the thing that was hit — a highlight that followed
 * the surface would light up a smaller region than the one a fingertip can select. The box is
 * also cheaper and needs no per-primitive branch.
 *
 * **The box is turned with the part**, which is the one place this departs from the level
 * editor's highlight: a shape there cannot be rotated, and a part here can. An upright box
 * around a part laid on its side would be a loose, wrong-looking outline; setting the mesh's
 * own quaternion to the part's makes the box follow the turn for free.
 */
import {
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  type Scene,
} from "@random-mesh/rmsl/scene";

import type { Part } from "../model/part";
import { partLocalBox } from "./pick-part";

/** The amber the level editor uses, kept so the two editors read as the same tool. */
const HIGHLIGHT_COLOUR = 0xffe066;

/** Translucent, so the surface underneath is still readable through it. */
const HIGHLIGHT_OPACITY = 0.35;

/**
 * A box that draws around the selection, or nothing when there is no selection.
 *
 * **Owns its geometry**, so one `dispose` frees it. rmsl's `MeshBasicMaterial` has no
 * `dispose` — it holds no GPU buffers of its own — so only the geometry is released.
 */
export interface SelectionBox {
  /** Puts the box around `part`, turned to match it. */
  show(part: Part): void;
  /** Hides it. Called on cleanup, so a closed editor does not leave a box in the scene. */
  hide(): void;
  dispose(): void;
}

export const createSelectionBox = (scene: Scene): SelectionBox => {
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
    show(part: Part): void {
      const box = partLocalBox(part);
      // The geometry is a unit cube centred on the origin, so the part's own box becomes a
      // position, a turn and a scale.
      mesh.position.set(part.origin.x, part.origin.y, part.origin.z);
      mesh.quaternion.set(
        part.orientation.x,
        part.orientation.y,
        part.orientation.z,
        part.orientation.w,
      );
      mesh.scale.set(
        Math.max(box.max.x - box.min.x, 0.001),
        Math.max(box.max.y - box.min.y, 0.001),
        Math.max(box.max.z - box.min.z, 0.001),
      );
      mesh.visible = true;
    },

    hide(): void {
      mesh.visible = false;
    },

    dispose(): void {
      scene.remove(mesh);
      geometry.dispose();
    },
  };
};
