import { isEditableTarget } from "../utils/utils";

/**
 * Unified keyboard, pointer and touch input for the player. Each controller
 * owns its own snapshot, fed by the keyboard/pointer listeners `install`
 * binds and by the touch UI (`CoarseControls.tsx`), then drained once per
 * frame by `consume`.
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
  /** Edge-triggered: the selected hotbar slot changed this frame, or null. */
  select: number | null;
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
  selectQueued: number | null;
}

const clamp = (v: number): number => Math.max(-1, Math.min(1, v));

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

export interface LookDragHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
}

export interface InputController {
  /**
   * Binds the keyboard, edit and pointer-lock listeners to `window`. Calling
   * it twice is a no-op, so an already-installed controller can't end up
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
  /** Accumulate drag-to-look deltas (client pixels). */
  addLookDelta(dx: number, dy: number): void;
  /**
   * Tracks a single active pointer drag and feeds its movement into
   * `addLookDelta`. Pointer events from any other pointer are ignored, so a
   * second finger touching down mid-drag doesn't steal or reset tracking.
   *
   * Mouse pointers are ignored here — on desktop, looking around is driven by
   * the pointer lock `install` binds, so this is left for touch/pen drags.
   */
  createLookDragHandlers(): LookDragHandlers;
}

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
    selectQueued: null,
  };

  const addLookDelta = (dx: number, dy: number): void => {
    state.lookDx += dx;
    state.lookDy += dy;
  };

  const installKeyboardControls = (signal: AbortSignal): void => {
    const onDown = (e: KeyboardEvent): void => {
      if (isEditableTarget(e)) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        state.jumpQueued = true;
        state.jumpHeld = true;
        return;
      }
      const move = MOVE_KEYS[e.code];
      if (move === undefined || e.repeat) {
        return;
      }
      e.preventDefault();
      state.keyMoveX += move[0];
      state.keyMoveY += move[1];
    };
    const onUp = (e: KeyboardEvent): void => {
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
    };
    window.addEventListener("keydown", onDown, { signal });
    window.addEventListener("keyup", onUp, { signal });
  };

  /**
   * Binds the block-editing controls: left mouse button digs, right mouse button
   * places, and the top-row number keys select the matching hotbar slot. Edits
   * are edge-triggered per press, so holding a button doesn't dig repeatedly.
   *
   * The first mouse click on the canvas only acquires the pointer lock (see
   * `installPointerLockLook`) — it doesn't also dig or place. Once locked,
   * looking around no longer involves dragging a visible cursor, so there's
   * nothing left to disambiguate: mousedown fires the action right away, same
   * as holding the button to keep mining while you turn in Minecraft. Touch
   * (and pen) presses skip the lock gate entirely and always fire right away —
   * pointer lock isn't a touch concept, and CoarseControls.tsx already routes
   * digging through a tap on the canvas.
   */
  const installEditControls = (signal: AbortSignal): void => {
    const onDown = (e: PointerEvent): void => {
      if (isEditableTarget(e)) {
        return;
      }
      // Only dig/place when the press lands on the world canvas itself, not on
      // the touch UI (joystick, buttons, console). Touch taps on the world also
      // reach here as emulated mouse events with the canvas as the target.
      if (!(e.target instanceof HTMLCanvasElement)) {
        return;
      }
      // Pointer lock is a mouse-only concept — iOS Safari doesn't implement it
      // at all, and it isn't how touch input works anyway. A touch (or pen) tap
      // fires the action immediately, same as it always has; only a mouse press
      // is gated behind acquiring the lock first.
      if (
        e.pointerType === "mouse" &&
        document.pointerLockElement !== e.target
      ) {
        e.target.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        state.breakQueued = true;
      } else if (e.button === 2) {
        state.placeQueued = true;
      }
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (isEditableTarget(e)) {
        return;
      }
      if (e.code.startsWith("Digit")) {
        const idx = Number(e.code.slice(5));
        if (idx >= 1 && idx <= 2) {
          state.selectQueued = idx - 1;
        }
      }
    };
    window.addEventListener("pointerdown", onDown, { signal });
    window.addEventListener("keydown", onKeyDown, { signal });
    window.addEventListener("contextmenu", (e) => e.preventDefault(), {
      signal,
    });
  };

  /**
   * Feeds the desktop look-around input while the pointer is locked to the
   * canvas (see `installEditControls`, which requests the lock on the first
   * click). While locked, the OS hides and re-centers the cursor each frame,
   * so `movementX`/`movementY` — not `clientX`/`clientY` — carry the raw
   * mouse delta; outside of lock, mouse movement over the canvas does nothing,
   * matching the click-to-play convention of desktop FPS games.
   */
  const installPointerLockLook = (signal: AbortSignal): void => {
    const onMove = (e: MouseEvent): void => {
      if (document.pointerLockElement === null) {
        return;
      }
      addLookDelta(e.movementX, e.movementY);
    };
    document.addEventListener("mousemove", onMove, { signal });
  };

  let installed: AbortController | null = null;

  return {
    install() {
      if (installed !== null) {
        return;
      }
      installed = new AbortController();
      const { signal } = installed;
      installKeyboardControls(signal);
      installEditControls(signal);
      installPointerLockLook(signal);
    },

    dispose() {
      installed?.abort();
      installed = null;
    },

    consume() {
      const snap: InputSnapshot = {
        moveX: clamp(state.keyMoveX + state.touchMoveX),
        moveY: clamp(state.keyMoveY + state.touchMoveY),
        jump: state.jumpQueued,
        jumpHeld: state.jumpHeld,
        lookDx: state.lookDx,
        lookDy: state.lookDy,
        break: state.breakQueued,
        place: state.placeQueued,
        select: state.selectQueued,
      };
      state.jumpQueued = false;
      state.lookDx = 0;
      state.lookDy = 0;
      state.breakQueued = false;
      state.placeQueued = false;
      state.selectQueued = null;
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

    addLookDelta,

    createLookDragHandlers() {
      let pointerId: number | null = null;
      let lastX = 0;
      let lastY = 0;
      return {
        onPointerDown: (e) => {
          if (pointerId === null && e.pointerType !== "mouse") {
            pointerId = e.pointerId;
            lastX = e.clientX;
            lastY = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }
        },
        onPointerMove: (e) => {
          if (e.pointerId !== pointerId) {
            return;
          }
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          addLookDelta(dx, dy);
        },
        onPointerUp: (e) => {
          if (e.pointerId === pointerId) {
            pointerId = null;
          }
        },
        onPointerCancel: (e) => {
          if (e.pointerId === pointerId) {
            pointerId = null;
          }
        },
      };
    },
  };
};
