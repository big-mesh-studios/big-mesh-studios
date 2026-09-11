/**
 * The stretches of one frame the probe times separately. The order is the
 * order they run in, and the numbers index every per-phase array here. A
 * stretch can sit inside another and be timed under both: the five `scroll`
 * stretches divide the window's move between them, and `advance`, `occlusion`
 * and `draw` are the three every other stretch falls inside.
 */
export const Phase = {
  player: 0,
  scroll: 1,
  /** The cells the window will hold once it has moved, and the keys they are looked up by. */
  scrollCells: 2,
  /**
   * Releasing the slots whose cells the move leaves behind, and marking those
   * that crossed a level-of-detail ring to be filled again where they stand.
   */
  scrollEvict: 3,
  /**
   * Teleporting a freed slot onto each entering cell, which unseats its
   * geometry from the superchunk that was drawing it and enrols it in the one
   * its new cell belongs to.
   */
  scrollTeleport: 4,
  /** Ordering the cells about to be streamed so the player's own comes first. */
  scrollOrder: 5,
  /**
   * The level of detail and the six neighbouring voxel sizes each entering cell
   * is asked for, and handing that batch to the fill client.
   */
  scrollRequest: 6,
  flow: 7,
  multiplayer: 8,
  /** Every scripted figure a place has placed: NPCs, props, fires, blasts. */
  figures: 9,
  environment: 10,
  meshDrain: 11,
  merge: 12,
  rendererTick: 13,
  advance: 14,
  occlusion: 15,
  draw: 16,
} as const;

/** Each phase's name, at the index that phase is timed under. */
export const PHASE_NAMES = /* @__PURE__ */ Object.keys(
  Phase,
) as (keyof typeof Phase)[];

/**
 * The things the probe counts over a whole run rather than timing: how much
 * work the world asked for and how much of it landed.
 */
export const Counter = {
  fillsRequested: 0,
  fillsLanded: 1,
  meshesRequested: 2,
  meshesLanded: 3,
  /** Geometry adopted straight from a fill, which no mesh request ever asked for. */
  meshesFromFill: 4,
  merges: 5,
  uploads: 6,
  scrolls: 7,
  blocksStreamed: 8,
} as const;

/** Each counter's name, at the index that counter is kept under. */
export const COUNTER_NAMES = /* @__PURE__ */ Object.keys(
  Counter,
) as (keyof typeof Counter)[];

/**
 * The values the probe records once per frame, each one a column of the frame
 * ring. The per-phase slices follow them, so a row is `FIELD_NAMES.length +
 * PHASE_NAMES.length` numbers wide.
 *
 * A value's number is its column, and the keys are written in that order: a
 * reader looks a column up by its position among the names, so a key added out
 * of order would name one column and be written into another.
 */
export const Field = {
  /** Milliseconds between this frame's animation callback and the one before. */
  gapMs: 0,
  /** Milliseconds the graphics card spent drawing the scene, from `GpuTimer`. */
  gpuMs: 1,
  /** The render scale the frame was drawn at, where 1 is the display resolution. */
  scale: 2,
  /** Bytes uploaded to the graphics card during the frame. */
  uploadBytes: 3,
  /** Superchunks whose geometry was merged and uploaded during the frame. */
  merges: 4,
  /** Triangles in the drawn geometry. */
  triangles: 5,
  /** Superchunks the occlusion pass found hidden. */
  occluded: 6,
  /** Superchunks that survived to be drawn. */
  visible: 7,
  /** Chunk meshes drawn this frame, one draw call each. */
  drawnMeshes: 8,
  /** Blocks waiting for terrain data. */
  fillPending: 9,
  /** Blocks whose terrain data a worker is generating. */
  fillInFlight: 10,
  /** Blocks waiting for geometry. */
  meshPending: 11,
  /** Blocks whose geometry a worker is building. */
  meshInFlight: 12,
  /** Superchunks whose merged geometry is out of date. */
  dirtySuperchunks: 13,
  /**
   * The JavaScript heap in bytes, sampled about once a second. What the browser
   * reports here counts the storage behind typed arrays as well as the objects
   * around them, so the voxels and geometry below are inside this number rather
   * than beside it.
   */
  heapBytes: 14,
  /**
   * Bytes the world holds in main memory — voxels, light and geometry —
   * counted rather than sampled, so it is the same number on every machine
   * and the one a memory ceiling is measured against.
   */
  residentBytes: 15,
  /** Of those, the bytes held as voxels and the light shadowing them. */
  voxelBytes: 16,
  /** Of those, the bytes held as the superchunks' merged geometry. */
  mergedGeometryBytes: 17,
  /**
   * Of those, the bytes held as per-block meshes whose superchunk has not
   * copied them in yet — the geometry in flight between a worker finishing a
   * block and the merge that takes it.
   */
  blockGeometryBytes: 18,
  /** Milliseconds the graphics card spent on the occlusion pass, from its own `GpuTimer`. */
  gpuOcclusionMs: 19,
  /**
   * Whether the block the player stands in has its terrain, as 1 or 0. The
   * world holds the player still while it is 0, so a run of zeroes is the
   * player having outrun what the workers could stream.
   */
  cellReady: 20,
  playerX: 21,
  playerY: 22,
  playerZ: 23,
} as const;

/** Each per-frame value's name, at the column it is recorded in. */
export const FIELD_NAMES = /* @__PURE__ */ Object.keys(
  Field,
) as (keyof typeof Field)[];

/** How many numbers one frame's row holds: the per-frame values, then the phase slices. */
export const ROW_STRIDE = FIELD_NAMES.length + PHASE_NAMES.length;

/** How many frames the ring holds before it starts overwriting the oldest. */
const DEFAULT_CAPACITY = 8192;

/** How long between two reads of the heap size, in milliseconds. */
const HEAP_SAMPLE_MS = 1000;

/** The heap reading Chromium adds to `performance`, absent in other browsers. */
interface HeapMemory {
  usedJSHeapSize: number;
}

/** One run's measurements, as plain numbers a benchmark script can carry away. */
export interface PerfDrain {
  /** Each frame's row, `rowStride` numbers per frame, oldest first. */
  rows: number[];
  rowStride: number;
  fieldNames: string[];
  phaseNames: string[];
  counterNames: string[];
  counters: number[];
  /** Frames recorded since the last reset, including any the ring has dropped. */
  framesSeen: number;
  /** Whether the ring wrapped, meaning the earliest frames are gone. */
  wrapped: boolean;
  /** Milliseconds between the reset and the drain. */
  durationMs: number;
}

/**
 * Records where a frame's time goes, what the world has queued, and how much
 * of it landed — for the benchmark scripts under `e2e/bench`, which arm the
 * probe, drive the player, and carry the numbers away.
 *
 * Disarmed it does nothing but test a boolean, so the calls can sit on the
 * frame path unconditionally. Armed it writes into arrays allocated up front:
 * a run records no objects, so the measurement never itself causes the
 * collection pause it would then blame on the frame.
 */
export class PerfProbe {
  private _armed = false;
  private rows = new Float64Array(0);
  private capacity = 0;
  /** Where the next frame's row starts, wrapping at the end of the ring. */
  private cursor = 0;
  private _framesSeen = 0;
  private _wrapped = false;
  private startedAt = 0;

  /** When each phase currently being timed began; only meaningful between `begin` and `end`. */
  private readonly phaseStart = new Float64Array(PHASE_NAMES.length);
  /** This frame's phase slices, moved into the row and cleared each frame. */
  private readonly phaseSlice = new Float64Array(PHASE_NAMES.length);
  private readonly counters = new Float64Array(COUNTER_NAMES.length);
  /** The values last handed to `gauge`, written into every row until they change. */
  private readonly gauges = new Float64Array(FIELD_NAMES.length);
  private lastHeapAt = 0;

  /** Whether the probe is recording. Every other method is inert while it is not. */
  get armed(): boolean {
    return this._armed;
  }

  /** Starts recording into a ring of `capacityFrames` frames, discarding anything held. */
  arm(capacityFrames: number = DEFAULT_CAPACITY): void {
    if (this.capacity !== capacityFrames) {
      this.capacity = capacityFrames;
      this.rows = new Float64Array(capacityFrames * ROW_STRIDE);
    }
    this._armed = true;
    this.reset();
  }

  /** Stops recording and releases the ring. */
  disarm(): void {
    this._armed = false;
    this.rows = new Float64Array(0);
    this.capacity = 0;
  }

  /** Throws away everything recorded so far and starts the run's clock again. */
  reset(): void {
    this.cursor = 0;
    this._framesSeen = 0;
    this._wrapped = false;
    this.counters.fill(0);
    this.phaseSlice.fill(0);
    this.lastHeapAt = 0;
    this.startedAt = performance.now();
  }

  /** Starts timing a phase. Pair it with `end` for the same phase. */
  begin(phase: number): void {
    if (!this._armed) {
      return;
    }
    this.phaseStart[phase] = performance.now();
  }

  /** Stops timing a phase, adding its slice to this frame's total for it. */
  end(phase: number): void {
    if (!this._armed) {
      return;
    }
    this.phaseSlice[phase] += performance.now() - this.phaseStart[phase];
  }

  /** Adds to a counter for this run. */
  count(counter: number, amount: number = 1): void {
    if (!this._armed) {
      return;
    }
    this.counters[counter] += amount;
  }

  /** Records a per-frame value, which every row carries until it is set again. */
  gauge(field: number, value: number): void {
    if (!this._armed) {
      return;
    }
    this.gauges[field] = value;
  }

  /**
   * Closes the frame: writes the gauges and this frame's phase slices into the
   * ring, samples the heap when it is due, and clears the slices for the next
   * frame.
   *
   * @param gapMs Milliseconds since the previous frame's animation callback.
   * @param gpuMs Milliseconds the graphics card spent on the previous frame.
   * @param scale The render scale the frame was drawn at.
   */
  frame(gapMs: number, gpuMs: number, scale: number): void {
    if (!this._armed) {
      return;
    }
    const at = performance.now();
    if (at - this.lastHeapAt >= HEAP_SAMPLE_MS) {
      this.lastHeapAt = at;
      const memory = (performance as Performance & { memory?: HeapMemory })
        .memory;
      this.gauges[Field.heapBytes] = memory?.usedJSHeapSize ?? 0;
    }
    this.gauges[Field.gapMs] = gapMs;
    this.gauges[Field.gpuMs] = gpuMs;
    this.gauges[Field.scale] = scale;

    const base = this.cursor;
    const fields = FIELD_NAMES.length;
    for (let i = 0; i < fields; i++) {
      this.rows[base + i] = this.gauges[i];
    }
    for (let i = 0; i < this.phaseSlice.length; i++) {
      this.rows[base + fields + i] = this.phaseSlice[i];
      this.phaseSlice[i] = 0;
    }
    // The bytes uploaded and the superchunks merged are counted for one frame
    // each, unlike the queue depths, which stand until they change.
    this.gauges[Field.uploadBytes] = 0;
    this.gauges[Field.merges] = 0;

    this._framesSeen++;
    this.cursor += ROW_STRIDE;
    if (this.cursor >= this.rows.length) {
      this.cursor = 0;
      this._wrapped = true;
    }
  }

  /** Everything recorded since the last reset, oldest frame first. */
  drain(): PerfDrain {
    const kept = this._wrapped ? this.capacity : this._framesSeen;
    const rows: number[] = new Array(kept * ROW_STRIDE);
    const first = this._wrapped ? this.cursor : 0;
    for (let i = 0; i < kept * ROW_STRIDE; i++) {
      rows[i] = this.rows[(first + i) % this.rows.length];
    }
    return {
      rows,
      rowStride: ROW_STRIDE,
      fieldNames: FIELD_NAMES,
      phaseNames: PHASE_NAMES,
      counterNames: COUNTER_NAMES,
      counters: Array.from(this.counters),
      framesSeen: this._framesSeen,
      wrapped: this._wrapped,
      durationMs: performance.now() - this.startedAt,
    };
  }
}

/** Every method `PerfProbe` exposes, so a build can swap in a probe that does nothing. */
export type PerfProbeApi = Pick<
  PerfProbe,
  | "armed"
  | "arm"
  | "disarm"
  | "reset"
  | "begin"
  | "end"
  | "count"
  | "gauge"
  | "frame"
  | "drain"
>;

const EMPTY_DRAIN: PerfDrain = {
  rows: [],
  rowStride: 0,
  fieldNames: [],
  phaseNames: [],
  counterNames: [],
  counters: [],
  framesSeen: 0,
  wrapped: false,
  durationMs: 0,
};

/**
 * Stands in for `PerfProbe` in a build without the instrumentation: every
 * method is empty, so the frame path can call into `probe` unconditionally
 * without carrying the ring buffer, the phase/counter/field bookkeeping, or
 * any of `PerfProbe` itself.
 */
class NoopProbe implements PerfProbeApi {
  readonly armed = false;
  arm(): void {}
  disarm(): void {}
  reset(): void {}
  begin(): void {}
  end(): void {}
  count(): void {}
  gauge(): void {}
  frame(): void {}
  drain(): PerfDrain {
    return EMPTY_DRAIN;
  }
}

/**
 * The one probe the world reports into. Measurement crosses every layer of the
 * frame — the player, the streaming, the renderer's merge loop — and handing a
 * probe down through each of their constructors would put a benchmark's
 * concern in the signature of objects that otherwise know nothing about one.
 *
 * `__PERF__` decides which implementation this is. Substituted with a literal
 * at build time, the branch not taken folds away along with everything it
 * alone referenced — `PerfProbe` included, in a build without it.
 */
export const probe: PerfProbeApi = __PERF__ ? new PerfProbe() : new NoopProbe();
