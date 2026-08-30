import { Quaternion } from "./quaternion";
import { Dimensions2D, Vector2D } from "./vector2d";

export interface Vector3D extends Vector2D {
  z: number;
}

export namespace Vector3D {
  export function create(x = 0, y = 0, z = 0) {
    return {
      x,
      y,
      z,
    };
  }

  export function add(a: Vector3D, b: Vector3D, out = Vector3D.create()) {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    out.z = a.z + b.z;
    return out;
  }

  export function subtract(a: Vector3D, b: Vector3D, out = Vector3D.create()) {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    out.z = a.z - b.z;
    return out;
  }

  export function cross(a: Vector3D, b: Vector3D, out = Vector3D.create()) {
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

  /** A vector of length zero has no direction to keep, so it is left as it is. */
  export function normalize(a: Vector3D, out = Vector3D.create()) {
    const len = Vector3D.length(a) || 1;
    out.x = a.x / len;
    out.y = a.y / len;
    out.z = a.z / len;
    return out;
  }

  export function multiplyScalar(
    a: Vector3D,
    scalar: number,
    out = Vector3D.create(),
  ): Vector3D {
    out.x = a.x * scalar;
    out.y = a.y * scalar;
    out.z = a.z * scalar;

    return out;
  }

  export function rotateQuaternion(
    a: Vector3D,
    quaternion: Quaternion,
    out = Vector3D.create(),
  ) {
    const { x: qx, y: qy, z: qz, w } = quaternion;
    const { x, y, z } = a;

    // Twice the cross product of the quaternion's vector part with a.
    const tx = 2 * (qy * z - qz * y);
    const ty = 2 * (qz * x - qx * z);
    const tz = 2 * (qx * y - qy * x);

    out.x = x + w * tx + (qy * tz - qz * ty);
    out.y = y + w * ty + (qz * tx - qx * tz);
    out.z = z + w * tz + (qx * ty - qy * tx);

    return out;
  }

  export function equals(a: Vector3D, b: Vector3D) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }

  export const EMPTY = Object.freeze(Vector3D.create());
}

export interface Dimensions3D extends Dimensions2D {
  depth: number;
}

export namespace Dimensions3D {
  /**
   * Scales the three dimensions so the largest is 1. A voxel model is ray
   * marched in this normalized space, and the box bounding it is sized from the
   * result.
   */
  export function normalize(
    dimensions: Dimensions3D,
    out: Dimensions3D = { width: 0, height: 0, depth: 0 },
  ): Dimensions3D {
    const max = Math.max(dimensions.width, dimensions.height, dimensions.depth);
    out.width = dimensions.width / max;
    out.height = dimensions.height / max;
    out.depth = dimensions.depth / max;
    return out;
  }

  export function equals(a: Dimensions3D, b: Dimensions3D) {
    return a.width === b.width && a.height === b.height && a.depth === b.depth;
  }
}
