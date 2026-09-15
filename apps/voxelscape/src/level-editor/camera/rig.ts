import { Matrix4, Quaternion, Vector2, Vector3 } from "@random-mesh/rmsl/scene";

/**
 * A rigid placement — an origin and an orientation — the shape the camera
 * controller manipulates. It stands in for the `Transform3D` the original
 * controller was written against, expressed with `@random-mesh/rmsl/scene`
 * vectors so nothing here needs three.js.
 */
export interface Rig {
  origin: Vector3;
  orientation: Quaternion;
}

/** The world axis the camera rig is held upright against: the voxel world is y-up. */
export const UP: Vector3 = new Vector3(0, 1, 0);

export const v2 = (x: number, y: number): Vector2 => new Vector2(x, y);
export const v3 = (x: number, y: number, z: number): Vector3 =>
  new Vector3(x, y, z);

/** The orientation's local +X axis in world space. */
export const rigU = (rig: Rig): Vector3 =>
  new Vector3(1, 0, 0).applyQuaternion(rig.orientation);

/** The orientation's local +Y axis in world space. */
export const rigV = (rig: Rig): Vector3 =>
  new Vector3(0, 1, 0).applyQuaternion(rig.orientation);

/** The orientation's local +Z axis in world space. */
export const rigW = (rig: Rig): Vector3 =>
  new Vector3(0, 0, 1).applyQuaternion(rig.orientation);

/** A world point expressed in the rig's own frame. */
export const rigPointTo = (rig: Rig, point: Vector3): Vector3 =>
  point
    .clone()
    .sub(rig.origin)
    .applyQuaternion(rig.orientation.clone().conjugate());

/** A world direction expressed in the rig's own frame. */
export const rigVectorTo = (rig: Rig, vector: Vector3): Vector3 =>
  vector.clone().applyQuaternion(rig.orientation.clone().conjugate());

/** A point in the rig's frame expressed in world space. */
export const rigPointFrom = (rig: Rig, point: Vector3): Vector3 =>
  point.clone().applyQuaternion(rig.orientation).add(rig.origin);

/** A direction in the rig's frame expressed in world space. */
export const rigVectorFrom = (rig: Rig, vector: Vector3): Vector3 =>
  vector.clone().applyQuaternion(rig.orientation);

/** Rotates `vector` by `quaternion`, leaving both untouched. */
export const quatRotate = (quaternion: Quaternion, vector: Vector3): Vector3 =>
  vector.clone().applyQuaternion(quaternion);

/** The rotation whose local axes are `u`, `v`, `w` (orthonormal, right-handed). */
export const quatFromBasis = (
  u: Vector3,
  v: Vector3,
  w: Vector3,
): Quaternion => {
  const matrix = new Matrix4().set(
    u.x,
    v.x,
    w.x,
    0,
    u.y,
    v.y,
    w.y,
    0,
    u.z,
    v.z,
    w.z,
    0,
    0,
    0,
    0,
    1,
  );
  return new Quaternion().setFromRotationMatrix(matrix);
};

/** The rotation looking down `-w` with `v` as up, `w` and `v` orthonormal. */
export const quatFromVW = (v: Vector3, w: Vector3): Quaternion =>
  quatFromBasis(v.clone().cross(w), v, w);

/** The rotation with local +X `u` and local +Z `w`, both orthonormal. */
export const quatFromWU = (w: Vector3, u: Vector3): Quaternion =>
  quatFromBasis(u, w.clone().cross(u), w);

/** The rotation with local +X `u` and local +Y `v`, both orthonormal. */
export const quatFromUV = (u: Vector3, v: Vector3): Quaternion =>
  quatFromBasis(u, v, u.clone().cross(v));

export const quatFromAxisAngle = (axis: Vector3, angle: number): Quaternion =>
  new Quaternion().setFromAxisAngle(axis, angle);

/** A ray in world space. */
export interface CameraRay {
  origin: Vector3;
  direction: Vector3;
}

/** The point `t` along `ray`. */
export const rayPointAt = (ray: CameraRay, t: number): Vector3 =>
  ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));

/**
 * Where `ray` crosses the plane through `planePoint` with `planeNormal`, or
 * undefined where the two are parallel.
 */
export const rayPlanePoint = (
  ray: CameraRay,
  planePoint: Vector3,
  planeNormal: Vector3,
): Vector3 | undefined => {
  const denominator = ray.direction.dot(planeNormal);
  const t = planePoint.clone().sub(ray.origin).dot(planeNormal) / denominator;
  if (!Number.isFinite(t)) {
    return undefined;
  }
  return rayPointAt(ray, t);
};

/**
 * The rig at `origin` looking toward `target`, upright against `up`, or
 * undefined where the two points coincide or the look direction is straight up.
 */
export const rigLookingAt = (
  origin: Vector3,
  target: Vector3,
  up: Vector3 = UP,
): Rig | undefined => {
  const w = origin.clone().sub(target);
  if (w.lengthSq() === 0) {
    return undefined;
  }
  w.normalize();
  const v = w.clone().cross(up.clone().cross(w));
  if (v.lengthSq() === 0) {
    return undefined;
  }
  v.normalize();
  const u = v.clone().cross(w);
  return { origin, orientation: quatFromBasis(u, v, w) };
};
