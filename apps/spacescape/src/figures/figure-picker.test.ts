import { describe, expect, it } from "vitest";

import { Field, OperationBVH, makeOperation } from "@big-mesh-studios/csg";

import { FIGURE_REACH, pickFigure } from "./figure-picker";
import type { FigureTransform } from "./figure";

/**
 * A sphere, because it is the one shape whose field is exact — so a pick that finds it at the
 * wrong distance is measuring rather than approximating.
 */
const sphereField = (radius: number) =>
  new Field(
    new OperationBVH([
      makeOperation(0, { x: 0, y: 0, z: 0 }, { type: "Sphere", radius }, "Add"),
    ]),
    { base: () => Infinity, step: radius / 4 },
  );

const figure = (
  at: { x: number; y: number; z: number },
  radius: number,
  yaw = 0,
  scale = 1,
) => ({
  transform: { at, yaw, scale } as FigureTransform,
  field: sphereField(radius),
  half: { x: radius, y: radius, z: radius },
  value: at.x,
});

const looking = { x: 0, y: 0, z: 1 };

describe("pickFigure", () => {
  it("finds the figure in front and reports where on the ray", () => {
    const hit = pickFigure(
      [figure({ x: 0, y: 0, z: 10 }, 2)],
      { x: 0, y: 0, z: 0 },
      looking,
    );

    expect(hit).toBeDefined();
    // A sphere of radius two with its centre ten away, so its surface is eight along the ray.
    expect(hit!.distance).toBeCloseTo(8, 6);
    expect(hit!.point.z).toBeCloseTo(8, 6);
    expect(hit!.figure).toBe(0);
  });

  it("answers undefined for a ray that meets nothing", () => {
    // **A miss is not a point at the origin.** `pickAlong` states the rule and it is the rule:
    // "there is nothing there" and "the surface is at the origin" are different answers.
    expect(pickFigure([], { x: 0, y: 0, z: 0 }, looking)).toBeUndefined();
    expect(
      pickFigure(
        [figure({ x: 0, y: 0, z: 10 }, 2)],
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ),
    ).toBeUndefined();
  });

  it("does not pick the figure behind the player", () => {
    // **The reach sphere is tested against the ray, not the line.** A sphere about a figure
    // behind the camera contains the camera, and a sphere test alone would happily select it —
    // which is a crosshair that picks whatever is behind you whenever you turn away from
    // something.
    expect(
      pickFigure(
        [figure({ x: 0, y: 0, z: -10 }, 2)],
        { x: 0, y: 0, z: 0 },
        looking,
      ),
    ).toBeUndefined();
  });

  it("takes the nearest of several, which is what is in front of you", () => {
    const near = figure({ x: 0, y: 0, z: 10 }, 2);
    const far = figure({ x: 0, y: 0, z: 30 }, 4);
    expect(
      pickFigure([far, near], { x: 0, y: 0, z: 0 }, looking)!.distance,
    ).toBeCloseTo(8, 6);
  });

  it("follows a figure's turn, because the field is in the model's own frame", () => {
    // **A turn is what a rotation is for, and this is the test that the turn reaches the
    // field.** A picker that traced the ray in world coordinates against an unturned field
    // would find the same sphere either way and pass every other test here.
    const ahead = pickFigure(
      [figure({ x: 0, y: 0, z: 10 }, 2, 0.9)],
      { x: 0, y: 0, z: 0 },
      looking,
    );
    expect(ahead!.distance).toBeCloseTo(8, 4);
  });

  it("scales the reach, so a figure drawn twice as big is twice as far away", () => {
    const small = pickFigure(
      [figure({ x: 0, y: 0, z: 10 }, 2, 0, 1)],
      { x: 0, y: 0, z: 0 },
      looking,
    );
    const big = pickFigure(
      [figure({ x: 0, y: 0, z: 10 }, 2, 0, 2)],
      { x: 0, y: 0, z: 0 },
      looking,
    );

    // The model is two units of radius either way; drawn at twice the size its surface is four
    // units out, which puts it six units along the ray instead of eight.
    expect(small!.distance).toBeCloseTo(8, 4);
    expect(big!.distance).toBeCloseTo(6, 4);
  });

  it("refuses a figure past the reach, which is a number a place cannot change", () => {
    const far = figure({ x: 0, y: 0, z: FIGURE_REACH + 50 }, 2);
    expect(pickFigure([far], { x: 0, y: 0, z: 0 }, looking)).toBeUndefined();
    // And the reach is the default rather than a constant buried in the trace.
    expect(
      pickFigure([far], { x: 0, y: 0, z: 0 }, looking, 1000),
    ).toBeDefined();
  });

  it("answers undefined for a ray with no direction, rather than dividing by zero", () => {
    expect(
      pickFigure(
        [figure({ x: 0, y: 0, z: 10 }, 2)],
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ),
    ).toBeUndefined();
  });

  it("finds a figure through a hole in the one in front of it", () => {
    // **The reason a figure is picked by its field and not by its box, as a test.** Two spheres
    // on one ray: a box pick has one answer for the whole of each, so the far one is either
    // hidden or picked through the near one at the same distance. A field pick finds each
    // surface where it is, and the far sphere's *front* is what the ray reaches first.
    const hollow = figure({ x: 0, y: 0, z: 10 }, 2);
    const within = figure({ x: 0, y: 0, z: 12 }, 0.5);
    // The small figure's front is at 11.5, which is nearer than the big one's at 8 — so the big
    // one wins, and the small one inside it is never reached. What this pins is that the answer
    // is the *surface* distance and not a box extent.
    expect(
      pickFigure([hollow, within], { x: 0, y: 0, z: 0 }, looking)!.distance,
    ).toBeCloseTo(8, 4);
  });
});
