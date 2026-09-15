import type { Camera, Vector3 } from "@random-mesh/rmsl/scene";

export type CameraControlsKind = "Orbit" | "ToolBoxStyle";

export type Projection = "Perspective" | "Orthographic";

/**
 * The common shape of a camera controller. All state is in the application's
 * y-up world space, matching the `@random-mesh/rmsl/scene` camera it drives.
 */
export interface CameraControl {
  readonly kind: CameraControlsKind;

  /** Attaches input handlers to the canvas. */
  attach(canvas: HTMLCanvasElement): void;

  /** Detaches input handlers and releases resources. */
  dispose(): void;

  /** Whether user input is accepted. */
  enabled: boolean;

  /** The orbit point, in world space. */
  get target(): Vector3;

  /** Points the control at a new orbit target. */
  setTarget(pt: Vector3): void;

  /** Reconfigures the control for the given camera and projection. */
  setProjection(camera: Camera, projection: Projection): void;

  /** Makes the control adopt the camera's pose and orbit target. */
  syncFromCamera(camera: Camera, target: Vector3): void;

  /** Advances the control a frame. */
  update(): void;

  /** Subscribes to camera movement; returns an unsubscribe function. */
  onChange(cb: () => void): () => void;
}
