// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInput, type InputController } from "./create-input";

/** The canvas width the fake element reports. */
const WIDTH = 400;

let input: InputController;

const setPointerLock = (target: Element | null): void => {
  Object.defineProperty(document, "pointerLockElement", {
    configurable: true,
    value: target,
  });
  document.dispatchEvent(new Event("pointerlockchange"));
};

beforeEach(() => {
  vi.useFakeTimers();
  setPointerLock(null);
  Object.defineProperty(document, "exitPointerLock", {
    configurable: true,
    value: vi.fn(() => setPointerLock(null)),
  });
  input = createInput();
});

afterEach(() => {
  input.dispose();
  document.body.replaceChildren();
  setPointerLock(null);
  vi.useRealTimers();
});

/** A canvas whose width and pointer capture are present, as the browser has them. */
const makeCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "clientWidth", {
    configurable: true,
    value: WIDTH,
  });
  canvas.setPointerCapture = () => {};
  canvas.hasPointerCapture = () => true;
  canvas.releasePointerCapture = () => {};
  canvas.requestPointerLock = vi.fn(() => {
    setPointerLock(canvas);
    return Promise.resolve();
  });
  return canvas;
};

interface Press {
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
  x: number;
  y: number;
  pointerId?: number;
  pointerType?: "mouse" | "touch" | "pen";
}

/** Dispatches pointer events at a canvas that is listening through `canvasHandlers`. */
const press = (canvas: HTMLCanvasElement, p: Press): void => {
  canvas.dispatchEvent(
    new PointerEvent(p.type, {
      pointerType: p.pointerType ?? "touch",
      pointerId: p.pointerId ?? 1,
      button: 0,
      clientX: p.x,
      clientY: p.y,
      bubbles: true,
    }),
  );
};

/** Lets the async pointer handlers' continuations run after the last event. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
};

const bind = (canvas: HTMLCanvasElement): void => {
  canvas.addEventListener(
    "pointerdown",
    input.canvasHandlers.onPointerDown as unknown as EventListener,
  );
};

describe("pointer lock state", () => {
  it("tracks the world canvas lock without counting capture as play", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    const listener = vi.fn();
    const stop = input.onPointerLockChange(listener);

    expect(input.pointerLocked()).toBe(false);
    press(canvas, {
      type: "pointerdown",
      x: 100,
      y: 100,
      pointerType: "mouse",
    });
    await settle();

    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();
    expect(input.pointerLocked()).toBe(true);
    expect(input.hasActivity()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith(true);

    setPointerLock(null);
    expect(input.pointerLocked()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith(false);
    stop();
  });
});

describe("pointer lock suspension", () => {
  it("keeps a replacement overlay from restoring between questions", async () => {
    const canvas = makeCanvas();
    document.body.append(canvas);
    bind(canvas);
    press(canvas, {
      type: "pointerdown",
      x: 100,
      y: 100,
      pointerType: "mouse",
    });
    await settle();

    const listener = vi.fn();
    const stop = input.onPointerLockSuspensionChange(listener);
    const releaseFirst = input.suspendPointerLock();
    const releaseSecond = input.suspendPointerLock();

    expect(document.exitPointerLock).toHaveBeenCalledOnce();
    expect(input.pointerLocked()).toBe(false);
    expect(input.pointerLockSuspended()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith(true);

    releaseFirst();
    releaseFirst();
    expect(input.pointerLockSuspended()).toBe(true);
    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();

    releaseSecond();
    vi.advanceTimersByTime(50);
    expect(input.pointerLockSuspended()).toBe(true);
    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();

    const releaseReplacement = input.suspendPointerLock();
    releaseReplacement();
    vi.advanceTimersByTime(99);
    expect(input.pointerLockSuspended()).toBe(true);
    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1);
    expect(input.pointerLockSuspended()).toBe(false);
    expect(input.pointerLocked()).toBe(true);
    expect(canvas.requestPointerLock).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(false);
    stop();
  });

  it("does not capture a pointer that was already free", async () => {
    const canvas = makeCanvas();
    canvas.requestPointerLock = vi.fn(() => Promise.resolve());
    document.body.append(canvas);
    bind(canvas);
    press(canvas, {
      type: "pointerdown",
      x: 100,
      y: 100,
      pointerType: "mouse",
    });
    await settle();
    const requests = vi.mocked(canvas.requestPointerLock).mock.calls.length;

    const release = input.suspendPointerLock();
    expect(input.pointerLockSuspended()).toBe(true);
    expect(document.exitPointerLock).not.toHaveBeenCalled();

    release();
    expect(input.pointerLockSuspended()).toBe(false);
    expect(input.pointerLocked()).toBe(false);
    expect(canvas.requestPointerLock).toHaveBeenCalledTimes(requests);
  });

  it("keeps the game unlocked when the browser rejects restoration", async () => {
    const canvas = makeCanvas();
    document.body.append(canvas);
    bind(canvas);
    press(canvas, {
      type: "pointerdown",
      x: 100,
      y: 100,
      pointerType: "mouse",
    });
    await settle();
    canvas.requestPointerLock = vi.fn(() =>
      Promise.reject(new Error("pointer lock denied")),
    );

    const release = input.suspendPointerLock();
    release();
    vi.advanceTimersByTime(100);
    await settle();

    expect(input.pointerLockSuspended()).toBe(false);
    expect(input.pointerLocked()).toBe(false);
    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();
  });
});

describe("first gameplay activity", () => {
  it("reports only the first movement or action", () => {
    const listener = vi.fn();
    const stop = input.onActivity(listener);

    expect(input.hasActivity()).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    expect(input.hasActivity()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
    expect(listener).toHaveBeenCalledOnce();
    stop();
  });
});

describe("canvas touch gestures", () => {
  it("turns a drag into a look and fires nothing", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    press(canvas, { type: "pointermove", x: 140, y: 100 });
    await settle();
    press(canvas, { type: "pointerup", x: 140, y: 100 });
    await settle();

    const snapshot = input.consume();
    expect(snapshot.lookDx).toBe(40);
    expect(snapshot.primary).toBe(false);
    expect(snapshot.click).toBe(false);
  });

  it("does not mine a press that rests before it moves", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    // Long enough that a hold gesture would have struck, had one existed.
    vi.advanceTimersByTime(2000);
    expect(input.consume().primary).toBe(false);

    press(canvas, { type: "pointermove", x: 130, y: 100 });
    await settle();
    press(canvas, { type: "pointerup", x: 130, y: 100 });
    await settle();
    const snapshot = input.consume();
    expect(snapshot.lookDx).toBe(30);
    expect(snapshot.primary).toBe(false);
  });

  it("ignores a second finger touching down while the first is still down", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100, pointerId: 1 });
    await settle();
    press(canvas, { type: "pointerdown", x: 200, y: 200, pointerId: 2 });
    await settle();
    press(canvas, { type: "pointermove", x: 260, y: 260, pointerId: 2 });
    await settle();
    // Only the first finger is followed, so the second turns nothing.
    expect(input.consume().lookDx).toBe(0);

    press(canvas, { type: "pointerup", x: 200, y: 200, pointerId: 2 });
    await settle();
    press(canvas, { type: "pointerup", x: 100, y: 100, pointerId: 1 });
    await settle();
  });

  it("fires nothing when the browser cancels the press", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    press(canvas, { type: "pointercancel", x: 100, y: 100 });
    await settle();

    const snapshot = input.consume();
    expect(snapshot.primary).toBe(false);
    expect(snapshot.lookDx).toBe(0);
  });
});

describe("the touch buttons", () => {
  it("strikes at once and repeats while the dig button is held", () => {
    input.setTouchPrimary(true);
    expect(input.consume()).toMatchObject({ primary: true, primaryHeld: true });

    vi.advanceTimersByTime(500);
    expect(input.consume()).toMatchObject({ primary: true, primaryHeld: true });

    input.setTouchPrimary(false);
    vi.advanceTimersByTime(500);
    expect(input.consume()).toMatchObject({
      primary: false,
      primaryHeld: false,
    });
  });

  it("holds the secondary button down and queues its release", () => {
    input.setTouchSecondary(true);
    const pressed = input.consume();
    expect(pressed.secondary).toBe(true);
    expect(pressed.secondaryHeld).toBe(true);
    expect(pressed.secondaryReleased).toBe(false);

    input.setTouchSecondary(false);
    const released = input.consume();
    expect(released.secondaryHeld).toBe(false);
    expect(released.secondaryReleased).toBe(true);
  });

  it("keeps the jump held while the jump button is down", () => {
    input.setTouchJump(true);
    expect(input.consume().jumpHeld).toBe(true);

    input.setTouchJump(false);
    expect(input.consume().jumpHeld).toBe(false);
  });

  it("holds the use button for scripts after its edge has gone", () => {
    input.setTouchUse(true);
    expect(input.consume()).toMatchObject({ use: true, useHeld: true });

    // The one-frame edge is spent, but the held state survives for a later step.
    expect(input.consume()).toMatchObject({ use: false, useHeld: true });

    input.setTouchUse(false);
    expect(input.consume().useHeld).toBe(false);
  });
});

describe("the wheel's tool step", () => {
  /** Dispatches a wheel event at the canvas with the given `deltaY`. */
  const scroll = (canvas: HTMLCanvasElement, deltaY: number): void => {
    canvas.dispatchEvent(
      new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }),
    );
  };

  const bindWheel = (canvas: HTMLCanvasElement): void => {
    canvas.addEventListener(
      "wheel",
      input.canvasHandlers.onWheel as unknown as EventListener,
    );
  };

  it("steps once a notch that arrived on its own is confirmed", () => {
    const canvas = makeCanvas();
    bindWheel(canvas);
    scroll(canvas, 120);
    // Not yet — it's still waiting to see whether another event follows close behind.
    expect(input.consume().wheel).toBe(0);

    vi.advanceTimersByTime(60);
    expect(input.consume().wheel).toBe(1);
  });

  it("does nothing for a burst of closely-spaced events, as a trackpad's swipe would", () => {
    const canvas = makeCanvas();
    bindWheel(canvas);
    for (let i = 0; i < 10; i++) {
      scroll(canvas, 6);
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(60);
    expect(input.consume().wheel).toBe(0);
  });

  it("steps once per notch when notches are spaced well apart", () => {
    const canvas = makeCanvas();
    bindWheel(canvas);
    scroll(canvas, 100);
    vi.advanceTimersByTime(60);
    expect(input.consume().wheel).toBe(1);

    vi.advanceTimersByTime(200);
    scroll(canvas, 100);
    vi.advanceTimersByTime(60);
    expect(input.consume().wheel).toBe(1);
  });

  it("resumes recognizing isolated notches once a swipe goes quiet", () => {
    const canvas = makeCanvas();
    bindWheel(canvas);
    for (let i = 0; i < 5; i++) {
      scroll(canvas, -6);
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(200);
    scroll(canvas, -100);
    vi.advanceTimersByTime(60);
    expect(input.consume().wheel).toBe(-1);
  });
});

describe("the interact (use) edge", () => {
  it("fires once from a queued request", () => {
    input.queueUse();
    expect(input.consume().use).toBe(true);
    expect(input.consume().use).toBe(false);
  });

  it("fires once from the E key and not again while it repeats", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    expect(input.consume().use).toBe(true);
    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyE", repeat: true }),
    );
    expect(input.consume().use).toBe(false);
  });

  it("holds the E key for scripts until it comes up", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    expect(input.consume()).toMatchObject({ use: true, useHeld: true });
    expect(input.consume()).toMatchObject({ use: false, useHeld: true });

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    expect(input.consume()).toMatchObject({ use: false, useHeld: false });
  });
});

describe("the gamepad", () => {
  /** A standard-mapped gamepad with the given stick axes and pressed buttons. */
  const pad = (axes: number[], pressed: number[] = []): Gamepad =>
    ({
      id: "Backbone One",
      index: 0,
      connected: true,
      mapping: "standard",
      timestamp: 0,
      axes,
      buttons: Array.from({ length: 16 }, (_, i) => ({
        pressed: pressed.includes(i),
        touched: pressed.includes(i),
        value: pressed.includes(i) ? 1 : 0,
      })),
    }) as unknown as Gamepad;

  const stubPads = (pads: (Gamepad | null)[]): void => {
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => pads,
    });
  };

  afterEach(() => {
    delete (navigator as { getGamepads?: unknown }).getGamepads;
  });

  it("folds the sticks into movement and look", () => {
    stubPads([pad([1, 0, 0, 1])]);
    input.poll(0.5);
    const snapshot = input.consume();
    expect(snapshot.moveX).toBeCloseTo(1);
    expect(snapshot.moveY).toBeCloseTo(0);
    expect(snapshot.lookDy).toBeCloseTo(180);
  });

  it("presses and holds the face buttons", () => {
    stubPads([pad([0, 0, 0, 0], [0, 1, 2, 6])]);
    input.poll(1 / 60);
    expect(input.consume()).toMatchObject({
      jump: true,
      jumpHeld: true,
      use: true,
      useHeld: true,
      primary: true,
      primaryHeld: true,
      secondary: true,
      secondaryHeld: true,
    });
  });

  it("releases the controller's held buttons when it disconnects", () => {
    stubPads([pad([0, 0, 0, 0], [0, 2])]);
    input.poll(1 / 60);
    input.consume();
    stubPads([null]);
    input.poll(1 / 60);
    expect(input.consume()).toMatchObject({
      jumpHeld: false,
      primaryHeld: false,
    });
  });

  it("steps the hotbar from the d-pad", () => {
    stubPads([pad([0, 0, 0, 0], [15])]);
    input.poll(1 / 60);
    expect(input.consume().wheel).toBe(1);
  });
});
