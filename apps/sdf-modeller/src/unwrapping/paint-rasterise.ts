/**
 * Rasterising a journal into a field: the only place paint becomes bytes.
 *
 * ## Why this is a pure function of `(journal, field, place)`
 *
 * **Because the field is derived and the journal is the truth, and a derived thing built by
 * mutation cannot be rebuilt.** Every invariant the design depends on — undo is truncation,
 * resolution is a raster time, a part moving is a re-rasterise — follows from being able to
 * throw the field away and make it again, identically. An incremental update path would make
 * the result depend on the order updates happened to arrive in, and two histories of the same
 * strokes would then differ.
 *
 * ## Why the caller places the dabs rather than this file
 *
 * **Because where a dab lands depends on two things this file has no business knowing**: the
 * part's transform, and whether that part is the one visible at the spot (M5's occlusion
 * rule). Handing it a `place` callback keeps the geometry of a disc out of the geometry of a
 * part, and lets a test place every dab at the origin without building a model.
 *
 * ## Why the dab is a disc and not a sphere
 *
 * **Because the brush is a 2D disc laid on the surface and the field is a thin shell.** A
 * sphere would rely on the surface hiding its inner half, which means a hollow figure painted
 * from outside is painted through. A disc, written only in the shell around the surface, keeps
 * the inside clear until somebody looks inside and paints there.
 *
 * ## Why the falloff is the function the atlas used
 *
 * **So a stroke looks the same as it did.** `paint-surface.ts:368` uses a smoothstep from
 * `hardness` to the rim, because a linear ramp leaves a crease where the brush stops and a
 * crease in a texture is a line nobody drew.
 *
 * ## Why culling is a report and not an action
 *
 * **Because a dab that cannot affect the result must still be in the journal**, or undoing the
 * stroke that covered it would reveal a hole. `rasterise` counts which dabs were dead so a
 * caller can skip them; it never removes one.
 */

import type { Vec3 } from "@big-mesh-studios/core";

import type { PaintField } from "./paint-field";
import type { PaintJournal } from "./paint-journal";

/**
 * How far off the surface a voxel may be and still be painted, in world units.
 *
 * **Half a unit, because a surface's own thickness is not knowable here and this is the one
 * number standing in for it.** A thin wall painted from one side should not paint its far side;
 * too large a shell and it does, too small and a stroke on a coarse field misses the surface
 * between voxel centres entirely. Half a unit against a 0.25 default voxel is two voxels of
 * tolerance, which is the most a volume this crude can honestly claim.
 */
const SHELL = 0.5;

/** The one falloff, matching `paint-surface.ts:368`. */
const falloff = (distance: number, hardness: number): number => {
  if (hardness >= 1) return 1;
  if (distance <= hardness) return 1;
  const t = (distance - hardness) / (1 - hardness);
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth;
};

/** A dab's world position and facing, as its part's transform puts them. */
export interface Placed {
  /** Where the dab is, in world units. */
  readonly centre: Vec3;
  /** Which way the surface faces there, unit length, in world units. */
  readonly normal: Vec3;
}

/** What one rasterisation did. */
export interface RasteriseResult {
  /** Dabs that changed a voxel. The rest changed nothing and are cullable. */
  readonly live: number;
  /** How many dabs were considered, which is the range's length and not the journal's. */
  readonly dabs: number;
}

/**
 * Writes every dab in the journal into the field, in order.
 *
 * **`place` returns `undefined` to skip a dab**, which is how M5's occlusion rule drops a
 * dab whose part is not the visible one without the journal ever hearing about it.
 */
export const rasterise = (
  journal: PaintJournal,
  field: PaintField,
  place: (part: number, centre: Vec3, normal: Vec3) => Placed | undefined,
  /**
   * The range of dabs to write, which defaults to the whole journal.
   *
   * **Which is what makes a stroke appear under the finger.** A brush that rasterises only at the
   * end shows its work when the finger lifts, which is the behaviour of a tool that saves rather
   * than of a tool that paints — and it was the first thing wrong once the field itself was
   * correct.
   *
   * **A range is safe because a field is composited, not assigned.** Writing only the new dabs
   * lays them over what is already there, which gives the same answer as the whole journal would
   * for the dabs already written, because the order and the blend are the same. Anything that
   * changes what is *already* in the field — an undo, a clear, a part moving — goes through the
   * whole journal instead.
   */
  from = 0,
  to = journal.count,
): RasteriseResult => {
  let live = 0;
  const voxel = field.voxelSize;

  for (let dab = from; dab < to; dab++) {
    const centre = place(
      journal.part[dab]!,
      {
        x: journal.centre[dab * 3]!,
        y: journal.centre[dab * 3 + 1]!,
        z: journal.centre[dab * 3 + 2]!,
      },
      {
        x: journal.normal[dab * 3]!,
        y: journal.normal[dab * 3 + 1]!,
        z: journal.normal[dab * 3 + 2]!,
      },
    );
    if (centre === undefined) continue;

    const radius = journal.radius[dab]!;
    // **The search box is a sphere bound, not the disc's own extent.** A bound in the disc's
    // plane would miss the voxels lying just off the surface along the normal, and with a soft
    // brush those are most of what gets painted.
    const reach = radius + SHELL + voxel;
    const span = Math.ceil(reach / voxel);
    const [vx, vy, vz] = field.voxelAt(
      centre.centre.x,
      centre.centre.y,
      centre.centre.z,
    );
    const nx = centre.normal.x;
    const ny = centre.normal.y;
    const nz = centre.normal.z;
    const hardness = journal.hardness[dab]!;
    const red = journal.colour[dab * 4]!;
    const green = journal.colour[dab * 4 + 1]!;
    const blue = journal.colour[dab * 4 + 2]!;
    const alpha = journal.colour[dab * 4 + 3]!;
    let changed = false;

    for (let z = vz - span; z <= vz + span; z++) {
      for (let y = vy - span; y <= vy + span; y++) {
        for (let x = vx - span; x <= vx + span; x++) {
          const [wx, wy, wz] = field.worldAt(x, y, z);
          const dx = wx - centre.centre.x;
          const dy = wy - centre.centre.y;
          const dz = wz - centre.centre.z;
          const squared = dx * dx + dy * dy + dz * dz;
          // **The sphere rejects most of the box before the surface test**, which is the one
          // expensive call in here and does not need to be made for most voxels.
          if (squared > reach * reach) continue;
          const across = dx * nx + dy * ny + dz * nz;
          // **Only the shell around the surface is painted.** This is what keeps the inside of
          // a hollow shape clear and a stroke on one side of a thin wall invisible from the
          // other.
          const offSurface = Math.abs(across);
          if (offSurface > SHELL) continue;
          // **In the plane, not across it** — the disc's extent measured perpendicular to the
          // normal, which is what makes a round brush round on a curved surface rather than an
          // ellipse that stretches as it turns.
          const inPlane = Math.sqrt(
            squared - across * across < 0 ? 0 : squared - across * across,
          );
          if (inPlane > radius) continue;
          // **Fade out towards the surface rather than at a hard shell edge**, so a voxel that
          // straddles the boundary is weighted by how much of it is actually on the surface.
          const coverage =
            falloff(inPlane / radius, hardness) *
            falloff(offSurface / SHELL, 1);
          if (coverage <= 0) continue;
          const a = Math.round(alpha * coverage);
          if (a <= 0) continue;
          const previous = field.get(x, y, z);
          const to = a / 255;
          const keep = 1 - to;
          changed =
            field.set(x, y, z, {
              r: Math.round(red * to + previous.r * keep),
              g: Math.round(green * to + previous.g * keep),
              b: Math.round(blue * to + previous.b * keep),
              a: Math.round(a + previous.a * keep),
            }) || changed;
        }
      }
    }
    if (changed) live += 1;
  }
  return { live, dabs: Math.max(0, to - from) };
};
