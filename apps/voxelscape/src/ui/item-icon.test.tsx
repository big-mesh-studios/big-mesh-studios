// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/web";
import { ICON_SIZE, swordIconStyle } from "./item-icon";
import {
  SPRITESHEET_HEIGHT,
  SPRITESHEET_URL,
  SPRITESHEET_WIDTH,
  SWORD_SPRITE_BBOX,
} from "../player/sword-model";

describe("swordIconStyle", () => {
  it("crops the sword cell out of the spritesheet with kebab-case keys", () => {
    const style = swordIconStyle();
    const scale =
      ICON_SIZE / Math.max(SWORD_SPRITE_BBOX.w, SWORD_SPRITE_BBOX.h);
    expect(style["background-image"]).toBe(`url("${SPRITESHEET_URL}")`);
    expect(style["background-repeat"]).toBe("no-repeat");
    expect(style["background-size"]).toBe(
      `${SPRITESHEET_WIDTH * scale}px ${SPRITESHEET_HEIGHT * scale}px`,
    );
    // The sword cell sits at sheet y 640; wheat sits at the top of the sheet,
    // so the vertical offset must point well below it or the icon shows wheat.
    const position = style["background-position"].match(
      /^(-?\d+(?:\.\d+)?)px (-?\d+(?:\.\d+)?)px$/,
    );
    expect(position).not.toBeNull();
    expect(Number(position![1])).toBeCloseTo(
      (ICON_SIZE - SWORD_SPRITE_BBOX.w * scale) / 2 -
        SWORD_SPRITE_BBOX.x * scale,
    );
    expect(Number(position![2])).toBeLessThan(-200);
    expect(Number(position![2])).toBeCloseTo(
      (ICON_SIZE - SWORD_SPRITE_BBOX.h * scale) / 2 -
        SWORD_SPRITE_BBOX.y * scale,
    );
  });

  it("reaches a span's style through Solid", () => {
    const host = document.createElement("div");
    render(() => <span class="icon" style={swordIconStyle()} />, host);
    const span = host.querySelector(".icon") as HTMLElement;
    expect(span.style.backgroundImage).toBe(`url("${SPRITESHEET_URL}")`);
    expect(span.style.backgroundRepeat).toBe("no-repeat");
    expect(span.style.backgroundSize).toContain("px");
    expect(span.style.backgroundPosition).toContain("px");
  });
});
