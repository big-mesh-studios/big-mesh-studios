/**
 * A reference image carried in a level file, and how its bytes are written.
 *
 * ## Why this lives at the top level of a level file and not in `items`
 *
 * **Because a reference image is not geometry.** It never becomes a `LevelItem`, never folds
 * into the CSG and never reaches `apply-level.ts`; it is a tracing aid, and a tracing aid that
 * changed the terrain would be one that changed the thing being traced. Putting it in `items`
 * would also make it a `LevelItem` an older build has to understand — and an unknown item kind
 * is a refused file (`level-plan.ts`).
 *
 * A top-level key is the one place a level file can grow **without breaking an older reader**:
 * `readLevelPlan` checks only `version` and `items`, so a build that has never heard of
 * `imagePlane` loads the level and silently ignores the picture. That is the compatibility the
 * plan promised, and it is why this is not a `LevelItem`.
 *
 * ## Why the bytes are base64 and not a data URL or a second file
 *
 * **Because the requirement is that the exact bytes and media type round-trip**, and a level is
 * one JSON document a person can read and diff. Base64 is the smallest honest encoding of
 * arbitrary bytes in JSON, and it sits beside the `mime` the picker reported rather than being
 * folded into a `data:` URL whose prefix would have to be parsed back apart. There is no
 * second file to lose track of, because a level file is the artefact a place carries.
 *
 * ## Why the bytes are bounded
 *
 * **Because a reference is optional chrome, and a level is not where a photograph belongs.**
 * `MAX_PLACE_LEVEL_CHARS` caps a level attached to a place at one megabyte of characters
 * (`place-file.ts`), and base64 inflates by a third — so the decoded cap here is chosen to keep
 * a level with a reference comfortably under it. A bigger image still exports and imports as a
 * plain file; it just cannot be attached to a place, and the notice says so.
 */

import { MAX_COORDINATE } from "../limits";
import type { LevelRefusal } from "./level-plan";
import type { Vec3Like } from "../guest/place-api";

/**
 * A reference image as the editor holds it: the live form, with the bytes themselves.
 *
 * The on-disk form is the same thing with `bytes` base64-encoded (`encodeImagePlane`); keeping
 * one name for both would be one name for two shapes, which is exactly the bug a reader is for.
 */
export interface LevelImagePlane {
  /** The middle of the image, laid on the ground. */
  readonly at: Vec3Like;
  /** Turn about the local up, in radians. */
  readonly yaw: number;
  /** How wide the image is across the ground, in world units. Height follows the aspect. */
  readonly width: number;
  /** 0 to 1. */
  readonly opacity: number;
  /** The media type the file picker reported, kept verbatim — `image/png`, or empty. */
  readonly mime: string;
  /** The picked file's exact bytes. */
  readonly bytes: Uint8Array;
}

/**
 * The most bytes a reference may decode to.
 *
 * **Half a megabyte of image**, which base64s to about 700 KB — enough left under the place's
 * one-megabyte character cap (`place-file.ts`) for the level's own items. See the header for
 * why a bound is here at all, and why a bigger image is still a valid, just unattachable, file.
 */
export const MAX_IMAGE_PLANE_BYTES = 512 * 1024;

/**
 * The widest a reference image may be, in world units.
 *
 * **20000, which is far larger than a level shape's own `MAX_SHAPE_SIZE` of 1000 on purpose.**
 * A shape is a thing in the world and a thousand units is already enormous; a reference image is
 * a *map* of the thing, and a plan of a large build or a whole site is thousands of units across.
 * A tracing aid bounded to a shape's reach would be a picture somebody could not lay out at the
 * scale they are building at.
 */
export const MAX_IMAGE_PLANE_WIDTH = 20000;

/** The longest a media type may be. Real ones are a few dozen characters. */
const MAX_MIME_LENGTH = 100;

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Bytes as base64, built rather than delegated to `btoa`.
 *
 * **Deliberately not `btoa`.** A browser's `btoa` takes a binary *string*, so its caller has to
 * build one first — `String.fromCharCode(...bytes)` — which overflows the stack for a real
 * image and is the reason people write the chunked version instead. Encoding the bytes directly
 * avoids both the intermediate string and the trap, and keeps this testable in Node without a
 * DOM.
 */
export const bytesToBase64 = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += BASE64_ALPHABET[b0 >> 2];
    out += BASE64_ALPHABET[((b0 & 0b11) << 4) | ((b1 ?? 0) >> 4)];
    out +=
      b1 === undefined
        ? "="
        : BASE64_ALPHABET[((b1 & 0b1111) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : BASE64_ALPHABET[b2 & 0b111111];
  }
  return out;
};

/**
 * Base64 back to bytes, or `undefined` for anything that is not base64.
 *
 * **`undefined` rather than a throw**, because the caller is a reader judging an untrusted file
 * and a refusal is the answer it wants. `=` padding is accepted and ignored; any other
 * non-alphabet character is refused.
 */
export const base64ToBytes = (text: string): Uint8Array | undefined => {
  const unpadded = text.endsWith("=") ? text.replace(/=+$/, "") : text;
  const out = new Uint8Array(Math.floor((unpadded.length * 3) / 4));
  let accumulator = 0;
  let bits = 0;
  let at = 0;
  for (const character of unpadded) {
    const value = BASE64_ALPHABET.indexOf(character);
    if (value < 0) return undefined;
    accumulator = (accumulator << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (accumulator >> bits) & 0xff;
    }
  }
  // The three low bits of the last group are padding; anything else in them is malformed and
  // is dropped rather than refused, which is what every base64 decoder does.
  return out.subarray(0, at);
};

/** The live reference as the value a level file's `imagePlane` key holds. */
export const encodeImagePlane = (
  imagePlane: LevelImagePlane,
): Record<string, unknown> => ({
  at: imagePlane.at,
  yaw: imagePlane.yaw,
  width: imagePlane.width,
  opacity: imagePlane.opacity,
  mime: imagePlane.mime,
  bytes: bytesToBase64(imagePlane.bytes),
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const refuse = (why: string): { readonly refusal: LevelRefusal } => ({
  refusal: { where: "imagePlane", why },
});

/**
 * A three-number point within the coordinate bound, or why it is not one.
 *
 * **Written here rather than imported from `level-plan.ts`,** which has the same reader. That
 * import would be a cycle — `level-plan.ts` reads `encodeImagePlane` from this file — and the
 * arithmetic is five lines. The rule is identical so a point is a point in both files.
 */
const readPoint = (
  value: unknown,
  where: string,
):
  | { readonly point: [number, number, number] }
  | { readonly refusal: LevelRefusal } => {
  if (!Array.isArray(value) || value.length !== 3) {
    return { refusal: { where, why: "is not three numbers" } };
  }
  for (const part of value) {
    if (typeof part !== "number" || !Number.isFinite(part)) {
      return {
        refusal: { where, why: "has a part that is not a finite number" },
      };
    }
    if (part < -MAX_COORDINATE || part > MAX_COORDINATE) {
      return {
        refusal: {
          where,
          why: `has a part outside -${MAX_COORDINATE} to ${MAX_COORDINATE}`,
        },
      };
    }
  }
  return {
    point: [value[0] as number, value[1] as number, value[2] as number],
  };
};

/**
 * Reads a level file's `imagePlane`, or `undefined` when the file carries none.
 *
 * **Whole-or-refused like every other reader here** ([ADR 0017](../../../../docs/adr/0017-the-vocabulary-is-a-table.md)):
 * an `imagePlane` present but malformed refuses the file rather than being dropped, so a level
 * that says it has a reference and cannot produce one is not quietly loaded without it.
 */
export const decodeImagePlane = (
  value: unknown,
):
  | { readonly imagePlane: LevelImagePlane | undefined }
  | { readonly refusal: LevelRefusal } => {
  if (value === undefined) return { imagePlane: undefined };
  if (!isPlainObject(value)) return refuse("is not an object");

  const at = readPoint(value.at, "imagePlane.at");
  if ("refusal" in at) return at;

  const yaw = value.yaw;
  if (typeof yaw !== "number" || !Number.isFinite(yaw)) {
    return refuse("yaw is not a finite number");
  }

  const width = value.width;
  if (
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    width > MAX_IMAGE_PLANE_WIDTH
  ) {
    return refuse(`width is outside 0 to ${MAX_IMAGE_PLANE_WIDTH}`);
  }

  const opacity = value.opacity;
  if (
    typeof opacity !== "number" ||
    !Number.isFinite(opacity) ||
    opacity < 0 ||
    opacity > 1
  ) {
    return refuse("opacity is outside 0 to 1");
  }

  const mime = value.mime;
  if (typeof mime !== "string" || mime.length > MAX_MIME_LENGTH) {
    return refuse(
      `mime is not a string of at most ${MAX_MIME_LENGTH} characters`,
    );
  }

  const encoded = value.bytes;
  if (typeof encoded !== "string" || encoded.length === 0) {
    return refuse("bytes is not a base64 string");
  }
  const bytes = base64ToBytes(encoded);
  if (bytes === undefined) return refuse("bytes is not base64");
  if (bytes.byteLength > MAX_IMAGE_PLANE_BYTES) {
    return refuse(
      `decodes to ${bytes.byteLength} bytes, and a reference may hold ${MAX_IMAGE_PLANE_BYTES}`,
    );
  }

  // **And nothing but its own keys**, as every other item reader insists: a field this build
  // does not know is a file written by something else, and a newer editor's renamed field
  // means something here and nothing there.
  const known = new Set(["at", "yaw", "width", "opacity", "mime", "bytes"]);
  for (const key of Object.keys(value)) {
    if (!known.has(key))
      return refuse(`${key} is not a field this build knows`);
  }

  return {
    imagePlane: {
      at: at.point,
      yaw,
      width,
      opacity,
      mime,
      bytes,
    },
  };
};
