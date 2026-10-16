/**
 * The draw-lines state machine, against numbers.
 *
 * **The two claims worth a test rather than a screen are "release commits nothing" and "the
 * next line starts somewhere else".** Both are ways the gesture could look right while doing
 * the wrong thing: a controller that committed on release would place a point wherever a
 * finger happened to lift, and one that always chained would weld a doorway to the corner it
 * was meant to run away from. Neither shows up as a crash — only as a wall in the wrong place
 * — so they are pinned here.
 *
 * The world is flat and the projection is onto the plane's own axes, so every expected number
 * is a world coordinate and the tests are about the state machine rather than about a camera.
 */
import { describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";
import type { Vec3 } from "@big-mesh-studios/core";
import type { Ray } from "@big-mesh-studios/picking";

import { planeThrough, rayPlanePoint } from "./plane";
import {
  createDrawLinesController,
  type DrawLinesController,
  type DrawLinesSnapshot,
} from "./draw-lines-controller";

const FLAT_UP: Vec3 = { x: 0, y: 1, z: 0 };
const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

/** A ray dropped straight down that meets the flat ground at `(x, 0, z)`. */
const rayTo = (x: number, z: number): Ray => ({
  origin: { x, y: 10, z },
  direction: { x: 0, y: -1, z: 0 },
});

const controllerOver = (): DrawLinesController =>
  createRoot(() =>
    createDrawLinesController({
      groundAt: (ray) => rayPlanePoint(ray, planeThrough(ORIGIN, FLAT_UP)),
      upAt: () => FLAT_UP,
      // Onto the plane's own axes, so a world point and its screen point are the same pair.
      projectToScreen: (point) => ({ x: point.x, y: point.z }),
      snapRadius: 5,
    }),
  );

/** Flushes, then reads — the state signal is a plain one, but the store's own tests set the habit. */
const view = (controller: DrawLinesController): DrawLinesSnapshot => {
  flush();
  return controller.state();
};

/** A press on the ground at `(x, z)`, which establishes the plane the first time. */
const press = (controller: DrawLinesController, x: number, z: number): void => {
  controller.begin({ x, y: z }, rayTo(x, z));
};

/** A controller seeded with a square outline, which is what the floor node editor opens on. */
const seeded = (): DrawLinesController => {
  const controller = controllerOver();
  controller.seed(planeThrough(ORIGIN, FLAT_UP), [
    [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 0, z: 10 },
    ],
  ]);
  return controller;
};

/** Aims at the ground point `(x, z)`; the pointer shares the point, so nothing snaps. */
const aimAt = (controller: DrawLinesController, x: number, z: number): void => {
  controller.aim({ x, y: z }, rayTo(x, z));
};

describe("begin", () => {
  it("establishes the plane and the first point", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    const state = view(controller);
    expect(state.active).toBe(true);
    expect(state.chains).toEqual([[ORIGIN]]);
    // Nothing has aimed, so there is no segment and nothing to commit.
    expect(state.canCommit).toBe(false);
    expect(state.canFinish).toBe(false);
  });

  it("answers false, and changes nothing, for a ray that meets no ground", () => {
    const controller = controllerOver();
    // Straight up: it meets the ground behind its own origin, so there is no ground point.
    const began = controller.begin(
      { x: 0, y: 0 },
      { origin: { x: 0, y: 5, z: 0 }, direction: { x: 0, y: 1, z: 0 } },
    );
    expect(began).toBe(false);
    expect(view(controller).active).toBe(false);
  });
});

describe("aim and commit", () => {
  it("puts the aim where the ray meets the plane", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    expect(view(controller).aim).toEqual({ x: 10, y: 0, z: 0 });
    expect(view(controller).canCommit).toBe(true);
  });

  it("appends the aim to the current chain and clears it", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    controller.commit();
    const state = view(controller);
    expect(state.chains).toEqual([[ORIGIN, { x: 10, y: 0, z: 0 }]]);
    expect(state.aim).toBeUndefined();
    expect(state.canFinish).toBe(true);
  });

  it("ignores a segment of no length, so a stray tap adds no point", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    // A pointer a pixel from the only vertex: it snaps onto it, and committing that would be
    // a zero-length wall.
    controller.aim({ x: 1, y: 1 }, rayTo(30, 30));
    expect(view(controller).aim).toEqual(ORIGIN);
    controller.commit();
    const state = view(controller);
    expect(state.chains).toEqual([[ORIGIN]]);
    expect(state.aim).toEqual(ORIGIN);
  });
});

describe("newLine", () => {
  it("begins a disconnected chain whose first point is placed next", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    controller.commit();

    controller.newLine();
    let state = view(controller);
    expect(state.chains).toHaveLength(2);
    expect(state.chains[1]).toEqual([]);
    expect(state.canNewLine).toBe(false);

    aimAt(controller, 0, 20);
    controller.commit();
    state = view(controller);
    // **The second chain starts at `(0, 20)` and not at `(10, 0)`**, which is the whole of what
    // `newLine` is for.
    expect(state.chains[1]).toEqual([{ x: 0, y: 0, z: 20 }]);
    expect(state.canFinish).toBe(true);
  });

  it("does nothing before there is a chain, and nothing on an empty one", () => {
    const controller = controllerOver();
    controller.newLine();
    expect(view(controller).chains).toHaveLength(0);

    press(controller, 0, 0);
    controller.newLine();
    expect(view(controller).chains).toHaveLength(1);
  });
});

describe("undoPoint", () => {
  it("takes back the last placed point", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    controller.commit();
    controller.undoPoint();
    expect(view(controller).chains).toEqual([[ORIGIN]]);
  });

  it("takes away the empty chain that newLine made", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    controller.commit();
    controller.newLine();
    controller.undoPoint();
    const state = view(controller);
    expect(state.chains).toHaveLength(1);
    expect(state.chains[0]).toHaveLength(2);
  });
});

describe("finish", () => {
  it("answers nothing until a chain has a segment", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    expect(controller.finish()).toBeUndefined();
  });

  it("hands back every chain that reached a segment, and drops the ones that did not", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    controller.commit();
    controller.newLine(); // left empty on purpose
    const walls = controller.finish();
    expect(walls?.chains).toHaveLength(1);
    expect(walls?.chains[0]).toHaveLength(2);
  });
});

describe("snapping and locks", () => {
  it("snaps the aim onto a placed vertex the pointer is over", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    controller.commit();
    // A pointer within the radius of the first vertex, whatever the ray would otherwise hit.
    controller.aim({ x: 0.5, y: 0.5 }, rayTo(30, 30));
    expect(view(controller).aim).toEqual(ORIGIN);
  });

  it("holds the segment along the first plane axis for lock `a`", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    controller.setLock("a");
    aimAt(controller, 6, 8);
    // Off the axis by a lot, and locked back onto it at the distance along the axis.
    expect(view(controller).aim).toEqual({ x: 6, y: 0, z: 0 });
    expect(view(controller).lock).toBe("a");
  });
});

describe("typed length and angle", () => {
  it("re-derives the aim at the length asked for, keeping the turn", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 6, 8);
    const before = view(controller).angle;
    controller.setLength(20);
    const state = view(controller);
    expect(state.length).toBeCloseTo(20, 9);
    expect(state.angle).toBeCloseTo(before, 9);
  });

  it("re-derives the aim at the turn asked for, keeping the length", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 6, 8);
    controller.setAngle(0);
    const state = view(controller);
    expect(state.angle).toBeCloseTo(0, 9);
    expect(state.length).toBeCloseTo(10, 9);
    expect(state.aim).toEqual({ x: 10, y: 0, z: 0 });
  });
});

describe("seed and reset", () => {
  it("adopts a plane and chains, for a redraw", () => {
    const controller = controllerOver();
    controller.seed(planeThrough(ORIGIN, FLAT_UP), [
      [ORIGIN, { x: 10, y: 0, z: 0 }],
      [{ x: 0, y: 0, z: 20 }],
    ]);
    const state = view(controller);
    expect(state.active).toBe(true);
    expect(state.chains).toHaveLength(2);
    expect(state.canFinish).toBe(true);
  });

  it("throws the whole draw away", () => {
    const controller = controllerOver();
    press(controller, 0, 0);
    aimAt(controller, 10, 0);
    controller.commit();
    controller.reset();
    const state = view(controller);
    expect(state.active).toBe(false);
    expect(state.chains).toHaveLength(0);
    expect(state.canFinish).toBe(false);
  });
});

describe("the floor node editor", () => {
  it("picks the nearest vertex within the snap radius", () => {
    const controller = seeded();
    // Screen points are (x, z), so a pointer just off (10, 0) picks point 1.
    expect(controller.pickPoint({ x: 10.5, y: 0.5 })).toBe(true);
    expect(view(controller).picked).toEqual({ chain: 0, point: 1 });
  });

  it("clears the pick on a miss", () => {
    const controller = seeded();
    expect(controller.pickPoint({ x: 10, y: 0 })).toBe(true);
    expect(controller.pickPoint({ x: 100, y: 100 })).toBe(false);
    expect(view(controller).picked).toBeUndefined();
  });

  it("moves the picked vertex to a world point", () => {
    const controller = seeded();
    controller.pickPoint({ x: 10, y: 0 });
    controller.movePicked({ x: 12, y: 5, z: 1 });
    expect(view(controller).chains[0]![1]).toEqual({ x: 12, y: 5, z: 1 });
  });

  it("inserts a corner at the midpoint beside the picked one", () => {
    const controller = seeded();
    controller.pickPoint({ x: 0, y: 0 });
    controller.insertPicked("after");
    const state = view(controller);
    expect(state.chains[0]).toHaveLength(5);
    // The midpoint of (0, 0) and (10, 0).
    expect(state.chains[0]![1]).toEqual({ x: 5, y: 0, z: 0 });
    // **The new corner is picked**, so a second insert acts beside it rather than on the original.
    expect(state.picked).toEqual({ chain: 0, point: 1 });
  });

  it("wraps 'before' at the seam, so the first corner's neighbour is the last", () => {
    const controller = seeded();
    controller.pickPoint({ x: 0, y: 0 });
    controller.insertPicked("before");
    const state = view(controller);
    expect(state.chains[0]).toHaveLength(5);
    // The midpoint of the last point (0, 10) and the first (0, 0), inserted at the front.
    expect(state.chains[0]![0]).toEqual({ x: 0, y: 0, z: 5 });
    expect(state.picked).toEqual({ chain: 0, point: 0 });
  });

  it("does nothing without a pick", () => {
    const controller = seeded();
    controller.movePicked({ x: 1, y: 1, z: 1 });
    controller.insertPicked("after");
    const state = view(controller);
    expect(state.chains[0]).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 0, z: 10 },
    ]);
  });
});

describe("deleteSegment", () => {
  it("splits the chain when a middle segment goes", () => {
    const controller = seeded();
    controller.deleteSegment(1);
    const chains = view(controller).chains;
    expect(chains).toHaveLength(2);
    expect(chains[0]).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ]);
    expect(chains[1]).toEqual([
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 0, z: 10 },
    ]);
  });

  it("trims the chain when an end segment goes", () => {
    const controller = seeded();
    controller.deleteSegment(0);
    expect(view(controller).chains[0]).toEqual([
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 0, z: 10 },
    ]);
  });

  it("does nothing for an index that names no segment", () => {
    const controller = seeded();
    controller.deleteSegment(99);
    expect(view(controller).chains[0]).toHaveLength(4);
  });
});
