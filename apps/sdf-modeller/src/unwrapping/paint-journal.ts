/**
 * The paint journal: every dab the user has made, in order, and nothing else.
 *
 * ## Why this is the only durable paint state
 *
 * **Because everything else can be thrown away and rebuilt from it, and nothing can be
 * rebuilt from anything else.** The field is a rasterisation, the atlas is a cache, and a
 * thumbnail is a picture. If a journal is lost the painting is lost; if the field is lost it
 * costs a re-rasterise. That asymmetry is the whole argument for keeping the journal and
 * discarding the rest, and it is why this file has no way to *edit* a dab after the fact.
 *
 * ## Why a journal and not a list of objects
 *
 * **Because a painting is append-mostly and read-mostly, and the read side walks it in order
 * every time it is rasterised.** An array of `{ centre, radius, colour }` objects would make
 * every rasterise a pointer chase through the heap, and — the part that actually matters —
 * would make ten thousand repaints of the same spot ten thousand heap objects, which is
 * exactly the leak that made `randoms-3d-paint`'s operation list grow without bound.
 *
 * Structure-of-arrays in flat typed buffers is 44 bytes a dab, contiguous, and grows by
 * doubling rather than one object at a time.
 *
 * ## Why the three counters are separate fields
 *
 * **Because a stroke in progress and a stroke finished are different states and conflating
 * them corrupts the boundary between them.** The first version kept them in one array whose
 * last entry doubled as "the journal's length", and appending to an open stroke overwrote the
 * marker that said where the *previous* stroke had ended — so the stroke before the one being
 * drawn became un-undoable. `ends`, `openStart` and `length` each say one thing and cannot
 * disagree with another.
 *
 * ## Why a dab carries a normal and not a frame
 *
 * **Because the brush is round.** A frame exists to make a non-square dab possible, and there
 * is no non-square brush; storing two extra floats per dab to carry a capability nothing reads
 * is 8 bytes a dab of nothing. If a shape brush is ever added, `onbFromDirection` from
 * `@big-mesh-studios/core` gives a continuous orthonormal frame from the normal alone, so the
 * bytes can be derived rather than stored.
 */

import type { RGBA } from "@big-mesh-studios/core";

/** Floats a dab occupies in `centre` and `normal`. */
const VEC = 3;

/**
 * The bytes one dab costs.
 *
 * **Six floats, two more, and three words.** Centre and normal are positions in the owning
 * part's frame; radius is in world units; hardness and the four colour bytes carry the brush's
 * own shape. `part` is an index rather than a value so the journal does not have to resolve an
 * object to answer a question about it.
 */
export const DAB_BYTES = VEC * 4 * 2 + 4 * 2 + 4 + 4;

/** One brush mark: a round disc lying on the surface, in the owning part's local space. */
export interface Dab {
  /**
   * Where the dab is, **in the owning part's local frame.**
   *
   * Part-local rather than world because paint follows its part: a dab stored in world space
   * is left behind by the part it was painted on the moment that part moves.
   */
  readonly centre: readonly [number, number, number];
  /** Which way the surface faces here. Unit length. */
  readonly normal: readonly [number, number, number];
  /** The disc's radius in world units, which is what a person sizes a brush in. */
  readonly radius: number;
  /** 0 for an airbrush and 1 for a hard edge. */
  readonly hardness: number;
  /** The colour, straight-alpha. */
  readonly colour: RGBA;
  /** Index of the part this dab belongs to. */
  readonly part: number;
}

/** The dabs taken by an undo, handed back so the matching redo can put them back. */
export interface RemovedDabs {
  readonly count: number;
  readonly centre: Float32Array;
  readonly normal: Float32Array;
  readonly radius: Float32Array;
  readonly hardness: Float32Array;
  readonly colour: Uint8Array;
  readonly part: Uint32Array;
}

export class PaintJournal {
  /** Where each dab is, three floats apiece, part-local. */
  centre = new Float32Array(64 * VEC);
  /** Which way the surface faces at each dab, three floats apiece. */
  normal = new Float32Array(64 * VEC);
  /** Each dab's radius in world units. */
  radius = new Float32Array(64);
  /** Each dab's edge hardness, 0 to 1. */
  hardness = new Float32Array(64);
  /** Each dab's straight-alpha RGBA, four bytes apiece. */
  colour = new Uint8Array(64 * 4);
  /** Which part each dab belongs to. */
  part = new Uint32Array(64);

  /** How many dabs there are in total. */
  private length = 0;

  /** The dab count at the end of every finished stroke, in order. */
  private ends: number[] = [];

  /** The dab count when the stroke now being drawn began. */
  private openStart = 0;

  get count(): number {
    return this.length;
  }

  /** How many strokes have been finished. A stroke in progress is not one of them. */
  get strokeCount(): number {
    return this.ends.length;
  }

  /** How many dabs the stroke in progress holds, or 0 if there is none. */
  get openStrokeCount(): number {
    return this.length - this.openStart;
  }

  private grow(): void {
    const capacity = this.radius.length * 2;
    const centre = new Float32Array(capacity * VEC);
    centre.set(this.centre);
    this.centre = centre;
    const normal = new Float32Array(capacity * VEC);
    normal.set(this.normal);
    this.normal = normal;
    const radius = new Float32Array(capacity);
    radius.set(this.radius);
    this.radius = radius;
    const hardness = new Float32Array(capacity);
    hardness.set(this.hardness);
    this.hardness = hardness;
    const colour = new Uint8Array(capacity * 4);
    colour.set(this.colour);
    this.colour = colour;
    const part = new Uint32Array(capacity);
    part.set(this.part);
    this.part = part;
  }

  /**
   * Adds one dab to the stroke in progress.
   *
   * **Open by default.** A caller appends as the pointer moves and calls {@link endStroke} when
   * the finger lifts; the journal does not decide when a stroke ends, because only the caller
   * knows whether the lift was a lift or a cancellation.
   */
  append(dab: Dab): void {
    if (this.length === this.radius.length) this.grow();
    const at = this.length;
    this.centre.set(dab.centre, at * VEC);
    this.normal.set(dab.normal, at * VEC);
    this.radius[at] = dab.radius;
    this.hardness[at] = dab.hardness;
    this.colour[at * 4] = dab.colour.r;
    this.colour[at * 4 + 1] = dab.colour.g;
    this.colour[at * 4 + 2] = dab.colour.b;
    this.colour[at * 4 + 3] = dab.colour.a;
    this.part[at] = dab.part;
    this.length = at + 1;
  }

  /** Closes the stroke in progress, so it becomes one undoable thing. */
  endStroke(): void {
    // **A stroke with no dabs is not recorded.** A tap that landed off the model produced no
    // paint and should leave no trace; without this, every stray tap pastes an empty entry onto
    // the history and ctrl-z steps through them doing nothing.
    if (this.length === this.openStart) return;
    this.ends.push(this.length);
    this.openStart = this.length;
  }

  /**
   * Takes the last finished stroke back off, and returns its dabs.
   *
   * **Returns the dabs rather than remembering them**, so the caller can hand them to the store
   * as a redo. `model-store.ts` already pairs every edit with its inverse for exactly this
   * reason, and an undo that cannot be redone is half an undo.
   */
  undoStroke(): RemovedDabs | undefined {
    // **An interrupted stroke is dropped whole and silently.** A drag that never reached
    // `endStroke` — a pointer lost, a tab closed — has dabs that were never part of the
    // painting as far as undo is concerned. Truncating them here is what stops a half-drawn
    // stroke surviving into a state nothing else could remove. In normal use this never fires,
    // because a pointer is lifted before an undo can be pressed.
    if (this.length !== this.openStart) {
      this.length = this.openStart;
    }
    if (this.ends.length === 0) return undefined;
    const to = this.ends.pop()!;
    const from = this.ends.length === 0 ? 0 : this.ends[this.ends.length - 1]!;
    this.length = from;
    this.openStart = from;
    const count = to - from;
    if (count === 0) return undefined;
    return {
      count,
      centre: this.centre.slice(from * VEC, (from + count) * VEC),
      normal: this.normal.slice(from * VEC, (from + count) * VEC),
      radius: this.radius.slice(from, from + count),
      hardness: this.hardness.slice(from, from + count),
      colour: this.colour.slice(from * 4, (from + count) * 4),
      part: this.part.slice(from, from + count),
    };
  }

  /** Puts dabs taken by {@link undoStroke} back on the end, as one finished stroke. */
  redoStroke(removed: RemovedDabs): void {
    for (let i = 0; i < removed.count; i++) {
      this.append({
        centre: [
          removed.centre[i * VEC]!,
          removed.centre[i * VEC + 1]!,
          removed.centre[i * VEC + 2]!,
        ],
        normal: [
          removed.normal[i * VEC]!,
          removed.normal[i * VEC + 1]!,
          removed.normal[i * VEC + 2]!,
        ],
        radius: removed.radius[i]!,
        hardness: removed.hardness[i]!,
        colour: {
          r: removed.colour[i * 4]!,
          g: removed.colour[i * 4 + 1]!,
          b: removed.colour[i * 4 + 2]!,
          a: removed.colour[i * 4 + 3]!,
        },
        part: removed.part[i]!,
      });
    }
    this.endStroke();
  }

  /**
   * Empties the journal and hands back everything that was in it, so a clear can be undone.
   *
   * **The whole journal rather than a rectangle of before-bytes**, which is what the atlas's
   * clear had to snapshot. There are no pixels underneath a dab to save — a dab is a parameter,
   * not a delta — so the dabs themselves are the only record that there was any painting, and
   * the only inverse that is exactly right.
   *
   * **An open stroke is kept out of it.** Dabs from a stroke that never finished were never
   * part of the painting as far as undo is concerned, and putting them back would make a
   * cancelled drag reappear after an undo.
   */
  clearWithUndo = (): RemovedDabs | undefined => {
    const count = this.ends.length === 0 ? 0 : this.ends[this.ends.length - 1]!;
    if (count === 0) {
      this.clear();
      return undefined;
    }
    const removed: RemovedDabs = {
      count,
      centre: this.centre.slice(0, count * VEC),
      normal: this.normal.slice(0, count * VEC),
      radius: this.radius.slice(0, count),
      hardness: this.hardness.slice(0, count),
      colour: this.colour.slice(0, count * 4),
      part: this.part.slice(0, count),
    };
    this.clear();
    return removed;
  };

  /** Drops everything, as "Clear texture" does. */
  clear(): void {
    this.length = 0;
    this.ends = [];
    this.openStart = 0;
  }
}
