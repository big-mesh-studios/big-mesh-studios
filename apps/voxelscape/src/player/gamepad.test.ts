// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createGamepad, readGamepad, type GamepadMemory } from "./gamepad";

/** A standard-mapped gamepad with every stick centred and every button released. */
const pad = (overrides: Partial<Gamepad> = {}): Gamepad =>
  ({
    id: "Backbone One",
    index: 0,
    connected: true,
    mapping: "standard",
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    })),
    ...overrides,
  }) as unknown as Gamepad;

/** Builds a pad with exactly the given button indices pressed. */
const withButtons = (...indices: number[]): Gamepad =>
  pad({
    buttons: Array.from({ length: 16 }, (_, i) => ({
      pressed: indices.includes(i),
      touched: indices.includes(i),
      value: indices.includes(i) ? 1 : 0,
    })),
  });

const NO_MEMORY: GamepadMemory = { left: false, right: false };

const stubPads = (pads: (Gamepad | null)[]): void => {
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => pads,
  });
};

describe("reading a standard gamepad", () => {
  it("ignores a stick resting inside the deadzone", () => {
    const { frame } = readGamepad(
      pad({ axes: [0.1, 0.05, 0.1, 0] }),
      1,
      NO_MEMORY,
    );
    expect(frame.moveX).toBe(0);
    expect(frame.moveY).toBe(0);
    expect(frame.lookDx).toBe(0);
  });

  it("reads the left stick as movement with forward up", () => {
    expect(
      readGamepad(pad({ axes: [1, 0, 0, 0] }), 1, NO_MEMORY).frame.moveX,
    ).toBeCloseTo(1);
    expect(
      readGamepad(pad({ axes: [0, 1, 0, 0] }), 1, NO_MEMORY).frame.moveY,
    ).toBeCloseTo(-1);
  });

  it("scales the right stick's look by the frame's elapsed time", () => {
    expect(
      readGamepad(pad({ axes: [0, 0, 1, 0] }), 0.5, NO_MEMORY).frame.lookDx,
    ).toBeCloseTo(180);
    expect(
      readGamepad(pad({ axes: [0, 0, 0, 1] }), 0.5, NO_MEMORY).frame.lookDy,
    ).toBeCloseTo(180);
  });

  it("maps the face buttons and triggers to the world's actions", () => {
    expect(readGamepad(withButtons(0), 1, NO_MEMORY).frame.jumpHeld).toBe(true);
    expect(readGamepad(withButtons(1), 1, NO_MEMORY).frame.useHeld).toBe(true);
    expect(readGamepad(withButtons(2), 1, NO_MEMORY).frame.primaryHeld).toBe(
      true,
    );
    expect(readGamepad(withButtons(7), 1, NO_MEMORY).frame.primaryHeld).toBe(
      true,
    );
    expect(readGamepad(withButtons(6), 1, NO_MEMORY).frame.secondaryHeld).toBe(
      true,
    );
  });

  it("steps the hotbar once per d-pad press", () => {
    const first = readGamepad(withButtons(14), 1, NO_MEMORY);
    expect(first.frame.step).toBe(-1);

    const held = readGamepad(withButtons(14), 1, first.memory);
    expect(held.frame.step).toBe(0);

    const released = readGamepad(withButtons(), 1, held.memory);
    expect(released.frame.step).toBe(0);

    expect(readGamepad(withButtons(14), 1, released.memory).frame.step).toBe(
      -1,
    );
    expect(readGamepad(withButtons(15), 1, released.memory).frame.step).toBe(1);
  });
});

describe("finding the connected gamepad", () => {
  afterEach(() => {
    delete (navigator as { getGamepads?: unknown }).getGamepads;
  });

  it("reports a pad that appears and disappears", () => {
    const changes: boolean[] = [];
    stubPads([pad()]);
    const controller = createGamepad((connected) => changes.push(connected));

    expect(controller.poll(1)).not.toBeNull();
    expect(controller.connected()).toBe(true);

    stubPads([null]);
    expect(controller.poll(1)).toBeNull();
    expect(controller.connected()).toBe(false);
    expect(changes).toEqual([true, false]);

    controller.dispose();
  });

  it("reads a controller that reports an empty mapping", () => {
    stubPads([pad({ mapping: "" })]);
    const controller = createGamepad();
    expect(controller.poll(1)).not.toBeNull();
    controller.dispose();
  });

  it("ignores a pad that reports a non-standard mapping", () => {
    stubPads([pad({ mapping: "xr-standard" })]);
    const controller = createGamepad();
    expect(controller.poll(1)).toBeNull();
    controller.dispose();
  });
});
