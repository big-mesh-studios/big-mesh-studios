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

/** Every extent of a box, in the order the axes that measure them are named. */
export const dimensionKinds = ["width", "height", "depth"] as const;

/** The axis each of a box's three extents is measured along. */
export const dimensionAxes = {
  width: "x",
  height: "y",
  depth: "z",
} as const satisfies Record<DimensionKind, Axis>;

/**
 * The two sides that look along each axis: the one at the low end of the axis
 * and then the one at the high end. A voxel takes the colour of its two faces
 * along an axis from this pair, and each of them carves the run of voxels it
 * looks down.
 */
export const axisSides = {
  width: ["left", "right"],
  height: ["bottom", "top"],
  depth: ["back", "front"],
} as const satisfies Record<DimensionKind, readonly [SideKind, SideKind]>;

/**********************************************************************************/
/*                                     Figures                                    */
/**********************************************************************************/

/**
 * A cut across a part's box, and the two faces it reveals: the drawing of what
 * the part is like inside.
 *
 * Each of the six sides carves the whole run of voxels it looks down, so six of
 * them describe one shape, the same the whole way along every axis. A section
 * divides one axis in two and hands each stretch of it a pair of faces of its
 * own, so a part can be one shape before the cut and another after it. That is
 * what six sides alone cannot hold: two bumps standing on a diagonal come out
 * of six sides as four, and a cut between them takes the other two away.
 */
export interface Section {
  /** Which of the box's three axes the cut stands across. */
  axis: DimensionKind;
  /**
   * Where the cut stands, in voxels from the low end of that axis. The plane
   * sits before this index, dividing the axis into the run up to `at` and the
   * run from `at` on, so it lies between one and one less than the extent.
   */
  at: number;
  /**
   * The face closing the run before the cut. It is drawn the way the side at
   * the high end of the axis is drawn — the right for a width section, the top
   * for a height one, the front for a depth one — and measures the same.
   */
  before: Bitmap;
  /**
   * The face opening the run after the cut, drawn the way the side at the low
   * end of the axis is drawn: the left, the bottom or the back.
   */
  after: Bitmap;
}

/**
 * What one of a section's two faces is called: the cut it belongs to, counted
 * as the part lists them, and which of the two it is. A face is written to the
 * file under this name, and drawn on under it.
 */
export type SectionFaceKind = `section-${number}-${"before" | "after"}`;

/** One of the drawings a part is made of: one of its six sides, or a section's face. */
export type PanelKind = SideKind | SectionFaceKind;

/** What the `face` face of the cut `cut` is called. */
export const sectionFaceKind = (
  cut: number,
  face: "before" | "after",
): SectionFaceKind => `section-${cut}-${face}`;

/** Which cut and which face `panel` names, or undefined for one of the six sides. */
export function readSectionFace(
  panel: PanelKind,
): { cut: number; face: "before" | "after" } | undefined {
  const read = /^section-(\d+)-(before|after)$/.exec(panel);

  return read === null
    ? undefined
    : { cut: Number(read[1]), face: read[2] as "before" | "after" };
}

/**
 * One box of a figure: the six drawings it is made of, the cuts through it,
 * where it sits, and the point it turns about.
 */
export interface Part {
  /**
   * What the part is called. Unique within its figure, and the name of the
   * folder its drawings are written to.
   */
  name: string;
  sides: Sides;
  /**
   * The cuts across the box and the faces they reveal, in no particular order.
   * Empty for a part drawn on its six sides alone.
   */
  sections: Section[];
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
 * The drawing `panel` names, or undefined where the part has no such drawing —
 * a cut it does not have, or a name that is neither a side nor a face.
 */
export function panelBitmap(part: Part, panel: PanelKind): Bitmap | undefined {
  const face = readSectionFace(panel);

  return face === undefined
    ? part.sides[panel as SideKind]
    : part.sections[face.cut]?.[face.face];
}

/**
 * Which of the six sides `panel` is drawn the way of: itself, for one of those
 * six, and for a section's face the side it parallels — the one at the high end
 * of the cut's axis for the face closing the run before it, and the one at the
 * low end for the face opening the run after.
 *
 * A face is drawn the way that side is drawn, across the same two axes and
 * turned the same way about, which is what lets everything that lays out,
 * mirrors or measures a side do the same for a face.
 */
export function panelSide(part: Part, panel: PanelKind): SideKind | undefined {
  const face = readSectionFace(panel);

  if (face === undefined) {
    return sideKindSet[panel as SideKind] ? (panel as SideKind) : undefined;
  }

  const section = part.sections[face.cut];

  if (section === undefined) {
    return undefined;
  }

  const [low, high] = axisSides[section.axis];

  return face.face === "before" ? high : low;
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
