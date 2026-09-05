// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInput, type InputController } from "./create-input";

/** The canvas width the slop is computed from: max(6, 400 * 0.02) = 8px. */
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
  it("turns a quick lift into a tap edge and nothing else", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    press(canvas, { type: "pointerup", x: 100, y: 100 });
    await settle();

    const snapshot = input.consume();
    expect(snapshot.tap).toBe(true);
    expect(snapshot.primary).toBe(false);
    expect(snapshot.click).toBe(false);
    expect(snapshot.lookDx).toBe(0);
    expect(snapshot.lookDy).toBe(0);
  });

  it("fires nothing for a quick lift over empty air either", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 50, y: 50 });
    await settle();
    press(canvas, { type: "pointerup", x: 51, y: 50 });
    await settle();

    const snapshot = input.consume();
    expect(snapshot.tap).toBe(true);
    expect(snapshot.primary).toBe(false);
  });

  it("strikes once a still press has outlasted the hold grace", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    expect(input.consume().primary).toBe(false);

    vi.advanceTimersByTime(120);
    expect(input.consume().primary).toBe(true);
    // A touch's hold repeats `primary` but never sets the mouse `click` edge.
    expect(input.consume().click).toBe(false);
    expect(input.consume().tap).toBe(false);

    press(canvas, { type: "pointerup", x: 100, y: 100 });
    await settle();
    expect(input.consume().tap).toBe(false);
    expect(input.consume().primary).toBe(false);
  });

  it("keeps striking on the repeat cadence while a hold stays still", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    vi.advanceTimersByTime(120);
    expect(input.consume().primary).toBe(true);

    vi.advanceTimersByTime(500);
    expect(input.consume().primary).toBe(true);

    vi.advanceTimersByTime(500);
    expect(input.consume().primary).toBe(true);

    press(canvas, { type: "pointerup", x: 100, y: 100 });
    await settle();
    expect(input.consume().primary).toBe(false);
  });

  it("turns a press that moves past the slop into a look, firing nothing", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    press(canvas, { type: "pointermove", x: 140, y: 100 });
    await settle();
    press(canvas, { type: "pointerup", x: 140, y: 100 });
    await settle();

    const snapshot = input.consume();
    expect(snapshot.tap).toBe(false);
    expect(snapshot.primary).toBe(false);
    expect(snapshot.lookDx).toBe(40);
  });

  it("does not strike when a drag starts before the grace elapses", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    // The camera drag begins within the grace window.
    press(canvas, { type: "pointermove", x: 130, y: 100 });
    await settle();
    press(canvas, { type: "pointerup", x: 130, y: 100 });
    await settle();
    expect(input.consume().primary).toBe(false);
    expect(input.consume().tap).toBe(false);

    // Nothing was left scheduled to fire later.
    vi.advanceTimersByTime(2000);
    expect(input.consume().primary).toBe(false);
  });

  it("lets a press drift within the slop and still hold", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    await settle();
    press(canvas, { type: "pointermove", x: 104, y: 100 });
    await settle();
    vi.advanceTimersByTime(120);
    expect(input.consume().primary).toBe(true);
  });

  it("ignores a second finger touching down while the first is still down", async () => {
    const canvas = makeCanvas();
    bind(canvas);
    press(canvas, { type: "pointerdown", x: 100, y: 100, pointerId: 1 });
    await settle();
    press(canvas, { type: "pointerdown", x: 200, y: 200, pointerId: 2 });
    await settle();
    vi.advanceTimersByTime(120);
    expect(input.consume().primary).toBe(true);

    // Lifting the second finger (never followed) resolves nothing of its own.
    press(canvas, { type: "pointerup", x: 200, y: 200, pointerId: 2 });
    await settle();
    expect(input.consume().tap).toBe(false);

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
    expect(snapshot.tap).toBe(false);
    expect(snapshot.primary).toBe(false);
  });
});
