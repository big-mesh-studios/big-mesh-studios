// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { Ray } from "@big-mesh-studios/picking";

import {
  boxContains,
  partBoxHalf,
  partLocalBox,
  pickPart,
  pickPartAt,
  rayBoxDistance,
  rayInPartFrame,
} from "./pick-part";
import { axisAngle, placedPart } from "../model/part";

/**
 * What a tap on the canvas means is a question about which part a person aimed at, and the
 * answers here are not the only possible ones — so each test names the case it pins down.
 *
 * **The two that matter most are the turned part and the box the camera is inside.** A part
 * can be rotated and its box cannot, so picking has to move the ray into the part's frame or
 * a laid-down limb stops being selectable where it is drawn; and a camera inside a subtracted
 * box would otherwise select that box for every tap and nothing built inside it could ever be
 * reached.
 */

const aRay = (
  origin: [number, number, number],
  direction: [number, number, number],
): Ray => ({
  origin: { x: origin[0], y: origin[1], z: origin[2] },
  direction: { x: direction[0], y: direction[1], z: direction[2] },
});

/** A box part at `origin`, unrotated, with a hard edge and an id of its own. */
let made = 0;
const aBox = (
  over: Parameters<typeof placedPart>[1],
  origin: [number, number, number] = [0, 0, 0],
) =>
  placedPart(
    `part-${made++}`,
    over,
    { x: origin[0], y: origin[1], z: origin[2] },
  );

describe("the box a part occupies", () => {
  it("is the primitive's half-extents padded by its softness", () => {
    // `len` is a **half**-size, and `shapePadding` is `softness * 4 + 1`, so a hard box of
    // `len` 10 is half 11 — the same box the mesher stores the surface in.
    const half = partBoxHalf(
      aBox({ type: "Box", len: { x: 10, y: 20, z: 30 } }),
    );
    expect(half).toEqual({ x: 11, y: 21, z: 31 });
    const box = partLocalBox(
      aBox({ type: "Box", len: { x: 10, y: 20, z: 30 } }),
    );
    expect(box.min).toEqual({ x: -11, y: -21, z: -31 });
    expect(box.max).toEqual({ x: 11, y: 21, z: 31 });
  });

  it("admits the reach a soft part has beyond its own box", () => {
    const hard = partBoxHalf(aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } }));
    const soft = partBoxHalf(
      placedPart(
        "soft",
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        { x: 0, y: 0, z: 0 },
        { softness: 0.25 },
      ),
    );
    expect(soft.x).toBeGreaterThan(hard.x);
  });

  it("is as big for every primitive, without a switch here", () => {
    // The half-extents come from the primitive table, so a primitive added later is handled
    // by the table rather than by a second list here (ADR 0025).
    const sphere = partBoxHalf(aBox({ type: "Sphere", radius: 7 }));
    expect(sphere.y).toBeGreaterThanOrEqual(7);
    const cylinder = partBoxHalf(aBox({ type: "Cylinder", len: 20, radius: 5 }));
    expect(cylinder.y).toBeGreaterThan(cylinder.x);
  });
});

describe("a ray crossing a box", () => {
  const box = partLocalBox(aBox({ type: "Box", len: { x: 10, y: 20, z: 30 } }));

  it("reports how far along it the crossing is", () => {
    // The near face is at x = 11 and the ray starts at x = 500, so 489.
    expect(rayBoxDistance(aRay([500, 0, 0], [-1, 0, 0]), box)).toBe(489);
  });

  it("misses when it goes past the side", () => {
    expect(rayBoxDistance(aRay([500, 500, 0], [-1, 0, 0]), box)).toBeUndefined();
  });

  it("reports zero for a box the ray starts inside", () => {
    expect(rayBoxDistance(aRay([0, 0, 0], [1, 0, 0]), box)).toBe(0);
  });

  it("counts a face as a hit", () => {
    expect(boxContains({ x: 11, y: 0, z: 0 }, box)).toBe(true);
    expect(boxContains({ x: 12, y: 0, z: 0 }, box)).toBe(false);
  });
});

describe("a ray in a part's own frame", () => {
  it("moves the origin to the part and leaves the direction turned", () => {
    const part = aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } }, [10, 0, 0]);
    const local = rayInPartFrame(part, aRay([20, 0, 0], [1, 0, 0]));
    expect(local.origin).toEqual({ x: 10, y: 0, z: 0 });
    expect(local.direction).toEqual({ x: 1, y: 0, z: 0 });
  });

  it("turns a ray the way the part is turned", () => {
    // A quarter turn about Z takes the part's own +X onto the world's +Y, so a world ray
    // down +X reads, in the part's frame, as a ray down -Y.
    const part = placedPart(
      "turned",
      { type: "Box", len: { x: 5, y: 5, z: 5 } },
      { x: 0, y: 0, z: 0 },
      { orientation: axisAngle(0, 0, 1, Math.PI / 2) },
    );
    const local = rayInPartFrame(part, aRay([0, 0, 0], [1, 0, 0]));
    expect(local.direction.x).toBeCloseTo(0);
    expect(local.direction.y).toBeCloseTo(-1);
  });
});

describe("a tap on a part", () => {
  it("selects the nearest of several parts crossed", () => {
    const near = aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } }, [5, 0, 0]);
    const far = aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } }, [0, 0, 0]);
    // `near` is listed second and is the one the ray meets first.
    expect(pickPart([far, near], aRay([20, 0, 0], [-1, 0, 0]))?.id).toBe(
      near.id,
    );
  });

  it("does not care what order the fold put them in", () => {
    const near = aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } }, [5, 0, 0]);
    const far = aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } }, [0, 0, 0]);
    expect(pickPart([near, far], aRay([20, 0, 0], [-1, 0, 0]))?.id).toBe(
      near.id,
    );
  });

  it("selects nothing when nothing is there", () => {
    expect(pickPart([], aRay([20, 0, 0], [-1, 0, 0]))).toBeUndefined();
    expect(
      pickPart(
        [aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } }, [0, 50, 0])],
        aRay([20, 0, 0], [-1, 0, 0]),
      ),
    ).toBeUndefined();
  });

  it("reaches only as far as the reach says", () => {
    const part = aBox({ type: "Box", len: { x: 1, y: 1, z: 1 } });
    expect(pickPart([part], aRay([20, 0, 0], [-1, 0, 0]), 5)).toBeUndefined();
  });

  it("selects a part by its turned box, not its upright one", () => {
    // Laid along Y, the box that was long on X is long on Y — so a ray that misses the
    // upright box meets the turned one. This is what moving the ray into the part's frame
    // buys, and without it a part laid on its side cannot be selected where it is drawn.
    const shape = { type: "Box" as const, len: { x: 5, y: 0.5, z: 0.5 } };
    const upright = placedPart("upright", shape, { x: 0, y: 0, z: 0 });
    const turned = placedPart("turned", shape, { x: 0, y: 0, z: 0 }, {
      orientation: axisAngle(0, 0, 1, Math.PI / 2),
    });
    const ray = aRay([-10, 3, 0], [1, 0, 0]);
    expect(pickPart([upright], ray)).toBeUndefined();
    expect(pickPart([turned], ray)?.id).toBe("turned");
  });

  it("does not select a box the camera is inside", () => {
    // A ray starting inside a box enters it at distance zero, so without the skip a box
    // standing in for a room would be selected for every tap and nothing inside it could be.
    const room = placedPart(
      "room",
      { type: "Box", len: { x: 40, y: 40, z: 40 } },
      { x: 0, y: 0, z: 0 },
    );
    expect(pickPart([room], aRay([0, 0, 0], [1, 0, 0]))).toBeUndefined();
  });

  it("still selects a part nested inside the box the camera is in", () => {
    const room = placedPart(
      "room",
      { type: "Box", len: { x: 40, y: 40, z: 40 } },
      { x: 0, y: 0, z: 0 },
    );
    const crate = placedPart(
      "crate",
      { type: "Box", len: { x: 1, y: 1, z: 1 } },
      { x: 10, y: 0, z: 0 },
    );
    expect(
      pickPart([room, crate], aRay([0, 0, 0], [1, 0, 0]))?.id,
    ).toBe("crate");
  });

  it("does not skip a non-box primitive the camera is inside", () => {
    // Only `Box` is skipped: a camera inside a sphere is not the case this exists for, and
    // skipping more would hide parts a person can see.
    const ball = placedPart(
      "ball",
      { type: "Sphere", radius: 40 },
      { x: 0, y: 0, z: 0 },
    );
    expect(pickPart([ball], aRay([0, 0, 0], [1, 0, 0]))?.id).toBe("ball");
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
    const ball = placedPart(
      "ball",
      { type: "Sphere", radius: 1 },
      { x: 0, y: 0, z: 0 },
    );
    expect(pickPartAt([ball], eyeAt([0, 0, 10]), size, middle)?.id).toBe("ball");
  });

  it("finds nothing where a part is not on screen", () => {
    const off = placedPart(
      "off",
      { type: "Sphere", radius: 1 },
      { x: 100, y: 0, z: 0 },
    );
    expect(pickPartAt([off], eyeAt([0, 0, 10]), size, middle)).toBeUndefined();
  });
});
