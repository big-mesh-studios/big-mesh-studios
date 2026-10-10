// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import { primitiveHalfExtents, shapePadding } from "@big-mesh-studios/sdf";
import type { Ray } from "@big-mesh-studios/picking";

import {
  closestPart,
  distanceToPart,
  partBoxHalf,
  partLocalBox,
  pickPart,
  pickPartAt,
  pointInPartFrame,
} from "./pick-part";
import { axisAngle, placedPart } from "../model/part";

/**
 * What a tap on the canvas means is a question about which part a person aimed at, and the
 * answers here are not the only possible ones — so each test names the case it pins down.
 *
 * **The one that matters most is the tap that misses the shape but lands in its box.** A
 * part's box is padded by a whole world unit, so a tap well clear of a small part is inside
 * its box anyway; marching the surface is what tells the two apart, and it is the whole
 * reason this is not a box test.
 */

const aRay = (
  origin: [number, number, number],
  direction: [number, number, number],
): Ray => ({
  origin: { x: origin[0], y: origin[1], z: origin[2] },
  direction: { x: direction[0], y: direction[1], z: direction[2] },
});

/** A part with an id of its own, so a test can say which one came back. */
let made = 0;
const aPart = (
  shape: Parameters<typeof placedPart>[1],
  origin: [number, number, number] = [0, 0, 0],
  overrides: Parameters<typeof placedPart>[3] = {},
) =>
  placedPart(
    `part-${made++}`,
    shape,
    { x: origin[0], y: origin[1], z: origin[2] },
    overrides,
  );

describe("the box a part occupies", () => {
  it("is the primitive's own half-extents", () => {
    // `len` is a **half**-size, and the outline is drawn at that extent — not the padded box
    // the mesher stores, which adds a whole unit of slack.
    const half = partBoxHalf(
      aPart({ type: "Box", len: { x: 10, y: 20, z: 30 } }),
    );
    expect(half).toEqual({ x: 10, y: 20, z: 30 });
    const box = partLocalBox(aPart({ type: "Box", len: { x: 10, y: 20, z: 30 } }));
    expect(box.min).toEqual({ x: -10, y: -20, z: -30 });
    expect(box.max).toEqual({ x: 10, y: 20, z: 30 });
  });

  it("is the primitive's extent and not the mesher's padded one", () => {
    const ball = aPart({ type: "Sphere", radius: 7 });
    expect(partBoxHalf(ball)).toEqual({ x: 7, y: 7, z: 7 });
  });
});

describe("a point in a part's own frame", () => {
  it("moves the point to the part and leaves it facing the same way when it is unturned", () => {
    const part = aPart({ type: "Box", len: { x: 1, y: 1, z: 1 } }, [10, 0, 0]);
    expect(pointInPartFrame(part, { x: 20, y: 0, z: 0 })).toEqual({
      x: 10,
      y: 0,
      z: 0,
    });
  });

  it("turns the point the way the part is turned", () => {
    // A quarter turn about Z takes the part's own +X onto the world's +Y, so a world point
    // one unit up the Y axis is one unit along the part's own X.
    const part = aPart({ type: "Box", len: { x: 5, y: 5, z: 5 } }, [0, 0, 0], {
      orientation: axisAngle(0, 0, 1, Math.PI / 2),
    });
    const local = pointInPartFrame(part, { x: 0, y: 1, z: 0 });
    expect(local.x).toBeCloseTo(1);
    expect(local.y).toBeCloseTo(0);
  });
});

describe("the part nearest a point", () => {
  it("is the one whose surface the point is on", () => {
    const ball = aPart({ type: "Sphere", radius: 1 });
    const other = aPart({ type: "Sphere", radius: 1 }, [10, 0, 0]);
    expect(distanceToPart(ball, { x: 1, y: 0, z: 0 })).toBeCloseTo(0);
    expect(closestPart([other, ball], { x: 1, y: 0, z: 0 })?.id).toBe(ball.id);
  });
});

describe("a tap on a part", () => {
  it("selects the part the ray meets the surface of", () => {
    const ball = aPart({ type: "Sphere", radius: 0.5 });
    expect(pickPart([ball], aRay([-10, 0, 0], [1, 0, 0]))?.id).toBe(ball.id);
  });

  it("does not select a part the tap lands near but not on", () => {
    // The mesher's own box for this part is padded by a whole unit (`shapePadding`), so a ray
    // at y = 1 is **inside that box** — a box pick would select a ball the ray never came near.
    // Marching the surface to where the person can see it does not. This is the precision the
    // field buys, and the reason the tap is no longer shape-approximate.
    const ball = aPart({ type: "Sphere", radius: 0.5 });
    const mesherHalf = primitiveHalfExtents(ball.shape).y;
    expect(mesherHalf + shapePadding(ball.shape, ball.softness)).toBeGreaterThan(
      1,
    );
    expect(pickPart([ball], aRay([-10, 1, 0], [1, 0, 0]))).toBeUndefined();
  });

  it("selects the nearest of several parts the ray crosses", () => {
    const near = aPart({ type: "Sphere", radius: 0.5 }, [5, 0, 0]);
    const far = aPart({ type: "Sphere", radius: 0.5 });
    // `near` is listed second and its surface is the one the ray meets first.
    expect(pickPart([far, near], aRay([20, 0, 0], [-1, 0, 0]))?.id).toBe(
      near.id,
    );
  });

  it("selects nothing when nothing is there", () => {
    expect(pickPart([], aRay([20, 0, 0], [-1, 0, 0]))).toBeUndefined();
    const off = aPart({ type: "Sphere", radius: 0.5 }, [0, 50, 0]);
    expect(pickPart([off], aRay([20, 0, 0], [-1, 0, 0]))).toBeUndefined();
  });

  it("selects a part by its turned surface, not its upright box", () => {
    // Laid along Y, the box that was long on X is long on Y — so a ray that misses the
    // upright box meets the turned one. This is what turning the point into the part's frame
    // buys, and without it a part laid on its side cannot be selected where it is drawn.
    const shape = { type: "Box" as const, len: { x: 2, y: 0.2, z: 0.2 } };
    const upright = aPart(shape);
    const turned = aPart(shape, [0, 0, 0], {
      orientation: axisAngle(0, 0, 1, Math.PI / 2),
    });
    const ray = aRay([-10, 1, 0], [1, 0, 0]);
    expect(pickPart([upright], ray)).toBeUndefined();
    expect(pickPart([turned], ray)?.id).toBe(turned.id);
  });
});

describe("a tap on the canvas", () => {
  /** A camera at `eye` looking at the origin, over a square canvas. */
  const eyeAt = (eye: [number, number, number]): PerspectiveCamera => {
    const camera = new PerspectiveCamera(45, 1, 0.01, 8000);
    camera.position.set(eye[0], eye[1], eye[2]);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return camera;
  };

  const size = { width: 200, height: 200 };
  const middle = { x: 100, y: 100 };

  it("finds the part in the middle of the view", () => {
    const ball = aPart({ type: "Sphere", radius: 1 });
    expect(pickPartAt([ball], eyeAt([0, 0, 10]), size, middle)?.id).toBe(
      ball.id,
    );
  });

  it("finds nothing where a part is not on screen", () => {
    const off = aPart({ type: "Sphere", radius: 1 }, [100, 0, 0]);
    expect(pickPartAt([off], eyeAt([0, 0, 10]), size, middle)).toBeUndefined();
  });
});
