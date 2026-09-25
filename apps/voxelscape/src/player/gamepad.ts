/**
 * How far a stick must leave its centre before it registers, as a fraction of
 * full deflection. The rim of a worn stick rests slightly off centre, and a
 * drift the player did not ask for reads as a turn they did not ask for.
 */
const STICK_DEADZONE = 0.15;

/**
 * The look turn a fully-deflected right stick requests each second, in the
 * pointer pixels `updatePlayer` multiplies by its look sensitivity.
 */
const LOOK_PIXELS_PER_SECOND = 360;

/**
 * The standard-layout buttons this module reads: the face buttons, the two
 * triggers, and the horizontal d-pad directions.
 */
const BUTTON = {
  jump: 0,
  use: 1,
  primary: 2,
  secondary: 6,
  primaryAlt: 7,
  stepLeft: 14,
  stepRight: 15,
} as const;

/** Which horizontal d-pad directions were down on the previous frame. */
export interface GamepadMemory {
  left: boolean;
  right: boolean;
}

/**
 * One frame of a standard-mapped gamepad: the sticks as movement axes, the
 * same look turn `InputSnapshot` carries from a pointer drag, which buttons are
 * down, and a hotbar step.
 */
export interface GamepadFrame {
  /** Strafe, from -1 (left) to 1 (right). */
  moveX: number;
  /** Forward/back, from -1 (back) to 1 (forward). */
  moveY: number;
  /** Look turn this frame, in pointer pixels. */
  lookDx: number;
  /** Look pitch this frame, in pointer pixels. */
  lookDy: number;
  jumpHeld: boolean;
  primaryHeld: boolean;
  secondaryHeld: boolean;
  useHeld: boolean;
  /** -1 for the previous hotbar slot, 1 for the next, 0 for no step this frame. */
  step: -1 | 0 | 1;
}

/**
 * A full deflection with the centre deadzone removed: a stick inside the
 * deadzone reads as nothing, and one beyond it ramps from zero at the deadzone
 * edge to full at the rim, so a small nudge is a small turn rather than a jump
 * to the deadzone edge.
 */
const applyDeadzone = (x: number, y: number): [number, number] => {
  const magnitude = Math.hypot(x, y);
  if (magnitude < STICK_DEADZONE) {
    return [0, 0];
  }
  const scale =
    Math.min(1, (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE)) /
    magnitude;
  return [x * scale, y * scale];
};

/**
 * Reads one frame of `gamepad` against the previous frame's d-pad state.
 * Returns the frame and the state to pass back on the next call.
 */
export const readGamepad = (
  gamepad: Gamepad,
  dt: number,
  memory: GamepadMemory,
): { frame: GamepadFrame; memory: GamepadMemory } => {
  const [moveX, moveY] = applyDeadzone(
    gamepad.axes[0] ?? 0,
    -(gamepad.axes[1] ?? 0),
  );
  const [lookX, lookY] = applyDeadzone(
    gamepad.axes[2] ?? 0,
    gamepad.axes[3] ?? 0,
  );
  const buttonHeld = (index: number): boolean =>
    gamepad.buttons[index]?.pressed ?? false;
  const left = buttonHeld(BUTTON.stepLeft);
  const right = buttonHeld(BUTTON.stepRight);
  const step: -1 | 0 | 1 =
    right && !memory.right ? 1 : left && !memory.left ? -1 : 0;
  return {
    frame: {
      moveX,
      moveY,
      lookDx: lookX * LOOK_PIXELS_PER_SECOND * dt,
      lookDy: lookY * LOOK_PIXELS_PER_SECOND * dt,
      jumpHeld: buttonHeld(BUTTON.jump),
      primaryHeld: buttonHeld(BUTTON.primary) || buttonHeld(BUTTON.primaryAlt),
      secondaryHeld: buttonHeld(BUTTON.secondary),
      useHeld: buttonHeld(BUTTON.use),
      step,
    },
    memory: { left, right },
  };
};

export interface GamepadController {
  /** Reads the connected gamepad for one frame, or null when none is connected. */
  poll(dt: number): GamepadFrame | null;
  /** Whether a gamepad this module can read is connected. */
  connected(): boolean;
  /** Removes the connection listeners `createGamepad` bound. */
  dispose(): void;
}

/**
 * Whether a pad indexes its buttons the way this module reads them: the
 * standard mapping, or the empty mapping a browser gives a controller whose
 * layout it has not confirmed but which still uses the standard index.
 */
const hasStandardLayout = (mapping: string): boolean =>
  mapping === "standard" || mapping === "";

/**
 * Finds the connected gamepad this module can read and reads it a frame at a
 * time. A controller that arrives or leaves is reported through
 * `onConnectionChange`, including while nothing is polling.
 */
export const createGamepad = (
  onConnectionChange?: (connected: boolean) => void,
): GamepadController => {
  const abort = new AbortController();
  let memory: GamepadMemory = { left: false, right: false };
  let connected = false;

  const readablePad = (): Gamepad | null => {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.getGamepads !== "function"
    ) {
      return null;
    }
    for (const pad of navigator.getGamepads()) {
      if (pad !== null && pad.connected && hasStandardLayout(pad.mapping)) {
        return pad;
      }
    }
    return null;
  };

  const setConnected = (next: boolean): void => {
    if (next === connected) {
      return;
    }
    connected = next;
    if (!connected) {
      memory = { left: false, right: false };
    }
    onConnectionChange?.(connected);
  };

  window.addEventListener(
    "gamepadconnected",
    () => setConnected(readablePad() !== null),
    { signal: abort.signal },
  );
  window.addEventListener(
    "gamepaddisconnected",
    () => setConnected(readablePad() !== null),
    { signal: abort.signal },
  );

  return {
    poll(dt) {
      const pad = readablePad();
      if (pad === null) {
        setConnected(false);
        return null;
      }
      setConnected(true);
      const read = readGamepad(pad, dt, memory);
      memory = read.memory;
      return read.frame;
    },
    connected: () => connected,
    dispose: () => abort.abort(),
  };
};
