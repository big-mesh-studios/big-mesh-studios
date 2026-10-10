// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";

import { createOrbitCameraControl, defaultOrbitRadius } from "./orbit";
import { DEFAULT_FRAME_DISTANCE, type CameraPose } from "./CameraControl";

/**
 * The camera's job in the editor is to show a level and to get out of the way.
 *
 * **The property worth testing is the handover**, because that is the only place two
 * implementations of one thing meet. Everything else is `OrbitController`'s, and it has its
 * own tests — duplicating them here would be testing a wrapper by re-testing its guts.
 */

const aCamera = () => {
  const camera = new PerspectiveCamera(50, 1.5, 1, 400000);
  camera.position.set(0, 0, 0);
  camera.updateMatrixWorld(true);
  return camera;
};

describe("the orbit camera", () => {
  it("frames a point by circling it at the distance it was asked for", () => {
    const camera = aCamera();
    const control = createOrbitCameraControl(camera);

    control.frame({ x: 100, y: 20, z: -40 }, 300);
    control.update(0);

    // Circling means the camera is *at* that distance from the target, whatever angle it
    // happened to settle at.
    const pose = control.pose();
    const reach = Math.hypot(
      pose.at.x - pose.target.x,
      pose.at.y - pose.target.y,
      pose.at.z - pose.target.z,
    );
    expect(reach).toBeCloseTo(300, 4);
    expect(pose.target).toMatchObject({ x: 100, y: 20, z: -40 });
  });

  it("asks for a sensible distance when the caller does not say", () => {
    const control = createOrbitCameraControl(aCamera());
    control.frame({ x: 0, y: 0, z: 0 });
    const pose = control.pose();
    const reach = Math.hypot(
      pose.at.x - pose.target.x,
      pose.at.y - pose.target.y,
      pose.at.z - pose.target.z,
    );
    expect(reach).toBeCloseTo(DEFAULT_FRAME_DISTANCE, 4);
  });

  it("says where it is looking, so a handover has something to hand over", () => {
    const camera = aCamera();
    const control = createOrbitCameraControl(camera);
    control.frame({ x: 10, y: 20, z: 30 }, 100);
    control.update(0);

    expect(control.pose().target).toMatchObject({ x: 10, y: 20, z: 30 });
    expect(control.pose().at).not.toMatchObject({ x: 10, y: 20, z: 30 });
  });

  it("takes over a pose without moving the view", () => {
    // The reason `adopt` exists. Re-seeding from defaults instead would put the camera
    // somewhere unrelated to where the person was, and the view would jump on every
    // switch between orbit and no-clip.
    const control = createOrbitCameraControl(aCamera());
    const from = {
      at: { x: 300, y: 100, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    };

    control.adopt(from);
    const pose = control.pose();

    expect(pose.target).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(pose.at.x).toBeCloseTo(300, 4);
    expect(pose.at.y).toBeCloseTo(100, 4);
    expect(pose.at.z).toBeCloseTo(0, 4);
  });

  it("does not drop the camera through the floor when a pose is straight overhead", () => {
    // `phi` of exactly 0 puts the camera above the target where every direction collapses
    // onto one point, so `theta` is meaningless there. A pose handed over from a first-person
    // camera looking at the sky is exactly this, and it must still be usable.
    const control = createOrbitCameraControl(aCamera());
    control.adopt({ at: { x: 0, y: 500, z: 0 }, target: { x: 0, y: 0, z: 0 } });

    const pose = control.pose();
    expect(pose.at.y).toBeCloseTo(500, 4);
    expect(Number.isNaN(pose.at.x)).toBe(false);
    expect(Number.isNaN(pose.at.z)).toBe(false);
  });

  it("survives a pose whose camera and target are the same point", () => {
    const control = createOrbitCameraControl(aCamera());
    control.adopt({ at: { x: 5, y: 5, z: 5 }, target: { x: 5, y: 5, z: 5 } });
    const pose = control.pose();
    expect(Number.isNaN(pose.at.x)).toBe(false);
    expect(Number.isNaN(pose.at.y)).toBe(false);
    expect(Number.isNaN(pose.at.z)).toBe(false);
  });

  it("reports itself as the orbit style", () => {
    expect(createOrbitCameraControl(aCamera()).kind).toBe("orbit");
  });

  it("says it is the orbit style for the toolbar to read", () => {
    // A switch of style has to be showable, and `kind` is the only thing the overlay knows.
    expect(["orbit", "no-clip"]).toContain(
      createOrbitCameraControl(aCamera()).kind,
    );
  });

  it("has a starting radius worth opening with", () => {
    expect(defaultOrbitRadius()).toBeGreaterThan(0);
  });

  /**
   * The editor's left button places; everything else navigates.
   *
   * **This is the whole of the wrapper's job over `OrbitController`'s gestures**, and the
   * reason it is not `OrbitController`'s to get right: `setToolOwnsLeft` declines *every*
   * single-pointer drag and the wheel, not only the ones that began on the left button. Held
   * for as long as the editor is attached — which is what this did — it takes the right-drag
   * orbit and the wheel with it, and the view cannot be moved at all.
   */
  describe("the gestures it takes from the tool", () => {
    /**
     * **jsdom has neither pointer capture nor layout**, so both are stubbed rather than
     * shimmed: neither is what is under test, and every box being zero is what makes the
     * two answers comparable.
     */
    const surface = (): HTMLElement => {
      const canvas = document.createElement("canvas");
      canvas.setPointerCapture = () => {};
      canvas.hasPointerCapture = () => false;
      canvas.releasePointerCapture = () => {};
      canvas.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
      document.body.append(canvas);
      return canvas;
    };

    /**
     * jsdom has no `PointerEvent`, and `OrbitController` keys its bookkeeping on
     * `pointerId` — so the identifier is grafted onto a `MouseEvent` rather than the whole
     * press sequence being faked as plain objects, which `dispatchEvent` will not deliver.
     */
    const pointer = (
      type: string,
      button: number,
      x: number,
      pointerId = 1,
      pointerType = "mouse",
    ): Event => {
      const event = new MouseEvent(type, {
        bubbles: true,
        button,
        clientX: x,
        clientY: 0,
      });
      Object.defineProperty(event, "pointerId", { value: pointerId });
      Object.defineProperty(event, "pointerType", { value: pointerType });
      return event;
    };

    /** A press of `button` and a drag of `dx` pixels, as a browser would deliver them. */
    const drag = (
      canvas: HTMLElement,
      button: number,
      dx: number,
      pointerId = 1,
      pointerType = "mouse",
    ): void => {
      canvas.dispatchEvent(
        pointer("pointerdown", button, 0, pointerId, pointerType),
      );
      canvas.dispatchEvent(
        pointer("pointermove", button, dx, pointerId, pointerType),
      );
      canvas.dispatchEvent(
        pointer("pointerup", button, dx, pointerId, pointerType),
      );
    };

    /** How far the camera is from what it is looking at — the orbit's radius. */
    const reach = (pose: CameraPose): number =>
      Math.hypot(
        pose.at.x - pose.target.x,
        pose.at.y - pose.target.y,
        pose.at.z - pose.target.z,
      );

    it("lets a right-drag orbit, while the editor is attached", () => {
      const control = createOrbitCameraControl(aCamera());
      control.frame({ x: 0, y: 0, z: 0 }, 200);
      const before = control.pose();

      const canvas = surface();
      control.attach(canvas);
      drag(canvas, 2, 120);
      control.update(0);

      const after = control.pose();
      expect(after.at.x).not.toBeCloseTo(before.at.x, 3);
      expect(after.at.z).not.toBeCloseTo(before.at.z, 3);
      control.dispose();
      canvas.remove();
    });

    it("lets the wheel zoom, while the editor is attached", () => {
      const control = createOrbitCameraControl(aCamera());
      control.frame({ x: 0, y: 0, z: 0 }, 200);
      const before = control.pose();

      const canvas = surface();
      control.attach(canvas);
      canvas.dispatchEvent(
        new WheelEvent("wheel", { deltaY: 200, cancelable: true }),
      );
      control.update(0);

      expect(reach(control.pose())).toBeGreaterThan(reach(before));
      control.dispose();
      canvas.remove();
    });

    it("leaves the left drag to the tool, so a click does not swing the view", () => {
      const control = createOrbitCameraControl(aCamera());
      control.frame({ x: 0, y: 0, z: 0 }, 200);
      const before = control.pose();

      const canvas = surface();
      control.attach(canvas);
      drag(canvas, 0, 120);
      control.update(0);

      expect(control.pose().at).toMatchObject({
        x: expect.closeTo(before.at.x, 4),
        y: expect.closeTo(before.at.y, 4),
        z: expect.closeTo(before.at.z, 4),
      });
      control.dispose();
      canvas.remove();
    });

    it("gives a finger the left drag, because a finger is what looks on a phone", () => {
      // **The rule is about the mouse, not the button.** The editor places from a left press
      // and only a mouse left press — on a phone the Apply button places and the drag is left
      // to look (`LevelEditorTouchControls`). Reserving the drag for a finger would take away
      // the only gesture a finger has, which is the dead view this flag caused in the first
      // place.
      const control = createOrbitCameraControl(aCamera());
      control.frame({ x: 0, y: 0, z: 0 }, 200);
      const before = control.pose();

      const canvas = surface();
      control.attach(canvas);
      drag(canvas, 0, 120, 1, "touch");
      control.update(0);

      expect(control.pose().at.x).not.toBeCloseTo(before.at.x, 3);
      control.dispose();
      canvas.remove();
    });

    it("gives the gesture back after the press, so a right-drag works next", () => {
      const control = createOrbitCameraControl(aCamera());
      control.frame({ x: 0, y: 0, z: 0 }, 200);

      const canvas = surface();
      control.attach(canvas);
      drag(canvas, 0, 40);
      const afterLeft = control.pose();
      drag(canvas, 2, 120);
      control.update(0);

      expect(control.pose().at.x).not.toBeCloseTo(afterLeft.at.x, 3);
      control.dispose();
      canvas.remove();
    });

    it("leaves a second finger to the pinch, even mid-press", () => {
      const control = createOrbitCameraControl(aCamera());
      control.frame({ x: 0, y: 0, z: 0 }, 200);
      const before = control.pose();

      const canvas = surface();
      control.attach(canvas);
      // **A real pinch: the two fingers start apart**, past `pinchThreshold`, because a
      // gesture that begins with them touching is two fingers by accident and `OrbitController`
      // deliberately does not act on it.
      canvas.dispatchEvent(pointer("pointerdown", 0, 0, 1));
      canvas.dispatchEvent(pointer("pointerdown", 0, 100, 2));
      canvas.dispatchEvent(pointer("pointermove", 0, 220, 2));
      canvas.dispatchEvent(pointer("pointerup", 0, 220, 2));
      canvas.dispatchEvent(pointer("pointerup", 0, 0, 1));
      control.update(0);

      // **The pinch, not the flag.** Spreading has to reach the radius whatever the flag says,
      // or a zoom begun while one finger was placing would be swallowed.
      expect(reach(control.pose())).not.toBeCloseTo(reach(before), 3);
      control.dispose();
      canvas.remove();
    });
  });
});
