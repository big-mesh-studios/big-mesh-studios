import { flush } from "solid-js";
import { describe, expect, it } from "vitest";
import { Vector3 } from "@random-mesh/rmsl/scene";
import { KitControlsCore } from "./KitCameraControl";
import { rigLookingAt } from "./rig";

const makeCore = () =>
  new KitControlsCore({
    projectPtToScreen: () => undefined,
    mousePos: () => undefined,
    mouseRay: () => undefined,
    pickingDist: () => undefined,
  });

const mouse = (partial: Partial<MouseEvent>): MouseEvent =>
  partial as MouseEvent;

const startOrbit = (core: KitControlsCore) => {
  const target = new Vector3(0, 0, 0);
  core.setOrbitTarget(target);
  core.setSpace(rigLookingAt(new Vector3(0, 0, 10), target)!);
  flush();
  core.onMouseDown(
    mouse({ button: 2, shiftKey: false, clientX: 0, clientY: 0 }),
  );
  flush();
};

describe("KitControlsCore orbit", () => {
  it("turns 0.6 degrees per pixel of drag, keeping its distance", () => {
    const core = makeCore();
    startOrbit(core);

    core.onMouseMove(mouse({ clientX: 100, clientY: 0 }));
    flush();

    const space = core.space();
    expect(space.origin.clone().sub(core.orbitTarget()).length()).toBeCloseTo(
      10,
      5,
    );
    // A 100px drag is a 60 degree yaw about +y.
    const yaw = (Math.atan2(space.origin.x, space.origin.z) * 180) / Math.PI;
    expect(yaw).toBeCloseTo(-60, 1);
  });

  it("does not orbit on the left mouse button", () => {
    const core = makeCore();
    const target = new Vector3(0, 0, 0);
    core.setOrbitTarget(target);
    const start = rigLookingAt(new Vector3(0, 0, 10), target)!;
    core.setSpace(start);
    flush();

    core.onMouseDown(
      mouse({ button: 0, shiftKey: false, clientX: 0, clientY: 0 }),
    );
    flush();
    core.onMouseMove(mouse({ clientX: 100, clientY: 0 }));
    flush();

    expect(core.space().origin.equals(start.origin)).toBe(true);
  });
});
