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
 * drawn became un-undoable. `ends`, `openStartIndex` and `length` each say one thing and cannot
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
 * **Six floats, two more, and two words.** Centre and normal are positions in the owning
 * part's frame; radius is in world units; hardness and the four colour bytes carry the brush's
 * own shape. `part` is an index rather than a value so the journal does not have to resolve an
 * object to answer a question about it.
 *
 * **Forty, and it is the number `paint-file.ts` writes.** `plan.md` says "about forty-four" in
 * three places; that was an estimate made before the layout was fixed, and the round-trip test
 * at `paint-file.test.ts` holds the two ends of the codec to each other rather than to either
 * of these sentences.
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
  /**
   * Where each of the removed strokes ended, as dab counts within the removed run.
   *
   * **Carried because a stroke is an undo step and a clear removes several.** `clearWithUndo`
   * hands back every stroke in the document at once; without this, `redoStroke` closed them as
   * one and the next ctrl-z took all of a session's painting back off in a single step, which is
   * the one thing undo must never do. `undoStroke` writes a single-entry list for the same
   * reason — it removed exactly one stroke and says so.
   */
  readonly strokes: readonly number[];
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
  private openStartIndex = 0;

  get count(): number {
    return this.length;
  }

  /**
   * The dab count at the end of every finished stroke, in order.
   *
   * **Live rather than a copy, and read-only by type.** `rasterise` walks it once per call to
   * find where one stroke stops and the next begins, which is what lets a stroke composite once
   * rather than once a dab; copying a few hundred numbers on every pointer move to save a caller
   * a mutation it has no reason to attempt is the wrong trade.
   */
  get strokeEnds(): readonly number[] {
    return this.ends;
  }

  /**
   * Where the stroke in progress began, which is where a live re-rasterise has to start.
   *
   * **The brush's counterpart to {@link strokeEnds}.** It re-rasterises the open stroke whole on
   * every move, because writing only the dabs added since the last move composites the same
   * stroke's rim over itself and hardens the edge it was asked to soften.
   */
  get openStart(): number {
    return this.openStartIndex;
  }

  /** How many strokes have been finished. A stroke in progress is not one of them. */
  get strokeCount(): number {
    return this.ends.length;
  }

  /** How many dabs the stroke in progress holds, or 0 if there is none. */
  get openStrokeCount(): number {
    return this.length - this.openStartIndex;
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
    if (this.length === this.openStartIndex) return;
    this.ends.push(this.length);
    this.openStartIndex = this.length;
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
    if (this.length !== this.openStartIndex) {
      this.length = this.openStartIndex;
    }
    if (this.ends.length === 0) return undefined;
    const to = this.ends.pop()!;
    const from = this.ends.length === 0 ? 0 : this.ends[this.ends.length - 1]!;
    this.length = from;
    this.openStartIndex = from;
    const count = to - from;
    if (count === 0) return undefined;
    return {
      count,
      strokes: [count],
      centre: this.centre.slice(from * VEC, (from + count) * VEC),
      normal: this.normal.slice(from * VEC, (from + count) * VEC),
      radius: this.radius.slice(from, from + count),
      hardness: this.hardness.slice(from, from + count),
      colour: this.colour.slice(from * 4, (from + count) * 4),
      part: this.part.slice(from, from + count),
    };
  }

  /**
   * Puts dabs taken by {@link undoStroke} or {@link clearWithUndo} back on the end.
   *
   * **Restoring the stroke boundaries rather than closing one stroke**, for the reason
   * `RemovedDabs.strokes` exists: a clear hands back a whole document's painting, and putting it
   * back as one stroke would make the next undo a single step over everything.
   */
  redoStroke(removed: RemovedDabs): void {
    // **Where the run is going back to**, which is not zero when something else is already on
    // the journal. `RemovedDabs.strokes` counts within the removed run, so every end is relative
    // to this and has to be made absolute before it is pushed.
    const from = this.length;
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
    // **One end per removed stroke, not one end for the run**, and made absolute rather than
    // left relative. `endStroke` would record a single stroke however many went on, which is
    // the bug this replaced: after a clear and an undo, the next ctrl-z would take the whole
    // painting back off in one step.
    for (let i = 0; i < removed.strokes.length; i++) {
      this.ends.push(from + removed.strokes[i]!);
    }
    this.openStartIndex = this.length;
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
      strokes: this.ends.slice(),
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

  /** Drops everything, as "Clear paint" does. */
  clear(): void {
    this.length = 0;
    this.ends = [];
    this.openStartIndex = 0;
  }

  /**
   * Takes on a journal read back from a file, replacing whatever was here.
   *
   * **Six `set` calls rather than a constructor.** `PaintJournal` grows from sixty-four dabs
   * and is a class field on the document, not something the loader can swap out; and appending
   * through the public path would be wrong twice over — `append` does not know about stroke
   * boundaries, and the loaded dabs have to arrive with the stroke list the file carried, not
   * with the boundaries this session happened to have.
   *
   * **Only ever called when the journal is empty.** Replacing a live one would silently
   * invalidate a field that was rasterised from it, and the only caller is the load path, which
   * has just made a new document.
   *
   * **The arrays are taken whole, not subarrayed.** The journal's own `grow` doubles and
   * replaces them, so a view onto a decoded file's buffer would be silently detached the first
   * time anything was appended; `set` copies into storage this object owns.
   */
  adopt = (loaded: {
    readonly dabs: number;
    readonly strokes: readonly number[];
    readonly centre: Float32Array;
    readonly normal: Float32Array;
    readonly radius: Float32Array;
    readonly hardness: Float32Array;
    readonly colour: Uint8Array;
    readonly part: Uint32Array;
  }): void => {
    this.clear();
    while (this.radius.length < loaded.dabs) this.grow();
    this.centre.set(loaded.centre);
    this.normal.set(loaded.normal);
    this.radius.set(loaded.radius);
    this.hardness.set(loaded.hardness);
    this.colour.set(loaded.colour);
    this.part.set(loaded.part);
    this.length = loaded.dabs;
    this.ends = [...loaded.strokes];
    // **A file cannot hold a half-drawn stroke**, so what it loads as is a complete document:
    // there is nothing open, and the next dab starts a new one.
    this.openStartIndex = loaded.dabs;
  };
}
