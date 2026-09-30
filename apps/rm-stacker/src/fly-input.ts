// The keyboard, the pointer and the touch controls a camera in flight is flown
// with, gathered into one value per frame.
//
// Everything here is accumulated as it arrives and drained once a frame rather
// than read on the spot by whatever needs it: a look is how far the pointer has
// moved since the last frame and not a place, and a button is an edge that only
// the frame it happened on can know about.
import { pointer } from "@big-mesh-studios/utils/pointer";
import type { FlyInput } from "./fly-camera";

/** Maps a `KeyboardEvent` code to its [strafe, forward] contribution. */
const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, 1],
  KeyS: [0, -1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

/** How often a held place button asks for another voxel, in milliseconds. */
const HOLD_REPEAT_MS = 500;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Which of taking a change back and putting it back again a key asks for, or
 * undefined where it asks for neither.
 *
 * Both are the same key with a modifier held, and redo is that key with shift as
 * well — which is also the only way to ask for it on a keyboard that has no
 * other, so the one letter after the modifier alone is read too.
 */
const undoKeyOf = (event: KeyboardEvent): "undo" | "redo" | undefined => {
  if (!event.metaKey && !event.ctrlKey) {
    return undefined;
  }

  if (event.code === "KeyZ") {
    return event.shiftKey ? "redo" : "undo";
  }

  return event.code === "KeyY" && event.ctrlKey ? "redo" : undefined;
};

/**
 * Whether the event landed on something the user is typing into — the frame
 * field, or the handle box of the sign-in dialogue — so a key press there is
 * left to it rather than also flying the camera and turning the frame count.
 */
const isEditableTarget = (event: Event): boolean => {
  const element = event.target as HTMLElement | null;

  if (element === null) {
    return false;
  }

  const tag = element.tagName;

  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
};

/**
 * One frame's worth of input, drained from the controller by `consume`. The
 * first four fields are the four a camera in flight is moved and turned by.
 */
export interface FlySnapshot extends FlyInput {
  /** Edge-triggered: true only on the frame a voxel was asked to be placed. */
  place: boolean;
  /** True while the place button is held down, which is what repeats it. */
  placeHeld: boolean;
  /** Edge-triggered: true only on the frame a voxel was asked to be taken away. */
  remove: boolean;
  /** True while the remove button is held down. */
  removeHeld: boolean;
  /** Edge-triggered: true only on the frame a change was asked to be taken back. */
  undo: boolean;
  /** Edge-triggered: true only on the frame a change was asked to be put back. */
  redo: boolean;
}

interface FlyState {
  keyMoveX: number;
  keyMoveY: number;
  touchMoveX: number;
  touchMoveY: number;
  lookDx: number;
  lookDy: number;
  placeQueued: boolean;
  placeHeld: boolean;
  removeQueued: boolean;
  removeHeld: boolean;
  placeRepeat: number | undefined;
  undoQueued: boolean;
  redoQueued: boolean;
  /**
   * Which sources hold each button, so that releasing one never clears a hold
   * another still has. A button held by the mouse and the same button held on
   * the touch controls are one hold, and either can be the one that lets go
   * second. Only the touch controls hold the place button: a mouse places on the
   * press alone, so holding the mouse button does not repeat.
   */
  place: boolean;
  remove: boolean;
}

/**
 * A controller for one camera in flight.
 */
export interface FlyInputController {
  /**
   * Binds the key listeners and the suppression of the browser's menu to
   * `window` again after a `dispose`. A freshly created controller is already
   * listening, so this is only needed to revive a disposed one. Calling it while
   * the listeners are bound does nothing, so no key press is handled twice.
   */
  install(): void;
  /** Removes every listener `install` bound. The controller can be installed again after. */
  dispose(): void;
  /**
   * Whether the key and pointer handlers act. A controller is disabled while the
   * turntable has the figure, so that flying is the only thing the keyboard and
   * the canvas's presses mean.
   */
  setEnabled(enabled: boolean): void;
  /**
   * Reads the frame's input and clears what belonged to it. The movement axes
   * and the held states are level rather than per-frame, so a held key or button
   * goes on holding; the edges and the look deltas are not, so each is reported
   * once.
   */
  consume(): FlySnapshot;
  /** The touch stick's direction, from -1 to 1 on each axis. */
  setTouchMove(x: number, y: number): void;
  /** The place button's held state, which places once and then repeats. */
  setTouchPlace(held: boolean): void;
  /** The remove button's held state. */
  setTouchRemove(held: boolean): void;
  /**
   * Edge-triggered requests to take a change back and to put it back again, from
   * the keyboard's undo keys.
   *
   * A camera in flight holds the pointer, so no button on the page can be
   * pressed while it is up — which leaves the history reachable only from the
   * keys, and the keys are the one thing a camera in flight has to spare.
   */
  queueUndo(): void;
  queueRedo(): void;
  /** Accumulates a look turn, in pixels. */
  addLookDelta(dx: number, dy: number): void;
  /** Whether the canvas holds the pointer lock. */
  pointerLocked(): boolean;
  /** Subscribes to the pointer lock changing; returns a function that removes the listener. */
  onPointerLockChange(listener: (locked: boolean) => void): () => void;
  canvasHandlers: {
    /**
     * Everything a press on the camera's canvas can mean. A mouse press takes
     * the pointer lock the first time and, once locked, places a voxel on the
     * left button and takes one away on the right; the locked pointer does the
     * looking from then on, so a mouse press acts at once and is never a drag.
     * A touch or pen press only turns the view, however long it lasts, so a
     * thumb that rests before dragging never places a voxel — the touch controls
     * own placing and taking away.
     *
     * Only the first press is followed: a second finger touching down while one
     * is already turning the view starts nothing, so the view turns at the
     * speed of one finger however many are down. Both mouse buttons act once per
     * press, so holding one does not repeat.
     *
     * The drag delta is the difference between successive `clientX`/`clientY`
     * rather than the `movementX`/`movementY` the locked path reads. Those
     * movement values are reported in physical, logical or CSS pixels depending
     * on the browser and the operating system, which would make look
     * sensitivity differ from machine to machine, and Safari on iOS only began
     * reporting them at version 17.
     */
    onPointerDown(
      event: PointerEvent & { currentTarget: HTMLCanvasElement },
    ): Promise<void>;
    /**
     * Turns the view by the mouse's movement while the canvas holds the pointer
     * lock, and does nothing otherwise — which is the click-to-look convention
     * of desktop first-person games, where moving a free cursor over the figure
     * does not steer it.
     *
     * The one mouse event in a module that otherwise handles pointer events,
     * because the Pointer Lock specification routes locked motion through
     * `mousemove` specifically: it holds `clientX`/`clientY` at the position the
     * lock started from and requires all motion data to arrive as `mousemove`.
     * `pointermove` does carry `movementX`/`movementY` in current browsers, but
     * no specification says it keeps doing so under lock.
     */
    onMouseMove(event: MouseEvent & { currentTarget: HTMLCanvasElement }): void;
    /** Ends a right-button hold, so the hold is reported only where one began. */
    onPointerUp(
      event: PointerEvent & { currentTarget: HTMLCanvasElement },
    ): void;
  };
}

/**
 * Owns the keyboard and pointer listeners a camera in flight listens through,
 * and the movement and edges they accumulate into.
 */
export const createFlyInput = (): FlyInputController => {
  const state: FlyState = {
    keyMoveX: 0,
    keyMoveY: 0,
    touchMoveX: 0,
    touchMoveY: 0,
    lookDx: 0,
    lookDy: 0,
    placeQueued: false,
    placeHeld: false,
    removeQueued: false,
    removeHeld: false,
    placeRepeat: undefined,
    undoQueued: false,
    redoQueued: false,
    place: false,
    remove: false,
  };
  const pointerLockListeners = new Set<(locked: boolean) => void>();
  let abort: AbortController | undefined;
  /** False while the turntable has the figure. */
  let enabled = false;
  let canvas: HTMLCanvasElement | undefined;
  let pointerLocked = false;
  let dragging = false;

  const syncPlace = (): void => {
    const next = state.place;

    if (next && !state.placeHeld) {
      state.placeQueued = true;
    }

    state.placeHeld = next;

    if (!next) {
      if (state.placeRepeat !== undefined) {
        window.clearInterval(state.placeRepeat);
        state.placeRepeat = undefined;
      }
      return;
    }

    // The place button asks for another voxel on a cadence for as long as it is
    // held, so a row of them goes down in one press.
    if (state.placeRepeat === undefined) {
      state.placeRepeat = window.setInterval(() => {
        state.placeQueued = true;
      }, HOLD_REPEAT_MS);
    }
  };

  const syncRemove = (): void => {
    const next = state.remove;

    if (next && !state.removeHeld) {
      state.removeQueued = true;
    }

    state.removeHeld = next;
  };

  const syncPointerLock = (): void => {
    const next = canvas !== undefined && document.pointerLockElement === canvas;

    if (next === pointerLocked) {
      return;
    }

    pointerLocked = next;

    for (const listener of pointerLockListeners) {
      listener(pointerLocked);
    }
  };

  const addLookDelta = (dx: number, dy: number): void => {
    state.lookDx += dx;
    state.lookDy += dy;
  };

  const canvasHandlers = {
    onPointerDown: async (
      event: PointerEvent & { currentTarget: HTMLCanvasElement },
    ) => {
      if (!enabled) {
        return;
      }

      canvas = event.currentTarget;

      // The lock is a mouse-only concept — iOS Safari does not implement it at
      // all, and it is not how touch input works anyway. Only a mouse press is
      // held back until the lock is held, and that press places nothing: the
      // pointer has just been taken, and the user has not seen where it went.
      if (
        event.pointerType === "mouse" &&
        document.pointerLockElement !== event.currentTarget
      ) {
        await event.currentTarget.requestPointerLock();
        return;
      }

      if (event.pointerType === "mouse") {
        if (event.button === 0) {
          state.placeQueued = true;
        } else if (event.button === 2) {
          state.remove = true;
          syncRemove();
        }
        return;
      }

      if (dragging) {
        return;
      }

      dragging = true;
      await pointer(event, ({ delta }) => {
        addLookDelta(delta.x, delta.y);
      });
      dragging = false;
    },

    onMouseMove: (event: MouseEvent & { currentTarget: HTMLCanvasElement }) => {
      if (!enabled || document.pointerLockElement !== event.currentTarget) {
        return;
      }

      addLookDelta(event.movementX, event.movementY);
    },

    onPointerUp: (
      event: PointerEvent & { currentTarget: HTMLCanvasElement },
    ) => {
      if (!enabled) {
        return;
      }

      if (event.pointerType === "mouse" && event.button === 2) {
        state.remove = false;
        syncRemove();
      }
    },
  };

  const install = (): void => {
    if (abort) {
      return;
    }

    abort = new AbortController();
    const { signal } = abort;

    window.addEventListener(
      "keydown",
      (event) => {
        if (!enabled || isEditableTarget(event)) {
          return;
        }

        if (!event.repeat && undoKeyOf(event) !== undefined) {
          event.preventDefault();
          undoKeyOf(event) === "redo"
            ? (state.redoQueued = true)
            : (state.undoQueued = true);
          return;
        }

        const move = MOVE_KEYS[event.code];

        if (move === undefined || event.repeat) {
          return;
        }

        event.preventDefault();
        state.keyMoveX += move[0];
        state.keyMoveY += move[1];
      },
      { signal },
    );

    window.addEventListener(
      "keyup",
      (event) => {
        if (!enabled || isEditableTarget(event)) {
          return;
        }

        const move = MOVE_KEYS[event.code];

        if (move === undefined) {
          return;
        }

        event.preventDefault();
        state.keyMoveX -= move[0];
        state.keyMoveY -= move[1];
      },
      { signal },
    );

    document.addEventListener("pointerlockchange", syncPointerLock, { signal });
    syncPointerLock();

    // Taking a voxel away is the right mouse button, so the browser's menu is
    // held back across the whole page rather than over the canvas alone: a
    // press landing a few pixels beside the figure would otherwise open it. The
    // panels are drawn with the left button, so a right-click on one of them is
    // left to mean what a right-click means everywhere else.
    window.addEventListener(
      "contextmenu",
      (event) => {
        if (enabled) {
          event.preventDefault();
        }
      },
      { signal },
    );
  };

  install();

  return {
    install,
    canvasHandlers,

    setEnabled(value) {
      enabled = value;

      if (value) {
        return;
      }

      // A key that was held as the turntable took the figure over is still held
      // on the way back, because its release was never heard, and the camera
      // would set off the moment it returned.
      state.keyMoveX = 0;
      state.keyMoveY = 0;
      state.touchMoveX = 0;
      state.touchMoveY = 0;
      state.place = false;
      state.remove = false;
      state.lookDx = 0;
      state.lookDy = 0;
      state.placeQueued = false;
      state.removeQueued = false;
      state.undoQueued = false;
      state.redoQueued = false;
      syncPlace();
      syncRemove();
    },

    dispose() {
      abort?.abort();
      abort = undefined;
      pointerLocked = false;
      canvas = undefined;

      if (state.placeRepeat !== undefined) {
        window.clearInterval(state.placeRepeat);
        state.placeRepeat = undefined;
      }
    },

    consume() {
      const snapshot: FlySnapshot = {
        moveX: clamp(state.keyMoveX + state.touchMoveX, -1, 1),
        moveY: clamp(state.keyMoveY + state.touchMoveY, -1, 1),
        lookDx: state.lookDx,
        lookDy: state.lookDy,
        place: state.placeQueued,
        placeHeld: state.placeHeld,
        remove: state.removeQueued,
        removeHeld: state.removeHeld,
        undo: state.undoQueued,
        redo: state.redoQueued,
      };

      state.lookDx = 0;
      state.lookDy = 0;
      state.placeQueued = false;
      state.removeQueued = false;
      state.undoQueued = false;
      state.redoQueued = false;

      return snapshot;
    },

    setTouchMove(x, y) {
      state.touchMoveX = x;
      state.touchMoveY = y;
    },

    setTouchPlace(held) {
      state.place = held;
      syncPlace();
    },

    setTouchRemove(held) {
      state.remove = held;
      syncRemove();
    },

    addLookDelta,

    queueUndo() {
      state.undoQueued = true;
    },

    queueRedo() {
      state.redoQueued = true;
    },

    pointerLocked() {
      return pointerLocked;
    },

    onPointerLockChange(listener) {
      pointerLockListeners.add(listener);
      return () => {
        pointerLockListeners.delete(listener);
      };
    },
  };
};
