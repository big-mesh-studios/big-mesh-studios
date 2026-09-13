// The one drawing a side or a section's face is written as, on its own: a
// png of one channel, eight bits a sample, a pixel's value the palette index
// it stands for. Kept apart from `format.ts`, which also knows how to gather
// several of these into a zip, so that reading a record's own pictures never
// pulls a zip decoder in behind it.
import type { Bitmap } from "@big-mesh-studios/maths";
import { decode, encode } from "fast-png";

/** `bitmap` as the png a side or a section's face is written, or uploaded, as. */
export function encodeSidePng(bitmap: Bitmap): Uint8Array {
  const { width, height, data } = bitmap;
  return encode({ width, height, data, channels: 1, depth: 8 });
}

/**
 * The bitmap `data` holds, read the way `encodeSidePng` writes one.
 *
 * @throws When the png holds more than eight bits a sample — reading it a byte
 * at a time, as every side and section face is read, would come back in
 * values nobody drew.
 */
export function decodeSidePng(data: Uint8Array): Bitmap {
  const decoded = decode(data);

  if (decoded.depth !== 8) {
    throw new Error(
      `holds ${decoded.depth} bits per sample, and only eight is read`,
    );
  }

  return {
    width: decoded.width,
    height: decoded.height,
    data: new Uint8Array(decoded.data),
  };
}
