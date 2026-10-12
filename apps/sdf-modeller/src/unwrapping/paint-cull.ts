/**
 * Finding the dabs that cannot affect the result, and doing it without ever deleting one.
 *
 * ## Why this is a separate pass and not a check inside rasterising
 *
 * **Because a dab's visibility depends on what came after it, and rasterising goes forwards.**
 * By the time a dab has been written, later dabs that will cover it have not been seen yet —
 * and the whole question is whether they will. So the dead-dab test has to run in the other
 * direction, over a region, with the answer known before anything is drawn.
 *
 * ## Why nothing is ever removed from the journal
 *
 * **Because the dab that is dead now is alive the moment the stroke covering it is undone.**
 * Culling has to be a statement about the current journal rather than an edit to it, or ctrl-z
 * would reveal holes where strokes used to be. Everything here returns indices; the caller
 * decides what to do with them.
 *
 * ## What "dead" means here, precisely
 *
 * A dab is dead when **every voxel it would write is already claimed by a later dab whose
 * falloff reached full alpha there**. Three consequences worth stating, because each is a case
 * that could plausibly be got wrong:
 *
 * - **Only full alpha claims.** A dab at 50% leaves half of what was underneath it, so the
 *   dab underneath is still visible and must stay. Claiming on partial alpha would throw away
 *   real paint the moment somebody used a soft brush twice.
 * - **A dab can be alive because of one voxel.** One uncovered voxel is enough, however small.
 * - **Order is journal order**, so the first dab backwards to reach a voxel is the one that
 *   owns it, and anything earlier at that voxel is dead.
 *
 * ## Why this is Tier 1 and byte-comparison is Tier 0
 *
 * **Because they answer different questions.** Tier 0 (`PaintField.set` returning false) knows
 * a write changed nothing *after it has done the write*. This knows a write was never going to
 * matter *before*, which is the only version that saves any work.
 */

import { PaintField, type Region } from "./paint-field";

/**
 * How far off the surface a voxel may be painted, in world units.
 *
 * **The same constant `rasterise` uses, spelled out here rather than imported.** The cull has
 * to consider every voxel the raster would write, and a cull that considered less would
 * declare a dab dead on voxels nothing had claimed.
 */
const SHELL = 0.5;
import type { PaintJournal } from "./paint-journal";

/** What the backward walk found. */
export interface CullResult {
  /** Indices into the journal, in the order they were found. */
  readonly dead: number[];
  /** How many were examined. */
  readonly considered: number;
}

/**
 * The region a set of dabs could touch, in **voxel indices**.
 *
 * **Voxels rather than world units, because that is what `cullOccluded` indexes its scratch
 * buffer with.** An earlier version built the box in world units and compared it against voxel
 * indices, which is a mismatch nobody sees: every dab came back dead, because no voxel index
 * fell inside a box measured from a different origin. `cullOccluded`'s own test found it, and
 * only because the test asked what the answer *should* be.
 *
 * **The bounds are rounded outwards**, and the reach includes the rasteriser's own shell and
 * voxel, so the region is never smaller than the set of voxels a rasterise would touch. A cull
 * that considered less than the rasteriser would consider would declare a dab dead on the
 * strength of voxels nothing had claimed — which is exactly how paint goes missing.
 */
export const regionOf = (
  journal: PaintJournal,
  field: PaintField,
  from: number,
  to: number,
  place: (
    part: number,
    centre: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
  ) => { centre: { x: number; y: number; z: number } } | undefined,
): Region | undefined => {
  const reach = (dab: number): number =>
    journal.radius[dab]! + SHELL + field.voxelSize;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let any = false;
  for (let dab = from; dab < to; dab++) {
    const at = place(
      journal.part[dab]!,
      {
        x: journal.centre[dab * 3]!,
        y: journal.centre[dab * 3 + 1]!,
        z: journal.centre[dab * 3 + 2]!,
      },
      { x: 0, y: 0, z: 0 },
    );
    if (at === undefined) continue;
    const centre = at.centre;
    const out = reach(dab);
    any = true;
    minX = Math.min(minX, centre.x - out);
    minY = Math.min(minY, centre.y - out);
    minZ = Math.min(minZ, centre.z - out);
    maxX = Math.max(maxX, centre.x + out);
    maxY = Math.max(maxY, centre.y + out);
    maxZ = Math.max(maxZ, centre.z + out);
  }
  if (!any) return undefined;
  const [loX, loY, loZ] = field.voxelAt(minX, minY, minZ);
  const [hiX, hiY, hiZ] = field.voxelAt(maxX, maxY, maxZ);
  return {
    x0: loX - 1,
    y0: loY - 1,
    z0: loZ - 1,
    x1: hiX + 1,
    y1: hiY + 1,
    z1: hiZ + 1,
  };
};

/**
 * Which dabs in `[from, to)` cannot affect the field.
 *
 * **`claimed` is a byte per voxel over the region**, reused between calls so a long drag does
 * not allocate one per pointer move. It is the only working memory in the whole scheme.
 *
 * **A dab claims only where its falloff is 1**, which means only its fully-opaque core. A
 * `hardness` below 1 therefore claims a smaller disc than it paints, and a soft brush
 * underneath anything is preserved.
 */
export const cullOccluded = (
  journal: PaintJournal,
  field: PaintField,
  from: number,
  to: number,
  region: Region,
  place: (
    part: number,
    centre: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
  ) => { centre: { x: number; y: number; z: number } } | undefined,
  claimed: Uint8Array,
  claimedAt: number,
): CullResult => {
  const width = region.x1 - region.x0 + 1;
  const height = region.y1 - region.y0 + 1;
  const depth = region.z1 - region.z0 + 1;
  const span = width * height * depth;
  // **Cleared over the whole span, not just the region**, because a caller reusing a buffer
  // from a wider region would otherwise inherit claims from it and cull live paint.
  claimed.fill(0, claimedAt, claimedAt + span);
  const dead: number[] = [];

  const voxelSize = field.voxelSize;

  for (let dab = to - 1; dab >= from; dab--) {
    const at = place(
      journal.part[dab]!,
      {
        x: journal.centre[dab * 3]!,
        y: journal.centre[dab * 3 + 1]!,
        z: journal.centre[dab * 3 + 2]!,
      },
      { x: 0, y: 0, z: 0 },
    );
    if (at === undefined) continue;
    const centre = at.centre;
    const radius = journal.radius[dab]!;
    const hardness = journal.hardness[dab]!;
    // **A dab that is not fully opaque does not occlude at all.**
    //
    // Straight-alpha compositing leaves `1 - a` of whatever was underneath a dab of alpha
    // `a`, so a translucent dab reduces the dab beneath it rather than hiding it. Claiming on
    // it would delete real paint the moment somebody used a soft brush twice — which is the
    // most common thing a soft brush is for, and would look like the brush losing work.
    const opaque = journal.colour[dab * 4 + 3] === 255;
    const reach = radius + SHELL + voxelSize;
    const boxSpan = Math.ceil(reach / voxelSize);
    const [vx, vy, vz] = field.voxelAt(centre.x, centre.y, centre.z);
    // **A dab claims only where its own falloff is 1.** Below `hardness` the brush is at full
    // strength, so the claimed disc is the inner one; at `hardness` 1 it is the whole disc.
    // This is the whole of "a soft rim does not occlude".
    const solidPaint = radius <= hardness ? radius : radius * hardness;
    const solidClaim = opaque ? solidPaint : 0;
    let alive = false;

    // **The whole of this dab's solid core is claimed, whatever `alive` becomes.**
    //
    // An earlier version broke out of all three loops as soon as it found one unclaimed voxel,
    // on the reasoning that a single uncovered voxel already decides the question — which is
    // true of `alive` and irrelevant to the claim. The result was that every dab claimed
    // exactly one voxel, so every dab after the first found a free one and nothing was ever
    // reported dead. **The two questions are separate and have to be asked separately:** is
    // this dab visible anywhere, and which voxels does it cover for the ones behind it.
    for (let z = vz - boxSpan; z <= vz + boxSpan; z++) {
      for (let y = vy - boxSpan; y <= vy + boxSpan; y++) {
        for (let x = vx - boxSpan; x <= vx + boxSpan; x++) {
          if (
            x < region.x0 ||
            x > region.x1 ||
            y < region.y0 ||
            y > region.y1 ||
            z < region.z0 ||
            z > region.z1
          ) {
            continue;
          }
          const offset =
            ((z - region.z0) * height + (y - region.y0)) * width +
            (x - region.x0);
          const [wx, wy, wz] = field.worldAt(x, y, z);
          const distance = Math.hypot(
            wx - centre.x,
            wy - centre.y,
            wz - centre.z,
          );
          if (distance > solidPaint) continue;
          if (claimed[claimedAt + offset] === 0) alive = true;
          // **Claiming is a separate test from painting.** An earlier version folded opacity
          // into the radius a dab was considered to cover, which made a translucent dab cover
          // nothing *and* therefore count as dead — a dab plainly painting half a disc reported
          // as invisible. What a dab writes and what it hides are two different questions.
          if (distance <= solidClaim) claimed[claimedAt + offset] = 1;
        }
      }
    }
    if (!alive) dead.push(dab);
  }
  return { dead, considered: to - from };
};
