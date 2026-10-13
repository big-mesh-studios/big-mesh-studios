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

import type { PaintJournal } from "./paint-journal";
import type { Texel } from "./paint-field";

/**
 * How far off the surface a voxel may be and still be painted, in voxels.
 *
 * **A voxel and a half, which is what changed and why.** This was half a world unit, on the
 * reasoning that "a surface's own thickness is not knowable here". At a `PAINT_VOXEL` of 0.05
 * that is **ten voxels either side of the surface**, and three things went wrong at once:
 *
 * - The dab's search box is `radius + SHELL + voxel`, so every dab scanned a 33³ box and threw
 *   away about nineteen twentieths of it. Measured on one soft stroke, thinning this to a voxel
 *   and a half cuts the voxels a dab visits by roughly seven.
 * - The trilinear sample at the visible surface averages across the whole shell, so paint was
 *   mixed with paint up to half a unit away — around corners, and onto the far side of
 *   anything thin.
 * - A figure is mostly unpainted, and all of this was paid per unit of *painted* area.
 *
 * **A voxel and a half is the thinnest shell that cannot miss the surface.** The brush resolves
 * the surface to `BRUSH_EPSILON` (`field-hit.ts`), which is a fifth of a voxel, so the surface
 * always falls inside a voxel's reach of the centre a dab was placed at. The shell is not
 * there to model thickness any more — it never could — it is there so a voxel the surface
 * passes through is painted at all.
 */
const SHELL_VOXELS = 1.5;

/**
 * The one falloff, matching `paint-surface.ts:368`.
 *
 * **`band` is the antialiasing, and it is the second thing that changed.** `paint-surface.ts`
 * rasterises into a 2D atlas at whatever density the packer chose and had no reason to widen
 * anything; a field is sampled at a fixed world resolution and the reason a stroke's edge looks
 * like a staircase is that `falloff` is a step at the voxel scale — the coverage goes from
 * solid to nothing between two adjacent voxel centres, and trilinear filtering can only round
 * that over the one voxel it spans.
 *
 * So the ramp is widened to **a voxel and a half**, whichever way it is measured, which is the
 * standard box-filter approximation for a straight edge and costs one comparison. A hard brush
 * therefore gains a one-and-a-half-voxel ramp it did not have, and a soft brush keeps its own
 * ramp but gains it only where its own would have been narrower than the grid can resolve.
 *
 * **A voxel and a half rather than a voxel, because of where the samples land.** Voxel centres
 * are a voxel apart, so a ramp exactly one voxel wide can fall entirely *between* two of them
 * and leave nothing for the sampler to interpolate — which is the staircase again, arrived at
 * from the other side. At one and a half, at least one centre is always inside the ramp.
 *
 * **The rim does not move.** `t` is 0 where the brush stops and 1 a half-ramp past it, so the
 * 50% crossing stays exactly on the radius the brush says it has and the widening only softens
 * the last voxel and a half either side of it. It costs a slightly smaller solid core — a hard
 * brush is fully opaque out to `radius × (1 - band)` — which is the trade an antialiased edge
 * always makes and the reason the width ladder has a floor.
 */
const falloff = (distance: number, hardness: number, band: number): number => {
  const t = (distance - hardness) / Math.max(1 - hardness, band);
  if (t <= 0) return 1;
  if (t >= 1) return 0;
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

/**
 * What a rasterisation writes into.
 *
 * **A structural type rather than `PaintField`, so `PaintBrush` can hand this function a field
 * with one stroke's worth of history held back.** `PaintField` satisfies it as it stands and
 * nothing about the field itself changes; what changes is that a caller may pass something else
 * — see the note on the brush's `under` map, which is the whole reason this is an interface.
 */
export interface PaintTarget {
  /** How wide a voxel is, in world units. */
  readonly voxelSize: number;
  /** How many voxels the box holds per axis, which bounds every index this writes. */
  readonly voxels: readonly [number, number, number];
  /** The voxel a world point falls in, which may be outside the box. */
  voxelAt(wx: number, wy: number, wz: number): [number, number, number];
  /** The centre of a voxel, in world units. */
  worldAt(x: number, y: number, z: number): [number, number, number];
  /** What is painted at a voxel. Out of the box reads as clear. */
  get(x: number, y: number, z: number): Texel;
  /** Paints a voxel, and says whether the bytes changed. */
  set(x: number, y: number, z: number, colour: Texel): boolean;
}

/** What one rasterisation did. */
export interface RasteriseResult {
  /** Strokes that changed a voxel. The rest changed nothing and are cullable. */
  readonly live: number;
  /** How many dabs were considered, which is the range's length and not the journal's. */
  readonly dabs: number;
}

/**
 * What one stroke has accumulated at one voxel, before it is composited.
 *
 * **Three numbers that answer three different questions, and that is the third thing that
 * changed.** The single accumulator this replaces folded "how far out did the brush reach here"
 * into the same `over` that builds opacity, and those are not the same question:
 *
 * - `reach` — the widest any dab's falloff got here. **The maximum, never a product.** Three
 *   dabs at a third of a radius apart each cover a point near the stroke's edge a little, and
 *   multiplying them gives a number larger than every one of them; compounding a falloff is how
 *   a soft brush turns into a hard one. Measured, on a hardness-0.5 brush of 0.25 radius at a
 *   0.05 voxel, the cross-section across the stroke read `9 9 9 9 9 9 9 9 6 2 0` — a cliff at
 *   ninety-six per cent of the radius where a ramp from fifty was asked for. It is now
 *   `9 9 9 9 5 3 2 1 0`.
 * - `transmit` — the product of `1 - alpha` over the dabs, so `1 - transmit` is the stroke's own
 *   opacity. **Still a product, and deliberately**: holding an airbrush still has to get darker,
 *   and that is the one thing a maximum would break.
 * - `r`, `g`, `b` over `w` — the colour average, so a stroke that changes colour part-way
 *   through lands on a blend rather than on whichever dab happened to write last.
 *
 * GPU Gems 2 Ch. 37 §37.2 accumulates a weighted colour sum per leaf and normalises at the
 * end. This is that, with the coverage taken as a maximum rather than a sum.
 */
interface Accum {
  /** Σ `alpha × coverage`, the normaliser for the colour. */
  w: number;
  /** The furthest any single dab's falloff reached here. */
  reach: number;
  /** Π `1 - alpha`, so `1 - transmit` is the stroke's opacity. */
  transmit: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Writes every dab in the journal into the field, in order.
 *
 * **`place` returns `undefined` to skip a dab**, which is how M5's occlusion rule drops a
 * dab whose part is not the visible one without the journal ever hearing about it.
 *
 * **One composite per stroke rather than per dab.** See {@link Accum} for why, and
 * {@link PaintTarget} for why the target is an interface: `PaintBrush` re-rasterises the stroke
 * in progress on every pointer move, and a target that presents the pre-stroke field rather than
 * the last flush's is what makes writing it again land on the same bytes — which is what keeps
 * the field a pure function of the journal rather than a function of how the pointer moved.
 */
export const rasterise = (
  journal: PaintJournal,
  field: PaintTarget,
  place: (part: number, centre: Vec3, normal: Vec3) => Placed | undefined,
  /**
   * The range of dabs to write, which defaults to the whole journal.
   *
   * **A range is safe because strokes composite and a stroke is idempotent.** Strokes before the
   * range are already in the field and are not rewritten; the stroke the range ends inside is
   * written as one group, and a target that presents the pre-stroke field makes writing it again
   * land on the same bytes. Anything that changes what is *already* in the field — an undo, a
   * clear, a part moving — clears it first and goes through the whole journal.
   */
  from = 0,
  to = journal.count,
): RasteriseResult => {
  let live = 0;
  const voxel = field.voxelSize;
  const [sizeX, sizeY, sizeZ] = field.voxels;
  const shell = SHELL_VOXELS * voxel;
  // **One accumulator per voxel, for the stroke being written.** A stroke's footprint is a
  // brush-width ribbon, so this holds what was painted and nothing else; a scratch `PaintField`
  // would be a seven-megabyte allocation to hold a few thousand numbers.
  const group = new Map<number, Accum>();
  const ends = new Set(journal.strokeEnds);

  /**
   * Composites one stroke's accumulation over the field, and empties it.
   *
   * **A single pass over the map, in insertion order.** Insertion order is journal order and
   * every voxel in the map belongs to the one stroke, so there is nothing to order between them.
   */
  const commit = (): void => {
    if (group.size === 0) return;
    let changed = false;
    for (const [key, a] of group) {
      if (a.w <= 0) continue;
      const x = key % sizeX;
      const y = ((key - x) / sizeX) % sizeY;
      const z = Math.floor(key / (sizeX * sizeY));
      const alpha = Math.round((1 - a.transmit) * a.reach * 255);
      if (alpha <= 0) continue;
      const over = alpha / 255;
      const keep = 1 - over;
      const previous = field.get(x, y, z);
      changed =
        field.set(x, y, z, {
          r: Math.round((a.r / a.w) * over + previous.r * keep),
          g: Math.round((a.g / a.w) * over + previous.g * keep),
          b: Math.round((a.b / a.w) * over + previous.b * keep),
          a: Math.round(alpha + previous.a * keep),
        }) || changed;
    }
    group.clear();
    if (changed) live += 1;
  };

  for (let dab = from; dab < to; dab++) {
    const placed = place(
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
    if (placed === undefined) continue;

    const radius = journal.radius[dab]!;
    /** The widest ramp the grid can resolve, in the same units the falloff is asked in. */
    // **Capped at the brush's own radius.** The ramp's width in world units is `band × radius`,
    // so an uncapped band gives a brush narrower than a voxel and a half a ramp three times its
    // own size — the smallest brush on the panel would paint a soft blob three times the width
    // it says it has, which is worse than the staircase it was meant to fix. With the cap the
    // ramp is never wider than the brush, so a brush too small for the grid degrades into a
    // faint mark instead of into the wrong shape.
    const band = Math.min((1.5 * voxel) / radius, 1);
    // **The rim the widened falloff actually reaches**, which is half a ramp past the radius.
    // The early out below uses this rather than the radius, for the same reason it exists: a
    // ramp that is thrown away before it is sampled is not a ramp.
    const outer = radius * (1 + band);
    // **The search box is a sphere bound, not the disc's own extent.** A bound in the disc's
    // plane would miss the voxels lying just off the surface along the normal, and with a soft
    // brush those are most of what gets painted.
    const reach = outer + shell + voxel;
    const span = Math.ceil(reach / voxel);
    const half = voxel * 0.5;
    const [vx, vy, vz] = field.voxelAt(
      placed.centre.x,
      placed.centre.y,
      placed.centre.z,
    );
    const x0 = vx - span;
    const y0 = vy - span;
    const z0 = vz - span;
    const x1 = Math.min(vx + span, sizeX - 1);
    const y1 = Math.min(vy + span, sizeY - 1);
    const z1 = Math.min(vz + span, sizeZ - 1);
    if (x1 < x0 || y1 < y0 || z1 < z0) continue;

    // **One `worldAt` per dab and then arithmetic.** It allocates a three-element array, and at
    // a third of a radius of spacing a stroke of any length calls it tens of thousands of times;
    // the inner loops step by `voxel` instead.
    const [wx0, wy0, wz0] = field.worldAt(x0, y0, z0);
    const nx = placed.normal.x;
    const ny = placed.normal.y;
    const nz = placed.normal.z;
    const hardness = journal.hardness[dab]!;
    const red = journal.colour[dab * 4]!;
    const green = journal.colour[dab * 4 + 1]!;
    const blue = journal.colour[dab * 4 + 2]!;
    const alpha = journal.colour[dab * 4 + 3]! / 255;
    const trans = 1 - alpha;

    for (let z = z0; z <= z1; z++) {
      const wz = wz0 + (z - z0) * voxel;
      for (let y = y0; y <= y1; y++) {
        const wy = wy0 + (y - y0) * voxel;
        let wx = wx0;
        for (let x = x0; x <= x1; x++, wx += voxel) {
          const dx = wx - placed.centre.x;
          const dy = wy - placed.centre.y;
          const dz = wz - placed.centre.z;
          const squared = dx * dx + dy * dy + dz * dz;
          // **The sphere rejects most of the box before the surface test**, which is the one
          // expensive test in here and does not need to be made for most voxels.
          if (squared > reach * reach) continue;
          const across = dx * nx + dy * ny + dz * nz;
          // **Only the shell around the surface is painted.** This is what keeps the inside of
          // a hollow shape clear and a stroke on one side of a thin wall invisible from the
          // other.
          const offSurface = across < 0 ? -across : across;
          if (offSurface > shell + half) continue;
          // **In the plane, not across it** — the disc's extent measured perpendicular to the
          // normal, which is what makes a round brush round on a curved surface rather than an
          // ellipse that stretches as it turns.
          const inPlaneSq = squared - across * across;
          const inPlane = inPlaneSq < 0 ? 0 : Math.sqrt(inPlaneSq);
          // **Rejected half a ramp past the rim, not at it.** The falloff below is widened so
          // that an edge is a ramp rather than a step, and an early out at the bare radius threw
          // that ramp away by never reaching it.
          if (inPlane > outer) continue;
          // **Fade out towards the surface rather than at a hard shell edge**, so a voxel that
          // straddles the boundary is weighted by how much of it is actually on the surface.
          // The band's floor is the shell's own width rather than the voxel's, because that is
          // the coarser of the two ramps and the narrower of the two would alias against it.
          const coverage =
            falloff(inPlane / radius, hardness, band) *
            falloff(offSurface / shell, 1, shell / voxel);
          if (coverage <= 0) continue;

          const key = x + y * sizeX + z * sizeX * sizeY;
          let at = group.get(key);
          if (at === undefined) {
            at = { w: 0, reach: 0, transmit: 1, r: 0, g: 0, b: 0 };
            group.set(key, at);
          }
          const weight = alpha * coverage;
          at.w += weight;
          if (coverage > at.reach) at.reach = coverage;
          at.transmit *= trans;
          at.r += red * weight;
          at.g += green * weight;
          at.b += blue * weight;
        }
      }
    }

    if (ends.has(dab + 1)) commit();
  }
  commit();
  return { live, dabs: Math.max(0, to - from) };
};
