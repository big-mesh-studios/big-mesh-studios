// The third person view: a boom the camera swings around the player on, in
// the style of Ocarina of Time.
//
// - The boom's heading, elevation and length are stateful and separate from
//   the player's own heading, so dragging the view around never spins the
//   character. The look deltas drive the boom directly; nothing else snaps it.
// - Movement input is read against the CAMERA rather than the character. The
//   character is turned toward the stick direction at a capped rate, and the
//   stick is handed back rotated into the frame the physics integrates in, so
//   holding forward walks away from the camera however far round it has
//   swung.
// - Left alone, the boom swings back behind the character on an angular
//   spring: gently while running, more deliberately after standing still,
//   overshooting slightly as it settles.
// - The boom's pivot is the player's eye, and the view direction runs from the
//   eye back along the boom, so the line a tool picks along is the line the
//   screen is drawn on and the crosshair is exactly on what it selects.
// - Terrain is the only thing the boom is shortened for: the segment from the
//   pivot to the eye is sampled for solid points, and the boom stops short of
//   the first one.

import type { Dim3 } from "../world/level-data";
import type { InputSnapshot } from "./create-input";
import type { Player } from "./player";

/** The tunables of the third person view, in the units each says. */
export const ORBIT_CAMERA_CFG = {
  /** Boom length from the pivot to the eye, in world units. */
  dist: 9.5,
  /** Resting boom elevation above the horizon, in radians. */
  elevDefault: 0.34,
  /** Lowest boom elevation, which puts the eye under the player's eye height. */
  elevMin: -0.35,
  /** Highest boom elevation, which looks down on the player. */
  elevMax: 1.25,
  /** Seconds without look input before elevation drifts back to rest. */
  elevRelaxDelay: 1.2,
  /** Pivot chase rate, in reciprocal seconds; higher is tighter. */
  focusRate: 14,
  /** Seconds without look input before alignment while running engages. */
  moveAlignDelay: 0.6,
  /** Seconds with the stick released before the idle swing starts. */
  idleRecenterDelay: 0.9,
  /** Ease-in duration of the idle swing once its delay has elapsed. */
  idleRampTime: 0.8,
  /** Angular spring stiffness while running, in reciprocal seconds squared. */
  kMove: 2.4,
  /** Angular spring stiffness while standing still, in reciprocal seconds squared. */
  kIdle: 4.2,
  /** Spring damping as a fraction of critical; below one overshoots slightly. */
  dampRatio: 0.85,
  /** Angular speed cap while running, in radians per second. */
  capMove: 3.0,
  /** Angular speed cap of the idle swing at full ramp, in radians per second. */
  capIdle: 1.8,
  /** How fast the character turns toward the stick, in radians per second. */
  turnSpeed: 7.0,
  /** Stick magnitude below which the character counts as not steering. */
  turnDeadzone: 0.15,
  /** Points sampled along the pivot-to-eye segment to find terrain in the way. */
  pullSamples: 16,
  /** Shortest boom length terrain is allowed to pull the eye in to. */
  minDist: 2.0,
  /** Boom shortening rate, in reciprocal seconds; much faster than lengthening. */
  pullInRate: 14,
  /** Boom lengthening rate, in reciprocal seconds. */
  releaseRate: 3,
};

export interface CameraOrbit {
  /**
   * Hard-places the boom behind the player, which every entry into the third
   * person view wants: a boom left where the last entry put it would swing the
   * view around from wherever the player happened to be looking.
   */
  snap(player: Player): void;
  /**
   * Folds one frame's look deltas into the boom's own heading and elevation,
   * turns the character toward the stick direction as read against the camera,
   * and returns the stick axes the physics should integrate in — the axes as
   * they would be if the character were facing the camera's heading.
   *
   * The caller's own input is left alone, so whatever else reads it this frame
   * still sees the stick and the look deltas the player actually made.
   *
   * @returns The strafe and forward/back axes to step the physics with.
   */
  applyControls(
    player: Player,
    dt: number,
    input: InputSnapshot,
  ): { moveX: number; moveY: number };
  /**
   * The unit direction the view looks along, as the boom stands right now.
   * Reads the boom without advancing it, so a tool can pick along this frame's
   * aim before the frame's dynamics have moved the view.
   */
  aim(): Dim3;
  /**
   * Advances the boom's dynamics for `dt` and reports the pose the camera
   * should hold: where the eye is, and the unit direction it looks along.
   */
  pose(player: Player, dt: number): { position: Dim3; direction: Dim3 };
}

/** Wraps an angle to the range from minus pi to pi. */
const wrapPi = (a: number): number => {
  const turned = (a + Math.PI) % (2 * Math.PI);
  return (turned < 0 ? turned + 2 * Math.PI : turned) - Math.PI;
};

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Eases in from zero to one, so a delay can hand over gradually. */
const smoothstep = (t: number): number => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

/**
 * The boom's own state and dynamics.
 *
 * @param isSolid Whether the world at a world point is solid, which is what
 * the boom shortens itself for. A point inside a solid prop counts as solid,
 * so a boom is never pushed through something standing where it would go.
 */
export const createCameraOrbit = (
  isSolid: (x: number, y: number, z: number) => boolean,
): CameraOrbit => {
  const cfg = ORBIT_CAMERA_CFG;
  // The boom's heading, deliberately its own thing rather than the player's, so
  // that looking around and walking are two separate decisions.
  let camYaw = 0;
  let yawVel = 0;
  let elev = cfg.elevDefault;
  let dist = cfg.dist;
  // Seconds since the look deltas last moved the boom, which is what every
  // "left alone" behaviour below is measured against.
  let lookIdle = 0;
  // The stick magnitude the last applyControls call saw.
  let stickMag = 0;
  /** The smoothed pivot the boom swings around, at the player's eye. */
  let focus: Dim3 = [0, 0, 0];

  /** The unit vector from the pivot out to the eye, for the current boom. */
  const boomDirection = (): Dim3 => {
    const cosElev = Math.cos(elev);
    return [
      -Math.sin(camYaw) * cosElev,
      Math.sin(elev),
      -Math.cos(camYaw) * cosElev,
    ];
  };

  /**
   * The view direction: back along the boom, which is the direction from the
   * eye through the pivot and out the other side.
   */
  const aim = (): Dim3 => {
    const dir = boomDirection();
    return [-dir[0], -dir[1], -dir[2]];
  };

  return {
    snap(player) {
      camYaw = player.yaw;
      yawVel = 0;
      elev = cfg.elevDefault;
      dist = cfg.dist;
      lookIdle = 0;
      stickMag = 0;
      focus = [
        player.position.x,
        player.position.y + player.config.eyeHeight,
        player.position.z,
      ];
    },

    applyControls(player, dt, input) {
      if (input.lookDx !== 0 || input.lookDy !== 0) {
        lookIdle = 0;
        const sens = player.config.lookSensitivity;
        // Dragging right pans the view rightward. The character's forward is
        // (sin yaw, cos yaw) and its screen-right is (-cos yaw, sin yaw), so
        // reaching right means decreasing yaw; pointer dy is positive
        // downward, so dragging up means decreasing elevation, which raises
        // the boom over the player.
        camYaw -= input.lookDx * sens;
        elev = clamp(elev - input.lookDy * sens, cfg.elevMin, cfg.elevMax);
        // A drag is the player steering, so nothing in flight may fight it.
        yawVel = 0;
      } else {
        lookIdle += dt;
      }

      stickMag = Math.hypot(input.moveX, input.moveY);
      if (stickMag > cfg.turnDeadzone) {
        // Where the stick points, read against the camera rather than the
        // character: with the boom swung round behind, that is the world
        // heading the player is asking to walk.
        const wx =
          input.moveY * Math.sin(camYaw) - input.moveX * Math.cos(camYaw);
        const wz =
          input.moveY * Math.cos(camYaw) + input.moveX * Math.sin(camYaw);
        const target = Math.atan2(wx, wz);
        const turn = wrapPi(target - player.yaw);
        const maxStep = cfg.turnSpeed * dt;
        player.yaw =
          Math.abs(turn) <= maxStep
            ? target
            : player.yaw + Math.sign(turn) * maxStep;
      }

      // Hand the stick back in the frame the physics integrates in, which the
      // character builds from its own heading. The physics computes
      // my*(sin yaw, cos yaw) + mx*(-cos yaw, sin yaw), and that equals the
      // same pair read against the camera exactly when the axes are rotated by
      // the heading's difference from the camera's.
      const phi = player.yaw - camYaw;
      const cos = Math.cos(phi);
      const sin = Math.sin(phi);
      return {
        moveX: input.moveX * cos + input.moveY * sin,
        moveY: input.moveY * cos - input.moveX * sin,
      };
    },

    aim,

    pose(player, dt) {
      // Chase the pivot so a landing or a shove does not jolt the view.
      const follow = Math.min(1, cfg.focusRate * dt);
      focus[0] += (player.position.x - focus[0]) * follow;
      focus[1] +=
        (player.position.y + player.config.eyeHeight - focus[1]) * follow;
      focus[2] += (player.position.z - focus[2]) * follow;

      // Two tiers of recentering toward directly behind the character: a weak
      // alignment while running, a slower and more deliberate swing once the
      // stick is released.
      const behind = wrapPi(player.yaw - camYaw);
      let stiffness = 0;
      let cap = 0;
      if (stickMag > cfg.turnDeadzone && lookIdle > cfg.moveAlignDelay) {
        stiffness = cfg.kMove;
        cap = cfg.capMove;
      } else if (
        stickMag <= cfg.turnDeadzone &&
        lookIdle > cfg.idleRecenterDelay
      ) {
        const ramp = smoothstep(
          (lookIdle - cfg.idleRecenterDelay) / cfg.idleRampTime,
        );
        stiffness = cfg.kIdle * (0.25 + 0.75 * ramp);
        cap = Math.max(cfg.capIdle * ramp, 0.05);
      }
      if (stiffness > 0) {
        const damp = cfg.dampRatio * 2 * Math.sqrt(stiffness);
        yawVel += (stiffness * behind - damp * yawVel) * dt;
        yawVel = clamp(yawVel, -cap, cap);
        camYaw += yawVel * dt;
      } else {
        yawVel *= Math.exp(-8 * dt);
      }

      // Elevation drifts back to its resting angle once the boom is left alone.
      if (lookIdle > cfg.elevRelaxDelay) {
        elev += (cfg.elevDefault - elev) * Math.min(1, 1.5 * dt);
      }

      // Shorten the boom for terrain in the way, sampling the whole segment at
      // full length and stopping short of the first solid point found.
      const dir = boomDirection();
      let desired = cfg.dist;
      for (let i = 1; i <= cfg.pullSamples; i++) {
        const t = i / cfg.pullSamples;
        if (
          isSolid(
            focus[0] + dir[0] * cfg.dist * t,
            focus[1] + dir[1] * cfg.dist * t,
            focus[2] + dir[2] * cfg.dist * t,
          )
        ) {
          desired = Math.max(cfg.minDist, cfg.dist * t * 0.9);
          break;
        }
      }
      // Shortening is urgent and lengthening is unhurried, so brushing past a
      // wall does not fling the view back out the moment it clears.
      const rate = desired < dist ? cfg.pullInRate : cfg.releaseRate;
      dist += (desired - dist) * Math.min(1, rate * dt);

      return {
        position: [
          focus[0] + dir[0] * dist,
          focus[1] + dir[1] * dist,
          focus[2] + dir[2] * dist,
        ],
        direction: aim(),
      };
    },
  };
};
