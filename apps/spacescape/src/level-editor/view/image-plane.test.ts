// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { MeshBasicMaterial, Scene, Texture } from "@random-mesh/rmsl/scene";
import { rotate } from "@big-mesh-studios/csg";
import { rotateAboutAxis, type Vec3 } from "@big-mesh-studios/core";

import { createImagePlaneOverlay, imagePlaneQuaternion } from "./image-plane";
import { DEFAULT_IMAGE_PLANE_OPACITY } from "../image/image-plane-state";

/**
 * The image plane's turn and its quad.
 *
 * **The turn is the part that can be silently wrong.** A reference image that is not lying on
 * the ground is a picture at an angle to the thing being traced, which reads as the tool being
 * imprecise rather than as a bad rotation — so the invariants below (the normal stays up, yaw
 * spins in the plane and does not tilt it) are pinned rather than left to the eye.
 */

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** A vector equal to `expected`, to within floating point, which rotation arithmetic never is. */
const pointsAt = (got: Vec3, expected: Vec3): boolean =>
  close(got.x, expected.x) &&
  close(got.y, expected.y) &&
  close(got.z, expected.z);

const UP: Vec3 = { x: 0, y: 1, z: 0 };

describe("imagePlaneQuaternion", () => {
  it("stands the image's own normal up out of the ground", () => {
    // The quad's normal is its local +Z (rmsl's `PlaneGeometry` lies in XY), so the whole job
    // of the turn is to carry +Z onto the ground's up.
    const turn = imagePlaneQuaternion(UP, 0);
    expect(pointsAt(rotate({ x: 0, y: 0, z: 1 }, turn), UP)).toBe(true);
  });

  it("keeps the normal on up however the image is twisted", () => {
    // Yaw must spin the image and not tilt it. A tilt here is the picture leaning off the
    // ground, which the tracing tools would then be drawn against at an angle.
    for (const yaw of [0, 0.3, Math.PI / 2, Math.PI, 4.2, -1.1]) {
      const turn = imagePlaneQuaternion(UP, yaw);
      expect(pointsAt(rotate({ x: 0, y: 0, z: 1 }, turn), UP)).toBe(true);
    }
  });

  it("turns the image within its own plane, so yaw is a spin and not a tilt", () => {
    // The image's local +X before and after a yaw differ by exactly a turn about the normal.
    const yaw = 0.7;
    const origin = rotate({ x: 1, y: 0, z: 0 }, imagePlaneQuaternion(UP, 0));
    const twisted = rotate({ x: 1, y: 0, z: 0 }, imagePlaneQuaternion(UP, yaw));
    expect(pointsAt(twisted, rotateAboutAxis(origin, UP, yaw))).toBe(true);
  });

  it("falls back to world up for a normal of no length", () => {
    // Same default as `planeThrough`: a zero up is a plane with no directions at all.
    const turn = imagePlaneQuaternion({ x: 0, y: 0, z: 0 }, 0);
    expect(pointsAt(rotate({ x: 0, y: 0, z: 1 }, turn), UP)).toBe(true);
  });

  it("gives the same turn for a yaw and a full turn around", () => {
    const once = imagePlaneQuaternion(UP, 0.4);
    const full = imagePlaneQuaternion(UP, 0.4 + Math.PI * 2);
    const probe = { x: 0.3, y: 0, z: 0.9 };
    expect(pointsAt(rotate(probe, once), rotate(probe, full))).toBe(true);
  });
});

describe("the image plane overlay", () => {
  it("is hidden until it is given an image", () => {
    const scene = new Scene();
    const overlay = createImagePlaneOverlay(scene);
    expect(overlay.mesh.visible).toBe(false);
    overlay.dispose();
  });

  it("sizes the quad to the image's aspect and lays it at the pose", () => {
    const scene = new Scene();
    const overlay = createImagePlaneOverlay(scene);
    overlay.setImage(new Texture(), 2);
    overlay.setPose({
      at: { x: 1, y: 2, z: 3 },
      up: UP,
      yaw: 0,
      width: 10,
    });

    expect(overlay.mesh.position).toMatchObject({ x: 1, y: 2, z: 3 });
    // Width across, height = width ÷ aspect.
    expect(overlay.mesh.scale).toMatchObject({ x: 10, y: 5 });
    overlay.dispose();
  });

  it("resizes the quad when the aspect arrives after the pose", () => {
    // The decode is async, so the pose is applied first, while the overlay still has its square
    // fallback aspect. When the texture lands the quad must reshape itself then and there — not
    // wait for the next width, move or turn, which is the bug where a picture stayed square until
    // it was touched.
    const scene = new Scene();
    const overlay = createImagePlaneOverlay(scene);
    overlay.setPose({ at: { x: 0, y: 0, z: 0 }, up: UP, yaw: 0, width: 10 });
    expect(overlay.mesh.scale).toMatchObject({ x: 10, y: 10 });

    overlay.setImage(new Texture(), 2);
    expect(overlay.mesh.scale).toMatchObject({ x: 10, y: 5 });
    overlay.dispose();
  });

  it("carries the pose's turn onto the mesh", () => {
    const scene = new Scene();
    const overlay = createImagePlaneOverlay(scene);
    overlay.setImage(new Texture(), 1);
    overlay.setPose({ at: { x: 0, y: 0, z: 0 }, up: UP, yaw: 0, width: 4 });

    const expected = imagePlaneQuaternion(UP, 0);
    expect(overlay.mesh.quaternion).toMatchObject(expected);
    overlay.dispose();
  });

  it("shows, hides and changes opacity through its own state", () => {
    const scene = new Scene();
    const overlay = createImagePlaneOverlay(scene);
    const material = overlay.mesh.material as MeshBasicMaterial;
    expect(material.opacity).toBe(DEFAULT_IMAGE_PLANE_OPACITY);

    overlay.setVisible(true);
    expect(overlay.mesh.visible).toBe(true);

    overlay.setOpacity(0.2);
    expect(material.opacity).toBe(0.2);

    overlay.setVisible(false);
    expect(overlay.mesh.visible).toBe(false);
    overlay.dispose();
  });

  it("takes itself back out, so a closed editor leaves nothing in the world", () => {
    const scene = new Scene();
    const overlay = createImagePlaneOverlay(scene);
    expect(scene.children).toContain(overlay.mesh);

    overlay.dispose();
    expect(scene.children).not.toContain(overlay.mesh);
  });
});
