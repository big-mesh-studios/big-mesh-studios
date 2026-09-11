// A recording of a walk, for handing to somebody who was not there.
//
// A bug that only shows up in certain places is expensive to describe and
// cheap to walk into again, so this records the walking: what the world was
// set to, every frame the probe timed along the way, and a mark at each moment
// somebody said "there". A mark carries the picture on screen and, better than
// anything measured, a sentence about what was wrong with it.
//
// The frames come from the performance probe, which already rings the last few
// thousand of them. That probe is left out of the build players get, where it
// answers as a probe that records nothing: a trace made there still carries its
// setup, its marks and their pictures, and simply holds no frames. Nothing here
// records anything until a trace is started.
import type { PerfDrain, PerfProbeApi } from "../render/perf-probe";

/**
 * How many frames a trace's ring holds. At sixty a second this is about four
 * and a half minutes of walking, held in five megabytes — deeper than the
 * probe's own default, because a trace is started on purpose and meant to
 * cover the whole of what somebody set out to do.
 */
const TRACE_FRAMES = 16384;

/**
 * How long a picture waits for a frame to be drawn before it is given up on.
 * A world that is unmounted, or in a tab nobody is looking at, draws nothing.
 */
const PICTURE_WAIT_MS = 1000;

/** Where the player stood and which way they faced. */
export interface WalkTracePose {
  position: [number, number, number];
  /** The direction the camera looked, as a unit vector. */
  facing: [number, number, number];
}

/** One moment somebody marked, and what they said about it. */
export interface WalkTraceMark {
  /** Seconds since the trace started. */
  at: number;
  /**
   * What was wrong, in the words of whoever saw it. The one thing in a trace
   * that no instrument records, and the first thing worth reading.
   */
  note: string;
  pose: WalkTracePose;
  /** The drawing as it was, as a data URL, where one could be taken. */
  picture?: string;
}

/**
 * One moment the world itself noticed, logged without anybody having to see
 * it happen or say so — a mark nobody had to think to make. A death is worth
 * a picture; the damage on the way to it is not, since a hazard the player
 * stands in reports one every half second and a trace does not want a
 * picture that often.
 */
export interface WalkTraceEvent {
  /** Seconds since the trace started. */
  at: number;
  kind: "damage" | "death" | "respawn";
  /** What dealt it — "lava", "script", "remote-script", and so on. */
  cause?: string;
  /** Hit points actually taken, after any guard lessened it. */
  amount?: number;
  /** Hit points left afterward. */
  hp?: number;
  /**
   * Where the entity that dealt it was standing at that moment, when a
   * script named which one — the thing a trace otherwise cannot say at all:
   * not just that a hit landed, but whether whatever dealt it was actually
   * anywhere near what the pose below was looking at.
   */
  attacker?: { id: string; position: [number, number, number] };
  pose: WalkTracePose;
  picture?: string;
}

/** What a trace reads from the world it is recording. */
export interface WalkTraceSource {
  /**
   * What the world is set to: everything a reader would have to match to walk
   * into the same place, from the terrain seed to the size of the window.
   */
  setup(): Record<string, unknown>;
  pose(): WalkTracePose;
}

/** A finished recording, as it is written down. */
export interface WalkTraceFile {
  /** What the walk was for, in the words of whoever started it. */
  name: string;
  startedAt: string;
  seconds: number;
  setup: Record<string, unknown>;
  /**
   * The world as it stood when the walk began and when it ended. A walk nobody
   * marked still carries something to look at, which the first one made did
   * not: it was named after what was wrong and held no picture of it.
   */
  startPicture?: string;
  endPicture?: string;
  marks: WalkTraceMark[];
  /** Every moment the world itself logged, oldest first — see `WalkTraceEvent`. */
  events: WalkTraceEvent[];
  /** Every frame the probe timed, oldest first; see `PerfDrain`. */
  frames: PerfDrain;
}

/**
 * Records one walk at a time. Started and stopped by hand, because a recording
 * nobody asked for costs a ring of frames to hold and is rarely the walk
 * anybody wanted.
 */
export class WalkTraceRecorder {
  private startedAt: number | undefined;
  private startedOn = "";
  private name = "";
  private marks: WalkTraceMark[] = [];
  private events: WalkTraceEvent[] = [];
  private startPicture: string | undefined;
  private setup: Record<string, unknown> = {};
  /**
   * Pictures asked for and waiting on the next drawn frame, oldest first. A
   * queue rather than a flag because a walk can be stopped in the same breath
   * as it is marked, and both want the drawing.
   */
  private wanted: Array<(picture: string | undefined) => void> = [];

  /**
   * @param waitMs How long a picture waits on a frame being drawn before it is
   *   given up on. The default suits a world that is drawing; a caller with no
   *   frames coming at all — a test, or a world not mounted — is better served
   *   by a short one than by a wait nobody is going to satisfy.
   */
  constructor(
    private readonly probe: PerfProbeApi,
    private readonly source: WalkTraceSource,
    private readonly waitMs: number = PICTURE_WAIT_MS,
  ) {}

  /** Whether a walk is being recorded right now. */
  get recording(): boolean {
    return this.startedAt !== undefined;
  }

  /** How many moments have been marked so far. */
  get marked(): number {
    return this.marks.length;
  }

  /**
   * Begins recording, discarding anything a previous trace left. The world is
   * read once here rather than at the end, so a trace says what was set when
   * the walk began even if it was changed along the way.
   */
  start(name: string): Record<string, unknown> {
    this.name = name;
    this.startedAt = performance.now();
    this.startedOn = new Date().toISOString();
    this.marks = [];
    this.events = [];
    this.setup = jsonSafe(this.source.setup()) as Record<string, unknown>;
    this.probe.arm(TRACE_FRAMES);
    this.startPicture = undefined;
    void this.wantPicture().then((picture) => {
      this.startPicture = picture;
    });
    // Handed back so a caller can say what it is recording without reading the
    // world a second time and risking a different answer.
    return this.setup;
  }

  /**
   * Marks this moment: where the player stood, which way they faced, and what
   * they said was wrong. The picture is left for `takePicture` to fill in,
   * because a mark is made between frames and a drawing buffer holds nothing
   * readable then.
   */
  mark(note: string): void {
    if (this.startedAt === undefined) {
      return;
    }
    const mark: WalkTraceMark = {
      at: (performance.now() - this.startedAt) / 1000,
      note,
      pose: this.source.pose(),
    };
    this.marks.push(mark);
    void this.wantPicture().then((picture) => {
      mark.picture = picture;
    });
  }

  /**
   * Logs one moment the world noticed on its own — a hit landing, a death, a
   * respawn — so a trace explains a death even when nobody thought to mark
   * it. Only `kind: "death"` waits on a picture; the rest happen too often to
   * ask a drawing of every one.
   */
  event(
    kind: WalkTraceEvent["kind"],
    detail: {
      cause?: string;
      amount?: number;
      hp?: number;
      attacker?: { id: string; position: [number, number, number] };
    } = {},
  ): void {
    if (this.startedAt === undefined) {
      return;
    }
    const entry: WalkTraceEvent = {
      at: (performance.now() - this.startedAt) / 1000,
      kind,
      ...detail,
      pose: this.source.pose(),
    };
    this.events.push(entry);
    if (kind === "death") {
      void this.wantPicture().then((picture) => {
        entry.picture = picture;
      });
    }
  }

  /**
   * A picture of the next frame drawn, or nothing if none is drawn soon. The
   * world may be unmounted, or its tab hidden and its frames stopped, and a
   * trace that never finishes because it is waiting for a drawing is worse
   * than one that goes without.
   */
  private wantPicture(): Promise<string | undefined> {
    return new Promise((resolve) => {
      let settled = false;
      const give = (picture: string | undefined): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(picture);
      };
      this.wanted.push(give);
      setTimeout(() => {
        this.wanted = this.wanted.filter((waiting) => waiting !== give);
        give(undefined);
      }, this.waitMs);
    });
  }

  /**
   * Gives the newest mark the drawing, if it is still waiting for one. Called
   * straight after a frame is drawn, which is the only moment a WebGL canvas
   * reads back as anything but blank.
   */
  takePicture(canvas: HTMLCanvasElement): void {
    const waiting = this.wanted;
    if (waiting.length === 0) {
      return;
    }
    this.wanted = [];
    let picture: string | undefined;
    try {
      picture = canvas.toDataURL("image/png");
    } catch {
      // A canvas the page is not allowed to read back leaves whoever was
      // waiting without a picture rather than taking the frame down with it.
    }
    for (const give of waiting) {
      give(picture);
    }
  }

  /**
   * One moment, written down on its own: what the world is set to, where the
   * player stands, what they can see, and what they say is wrong with it.
   *
   * A walk is the right shape for a bug that takes finding. A bug already on
   * screen only needs pointing at, and starting a recording to stop it a second
   * later is a detour around saying so. Nothing is armed and no frames are
   * held, so this leaves a walk being recorded alongside it undisturbed.
   */
  async snap(note: string): Promise<WalkTraceFile> {
    const setup = jsonSafe(this.source.setup()) as Record<string, unknown>;
    const pose = this.source.pose();
    const picture = await this.wantPicture();
    return {
      name: note,
      startedAt: new Date().toISOString(),
      seconds: 0,
      setup,
      startPicture: picture,
      marks: [{ at: 0, note, pose, picture }],
      events: [],
      frames: this.probe.drain(),
    };
  }

  /**
   * Ends the recording and hands over what it holds, or nothing if none was
   * running. Waits for one more frame on the way out, so the walk is bookended
   * by a picture of where it finished as well as where it began.
   */
  async stop(): Promise<WalkTraceFile | undefined> {
    if (this.startedAt === undefined) {
      return undefined;
    }
    const endPicture = await this.wantPicture();
    const seconds = (performance.now() - this.startedAt) / 1000;
    const frames = this.probe.drain();
    this.probe.disarm();
    this.startedAt = undefined;
    return {
      name: this.name,
      startedAt: this.startedOn,
      seconds,
      setup: this.setup,
      startPicture: this.startPicture,
      endPicture,
      marks: this.marks,
      events: this.events,
      frames,
    };
  }
}

/**
 * A setting as JSON can carry it. `JSON.stringify` writes an infinity as
 * `null`, which is how a window with its levels of detail turned off — bands
 * that reach everywhere — came out of a trace indistinguishable from one whose
 * bands were never set. Written as its own name instead, so a reader can tell
 * "off" from "unsaid".
 */
const jsonSafe = (value: unknown): unknown => {
  if (typeof value === "number" && !Number.isFinite(value)) {
    return value > 0 ? "Infinity" : "-Infinity";
  }
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([name, held]) => [name, jsonSafe(held)]),
    );
  }
  return value;
};

/** One setting written out, however deeply the setup nested it. */
const settingText = (value: unknown): string => {
  if (value === undefined || value === null) {
    return "unset";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([name, held]) => `${name} ${settingText(held)}`)
      .join(", ");
  }
  return String(value);
};

/**
 * The setup as lines to read, one a setting. Walks whatever the snapshot holds
 * rather than naming the settings it expects, so a setting added to a trace is
 * a setting the trace also says out loud — nothing can be recorded quietly.
 */
export const describeSetup = (setup: Record<string, unknown>): string =>
  Object.entries(setup)
    .map(([name, held]) => `${name}: ${settingText(held)}`)
    .join("\n");
