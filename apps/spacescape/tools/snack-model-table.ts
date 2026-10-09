/**
 * The models "Get a Snack at 4 AM" wears, in voxels.
 *
 * ## Where the shapes come from
 *
 * **`apps/voxelscape/tools/make-demo-models.ts`, entry for entry** — same names, same voxel
 * extents, same palettes. This is a port, and a fridge that is not the demo's fridge is a bug in
 * the port rather than a decision about models. What the sibling expresses as a bitmap per side
 * is here as a list of parts, because the field these are folded into has no faces to texture:
 * a voxel grid's "front is brown except here" becomes a brown box with a panel on it.
 *
 * ## The colours are the sibling's, unchanged
 *
 * **A literal RGB triple rather than an index into a local palette.** The sibling numbers its
 * palette because a texel is a byte and a byte has to be an index; here a part carries its
 * colour and the palette only exists for the modeller's panel. Renumbering them would have been
 * tidier and would have made the two tables impossible to read against each other.
 *
 * ## `height` is the one number that is not copied
 *
 **In gasa4 units, and it is where `LAYOUT_SCALE` is applied** — see `make-snack-models.ts`.
 * The sibling's table has no such column because its demo chose the height per placement; this
 * one owns its size, so each row says what it is and the world units follow.
 *
 * ## Materials are named, not numbered
 *
 * **`"timber"` rather than `3`,** and the tool resolves it against the renderer's own list —
 * which is the whole reason that list is ordered and shared. Four of these wear a pattern: the
 * big wooden furniture is `timber`, the fridge and the bathtub are `plaster`, the counter and
 * the manhole are `concrete`. Everything else is plain and relies on its own colour, because a
 * 40-model demo where every surface has a pattern is a demo where nothing reads.
 */

import type { Vec3 } from "@big-mesh-studios/core";

import type { MaterialName } from "../src/render/material-names.ts";
import type { SnackModel, VoxelPart } from "./make-snack-models.ts";

type RGB = readonly [number, number, number];

/**
 * A box part, which is what most of this table is made of.
 *
 * **`at` is the centre and `half` is a half-extent**, the pair a person is thinking in when they
 * are placing a box on a counter. `primitiveMesh`'s `Box` takes a half-extent too, so nothing
 * is lost in translation, and a full-extent API over a half-extent primitive is where models
 * come out half the size they should be.
 */
const box = (
  at: Vec3,
  half: Vec3,
  colour: RGB,
  material?: MaterialName,
): VoxelPart => ({
  at,
  shape: { type: "Box", half },
  colour,
  ...(material === undefined ? {} : { material }),
});

/** A cut, which is a box like any other with a different answer to "how does this join". */
const cut = (
  at: Vec3,
  half: Vec3,
  colour: RGB,
  material?: MaterialName,
): VoxelPart => ({
  at,
  shape: { type: "Box", half },
  colour,
  combine: "Subtract",
  ...(material === undefined ? {} : { material }),
});

/**
 * The stove's four burners, as discs.
 *
 * **A local function because they are the only repeated part in the table**
 * and four copies of one number written out four times is four chances to typo
 * a coordinate.
 */
const burners = (): VoxelPart[] =>
  [
    { x: 2.6, z: 2.6 },
    { x: 7.4, z: 2.6 },
    { x: 2.6, z: 7.4 },
    { x: 7.4, z: 7.4 },
  ].map(({ x, z }) => ({
    at: { x, y: 5.35, z },
    shape: { type: "Cylinder", len: 0.5, radius: 1.7 },
    colour: [40, 42, 46],
  }));

/** Four wheels, which the car needs and nothing else does. */
const wheels = (): VoxelPart[] =>
  [
    { x: 0.8, z: 6 },
    { x: 0.8, z: 22 },
    { x: 13.2, z: 6 },
    { x: 13.2, z: 22 },
  ].map(({ x, z }) => ({
    at: { x, y: 1.1, z },
    shape: { type: "Cylinder", len: 1.2, radius: 1.1 },
    colour: [25, 25, 28],
  }));

/**
 * A figure's legs, as two capsules.
 *
 * **`Capsule` and not `Box`, for the two characters only.** Everyone else in this
 * table is a thing with corners, and a capsule on a fridge would be a mistake;
 * on a person it is the difference between a shape and a doll.
 */
const legs = (colour: RGB): VoxelPart[] =>
  [2.6, 5.4].map((x) => ({
    at: { x, y: 5.5, z: 4 },
    shape: { type: "Capsule", len: 7, radius: 1.5 },
    colour,
  }));

/** A figure's arms, as two capsules hanging beside the torso. */
const arms = (colour: RGB, y: number, len: number, z: number): VoxelPart[] =>
  [1, 7].map((x) => ({
    at: { x, y, z },
    shape: { type: "Capsule", len, radius: 1.1 },
    colour,
  }));

/**
 * The table.
 *
 * **Groups in the sibling's order** — fixtures, then the small items — so that reading the two
 * side by side is a diff rather than a hunt.
 */
export const SNACK_MODELS: readonly SnackModel[] = [
  // --- fixtures ------------------------------------------------------------
  {
    // A frame with a mattress on it, a pillow at the head, and the frame a
    // little wider than the mattress so the rail reads as a rail.
    name: "bed",
    height: 0.5,
    parts: [
      box(
        { x: 6, y: 0.5, z: 10 },
        { x: 6, y: 0.5, z: 10 },
        [120, 80, 50],
        "timber",
      ),
      box({ x: 6, y: 1.1, z: 10.5 }, { x: 5, y: 0.4, z: 9.5 }, [230, 235, 240]),
      box({ x: 6, y: 1.6, z: 2.5 }, { x: 4, y: 0.3, z: 1.5 }, [200, 60, 70]),
    ],
  },
  {
    name: "counter",
    height: 1.5,
    parts: [
      box(
        { x: 10, y: 0.4, z: 4 },
        { x: 10, y: 0.4, z: 4 },
        [90, 60, 40],
        "timber",
      ),
      box(
        { x: 10, y: 3, z: 4.4 },
        { x: 10.4, y: 2.6, z: 4 },
        [150, 105, 70],
        "timber",
      ),
      box(
        { x: 10, y: 5.6, z: 4 },
        { x: 10.6, y: 0.3, z: 4.2 },
        [220, 220, 225],
      ),
    ],
  },
  {
    name: "stove",
    height: 1.5,
    parts: [
      box({ x: 5, y: 2.5, z: 5 }, { x: 5, y: 2.5, z: 5 }, [90, 95, 100]),
      box({ x: 5, y: 5.1, z: 5 }, { x: 4.4, y: 0.1, z: 4.4 }, [30, 30, 32]),
      // The four burners, as discs rather than boxes: this is the one fixture where a
      // cylinder reads better than a cube and the extra four parts are worth it.
      ...burners(),
    ],
  },
  {
    name: "fridge",
    height: 3,
    parts: [
      box(
        { x: 3, y: 6, z: 3 },
        { x: 3, y: 6, z: 3 },
        [208, 214, 220],
        "plaster",
      ),
      // The freezer door across the top third, standing a hair proud so the
      // split is a real edge and not a change of colour.
      box(
        { x: 3, y: 10, z: 3.08 },
        { x: 2.85, y: 1.9, z: 0.1 },
        [120, 128, 136],
        "plaster",
      ),
      box(
        { x: 4.9, y: 10, z: 3.2 },
        { x: 0.15, y: 0.7, z: 0.15 },
        [70, 76, 84],
      ),
      // The fridge door's handle, which the sibling drew as a stripe of index 2.
      box(
        { x: 5.2, y: 6.5, z: 3.2 },
        { x: 0.12, y: 1.4, z: 0.12 },
        [70, 76, 84],
      ),
    ],
  },
  {
    name: "shelf",
    height: 3,
    parts: [
      box(
        { x: 5, y: 6, z: 3 },
        { x: 10, y: 12, z: 3 },
        [120, 85, 55],
        "timber",
      ),
      // The goods, as three bands of the sibling's yellow, standing proud of
      // the carcass so they read as objects on a shelf.
      ...[2.5, 6, 9.5].map((y) =>
        box({ x: 5, y, z: 2.8 }, { x: 9, y: 0.9, z: 0.3 }, [230, 200, 90]),
      ),
    ],
  },
  {
    name: "trash",
    height: 1.2,
    parts: [
      box({ x: 4, y: 4.5, z: 4 }, { x: 4, y: 4.5, z: 4 }, [90, 95, 100]),
      box({ x: 4, y: 9.1, z: 4 }, { x: 4.2, y: 0.2, z: 4.2 }, [60, 62, 66]),
      box({ x: 4, y: 9.4, z: 4 }, { x: 0.15, y: 0.35, z: 1.4 }, [40, 42, 46]),
    ],
  },
  {
    name: "sofa",
    height: 1.2,
    parts: [
      box({ x: 8, y: 1.2, z: 4.4 }, { x: 8, y: 1.2, z: 4.4 }, [50, 90, 70]),
      box({ x: 8, y: 2.4, z: 2.6 }, { x: 8, y: 0.6, z: 2.6 }, [70, 120, 90]),
      box({ x: 8, y: 2.6, z: 6.4 }, { x: 8, y: 1.8, z: 0.6 }, [70, 120, 90]),
      box({ x: 0.5, y: 3, z: 4 }, { x: 0.5, y: 3, z: 4 }, [40, 60, 50]),
      box({ x: 15.5, y: 3, z: 4 }, { x: 0.5, y: 3, z: 4 }, [40, 60, 50]),
    ],
  },
  {
    name: "tv",
    height: 1.2,
    parts: [
      box({ x: 8, y: 7, z: 1.5 }, { x: 8, y: 2.6, z: 0.6 }, [30, 32, 36]),
      box({ x: 8, y: 7, z: 2.2 }, { x: 7, y: 2.1, z: 0.1 }, [70, 75, 82]),
      box(
        { x: 8, y: 7, z: 2.35 },
        { x: 6.4, y: 1.7, z: 0.05 },
        [180, 185, 190],
      ),
      box({ x: 8, y: 1.5, z: 1.5 }, { x: 4, y: 1.5, z: 1.4 }, [70, 75, 82]),
      box({ x: 8, y: 0.2, z: 1.5 }, { x: 8, y: 0.2, z: 2.6 }, [30, 32, 36]),
    ],
  },
  {
    name: "table",
    height: 1,
    parts: [
      box(
        { x: 7.5, y: 5.5, z: 4.5 },
        { x: 7.5, y: 0.5, z: 4.5 },
        [140, 100, 65],
        "timber",
      ),
      ...[
        { x: 1, z: 1 },
        { x: 14, z: 1 },
        { x: 1, z: 8 },
        { x: 14, z: 8 },
      ].map(({ x, z }) =>
        box(
          { x, y: 2.4, z },
          { x: 0.5, y: 2.4, z: 0.5 },
          [80, 55, 35],
          "timber",
        ),
      ),
    ],
  },
  {
    name: "bench",
    height: 0.8,
    parts: [
      box(
        { x: 7.5, y: 3.6, z: 2 },
        { x: 7.5, y: 0.4, z: 2 },
        [140, 100, 65],
        "timber",
      ),
      box(
        { x: 1.2, y: 1.6, z: 2 },
        { x: 0.5, y: 1.6, z: 1.8 },
        [80, 55, 35],
        "timber",
      ),
      box(
        { x: 13.8, y: 1.6, z: 2 },
        { x: 0.5, y: 1.6, z: 1.8 },
        [80, 55, 35],
        "timber",
      ),
    ],
  },
  {
    name: "bathtub",
    height: 1,
    parts: [
      box(
        { x: 7.5, y: 3, z: 4.5 },
        { x: 7.5, y: 3, z: 4.5 },
        [235, 238, 240],
        "plaster",
      ),
      // The basin, cut rather than added: a tub whose inside is a subtraction is
      // a tub, and the sibling's bitmap had the same shape by not drawing
      // those cells.
      cut(
        { x: 7.5, y: 4.6, z: 4.5 },
        { x: 6.3, y: 1.6, z: 3.3 },
        [200, 205, 210],
        "plaster",
      ),
      box(
        { x: 0.5, y: 5.2, z: 4.5 },
        { x: 0.4, y: 0.4, z: 0.4 },
        [170, 175, 180],
      ),
    ],
  },
  {
    name: "manhole",
    height: 0.2,
    parts: [
      // **One voxel of a one-voxel-tall model**, which is ten centimetres — about right for a
      // manhole cover, and well under the spacing its ten-unit width would set on its own.
      // It did not exist for the same reason the sword's blade did.
      {
        at: { x: 5, y: 0.5, z: 5 },
        shape: { type: "Cylinder", len: 1, radius: 5 },
        colour: [110, 115, 120],
        material: "concrete",
      },
      {
        at: { x: 5, y: 0.9, z: 5 },
        shape: { type: "Cylinder", len: 0.4, radius: 3.4 },
        colour: [70, 74, 78],
        material: "concrete",
      },
    ],
  },
  {
    name: "register",
    height: 1,
    parts: [
      box({ x: 6, y: 3, z: 4 }, { x: 6, y: 3, z: 4 }, [150, 155, 160]),
      box({ x: 6, y: 5, z: 2.4 }, { x: 4, y: 1.4, z: 0.5 }, [70, 74, 78]),
      box({ x: 6, y: 6.6, z: 3.4 }, { x: 3, y: 0.4, z: 2.4 }, [40, 42, 46]),
    ],
  },
  {
    name: "vending",
    height: 3.5,
    parts: [
      box({ x: 4, y: 7, z: 2.5 }, { x: 4, y: 7, z: 2.5 }, [40, 70, 150]),
      // The glass, a real recess so the machine has a face.
      cut({ x: 4, y: 5, z: 5.05 }, { x: 2.9, y: 3.5, z: 0.35 }, [180, 40, 50]),
      box(
        { x: 4, y: 5, z: 5.35 },
        { x: 2.6, y: 3.2, z: 0.06 },
        [230, 232, 236],
      ),
      box({ x: 4, y: 11.7, z: 2.5 }, { x: 4.1, y: 1.5, z: 2.6 }, [180, 40, 50]),
      box({ x: 4, y: 13.2, z: 2.5 }, { x: 3, y: 0.5, z: 1.5 }, [30, 34, 40]),
    ],
  },
  {
    name: "breakfastmachine",
    height: 1.5,
    parts: [
      box(
        { x: 6, y: 5, z: 4 },
        { x: 6, y: 5, z: 4 },
        [225, 228, 232],
        "plaster",
      ),
      cut(
        { x: 5.5, y: 6.5, z: 4.05 },
        { x: 3.4, y: 2.4, z: 0.3 },
        [60, 64, 70],
      ),
      box(
        { x: 5.5, y: 6.5, z: 4.3 },
        { x: 3.2, y: 2.2, z: 0.05 },
        [110, 175, 115],
      ),
      box({ x: 6, y: 0.5, z: 4 }, { x: 6.1, y: 0.5, z: 4.1 }, [90, 175, 95]),
      box({ x: 11, y: 6, z: 4.2 }, { x: 0.4, y: 0.8, z: 0.4 }, [90, 175, 95]),
      box({ x: 8, y: 2.5, z: 5.5 }, { x: 2, y: 1, z: 1.5 }, [60, 64, 70]),
    ],
  },
  {
    name: "freezer",
    height: 2,
    parts: [
      box({ x: 7, y: 3, z: 5 }, { x: 7, y: 3, z: 5 }, [200, 210, 220]),
      box(
        { x: 7, y: 6.4, z: 5.1 },
        { x: 7.1, y: 1.7, z: 5.15 },
        [90, 130, 170],
      ),
      box({ x: 7, y: 6.4, z: 10.2 }, { x: 3, y: 0.2, z: 0.2 }, [60, 70, 80]),
      box(
        { x: 11, y: 2.5, z: 10.2 },
        { x: 1.4, y: 0.9, z: 0.06 },
        [60, 70, 80],
      ),
      box({ x: 7, y: 0.2, z: 5 }, { x: 7.1, y: 0.2, z: 5.1 }, [60, 70, 80]),
    ],
  },
  {
    name: "car",
    height: 1.2,
    parts: [
      box({ x: 7, y: 1.6, z: 14 }, { x: 7, y: 1.6, z: 14 }, [185, 60, 60]),
      box({ x: 7, y: 3.9, z: 13.5 }, { x: 6, y: 0.7, z: 7 }, [30, 34, 40]),
      box({ x: 7, y: 4.3, z: 12.6 }, { x: 5.4, y: 0.5, z: 4.4 }, [30, 34, 40]),
      box({ x: 7, y: 4.3, z: 15.6 }, { x: 5.4, y: 0.5, z: 3.4 }, [30, 34, 40]),
      box({ x: 7, y: 0.6, z: 14 }, { x: 7.1, y: 0.6, z: 14.1 }, [140, 40, 40]),
      ...wheels(),
    ],
  },
  {
    name: "toilet",
    height: 1,
    parts: [
      box(
        { x: 4, y: 1.6, z: 8 },
        { x: 2, y: 1.6, z: 1.6 },
        [238, 240, 242],
        "plaster",
      ),
      cut({ x: 4, y: 4.2, z: 5.5 }, { x: 2.6, y: 0.7, z: 3 }, [200, 205, 210]),
      box(
        { x: 4, y: 4.6, z: 5.5 },
        { x: 2.2, y: 0.5, z: 2.6 },
        [200, 205, 210],
      ),
      box(
        { x: 4, y: 3.6, z: 8.9 },
        { x: 2.7, y: 4.4, z: 0.6 },
        [238, 240, 242],
        "plaster",
      ),
    ],
  },
  {
    name: "tree",
    height: 4,
    parts: [
      box(
        { x: 6, y: 3.5, z: 6 },
        { x: 1.4, y: 3.5, z: 1.4 },
        [95, 70, 45],
        "timber",
      ),
      // The canopy, as three overlapping ellipsoids. The sibling had a stepped
      // grid; this is smoother and it is the one model in the set where the
      // primitive is doing real work rather than standing in for a box.
      {
        at: { x: 6, y: 12, z: 6 },
        shape: { type: "Ellipsoid", radius: { x: 5.5, y: 4.5, z: 5.5 } },
        colour: [60, 125, 55],
      },
      {
        at: { x: 4, y: 15.5, z: 7 },
        shape: { type: "Ellipsoid", radius: { x: 3.4, y: 3, z: 3.4 } },
        colour: [45, 100, 45],
      },
      {
        at: { x: 8.5, y: 9, z: 5 },
        shape: { type: "Ellipsoid", radius: { x: 3.2, y: 2.8, z: 3.2 } },
        colour: [75, 140, 62],
      },
    ],
  },

  // --- the small items lying around ---------------------------------------
  {
    name: "chips",
    height: 0.6,
    parts: [
      box({ x: 2, y: 3, z: 1.5 }, { x: 2, y: 3, z: 1.5 }, [235, 200, 60]),
      box({ x: 2, y: 1.7, z: 1.5 }, { x: 2.05, y: 1, z: 1.55 }, [200, 50, 50]),
    ],
  },
  {
    name: "orange",
    height: 0.4,
    parts: [
      {
        at: { x: 2, y: 2, z: 2 },
        shape: { type: "Sphere", radius: 2 },
        colour: [240, 140, 30],
      },
      box({ x: 2, y: 3.9, z: 2 }, { x: 0.2, y: 0.2, z: 0.2 }, [70, 130, 50]),
    ],
  },
  {
    name: "colgate",
    height: 0.6,
    parts: [
      box(
        { x: 1.5, y: 3.5, z: 1.5 },
        { x: 1.5, y: 3.5, z: 1.5 },
        [240, 242, 245],
      ),
      box(
        { x: 1.5, y: 1.2, z: 1.55 },
        { x: 1.45, y: 1.4, z: 0.1 },
        [200, 40, 50],
      ),
      box(
        { x: 1.5, y: 6.9, z: 1.5 },
        { x: 0.9, y: 0.2, z: 0.9 },
        [50, 90, 180],
      ),
    ],
  },
  {
    // **Half a voxel of a four-voxel note**, which is a quarter of a world unit thick. This
    // was the first model in the table to be discovered not existing: at the sample spacing its
    // own width asked for, nothing sampled inside it. `samplesFor` now looks at the thinnest
    // axis as well, and the coin is as thin as a coin should be.
    name: "tix",
    height: 0.3,
    parts: [
      {
        at: { x: 3, y: 2, z: 3 },
        shape: { type: "Cylinder", len: 4, radius: 3 },
        colour: [235, 200, 60],
      },
      {
        at: { x: 3, y: 3.9, z: 3 },
        shape: { type: "Cylinder", len: 0.2, radius: 2.2 },
        colour: [180, 150, 40],
      },
    ],
  },
  {
    // **A disc, for the same reason the Tix is**, and thinner in the middle: a coin on a
    // floor is the thinnest thing in this table and it is why the mesher looks at the
    // shortest axis at all.
    name: "robux",
    height: 0.3,
    parts: [
      {
        at: { x: 2.5, y: 2.5, z: 2.5 },
        shape: { type: "Cylinder", len: 5, radius: 2.5 },
        colour: [90, 170, 90],
      },
      {
        at: { x: 2.5, y: 4.9, z: 2.5 },
        shape: { type: "Cylinder", len: 0.2, radius: 1.8 },
        colour: [60, 130, 60],
      },
    ],
  },
  {
    name: "cola",
    height: 0.7,
    parts: [
      {
        at: { x: 1.5, y: 3.2, z: 1.5 },
        shape: { type: "Cylinder", len: 6.4, radius: 1.5 },
        colour: [200, 40, 50],
      },
      box(
        { x: 1.5, y: 2.2, z: 1.55 },
        { x: 1.45, y: 1.4, z: 0.1 },
        [240, 242, 245],
      ),
      box({ x: 1.5, y: 6.6, z: 1.5 }, { x: 1.1, y: 0.4, z: 1.1 }, [30, 30, 34]),
    ],
  },
  {
    name: "egg",
    height: 0.4,
    parts: [
      {
        at: { x: 2, y: 1.4, z: 2 },
        shape: { type: "Ellipsoid", radius: { x: 1.8, y: 1.4, z: 1.8 } },
        colour: [240, 240, 230],
      },
      {
        at: { x: 2, y: 3.4, z: 2 },
        shape: { type: "Ellipsoid", radius: { x: 1.6, y: 1.5, z: 1.6 } },
        colour: [245, 210, 80],
      },
    ],
  },
  {
    name: "juice",
    height: 0.7,
    parts: [
      box({ x: 2, y: 4, z: 2 }, { x: 2, y: 4, z: 2 }, [240, 150, 40]),
      box(
        { x: 2, y: 7.2, z: 2 },
        { x: 2.05, y: 0.8, z: 2.05 },
        [250, 220, 120],
      ),
    ],
  },
  {
    name: "milk",
    height: 0.7,
    parts: [
      box({ x: 2, y: 4, z: 2 }, { x: 2, y: 4, z: 2 }, [240, 242, 245]),
      box({ x: 2, y: 7.1, z: 2.05 }, { x: 2, y: 0.9, z: 0.1 }, [90, 150, 210]),
    ],
  },
  {
    name: "witchbrew",
    height: 0.7,
    parts: [
      box({ x: 2, y: 4, z: 2 }, { x: 2, y: 4, z: 2 }, [60, 40, 90]),
      box({ x: 2, y: 7.1, z: 2.05 }, { x: 2, y: 0.9, z: 0.1 }, [120, 60, 190]),
    ],
  },
  {
    name: "hotbrew",
    height: 0.7,
    parts: [
      box({ x: 2, y: 4, z: 2 }, { x: 2, y: 4, z: 2 }, [110, 70, 40]),
      box({ x: 2, y: 7.1, z: 2.05 }, { x: 2, y: 0.9, z: 0.1 }, [190, 130, 60]),
    ],
  },
  {
    name: "icecream",
    height: 0.5,
    parts: [
      {
        at: { x: 3, y: 1.6, z: 3 },
        shape: { type: "Ellipsoid", radius: { x: 3, y: 1.6, z: 3 } },
        colour: [120, 90, 160],
      },
      {
        at: { x: 3, y: 3.9, z: 3 },
        shape: { type: "Ellipsoid", radius: { x: 2.6, y: 1.3, z: 2.6 } },
        colour: [255, 200, 210],
      },
      {
        at: { x: 3, y: 5.5, z: 3 },
        shape: { type: "Sphere", radius: 0.5 },
        colour: [210, 70, 90],
      },
    ],
  },
  {
    name: "candy",
    height: 0.4,
    parts: [
      box({ x: 3, y: 2, z: 1.5 }, { x: 3, y: 2, z: 1.5 }, [240, 120, 40]),
      box(
        { x: 0.6, y: 2, z: 1.5 },
        { x: 0.5, y: 2.05, z: 1.55 },
        [250, 200, 80],
      ),
      box(
        { x: 5.4, y: 2, z: 1.5 },
        { x: 0.5, y: 2.05, z: 1.55 },
        [250, 200, 80],
      ),
    ],
  },
  {
    name: "fuel",
    height: 0.7,
    parts: [
      box({ x: 3.5, y: 3, z: 2 }, { x: 3.5, y: 3, z: 2 }, [190, 50, 45]),
      box({ x: 3.5, y: 7, z: 2 }, { x: 1.1, y: 1, z: 1.1 }, [140, 35, 32]),
      box(
        { x: 3.5, y: 2.6, z: 2.05 },
        { x: 2.4, y: 1.6, z: 0.1 },
        [40, 40, 44],
      ),
    ],
  },
  {
    name: "patty",
    height: 0.5,
    parts: [
      box({ x: 4, y: 0.5, z: 4 }, { x: 4, y: 0.5, z: 4 }, [240, 230, 200]),
      box({ x: 4, y: 1.6, z: 4 }, { x: 4.05, y: 0.4, z: 4.05 }, [120, 70, 40]),
      box({ x: 4, y: 2.4, z: 4 }, { x: 4.1, y: 0.4, z: 4.1 }, [90, 150, 60]),
      box({ x: 4, y: 3.2, z: 4 }, { x: 4.05, y: 0.4, z: 4.05 }, [120, 70, 40]),
      {
        // **An ellipsoid and not a sphere, because a sphere is as tall as it is wide.**
        // A bun that is a `Sphere` of radius four is eight voxels tall on a model that is six,
        // and the model's scale is its own height — so a sphere here would silently stretch
        // every other part of the burger by a third.
        at: { x: 4, y: 5, z: 4 },
        shape: { type: "Ellipsoid", radius: { x: 4, y: 1, z: 4 } },
        colour: [215, 160, 70],
      },
    ],
  },
  {
    name: "sandvich",
    height: 0.4,
    parts: [
      box({ x: 4, y: 0.5, z: 4 }, { x: 4, y: 0.5, z: 4 }, [235, 205, 140]),
      box({ x: 4, y: 2.2, z: 4 }, { x: 4.05, y: 0.5, z: 4.05 }, [90, 140, 60]),
      box({ x: 4, y: 3.2, z: 4 }, { x: 4.1, y: 0.5, z: 4.1 }, [200, 90, 60]),
      box({ x: 4, y: 4.6, z: 4 }, { x: 4, y: 1.4, z: 4 }, [235, 205, 140]),
    ],
  },
  {
    name: "friedegg",
    height: 0.3,
    parts: [
      // A fried egg is a lacy white with a yolk in the middle, and the lacy
      // part is the reason this is a sphere and a disc rather than a box.
      {
        at: { x: 3.5, y: 0.4, z: 3.5 },
        shape: { type: "Ellipsoid", radius: { x: 3.5, y: 0.35, z: 3.5 } },
        colour: [245, 245, 240],
      },
      {
        at: { x: 3.5, y: 0.55, z: 3.5 },
        shape: { type: "Sphere", radius: 0.9 },
        colour: [240, 200, 60],
      },
    ],
  },
  {
    name: "sword",
    height: 1.6,
    parts: [
      box(
        { x: 1.5, y: 2, z: 0.5 },
        { x: 0.4, y: 2, z: 0.5 },
        [110, 70, 40],
        "timber",
      ),
      box(
        { x: 1.5, y: 4.2, z: 0.5 },
        { x: 1.6, y: 0.3, z: 0.6 },
        [220, 190, 70],
      ),
      // **One voxel of a fourteen, which is the sibling's blade and is 0.7 world units thick.**
      //
      // That is below the spacing a grid built from this model's *length* would use, and for a
      // long while it meant the blade did not exist: the file read perfectly, the model loaded,
      // and the mesher returned no triangles for it. The fix is in `samplesFor` — enough
      // samples across the thinnest axis for a thin part to be a solid — and it is worth
      // knowing that this number is only defensible *because* of that fix.
      box(
        { x: 1.5, y: 9, z: 0.5 },
        { x: 0.35, y: 4.5, z: 0.3 },
        [200, 205, 215],
      ),
    ],
  },

  // --- the two characters -------------------------------------------------
  {
    // Dad. Tall, and standing, and about two and a half times the height of
    // a can of cola — which is the ratio that makes a figure read as a figure
    // without any face.
    name: "npc-sable",
    height: 3.4,
    parts: [
      ...legs([80, 90, 110]),
      box({ x: 4, y: 17, z: 4 }, { x: 2.6, y: 6, z: 1.9 }, [70, 80, 100]),
      ...arms([70, 80, 100], 12.5, 17, 4),
      {
        at: { x: 4, y: 25.5, z: 4 },
        shape: { type: "Sphere", radius: 2.9 },
        colour: [214, 176, 150],
      },
      box({ x: 4, y: 27.4, z: 3.3 }, { x: 2.85, y: 1, z: 2.3 }, [70, 55, 45]),
      box({ x: 4, y: 29.1, z: 4 }, { x: 2.6, y: 0.5, z: 2.5 }, [60, 48, 40]),
    ],
  },
  {
    // The cashier. Shorter, with a cap and an apron, so the two read as
    // different people from across a shop.
    name: "npc-rook",
    height: 3,
    parts: [
      ...legs([60, 70, 90]),
      box({ x: 4, y: 15, z: 4 }, { x: 2.7, y: 6, z: 2 }, [220, 225, 230]),
      box({ x: 4, y: 13, z: 4.2 }, { x: 2.5, y: 4, z: 0.2 }, [180, 60, 60]),
      ...arms([220, 225, 230], 11, 15, 4),
      {
        at: { x: 4, y: 22.5, z: 4 },
        shape: { type: "Sphere", radius: 2.7 },
        colour: [226, 186, 158],
      },
      box({ x: 4, y: 25.1, z: 4 }, { x: 2.9, y: 1.1, z: 2.8 }, [60, 110, 170]),
      box({ x: 4, y: 24.2, z: 2 }, { x: 3.2, y: 0.25, z: 1.4 }, [60, 110, 170]),
    ],
  },
];
