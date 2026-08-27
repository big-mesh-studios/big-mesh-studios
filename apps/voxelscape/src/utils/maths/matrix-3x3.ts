import {
  type Vector3D,
  create as createVector3D,
  cross,
  normalize,
  subtract,
} from "./vector-3d";

export class Matrix3x3 extends Float32Array {}

export function create(
  a = 0,
  b = 0,
  c = 0,
  d = 0,
  e = 0,
  f = 0,
  g = 0,
  h = 0,
  i = 0,
) {
  return new Matrix3x3([a, b, c, d, e, f, g, h, i]);
}

/**
 * The orientation of a camera that sits at `eye` and points at `target`:
 * takes a direction written in camera space, where the camera looks down its
 * own negative z, and gives that same direction in world space.
 *
 * Its three columns are the camera's right, up and backward axes, which makes
 * it the rotation half of a camera-to-world transform — the opposite
 * direction to the one {@link Matrix4x4.lookAt} rotates in. A ray that starts
 * life in camera space and has to be followed through the world needs this
 * one; a point that starts in the world and has to be drawn needs lookAt.
 *
 * Carrying only the rotation is also what keeps it usable on a direction:
 * a direction has no position, so a camera translation must not reach it.
 */
export function orientation(
  eye: Vector3D,
  target: Vector3D,
  up: Vector3D,
  out = create(),
) {
  const backward = normalize(subtract(eye, target));
  const right = normalize(cross(up, backward));
  const trueUp = cross(backward, right);

  // Column-major, the layout WebGL uploads: one axis per column, so each axis
  // occupies three consecutive slots.
  out[0] = right.x;
  out[1] = right.y;
  out[2] = right.z;
  out[3] = trueUp.x;
  out[4] = trueUp.y;
  out[5] = trueUp.z;
  out[6] = backward.x;
  out[7] = backward.y;
  out[8] = backward.z;
  return out;
}

/**
 * A turn of `angle` radians about the x axis. Negating the angle gives the
 * inverse, since undoing a turn is only turning back the other way.
 */
export function rotationX(angle: number, out = create()) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = cos;
  out[5] = sin;
  out[6] = 0;
  out[7] = -sin;
  out[8] = cos;
  return out;
}

/**
 * A turn of `angle` radians about the y axis, counterclockwise seen from
 * above. Negating the angle gives the inverse, since undoing a turn is only
 * turning back the other way.
 */
export function rotationY(angle: number, out = create()) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  out[0] = cos;
  out[1] = 0;
  out[2] = -sin;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = sin;
  out[7] = 0;
  out[8] = cos;
  return out;
}

export function multiply(a: Matrix3x3, b: Matrix3x3, out = create()) {
  const product = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let column = 0; column < 3; column++) {
    for (let row = 0; row < 3; row++) {
      product[column * 3 + row] =
        a[row] * b[column * 3] +
        a[3 + row] * b[column * 3 + 1] +
        a[6 + row] * b[column * 3 + 2];
    }
  }
  out.set(product);
  return out;
}

export function transform(
  matrix: Matrix3x3,
  vector: Vector3D,
  out = createVector3D(),
) {
  const x = matrix[0] * vector.x + matrix[3] * vector.y + matrix[6] * vector.z;
  const y = matrix[1] * vector.x + matrix[4] * vector.y + matrix[7] * vector.z;
  const z = matrix[2] * vector.x + matrix[5] * vector.y + matrix[8] * vector.z;
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}
