/**
 * The one shape both editor cameras have.
 *
 * ## Why a seam rather than two controls the overlay branches on
 *
 * The overlay does not care how the view is driven. It needs four things: start listening,
 * look at somewhere, say where the camera ended up, and step. Both styles are asked for the
 * same four, and a `switch (kind)` in the overlay would mean every caller of the camera had
 * to know which style was live before it could use it — which is exactly the coupling
 * voxelscape's ADR 0058 removed when it made this seam.
 *
 * ## Why `adopt` exists
 *
 * **So one style can hand over to the other without the view swinging.** The two describe
 * the same view very differently — orbit knows a target and a radius, no-clip knows where
 * the eye is and where it looks — and a switch that just re-seeds each one from its own
 * defaults drops the person somewhere unrelated to where they were. `adopt` is how the new
 * style is told to start from the old one's pose.
 */

import type { Vec3 } from "@big-mesh-studios/core";

/** Where a camera is, and what it is looking at. Enough to restore either style from it. */
export interface CameraPose {
  /** The camera's own position. */
  readonly at: Vec3;
  /** The point it is looking at — for orbit, the point it circles. */
  readonly target: Vec3;
}

export type CameraControlsKind = "orbit" | "no-clip";

/**
 * What a camera the editor drives has to offer.
 *
 * **Every member is synchronous and none of them take a frame.** `update` is the only one
 * that takes time, and it is the only one the frame loop calls — everything else is asked
 * for in response to something a person did.
 */
export interface CameraControl {
  /** Which style this is, for a button that switches between them. */
  readonly kind: CameraControlsKind;

  /** Starts listening on the canvas. `dispose` stops it. */
  attach(element: HTMLElement): void;
  /** Stops listening. Safe to call more than once. */
  dispose(): void;

  /**
   * Points the view at somewhere, and backs off far enough to see it.
   *
   * `distance` is a request rather than an instruction, because the two styles have very
   * different ideas about it: orbit swings along a sphere of that radius, while no-clip
   * puts the eye that far back along the line it was already looking along.
   */
  frame(target: Vec3, distance?: number): void;

  /** Where the camera is now, in world units. */
  pose(): CameraPose;

  /** Starts from a pose another style left behind, so switching does not swing the view. */
  adopt(pose: CameraPose): void;

  /**
   * Says a tool is taking the pointer, so the camera leaves single-pointer gestures to it.
   *
   * **The inverse of nothing, and paired rather than one-way.** A tool that claims and never
   * releases leaves an editor whose camera cannot be moved, so every call site has to release
   * in a `finally` — including one released by a drag that threw.
   *
   * **Only `orbit` acts on it, and that is not an oversight.** The tool that calls this is
   * the gizmo, which finds its handles by measuring the pointer against their projected
   * positions. Under no-clip the input controller is enabled and the canvas re-takes the
   * pointer lock on the next click — and a locked pointer freezes `clientX` and `clientY`,
   * which `app.tsx` already records as the reason the editor suspends the lock on open. So
   * under no-clip the gizmo has no pointer position to measure and is not offered at all;
   * this is the seam saying so rather than each caller re-deriving it.
   *
   * So `no-clip` ignores the claim, which also means there is never a second writer of
   * `input.setEnabled` racing the editor's own open/close transition — the alternative would
   * have been for a release to hand the flight controls back to a camera that was not
   * supposed to have them.
   */
  claimGesture(claimed: boolean): void;

  /**
   * Advances the camera by a frame.
   *
   * **Only the caller that owns the frame loop should call this**, and only while the
   * editor is open. Nothing in here checks whether it is wanted — a camera that keeps
   * writing to a shared camera after the editor closed would fight the player for it.
   */
  update(dt: number): void;
}

/** How far back a `frame` call puts the camera when the caller does not say. */
export const DEFAULT_FRAME_DISTANCE = 240;

/** The sub-vector of a direction, for turning a direction into an angle. */
export const horizontalLength = (d: Vec3): number =>
  Math.hypot(d.x, d.z) || 1e-6;
