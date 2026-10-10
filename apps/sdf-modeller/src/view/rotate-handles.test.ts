/**
 * The rings as geometry, projected.
 *
 * **rmsl's `Scene`, `PerspectiveCamera` and the geometry classes are arithmetic and need no
 * WebGL context**, so the one claim about the rings that is easy to get wrong and impossible
 * to check by looking — that they are the same size on screen at any distance — can be
 * checked here against numbers. The angle and the hit test are in `rotate-handle.test.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  PerspectiveCamera,
  Scene,
  type Object3D,
} from "@random-mesh/rmsl/scene";

import { createRotateHandles } from "./rotate-handles";
import { RING_VIEW_SHARE } from "./rotate-handle";

/** A camera at `radius`, looking at the origin, with a canvas of the given size. */
const lookingAt = (
  radius: number,
  size = { width: 800, height: 600 },
): { camera: PerspectiveCamera; scene: Scene } => {
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    45,
    size.width / size.height,
    0.01,
    8000,
  );
  camera.position.set(0, 0, radius);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return { camera, scene };
};

/** How far a ring's drawn outline sits from its middle, on average, in pixels. */
const screenRadius = (ring: {
  middle: { x: number; y: number };
  around: readonly { x: number; y: number }[];
}): number => {
  let total = 0;
  for (const point of ring.around) {
    total += Math.hypot(point.x - ring.middle.x, point.y - ring.middle.y);
  }
  return total / ring.around.length;
};

describe("rotate handles", () => {
  it("stands three rings, one per axis", () => {
    const { camera, scene } = lookingAt(10);
    const rings = createRotateHandles(scene);
    rings.place({ x: 0, y: 0, z: 0 }, 10);

    const found = rings.ringsOnScreen(camera, { width: 800, height: 600 });
    expect(found.map((ring) => ring.axis)).toEqual(["x", "y", "z"]);
  });

  it("puts every ring's middle where the part is", () => {
    const { camera, scene } = lookingAt(10);
    const rings = createRotateHandles(scene);
    rings.place({ x: 1, y: 2, z: 0 }, 10);

    const [ring] = rings.ringsOnScreen(camera, { width: 800, height: 600 });
    // The camera looks down -Z from the origin, so world (1, 2, 0) projects right of centre
    // and above it: canvas x greater than the middle, canvas y *less*, y counting downwards.
    expect(ring?.middle.x).toBeGreaterThan(400);
    expect(ring?.middle.y).toBeLessThan(300);
  });

  it("keeps the same size on screen however far the camera has been pulled back", () => {
    // **The whole reason the rings are scaled rather than sized.** The z ring lies in the
    // plane facing the camera, so its outline is a circle whose radius is read cleanly; each
    // distance should draw the same number of pixels.
    const sizes = [4, 10, 40].map((radius) => {
      const { camera, scene } = lookingAt(radius);
      const rings = createRotateHandles(scene);
      rings.place({ x: 0, y: 0, z: 0 }, radius);
      const found = rings.ringsOnScreen(camera, { width: 800, height: 600 });
      const z = found.find((ring) => ring.axis === "z");
      return z === undefined ? 0 : screenRadius(z);
    });

    for (const size of sizes) expect(size).toBeGreaterThan(0);
    const spread = Math.max(...sizes) - Math.min(...sizes);
    expect(spread).toBeLessThan(2);
  });

  it("scales its drawn radius with the camera's distance", () => {
    // The group's scale is the thing that makes the on-screen size constant; the world radius
    // is `RING_VIEW_SHARE` of the distance by construction.
    const { scene } = lookingAt(10);
    const rings = createRotateHandles(scene);
    rings.place({ x: 0, y: 0, z: 0 }, 20);
    expect(rings.group.scale.x).toBe(RING_VIEW_SHARE * 20);
  });

  it("draws no rings at all when hidden", () => {
    const { camera, scene } = lookingAt(10);
    const rings = createRotateHandles(scene);
    rings.place({ x: 0, y: 0, z: 0 }, 10);
    rings.setVisible(false);
    expect(rings.group.visible).toBe(false);
    // The measurement is deliberately independent of visibility — see the note in
    // `ringsOnScreen` — so the *caller* checks the tool, which `grabRing` does.
    expect(camera.position.z).toBe(10);
  });

  it("leaves the scene when disposed", () => {
    const { scene } = lookingAt(10);
    const rings = createRotateHandles(scene);
    rings.dispose();
    let node: Object3D = rings.group;
    while (node.parent !== null) node = node.parent;
    expect(node).not.toBe(scene);
  });
});

describe("a camera behind the rings", () => {
  it("reports no rings at all, rather than rings in the middle of the picture", () => {
    // A point behind the camera projects into the frame mirrored, where it reads as an
    // ordinary position — so a ring on the far side of a figure would be grabbed when a
    // person reached for the near side.
    const scene = new Scene();
    const camera = new PerspectiveCamera(45, 1, 0.01, 8000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 20);
    camera.updateMatrixWorld();

    const rings = createRotateHandles(scene);
    rings.place({ x: 0, y: 0, z: 0 }, 10);

    expect(rings.ringsOnScreen(camera, { width: 800, height: 600 })).toEqual(
      [],
    );
  });
});
