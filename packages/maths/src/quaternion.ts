import { Vector3D } from "./vector3d";

/** A unit quaternion, x y z w. */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export namespace Quaternion {
  export function create(x = 0, y = 0, z = 0, w = 0): Quaternion {
    return {
      x,
      y,
      z,
      w,
    };
  }

  export function fromAxisAngle(
    { x, y, z }: Vector3D,
    angle: number,
    out = Quaternion.create(),
  ): Quaternion {
    const half = angle / 2;
    const s = Math.sin(half);

    out.x = x * s;
    out.y = y * s;
    out.z = z * s;
    out.w = Math.cos(half);

    return out;
  }

  export function multiply(
    a: Quaternion,
    b: Quaternion,
    out = Quaternion.create(),
  ): Quaternion {
    out.x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
    out.y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
    out.z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
    out.w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;

    return out;
  }
}
