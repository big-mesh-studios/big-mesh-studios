/**
 * The words the editor uses, in one place.
 *
 * ## Why this is a module and not strings written where they are used
 *
 * **Because a level is read by people as well as by the mesh.** `wall-4 · box` in a list
 * and `"type": "Box"` in a file are the same thing said twice, and the two must not drift.
 * The primitive names come from `@big-mesh-studios/sdf`'s table ([ADR 0025](../../../../docs/adr/0025-a-primitive-is-one-table-entry.md));
 * this only supplies the label each one gets in a toolbar, because a table of "what is this
 * called and what does it look like" belongs with the primitives and the editor needs it
 * before it can offer nine buttons.
 *
 * ## Why the combine names are spelled out
 *
 * `Add`, `Subtract` and `Paint` are the vocabulary of ADR 0025 and the wire format, and a
 * level file uses them verbatim. A level editor that renamed them would be producing a file
 * its own reader has to translate back.
 */

import { PRIMITIVES } from "@big-mesh-studios/sdf";
import type { ShapeType } from "@big-mesh-studios/sdf";

/** How each primitive is written in the toolbar, keyed by its own name. */
export const SHAPE_KIND_LABELS: Record<ShapeType, string> = {
  Box: "Box",
  RoundBox: "Rounded",
  Sphere: "Sphere",
  Ellipsoid: "Ellipsoid",
  Capsule: "Capsule",
  Cylinder: "Cylinder",
  Cone: "Cone",
  Torus: "Torus",
  HexPrism: "Hex prism",
};

/** How each combine is written in the toolbar. */
export const COMBINE_LABELS = {
  Add: "Add",
  Subtract: "Subtract",
  Paint: "Paint",
} as const;

/**
 * A starting size for each primitive, in world units.
 *
 * **Per primitive, because one number would be wrong for most of them.** A sphere of
 * `radius 12` is 24 across and a capsule of `len 12` is 12 — so "the same default" would
 * make one of them twice the size of the others in a way nobody asked for. These are
 * dimensions rather than half-extents, because that is what a person means by "how big".
 */
export const DEFAULT_SHAPE_SIZES: Record<ShapeType, number> = {
  Box: 24,
  RoundBox: 24,
  Sphere: 12,
  Ellipsoid: 12,
  Capsule: 16,
  Cylinder: 16,
  Cone: 16,
  Torus: 10,
  HexPrism: 16,
};

/**
 * The smallest each primitive may be, in world units.
 *
 * **These are the field's own floor, not a UI convenience.** `MIN_SHAPE_SIZE` is what the
 * mesher will render at all, so a level editor that let somebody go below it would build a
 * shape that is in the file, in the fold, and in no mesh — a hole in the world with no
 * error anywhere. The stepper refuses at the same number for the same reason.
 */
export const MIN_SHAPE_SIZES: Record<ShapeType, number> = {
  Box: 1,
  RoundBox: 1,
  Sphere: 0.5,
  Ellipsoid: 0.5,
  Capsule: 0.5,
  Cylinder: 0.5,
  Cone: 0.5,
  Torus: 0.5,
  HexPrism: 0.5,
};

/** Every primitive, in the order the table lists them, for a toolbar's row. */
export const SHAPE_KINDS = Object.keys(PRIMITIVES) as ShapeType[];

/**
 * How tall a drawn wall stands, in world units, when it is first made.
 *
 * **Four voxels at this world's `VOXEL_SIZE` of ten**, which is a storey's worth of wall and
 * the height a person drawing a room means by "a wall" — tall enough to stop a player, short
 * enough to see over from a step back. The inspector edits it; this is only what the first one
 * is, so that a wall drawn and not yet adjusted is a wall rather than a line.
 */
export const DEFAULT_WALL_HEIGHT = 40;

/**
 * How thick a drawn wall is, across its own line, when it is first made.
 *
 * **A little under a voxel.** Thinner than that and the mesher can miss it at a distance —
 * a wall the mesh cannot resolve is a wall with a hole in it — and much thicker stops being a
 * wall and becomes a block. The inspector edits it.
 */
export const DEFAULT_WALL_THICKNESS = 8;

/** The parameters each primitive takes, for an inspector's fields. */
export const PARAMETERS_OF = (kind: ShapeType) => PRIMITIVES[kind].parameters;

/**
 * Whether a turn about an axis can be seen on this primitive.
 *
 * **Only a sphere says no**, and it says no for a stronger reason than it looks. This asks
 * about a *kind*, not about a particular shape, so it has to be true of every instance of
 * that kind — and a sphere is the same object from every direction whatever you do to it.
 *
 * The other eight are all `true`, including the two that look like they should not be:
 *
 * - **An `Ellipsoid` with three different radii turns visibly.** It is only symmetric when
 *   its radii happen to be equal, and that is a property of the numbers somebody typed, not
 *   of the kind. A panel is free to be edited into a ball and then a turn of it will not
 *   show — which is the same situation as resizing a box into a cube and being surprised
 *   that dragging it sideways moves nothing.
 * - **A `RoundBox` turns visibly.** Rounding the corners is not making it symmetric; the
 *   thing that decides is whether its `len` is the same on each axis, and a rounded box of
 *   `40 × 6 × 20` lying on its side is plainly a different object from the one standing up.
 *
 * **So the rule is one exclusion rather than three**, and the question it answers is "could
 * this ever be symmetric", not "is this symmetric right now". The fold applies the
 * quaternion either way; what this stops is offering rotation on the one primitive where it
 * is never going to do anything.
 */
export const isAxial = (kind: ShapeType): boolean => kind !== "Sphere";

/**
 * How wide a value may be before the field stops accepting it.
 *
 * **`MAX_SHAPE_SIZE` rather than nothing**, because a level file is untrusted input and the
 * number that ends up in the world goes through the field table either way — this is here so
 * the stepper does not offer a value that will be refused on the way in.
 */
export const MAX_SHAPE_SIZE = 1000;
