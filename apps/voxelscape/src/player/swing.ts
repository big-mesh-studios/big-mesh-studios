// Where a tool sits in the first-person view, and how a pose becomes a mesh
// transform. The card is held at a three-quarter view — rolled a quarter turn
// about the blade's own axis, so it reads as a flat blade in three dimensions
// rather than face-on — and a pose rolls it about the view axis around its
// hilt, so the blade sweeps while the hilt stays in the hand. Each tool draws
// its own path through these poses.

import { Quaternion, Vector3D } from "@big-mesh-studios/maths";
import { clamp } from "../utils";

/** The hilt's offset from the card's centre, as a fraction of its size. */
export const HANDLE_FRACTION = { x: -5.6 / 24, y: -6 / 24, z: 0 };

/** The three-quarter view: roll the card about the blade's own diagonal axis. */
export const BASE_ROTATION_AXIS = {
  x: Math.sqrt(0.5),
  y: Math.sqrt(0.5),
  z: 0,
};
export const BASE_ROTATION_ANGLE = Math.PI / 4;

/** Where a tool sits in the camera's space: position and roll about the view axis. */
export interface SwingPose extends Vector3D {
  /** The card's roll in radians; the sprite already draws the blade diagonally. */
  roll: number;
  /**
   * Where the grip sits relative to the card's centre, in 24ths of the card,
   * for a tool that is not held by a sword-shaped hilt. Defaults to the
   * sword's hilt offset.
   */
  handle?: Vector3D;
}

/** Where the mesh sits and how it faces: position plus an orientation quaternion. */
export interface SwingTransform {
  position: Vector3D;
  rotation: Quaternion;
}

/** A curve that starts fast and settles, for a motion that is thrown outward. */
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/** A curve that eases at both ends, for a motion that returns to rest. */
export const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** The pose `t` of the way from `from` to `to`, clamped to the two ends. */
export const lerpPose = (
  from: SwingPose,
  to: SwingPose,
  t: number,
): SwingPose => {
  const k = clamp(t, 0, 1);
  const handle = from.handle ?? to.handle;
  const pose: SwingPose = {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    z: from.z + (to.z - from.z) * k,
    roll: from.roll + (to.roll - from.roll) * k,
  };
  if (handle !== undefined) {
    pose.handle = handle;
  }
  return pose;
};

/**
 * The mesh transform that puts a tool's hilt on the hand path and rolls the
 * card about the view axis on top of the three-quarter view, with the hilt as
 * the pivot — the position shifts so the hilt stays put while the blade sweeps.
 *
 * @param cardSize The card's world size, so the hilt's pixel offset becomes a
 * real offset from the card's centre.
 */
export const handTransform = (
  pose: SwingPose,
  cardSize: number,
): SwingTransform => {
  const base = Quaternion.fromAxisAngle(
    BASE_ROTATION_AXIS,
    BASE_ROTATION_ANGLE,
  );
  const swing = Quaternion.fromAxisAngle({ x: 0, y: 0, z: 1 }, pose.roll);
  const orientation = Quaternion.multiply(swing, base);
  const grip = pose.handle ?? HANDLE_FRACTION;
  const handleLocal = {
    x: grip.x * cardSize,
    y: grip.y * cardSize,
    z: 0,
  };
  const hilt = Vector3D.rotateQuaternion(handleLocal, orientation);

  return {
    position: {
      x: pose.x - hilt.x,
      y: pose.y - hilt.y,
      z: pose.z - hilt.z,
    },
    rotation: orientation,
  };
};
