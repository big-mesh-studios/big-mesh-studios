/**
 * Turning a picked file and its stored bytes into the two things the image plane needs.
 *
 * ## Why reading and decoding are two functions
 *
 * **Because they have different lifetimes and different testability.** `readReferenceImage` is
 * the file picker's step: it copies the bytes out untouched and remembers the mime type, which
 * is exactly what a saved reference has to round-trip — no browser image API is involved and it
 * can be tested against a fake `File`. `textureFromReference` is the renderer's step: it decodes
 * those bytes with `createImageBitmap` and wraps them in an rmsl `Texture`, which needs a real
 * browser and is deliberately left out of the unit tests.
 *
 * **The decode is a derived, throwaway view.** The bytes are the truth (`image-plane-state.ts`);
 * the texture is rebuilt whenever the bytes change and disposed by the overlay, so nothing here
 * has to outlive a reference.
 *
 * ## Why the texture's own default opacity is not set here
 *
 * It is not this module's business. The overlay owns the material and reads
 * `DEFAULT_IMAGE_PLANE_OPACITY` from the state; this only answers "here is a picture of the
 * bytes, and how wide it is for its height".
 */

import { Texture } from "@random-mesh/rmsl/scene";

import type { ReferenceImage } from "./image-plane-state";

/**
 * Copies a chosen file's bytes and media type out, decoding nothing.
 *
 * **The bytes are copied verbatim**, so a reference saved later keeps the exact format the
 * picker reported. `mime` is the file's own `type`, which some platforms leave empty; that is
 * carried through rather than guessed, because a guess is a format the file did not have.
 */
export const readReferenceImage = async (
  file: File,
): Promise<ReferenceImage> => ({
  bytes: new Uint8Array(await file.arrayBuffer()),
  mime: file.type,
});

/** A decoded image, ready to hand to the overlay. */
export interface ReferenceTexture {
  readonly texture: Texture;
  /** Width ÷ height, so the plane can size itself from a single width. */
  readonly aspect: number;
}

/**
 * Decodes stored bytes into a texture, and measures its aspect.
 *
 * **A zero-height image answers an aspect of 1** rather than `Infinity` or `NaN`: a degenerate
 * decode is not worth a broken matrix, and a square is the least surprising stand-in.
 */
export const textureFromReference = async (
  image: ReferenceImage,
): Promise<ReferenceTexture> => {
  // **The bytes' own buffer is sliced, not the view passed.** A `Uint8Array` over an
  // `ArrayBufferLike` is not a `BlobPart` under this project's `lib`, and a view over a larger
  // buffer would hand the decoder trailing bytes that are not the file — the same reason
  // `readPlaceZip` reads through `arrayBuffer()` (`load-place.test.ts`).
  const blob = new Blob(
    [
      image.bytes.buffer.slice(
        image.bytes.byteOffset,
        image.bytes.byteOffset + image.bytes.byteLength,
      ) as ArrayBuffer,
    ],
    { type: image.mime },
  );
  /**
   * **Decoded flipped, because the renderer does not flip on upload.** rmsl sets WebGL's
   * `UNPACK_FLIP_Y_WEBGL` to `0` (`gl-state`) and a `PlaneGeometry`'s UV has V up, so an image
   * uploaded as-is has its top row at V = 0 and lands on the plane's bottom — upside down. Its
   * `Texture` has no `flipY` to set (`three.js` has one; this is not `three.js`), so the one
   * place left to correct it is the decode, where `imageOrientation: "flipY"` does exactly that.
   */
  const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY" });
  return {
    texture: new Texture(bitmap),
    aspect: bitmap.height > 0 ? bitmap.width / bitmap.height : 1,
  };
};
