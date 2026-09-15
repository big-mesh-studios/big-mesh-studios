import {
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Vector2,
  Vector3,
  type Camera,
} from "@random-mesh/rmsl/scene";
import type { CameraRay } from "./rig";

/**
 * Projects a world point to canvas pixels. `width` and `height` are the
 * canvas's CSS pixel size, so the result is in the same space a mouse event's
 * `clientX`/`clientY` offsets are.
 */
export const projectPtToScreen = (
  camera: Camera,
  width: number,
  height: number,
): ((pt: Vector3) => Vector2 | undefined) => {
  return (pt: Vector3): Vector2 | undefined => {
    const viewProjection = new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const e = viewProjection.elements;
    const clipX = e[0] * pt.x + e[4] * pt.y + e[8] * pt.z + e[12];
    const clipY = e[1] * pt.x + e[5] * pt.y + e[9] * pt.z + e[13];
    const clipW = e[3] * pt.x + e[7] * pt.y + e[11] * pt.z + e[15];
    if (clipW === 0) {
      return undefined;
    }
    const ndcX = clipX / clipW;
    const ndcY = clipY / clipW;
    return new Vector2(
      (ndcX * 0.5 + 0.5) * width,
      (1 - (ndcY * 0.5 + 0.5)) * height,
    );
  };
};

/** The camera's world position and orientation as a rig would hold them. */
const cameraBasis = (camera: Camera) => {
  const origin = camera.getWorldPosition(new Vector3());
  const orientation = camera.getWorldQuaternion(new Quaternion());
  return {
    origin,
    right: new Vector3(1, 0, 0).applyQuaternion(orientation),
    up: new Vector3(0, 1, 0).applyQuaternion(orientation),
    forward: new Vector3(0, 0, -1).applyQuaternion(orientation).normalize(),
  };
};

/**
 * The ray through a canvas pixel, built from the camera's basis so it needs no
 * matrix inverse — `@random-mesh/rmsl/scene`'s vectors have no `unproject`.
 */
export const mouseRay = (
  camera: Camera,
  width: number,
  height: number,
  pixelX: number,
  pixelY: number,
): CameraRay | undefined => {
  if (width === 0 || height === 0) {
    return undefined;
  }
  const ndcX = (pixelX / width) * 2 - 1;
  const ndcY = 1 - (pixelY / height) * 2;
  const { origin, right, up, forward } = cameraBasis(camera);

  if (camera instanceof OrthographicCamera) {
    const halfWidth = (camera.right - camera.left) / 2;
    const halfHeight = (camera.top - camera.bottom) / 2;
    const start = origin
      .clone()
      .add(right.multiplyScalar(ndcX * halfWidth))
      .add(up.multiplyScalar(ndcY * halfHeight));
    return { origin: start, direction: forward };
  }

  const perspective = camera as PerspectiveCamera;
  const halfHeight = Math.tan((perspective.fov * Math.PI) / 180 / 2);
  const halfWidth = halfHeight * perspective.aspect;
  const direction = forward
    .add(right.multiplyScalar(ndcX * halfWidth))
    .add(up.multiplyScalar(ndcY * halfHeight))
    .normalize();
  return { origin, direction };
};
