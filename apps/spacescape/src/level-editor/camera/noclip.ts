/**
 * The editor's first-person camera: fly, look, place at the crosshair.
 *
 * ## Why this is the player's own movement
 *
 * **Everything about flying is already written and tested** — `updateNoClip` in
 * `player.ts`, reached through `updatePlayer`, with pointer lock, keyboard flight, touch
 * drag-look and a joystick, all driven by the one `InputController` the game already has.
 *
 * Re-implementing any of it here would be a second answer to four questions, and the two
 * would disagree about what `space` does. voxelscape's ADR 0058 records doing this the
 * other way and getting it for free; this file is the consequence of spacescape already
 * having the player.
 *
 * ## Why a throwaway player
 *
 * The editor needs a body that flies and does nothing else: no gravity, no ground to stand
 * on, no collisions, no item to carry. So it builds a `Player` with `noclip` set and hands
 * `updatePlayer` a world that reports nothing solid and no ground. **The world's methods
 * are all constant-time answers rather than field traces**, which is what makes a frame of
 * free flight cost the same as a frame of walking.
 *
 * ## The camera is not the player's position
 *
 * `placeCamera` puts the eye at `playerEye` — the position plus a height along `up`. In
 * no-clip there is no body to be tall, so the eye *is* the position and the height is zero.
 * That is the whole difference between flying and walking here, and it is one number.
 */

import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { Vec3 } from "@big-mesh-studios/core";
import {
  DEFAULT_PLAYER_CONFIG,
  createPlayer,
  placeCamera,
  updatePlayer,
  type Player,
  type PlayerWorld,
} from "../../player/player";
import { flatFrame } from "../../world/up";
import type { InputController } from "../../player/input";

import {
  DEFAULT_FRAME_DISTANCE,
  type CameraControl,
  type CameraPose,
} from "./CameraControl";

/** How fast the editor's camera flies. Slower than the player's, because there is more to look at. */
const EDITOR_FLY_SPEED = 90;

export const createNoClipCameraControl = (
  camera: PerspectiveCamera,
  input: InputController,
): CameraControl => {
  // Created here and never attached to the world, so nothing that walks, falls or collides
  // ever sees it. `noclip` is what makes `updatePlayer` take the free-flight branch, and
  // `eyeHeight` of zero is what makes `placeCamera` put the eye *at* the position rather
  // than six units above it — in no-clip there is no body to be tall.
  let player: Player = createPlayer(
    { x: 0, y: 0, z: 0 },
    {
      ...DEFAULT_PLAYER_CONFIG,
      speed: EDITOR_FLY_SPEED,
      eyeHeight: 0,
    },
  );
  player.noclip = true;

  /**
   * A world that has nothing in it.
   *
   * **Constant answers, and every one of them is a refusal.** No ground, nothing solid, not
   * in water, no medium — so the physics has nothing to push against and the camera flies
   * exactly where it is told. The frame is flat because the editor's up is world up; on a
   * planet the *player's* up follows the ground, which is right for walking and wrong for
   * a camera a person is flying over the terrain with.
   */
  const nowhere: PlayerWorld = {
    frame: flatFrame,
    halfExtent: Number.POSITIVE_INFINITY,
    centre: undefined,
    getGroundDistanceAt: () => -Infinity,
    getInWaterAt: () => false,
    getSolidAt: () => false,
  };

  return {
    kind: "no-clip",

    /**
     * Nothing to attach.
     *
     * The input controller is already listening on the canvas — it belongs to the game —
     * and this camera only reads what it produced. Binding a second set of listeners here
     * would mean two handlers per pointer event, and the one that lost the race would be
     * whichever the editor happened to be.
     */
    attach(): void {},

    dispose(): void {},

    /**
     * Puts the camera where it can see `target`, keeping the direction it was looking.
     *
     * **Swung back along its own view rather than moved there**, so framing a thing from a
     * standing start looks at it from wherever the camera already was, rather than
     * teleporting to some default angle. A no-clip camera has no orbit target to swing
     * around, so the line it was looking along is the frame it has.
     */
    frame(target: Vec3, distance: number = DEFAULT_FRAME_DISTANCE): void {
      const from = player.position;
      const away = {
        x: from.x - target.x,
        y: from.y - target.y,
        z: from.z - target.z,
      };
      const length = Math.hypot(away.x, away.y, away.z);
      // Already looking at it, or there is no direction to preserve: stand off along
      // whichever way the camera was facing and look back.
      if (length < 1e-6) {
        const look = player.forward;
        const ahead = Math.hypot(look.x, look.y, look.z) || 1;
        player.position = {
          x: target.x - (look.x / ahead) * distance,
          y: target.y - (look.y / ahead) * distance,
          z: target.z - (look.z / ahead) * distance,
        };
        return;
      }
      player.position = {
        x: target.x + (away.x / length) * distance,
        y: target.y + (away.y / length) * distance,
        z: target.z + (away.z / length) * distance,
      };
    },

    pose(): CameraPose {
      // The point it looks at is `distance` along its own forward — enough for the orbit
      // style to adopt, which needs somewhere to orbit rather than a heading.
      const forward = player.forward;
      const reach = DEFAULT_FRAME_DISTANCE;
      const length = Math.hypot(forward.x, forward.y, forward.z) || 1;
      return {
        at: { ...player.position },
        target: {
          x: player.position.x + (forward.x / length) * reach,
          y: player.position.y + (forward.y / length) * reach,
          z: player.position.z + (forward.z / length) * reach,
        },
      };
    },

    adopt(from: CameraPose): void {
      player.position = { ...from.at };
      // The heading is what is left of the pose: which way from `at` toward `target`.
      const look = {
        x: from.target.x - from.at.x,
        y: from.target.y - from.at.y,
        z: from.target.z - from.at.z,
      };
      const length = Math.hypot(look.x, look.y, look.z);
      if (length < 1e-6) return;
      const flat = Math.hypot(look.x, look.z);
      // A camera looking straight up or down has no horizontal heading to keep. Leaving
      // the old one is better than dividing by zero and getting a heading of NaN, which
      // would make every later frame undefined.
      if (flat < 1e-6) return;
      player.forward = {
        x: look.x / length,
        y: look.y / length,
        z: look.z / length,
      };
      player.right = {
        x: -look.z / flat,
        y: 0,
        z: look.x / flat,
      };
    },

    /**
     * Reads this frame's input, moves the body, and writes the camera.
     *
     * **`consume` clears what it reads**, so this is called exactly once per frame. A second
     * call in the same frame would find the look deltas already taken and the camera would
     * not respond to half the movement — which reads as a camera that is stuck.
     */
    update(dt: number): void {
      updatePlayer(player, dt, input.consume(), nowhere);
      placeCamera(camera, player, true);
    },
  };
};
