// A panel's drawing as the picture shown on the plane it stands in: which way
// round it goes there, and the texels it comes to.
import { Bitmap, type RGBA } from "@big-mesh-studios/maths";
import {
  facingAxis,
  sideDirections,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { AGAINST, type Picture } from "./standing-plane";

/** Whether each of a drawing's two axes runs against the plane's own. */
export interface DrawingFlip {
  x: boolean;
  y: boolean;
}

/** The three channels of a colour given as the one number a material takes. */
function channels(colour: number): { r: number; g: number; b: number } {
  return {
    r: (colour >> 16) & 0xff,
    g: (colour >> 8) & 0xff,
    b: colour & 0xff,
  };
}

/**
 * Which way round a drawing drawn like `side` goes on the plane it stands in.
 *
 * A drawing counts the axes it spans whichever way `sideDirections` says the
 * side it is drawn like counts them, and the plane counts its own up from the
 * corner its quad was built from. The two run together along an axis where they
 * either both count with the part's own or both count against it, and against
 * each other where only one of them does.
 */
export function drawingFlip(side: SideKind): DrawingFlip {
  const [across, down] = sideDirections[side];
  const against = AGAINST[facingAxis[side]];

  return { x: across !== against.across, y: down !== against.down };
}

/** A picture of one colour, as solid as `opacity` says, shown over the whole plane. */
export function flatPicture(colour: number, opacity: number): Picture {
  const { r, g, b } = channels(colour);

  return {
    texels: new Uint8Array([r, g, b, Math.round(opacity * 0xff)]),
    width: 1,
    height: 1,
  };
}

/**
 * `drawing` as the picture shown on the plane it is drawn on: one texel per
 * cell, in the colour `palette` gives it, and clear where a cell has nothing in
 * it so that the figure behind shows through where nothing has been drawn.
 *
 * A cell naming a colour the palette does not have is left clear rather than
 * throwing, so that a file written against a longer palette still opens.
 *
 * @param flip Which way round the drawing goes on the plane, which
 * `drawingFlip` reads off the side it is drawn like.
 */
export function drawingPicture(
  drawing: Bitmap | undefined,
  palette: RGBA[],
  flip: DrawingFlip,
): Picture {
  if (drawing === undefined) {
    return { texels: new Uint8Array(4), width: 1, height: 1 };
  }

  const { width, height } = drawing;
  const texels = new Uint8Array(width * height * 4);

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const cell = Bitmap.get(
        drawing,
        flip.x ? width - column - 1 : column,
        flip.y ? height - row - 1 : row,
      );
      const paint = cell === Bitmap.EMPTY ? undefined : palette[cell];
      const texel = (row * width + column) * 4;

      texels[texel + 0] = paint?.r ?? 0;
      texels[texel + 1] = paint?.g ?? 0;
      texels[texel + 2] = paint?.b ?? 0;
      texels[texel + 3] = paint?.a ?? 0;
    }
  }

  return { texels, width, height };
}
