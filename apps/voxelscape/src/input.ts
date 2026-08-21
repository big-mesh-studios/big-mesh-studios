// Unified keyboard + touch input for the player. A single mutable snapshot is
// fed by `installKeyboardControls` (desktop) and the touch UI (`Controls.tsx`),
// then drained once per frame by `consumeInput`.

export interface InputSnapshot {
  // -1..1 strafe (negative = left) / forward-back (positive = forward)
  moveX: number;
  moveY: number;
  // edge-triggered: true only on the frame the jump was pressed
  jump: boolean;
  // held: true while jump is held down (used to swim up underwater)
  jumpHeld: boolean;
  // pointer-move deltas accumulated since the last frame (drag-to-look)
  lookDx: number;
  lookDy: number;
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
};

const clamp = (v: number): number => Math.max(-1, Math.min(1, v));

// code -> [strafe, forward]
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

export const installKeyboardControls = (): void => {
  const onDown = (e: KeyboardEvent): void => {
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
    if (e.code === "Space") {
      state.jumpHeld = false;
      return;
    }
    const move = MOVE_KEYS[e.code];
    if (move === undefined) {
      return;
    }
    state.keyMoveX -= move[0];
    state.keyMoveY -= move[1];
  };
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
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

/** Called once per frame: returns the latest input and clears per-frame state. */
export const consumeInput = (): InputSnapshot => {
  const snap: InputSnapshot = {
    moveX: clamp(state.keyMoveX + state.touchMoveX),
    moveY: clamp(state.keyMoveY + state.touchMoveY),
    jump: state.jumpQueued,
    jumpHeld: state.jumpHeld,
    lookDx: state.lookDx,
    lookDy: state.lookDy,
  };
  state.jumpQueued = false;
  state.lookDx = 0;
  state.lookDy = 0;
  return snap;
};
