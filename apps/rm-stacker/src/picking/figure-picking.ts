// What the pointer meets in the preview, held for whoever asks. Everything
// picking is made of stands in this folder: the marcher that walks one volume,
// the ray followed through a whole figure, the outline drawn round what it
// meets, and this, which is the piece the view asks. The view says how it is
// looking at the figure and hands over a pointer; it reads back the voxel that
// was met and the part holding it.
import { Matrix3x3, Vector3D, type RGBA } from "@big-mesh-studios/maths";
import type {
  FigureFraming,
  PartPlacement,
  SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import { createSignal } from "solid-js";
import { LIGHT_DIR } from "../voxel-preview-scene";
import { pickFigure, type FigurePick } from "./figure-picker";

/** How a figure stands to be looked at, at the moment the pointer asks. */
export interface FigureLook {
  /** Every part's volume, in the order the figure holds them. */
  solved: readonly SolvedPart[];
  /** Where each part stands in voxels, and what its box is scaled by, in that same order. */
  placements: readonly PartPlacement[];
  /** How those voxels are drawn in the world the camera stands in. */
  framing: FigureFraming;
  /** The colours the volumes address. */
  palette: RGBA[];
  /** How far down the z axis the camera stands from the origin it looks at. */
  cameraDistance: number;
  /** The turn that carries a point of the world into the figure's own space. */
  worldToModel: Matrix3x3;
  /** The turn that carries a point of the figure's space out into the world. */
  modelToWorld: Matrix3x3;
  /** Whether the colours are shown flat rather than lit. */
  unlit: boolean;
}

/**
 * The voxel the pointer met and the part holding it, kept until the pointer
 * meets another, with `look` asked how the figure stands each time a ray is
 * followed.
 */
export function createFigurePicking(look: () => FigureLook) {
  const [picked, setPicked] = createSignal<FigurePick | undefined>();
  /** Which way the light comes from in the figure's own space, where it shades. */
  const lightDirection = Vector3D.create();

  return {
    /** The voxel the pointer met last, and the part whose volume holds it. */
    picked,
    /**
     * Follows a ray from where `event` lands on `canvas` and holds on to the
     * voxel it meets, or to nothing where it meets none. A pointer that has
     * left the canvas is not followed at all, and what it met last stands.
     */
    at(event: PointerEvent, canvas: HTMLCanvasElement) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        return;
      }

      const view = look();

      Matrix3x3.transform(view.worldToModel, LIGHT_DIR, lightDirection);

      setPicked(
        pickFigure({
          ...view,
          lightDirection,
          // The drawing buffer is scaled by devicePixelRatio, but the ray is
          // built across the CSS box, so the pointer is measured against that.
          uv: { x: x / rect.width, y: 1 - y / rect.height },
          resolution: { width: canvas.width, height: canvas.height },
        }),
      );
    },
  };
}
