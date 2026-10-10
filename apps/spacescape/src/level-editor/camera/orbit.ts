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
 * explicitly. **The editor's left button places things** — for a mouse, which is the only
 * pointer that places — so this wrapper raises the flag for that press and drops it when the
 * press ends, which keeps a left-drag from also swinging the camera and keeps two-finger
 * pinch working while a finger is down on the world.
 *
 * **Per press, and not for as long as it is attached.** `setToolOwnsLeft` is a blanket
 * "a tool has this gesture" switch: `OrbitController` declines *every* single-pointer drag
 * and the wheel while it is set, not only the ones that began on the left button. Holding it
 * for the whole attachment therefore took the right-drag orbit, the shift pan and the wheel
 * with it — which is the whole of the editor's navigation, and leaves a view that cannot be
 * moved at all.
 *
 * **A mouse's left button only.** On a phone the Apply button places and the drag is left to
 * look, so reserving the drag there would take away the only gesture a finger has.
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
  // What the editor takes down, and what puts it back.
  let detached: (() => void) | undefined;
  let attachedTo: HTMLElement | undefined;
  /** The pointer whose press is placing, and so owns the left button. See the header. */
  let placing: number | undefined;

  /**
   * **A mouse's left button, and only a mouse's.** The editor places a shape on the canvas
   * from a left press — and only from a *mouse* press, because on a phone the Apply button
   * is what places (`LevelEditorTouchControls`) and the one gesture that is left has to be
   * the one that looks. Reserving the button for a finger would leave a touch editor with no
   * way to move the view at all, which is the same dead screen the flag was causing in the
   * first place.
   */
  const takeLeftButton = (event: PointerEvent): void => {
    // **Only the first contact, and only the left button.** A second finger is a pinch,
    // which is navigation, and letting it take the flag would hand the gesture back when it
    // lifted while the first finger was still placing.
    if (event.pointerType !== "mouse") return;
    if (event.button !== 0 || placing !== undefined) return;
    placing = event.pointerId;
    orbit.setToolOwnsLeft(true);
  };

  const releaseLeftButton = (event: PointerEvent): void => {
    if (placing !== event.pointerId) return;
    placing = undefined;
    orbit.setToolOwnsLeft(false);
  };

  const pose = (): CameraPose => ({
    at: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    target: { ...orbit.state.target },
  });

  return {
    kind: "orbit",

    attach(element: HTMLElement): void {
      detached?.();
      detached = orbit.attach(element);
      attachedTo = element;
      // **Read on the next `pointermove`, not on this press** — `OrbitController` consults the
      // flag while it is deciding what a drag means, so listening later than its own
      // `pointerdown` is exactly what this needs.
      element.addEventListener("pointerdown", takeLeftButton);
      element.addEventListener("pointerup", releaseLeftButton);
      element.addEventListener("pointercancel", releaseLeftButton);
    },

    dispose(): void {
      detached?.();
      detached = undefined;
      attachedTo?.removeEventListener("pointerdown", takeLeftButton);
      attachedTo?.removeEventListener("pointerup", releaseLeftButton);
      attachedTo?.removeEventListener("pointercancel", releaseLeftButton);
      attachedTo = undefined;
      placing = undefined;
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
