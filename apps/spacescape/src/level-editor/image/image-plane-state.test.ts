/**
 * The reference-image state, against numbers.
 *
 * **The claim worth pinning is that `up` follows `at`.** The image has to lie on the local
 * ground wherever it is dragged, so a state that cached its normal at the origin would tip a
 * reference off the ground the moment it moved — which reads as the tracing tool being wrong
 * rather than as a stale normal. It is a single memo, and this is what keeps it one.
 */
import { describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";
import type { Vec3 } from "@big-mesh-studios/core";

import {
  createImagePlaneState,
  DEFAULT_IMAGE_PLANE_OPACITY,
  DEFAULT_IMAGE_PLANE_WIDTH,
  type ImagePlaneState,
} from "./image-plane-state";

const FLAT_UP: Vec3 = { x: 0, y: 1, z: 0 };

/** Up that varies with position, so a test can tell "derived from at" from "a constant". */
const upAt = (point: Vec3): Vec3 => ({ x: point.x, y: 1, z: point.z });

const state = (): ImagePlaneState =>
  createRoot(() => createImagePlaneState({ upAt }));

const aPng = { bytes: new Uint8Array([1, 2, 3]), mime: "image/png" };

describe("createImagePlaneState", () => {
  it("starts with no image and a sensible default pose", () => {
    const plane = state();
    flush();
    expect(plane.image()).toBeUndefined();
    expect(plane.pose()).toBeUndefined();
    expect(plane.at()).toEqual({ x: 0, y: 0, z: 0 });
    expect(plane.width()).toBe(DEFAULT_IMAGE_PLANE_WIDTH);
    expect(plane.opacity()).toBe(DEFAULT_IMAGE_PLANE_OPACITY);
    expect(plane.visible()).toBe(true);
  });

  it("has a pose only once there is an image", () => {
    const plane = state();
    plane.setImage(aPng);
    flush();
    expect(plane.image()).toBe(aPng);
    expect(plane.pose()).toEqual({
      at: { x: 0, y: 0, z: 0 },
      up: FLAT_UP,
      yaw: 0,
      width: DEFAULT_IMAGE_PLANE_WIDTH,
    });
  });

  it("derives up from where the image is, so it lies on the local ground", () => {
    const plane = state();
    plane.setImage(aPng);
    plane.setAt({ x: 5, y: 0, z: -3 });
    flush();
    // `upAt` here mirrors the point back, which is not a real gravity but does make a stale
    // normal impossible to mistake for a derived one.
    expect(plane.pose()?.up).toEqual({ x: 5, y: 1, z: -3 });
    expect(plane.pose()?.at).toEqual({ x: 5, y: 0, z: -3 });
  });

  it("carries yaw and width into the pose", () => {
    const plane = state();
    plane.setImage(aPng);
    plane.setYaw(0.5);
    plane.setWidth(64);
    flush();
    expect(plane.pose()?.yaw).toBe(0.5);
    expect(plane.pose()?.width).toBe(64);
  });

  it("drops the pose when the image is cleared, but keeps where it was", () => {
    const plane = state();
    plane.setImage(aPng);
    plane.setAt({ x: 1, y: 0, z: 1 });
    plane.clear();
    flush();
    expect(plane.pose()).toBeUndefined();
    // The placement survives, so choosing a new image does not jump back to the origin.
    expect(plane.at()).toEqual({ x: 1, y: 0, z: 1 });
  });

  it("tracks opacity and visibility for the overlay", () => {
    const plane = state();
    plane.setOpacity(0.2);
    plane.setVisible(false);
    flush();
    expect(plane.opacity()).toBe(0.2);
    expect(plane.visible()).toBe(false);
  });
});

describe("the reference a level file carries", () => {
  it("is absent until an image is chosen", () => {
    const plane = state();
    flush();
    expect(plane.reference()).toBeUndefined();
  });

  it("carries the bytes, media type and placement", () => {
    // What the store serializes. The bytes are the same object, so a saved reference keeps
    // the exact file the picker produced.
    const plane = state();
    plane.setImage(aPng);
    plane.setAt({ x: 4, y: 0, z: -2 });
    plane.setYaw(0.3);
    plane.setWidth(80);
    plane.setOpacity(0.25);
    flush();
    expect(plane.reference()).toEqual({
      at: [4, 0, -2],
      yaw: 0.3,
      width: 80,
      opacity: 0.25,
      mime: "image/png",
      bytes: aPng.bytes,
    });
  });

  it("adopts a reference read from a file, placement and all", () => {
    const plane = state();
    const reference = {
      at: [1, 2, 3] as readonly [number, number, number],
      yaw: 1,
      width: 50,
      opacity: 0.7,
      mime: "image/jpeg",
      bytes: new Uint8Array([9, 8]),
    };
    plane.load(reference);
    flush();
    expect(plane.image()).toEqual({
      bytes: reference.bytes,
      mime: "image/jpeg",
    });
    expect(plane.at()).toEqual({ x: 1, y: 2, z: 3 });
    expect(plane.yaw()).toBe(1);
    expect(plane.width()).toBe(50);
    expect(plane.opacity()).toBe(0.7);
    expect(plane.pose()).toBeDefined();
  });
});
