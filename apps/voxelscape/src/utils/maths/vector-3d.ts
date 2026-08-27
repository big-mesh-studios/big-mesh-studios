import type { Vector3D } from "./types";

export function create(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
  };
}

export function add(a: Vector3D, b: Vector3D, out = create()) {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}

export function subtract(a: Vector3D, b: Vector3D, out = create()) {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  out.z = a.z - b.z;
  return out;
}

export function cross(a: Vector3D, b: Vector3D, out = create()) {
  // Written out of locals rather than straight into out, so that passing one
  // of the operands as out still reads the operand and not a half-written
  // result.
  const x = a.y * b.z - a.z * b.y;
  const y = a.z * b.x - a.x * b.z;
  const z = a.x * b.y - a.y * b.x;
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}

export function length(a: Vector3D) {
  return Math.hypot(a.x, a.y, a.z);
}

export function equals(a: Vector3D, b: Vector3D) {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/** A vector of length zero has no direction to keep, so it is left as it is. */
export function normalize(a: Vector3D, out = create()) {
  const len = length(a) || 1;
  out.x = a.x / len;
  out.y = a.y / len;
  out.z = a.z / len;
  return out;
}

/**
 * Scales `a` so that its longest axis measures exactly 1 and the other two fall
 * below it, holding the proportions between the three components. Axes are
 * measured by magnitude, so a negative component can be the longest and keeps
 * its sign. A vector of all zeroes has no proportions to hold and comes back as
 * `NaN`.
 */
export function normalizeToLongestAxis(a: Vector3D, out = create()) {
  const longest = Math.max(Math.abs(a.x), Math.abs(a.y), Math.abs(a.z));
  out.x = a.x / longest;
  out.y = a.y / longest;
  out.z = a.z / longest;
  return out;
}

export const EMPTY = Object.freeze(create());
