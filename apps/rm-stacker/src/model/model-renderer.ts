import type { Dimensions3D, Matrix3x3, RGBA } from "../maths";
import type { Sides } from "../types";
import type { OrbitCameraState } from "./model-camera";

/**
 * The contract every model renderer implements: given a canvas, take
 * model/appearance updates and a camera each frame, and draw. Picking is not
 * a renderer concern — the panels a model is drawn from are always
 * available regardless of which renderer is mounted, so `model-canvas.ts`
 * picks once, the same way, and hands the result in as `pickedVoxel`.
 */
export interface ModelRenderer {
  resize(width: number, height: number): void;
  setModel(dimensions: Dimensions3D, sides: Sides): void;
  setPalette(palette: RGBA[]): void;
  setUnlit(unlit: boolean): void;
  render(
    orbit: OrbitCameraState,
    worldToModel: Matrix3x3,
    pickedVoxel: readonly [number, number, number] | undefined,
  ): void;
  dispose(): void;
}

export type ModelRendererFactory = (canvas: HTMLCanvasElement) => ModelRenderer;
