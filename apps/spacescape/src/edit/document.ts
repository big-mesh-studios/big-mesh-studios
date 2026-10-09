/**
 * The model, and its history.
 *
 * The operation list is the history. That is ADR 0002's decision and the reason for most
 * of what follows: undoing an edit is removing what it added, which is exact, needs no
 * reverse command, and cannot be wrong about which region to invalidate — the region an
 * edit touched is knowable from the operations themselves rather than guessed at.
 *
 * **A stroke is one history step, however many operations it added.** A stroke across a
 * large model is hundreds of dabs, and undoing them one at a time would be unusable. The
 * operations of a stroke are contiguous because they are appended in order, so a stroke
 * is a range and undo is a range removal. That is what makes undo O(1) in *commands*
 * rather than in operations — the list splice is O(n) over the operations, which at a few
 * thousand is nothing, and is not the cost anyone means by O(1).
 *
 * **Removing a range does not renumber anything after it.** An operation's index is its
 * position in the fold, and it must increase monotonically and never be reused, or the
 * colour resolution order changes under a stroke that is still in progress. Splicing a
 * contiguous range out and leaving the survivors alone satisfies that by construction.
 *
 * **Redo restores the operations, not a record of what to recompute.** The redo stack
 * holds the removed operations themselves, so a redo cannot diverge from what the undo
 * actually did.
 *
 * Nothing here knows about chunks, meshes or the renderer. The brush adds operations; the
 * document owns the list and the history; something above decides what to re-mesh.
 */

import { Operation, boundsOf } from "@big-mesh-studios/csg";
import { FoldOrder } from "./fold-order";

/** A contiguous run of operations, which is what a stroke adds and undo removes. */
interface Range {
  readonly from: number;
  readonly count: number;
}

/** A run taken out of the list, and where it went. */
interface Removed extends Range {
  readonly operations: Operation[];
}

/** Told whenever the list changes, so the session can decide what to re-mesh. */
export type DocumentListener = (
  operations: readonly Operation[],
  change: Change,
) => void;

export interface Change {
  readonly kind: "add" | "undo" | "redo";
  /**
   * The cells this change touched, as world-space bounds.
   *
   * Reported rather than recomputed by the listener, because the operations carry their
   * own extents and asking every listener to work them out again is how two places end up
   * disagreeing about what an edit touched.
   */
  readonly bounds: Bounds | undefined;
  /** How many operations were added or removed. */
  readonly count: number;
}

export interface Bounds {
  readonly min: { x: number; y: number; z: number };
  readonly max: { x: number; y: number; z: number };
}

export class SculptDocument {
  private operations: Operation[] = [];
  private readonly undoStack: Range[] = [];
  /** What undo removed, kept whole so a redo cannot diverge from what it did. */
  private readonly redoStack: Removed[] = [];
  private readonly listeners = new Set<DocumentListener>();

  /**
   * Where this document's next operation's position in the fold comes from.
   *
   * Shared rather than private, because `index` is not the document's alone: a place
   * allocates from the same counter so that the two cannot collide (see
   * `fold-order.ts`). It is exposed as an object rather than as a number because a
   * bare `nextIndex` getter would invite a caller to read it and compute an index
   * itself, which is the one way to get this wrong.
   */
  readonly order = new FoldOrder();

  /** Every operation, in fold order. */
  get list(): readonly Operation[] {
    return this.operations;
  }

  get count(): number {
    return this.operations.length;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** How many commands are undoable. For a readout, and for a limit. */
  get undoDepth(): number {
    return this.undoStack.length;
  }

  /** Told about every change. Returns a function that stops listening. */
  onChange(listener: DocumentListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Appends operations as one undoable command.
   *
   * A stroke arrives here already complete rather than being built up operation by
   * operation, so that a stroke interrupted half way — the pointer released, the tab
   * closed, an exception — leaves nothing behind. A partially added stroke would be an
   * edit the user cannot see and cannot undo in one piece.
   */
  add(operations: readonly Operation[], bounds?: Bounds): boolean {
    if (operations.length === 0) return false;

    // Before the append, not after: an operation arriving with an index from
    // elsewhere — a deserialised model, a peer's wire format — has to move the counter
    // out of its way whether or not it lands at the end. And never backwards, so a
    // reset to a shorter list cannot reissue what a place above already holds.
    this.order.reserveThrough(operations);

    const from = this.operations.length;
    this.operations.push(...operations);
    this.undoStack.push({ from, count: operations.length });
    // Anything that was undone is now unreachable: the list has moved past it, so a redo
    // would put operations back at a position that no longer means what it did.
    this.redoStack.length = 0;

    this.emit({ kind: "add", bounds, count: operations.length });
    return true;
  }

  /** Removes the last command's operations. Whether the removal is worth re-meshing. */
  undo(): Change | undefined {
    const range = this.undoStack.pop();
    if (range === undefined) return undefined;

    const operations = this.operations.splice(range.from, range.count);
    const removed: Removed = {
      from: range.from,
      count: range.count,
      operations,
    };

    this.redoStack.push(removed);

    const change: Change = {
      kind: "undo",
      bounds: boundsOf(operations),
      count: operations.length,
    };
    this.emit(change);
    return change;
  }

  /** Puts back what the last undo removed, in the place it was. */
  redo(): Change | undefined {
    const entry = this.redoStack.pop();
    if (entry === undefined) return undefined;

    this.operations.splice(entry.from, 0, ...entry.operations);
    this.undoStack.push({ from: entry.from, count: entry.operations.length });

    const change: Change = {
      kind: "redo",
      bounds: boundsOf(entry.operations),
      count: entry.operations.length,
    };
    this.emit(change);
    return change;
  }

  /**
   * Throws the history away, keeping the list.
   *
   * For loading a document, where the list is the whole of the saved state and there is no
   * earlier version to return to. Distinct from clearing, which discards both.
   */
  resetHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /** Discards the list and the history. */
  clear(): void {
    this.operations = [];
    this.resetHistory();
    this.emit({ kind: "add", bounds: undefined, count: 0 });
  }

  private emit(change: Change): void {
    for (const listener of this.listeners) listener(this.operations, change);
  }
}

/**
 * The world bounds of a set of operations, or undefined when there are none.
 *
 * **Re-exported from `@big-mesh-studios/csg` rather than written here, which is a fix and
 * not only a deduplication.** The copy this replaces read each operation's half-extents
 * off its shape and added and subtracted them from its origin — which is the shape's
 * extent in *its own* frame, applied as though it were in the world's. A rotated brush
 * dab therefore reported a box narrower than the operation's reach, the chunks holding
 * its far corners were never invalidated, and an edit's edge stayed stale on screen until
 * something else re-meshed it. `csg`'s `boundsOf` rotates the eight corners instead.
 *
 * The name and the signature are the same so that the callers in this application did
 * not have to change, which is the point of leaving the fix to the smallest edit that
 * makes it.
 */
export { boundsOf };
