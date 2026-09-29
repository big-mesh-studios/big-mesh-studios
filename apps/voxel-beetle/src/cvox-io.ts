// The bytes a model is kept in, and the exchange of axes between a file and this
// editor.
//
// A `.cvox` file counts its coordinates with z standing up, and the models the
// format's author published are that way: a chess knight in one stands on its z,
// with its foot at z = 0 and its head at the far end of it. This editor is y-up,
// and so is the world a model is put into afterwards, so a file is stood on y as
// it is read here and turned back onto z as it is written.
//
// Every byte that enters or leaves the editor passes through this module. A file
// read anywhere else is a model on its side, and one that is only half read that
// way is a model on its side in some places and not in others.
import {
  readCvox,
  writeCvox,
  type LoadedVolume,
} from "@big-mesh-studios/stacker/cvox";
import { standOn, type Volume } from "@big-mesh-studios/stacker/volume";
import type { RGBA } from "@big-mesh-studios/maths";

/**
 * A model as a file holds it, stood on the axis this editor and the world it is
 * drawn into both stand models on.
 */
export function readModel(bytes: Uint8Array): LoadedVolume {
  const { volume, palette, dropped } = readCvox(bytes);
  return { volume: standOn(volume, "z", "y"), palette, dropped };
}

/**
 * A model as a file holds it: the bytes of a `.cvox`, and the box inside them
 * stood on the axis a file counts up.
 */
export function writeModel(volume: Volume, palette: RGBA[]): Uint8Array {
  return writeCvox(standOn(volume, "y", "z"), palette);
}
