/**
 * One drag, as a sequence of stamps and one undo entry.
 *
 * ## Why this is a class and not a function of the pointer handler
 *
 * **Because a stroke is not one event and undo is one of them.** A drag across a figure is
 * dozens of pointer moves and dozens of stamps, and the undo entry belongs to the drag. A
 * recorder holds the rectangle the stroke covered, which a caller cannot know before the drag
 * ends, and turns it into the one `HistoryEntry` the store wants.
 *
 * ## Why the rectangle grows rather than being computed per stamp
 *
 * **Because a stroke's undo entry has to be a copy of what was there before, and the "before" is
 * only knowable as the stroke runs.** Each stamp grows the rectangle and snapshots the new part of
 * it — so the recorder holds the original contents of everything the stroke touched, and nothing
 * else. A stroke across a whole figure costs a few hundred kilobytes rather than the four a whole
 * atlas snapshot would, which is the difference between a hundred undos and two.
 *
 * ## Why the first sample is not stamped twice
 *
 * **Because the previous point starts as "no point at all".** A first dab, then every move as a
 * segment from the last one. Without that, a tap would paint two overlapping discs at the same
 * place and an alpha-blended brush would show it as a darker dot in the middle.
 */
import type {
  DirtyRect,
  PaintSurface,
  Rgba,
  Stroke,
} from "../unwrapping/paint-surface";

/**
 * A rectangle's bytes out of a buffer that is not the live one.
 *
 * **A module function rather than a method on the surface, because the surface's own `snapshot`
 * reads the surface** — and undo needs what a buffer held at the moment the stroke started, which
 * is a different thing and was the bug this exists for.
 */
const readRect = (
  pixels: Uint8Array<ArrayBufferLike>,
  width: number,
  rect: DirtyRect,
): Uint8Array => {
  const span = rect.x1 - rect.x0 + 1;
  const stride = width * 4;
  const out = new Uint8Array((rect.y1 - rect.y0 + 1) * span * 4);
  for (let y = rect.y0; y <= rect.y1; y++) {
    const from = y * stride + rect.x0 * 4;
    out.set(pixels.subarray(from, from + span * 4), (y - rect.y0) * span * 4);
  }
  return out;
};

/** How the brush is set, from the panel. */
export interface BrushSettings {
  /** Width in world units, which is what a person thinks in. */
  readonly width: number;
  /** Texels per world unit, from the bake, which is what turns that into a texel count. */
  readonly texelsPerUnit: number;
  readonly hardness: number;
  readonly colour: Rgba;
}

/** One dab, kept so a redo can put it back rather than merely pretend to. */
export interface Segment {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}

/** What a finished stroke did, for the caller's one store write. */
export interface PaintedStroke {
  /** The texels the stroke touched, and nothing else. */
  readonly rect: DirtyRect;
  /** The contents of those texels *before* the stroke, for the undo entry. */
  readonly before: Uint8Array;
  /** Every dab the stroke made, for the redo half of the entry. */
  readonly segments: readonly Segment[];
  /** How many stamps it took, which is zero for a press that hit nothing. */
  readonly stamps: number;
}

/**
 * Accumulates a stroke over a brush and the atlas it is painting into.
 *
 * **One recorder per drag, thrown away at the end of it.** Holding one across strokes would mean
 * undoing one and restoring the snapshot of another.
 *
 * ## Why it keeps a whole copy of the atlas while it runs
 *
 * **Because the alternative is a rectangle that grows, and a growing rectangle is where the bugs
 * are.** Each stamp can widen the area the stroke has touched by a row or a column, and every
 * byte already snapshotted has to move to make room for the new ones. Doing that per stamp makes
 * a stroke quadratic in copying; keeping a separate snapshot per stamp makes undo mean replaying
 * every dab in reverse, which is a different and worse answer.
 *
 * So the first stamp copies the atlas once — four megabytes, about a millisecond, against a
 * stroke that is about to stamp thousands of texels — and each later growth re-reads only the new
 * rectangle out of that copy. What is kept afterwards, for the history entry, is bounded by the
 * stroke: a stroke across a figure costs a few hundred kilobytes rather than four megabytes,
 * which is the difference between a hundred undos and two.
 *
 * The copy is dropped as soon as {@link finish} answers, so it is one stroke's worth of memory and
 * not the history's.
 */
export class StrokeRecorder {
  private readonly surface: PaintSurface;
  private readonly settings: BrushSettings;

  /** The atlas as it was when this stroke started, copied on the first stamp. */
  private original: Uint8Array<ArrayBufferLike> | undefined;

  /** The texels this stroke has touched, or undefined until it touches any. */
  private rect: DirtyRect | undefined;

  /** What those texels held before the stroke, which is what undo needs. */
  private before: Uint8Array<ArrayBufferLike> = new Uint8Array(0);

  /** Where the last stamp landed, or undefined if there has not been one. */
  private previous: readonly [number, number] | undefined;
  /** The chart the last sample was in, or -1 when nothing has said. See `moveTo`. */
  private chart = -1;

  /** Every dab so far, because a redo has to replay them and cannot invert them. */
  private readonly segments: Segment[] = [];

  private count = 0;

  constructor(surface: PaintSurface, settings: BrushSettings) {
    this.surface = surface;
    this.settings = settings;
  }

  /**
   * Paints up to a texture coordinate, and remembers where that was.
   *
   * **The width comes from the settings every time rather than being captured once**, so a panel
   * change mid-drag takes effect on the next move instead of being silently ignored until the
   * next stroke.
   */
  moveTo = (u: number, v: number, chart = -1): void => {
    /**
     * **One dab where the pointer actually was, and a line only where a line means something.**
     *
     * The dab is not the fallback — it is the drawing. Every sample puts a dab at its own
     * coordinate, so the mark is on the model wherever the finger went, and no arithmetic
     * between two samples can invent a mark somewhere the finger never was. That is the whole of
     * the fix, and it does not depend on knowing why the samples are far apart.
     *
     * **The line between two samples is the part that can be wrong.** A stroke is a capsule: a
     * straight run from one atlas coordinate to the next. Within one chart that is a fair
     * approximation of the path the finger took, because a chart's coordinates are a continuous
     * map of a connected piece of the model. Across two charts it is not a path at all — the
     * atlas is a packing, and a line from one chart to another crosses whatever the packer put
     * in between, which is how a drag over a seam leaves a stripe through the model.
     *
     * **So the line is drawn only within a chart, and the gap is filled by the dab at each end.**
     * Over a seam the stroke is two marks with nothing between them, which is what the finger
     * actually did: there is a cut in the texture there and no honest way to draw across it.
     *
     * **A mesh with no chart information joins the samples as it always did** — the right answer
     * for a mesh with no seams in it, and the old behaviour rather than a broken one.
     */
    const joinable =
      chart >= 0 && this.chart >= 0 ? chart === this.chart : true;

    const stroke: Stroke = {
      from: joinable && this.previous !== undefined ? this.previous : [u, v],
      to: [u, v],
      width: Math.max(1, this.settings.width * this.settings.texelsPerUnit),
      hardness: this.settings.hardness,
      colour: this.settings.colour,
    };

    // **The copy is taken before the stamp, not after.** Taken inside `keep` — which is called
    // once the stamp has been laid down — it records the first dab as though it had always been
    // there, and undo then restores every dab except that one. It is a byte-exact undo of all but
    // the first mark, which is the kind of bug that survives a long time being nearly right.
    if (this.original === undefined) {
      this.original = this.surface.pixels.slice();
    }

    const touched = this.surface.stamp(stroke);
    if (touched !== undefined) {
      this.keep(touched);
      this.segments.push({ from: stroke.from, to: stroke.to });
      this.count++;
    }
    this.previous = [u, v];
    if (chart >= 0) this.chart = chart;
  };

  /**
   * What the stroke did, for the caller to turn into one history entry.
   *
   * **`undefined` for a stroke that hit nothing**, which is a tap on the sky and not an edit. The
   * store refuses to record an entry that changed nothing, and this is where that refusal gets
   * its answer from.
   */
  finish = (): PaintedStroke | undefined => {
    const rect = this.rect;
    const before = this.before;
    // **The copy goes now**, whatever the answer: a stroke that hit nothing has no need of one,
    // and a stroke that did has given it to the history entry.
    this.original = undefined;
    if (rect === undefined) return undefined;
    return { rect, before, segments: this.segments, stamps: this.count };
  };

  /** Whether the stroke has touched anything yet. */
  get started(): boolean {
    return this.count > 0;
  }

  /**
   * Puts a finished stroke back down, for a redo.
   *
   * **Replaying rather than restoring, because restoring needs the "before" bytes and undo has
   * already spent them.** A redo cannot rewind the rectangle, so it runs the same dabs again —
   * which is exactly what the person did, and lands in the same place for the same reason.
   *
   * **A static rather than an instance method**, because a redo happens long after the recorder
   * that made the stroke has been thrown away, and all it needs is the segments and a surface.
   */
  static replay = (
    surface: PaintSurface,
    settings: BrushSettings,
    segments: readonly Segment[],
  ): void => {
    for (const segment of segments) {
      surface.stamp({
        from: segment.from,
        to: segment.to,
        width: Math.max(1, settings.width * settings.texelsPerUnit),
        hardness: settings.hardness,
        colour: settings.colour,
      });
    }
    surface.markChanged();
  };

  /**
   * Grows the rectangle and re-reads it out of the pre-stroke copy.
   *
   * **A row is three pieces — columns added on the left, the overlap, and columns added on the
   * right** — and the overlap has to be measured in the *old* row's terms, not the new one's.
   * Sizing the copy by the new span instead is the bug this shape is shaped to avoid: it runs off
   * the end of a row and reads the next one's bytes into the middle of this one, which undoes
   * correctly for most of a stroke and corrupts a stripe of it.
   */
  private keep = (touched: DirtyRect): void => {
    const original = this.original!;
    if (this.rect === undefined) {
      this.rect = touched;
      this.before = readRect(original, this.surface.width, touched);
      return;
    }

    const previous = this.rect!;
    const grown: DirtyRect = {
      x0: Math.min(previous.x0, touched.x0),
      y0: Math.min(previous.y0, touched.y0),
      x1: Math.max(previous.x1, touched.x1),
      y1: Math.max(previous.y1, touched.y1),
    };

    const span = grown.x1 - grown.x0 + 1;
    const rows = grown.y1 - grown.y0 + 1;
    const stride = this.surface.width * 4;
    const next = new Uint8Array(span * rows * 4);

    /** The pre-stroke bytes of `count` columns of a row, for columns never painted. */
    const untouched = (
      worldY: number,
      firstColumn: number,
      count: number,
      at: number,
    ): void => {
      if (count <= 0) return;
      const from = worldY * stride + (grown.x0 + firstColumn) * 4;
      next.set(original.subarray(from, from + count * 4), at);
    };

    const oldSpan = previous.x1 - previous.x0 + 1;

    for (let y = 0; y < rows; y++) {
      const worldY = grown.y0 + y;
      const destination = y * span * 4;

      if (worldY < previous.y0 || worldY > previous.y1) {
        untouched(worldY, 0, span, destination);
        continue;
      }

      const before = Math.max(0, previous.x0 - grown.x0);
      const after = Math.max(0, grown.x1 - previous.x1);
      const overlap = span - before - after;

      untouched(worldY, 0, before, destination);
      const source = (worldY - previous.y0) * oldSpan * 4;
      next.set(
        this.before!.subarray(source, source + overlap * 4),
        destination + before * 4,
      );
      untouched(
        worldY,
        before + overlap,
        after,
        destination + (before + overlap) * 4,
      );
    }

    this.rect = grown;
    this.before = next;
  };
}
