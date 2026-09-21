import { PerspectiveCamera, Vector3 } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";
import type { InputController, InputSnapshot } from "../../player/create-input";
import type { PlayerWorld } from "../../player/player";
import { NoClipCameraControl } from "./NoClipCameraControl";

const EMPTY_INPUT: InputSnapshot = {
  moveX: 0,
  moveY: 0,
  jump: false,
  jumpHeld: false,
  lookDx: 0,
  lookDy: 0,
  primary: false,
  primaryHeld: false,
  click: false,
  secondary: false,
  secondaryHeld: false,
  secondaryReleased: false,
  use: false,
  select: null,
  wheel: 0,
};

/** An input controller that always reports `snapshot` and records nothing. */
const stubInput = (snapshot: InputSnapshot): InputController =>
  ({ consume: () => snapshot }) as unknown as InputController;

/** A world the free-fly integrator never needs to read: nothing blocks it. */
const openWorld: PlayerWorld = {
  getGroundHeightAt: () => -Infinity,
  getInWaterAt: () => false,
  getSolidAt: () => false,
  halfExtent: 1000,
};

const makeControl = (
  camera: PerspectiveCamera,
  snapshot: InputSnapshot = EMPTY_INPUT,
): NoClipCameraControl =>
  new NoClipCameraControl({
    input: stubInput(snapshot),
    getActiveCamera: () => camera,
    world: openWorld,
  });

describe("NoClipCameraControl", () => {
  it("adopts the camera's pose, then places it back where it was", () => {
    const source = new PerspectiveCamera(50, 1, 0.1, 1000);
    source.position.set(4, 7, -3);
    source.lookAt(4, 6, 0);

    const target = new Vector3(4, 7, 0);
    const control = makeControl(source);
    control.enabled = true;
    control.syncFromCamera(source, target);
    control.update(0);

    expect(source.position.x).toBeCloseTo(4, 5);
    expect(source.position.y).toBeCloseTo(7, 5);
    expect(source.position.z).toBeCloseTo(-3, 5);

    const direction = source.getWorldDirection(new Vector3());
    const original = new Vector3(0, -1, 3).normalize();
    expect(direction.x).toBeCloseTo(original.x, 5);
    expect(direction.y).toBeCloseTo(original.y, 5);
    expect(direction.z).toBeCloseTo(original.z, 5);
  });

  it("flies toward the look direction while moveY is forward", () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 1);
    const control = makeControl(camera, { ...EMPTY_INPUT, moveY: 1 });
    control.enabled = true;
    control.syncFromCamera(camera, new Vector3(0, 0, 1));

    const before = control.target;
    control.update(1);

    const after = control.target;
    expect(after.z).toBeGreaterThan(before.z);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it("does not move while disabled", () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 1);
    const control = makeControl(camera, { ...EMPTY_INPUT, moveY: 1 });
    control.syncFromCamera(camera, new Vector3(0, 0, 1));
    const before = control.target;

    control.enabled = false;
    control.update(1);

    expect(control.target.z).toBe(before.z);
  });
});
