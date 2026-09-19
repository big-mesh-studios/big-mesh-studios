import type { Camera, Vector3 } from "@random-mesh/rmsl/scene";

export type CameraControlsKind = "Orbit" | "NoClip";

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

  /**
   * The world point the streamed window should follow: the orbit point for an
   * orbiting control, the camera's own position for a free-flying one.
   */
  get target(): Vector3;

  /** Points the control at a new focus, when the control has one to point. */
  setTarget(pt: Vector3): void;

  /** Reconfigures the control for the given camera and projection. */
  setProjection(camera: Camera, projection: Projection): void;

  /** Makes the control adopt the camera's pose and focus. */
  syncFromCamera(camera: Camera, target: Vector3): void;

  /** Advances the control a frame by `dt` seconds. */
  update(dt: number): void;

  /** Subscribes to camera movement; returns an unsubscribe function. */
  onChange(cb: () => void): () => void;
}
