import { Bitmap } from "./maths";
import shaders from "./shaders";
import type { Sides } from "./types";

/** The three pairs of panels that face each other, named near-then-far. */
export type PanelPairKind = "frontBack" | "leftRight" | "topBottom";

export const PANEL_PAIR_KINDS = ["frontBack", "leftRight", "topBottom"] as const satisfies
  readonly PanelPairKind[];

/** The sampler slot each pair is bound to in the ray marcher. */
export const PANEL_PAIR_UNIFORM_NAME = {
  frontBack: shaders.uFrontBack,
  leftRight: shaders.uLeftRight,
  topBottom: shaders.uTopBottom,
} satisfies Record<PanelPairKind, string>;

export type PanelPairTexture = {
  data: Uint8Array;
  width: number;
  height: number;
};

/**
 * A pair of facing panels as both halves of the marcher want it. Panels that
 * face each other are the same size, so the two travel in one texture and a
 * cell costs one lookup instead of two: the near panel's palette index in the
 * red channel, the far panel's in the green.
 *
 * The texture is addressed by the coordinates the near panel uses, so the far
 * panel is written in already flipped onto them, and the marcher needs no second
 * coordinate of its own. Two flips cover all three pairs: front against back and
 * left against right disagree only about which end of the panel's x they count
 * from, while top against bottom disagree about the row.
 *
 * The GPU renderer uploads every integer texture as RGBA8UI and the CPU picker's
 * texel fetch strides by four bytes as well, which is why a cell takes four
 * bytes here whether or not all of them carry something.
 */
const packFlippedInX = (near: Bitmap, far: Bitmap): PanelPairTexture => {
  const data = new Uint8Array(near.width * near.height * 4);
  for (let y = 0; y < near.height; y++) {
    const nearRow = y * near.width;
    const farRow = y * far.width;
    for (let x = 0; x < near.width; x++) {
      const offset = (nearRow + x) << 2;
      data[offset] = near.data[nearRow + x];
      data[offset + 1] = far.data[farRow + far.width - 1 - x];
    }
  }
  return { data, width: near.width, height: near.height };
};

/** The same, for a pair whose panels count their rows from opposite ends. */
const packFlippedInY = (near: Bitmap, far: Bitmap): PanelPairTexture => {
  const data = new Uint8Array(near.width * near.height * 4);
  for (let y = 0; y < near.height; y++) {
    const nearRow = y * near.width;
    const farRow = (far.height - 1 - y) * far.width;
    for (let x = 0; x < near.width; x++) {
      const offset = (nearRow + x) << 2;
      data[offset] = near.data[nearRow + x];
      data[offset + 1] = far.data[farRow + x];
    }
  }
  return { data, width: near.width, height: near.height };
};

/**
 * The three textures the marcher reads the model from. Each pair fixes the axis
 * its panels look along and flips the far panel onto the near one's coordinates:
 * front and back share a row of the drawing and disagree only about which end of
 * the width they count from, left and right likewise about the depth, and top
 * and bottom about the row of the panel itself.
 */
export const toPanelPairTextures = (sides: Sides): Record<PanelPairKind, PanelPairTexture> => ({
  frontBack: packFlippedInX(sides.front, sides.back),
  leftRight: packFlippedInX(sides.left, sides.right),
  topBottom: packFlippedInY(sides.top, sides.bottom),
});
