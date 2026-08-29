// The hotbar icon for the sword: the background properties that crop the sword
// out of the items spritesheet, so the picture needs no image of its own. The
// keys are the CSS property names Solid's style prop applies verbatim, which
// is why they are kebab-case rather than camelCase.
import {
  SPRITESHEET_HEIGHT,
  SPRITESHEET_URL,
  SPRITESHEET_WIDTH,
  SWORD_SPRITE_BBOX,
} from "../player/sword-model";

/** How big the sword is shown inside its 52px hotbar slot. */
export const ICON_SIZE = 46;

/** The background that crops the sword out of the items spritesheet, centred. */
export const swordIconStyle = (): Record<string, string> => {
  const scale = ICON_SIZE / Math.max(SWORD_SPRITE_BBOX.w, SWORD_SPRITE_BBOX.h);
  const w = SWORD_SPRITE_BBOX.w * scale;
  const h = SWORD_SPRITE_BBOX.h * scale;
  return {
    "background-image": `url("${SPRITESHEET_URL}")`,
    "background-repeat": "no-repeat",
    "background-size": `${SPRITESHEET_WIDTH * scale}px ${SPRITESHEET_HEIGHT * scale}px`,
    "background-position": `${(ICON_SIZE - w) / 2 - SWORD_SPRITE_BBOX.x * scale}px ${(ICON_SIZE - h) / 2 - SWORD_SPRITE_BBOX.y * scale}px`,
  };
};
