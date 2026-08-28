// The sprite stack file, for anything that has to read or write one without
// being this editor: the zip of six indexed pngs and a palette, and the shapes
// that come out of it. Nothing here knows about drawing, undo, or the browser's
// file pickers — a reader gets the model and is left to do what it likes with
// it.
export { load, save } from "./load-save";
export { Bitmap, Dimensions3D, RGBA } from "./maths";
export {
  sideKindSet,
  type Dimensions2D,
  type SideKind,
  type Sides,
} from "./types";
