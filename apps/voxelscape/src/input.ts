/**
 * Unified keyboard and touch input for the player. A single mutable
 * snapshot is fed by `installKeyboardControls` (desktop) and the touch UI
 * (`Controls.tsx`), then drained once per frame by `consumeInput`.
 */
export interface InputSnapshot {
  /** Strafe input, from -1 (left) to 1 (right). */
  moveX: number;
  /** Forward/back input, from -1 (backward) to 1 (forward). */
  moveY: number;
  /** Edge-triggered: true only on the frame the jump was pressed. */
  jump: boolean;
  /** True while the jump input is held down; used to swim up underwater. */
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

/**
 * Reports whether the event's target is an editable element — for example,
 * the debug console input — so the global key handlers can skip it instead
 * of calling `preventDefault` on those keys or moving the player.
 *
 * @param e - The keyboard event to check.
 * @returns True if the event originated from an editable element.
 */
const isEditableTarget = (e: Event): boolean => {
  const el = e.target as HTMLElement | null;
  if (el === null) {
    return false;
  }
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
};

export const installKeyboardControls = (): void => {
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
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
};

/** Pointer movement, in client pixels, beyond which a press counts as a look-drag rather than a click. */
const EDIT_CLICK_DRAG_THRESHOLD = 5;

/** Gap, in ms, within which a second click on the same button counts as a double-click. */
const DOUBLE_CLICK_WINDOW_MS = 300;

/**
 * Binds the block-editing controls: left mouse button (or Enter) digs, right
 * mouse button places, and the top-row number keys select the matching
 * hotbar slot. Edits are edge-triggered per press, so holding a button (or
 * key) doesn't dig repeatedly.
 *
 * A click's action fires only on release, and only if the pointer stayed
 * within `EDIT_CLICK_DRAG_THRESHOLD` of where it went down, so a press-and-
 * drag used to look around (see `createLookDragHandlers`) doesn't also dig
 * or place. The action is then held for `DOUBLE_CLICK_WINDOW_MS`: if a
 * second click on the same button lands within that window, it's a
 * double-click and neither click's action fires.
 */
export const installEditControls = (): void => {
  let pendingButton: number | null = null;
  let downX = 0;
  let downY = 0;
  let dragged = false;
  const pendingTimers = new Map<number, ReturnType<typeof setTimeout>>();
  const lastClickAt = new Map<number, number>();

  const fireAction = (button: number): void => {
    if (button === 0) {
      state.breakQueued = true;
    } else if (button === 2) {
      state.placeQueued = true;
    }
  };

  const onDown = (e: MouseEvent): void => {
    if (isEditableTarget(e)) {
      return;
    }
    // Only dig/place when the press lands on the world canvas itself, not on
    // the touch UI (joystick, buttons, console). Touch taps on the world also
    // reach here as emulated mouse events with the canvas as the target.
    if (!(e.target instanceof HTMLCanvasElement)) {
      return;
    }
    if (e.button !== 0 && e.button !== 2) {
      return;
    }
    pendingButton = e.button;
    downX = e.clientX;
    downY = e.clientY;
    dragged = false;
  };
  const onMove = (e: MouseEvent): void => {
    if (pendingButton === null) {
      return;
    }
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    if (dx * dx + dy * dy > EDIT_CLICK_DRAG_THRESHOLD * EDIT_CLICK_DRAG_THRESHOLD) {
      dragged = true;
    }
  };
  const onUp = (e: MouseEvent): void => {
    if (pendingButton !== e.button) {
      return;
    }
    const button = pendingButton;
    pendingButton = null;
    if (dragged) {
      return;
    }
    const now = Date.now();
    const last = lastClickAt.get(button) ?? -Infinity;
    lastClickAt.set(button, now);
    if (now - last < DOUBLE_CLICK_WINDOW_MS) {
      // Second click of a double-click: cancel the first click's pending
      // action and skip this one too — double-clicking does nothing.
      const timer = pendingTimers.get(button);
      if (timer !== undefined) {
        clearTimeout(timer);
        pendingTimers.delete(button);
      }
      lastClickAt.delete(button);
      return;
    }
    const timer = setTimeout(() => {
      pendingTimers.delete(button);
      fireAction(button);
    }, DOUBLE_CLICK_WINDOW_MS);
    pendingTimers.set(button, timer);
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (isEditableTarget(e)) {
      return;
    }
    if (e.key === "Enter") {
      if (!e.repeat) {
        fireAction(0);
      }
      return;
    }
    if (e.code.startsWith("Digit")) {
      const idx = Number(e.code.slice(5));
      if (idx >= 1 && idx <= 2) {
        state.selectQueued = idx - 1;
      }
    }
  };
  window.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("contextmenu", (e) => e.preventDefault());
};

/** Edge-triggered break (dig) request, normally from the left mouse button. */
export const queueBreak = (): void => {
  state.breakQueued = true;
};

/** Edge-triggered place request, normally from the right mouse button. */
export const queuePlace = (): void => {
  state.placeQueued = true;
};

/** Selects a hotbar slot by index (0-based) on the next frame. */
export const queueSelect = (slot: number): void => {
  state.selectQueued = slot;
};

/** Set the combined touch d-pad direction (call with 0,0 when released). */
export const setTouchMove = (x: number, y: number): void => {
  state.touchMoveX = x;
  state.touchMoveY = y;
};

/** Edge-triggered jump request from the touch button. */
export const queueJump = (): void => {
  state.jumpQueued = true;
};

/** Touch button held state (drives swim-up underwater). */
export const setTouchJump = (held: boolean): void => {
  state.jumpHeld = held;
};

/** Accumulate drag-to-look deltas (client pixels). */
export const addLookDelta = (dx: number, dy: number): void => {
  state.lookDx += dx;
  state.lookDy += dy;
};

export interface LookDragHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
}

/**
 * Tracks a single active pointer drag and feeds its movement into
 * `addLookDelta`. Pointer events from any other pointer are ignored, so a
 * second finger touching down mid-drag doesn't steal or reset tracking.
 */
export const createLookDragHandlers = (): LookDragHandlers => {
  let pointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  return {
    onPointerDown: (e) => {
      if (pointerId === null) {
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
};

/** Called once per frame: returns the latest input and clears per-frame state. */
export const consumeInput = (): InputSnapshot => {
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
};
