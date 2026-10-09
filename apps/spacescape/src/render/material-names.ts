/**
 * The procedural materials a surface can wear, by name.
 *
 * ## Why this is a list of names and not an enum in the renderer
 *
 * **Because two very different pieces of code need to agree on it and only one of them can
 * import the other.** `places/fields.ts` turns a payload's `material` string into the number the
 * mesher writes into a vertex, and it runs in the interpreter and in Node tests — importing a
 * renderer into it would pull rmsl into every one of those. `render/materials.ts` implements what
 * each number *looks like*, and it is the only file allowed to import rmsl.
 *
 * So this is the shared vocabulary: ordered, and **the order is the id**. A material's number is
 * its position here, which means a material added in the middle renumbers everything after it
 * and therefore means `FORMAT_VERSION` and every committed model have to agree. That is a
 * deliberate cost for having the wire carry a byte: appending is cheap, inserting is a version
 * bump, and the alternative — a string on the wire — would put this vocabulary in the shared
 * file format and make every reader of it depend on every writer of it.
 *
 * ## The scales are world units, and this repository's are large
 *
 * **`VOXEL_SIZE` is ten.** A brick that was one unit long in some other engine is a hundredth of
 * a voxel here and would not be resolvable at any distance; every number below is chosen against
 * a chunk of terrain being tens of units across, and the same pattern on a figure — which is
 * modelled at about the same scale — reads at about the same size.
 *
 * ## Why a pattern is a 3D lattice and not a triplanar blend
 *
 * **Because there is then only one pattern in the world, and every plane is a slice through
 * it.** Triplanar evaluates the pattern in three axis-aligned projections and blends by the
 * normal, which cannot be made continuous: across a 45° edge the three patterns cross-fade into
 * mush rather than meeting at a line, and where two flat walls meet at a corner they get two
 * *independent* patterns with a hard discontinuity down the corner, because there is no shared
 * phase between them.
 *
 * A lattice fixes both by construction. A wall facing X sees courses along Y and bricks varying
 * in Z; a wall facing Z sees courses along Y and bricks varying in X; a floor sees bricks in X
 * and Z and no courses at all, which is how a brick floor is laid. At a corner the same pattern
 * is cut by both faces and runs through continuously.
 *
 * **The cost is one aspect ratio for every orientation.** Long thin bricks on the walls and
 * square tiles on the floor cannot be one pattern — so they are two materials, which is exactly
 * what the per-operation material id is for.
 */

/** Every material, in the order that fixes their ids. */
export const MATERIAL_NAMES = [
  /** No pattern. The vertex colour is the whole story, and this is most of the world. */
  "plain",
  /** Brick: courses along Y, a running bond, mortar between them. */
  "brick",
  /** Plaster: a soft noise, no course structure. For walls and ceilings. */
  "plaster",
  /** Timber: grain running along Y, with a groove every plank. */
  "timber",
  /** Tile: a square grid with wide grout, for floors. */
  "tile",
  /** Concrete: fine speckle, no structure. */
  "concrete",
] as const;

export type MaterialName = (typeof MATERIAL_NAMES)[number];

/**
 * The id a name has, or `undefined` when there is no such material.
 *
 * **`indexOf` and not a record**, because the list is the definition and a second table beside it
 * is a second thing to update when a material is added — which is the mistake ADR 0025 is about.
 */
export const materialId = (name: string): number | undefined => {
  const at = MATERIAL_NAMES.indexOf(name as MaterialName);
  return at < 0 ? undefined : at;
};

/** The name an id has, or `undefined`. For a readout and for the reference. */
export const materialName = (id: number): MaterialName | undefined =>
  MATERIAL_NAMES[id];

/** How many there are. The shader's chain is checked against this. */
export const MATERIAL_COUNT = MATERIAL_NAMES.length;

/**
 * The id a name must have, or a throw.
 *
 * **For the places where the name is a literal in this repository rather than something a
 * caller typed.** The renderer names materials in its own chain, and a rename would otherwise
 * leave `materialId` returning `undefined` into a node builder as a silent zero — the pattern
 * would quietly stop being drawn, which is the same failure a missing case has. This throws at
 * module load instead, so a rename is a startup crash rather than an invisible one.
 *
 * A name from a script goes through `materialId`, which says `undefined` and is refused by the
 * field table.
 */
export const requireMaterialId = (name: MaterialName): number => {
  const at = materialId(name);
  if (at === undefined) {
    throw new Error(`${name} is not in MATERIAL_NAMES`);
  }
  return at;
};

/** Every id there is, for a caller that wants to iterate the whole set. */
export const materialIds = (): readonly number[] =>
  MATERIAL_NAMES.map((_, at) => at);
