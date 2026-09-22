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

/** How often the held dig button repeats its strike, in ms. */
const HOLD_REPEAT_MS = 500;
/**
 * How long a wheel event must stand alone, with no other wheel event closer
 * than this on either side, before it steps the selected tool. A `WheelEvent`
 * carries no reliable way to tell a mouse's own notch from a trackpad's
 * finger scroll — both report as plain pixel deltas — but a mouse's discrete
 * notches arrive as isolated events, while a trackpad's swipe fires a rapid
 * burst of them. Requiring isolation is what tells the two apart: a notch
 * steps the tool once, a swipe steps it not at all.
 */
const WHEEL_ISOLATION_MS = 60;

/**
 * One frame's worth of player input, gathered by the key listeners `install`
 * binds to the window, by the handlers `canvasHandlers` puts on the world
 * canvas, and by the touch UI (`CoarseControls.tsx`), then drained once per
 * frame by `consume`. A touch drag on the canvas turns the view and does
 * nothing else, so the buttons own every world action: a held dig button
 * re-queues `primary` on a cadence, place and guard read the secondary held
 * state, and jump and use are their own edges.
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
   * Edge-triggered: true only on the frame a strike fired — the mouse's left
   * button, or the touch dig button while held.
   */
  primary: boolean;
  /**
   * True while the touch dig button is held down. A touch-only signal, since
   * a mouse strike is an edge; a script driving something from held input
   * reads it as the touch accelerator.
   */
  primaryHeld: boolean;
  /**
   * Edge-triggered: true only on the frame the mouse's primary button was
   * pressed — the click that strikes, and the one that talks to an NPC. Touch
   * input never sets this: a touch talks through the use button instead.
   */
  click: boolean;
  /** Edge-triggered: true only on the frame the secondary (place or guard) button fired. */
  secondary: boolean;
  /** True while the secondary button is held down, which is what raises a guard. */
  secondaryHeld: boolean;
  /** Edge-triggered: true only on the frame the secondary button went up. */
  secondaryReleased: boolean;
  /**
   * Edge-triggered: true only on the frame the interact key (E) was pressed,
   * which uses whatever the crosshair is on or the held item.
   */
  use: boolean;
  /**
   * True while the interact input is held down — the E key or the touch use
   * button. A place script steps on its own timers rather than every frame, so
   * a one-frame `use` edge can pass between steps; a script reading the
   * interact action reads this instead.
   */
  useHeld: boolean;
  /** Edge-triggered: the selected hotbar slot changed this frame, or null. */
  select: number | null;
  /** Edge-triggered: the mouse wheel's direction this frame, or 0. */
  wheel: -1 | 0 | 1;
}

/** One listener for a place script's bound keys. */
type BoundKeyListener = (key: string, phase: "down" | "up") => void;

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
  primaryHeld: boolean;
  clickQueued: boolean;
  secondaryQueued: boolean;
  secondaryHeld: boolean;
  secondaryReleasedQueued: boolean;
  useQueued: boolean;
  useHeld: boolean;
  selectQueued: number | null;
  wheelQueued: -1 | 0 | 1;
  /** When the last wheel event landed, in `Date.now()` milliseconds. */
  wheelLastEventAt: number;
  /** The timer waiting to confirm the last wheel event was an isolated notch. */
  wheelPendingTimer: number | undefined;
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
  /**
   * Whether the canvas and key handlers act. Set false while the level editor
   * owns the canvas and the keyboard, so a right-drag orbits the editor camera
   * instead of turning the player.
   */
  setEnabled(enabled: boolean): void;
  /** Called once per frame: returns the latest input and clears per-frame state. */
  consume(): InputSnapshot;
  /** Edge-triggered primary (strike) request, from the left mouse button or a touch hold. */
  queuePrimary(): void;
  /** Edge-triggered secondary (use) request, normally from the right mouse button. */
  queueSecondary(): void;
  /** Edge-triggered interact request, from the E key or a UI that only needs the edge. */
  queueUse(): void;
  /** Touch use button held state: queues `use` on press and holds it for scripts. */
  setTouchUse(held: boolean): void;
  /** Selects a hotbar slot by index (0-based) on the next frame. */
  queueSelect(slot: number): void;
  /** Edge-triggered jump request from the touch button. */
  queueJump(): void;
  /** Set the combined touch d-pad direction (call with 0,0 when released). */
  setTouchMove(x: number, y: number): void;
  /** Touch dig button held state: queues `primary` and repeats it while held. */
  setTouchPrimary(held: boolean): void;
  /** Touch button held state (drives swimming up and wall climbing). */
  setTouchJump(held: boolean): void;
  /** Touch secondary button held state, which is what a held guard reads. */
  setTouchSecondary(held: boolean): void;
  /** Accumulate drag-to-look deltas (client pixels). */
  addLookDelta(dx: number, dy: number): void;
  /**
   * Replaces the key codes a place script listens on. A bound key is reported
   * in addition to whatever the world's own controls do with it, so a script
   * choosing a movement key sees both.
   */
  setBoundKeys(keys: string[]): void;
  /** Registers a listener for each bound key's down and up edges; returns a function that removes it. */
  onBoundKey(listener: BoundKeyListener): () => void;
  canvasHandlers: {
    /**
     * Everything a press on the world canvas can mean, for the canvas this is
     * bound to. A mouse press takes the pointer lock the first time and, once
     * locked, strikes on the left button and uses the held item on the right;
     * looking around is the locked pointer's job from then on, so a mouse
     * press fires straight away. A touch or pen press only turns the view,
     * however long it lasts — every world action is a button's job — so a
     * thumb that rests before dragging can never mine.
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
    /**
     * Steps the selected hotbar slot once for every wheel event that arrives
     * on its own, isolated from the events around it — a mouse's discrete
     * notch — and does nothing for a burst of closely-spaced events — a
     * trackpad's swipe. Bound to the world canvas rather than the window, so
     * scrolling the terminal's output or any other overlay never changes the
     * held tool either — only a scroll that actually lands on the canvas
     * can.
     */
    onWheel: JSX.EventHandler<HTMLCanvasElement, WheelEvent>;
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
    primaryHeld: false,
    clickQueued: false,
    secondaryQueued: false,
    secondaryHeld: false,
    secondaryReleasedQueued: false,
    useQueued: false,
    useHeld: false,
    selectQueued: null,
    wheelQueued: 0,
    wheelLastEventAt: -Infinity,
    wheelPendingTimer: undefined,
  };
  const boundKeys = new Set<string>();
  const boundListeners = new Set<BoundKeyListener>();
  let controller: AbortController | null = null;
  /** False while another UI (the level editor) owns the canvas and keyboard. */
  let enabled = true;

  const addLookDelta = (dx: number, dy: number): void => {
    state.lookDx += dx;
    state.lookDy += dy;
  };

  let dragging = false;
  /** The timer re-queuing `primary` while the dig button is held, if any. */
  let primaryRepeat: number | undefined;
  const canvasHandlers = {
    onPointerDown: async (
      event: PointerEvent & { currentTarget: HTMLCanvasElement },
    ) => {
      if (!enabled) {
        return;
      }
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
      await pointer(event, ({ delta }) => {
        addLookDelta(delta.x, delta.y);
      });
      dragging = false;
    },
    onMouseMove: (event: MouseEvent & { currentTarget: HTMLCanvasElement }) => {
      if (!enabled) {
        return;
      }
      if (document.pointerLockElement !== event.currentTarget) {
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
      if (
        event.pointerType === "mouse" &&
        event.button === 2 &&
        state.secondaryHeld
      ) {
        state.secondaryHeld = false;
        state.secondaryReleasedQueued = true;
      }
    },
    onWheel: (event: WheelEvent) => {
      if (!enabled || isEditableTarget(event)) {
        return;
      }
      event.preventDefault();
      const direction = event.deltaY < 0 ? -1 : event.deltaY > 0 ? 1 : 0;
      if (direction === 0) {
        return;
      }
      const now = Date.now();
      const gap = now - state.wheelLastEventAt;
      state.wheelLastEventAt = now;
      if (state.wheelPendingTimer !== undefined) {
        window.clearTimeout(state.wheelPendingTimer);
        state.wheelPendingTimer = undefined;
      }
      if (gap < WHEEL_ISOLATION_MS) {
        // Arrived too soon after the last one to be its own notch — this and
        // the event before it are both part of one continuous swipe, so
        // neither steps the tool.
        return;
      }
      state.wheelPendingTimer = window.setTimeout(() => {
        state.wheelQueued = direction;
        state.wheelPendingTimer = undefined;
      }, WHEEL_ISOLATION_MS);
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
        if (!enabled || isEditableTarget(e)) {
          return;
        }
        if (boundKeys.has(e.code) && !e.repeat) {
          for (const listener of boundListeners) {
            listener(e.code, "down");
          }
        }
        if (e.code === "Space") {
          e.preventDefault();
          state.jumpQueued = true;
          state.jumpHeld = true;
          return;
        }
        if (e.code === "KeyE") {
          state.useHeld = true;
          if (!e.repeat) {
            state.useQueued = true;
          }
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
        if (!enabled || isEditableTarget(e)) {
          return;
        }
        if (boundKeys.has(e.code)) {
          for (const listener of boundListeners) {
            listener(e.code, "up");
          }
        }
        if (e.code === "Space") {
          state.jumpHeld = false;
          return;
        }
        if (e.code === "KeyE") {
          state.useHeld = false;
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

    setBoundKeys(keys) {
      boundKeys.clear();
      for (const key of keys) {
        boundKeys.add(key);
      }
    },

    onBoundKey(listener) {
      boundListeners.add(listener);
      return () => {
        boundListeners.delete(listener);
      };
    },

    setEnabled(value: boolean) {
      enabled = value;
    },

    dispose() {
      controller?.abort();
      controller = null;
      if (primaryRepeat !== undefined) {
        window.clearInterval(primaryRepeat);
        primaryRepeat = undefined;
      }
      if (state.wheelPendingTimer !== undefined) {
        window.clearTimeout(state.wheelPendingTimer);
        state.wheelPendingTimer = undefined;
      }
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
        primaryHeld: state.primaryHeld,
        click: state.clickQueued,
        secondary: state.secondaryQueued,
        secondaryHeld: state.secondaryHeld,
        secondaryReleased: state.secondaryReleasedQueued,
        use: state.useQueued,
        useHeld: state.useHeld,
        select: state.selectQueued,
        wheel: state.wheelQueued,
      };
      state.jumpQueued = false;
      state.lookDx = 0;
      state.lookDy = 0;
      state.primaryQueued = false;
      state.clickQueued = false;
      state.secondaryQueued = false;
      state.secondaryReleasedQueued = false;
      state.useQueued = false;
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

    queueUse() {
      state.useQueued = true;
    },

    setTouchUse(held) {
      state.useHeld = held;
      if (held) {
        state.useQueued = true;
      }
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

    setTouchPrimary(held) {
      state.primaryHeld = held;
      if (primaryRepeat !== undefined) {
        window.clearInterval(primaryRepeat);
        primaryRepeat = undefined;
      }
      if (!held) {
        return;
      }
      state.primaryQueued = true;
      primaryRepeat = window.setInterval(() => {
        state.primaryQueued = true;
      }, HOLD_REPEAT_MS);
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
