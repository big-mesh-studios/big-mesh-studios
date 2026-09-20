// A hotbar icon: the background properties that crop one sprite out of the
// items spritesheet, so the picture needs no image of its own. The keys are
// the CSS property names Solid's style prop applies verbatim, which is why
// they are kebab-case rather than camelCase.
// Wool items use a procedurally generated colour swatch instead of a sprite.
import type { SubTexture } from "../renderers/atlas";
import {
  SPRITESHEET_HEIGHT,
  SPRITESHEET_URL,
  SPRITESHEET_WIDTH,
} from "../player/sprite-model";

/** How big a sprite is shown inside its 52px hotbar slot. */
export const ICON_SIZE = 46;

/** The background that crops `bbox` out of the items spritesheet, centred. */
export const spriteIconStyle = (bbox: SubTexture): Record<string, string> => {
  const scale = ICON_SIZE / Math.max(bbox.w, bbox.h);
  const w = bbox.w * scale;
  const h = bbox.h * scale;
  return {
    "background-image": `url("${SPRITESHEET_URL}")`,
    "background-repeat": "no-repeat",
    "background-size": `${SPRITESHEET_WIDTH * scale}px ${SPRITESHEET_HEIGHT * scale}px`,
    "background-position": `${(ICON_SIZE - w) / 2 - bbox.x * scale}px ${(ICON_SIZE - h) / 2 - bbox.y * scale}px`,
  };
};

/**
 * A procedural wool-block icon: a coloured square with a subtle woven grid
 * pattern drawn via a CSS gradient, giving it a fabric look.
 */
export const woolIconStyle = (color: string): Record<string, string> => ({
  "background-color": color,
  "background-image": [
    // horizontal threads
    `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)`,
    // vertical threads
    `repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)`,
    // light top-left sheen for a 3D feel
    `linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)`,
  ].join(", "),
  "border-radius": "3px",
  width: `${ICON_SIZE}px`,
  height: `${ICON_SIZE}px`,
  display: "block",
});
