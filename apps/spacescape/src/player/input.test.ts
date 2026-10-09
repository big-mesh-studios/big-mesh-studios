// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInput, type InputController } from "./input";

let controller: InputController | undefined;

const attach = (): InputController => {
  controller = createInput();
  const canvas = document.createElement("canvas");
  controller.attach(canvas);
  return controller;
};

afterEach(() => {
  controller?.dispose();
  controller = undefined;
});

const key = (type: "keydown" | "keyup", code: string): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
};

describe("keyboard movement", () => {
  it("holds a direction until the key is released", () => {
    const input = attach();
    key("keydown", "KeyW");
    expect(input.consume().moveY).toBe(1);
    // Still held: the snapshot is a property of state, not an edge.
    expect(input.consume().moveY).toBe(1);
    key("keyup", "KeyW");
    expect(input.consume().moveY).toBe(0);
  });

  it("adds opposite keys to nothing", () => {
    const input = attach();
    key("keydown", "KeyA");
    key("keydown", "KeyD");
    expect(input.consume().moveX).toBe(0);
  });
});

describe("jump", () => {
  it("is an edge on the frame it is pressed", () => {
    const input = attach();
    key("keydown", "Space");
    const first = input.consume();
    expect(first.jump).toBe(true);
    expect(first.jumpHeld).toBe(true);
    // The edge is gone, the hold stays.
    const second = input.consume();
    expect(second.jump).toBe(false);
    expect(second.jumpHeld).toBe(true);
    key("keyup", "Space");
    expect(input.consume().jumpHeld).toBe(false);
  });
});

describe("use", () => {
  it("is an edge on the frame it is pressed, and never a hold", () => {
    // **A use is a gesture rather than a mode.** Digging and placing are held so that a drag
    // keeps carving; a use at a single instant held down would fire the same interaction every
    // frame while the button was down, which for a conversation means opening and closing a
    // dialog sixty times a second.
    const input = attach();
    key("keydown", "KeyE");
    expect(input.consume().use).toBe(true);
    // **The edge is gone and there is nothing behind it.** No `useHeld` exists, because there is
    // no held state to report.
    expect(input.consume().use).toBe(false);
    expect(input.consume().use).toBe(false);
    key("keyup", "KeyE");
    expect(input.consume().use).toBe(false);
  });

  it("fires once for a key held down, rather than once per repeat", () => {
    // **The `repeat` guard is what stops a held key from being a machine gun**, and it is the
    // reason the edge is behind a `sources` flag rather than just being the raw keydown.
    const input = attach();
    key("keydown", "KeyE");
    expect(input.consume().use).toBe(true);
    key("keydown", "KeyE");
    key("keydown", "KeyE");
    expect(input.consume().use).toBe(false);
    key("keyup", "KeyE");
    key("keydown", "KeyE");
    expect(input.consume().use).toBe(true);
  });

  it("is on E and F, and neither conflicts with the movement keys", () => {
    // **Two keys rather than one, and both beside the movement keys**, so the hand already on
    // WASD does not have to leave it. Neither is a movement key and neither is a browser
    // shortcut a page has to fight for.
    const input = attach();
    key("keydown", "KeyF");
    const snapshot = input.consume();
    expect(snapshot.use).toBe(true);
    expect(snapshot.moveX).toBe(0);
    expect(snapshot.moveY).toBe(0);
  });

  it("does not fire while the player is typing into a field", () => {
    // **The console's command input above all**, and the reason `isEditableTarget` is shared by
    // every listener rather than reimplemented per key: a place whose whole world is written at a
    // console would otherwise use something every time somebody typed an `e`.
    const input = attach();
    const field = document.createElement("input");
    document.body.appendChild(field);
    field.focus();
    field.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyE", bubbles: true }),
    );
    expect(input.consume().use).toBe(false);
    field.remove();
    field.blur();
  });
});

describe("touch", () => {
  it("reports the joystick direction", () => {
    const input = attach();
    input.setTouchMove(0.5, -0.25);
    const snap = input.consume();
    expect(snap.moveX).toBe(0.5);
    expect(snap.moveY).toBe(-0.25);
  });

  it("emits a dig edge once and holds while held", () => {
    const input = attach();
    input.setTouchPrimary(true);
    const first = input.consume();
    expect(first.primary).toBe(true);
    expect(first.primaryHeld).toBe(true);
    const second = input.consume();
    expect(second.primary).toBe(false);
    expect(second.primaryHeld).toBe(true);
    input.setTouchPrimary(false);
    expect(input.consume().primaryHeld).toBe(false);
  });

  it("reports a place release", () => {
    const input = attach();
    input.setTouchSecondary(true);
    expect(input.consume().secondary).toBe(true);
    input.setTouchSecondary(false);
    expect(input.consume().secondaryReleased).toBe(true);
  });

  it("queues a jump from a button", () => {
    const input = attach();
    input.queueJump();
    expect(input.consume().jump).toBe(true);
  });

  it("accumulates a look delta and drains it", () => {
    const input = attach();
    input.addLookDelta(4, -3);
    input.addLookDelta(1, 1);
    const snap = input.consume();
    expect(snap.lookDx).toBe(5);
    expect(snap.lookDy).toBe(-2);
    expect(input.consume().lookDx).toBe(0);
  });
});

/**
 * The pointer lock, and the console's hold on it.
 *
 * jsdom implements neither the lock nor its events, so the lock is stubbed here
 * and driven the way a browser drives it: `exitPointerLock` clears
 * `pointerLockElement` and dispatches the change, which is the whole of what the
 * controller observes.
 */
describe("pointer lock suspension", () => {
  let exitPointerLock: ReturnType<typeof vi.fn>;

  /** Attaches an input and takes the pointer lock the way a click would. */
  const locking = (): InputController => {
    const element = document.createElement("canvas");
    document.body.append(element);
    const input = createInput();
    input.attach(element);
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      value: element,
    });
    document.dispatchEvent(new Event("pointerlockchange"));
    expect(input.pointerLocked()).toBe(true);
    return input;
  };

  beforeEach(() => {
    exitPointerLock = vi.fn(() => {
      Object.defineProperty(document, "pointerLockElement", {
        configurable: true,
        value: null,
      });
      document.dispatchEvent(new Event("pointerlockchange"));
    });
    document.exitPointerLock = exitPointerLock as unknown as () => void;
  });

  it("reports itself suspended for as long as it is held", () => {
    const input = attach();
    const release = input.suspendPointerLock();
    expect(input.pointerLockSuspended()).toBe(true);
    release();
    expect(input.pointerLockSuspended()).toBe(false);
  });

  it("does not ask for a lock to be let go that was never taken", () => {
    const input = attach();
    input.suspendPointerLock();
    expect(exitPointerLock).not.toHaveBeenCalled();
  });

  it("lets the lock go rather than only reporting that it has", () => {
    const input = locking();
    const release = input.suspendPointerLock();
    expect(exitPointerLock).toHaveBeenCalledOnce();
    expect(input.pointerLocked()).toBe(false);

    release();
    // Deliberately not re-taken: the canvas asks for it again on the next
    // click, which is the same prompt the game already shows. See ADR 0010.
    expect(input.pointerLocked()).toBe(false);
  });

  it("waits for the last of several holders before letting the lock go", () => {
    const input = attach();
    const first = input.suspendPointerLock();
    const second = input.suspendPointerLock();
    expect(exitPointerLock).not.toHaveBeenCalled();

    first();
    expect(input.pointerLockSuspended()).toBe(true);
    second();
    expect(input.pointerLockSuspended()).toBe(false);
  });

  it("ignores a holder that has already let go", () => {
    const input = attach();
    const release = input.suspendPointerLock();
    release();
    release();
    // A double release must not corrupt the holds, or every later suspension
    // would read as a second one and never let the lock go again.
    expect(input.pointerLockSuspended()).toBe(false);
    const again = input.suspendPointerLock();
    expect(input.pointerLockSuspended()).toBe(true);
    again();
    expect(input.pointerLockSuspended()).toBe(false);
  });

  it("does not let a disposer running after a teardown take the lock back", () => {
    // The console holds the lock open, something tears the controller down under
    // it, and the console's own disposer then runs. Its hold is already gone, so
    // it must find nothing of its own to release — and the next suspension must
    // be read as the first one again.
    const input = attach();
    const release = input.suspendPointerLock();
    input.dispose();
    expect(input.pointerLockSuspended()).toBe(false);
    release();

    const again = input.suspendPointerLock();
    expect(input.pointerLockSuspended()).toBe(true);
    again();
    expect(input.pointerLockSuspended()).toBe(false);
  });

  it("reports each edge once", () => {
    const input = attach();
    const listener = vi.fn();
    const stop = input.onPointerLockSuspensionChange(listener);

    const first = input.suspendPointerLock();
    const second = input.suspendPointerLock();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith(true);

    // Still a holder outstanding, so releasing either is not an edge.
    first();
    expect(listener).toHaveBeenCalledOnce();
    second();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(false);

    stop();
  });

  it("stops reporting once the holder has unsubscribed", () => {
    const input = attach();
    const listener = vi.fn();
    const stop = input.onPointerLockSuspensionChange(listener);
    stop();
    input.suspendPointerLock();
    expect(listener).not.toHaveBeenCalled();
  });

  it("drops a suspension held across a teardown", () => {
    const input = attach();
    input.suspendPointerLock();
    input.dispose();
    expect(input.pointerLockSuspended()).toBe(false);
    // And the count is back where it started, so the next suspension is read
    // as the first one again rather than as a second.
    const release = input.suspendPointerLock();
    expect(input.pointerLockSuspended()).toBe(true);
    release();
    expect(input.pointerLockSuspended()).toBe(false);
  });
});
