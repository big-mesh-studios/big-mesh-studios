// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInput, type InputController } from "./create-input";

/** The canvas width the fake element reports. */
const WIDTH = 400;

let input: InputController;

beforeEach(() => {
  vi.useFakeTimers();
  input = createInput();
});

afterEach(() => {
  input.dispose();
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
  return canvas;
};

interface Press {
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
  x: number;
  y: number;
  pointerId?: number;
}

/** Dispatches pointer events at a canvas that is listening through `canvasHandlers`. */
const press = (canvas: HTMLCanvasElement, p: Press): void => {
  canvas.dispatchEvent(
    new PointerEvent(p.type, {
      pointerType: "touch",
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
  it("fires once from the queued request, as a touch button would", () => {
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
});
