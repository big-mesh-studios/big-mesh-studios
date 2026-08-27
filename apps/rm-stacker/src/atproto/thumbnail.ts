// The small picture a model shows for itself in a listing.
//
// It is the front panel, painted through the palette and saved at the size it
// was drawn — a fifteen-voxel model gives a fifteen-pixel image, a few hundred
// bytes, which a grid can show at any size by scaling it with the pixels kept
// square. That is the whole point of it: a listing draws one of these per model
// instead of fetching a zip, decoding six panels, solving a volume and
// rendering it, which is affordable once and not twenty times.
//
// The front panel rather than a rendered view of the finished model, because
// nothing here can render one: the preview builds its WebGL context inside the
// view that shows it, and there is no way to ask it for a picture of a model
// that is not on screen. The front is also the panel most models are drawn
// from first, so it is usually the recognisable one.
import { encode } from "fast-png";
import { Bitmap, RGBA } from "../maths";
import type { Sides } from "../types";

/**
 * The front panel of `sides` as the bytes of a png, drawn in `palette`. Cells
 * nothing was drawn in are left fully transparent, so a listing shows the
 * model's silhouette against whatever is behind it rather than a square.
 */
export function thumbnailFromSides(sides: Sides, palette: RGBA[]): Uint8Array {
  const { width, height, data } = sides.front;
  const pixels = new Uint8Array(width * height * 4);

  for (let cell = 0; cell < width * height; cell++) {
    const index = data[cell];

    if (index === Bitmap.EMPTY) {
      continue;
    }

    const colour = palette[index];

    if (colour === undefined) {
      continue;
    }

    const offset = cell << 2;
    pixels[offset + 0] = colour.r;
    pixels[offset + 1] = colour.g;
    pixels[offset + 2] = colour.b;
    // Opaque wherever anything was drawn. The alpha a palette entry carries is
    // a CSS alpha, nought to one, and would read as invisible as a byte.
    pixels[offset + 3] = 255;
  }

  return encode({ width, height, data: pixels, channels: 4, depth: 8 });
}
