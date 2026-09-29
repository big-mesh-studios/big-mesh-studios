// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFlyInput, type FlyInputController } from "./fly-input";

let input: FlyInputController;

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
  input = createFlyInput();
  input.setEnabled(true);
});

afterEach(() => {
  input.dispose();
  document.body.replaceChildren();
  setPointerLock(null);
  vi.useRealTimers();
});

/** A canvas with the pointer capture and lock methods the browser gives it. */
const makeCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
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
  button?: number;
  pointerType?: "mouse" | "touch" | "pen";
}

const press = (canvas: HTMLCanvasElement, press: Press): void => {
  canvas.dispatchEvent(
    new PointerEvent(press.type, {
      pointerType: press.pointerType ?? "touch",
      pointerId: 1,
      button: press.button ?? 0,
      clientX: press.x,
      clientY: press.y,
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
  canvas.addEventListener(
    "pointerup",
    input.canvasHandlers.onPointerUp as unknown as EventListener,
  );
  canvas.addEventListener(
    "mousemove",
    input.canvasHandlers.onMouseMove as unknown as EventListener,
  );
};

const key = (
  type: "keydown" | "keyup",
  code: string,
  target: EventTarget = window,
) =>
  target.dispatchEvent(
    new KeyboardEvent(type, { code, bubbles: true, cancelable: true }),
  );

/** A canvas already holding the pointer lock, with the handlers bound. */
const lockedCanvas = async (): Promise<HTMLCanvasElement> => {
  const canvas = makeCanvas();
  document.body.append(canvas);
  bind(canvas);
  press(canvas, { type: "pointerdown", x: 100, y: 100, pointerType: "mouse" });
  await settle();
  return canvas;
};

describe("keyboard", () => {
  it("flies forward and back on the movement keys", () => {
    key("keydown", "KeyW");
    expect(input.consume().moveY).toBe(1);

    key("keyup", "KeyW");
    key("keydown", "ArrowDown");
    expect(input.consume().moveY).toBe(-1);
  });

  it("flies on the arrow keys as well as the letters", () => {
    key("keydown", "ArrowUp");
    key("keydown", "KeyS");

    // Two keys, one axis, cancelling: a key that is not a movement key does not
    // add to the axis, and the two held are subtracted from the same one.
    expect(input.consume().moveY).toBe(0);
  });

  it("strafes on the sideways keys", () => {
    key("keydown", "KeyD");

    expect(input.consume().moveX).toBe(1);
  });

  it("holds the movement for as long as the key is down", () => {
    key("keydown", "KeyW");
    input.consume();

    // The axes are level rather than per-frame, so a frame that consumes
    // nothing to do still reports the key that is down.
    expect(input.consume().moveY).toBe(1);

    key("keyup", "KeyW");
    expect(input.consume().moveY).toBe(0);
  });

  it("counts a held key once however many times the system repeats it", () => {
    key("keydown", "KeyW");
    key("keydown", "KeyW", window);
    key("keydown", "KeyW", window);

    expect(input.consume().moveY).toBe(1);
  });

  it("leaves a key press to whatever the user is typing into", () => {
    // The frame count is a number field in the toolbar, and the arrow keys are
    // movement as well as a way of stepping a number.
    const field = document.createElement("input");
    document.body.append(field);
    key("keydown", "ArrowUp", field);

    expect(input.consume().moveY).toBe(0);
  });

  it("does not move while the turntable has the figure", () => {
    input.setEnabled(false);
    key("keydown", "KeyW");

    expect(input.consume().moveY).toBe(0);
  });

  it("lets go of a key held as the turntable took over", () => {
    key("keydown", "KeyW");
    input.consume();

    // The release never arrives, because the listener was not listening: a
    // camera that came back to a key still held would set off at once.
    input.setEnabled(false);
    input.setEnabled(true);

    expect(input.consume().moveY).toBe(0);
  });
});

describe("pointer lock", () => {
  it("takes the lock on the first mouse press and places nothing with it", async () => {
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

    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();
    expect(input.pointerLocked()).toBe(true);
    expect(input.consume().place).toBe(false);
  });

  it("reports the lock being taken and given up", async () => {
    const canvas = await lockedCanvas();
    const listener = vi.fn();
    const stop = input.onPointerLockChange(listener);

    setPointerLock(null);

    expect(input.pointerLocked()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
    stop();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not follow a mouse that is not locked", async () => {
    const canvas = makeCanvas();
    document.body.append(canvas);
    bind(canvas);
    input.addLookDelta(0, 0);

    canvas.dispatchEvent(
      new MouseEvent("mousemove", { movementX: 40, bubbles: true }),
    );

    expect(input.consume().lookDx).toBe(0);
  });

  it("turns the view by a locked mouse's movement", async () => {
    const canvas = await lockedCanvas();

    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        movementX: 40,
        movementY: 15,
        bubbles: true,
      }),
    );

    const frame = input.consume();

    expect(frame.lookDx).toBe(40);
    expect(frame.lookDy).toBe(15);
  });

  it("reports a look turn once", async () => {
    const canvas = await lockedCanvas();

    canvas.dispatchEvent(new MouseEvent("mousemove", { movementX: 40 }));
    input.consume();

    expect(input.consume().lookDx).toBe(0);
  });
});

describe("the mouse buttons", () => {
  it("places on the left button and takes away on the right", async () => {
    const canvas = await lockedCanvas();

    press(canvas, { type: "pointerdown", x: 0, y: 0, pointerType: "mouse" });
    expect(input.consume().place).toBe(true);

    press(canvas, {
      type: "pointerdown",
      x: 0,
      y: 0,
      button: 2,
      pointerType: "mouse",
    });
    const held = input.consume();

    expect(held.remove).toBe(true);
    expect(held.removeHeld).toBe(true);
  });

  it("does not repeat while the left button is held", async () => {
    const canvas = await lockedCanvas();

    press(canvas, { type: "pointerdown", x: 0, y: 0, pointerType: "mouse" });
    input.consume();

    // A mouse press is an edge, so a held left button places one voxel rather
    // than a column of them — which is what the touch button is for.
    vi.advanceTimersByTime(2000);

    expect(input.consume().place).toBe(false);
  });

  it("lets go of the right button where the hold began", async () => {
    const canvas = await lockedCanvas();

    press(canvas, {
      type: "pointerdown",
      x: 0,
      y: 0,
      button: 2,
      pointerType: "mouse",
    });
    input.consume();

    press(canvas, {
      type: "pointerup",
      x: 0,
      y: 0,
      button: 2,
      pointerType: "mouse",
    });
    const released = input.consume();

    // A press that merely took the pointer lock is a release of a hold that
    // never started, and reports nothing.
    expect(released.remove).toBe(false);
    expect(released.removeHeld).toBe(false);
  });
});

describe("the touch controls", () => {
  it("flies where the stick is pushed", () => {
    input.setTouchMove(0.5, -0.5);

    const frame = input.consume();

    expect(frame.moveX).toBe(0.5);
    expect(frame.moveY).toBe(-0.5);
  });

  it("adds the stick to the keys rather than replacing them", () => {
    key("keydown", "KeyW");
    input.setTouchMove(0, -0.5);

    // Pushing the stick forwards and holding the key forward is one request for
    // forward, not a request for one and a half.
    expect(input.consume().moveY).toBe(0.5);
  });

  it("holds no further than the stick's full reach", () => {
    input.setTouchMove(4, 4);

    expect(input.consume().moveX).toBe(1);
  });

  it("places once on the press and then repeats while held", () => {
    input.setTouchPlace(true);
    expect(input.consume().place).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(input.consume().place).toBe(true);

    input.setTouchPlace(false);
    vi.advanceTimersByTime(1500);
    expect(input.consume().place).toBe(false);
  });

  it("repeats at one cadence however many times it has been put down", () => {
    const repeated = (): number => {
      let edges = 0;
      for (let tick = 0; tick < 3; tick++) {
        vi.advanceTimersByTime(500);
        if (input.consume().place) {
          edges++;
        }
      }
      return edges;
    };

    input.setTouchPlace(true);
    input.consume();
    expect(repeated()).toBe(3);

    // A button held across the turntable taking the figure over would leave its
    // interval alive, and the one the next hold starts would double the rate.
    input.setEnabled(false);
    input.setEnabled(true);
    input.setTouchPlace(true);
    input.consume();

    expect(repeated()).toBe(3);
  });

  it("takes a voxel away once on the press", () => {
    input.setTouchRemove(true);

    const frame = input.consume();

    expect(frame.remove).toBe(true);
    expect(frame.removeHeld).toBe(true);
  });
});

describe("a touch drag", () => {
  it("turns the view and does nothing else", async () => {
    const canvas = makeCanvas();
    document.body.append(canvas);
    bind(canvas);

    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    press(canvas, { type: "pointermove", x: 130, y: 100 });
    await settle();

    const frame = input.consume();

    expect(frame.lookDx).toBe(30);
    expect(frame.place).toBe(false);
    expect(frame.remove).toBe(false);
  });

  it("is not taken by a second finger", async () => {
    const canvas = makeCanvas();
    document.body.append(canvas);
    bind(canvas);

    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    press(canvas, { type: "pointerdown", x: 200, y: 200, pointerType: "pen" });
    await settle();

    // The first finger is still the one that owns the drag, so the view turns at
    // the speed of one finger however many are down.
    expect(input.consume().lookDx).toBe(0);
  });

  it("is left to a finger once the first is up", async () => {
    const canvas = makeCanvas();
    document.body.append(canvas);
    bind(canvas);

    press(canvas, { type: "pointerdown", x: 100, y: 100 });
    press(canvas, { type: "pointerup", x: 100, y: 100 });
    await settle();
    press(canvas, { type: "pointerdown", x: 200, y: 200 });
    press(canvas, { type: "pointermove", x: 260, y: 200 });
    await settle();

    expect(input.consume().lookDx).toBe(60);
  });
});

describe("disposing", () => {
  it("stops hearing the keyboard", () => {
    input.dispose();
    key("keydown", "KeyW");

    expect(input.consume().moveY).toBe(0);
  });

  it("can be installed again and hear it once", () => {
    input.dispose();
    input.install();
    input.install();
    key("keydown", "KeyW");

    // Installing twice must not leave two listeners, or every key press would
    // count for two.
    expect(input.consume().moveY).toBe(1);
  });
});

describe("the browser's menu", () => {
  it("is held back over the figure, where a right button takes a voxel away", () => {
    const menu = new MouseEvent("contextmenu", { cancelable: true });
    window.dispatchEvent(menu);

    expect(menu.defaultPrevented).toBe(true);
  });

  it("is left alone on the panels, which are drawn with the left button", () => {
    input.setEnabled(false);

    const menu = new MouseEvent("contextmenu", { cancelable: true });
    window.dispatchEvent(menu);

    expect(menu.defaultPrevented).toBe(false);
  });
});

describe("the undo keys", () => {
  const undoKey = (over: Partial<KeyboardEventInit> = {}) => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyZ",
        bubbles: true,
        cancelable: true,
        ...over,
      }),
    );
  };

  it("takes a change back with either modifier a keyboard has", () => {
    for (const modifier of ["ctrlKey", "metaKey"] as const) {
      input.setEnabled(true);
      undoKey({ [modifier]: true });
      expect(input.consume().undo, modifier).toBe(true);
    }
  });

  it("puts it back again with shift held, and with the other letter", () => {
    undoKey({ ctrlKey: true, shiftKey: true });
    expect(input.consume().redo).toBe(true);
    expect(input.consume().undo).toBe(false);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyY",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(input.consume().redo).toBe(true);
  });

  it("leaves the letter alone with no modifier held", () => {
    undoKey();
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyY",
        bubbles: true,
        cancelable: true,
      }),
    );

    // Typing the letter into the frame field is typing, and the field asks for
    // no undo of its own.
    const frame = input.consume();

    expect(frame.undo).toBe(false);
    expect(frame.redo).toBe(false);
  });

  it("asks once however long the key is held", () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyZ",
        ctrlKey: true,
        repeat: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    // A held undo key walking back through every change since would be a way to
    // lose the drawing without meaning to.
    expect(input.consume().undo).toBe(false);
  });

  it("does not fly the camera while it is held", () => {
    undoKey({ ctrlKey: true });
    input.consume();

    // A modifier held down is not a movement key, and a hand undoing has no
    // reason to drift across the figure at the same time.
    expect(input.consume().moveY).toBe(0);
  });
});
