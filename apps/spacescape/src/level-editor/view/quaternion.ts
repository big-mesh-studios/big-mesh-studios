/**
 * Building and composing rotations.
 *
 * **Ported from `apps/sdf-modeller/src/model/part.ts:126-215`**, which carries the same four
 * functions for the same reason.
 *
 * ## Why this is here and not in `@big-mesh-studios/core`
 *
 * **`core` has the `Quat` *type* and nothing that makes one.** It has `rotateAboutAxis` for a
 * `Vec3`, but a level shape's turn is stored as a quaternion and a drag produces a turn about
 * an arbitrary axis, so the gizmo needs construction and composition rather than a single
 * Rodrigues rotation.
 *
 * The alternative is adding four functions to a package five others depend on, which is a
 * bigger change than a feature needs, and which would leave `apps/sdf-modeller`'s identical
 * copy in place unless that app were refactored too — a second application edited on the way
 * to a level editor's drag handler. So: this is a local copy, the trade is recorded, and the
 * obvious next step is for the two of them to move into `core` together if a third caller
 * ever wants them.
 *
 * ## Why the order of composition is written down at all
 *
 * **Because getting it backwards produces a tool that works and turns the wrong way.** A
 * shape's `orientation` carries its own frame into the world, so a turn about a world axis is
 * that turn *before* whatever the shape already had: `multiply(turn, orientation)`. Written
 * the other way round it composes in the shape's own frame, which for a wall already laid on
 * its side turns it about an axis that is not the one under the finger — and looks entirely
 * healthy while doing it.
 */
import type { Quat } from "@big-mesh-studios/core";

/** The identity rotation, named because it is asked for constantly. */
export const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * A rotation of `radians` about one axis.
 *
 * **Half the angle, because a quaternion stores half.** Quaternions double-cover the
 * rotation group: `q` and `-q` are the same rotation, and the half-angle form is the one with
 * no `cos(θ/2)` argument in sight. Writing `radians / 2` here is the only place this file has
 * to remember which of the two conventions it is in.
 *
 * **The axis is normalised rather than required to be unit.** sdf-modeller's takes three
 * numbers because its caller has an `Axis`, which is already one of three unit vectors. Here
 * the caller is a drag that read an axis off a screen-space hit test, so a caller bug would
 * be a rotation of the wrong size rather than a `NaN` — and a division by zero for a
 * degenerate axis is answered with the identity instead.
 */
export const axisAngle = (
  x: number,
  y: number,
  z: number,
  radians: number,
): Quat => {
  const length = Math.sqrt(x * x + y * y + z * z);
  if (length === 0) return IDENTITY;
  const half = radians / 2;
  const s = Math.sin(half) / length;
  return { x: x * s, y: y * s, z: z * s, w: Math.cos(half) };
};

/**
 * `a` after `b`: the rotation that applies `b` first and `a` second.
 *
 * **The order is the whole of what this function is for**, and it is the reason the rotate
 * tool can turn a shape about a world axis without a matrix anywhere. See the header.
 */
export const multiply = (a: Quat, b: Quat): Quat => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
});

/**
 * Euler angles in radians, as Y-then-X-then-Z, which is what a transform panel shows.
 *
 * **The order is the same three the inspector labels, and that is the only reason it is
 * Y-X-Z** — a gizmo that turned a shape about yaw and then about pitch would compose in a
 * different order, and the panel would show angles that do not reproduce what it did.
 */
export const fromEuler = (yaw: number, pitch: number, roll: number): Quat => {
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);
  // Y * X * Z, expanded. Written out rather than multiplied because the general form is four
  // more temporaries and this is evaluated on every keystroke of a rotation field.
  return {
    x: sp * cy * cr + cp * sy * sr,
    y: cp * sy * cr - sp * cy * sr,
    z: cp * cy * sr - sp * sy * cr,
    w: cp * cy * cr + sp * sy * sr,
  };
};

/**
 * A quaternion as the three Euler angles a panel shows, in degrees.
 *
 * **Read out of the quaternion rather than kept alongside it.** The alternative — storing
 * Euler angles in the level and building a quaternion from them on the way to the fold — is
 * what a transform panel usually does, and it has the property that the two representations
 * disagree after any sequence of rotations that does not commute, so the number in the panel
 * stops being the number in the model.
 */
export const toEuler = (
  q: Quat,
): { yaw: number; pitch: number; roll: number } => {
  // Clamped, because `asin` of a value a hair outside [-1, 1] is `NaN`, and a `NaN` reaching
  // a number field's `value` blanks the input it is bound to.
  const sinPitch = 2 * (q.w * q.x - q.y * q.z);
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));
  const yaw = Math.atan2(
    2 * (q.w * q.y + q.x * q.z),
    1 - 2 * (q.x * q.x + q.y * q.y),
  );
  const roll = Math.atan2(
    2 * (q.w * q.z + q.x * q.y),
    1 - 2 * (q.x * q.x + q.z * q.z),
  );
  const toDegrees = (radians: number): number => (radians * 180) / Math.PI;
  return {
    yaw: toDegrees(yaw),
    pitch: toDegrees(pitch),
    roll: toDegrees(roll),
  };
};
