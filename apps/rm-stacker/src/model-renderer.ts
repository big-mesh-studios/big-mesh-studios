import type { Dimensions3D, Matrix3x3, RGBA } from "./maths";
import type { Sides } from "./types";
import type { OrbitCameraState } from "./model-camera";

/**
 * The contract every model renderer implements: given a canvas, take
 * model/appearance updates and a camera each frame, and draw.
 */
export interface ModelRenderer {
  resize(width: number, height: number): void;
  setModel(dimensions: Dimensions3D, sides: Sides): void;
  setPalette(palette: RGBA[]): void;
  setUnlit(unlit: boolean): void;
  render(orbit: OrbitCameraState, worldToModel: Matrix3x3): void;
  /** Present only on a renderer that can resolve a screen point to a voxel. */
  pick?(
    uv: readonly [number, number],
    orbit: OrbitCameraState,
    worldToModel: Matrix3x3,
  ): readonly [number, number, number] | undefined;
  dispose(): void;
}

export type ModelRendererFactory = (canvas: HTMLCanvasElement) => ModelRenderer;
