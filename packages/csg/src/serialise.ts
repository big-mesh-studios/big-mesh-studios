/**
 * Reading and writing the operation list.
 *
 * Format version 1. A file holds the model and nothing else: no voxels, no mesh,
 * no field. That is the direct consequence of the field being computed rather than
 * stored (ADR 0002), and it makes a file's size a function of how much the user
 * has done rather than of how big the model is — a year of sculpting is kilobytes.
 *
 * The layout is little-endian, and was fixed-width until version 5: a shape's parameter
 * count depended on its type, but its position did not, because every shape's parameters
 * were contiguous after the shape's type byte. **A polygon's parameters are not a fixed
 * count**, so it writes its own width — the point count — as its first float, and the
 * reader reads that before it reads the points. Every other shape still has a width that
 * its type byte gives away, and still uses the arithmetic.
 *
 * ```
 * u16  version
 * u32  operationCount
 * per operation:
 *   u8   combine      0 Add, 1 Subtract, 2 Paint
 *   u8   shapeType    0 Ellipsoid, 1 Box, 2 Capsule, 9 Polygon
 *   f32  origin x, y, z
 *   f32  orientation x, y, z, w
 *   f32  softness
 *   ...  shape parameters, three f32 for Ellipsoid and Box, two for Capsule,
 *        and for a Polygon one f32 of point count then that many x, z pairs
 *   u8   colour r, g, b
 *   f32  opacity
 *   u8   material     0 none, otherwise an index into the renderer's material table
 * ```
 */

import type { Quat, Vec3 } from "@big-mesh-studios/core";
import { COMBINE, type Combine, type Operation } from "./operations";
import {
  parameterFloats,
  parametersToFloats,
  primitiveFromCode,
  PRIMITIVES,
  shapeFromFloats,
  type OperationShape,
  type PrimitiveSpec,
} from "@big-mesh-studios/sdf";

/**
 * The version this build writes, and the only one it can read.
 *
 * ## Why 5
 *
 * **Because a shape's width is no longer a function of its type, and that is the one
 * property this format was built on.** A polygon carries a list of points, so the reader
 * has to ask the file how many there are before it can find the next operation. The
 * count is written as the shape's first parameter, which keeps the block 4-byte aligned
 * and keeps `floats * 4` as the width arithmetic.
 *
 * **The bump is needed rather than merely tidy because a version 4 reader would misparse
 * a version 5 file in the worst possible way.** It derives each operation's width from
 * its type byte, so a polygon — whose first float is `3` where a width of `3` would put
 * the next operation — would be read as three parameters and the reader would resume at
 * the middle of the outline. Every subsequent operation would land at a plausible offset
 * with plausible numbers, which is the exact failure the version byte exists to prevent.
 *
 * ## The cost, which is not small
 *
 * **Every place already baked at version 4 stops loading.** `deserialiseOperations`
 * refuses any version that is not this one, so the snack models in this repository and
 * any figure or prop model inside a published `.sdfmod` has to be re-exported.
 * `tools/make-snack-models.ts` regenerates this repository's own.
 *
 * **A fixed-capacity encoding would have cost nothing and been rejected anyway**, which
 * is the part worth remembering: `Polygon` could carry a fixed 64 points and always
 * occupy `1 + 2 * 64` floats, leaving the format's central invariant untouched and the
 * version at 4. It was chosen against because it caps a floor at 64 corners and makes a
 * triangle spend 68 bytes, and because a variable-length shape is the honest encoding of
 * a variable-length thing. The cheaper option is recorded here because it will look
 * attractive again the next time somebody wants to add one.
 *
 * ## The four earlier bumps
 *
 * **Version 4 was a material index on every operation.** One byte, appended after the
 * opacity, and it is the difference between a house whose walls are brick and a house
 * whose walls are one flat colour — which is the whole of what a fragment shader can do
 * with a per-vertex colour and the whole of what it cannot do without being told which
 * pattern to evaluate. See ADR 0048.
 *
 * **The bump is needed rather than merely tidy because the byte has no safe default
 * position.** Reading a version 3 file's bytes at version 4's widths would slide every
 * operation's shape parameters by one byte and produce a list of plausible-looking
 * primitives at plausible-looking positions, which is the exact failure this reader
 * refuses unknown versions to avoid. Zero is the written default, so a version 4 file
 * whose operations name no material is a file that draws as it did before the bump —
 * but a version 3 file cannot be read as one.
 *
 * **Version 3 was a colour that means something on any operation, not only on a
 * `Paint`.** Every operation this build wrote before version 3 carries a `colour`
 * field, and on the brush that produced it was the brush's current colour — set on `Add`
 * and `Subtract` operations as well, with a comment saying the other modes ignored it.
 * They did ignore it. Under version 3 they do not, so **opening a version 2 file would
 * paint the entire model with whatever colour the brush happened to be holding.** The
 * bytes are all still there and all still parse; what changed is what they mean, which is
 * the one thing a version byte cannot leave ambiguous.
 *
 * **Version 2 was six new primitives and one changed one.** The six needed type bytes
 * version 1 did not have. The changed one was the capsule: it was `lenX`, along X, and
 * is now `len`, along Y — which this repository's gravity and its player both agree is
 * up. Reading the old bytes as the new ones would put a capsule's length where its
 * radius was.
 *
 * The three original primitives kept their bytes across that bump (Ellipsoid 0, Box 1,
 * Capsule 2), which the table's test asserts. That does **not** make a version 1 file
 * readable: a v1 operation is 34 or 30 bytes depending on its shape and a v2 one is 40
 * or 36, so the counts disagree and the reader refuses the version before it reads an
 * operation. Keeping the bytes means a reader can be told what the numbers meant, not
 * that the files are interchangeable.
 */
export const FORMAT_VERSION = 5;

/**
 * Bytes one operation takes, apart from its shape's parameters: the combine mode,
 * the shape type, an origin, an orientation, a softness, a colour, an opacity and
 * a material.
 */
const FIXED_BYTES = 1 + 1 + 3 * 4 + 4 * 4 + 4 + 3 + 4 + 1;

/** The colour written when an operation somehow has none, matching the default. */
const WHITE = { r: 255, g: 255, b: 255 };

/**
 * Bytes one operation takes.
 *
 * **The count comes from flattening the shape, and that is the change version 5 made.**
 * It used to come from `parameterFloats`, which is a function of the *type* and is still
 * exactly right for the nine shapes whose parameters are a fixed handful of numbers. For a
 * polygon the two disagree by however many points it has, and using the type's count to
 * size a buffer that `writeShape` fills from the shape's own count would write past the
 * end of it — into the next operation, or off the end of the file.
 *
 * **One source of truth, deliberately, at the cost of an allocation.** `serialisedSize`
 * now flattens every shape to count its floats, and `writeShape` flattens it again to
 * write them. Two separate width computations would be two places for them to disagree,
 * and a disagreement here does not fail — it shifts every operation after the first
 * polygon into plausible-looking numbers, which is the failure this reader is built to
 * refuse rather than to produce.
 */
const operationBytes = (shape: OperationShape): number =>
  FIXED_BYTES + parametersToFloats(shape).length * 4;

/** A malformed file, named rather than thrown as a bare `Error`. */
export class FormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormatError";
  }
}

const combineFromCode = (code: number): Combine => {
  switch (code) {
    case COMBINE.Add:
      return "Add";
    case COMBINE.Subtract:
      return "Subtract";
    case COMBINE.Paint:
      return "Paint";
    default:
      throw new FormatError(`operation ${code} is not a combine mode`);
  }
};

const codeFromCombine = (combine: Combine): number => {
  switch (combine) {
    case "Add":
      return COMBINE.Add;
    case "Subtract":
      return COMBINE.Subtract;
    case "Paint":
      return COMBINE.Paint;
  }
};

/** Reads a shape's parameters, or as many as it says there are. */
const readShape = (
  view: DataView,
  offset: number,
  type: number,
  limit: number,
): { shape: OperationShape; next: number } => {
  const name = primitiveFromCode(type);
  if (name === null) {
    throw new FormatError(`shape type ${type} is not one this version writes`);
  }
  const spec: PrimitiveSpec = PRIMITIVES[name] as PrimitiveSpec;
  const variable = spec.parameters.find((p) => p.arity === "variable");
  // **A shape whose width is not a function of its type writes that width first, so the
  // width has to be read before the parameters can be.** The count is an `f32` rather
  // than a `u8` so that the block stays 4-byte aligned and `floats * 4` remains the only
  // width arithmetic in this file.
  const written = variable ? readFloat(view, offset, limit, name) : 0;
  // **Clamped to the table's own bounds, because a count read from a file is the one
  // number in a file that can be hostile.** Unclamped it walks the loop off the end of
  // the buffer, and every point after the first bad one is `undefined`, which reaches the
  // field as a NaN. `shapeFromFloats` clamps as well; this is the check that happens
  // before the read rather than after it.
  const points =
    variable === undefined
      ? 0
      : Math.floor(
          Math.min(
            Math.max(
              Number.isFinite(written) ? written : 0,
              variable.minPoints,
            ),
            variable.maxPoints,
          ),
        );
  // For the nine fixed shapes, the count still comes from the table — and
  // `shapeFromFloats` walks the same parameter list to rebuild the shape, so the two
  // cannot disagree about how wide a primitive is. The dummy empty call is how that
  // count is asked for without a shape in hand, and it is still the right question for a
  // shape of fixed width. **For a polygon it is that same fixed count plus two floats per
  // point** — the fixed count already includes the prefix that carries the count itself
  // and the thickness after it, so nothing is added for those and nothing is taken away.
  // The count stays in `floats[0]` because that is where `shapeFromFloats` looks for it.
  const fixed = parameterFloats(shapeFromFloats(name, []));
  const count = variable === undefined ? fixed : fixed + points * 2;
  const floats: number[] = [];
  for (let i = 0; i < count; i++) {
    floats.push(readFloat(view, offset + i * 4, limit, name));
  }
  return { shape: shapeFromFloats(name, floats), next: offset + count * 4 };
};

/**
 * One `f32`, or a refusal if it is not there.
 *
 * **The bounds check belongs here because a shape's width now comes from the file.** It
 * could not before: every operation's width was a function of its type, so each read was
 * bounded by arithmetic on data this reader already trusted. `deserialiseOperations`
 * still checks the *fixed* part against the end of the buffer; this is the check for the
 * part that is no longer fixed.
 */
const readFloat = (
  view: DataView,
  at: number,
  limit: number,
  what: string,
): number => {
  if (at + 4 > limit) {
    throw new FormatError(
      `a ${what} parameter runs past the end of a ${limit} byte file`,
    );
  }
  return view.getFloat32(at, true);
};

/** Writes a shape's parameters, returning the offset after them. */
const writeShape = (
  view: DataView,
  offset: number,
  shape: OperationShape,
): number => {
  const floats = parametersToFloats(shape);
  for (let i = 0; i < floats.length; i++) {
    view.setFloat32(offset + i * 4, floats[i], true);
  }
  return offset + floats.length * 4;
};

/** The exact byte length a serialised list will take. */
export const serialisedSize = (operations: readonly Operation[]): number => {
  let bytes = 2 + 4;
  for (const operation of operations) bytes += operationBytes(operation.shape);
  return bytes;
};

/** Writes a list into a buffer sized by `serialisedSize`. */
export const serialiseOperations = (
  operations: readonly Operation[],
  target?: ArrayBuffer,
): ArrayBuffer => {
  const size = serialisedSize(operations);
  const buffer =
    target !== undefined && target.byteLength === size
      ? target
      : new ArrayBuffer(size);
  const view = new DataView(buffer);
  view.setUint16(0, FORMAT_VERSION, true);
  view.setUint32(2, operations.length, true);

  let at = 6;
  for (const operation of operations) {
    view.setUint8(at, codeFromCombine(operation.combine));
    view.setUint8(at + 1, PRIMITIVES[operation.shape.type].code);
    at += 2;
    view.setFloat32(at, operation.origin.x, true);
    view.setFloat32(at + 4, operation.origin.y, true);
    view.setFloat32(at + 8, operation.origin.z, true);
    at += 12;
    view.setFloat32(at, operation.orientation.x, true);
    view.setFloat32(at + 4, operation.orientation.y, true);
    view.setFloat32(at + 8, operation.orientation.z, true);
    view.setFloat32(at + 12, operation.orientation.w, true);
    at += 16;
    view.setFloat32(at, operation.softness, true);
    at += 4;
    at = writeShape(view, at, operation.shape);
    const colour = operation.colour ?? WHITE;
    view.setUint8(at, colour.r);
    view.setUint8(at + 1, colour.g);
    view.setUint8(at + 2, colour.b);
    view.setFloat32(at + 3, operation.opacity, true);
    view.setUint8(at + 7, operation.material ?? 0);
    at += 8;
  }
  return buffer;
};

/**
 * Reads a list back.
 *
 * Fails on a version it does not know rather than attempting it. A version number
 * that is not recognised is not a small incompatibility to be tolerated — the file
 * is a fixed-width record and reading a later one at this version's field widths
 * produces a list of plausible-looking primitives at plausible-looking positions,
 * which is worse than refusing.
 */
export const deserialiseOperations = (buffer: ArrayBuffer): Operation[] => {
  if (buffer.byteLength < 6) {
    throw new FormatError(
      `a file needs at least 6 bytes for its version and count, and this one is ${buffer.byteLength}`,
    );
  }
  const view = new DataView(buffer);
  const version = view.getUint16(0, true);
  if (version !== FORMAT_VERSION) {
    throw new FormatError(
      `this file is version ${version} and this build reads version ${FORMAT_VERSION}`,
    );
  }

  const count = view.getUint32(2, true);
  const operations: Operation[] = [];
  let at = 6;

  for (let i = 0; i < count; i++) {
    if (at + FIXED_BYTES > buffer.byteLength) {
      throw new FormatError(
        `operation ${i} of ${count} runs past the end of a ${buffer.byteLength} byte file`,
      );
    }
    const combine = combineFromCode(view.getUint8(at));
    const shapeType = view.getUint8(at + 1);
    at += 2;

    const origin: Vec3 = {
      x: view.getFloat32(at, true),
      y: view.getFloat32(at + 4, true),
      z: view.getFloat32(at + 8, true),
    };
    at += 12;
    const orientation: Quat = {
      x: view.getFloat32(at, true),
      y: view.getFloat32(at + 4, true),
      z: view.getFloat32(at + 8, true),
      w: view.getFloat32(at + 12, true),
    };
    at += 16;
    const softness = view.getFloat32(at, true);
    at += 4;

    // **The limit is the whole buffer rather than the end of this operation**, because a
    // polygon's width is in the file: the reader has to be able to read a count and then
    // find out that it has run out, rather than trusting the count and reading past.
    const read = readShape(view, at, shapeType, buffer.byteLength);
    at = read.next;
    const colour: { r: number; g: number; b: number } = {
      r: view.getUint8(at),
      g: view.getUint8(at + 1),
      b: view.getUint8(at + 2),
    };
    const opacity = view.getFloat32(at + 3, true);
    const material = view.getUint8(at + 7);
    at += 8;

    operations.push({
      // Indexed by position in the file rather than stored, so that a list loaded
      // from a file and one built in this session have identical indices. Colour
      // resolution and undo both depend on index order, and a file that
      // disagreed with a live list about it would be a bug that only appeared after
      // a save and reload.
      index: i,
      origin,
      orientation,
      shape: read.shape,
      softness,
      combine,
      colour,
      opacity,
      // **Zero becomes absent rather than a material named "none".** The field is optional
      // and zero already means no material, so writing the zero into every operation would
      // make an operation that never asked look as though it had chosen something — the
      // same reason `makeOperation` leaves `colour` off rather than defaulting it white.
      ...(material === 0 ? {} : { material }),
    });
  }

  return operations;
};
