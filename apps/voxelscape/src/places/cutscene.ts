// The camera shots a place script plays: an ordered list of moves over the
// shared clock, sampled by the world that owns the camera rather than stepped
// by the guest. A cutscene is voice-tier — it changes what one player sees —
// so nothing here is replicated, and the guest only declares the sequence.

/** One camera move: where the view goes, where it looks, and how long it takes. */
export interface CameraShot {
  /** Where the camera moves to, in world units. */
  at: [number, number, number];
  /** The world point the camera looks at; the previous look is kept when absent. */
  look?: [number, number, number];
  /** How long the move takes, in milliseconds; 0 or absent snaps. */
  durationMs?: number;
  /** How long the view holds on the shot after arriving, in milliseconds. */
  holdMs?: number;
  ease?: "linear" | "smooth";
}

/** A camera sequence a script has started, with the moment it began. */
export interface CutsceneState {
  /** The shared-clock moment the sequence began, in milliseconds. */
  startMs: number;
  shots: CameraShot[];
}

/** Where a camera is before a sequence begins: its eye and what it looks at. */
export interface CameraStart {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}

/** Where a camera is at a moment: its eye, what it looks at, and whether it is done. */
export interface CameraPose extends CameraStart {
  done: boolean;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

/** How long one shot takes, move and hold together, in milliseconds. */
const shotLength = (shot: CameraShot): number =>
  Math.max(0, shot.durationMs ?? 0) + Math.max(0, shot.holdMs ?? 0);

/** How long a whole sequence takes, in milliseconds. */
export const cutsceneDuration = (state: CutsceneState): number =>
  state.shots.reduce((total, shot) => total + shotLength(shot), 0);

const poseOf = (
  at: [number, number, number],
  look: [number, number, number],
): CameraStart => ({
  x: at[0],
  y: at[1],
  z: at[2],
  lookX: look[0],
  lookY: look[1],
  lookZ: look[2],
});

/**
 * Where a camera playing `state` is at `clockMs`, given the pose it started
 * from. The first shot moves out of `from`; each later shot moves out of where
 * the shot before it ended. A sequence whose time is up reports `done` with the
 * last shot's pose.
 */
export const cutscenePoseAt = (
  state: CutsceneState,
  clockMs: number,
  from: CameraStart,
): CameraPose => {
  const elapsed = Math.max(0, clockMs - state.startMs);
  let cursor = 0;
  let previous: CameraStart = from;
  for (const shot of state.shots) {
    const move = Math.max(0, shot.durationMs ?? 0);
    const hold = Math.max(0, shot.holdMs ?? 0);
    const look: [number, number, number] = shot.look ?? [
      previous.lookX,
      previous.lookY,
      previous.lookZ,
    ];
    if (elapsed < cursor + move) {
      const raw = move <= 0 ? 1 : (elapsed - cursor) / move;
      const t = shot.ease === "smooth" ? smooth(Math.min(1, raw)) : raw;
      return {
        x: lerp(previous.x, shot.at[0], t),
        y: lerp(previous.y, shot.at[1], t),
        z: lerp(previous.z, shot.at[2], t),
        lookX: lerp(previous.lookX, look[0], t),
        lookY: lerp(previous.lookY, look[1], t),
        lookZ: lerp(previous.lookZ, look[2], t),
        done: false,
      };
    }
    const arrived = poseOf(shot.at, look);
    if (elapsed < cursor + move + hold) {
      return { ...arrived, done: false };
    }
    cursor += move + hold;
    previous = arrived;
  }
  return { ...previous, done: true };
};
