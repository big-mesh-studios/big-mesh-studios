import { pointer } from "@big-mesh-studios/utils/pointer";
import { JSX } from "@solidjs/web/jsx-runtime";
import { clamp, isEditableTarget } from "../utils";

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

/**
 * Unified keyboard, pointer and touch input for the player. Each controller
 * owns its own snapshot, fed by the key listeners `install` binds to the
 * window, by the handlers `canvasHandlers` puts on the world canvas, and by
 * the touch UI (`CoarseControls.tsx`), then drained once per frame by
 * `consume`.
 */
export interface InputSnapshot {
  /** Strafe input, from -1 (left) to 1 (right). */
  moveX: number;
  /** Forward/back input, from -1 (backward) to 1 (forward). */
  moveY: number;
  /** Edge-triggered: true only on the frame the jump was pressed. */
  jump: boolean;
  /**
   * True while the jump input is held down; swims up underwater, and climbs
   * a wall the player is walking into.
   */
  jumpHeld: boolean;
  /** Horizontal pointer-move delta accumulated since the last frame (drag-to-look). */
  lookDx: number;
  /** Vertical pointer-move delta accumulated since the last frame (drag-to-look). */
  lookDy: number;
  /** Edge-triggered: true only on the frame the break (dig) action fired. */
  break: boolean;
  /** Edge-triggered: true only on the frame the place action fired. */
  place: boolean;
  /** True while the place button is held down, for the sword's wind-up. */
  placeHeld: boolean;
  /** Edge-triggered: true only on the frame the place button went up. */
  placeReleased: boolean;
  /** Edge-triggered: the selected hotbar slot changed this frame, or null. */
  select: number | null;
  /** Edge-triggered: the mouse wheel's direction this frame, or 0. */
  wheel: -1 | 0 | 1;
}

interface InputState {
  keyMoveX: number;
  keyMoveY: number;
  touchMoveX: number;
  touchMoveY: number;
  jumpQueued: boolean;
  jumpHeld: boolean;
  lookDx: number;
  lookDy: number;
  breakQueued: boolean;
  placeQueued: boolean;
  placeHeld: boolean;
  placeReleasedQueued: boolean;
  selectQueued: number | null;
  wheelQueued: -1 | 0 | 1;
}

export interface InputController {
  /**
   * Binds the key listeners, and the suppression of the browser's menu, to
   * `window` again after a `dispose`. A freshly created controller is already
   * listening, so this is only needed to revive a disposed one. Calling it
   * while the listeners are bound is a no-op, so a controller can't end up
   * handling every key press twice.
   */
  install(): void;
  /** Removes every listener `install` bound. The controller can be installed again after. */
  dispose(): void;
  /** Called once per frame: returns the latest input and clears per-frame state. */
  consume(): InputSnapshot;
  /** Edge-triggered break (dig) request, normally from the left mouse button. */
  queueBreak(): void;
  /** Edge-triggered place request, normally from the right mouse button. */
  queuePlace(): void;
  /** Selects a hotbar slot by index (0-based) on the next frame. */
  queueSelect(slot: number): void;
  /** Edge-triggered jump request from the touch button. */
  queueJump(): void;
  /** Set the combined touch d-pad direction (call with 0,0 when released). */
  setTouchMove(x: number, y: number): void;
  /** Touch button held state (drives swimming up and wall climbing). */
  setTouchJump(held: boolean): void;
  /** Touch place button held state; releasing fires the swing release. */
  setTouchPlace(held: boolean): void;
  /** Accumulate drag-to-look deltas (client pixels). */
  addLookDelta(dx: number, dy: number): void;
  canvasHandlers: {
    /**
     * Everything a press on the world canvas can mean, for the canvas this is
     * bound to. A mouse press takes the pointer lock the first time and, once
     * locked, digs on the left button and places on the right; looking around is
     * the locked pointer's job from then on. A touch or pen press digs or places
     * straight away and then turns the view for as long as it is dragged, which
     * is why the returned promise settles when that drag ends — awaiting it waits
     * for the finger to lift.
     *
     * Only the first drag is followed: a second finger touching down while one is
     * already turning the view starts nothing, so the view turns at the speed of
     * one finger however many are down. Digging and placing are edge-triggered
     * per press, so holding a button doesn't dig repeatedly; the right button's
     * hold is still tracked, so a held place can wind up a swing.
     *
     * The drag delta is the difference between successive `clientX`/`clientY`
     * rather than the `movementX`/`movementY` the locked path reads. Those
     * movement values are reported in physical, logical or CSS pixels depending
     * on the browser and the operating system, which would make look sensitivity
     * differ from machine to machine, and Safari on iOS only began reporting
     * them at version 17.
     */
    onPointerDown: JSX.EventHandler<HTMLCanvasElement, PointerEvent>;
    /**
     * Turns the view by the mouse's movement while the canvas this is bound to
     * holds the pointer lock, and does nothing otherwise — matching the
     * click-to-play convention of desktop first-person games, where moving an
     * unlocked cursor over the world doesn't steer it.
     *
     * The one mouse event in a module that otherwise handles pointer events,
     * because the Pointer Lock specification routes locked motion through
     * `mousemove` specifically: it holds `clientX`/`clientY` at the position the
     * lock started from and requires all motion data to arrive as `mousemove`.
     * `pointermove` does carry `movementX`/`movementY` in current browsers, but
     * no specification says it keeps doing so under lock.
     */
    onMouseMove: JSX.EventHandler<HTMLCanvasElement, MouseEvent>;
    /**
     * Ends a right-button hold: the button going up is what swings the sword,
     * and the edge is queued only when a hold actually started, so a click that
     * merely took the pointer lock swings nothing.
     */
    onPointerUp: JSX.EventHandler<HTMLCanvasElement, PointerEvent>;
  };
}

/**
 * Owns the keyboard and pointer listeners and the per-frame input snapshot
 * they accumulate into. Each call keeps its own listeners and its own movement
 * state, so a second world on the page neither shares this one's keys nor
 * leaves listeners behind when it is disposed.
 */
export const createInput = (): InputController => {
  const state: InputState = {
    keyMoveX: 0,
    keyMoveY: 0,
    touchMoveX: 0,
    touchMoveY: 0,
    jumpQueued: false,
    jumpHeld: false,
    lookDx: 0,
    lookDy: 0,
    breakQueued: false,
    placeQueued: false,
    placeHeld: false,
    placeReleasedQueued: false,
    selectQueued: null,
    wheelQueued: 0,
  };
  let controller: AbortController | null = null;

  const addLookDelta = (dx: number, dy: number): void => {
    state.lookDx += dx;
    state.lookDy += dy;
  };

  let dragging = false;
  const canvasHandlers = {
    onPointerDown: async (
      event: PointerEvent & { currentTarget: HTMLCanvasElement },
    ) => {
      // Pointer lock is a mouse-only concept — iOS Safari doesn't implement
      // it at all, and it isn't how touch input works anyway. A touch (or
      // pen) tap fires the action right away; only a mouse press is gated
      // behind acquiring the lock first.
      if (
        event.pointerType === "mouse" &&
        document.pointerLockElement !== event.currentTarget
      ) {
        await event.currentTarget.requestPointerLock();
        return;
      }

      if (event.button === 0) {
        state.breakQueued = true;
      } else if (event.button === 2) {
        state.placeQueued = true;
        state.placeHeld = true;
      }

      if (dragging || event.pointerType === "mouse") {
        return;
      }
      dragging = true;
      await pointer(event, ({ delta }) => addLookDelta(delta.x, delta.y));
      dragging = false;
    },
    onMouseMove: (event: MouseEvent & { currentTarget: HTMLCanvasElement }) => {
      if (document.pointerLockElement !== event.currentTarget) {
        return;
      }
      addLookDelta(event.movementX, event.movementY);
    },
    onPointerUp: (
      event: PointerEvent & { currentTarget: HTMLCanvasElement },
    ) => {
      if (
        event.pointerType === "mouse" &&
        event.button === 2 &&
        state.placeHeld
      ) {
        state.placeHeld = false;
        state.placeReleasedQueued = true;
      }
    },
  };

  const install = () => {
    if (controller) {
      return;
    }

    controller = new AbortController();
    const { signal } = controller;

    window.addEventListener(
      "keydown",
      (e) => {
        if (isEditableTarget(e)) {
          return;
        }
        if (e.code === "Space") {
          e.preventDefault();
          state.jumpQueued = true;
          state.jumpHeld = true;
          return;
        }
        if (e.code.startsWith("Digit")) {
          const slot = Number(e.code.slice(5));
          if (slot >= 1 && slot <= 9) {
            state.selectQueued = slot - 1;
          }
          return;
        }
        const move = MOVE_KEYS[e.code];
        if (move === undefined || e.repeat) {
          return;
        }
        e.preventDefault();
        state.keyMoveX += move[0];
        state.keyMoveY += move[1];
      },
      { signal },
    );

    window.addEventListener(
      "keyup",
      (e) => {
        if (isEditableTarget(e)) {
          return;
        }
        if (e.code === "Space") {
          state.jumpHeld = false;
          return;
        }
        const move = MOVE_KEYS[e.code];
        if (move === undefined) {
          return;
        }
        e.preventDefault();
        state.keyMoveX -= move[0];
        state.keyMoveY -= move[1];
      },
      { signal },
    );

    window.addEventListener(
      "wheel",
      (e) => {
        if (isEditableTarget(e)) {
          return;
        }
        e.preventDefault();
        if (e.deltaY < 0) {
          state.wheelQueued = -1;
        } else if (e.deltaY > 0) {
          state.wheelQueued = 1;
        }
      },
      { signal },
    );

    // The right mouse button places a block, so the browser's menu is
    // suppressed across the whole page rather than over the canvas alone: a
    // press that lands a few pixels off the world would otherwise open it.
    window.addEventListener("contextmenu", (e) => e.preventDefault(), {
      signal,
    });
  };
  install();

  return {
    install,
    addLookDelta,
    canvasHandlers,

    dispose() {
      controller?.abort();
      controller = null;
    },

    consume() {
      const snap: InputSnapshot = {
        moveX: clamp(state.keyMoveX + state.touchMoveX, -1, 1),
        moveY: clamp(state.keyMoveY + state.touchMoveY, -1, 1),
        jump: state.jumpQueued,
        jumpHeld: state.jumpHeld,
        lookDx: state.lookDx,
        lookDy: state.lookDy,
        break: state.breakQueued,
        place: state.placeQueued,
        placeHeld: state.placeHeld,
        placeReleased: state.placeReleasedQueued,
        select: state.selectQueued,
        wheel: state.wheelQueued,
      };
      state.jumpQueued = false;
      state.lookDx = 0;
      state.lookDy = 0;
      state.breakQueued = false;
      state.placeQueued = false;
      state.placeReleasedQueued = false;
      state.selectQueued = null;
      state.wheelQueued = 0;
      return snap;
    },

    queueBreak() {
      state.breakQueued = true;
    },

    queuePlace() {
      state.placeQueued = true;
    },

    queueSelect(slot) {
      state.selectQueued = slot;
    },

    queueJump() {
      state.jumpQueued = true;
    },

    setTouchMove(x, y) {
      state.touchMoveX = x;
      state.touchMoveY = y;
    },

    setTouchJump(held) {
      state.jumpHeld = held;
    },

    setTouchPlace(held) {
      if (held) {
        state.placeQueued = true;
        state.placeHeld = true;
      } else if (state.placeHeld) {
        state.placeHeld = false;
        state.placeReleasedQueued = true;
      }
    },
  };
};
