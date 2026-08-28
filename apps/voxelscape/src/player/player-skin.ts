// What a player cube is painted with: one small canvas repeated over all six
// faces, holding a flat colour until the account's profile picture arrives and
// the picture afterwards. The canvas feeds the lit material's colour slot
// rather than replacing the material, so a player keeps taking the world's
// light — darkening at dusk, lit by lightning — instead of glowing flat at
// midnight.
import { MeshStandardMaterial, Texture } from "@random-mesh/rmsl/scene";

/**
 * Face size in canvas pixels. A player is a two-unit cube seen from across a
 * clearing at best, so this is well above what ends up on screen.
 */
const FACE_SIZE = 128;

export interface PlayerSkin {
  /** Give this to the cube's `Mesh`. */
  material: MeshStandardMaterial;
  /**
   * Paints `picture` over every face, cropped to its centre square. Safe to
   * call again with a different picture, and safe never to call at all — the
   * cube keeps its flat colour.
   */
  setPicture(picture: ImageBitmap): void;
}

/** Fills the canvas with `color`, the cube's look until a picture replaces it. */
const fillFace = (canvas: HTMLCanvasElement, color: number): void => {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

/**
 * Builds the material for one player's cube, flat `color` to begin with.
 *
 * @param color Packed red-green-blue, as the materials elsewhere take it.
 */
export const createPlayerSkin = (color: number): PlayerSkin => {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  fillFace(canvas, color);

  const texture = new Texture(canvas);
  texture.needsUpdate = true;

  const material = new MeshStandardMaterial({ roughness: 0.8 });
  material.colorNode = (b) =>
    b.sampler("playerSkin", () => texture).texture(b.uv).rgb;

  return {
    material,
    setPicture(picture) {
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        return;
      }
      // A canvas is uploaded top row first, where a texture's first row is its
      // bottom, so the picture is drawn upside down to come out upright on the
      // cube.
      ctx.setTransform(1, 0, 0, -1, 0, canvas.height);
      const side = Math.min(picture.width, picture.height);
      ctx.drawImage(
        picture,
        (picture.width - side) / 2,
        (picture.height - side) / 2,
        side,
        side,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      texture.needsUpdate = true;
    },
  };
};
