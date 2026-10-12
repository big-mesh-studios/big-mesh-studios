/**
 * The brush: a drag becomes dabs in a journal, and the journal becomes a field.
 *
 * ## Why this is not the atlas's recorder with the words changed
 *
 * **Because the atlas recorded a stroke by saving the bytes that were underneath it, and
 * there are no bytes underneath a dab.** A journal dab is a parameter, not a delta: it says
 * "a disc of this radius and colour, here, on this part". So the recorder's job is the
 * opposite of the old one's — not to remember what to put back, but to hand over the dabs so
 * the undo entry can be an inverse over *the journal* rather than over pixels.
 *
 * ## Why the dab is placed on the surface rather than at the pointer
 *
 * **Because the ray hits a facet and the field is a shell.** `fieldHit` resolves the surface
 * to `BRUSH_EPSILON`; everything from there on works in world units on the true surface, and
 * the field's voxel size is the only resolution in play. Nothing here knows a UV exists.
 *
 * ## Why dabs are spaced by distance and not by pointer event
 *
 * **Because a pointer event is a rate, not a place.** A slow drag emits few events and a fast
 * one emits many, so spacing by event would put dense dabs where somebody moved quickly and
 * sparse ones where they drew carefully — the opposite of what a brush wants. Spacing by
 * distance makes the dab density a property of the model, and two people drawing the same line
 * at different speeds get the same stroke.
 */

import type { RGBA } from "@big-mesh-studios/core";

import type { PaintField } from "./paint-field";
import type { PaintJournal } from "./paint-journal";
import { rasterise, type Placed } from "./paint-rasterise";

/** How the brush is set, from the panel. */
export interface BrushSettings {
  /** The disc's **radius** in world units, which is what a person sizes a brush in. */
  readonly radius: number;
  /** 0 for an airbrush and 1 for a hard edge. */
  readonly hardness: number;
  readonly colour: RGBA;
}

/** One surface hit, already resolved to a part. */
export interface SurfaceHit {
  /** Where the disc sits, in world units. */
  readonly point: { x: number; y: number; z: number };
  /** Which way the surface faces there. */
  readonly normal: { x: number; y: number; z: number };
  /** Which part, as an index into the parts list. */
  readonly part: number;
}

/**
 * The smallest gap between dabs, as a fraction of the brush's own radius.
 *
 * **A third, so three dabs overlap across any diameter.** Half would leave a scalloped edge
 * where a chain of discs is wider at the joins than at the centres; a fifth would triple the
 * dabs a stroke costs for a difference nobody can see at this radius. A third is the usual
 * answer and it is here because the alternative is a stroke with a wavy edge.
 */
const SPACING = 1 / 3;

/**
 * How a dab's part-local coordinates are found from where the brush was.
 *
 * **The transform is the caller's because the brush has no model.** A dab is stored part-local
 * so paint follows its part, and turning a world point into a part's frame needs that part's
 * inverse orientation — `@big-mesh-studios/csg`'s `conjugate` and `rotate`, applied to a
 * `Part`. M4's caller has those; this file has a number.
 */
export type Localiser = (
  part: number,
  point: { x: number; y: number; z: number },
  normal: { x: number; y: number; z: number },
) => {
  centre: readonly [number, number, number];
  normal: readonly [number, number, number];
};

/** What one stroke did, handed over so the caller can make it one undo entry. */
export interface StrokeResult {
  /** How many dabs the stroke added. */
  readonly dabs: number;
  /** How many of them changed a voxel; the rest were culled as dead. */
  readonly live: number;
}

/**
 * One drag, as a run of dabs.
 *
 * **Holds the previous sample rather than the previous stamp**, because the spacing rule is
 * about distance and a dab's size depends on the brush rather than on where the last one was.
 */
export class PaintBrush {
  private previous:
    { point: { x: number; y: number; z: number }; part: number } | undefined;
  private added = 0;
  private live = 0;

  /**
   * How many of this stroke's dabs are already in the field.
   *
   * **Which is what keeps the field current under the finger.** Every `moveTo` rasterises the
   * dabs it has just added and nothing else, so the painting on screen is the painting so far
   * rather than the painting as it will be when the finger lifts. The first version rasterised
   * only in `finish`, and a stroke that shows nothing until the finger comes up is
   * indistinguishable from a broken brush.
   */
  private written = 0;

  /**
   * @param localise Turns a world point and normal into the owning part's own frame.
   * @param place    Where each dab goes in the world, or `undefined` to skip it.
   */
  constructor(
    private readonly journal: PaintJournal,
    /**
     * The field this brush paints into.
     *
     * **Taken at construction rather than at `finish`**, because `finish` was too late: the
     * first version rasterised there and only there, so a stroke drew nothing until the finger
     * came up. A brush that saves instead of painting looks exactly like a brush that is broken.
     */
    private readonly field: PaintField,
    private readonly settings: BrushSettings,
    private readonly localise: Localiser,
    private readonly place: (
      part: number,
      centre: { x: number; y: number; z: number },
      normal: { x: number; y: number; z: number },
    ) => Placed | undefined,
  ) {}

  /** How many dabs this stroke has added so far. */
  get count(): number {
    return this.added;
  }

  /**
   * Adds dabs from the last sample to here, and nothing if it is too close.
   *
   * **A first sample always adds one**, because a dab with no previous is a tap and a tap is
   * how somebody puts a single mark down. Without it a tap on the model would paint nothing
   * and be read as "the brush is broken".
   *
   * **A sample on a different part never joins the run**, because the distance between the two
   * is not a distance along one surface. Joining across a part boundary would leave a chain of
   * discs running through empty space between two unrelated surfaces — which is the same
   * failure the atlas's chart check was there to prevent, arriving by a different route.
   */
  moveTo = (hit: SurfaceHit): void => {
    const last = this.previous;
    const gap = this.settings.radius * SPACING;
    if (last !== undefined && last.part === hit.part) {
      const travel = Math.hypot(
        hit.point.x - last.point.x,
        hit.point.y - last.point.y,
        hit.point.z - last.point.z,
      );
      if (travel < gap) return;
      const steps = Math.min(
        Math.floor(travel / gap),
        // **Capped, because a pointer jump is a teleport rather than a stroke.** A stroke that
        // crosses the model in one event — which happens when a drag starts on the model and
        // leaves the canvas — would otherwise write a dab at every spacing along the chord,
        // painting a stripe through the interior of the figure.
        256,
      );
      for (let step = 1; step <= steps; step++) {
        const at = step / steps;
        this.add({
          point: {
            x: last.point.x + (hit.point.x - last.point.x) * at,
            y: last.point.y + (hit.point.y - last.point.y) * at,
            z: last.point.z + (hit.point.z - last.point.z) * at,
          },
          normal: hit.normal,
          part: hit.part,
        });
      }
      this.previous = { point: hit.point, part: hit.part };
      this.paint();
      return;
    }
    this.add(hit);
    this.previous = { point: hit.point, part: hit.part };
    this.paint();
  };

  /**
   * Writes everything added since the last time, so the field is never behind the finger.
   *
   * **Only the new dabs, because a field is composited rather than assigned** — see
   * `rasterise`'s `from`. Re-rasterising the whole journal per pointer move would be quadratic
   * in the stroke and would rewrite thousands of voxels to add one disc.
   */
  private paint = (): void => {
    if (this.written === this.journal.count) return;
    const result = rasterise(
      this.journal,
      this.field,
      this.place,
      this.written,
      this.journal.count,
    );
    this.written = this.journal.count;
    this.live += result.live;
  };

  private add(hit: {
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    part: number;
  }): void {
    const local = this.localise(hit.part, hit.point, hit.normal);
    this.journal.append({
      centre: local.centre,
      normal: local.normal,
      radius: this.settings.radius,
      hardness: this.settings.hardness,
      colour: this.settings.colour,
      part: hit.part,
    });
    this.added += 1;
  }

  /**
   * Closes the stroke and reports what it did.
   *
   * **Nothing is rasterised here**, because {@link moveTo} already has. It is the last write
   * that mattered and it happened under the finger; finishing only has to close the stroke so
   * that one undo step is one drag.
   */
  finish = (): StrokeResult => {
    if (this.added === 0) return { dabs: 0, live: 0 };
    this.journal.endStroke();
    this.previous = undefined;
    this.written = this.journal.count;
    return { dabs: this.added, live: this.live };
  };
}
