// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/web";
import { ICON_SIZE, spriteIconStyle } from "./item-icon";
import {
  SPRITESHEET_HEIGHT,
  SPRITESHEET_URL,
  SPRITESHEET_WIDTH,
} from "../player/sprite-model";

/** The drawn pixels of the bronze sword, as its sprite's own crop reports them. */
const SWORD_BBOX = { x: 17, y: 651, w: 99, h: 108 };

describe("spriteIconStyle", () => {
  it("crops the sprite out of the spritesheet with kebab-case keys", () => {
    const style = spriteIconStyle(SWORD_BBOX);
    const scale = ICON_SIZE / Math.max(SWORD_BBOX.w, SWORD_BBOX.h);
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
      (ICON_SIZE - SWORD_BBOX.w * scale) / 2 - SWORD_BBOX.x * scale,
    );
    expect(Number(position![2])).toBeLessThan(-200);
    expect(Number(position![2])).toBeCloseTo(
      (ICON_SIZE - SWORD_BBOX.h * scale) / 2 - SWORD_BBOX.y * scale,
    );
  });

  it("reaches a span's style through Solid", () => {
    const host = document.createElement("div");
    render(
      () => <span class="icon" style={spriteIconStyle(SWORD_BBOX)} />,
      host,
    );
    const span = host.querySelector(".icon") as HTMLElement;
    expect(span.style.backgroundImage).toBe(`url("${SPRITESHEET_URL}")`);
    expect(span.style.backgroundRepeat).toBe("no-repeat");
    expect(span.style.backgroundSize).toContain("px");
    expect(span.style.backgroundPosition).toContain("px");
  });
});
