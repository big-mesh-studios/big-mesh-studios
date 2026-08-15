import { Bitmap } from "./maths";
import shaders from "./shaders";
import { sideKindSet, type SideKind, type Sides } from "./types";
import { keysOf } from "./utils";

const SIDE_KINDS = keysOf(sideKindSet);

/** The sampler slot each panel is bound to in the ray marcher. */
export const PANEL_UNIFORM_NAME = {
  front: shaders.uFront,
  back: shaders.uBack,
  left: shaders.uLeft,
  right: shaders.uRight,
  top: shaders.uTop,
  bottom: shaders.uBottom,
} satisfies Record<SideKind, string>;

export type PanelTexture = {
  data: Uint8Array;
  width: number;
  height: number;
};

/**
 * A panel as both halves of the marcher want it. The GPU renderer uploads every
 * integer texture as RGBA8UI and the CPU picker's texel fetch strides by four
 * bytes as well, so a panel's palette indices are spread one to a texel, in the
 * red channel the shader reads them from.
 */
const toPanelTexture = (bitmap: Bitmap): PanelTexture => {
  const data = new Uint8Array(bitmap.data.length * 4);
  for (let i = 0; i < bitmap.data.length; i++) {
    data[i << 2] = bitmap.data[i];
  }
  return { data, width: bitmap.width, height: bitmap.height };
};

export const toPanelTextures = (sides: Sides): Record<SideKind, PanelTexture> =>
  Object.fromEntries(SIDE_KINDS.map(kind => [kind, toPanelTexture(sides[kind])])) as Record<
    SideKind,
    PanelTexture
  >;
