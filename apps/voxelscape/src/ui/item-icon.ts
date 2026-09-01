// A hotbar icon: the background properties that crop one sprite out of the
// items spritesheet, so the picture needs no image of its own. The keys are
// the CSS property names Solid's style prop applies verbatim, which is why
// they are kebab-case rather than camelCase.
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
