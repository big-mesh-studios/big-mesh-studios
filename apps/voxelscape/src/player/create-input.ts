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

/** How far a press may drift and still be a tap, as a fraction of the canvas width. */
const TAP_SLOP_FRACTION = 0.02;
/** The floor a tap slop never falls below, in client pixels. */
const MIN_TAP_SLOP = 6;
/** How long a press must stay still before its held strike fires, in ms. */
const HOLD_GRACE_MS = 120;
/** How often a held strike repeats while the press stays still, in ms. */
const HOLD_REPEAT_MS = 500;

/**
 * One frame's worth of player input, gathered by the key listeners `install`
 * binds to the window, by the handlers `canvasHandlers` puts on the world
 * canvas, and by the touch UI (`CoarseControls.tsx`), then drained once per
 * frame by `consume`. A non-mouse canvas press is watched until it resolves
 * into one of three gestures before it queues anything: a drag (movement past
 * the tap slop) turns the view and fires nothing, a hold (still past the
 * grace) queues `primary` and keeps re-queuing it on a cadence while the
 * finger stays put, and a quick lift is a `tap` the world acts on only when
 * the crosshair is over a monster.
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
  /**
   * Edge-triggered: true only on the frame a strike fired — a mouse press, or
   * a touch/pen hold that has stayed still past the hold grace.
   */
  primary: boolean;
  /**
   * Edge-triggered: true only on the frame the mouse's primary button was
   * pressed — the click that strikes, and the one that talks to an NPC. A
   * touch's hold repeats `primary` but never sets this, so a hold that mines
   * a block can never start a talk.
   */
  click: boolean;
  /**
   * Edge-triggered: true only on the frame a touch or pen press lifted as a
   * tap — down and up within the hold grace, never a drag. A tap can strike
   * only what a quick touch can: a monster under the crosshair. Over a voxel
   * or empty air it fires nothing, which is what a hold is for.
   */
  tap: boolean;
  /** Edge-triggered: true only on the frame the secondary (use) button fired. */
  secondary: boolean;
  /** True while the secondary button is held down, which is what raises a guard. */
  secondaryHeld: boolean;
  /** Edge-triggered: true only on the frame the secondary button went up. */
  secondaryReleased: boolean;
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
  primaryQueued: boolean;
  clickQueued: boolean;
  tapQueued: boolean;
  secondaryQueued: boolean;
  secondaryHeld: boolean;
  secondaryReleasedQueued: boolean;
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
  /** Edge-triggered primary (strike) request, from the left mouse button or a touch hold. */
  queuePrimary(): void;
  /** Edge-triggered secondary (use) request, normally from the right mouse button. */
  queueSecondary(): void;
  /** Selects a hotbar slot by index (0-based) on the next frame. */
  queueSelect(slot: number): void;
  /** Edge-triggered jump request from the touch button. */
  queueJump(): void;
  /** Set the combined touch d-pad direction (call with 0,0 when released). */
  setTouchMove(x: number, y: number): void;
  /** Touch button held state (drives swimming up and wall climbing). */
  setTouchJump(held: boolean): void;
  /** Touch secondary button held state, which is what a held guard reads. */
  setTouchSecondary(held: boolean): void;
  /** Accumulate drag-to-look deltas (client pixels). */
  addLookDelta(dx: number, dy: number): void;
  canvasHandlers: {
    /**
     * Everything a press on the world canvas can mean, for the canvas this is
     * bound to. A mouse press takes the pointer lock the first time and, once
     * locked, strikes on the left button and uses the held item on the right;
     * looking around is the locked pointer's job from then on, so a mouse
     * press fires straight away. A touch or pen press fires nothing yet: it is
     * watched until it resolves into one of three gestures. Movement past the
     * tap slop at any point makes it a look-drag that turns the view and never
     * strikes. Staying still past the hold grace makes it a hold, which
     * strikes once and again on the repeat cadence while the finger stays put
     * — how a block is broken or a monster is fought by touch. Lifting within
     * the grace makes it a tap, which the world acts on only when the
     * crosshair is over a monster. This is why the returned promise settles
     * when the press ends — awaiting it waits for the finger to lift.
     *
     * Only the first press is followed: a second finger touching down while
     * one is already turning the view starts nothing, so the view turns at the
     * speed of one finger however many are down. Both mouse actions are
     * edge-triggered per press, so holding a mouse button doesn't repeat; the
     * right button's hold is still tracked, so a held secondary can raise a
     * guard.
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
     * Ends a right-button hold, queuing the release edge only when a hold
     * actually started, so a click that merely took the pointer lock releases
     * nothing.
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
    primaryQueued: false,
    clickQueued: false,
    tapQueued: false,
    secondaryQueued: false,
    secondaryHeld: false,
    secondaryReleasedQueued: false,
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
      // it at all, and it isn't how touch input works anyway. Only a mouse
      // press is gated behind acquiring the lock first.
      if (
        event.pointerType === "mouse" &&
        document.pointerLockElement !== event.currentTarget
      ) {
        await event.currentTarget.requestPointerLock();
        return;
      }

      // A locked mouse press is unambiguous: it strikes or uses, and the
      // locked pointer does the looking. A mouse is never a drag to look at.
      if (event.pointerType === "mouse") {
        if (event.button === 0) {
          state.primaryQueued = true;
          state.clickQueued = true;
        } else if (event.button === 2) {
          state.secondaryQueued = true;
          state.secondaryHeld = true;
        }
        return;
      }

      if (dragging) {
        return;
      }
      dragging = true;
      const slop = Math.max(
        MIN_TAP_SLOP,
        event.currentTarget.clientWidth * TAP_SLOP_FRACTION,
      );
      // How the press resolves: exceeding the slop at any point makes it a
      // look-drag; staying still past the grace makes it a hold; lifting
      // before the grace makes it a tap.
      let becameDrag = false;
      let holdFired = false;
      let grace: number | undefined;
      let repeat: number | undefined;
      const stopWatch = (): void => {
        if (grace !== undefined) {
          window.clearTimeout(grace);
          grace = undefined;
        }
        if (repeat !== undefined) {
          window.clearInterval(repeat);
          repeat = undefined;
        }
      };
      const fireHold = (): void => {
        holdFired = true;
        if (event.button === 0) {
          state.primaryQueued = true;
        }
      };
      // The strike first lands once the press has stayed still past the
      // grace, then again on the repeat cadence for as long as it still has
      // not moved — holding on a block breaks it, holding on a monster keeps
      // swinging at it.
      grace = window.setTimeout(() => {
        fireHold();
        repeat = window.setInterval(() => {
          if (!becameDrag) {
            fireHold();
          }
        }, HOLD_REPEAT_MS);
      }, HOLD_GRACE_MS);

      const drag = await pointer(event, ({ delta, totalDelta }) => {
        addLookDelta(delta.x, delta.y);
        if (!becameDrag && Math.hypot(totalDelta.x, totalDelta.y) > slop) {
          becameDrag = true;
          stopWatch();
        }
      });
      dragging = false;
      stopWatch();
      if (becameDrag) {
        return;
      }
      if (drag.event.type === "pointercancel") {
        return;
      }
      if (holdFired) {
        return;
      }
      if (event.button === 0) {
        state.tapQueued = true;
      }
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
        state.secondaryHeld
      ) {
        state.secondaryHeld = false;
        state.secondaryReleasedQueued = true;
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

    // The right mouse button uses the held item, so the browser's menu is
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
        primary: state.primaryQueued,
        click: state.clickQueued,
        tap: state.tapQueued,
        secondary: state.secondaryQueued,
        secondaryHeld: state.secondaryHeld,
        secondaryReleased: state.secondaryReleasedQueued,
        select: state.selectQueued,
        wheel: state.wheelQueued,
      };
      state.jumpQueued = false;
      state.lookDx = 0;
      state.lookDy = 0;
      state.primaryQueued = false;
      state.clickQueued = false;
      state.tapQueued = false;
      state.secondaryQueued = false;
      state.secondaryReleasedQueued = false;
      state.selectQueued = null;
      state.wheelQueued = 0;
      return snap;
    },

    queuePrimary() {
      state.primaryQueued = true;
    },

    queueSecondary() {
      state.secondaryQueued = true;
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

    setTouchSecondary(held) {
      if (held) {
        state.secondaryQueued = true;
        state.secondaryHeld = true;
      } else if (state.secondaryHeld) {
        state.secondaryHeld = false;
        state.secondaryReleasedQueued = true;
      }
    },
  };
};
