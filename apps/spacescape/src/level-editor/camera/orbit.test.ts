// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";

import { createOrbitCameraControl, defaultOrbitRadius } from "./orbit";
import { DEFAULT_FRAME_DISTANCE } from "./CameraControl";

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
});
