// The vocabulary of a voxel model: which six sides it is drawn on, and the
// bitmap each of those sides carries. The shapes those bitmaps are made of —
// `Bitmap`, `RGBA`, `Vector3D`, `Dimensions3D` — come from
// `@big-mesh-studios/maths`, which knows nothing about models.
import type { Bitmap, Dimensions3D, RGBA } from "@big-mesh-studios/maths";
import { Vector3D } from "@big-mesh-studios/maths";

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

/**********************************************************************************/
/*                                     Figures                                    */
/**********************************************************************************/

/**
 * One box of a figure: the six drawings it is made of, where it sits, and the
 * point it turns about.
 */
export interface Part {
  /**
   * What the part is called. Unique within its figure, and the name of the
   * folder its drawings are written to.
   */
  name: string;
  sides: Sides;
  /**
   * Where the part's pivot sits, in whole voxels, measured from its parent's
   * pivot — or from the figure's origin for a part with no parent.
   */
  root: Vector3D;
  /**
   * The point inside the part's own box that `root` places, in voxels from the
   * box's low corner. Turning the part turns it about this point. A box with an
   * odd extent has its centre half a voxel in, so this is not held to whole
   * voxels the way `root` is.
   */
  pivot: Vector3D;
  /** The name of the part this one hangs off, or null for one hanging off the figure. */
  parent: string | null;
}

/**
 * A model made of several parts drawn in one palette. The order of `parts` is
 * the order they are listed in.
 */
export interface Figure {
  parts: Part[];
  palette: RGBA[];
}

/**
 * The middle of a box that size, which is where a part's pivot sits unless it
 * has been put somewhere else. A part pivoting on its middle is drawn centred
 * on its root, so a figure of one part fills the view the way a lone model does.
 */
export function centrePivot(dimensions: Dimensions3D): Vector3D {
  return Vector3D.create(
    dimensions.width / 2,
    dimensions.height / 2,
    dimensions.depth / 2,
  );
}

/** The box `part` is drawn on, in voxels, as its six drawings measure it. */
export function partDimensions(part: Part): Dimensions3D {
  return {
    width: part.sides.front.width,
    height: part.sides.front.height,
    depth: part.sides.left.width,
  };
}

/**
 * Where `part`'s pivot sits in the figure, in whole voxels from the figure's
 * origin: its own root plus every root above it.
 *
 * A parent naming a part the figure does not hold, and a cycle of parents, both
 * end the walk where they are found, so parentage that does not describe a tree
 * still places every part somewhere.
 */
export function composeRoot(figure: Figure, part: Part): Vector3D {
  const composed = Vector3D.create();
  const seen = new Set<string>();
  let current: Part | undefined = part;

  while (current !== undefined && !seen.has(current.name)) {
    seen.add(current.name);
    Vector3D.add(composed, current.root, composed);
    const parent: string | null = current.parent;
    current =
      parent === null
        ? undefined
        : figure.parts.find((candidate) => candidate.name === parent);
  }

  return composed;
}
