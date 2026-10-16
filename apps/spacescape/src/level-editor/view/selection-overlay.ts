/**
 * The one wall segment the segment sub-mode has picked, drawn over the world.
 *
 * ## Why a line of its own rather than recolouring the draft
 *
 * **Because the picked segment is not always part of the draft.** While a wall is being edited
 * the picked edge is one of the draft's own lines, but a delete with no edit session open picks
 * an edge of a stored item — geometry that is meshed, not drawn as a line at all. One overlay
 * that draws the picked edge from wherever it came, in one colour, covers both without the draft
 * needing to know about selection and without a second code path that could disagree.
 *
 * ## Why it is hot pink
 *
 * **Because the draft is warm yellow and the world is green and grey.** A selection that shared
 * the draft's colour would be a highlighted line that looked like an unhighlighted one; the
 * point of the highlight is that the edge about to be deleted is unmistakable at a glance. The
 * colour is a choice and no more, but it is a choice made to be *different* from the thing it
 * sits on top of.
 *
 * Like the draft and the handles, its depth test is off, so an edge on the far side of a hill is
 * still shown while it is selected — and it is added to the scene after the draft so it paints
 * over it (ADR 0014).
 */

import {
  Color,
  LineSegments2,
  LineSegmentsGeometry,
  Line2NodeMaterial,
  type Scene,
} from "@random-mesh/rmsl/scene";

import type { Vec3 } from "@big-mesh-studios/core";

/** The picked edge's colour. See the header for why it is this one. */
const SELECTED_COLOUR = new Color(1, 0.1, 0.55);

/** A little wider than the draft's own two pixels, so it reads as on top of it. */
const SELECTED_WIDTH = 4;

export interface SelectionOverlay {
  /** Draws `a`–`b` as the selected edge, replacing whatever was shown. */
  show(a: Vec3, b: Vec3): void;
  /** Puts the highlight away. */
  hide(): void;
  dispose(): void;
}

export const createSelectionOverlay = (scene: Scene): SelectionOverlay => {
  const geometry = new LineSegmentsGeometry();
  const material = new Line2NodeMaterial();
  material.color = SELECTED_COLOUR;
  material.linewidth = SELECTED_WIDTH;
  material.transparent = true;
  material.opacity = 1;
  // Over the world and over the draft, for the reasons in the header.
  material.depthTest = false;
  material.depthWrite = false;

  const lines = new LineSegments2(geometry, material);
  lines.visible = false;
  scene.add(lines);

  return {
    show(a, b): void {
      geometry.setPositions([a.x, a.y, a.z, b.x, b.y, b.z]);
      lines.computeLineDistances();
      lines.visible = true;
    },

    hide(): void {
      lines.visible = false;
    },

    dispose(): void {
      scene.remove(lines);
      geometry.dispose();
    },
  };
};
