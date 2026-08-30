import { RGBA } from "./rgba";

export interface HSVA {
  /** Hue in degrees, `0..360`. */
  h: number;
  /** Saturation, `0..1`. */
  s: number;
  /** Value (brightness), `0..1`. */
  v: number;
  /** Alpha, `0..1`. */
  a: number;
}

export namespace HSVA {
  function wrapHue(h: number) {
    return ((h % 360) + 360) % 360;
  }

  function clamp(value: number) {
    return Math.max(0, Math.min(1, value));
  }

  export function equals(a: HSVA, b: HSVA) {
    return a.h === b.h && a.s === b.s && a.v === b.v && a.a === b.a;
  }

  /**
   * Converts to 8-bit RGBA. Hue wraps and the other components clamp, so
   * out-of-range input can never produce out-of-range channels.
   */
  export function toRGBA(hsva: HSVA): RGBA {
    const h = wrapHue(hsva.h);
    const s = clamp(hsva.s);
    const v = clamp(hsva.v);
    const a = clamp(hsva.a);

    const chroma = v * s;
    const sector = h / 60;
    // Rises and falls across each pair of sectors, tracing the ramp between primaries.
    const ramp = chroma * (1 - Math.abs((sector % 2) - 1));
    const floor = v - chroma;

    const [r, g, b] =
      sector < 1
        ? [chroma, ramp, 0]
        : sector < 2
          ? [ramp, chroma, 0]
          : sector < 3
            ? [0, chroma, ramp]
            : sector < 4
              ? [0, ramp, chroma]
              : sector < 5
                ? [ramp, 0, chroma]
                : [chroma, 0, ramp];

    return {
      r: Math.round((r + floor) * 255),
      g: Math.round((g + floor) * 255),
      b: Math.round((b + floor) * 255),
      a: Math.round(a * 255),
    };
  }

  /**
   * Converts from 8-bit RGBA.
   *
   * The conversion is not total: every grey has no defined hue, and black has
   * no defined hue or saturation. Those components are taken from `fallback`
   * instead, so a colour passing through a degenerate point keeps the hue and
   * saturation the user last chose.
   */
  export function fromRGBA(rgba: RGBA, fallback: HSVA): HSVA {
    const r = rgba.r / 255;
    const g = rgba.g / 255;
    const b = rgba.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;

    // `max === 0` implies `chroma === 0`, so black takes both fallbacks.
    const s = max === 0 ? fallback.s : chroma / max;
    const h =
      chroma === 0
        ? fallback.h
        : wrapHue(
            60 *
              (max === r
                ? (g - b) / chroma
                : max === g
                  ? (b - r) / chroma + 2
                  : (r - g) / chroma + 4),
          );

    return { h, s, v: max, a: rgba.a / 255 };
  }

  export function toCSS(hsva: HSVA) {
    return RGBA.toCSS(toRGBA(hsva));
  }
}
