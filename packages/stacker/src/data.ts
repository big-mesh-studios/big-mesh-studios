// The vocabulary of a voxel model: which six sides it is drawn on, and the
// bitmap each of those sides carries. The shapes those bitmaps are made of —
// `Bitmap`, `RGBA`, `Vector3D`, `Dimensions3D` — come from
// `@big-mesh-studios/maths`, which knows nothing about models.
import type { Bitmap } from "@big-mesh-studios/maths";

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

/** One of the model's three axes, named as the vectors that address it name it. */
export type Axis = "x" | "y" | "z";
