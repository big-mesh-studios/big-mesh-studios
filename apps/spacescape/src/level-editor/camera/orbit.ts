/**
 * The editor's orbit camera: right-drag to swing, shift-right-drag to slide, wheel to zoom.
 *
 * ## Why this wraps `OrbitController` rather than being one
 *
 * `controls/orbit-camera.ts` already exists, is already used by `?edit`, and is already
 * tested. A second orbit controller would be two implementations of one idea, and the two
 * would drift — which is what voxelscape's ADR 0058 is about, in the other direction: its
 * `KitCameraControl` is 790 lines that spacescape does not need because it has this.
 *
 * ## What the wrapper adds
 *
 * Two things, both small and both about the seam rather than about the maths:
 *
 * - **`frame`, `pose` and `adopt`.** `OrbitController` has a mutable `state` and nothing to
 *   read a pose out of, and the seam needs all three so the overlay can ask where the
 *   camera is and so a switch from no-clip can start where no-clip left off.
 * - **Angles from a direction.** `OrbitState` is `theta`/`phi`/`radius` about a target, and
 *   `adopt` is handed a direction rather than angles, so somebody has to convert. It is
 *   here, where the sphere it describes lives, rather than in a caller.
 *
 * ## Left button
 *
 * `OrbitController` leaves the left button alone, and `setToolOwnsLeft` exists to say so
 * explicitly. **The editor's left button places things**, so the wrapper turns that on for
 * as long as it is attached — which also keeps two-finger pinch working while a finger is
 * down on the world, which is the reason `OrbitController` has that method at all.
 */

import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { Vec3 } from "@big-mesh-studios/core";
import {
  OrbitController,
  initialOrbitState,
} from "../../controls/orbit-camera";

import {
  DEFAULT_FRAME_DISTANCE,
  type CameraControl,
  type CameraPose,
} from "./CameraControl";

export const createOrbitCameraControl = (
  camera: PerspectiveCamera,
  options: { radius?: number } = {},
): CameraControl => {
  const orbit = new OrbitController(camera, options);
  // What the camera looks at before anybody says. The frame loop sets a real one on open;
  // this is only here so a `pose` before the first `frame` is still an answer.
  let detached: (() => void) | undefined;

  const pose = (): CameraPose => ({
    at: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    target: { ...orbit.state.target },
  });

  return {
    kind: "orbit",

    attach(element: HTMLElement): void {
      detached?.();
      detached = orbit.attach(element);
      // The left button places things. Saying so also leaves two-finger pinch working,
      // which is what `setToolOwnsLeft` is careful to preserve.
      orbit.setToolOwnsLeft(true);
    },

    dispose(): void {
      detached?.();
      detached = undefined;
      orbit.setToolOwnsLeft(false);
      orbit.dispose();
    },

    /**
     * Points the view, and **moves the camera there before returning.**
     *
     * Not deferred to the next `update`, because `pose` would then answer with where the
     * camera used to be — and `pose` is what a handover reads. A caller that said "look
     * here" and then asked where the camera was should not be told it is somewhere else.
     */
    frame(target: Vec3, distance: number = DEFAULT_FRAME_DISTANCE): void {
      orbit.state.target = { ...target };
      orbit.state.radius = distance;
      orbit.apply();
    },

    pose,

    adopt(from: CameraPose): void {
      orbit.state.target = { ...from.target };
      const offset = {
        x: from.at.x - from.target.x,
        y: from.at.y - from.target.y,
        z: from.at.z - from.target.z,
      };
      const length = Math.hypot(offset.x, offset.y, offset.z) || 1e-6;
      orbit.state.radius = length;
      orbit.state.theta = Math.atan2(offset.x, offset.z);
      // **Clamped away from the poles**, where every direction of `theta` collapses onto
      // one point: at `phi` of exactly 0 the camera is straight above the target and
      // `theta` is meaningless, so a no-clip camera looking at the sky would arrive
      // pointing somewhere arbitrary.
      orbit.state.phi = Math.acos(clampUnit(offset.y / length));
      // Moved here for the same reason `frame` moves: the pose handed over has to be the
      // one the camera is actually at, or the view jumps a frame after the switch.
      orbit.apply();
    },

    /**
     * Writes the state onto the camera.
     *
     * **No time step**, because `OrbitController` has no integration: the pointer handlers
     * write `state` directly and this only projects it. It is here so the seam's shape
     * does not depend on that, and so a future style can integrate without the overlay
     * changing.
     */
    update(): void {
      orbit.apply();
    },
  };
};

/** `acos` of a number that floating point has put just outside `-1..1`. */
const clampUnit = (n: number): number => Math.max(-1, Math.min(1, n));

/** A starting state, for a caller that wants the same view `?edit` opens with. */
export const defaultOrbitRadius = (): number => initialOrbitState().radius;
