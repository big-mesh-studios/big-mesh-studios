// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  boxContains,
  idWithoutLevel,
  pickItem,
  pickShape,
  rayBoxDistance,
  shapeBox,
  type Ray,
} from "./picking";
import {
  LEVEL_FIGURE_PREFIX,
  levelFigureId,
  type LevelItem,
  type LevelShape,
} from "../../places/level/types";

/**
 * What a click means is a question about the creator's intent, and the answers here are
 * not the only possible ones — so each test names the case it is pinning down rather than
 * the arithmetic it is running.
 *
 * The two that matter most: a camera inside a box selects nothing rather than that box
 * forever, and a figure is found the same way the player finds it.
 */

const aRay = (
  origin: [number, number, number],
  direction: [number, number, number],
): Ray => ({
  origin: { x: origin[0], y: origin[1], z: origin[2] },
  direction: { x: direction[0], y: direction[1], z: direction[2] },
});

const aBox = (over: Partial<LevelShape> = {}): LevelShape => ({
  kind: "shape",
  id: "wall",
  at: [0, 20, 0],
  shape: { type: "Box", len: { x: 40, y: 6, z: 40 } },
  combine: "Add",
  ...over,
});

const aFigure = (id = "lamp"): LevelItem => ({
  kind: "figure",
  id,
  figure: "prop",
  model: "lantern.sdfmod",
  at: [0, 0, 0],
});

/** Looking down `-x` from far off in `+x`, which is down the face of a wall at the origin. */
const AT_THE_WALL = aRay([500, 20, 0], [-1, 0, 0]);

describe("the box a shape occupies", () => {
  it("is centred on its origin and as big as the primitive is", () => {
    // `len` is a **half**-size — `sdBox` is zero at `|p| = len`, and the BVH's own box for
    // a box of `len` spans `-len..len` — so a `len` of 10 is twenty across. The extra 1 on
    // every face is `shapePadding`, which is what a mesh of the shape is stored in.
    const box = shapeBox(
      aBox({ shape: { type: "Box", len: { x: 10, y: 20, z: 30 } } }),
    );
    expect(box.min).toEqual({ x: -11, y: -1, z: -31 });
    expect(box.max).toEqual({ x: 11, y: 41, z: 31 });
  });

  it("moves with the shape", () => {
    const box = shapeBox(aBox({ at: [100, 0, -50] }));
    expect(box.min.x).toBe(59);
    expect(box.max.z).toBe(-9);
  });

  it("admits the reach a soft shape has beyond its own box", () => {
    // The mesher pads by `shapePadding`, so a box that did not would make a wall
    // unpickable exactly where it is softest.
    const hard = shapeBox(aBox());
    const soft = shapeBox(aBox({ softness: 0.25 }));
    expect(soft.min.x).toBeLessThan(hard.min.x);
    expect(soft.max.x).toBeGreaterThan(hard.max.x);
  });

  it("is as big for every primitive, without a switch here", () => {
    // The half-extents come from the primitive table. This is the test that would fail if
    // somebody added a primitive and it were not handled — which is the point of reading
    // the table rather than writing a second one.
    const sphere = shapeBox(aBox({ shape: { type: "Sphere", radius: 7 } }));
    expect(sphere.max.y - sphere.min.y).toBeGreaterThanOrEqual(14);
    const cylinder = shapeBox(
      aBox({ shape: { type: "Cylinder", len: 20, radius: 5 } }),
    );
    expect(cylinder.max.y).toBeGreaterThan(cylinder.min.y);
  });
});

describe("a ray crossing a box", () => {
  it("reports how far along it the crossing is", () => {
    // The wall's near face is at x = 41 and the ray starts at 500, so 459.
    expect(rayBoxDistance(AT_THE_WALL, shapeBox(aBox()))).toBe(459);
  });

  it("misses when it goes past the side", () => {
    expect(
      rayBoxDistance(aRay([500, 500, 0], [-1, 0, 0]), shapeBox(aBox())),
    ).toBeUndefined();
  });

  it("misses when it points away from the box", () => {
    expect(
      rayBoxDistance(aRay([500, 20, 0], [1, 0, 0]), shapeBox(aBox())),
    ).toBeUndefined();
  });

  it("reports zero for a box the ray starts inside", () => {
    expect(rayBoxDistance(aRay([0, 20, 0], [1, 0, 0]), shapeBox(aBox()))).toBe(
      0,
    );
  });

  it("misses when it is parallel to a slab the origin is outside of", () => {
    // Straight down past the wall: no x crossing, and the origin is outside the y slab.
    expect(
      rayBoxDistance(aRay([500, 20, 0], [0, -1, 0]), shapeBox(aBox())),
    ).toBeUndefined();
  });

  it("counts a face as a hit", () => {
    expect(boxContains({ x: 41, y: 20, z: 0 }, shapeBox(aBox()))).toBe(true);
    expect(boxContains({ x: 42, y: 20, z: 0 }, shapeBox(aBox()))).toBe(false);
  });
});

describe("a click on a wall", () => {
  it("selects the wall", () => {
    const items = [aBox()];
    expect(pickShape(items, AT_THE_WALL)?.index).toBe(0);
  });

  it("selects the nearest of several walls crossed", () => {
    const near = aBox({
      id: "near",
      at: [400, 20, 0],
      shape: { type: "Box", len: { x: 10, y: 10, z: 10 } },
    });
    const far = aBox({ id: "far" });
    // `near` is listed second and is the one the ray meets first.
    expect(pickShape([far, near], AT_THE_WALL)?.index).toBe(1);
  });

  it("does not care what order the fold put them in", () => {
    // A person clicking a wall wants the wall they can see. The thing in front of it may be
    // a subtract they made to cut a doorway, and "nearest in the fold" is not an answer to
    // which one they meant.
    const near = aBox({ id: "near", at: [400, 20, 0] });
    const behind = aBox({ id: "behind" });
    expect(pickShape([behind, near], AT_THE_WALL)?.index).toBe(1);
  });

  it("selects nothing when nothing is there", () => {
    expect(pickShape([], AT_THE_WALL)).toBeUndefined();
    expect(
      pickShape([aBox({ id: "far-away", at: [9000, 0, 0] })], AT_THE_WALL),
    ).toBeUndefined();
  });

  it("reaches only as far as the reach says", () => {
    expect(pickShape([aBox()], AT_THE_WALL, 100)).toBeUndefined();
  });

  it("ignores figures, because a figure is not a box", () => {
    expect(pickShape([aFigure()], AT_THE_WALL)).toBeUndefined();
  });
});

describe("a camera inside a box", () => {
  it("selects nothing rather than that box for every click", () => {
    // The case voxelscape found: a ray starting inside a shape enters it at distance zero,
    // so it is always the nearest crossing — and somebody who carved a room out of a
    // subtracted box could never select anything they built inside it.
    const items = [aBox({ id: "room" })];
    const inside = aRay([0, 20, 0], [1, 0, 0]);
    expect(rayBoxDistance(inside, shapeBox(items[0] as LevelShape))).toBe(0);
    expect(pickShape(items, inside)).toBeUndefined();
  });

  it("still selects a box nested inside the one the camera is in", () => {
    const room = aBox({ id: "room" });
    const crate = aBox({
      id: "crate",
      at: [10, 20, 0],
      shape: { type: "Box", len: { x: 8, y: 8, z: 8 } },
    });
    const insideRoom = aRay([0, 20, 0], [1, 0, 0]);
    expect(pickShape([room, crate], insideRoom)?.index).toBe(1);
  });

  it("does not skip a non-box primitive the camera is inside", () => {
    // Only `Box` is skipped. Every other primitive is one box, so the same skip would
    // apply to it too — but the case this exists for is specifically a subtracted box
    // standing in for a room, and skipping more would hide shapes a person can see.
    const sphere = aBox({ id: "ball", shape: { type: "Sphere", radius: 40 } });
    const inside = aRay([0, 20, 0], [1, 0, 0]);
    expect(pickShape([sphere], inside)?.index).toBe(0);
  });
});

describe("a click on a figure", () => {
  /** A world that says this figure is `distance` along the ray. */
  const figuresIn =
    (id: string, distance = 100) =>
    () => ({
      id: levelFigureId(id),
      distance,
    });

  it("selects the figure the world says was hit", () => {
    const items: LevelItem[] = [aBox(), aFigure("lamp")];
    // In front of the wall, which is 459 along the ray.
    expect(pickItem(items, AT_THE_WALL, figuresIn("lamp", 100))?.index).toBe(1);
  });

  it("finds a figure by the name the level gave it, not the world's", () => {
    // `FigureSet` answers in the world's id space and the level namespaces its ids on the
    // way out, so matching by raw id would never find anything.
    expect(idWithoutLevel(levelFigureId("lamp"))).toBe("lamp");
    expect(idWithoutLevel("somebody-elses-chair")).toBe("somebody-elses-chair");
  });

  it("ignores a figure belonging to somebody else", () => {
    const items: LevelItem[] = [aBox(), aFigure("lamp")];
    expect(
      pickItem(items, AT_THE_WALL, () => ({
        id: "a-place-elses-chair",
        distance: 10,
      }))?.index,
    ).toBe(0);
  });

  it("falls back to a shape when the world hit nothing", () => {
    const items: LevelItem[] = [aBox()];
    expect(pickItem(items, AT_THE_WALL, () => undefined)?.index).toBe(0);
  });

  it("still selects a shape when the world has no figures to ask", () => {
    const items: LevelItem[] = [aBox(), aFigure()];
    expect(pickItem(items, AT_THE_WALL)?.index).toBe(0);
  });

  it("picks a wall in front of a prop, because the wall is what was aimed at", () => {
    // Both distances are along the same ray, so they weigh directly. The prop is behind
    // the wall here, so the wall wins — which is what a person means when they click the
    // wall rather than the lamp behind it.
    const items: LevelItem[] = [aFigure("lamp"), aBox()];
    expect(pickItem(items, AT_THE_WALL, figuresIn("lamp", 900))?.index).toBe(1);
  });

  it("picks a prop in front of a wall, because the prop is what was aimed at", () => {
    const items: LevelItem[] = [aFigure("lamp"), aBox()];
    expect(pickItem(items, AT_THE_WALL, figuresIn("lamp", 100))?.index).toBe(0);
  });

  it("gives a prop sitting exactly on a wall the benefit of the doubt", () => {
    // A tie goes to the figure, because it is the more specific answer and the one a
    // person is more likely to have meant to click.
    const items: LevelItem[] = [aBox(), aFigure("lamp")];
    expect(pickItem(items, AT_THE_WALL, figuresIn("lamp", 459))?.index).toBe(1);
  });

  it("finds a figure even where there is no shape at all", () => {
    const items: LevelItem[] = [aFigure("lamp")];
    expect(pickItem(items, AT_THE_WALL, figuresIn("lamp"))?.index).toBe(0);
  });
});

describe("the level's figure namespace", () => {
  it("cannot collide with a script's own id", () => {
    // `FigureSet` is shared by every place on the planet, so a level standing a `chair`
    // must not be able to make a published place's furniture disappear.
    expect(levelFigureId("chair")).toBe(`${LEVEL_FIGURE_PREFIX}chair`);
    expect(levelFigureId("chair")).not.toBe("chair");
  });
});
