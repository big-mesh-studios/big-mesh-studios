// Rigid transforms and the quaternion arithmetic that runs between them.
//
// Everything a bone or a bound part carries — where it sits, how it is turned,
// how large it is drawn — is one of these. A transform is composed down a bone
// chain the way a pose is, and inverted to read a bind offset back out of a
// rest pose. Scale is uniform throughout, which is what keeps a transform
// invertible in closed form and a chain of them cheap to walk.
import { Matrix3x3, Quaternion, Vector3D } from "@big-mesh-studios/maths";

/** Where something sits, how it is turned, and how large it is drawn. */
export interface Transform {
  position: Vector3D;
  rotation: Quaternion;
  scale: number;
}

/** A transform that moves nothing. */
export function identityTransform(): Transform {
  return {
    position: Vector3D.create(0, 0, 0),
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: 1,
  };
}

/** A copy of `transform` that shares nothing with it. */
export function cloneTransform(transform: Transform): Transform {
  return {
    position: Vector3D.create(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    ),
    rotation: { ...transform.rotation },
    scale: transform.scale,
  };
}

/** `a` followed by `b`, both read in the space `a` leaves. */
export function composeTransforms(
  parent: Transform,
  child: Transform,
  out: Transform = identityTransform(),
): Transform {
  const moved = Vector3D.multiplyScalar(child.position, parent.scale);
  Vector3D.rotateQuaternion(moved, parent.rotation, moved);

  out.position = Vector3D.add(parent.position, moved, out.position);
  out.rotation = Quaternion.multiply(
    parent.rotation,
    child.rotation,
    out.rotation,
  );
  out.scale = parent.scale * child.scale;
  return out;
}

/** The transform that undoes `transform`. */
export function invertTransform(
  transform: Transform,
  out: Transform = identityTransform(),
): Transform {
  const inverseRotation = conjugate(transform.rotation, out.rotation);
  const negative = Vector3D.multiplyScalar(transform.position, -1);
  Vector3D.rotateQuaternion(negative, inverseRotation, out.position);

  out.scale = transform.scale === 0 ? 0 : 1 / transform.scale;
  Vector3D.multiplyScalar(out.position, out.scale, out.position);
  return out;
}

/** The rotation that undoes `rotation`. */
export function conjugate(
  rotation: Quaternion,
  out: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
): Quaternion {
  out.x = -rotation.x;
  out.y = -rotation.y;
  out.z = -rotation.z;
  out.w = rotation.w;
  return out;
}

/** `rotation` brought back to unit length. */
export function normalizeQuaternion(
  rotation: Quaternion,
  out: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
): Quaternion {
  const length =
    Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w) || 1;
  out.x = rotation.x / length;
  out.y = rotation.y / length;
  out.z = rotation.z / length;
  out.w = rotation.w / length;
  return out;
}

/** A turn of `angle` radians about one axis. */
export function quaternionFromAxisAngle(
  axis: Vector3D,
  angle: number,
  out: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
): Quaternion {
  const half = angle / 2;
  const sin = Math.sin(half);
  const length = Vector3D.length(axis) || 1;

  out.x = (axis.x / length) * sin;
  out.y = (axis.y / length) * sin;
  out.z = (axis.z / length) * sin;
  out.w = Math.cos(half);
  return out;
}

/**
 * The turn of `turn.x` about the x axis, then `turn.y` about the y axis that
 * leaves, then `turn.z` about the z — the same order the voxel models are posed
 * in, so a bone reads the same three angles a part does.
 */
export function quaternionFromEuler(
  turn: Vector3D,
  out: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
): Quaternion {
  const aboutX = quaternionFromAxisAngle(X_AXIS, turn.x);
  const aboutY = quaternionFromAxisAngle(Y_AXIS, turn.y);
  const aboutZ = quaternionFromAxisAngle(Z_AXIS, turn.z);

  Quaternion.multiply(aboutX, aboutY, SCRATCH);
  return Quaternion.multiply(SCRATCH, aboutZ, out);
}

/**
 * The turn a column-major rotation matrix describes. Reading a turn off a
 * matrix is what turns a voxel part's posed orientation — which the model
 * library carries as a matrix — into the quaternion a bone is animated with.
 */
export function quaternionFromMatrix3(
  matrix: Matrix3x3,
  out: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
): Quaternion {
  // Column-major, the layout the model library writes: one column per axis, so
  // the element at a row and a column reads at `column * 3 + row`.
  const at = (row: number, column: number) => matrix[column * 3 + row];
  const trace = at(0, 0) + at(1, 1) + at(2, 2);

  if (trace > 0) {
    const span = Math.sqrt(trace + 1) * 2;
    out.x = (at(2, 1) - at(1, 2)) / span;
    out.y = (at(0, 2) - at(2, 0)) / span;
    out.z = (at(1, 0) - at(0, 1)) / span;
    out.w = 0.25 * span;
    return out;
  }

  const longest =
    at(0, 0) > at(1, 1) && at(0, 0) > at(2, 2)
      ? 0
      : at(1, 1) > at(2, 2)
        ? 1
        : 2;
  const next = (longest + 1) % 3;
  const last = (longest + 2) % 3;

  const span =
    Math.sqrt(1 + at(longest, longest) - at(next, next) - at(last, last)) * 2;
  const vector = [0, 0, 0];

  vector[longest] = 0.25 * span;
  vector[next] = (at(next, longest) + at(longest, next)) / span;
  vector[last] = (at(last, longest) + at(longest, last)) / span;

  out.x = vector[0];
  out.y = vector[1];
  out.z = vector[2];
  out.w = (at(last, next) - at(next, last)) / span;
  return out;
}

/** The turn between `from` and `to`, `share` of the way along it. */
export function slerp(
  from: Quaternion,
  to: Quaternion,
  share: number,
  out: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
): Quaternion {
  let b = to;
  let dot = from.x * to.x + from.y * to.y + from.z * to.z + from.w * to.w;

  // Two quaternions that face away from each other describe the same turn, and
  // running straight between them would swing the long way round. Reading one
  // of them backwards is the short way, and turning the same way either way.
  if (dot < 0) {
    dot = -dot;
    b = { x: -to.x, y: -to.y, z: -to.z, w: -to.w };
  }

  if (dot > 0.9995) {
    out.x = from.x + (b.x - from.x) * share;
    out.y = from.y + (b.y - from.y) * share;
    out.z = from.z + (b.z - from.z) * share;
    out.w = from.w + (b.w - from.w) * share;
    return normalizeQuaternion(out, out);
  }

  const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
  const sin = Math.sin(angle);
  const start = Math.sin((1 - share) * angle) / sin;
  const end = Math.sin(share * angle) / sin;

  out.x = from.x * start + b.x * end;
  out.y = from.y * start + b.y * end;
  out.z = from.z * start + b.z * end;
  out.w = from.w * start + b.w * end;
  return out;
}

const X_AXIS = Object.freeze(Vector3D.create(1, 0, 0));
const Y_AXIS = Object.freeze(Vector3D.create(0, 1, 0));
const Z_AXIS = Object.freeze(Vector3D.create(0, 0, 1));

/** Reused between the turns, a turn being read off it and not kept. */
const SCRATCH: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
