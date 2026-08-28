// The vocabulary of a voxel model: which six sides it is drawn on, and the
// bitmap each of those sides carries. The shapes those bitmaps are made of —
// `Bitmap`, `RGBA`, `Vector3D`, `Dimensions3D` — come from
// `@big-mesh-studios/maths`, which knows nothing about models.
import type { Bitmap, Dimensions3D, RGBA } from "@big-mesh-studios/maths";

/**
 * Every side of the box a model is drawn on. Declared as an object rather than
 * a union so the side names can be iterated at runtime as well as named in a
 * type.
 */
export const sideKindSet = {
  front: true,
  left: true,
  right: true,
  back: true,
  top: true,
  bottom: true,
} as const;

export type SideKind = keyof typeof sideKindSet;

/** Every side kind, in the order `sideKindSet` declares them. */
export const sideKinds = Object.keys(sideKindSet) as SideKind[];

/** The six drawings a model is made of, one per side of its box. */
export type Sides = {
  [k in SideKind]: Bitmap;
};

/**
 * A voxel model: the six drawings it is made of, the palette those drawings
 * address, and the box they describe. This is a model as anything that draws
 * one needs it — a file it was read from and a name it was published under are
 * somebody else's business.
 */
export interface Model {
  sides: Sides;
  palette: RGBA[];
  dimensions: Dimensions3D;
}

/** One of the model's three axes, named as its extent names it. */
export type DimensionKind = keyof Dimensions3D;

/**
 * The two model axes each side is drawn across and down. A side faces one axis
 * and spans the other two, which is what lets six flat drawings describe one
 * box: the front is drawn width across and height down, the left depth across
 * and height down, the top width across and depth down. Between them the sides
 * carry all three extents, and every extent is carried by four of them.
 */
export const sideAxes = {
  front: ["width", "height"],
  back: ["width", "height"],
  left: ["depth", "height"],
  right: ["depth", "height"],
  top: ["width", "depth"],
  bottom: ["width", "depth"],
} as const satisfies Record<SideKind, readonly [DimensionKind, DimensionKind]>;

/** One of the model's three axes, named as the vectors that address it name it. */
export type Axis = "x" | "y" | "z";
