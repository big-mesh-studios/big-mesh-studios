import { Matrix3x3, Vector3D } from "../../maths";

/**
 * Directional and ambient light for the model, in world space. The model
 * turns beneath a fixed light, so the direction is rotated into the model's
 * space before it is uploaded rather than sent as it stands.
 */
export const LIGHT_DIR = Object.freeze(Vector3D.normalize(Vector3D.create(0.4, 0.7, 0.8)));
export const LIGHT_COLOUR = new Float32Array([1.0, 0.97, 0.9]);
export const AMBIENT_COLOUR = new Float32Array([0.35, 0.35, 0.4]);

/** Rotates `LIGHT_DIR` into model space by `worldToModel`, into `out`. */
export function modelSpaceLightDirection(worldToModel: Matrix3x3, out: Vector3D): Vector3D {
  return Matrix3x3.transform(worldToModel, LIGHT_DIR, out);
}
