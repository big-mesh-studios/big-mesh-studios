import { describe, expect, it } from "vitest";
import { Matrix4, PerspectiveCamera } from "@random-mesh/rmsl/scene";

import {
  boxInFrustum,
  frustumPlanes,
  OcclusionCuller,
  type Occludable,
} from "./occlusion";

/**
 * The frustum test, and the culler's use of it.
 *
 * The maths is the part worth checking: a plane extraction that is one element out hides the world
 * in front of the camera and draws the world behind it, and neither shows up as a crash. The
 * occlusion pass needs a GL context and is left to the app; what can be tested without one is that
 * a box is ruled out only when it is genuinely outside the view, and that `update` hides such a box
 * even when the culler's own pass is switched off.
 */

/** A camera at the origin looking down -Z, which is the frustum these tests assume. */
const lookingDownNegativeZ = (): PerspectiveCamera => {
  const camera = new PerspectiveCamera(50, 1, 1, 1000);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);
  camera.updateMatrixWorld(true);
  return camera;
};

const planesOf = (camera: PerspectiveCamera): ReturnType<typeof frustumPlanes> => {
  const viewProjection = new Matrix4()
    .copy(camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse);
  return frustumPlanes(viewProjection);
};

describe("frustumPlanes", () => {
  it("keeps a box in front of the camera", () => {
    const planes = planesOf(lookingDownNegativeZ());
    expect(boxInFrustum([-1, -1, -20], [1, 1, -10], planes)).toBe(true);
  });

  it("rejects a box behind the camera", () => {
    const planes = planesOf(lookingDownNegativeZ());
    expect(boxInFrustum([-1, -1, 10], [1, 1, 20], planes)).toBe(false);
  });

  it("rejects a box past the far plane", () => {
    const planes = planesOf(lookingDownNegativeZ());
    expect(boxInFrustum([-1, -1, -2000], [1, 1, -1500], planes)).toBe(false);
  });

  it("rejects a box far off to one side", () => {
    const planes = planesOf(lookingDownNegativeZ());
    expect(boxInFrustum([500, -1, -20], [600, 1, -10], planes)).toBe(false);
  });

  it("keeps a box straddling the near plane", () => {
    const planes = planesOf(lookingDownNegativeZ());
    expect(boxInFrustum([-1, -1, -2], [1, 1, 2], planes)).toBe(true);
  });

  it("rejects a box just outside a side plane at depth", () => {
    const planes = planesOf(lookingDownNegativeZ());
    // At 20 units the 50° frustum is about 9.3 wide on each side; 40 is well outside.
    expect(boxInFrustum([40, -1, -20], [41, 1, -19], planes)).toBe(false);
  });

  it("writes into the array it is given rather than allocating", () => {
    const out: ReturnType<typeof frustumPlanes> = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const returned = frustumPlanes(
      new Matrix4().copy(lookingDownNegativeZ().projectionMatrix),
      out,
    );
    expect(returned).toBe(out);
    expect(out[0]).not.toEqual([0, 0, 0, 0]);
  });
});

describe("OcclusionCuller frustum culling", () => {
  const occludable = (
    id: number,
    min: [number, number, number],
    max: [number, number, number],
  ): Occludable & { visible: boolean } => {
    const o = {
      id,
      min,
      max,
      visible: true,
      setVisible(v: boolean) {
        o.visible = v;
      },
    };
    return o;
  };

  it("hides boxes outside the frustum even with the occlusion pass off", () => {
    const culler = new OcclusionCuller();
    culler.enabled = false;
    const inFront = occludable(1, [-1, -1, -20], [1, 1, -10]);
    const behind = occludable(2, [-1, -1, 10], [1, 1, 20]);
    const offSide = occludable(3, [500, -1, -20], [600, 1, -10]);

    // No renderer is touched: `enabled = false` returns before the pass.
    culler.update(
      {} as never,
      lookingDownNegativeZ(),
      [inFront, behind, offSide],
      0,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
    );

    expect(inFront.visible).toBe(true);
    expect(behind.visible).toBe(false);
    expect(offSide.visible).toBe(false);
  });

  it("keeps everything when the camera is inside the box", () => {
    const culler = new OcclusionCuller();
    culler.enabled = false;
    const around = occludable(1, [-100, -100, -100], [100, 100, 100]);

    culler.update(
      {} as never,
      lookingDownNegativeZ(),
      [around],
      0,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
    );

    expect(around.visible).toBe(true);
  });

  it("culls for a camera other than the main one", () => {
    // A feed's eye looking the other way: the box in front of the main camera is behind this one.
    const culler = new OcclusionCuller();
    const inFront = occludable(1, [-1, -1, -20], [1, 1, -10]);
    const behind = occludable(2, [-1, -1, 10], [1, 1, 20]);

    const reversed = new PerspectiveCamera(50, 1, 1, 1000);
    reversed.position.set(0, 0, 0);
    reversed.lookAt(0, 0, 1);
    reversed.updateMatrixWorld(true);

    culler.cullFor(reversed, [inFront, behind]);

    expect(inFront.visible).toBe(false);
    expect(behind.visible).toBe(true);
  });
});
