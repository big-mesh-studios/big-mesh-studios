// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  figureBox,
  idWithoutLevel,
  orientedBoxContains,
  pickItem,
  pickShape,
  rayBoxDistance,
  rayOrientedBoxDistance,
  shapeBox,
  yawOrientation,
  type Ray,
} from "./picking";
import {
  LEVEL_FIGURE_PREFIX,
  levelFigureId,
  type LevelFigure,
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

/** A quarter turn about up, as a level writes it. */
const QUARTER_TURN: readonly [number, number, number, number] = [
  0,
  Math.SQRT1_2,
  0,
  Math.SQRT1_2,
];

/**
 * A quarter turn about the world's x, which lays a panel on its side.
 *
 * **Not the turn about up.** A quarter turn about Y swaps x and z, and a panel that is 40
 * wide and 40 deep is the same panel either way — which is a trap worth naming, because
 * "I turned it and nothing changed" reads as a bug in the turn rather than as a symmetric
 * shape under a turn that happened not to touch its one distinguishing axis.
 */
const ON_ITS_SIDE: readonly [number, number, number, number] = [
  Math.SQRT1_2,
  0,
  0,
  Math.SQRT1_2,
];

describe("the box a shape occupies", () => {
  it("is centred on its origin and as big as the primitive is", () => {
    // `len` is a **half**-size — `sdBox` is zero at `|p| = len`, and the BVH's own box for
    // a box of `len` spans `-len..len` — so a `len` of 10 is twenty across. The extra 1 on
    // every face is `shapePadding`, which is what a mesh of the shape is stored in.
    const box = shapeBox(
      aBox({ shape: { type: "Box", len: { x: 10, y: 20, z: 30 } } }),
    );
    expect(box.centre).toEqual({ x: 0, y: 20, z: 0 });
    expect(box.half).toEqual({ x: 11, y: 21, z: 31 });
  });

  it("moves with the shape", () => {
    const box = shapeBox(aBox({ at: [100, 0, -50] }));
    expect(box.centre.x).toBe(100);
    expect(box.centre.z).toBe(-50);
  });

  it("admits the reach a soft shape has beyond its own box", () => {
    // The mesher pads by `shapePadding`, so a box that did not would make a wall
    // unpickable exactly where it is softest.
    const hard = shapeBox(aBox());
    const soft = shapeBox(aBox({ softness: 0.25 }));
    expect(soft.half.x).toBeGreaterThan(hard.half.x);
  });

  it("is as big for every primitive, without a switch here", () => {
    // The half-extents come from the primitive table. This is the test that would fail if
    // somebody added a primitive and it were not handled — which is the point of reading
    // the table rather than writing a second one.
    const sphere = shapeBox(aBox({ shape: { type: "Sphere", radius: 7 } }));
    expect(sphere.half.y).toBeGreaterThanOrEqual(7);
    const cylinder = shapeBox(
      aBox({ shape: { type: "Cylinder", len: 20, radius: 5 } }),
    );
    expect(cylinder.half.y).toBeGreaterThan(0);
  });

  it("carries the shape's turn, and the identity for a shape with none", () => {
    // The half-size is *not* changed by the turn — it is the reach along the shape's own
    // axes, and the axes are what the turn moves. Growing it here is what would make a
    // capsule's box balloon as somebody turned it.
    expect(shapeBox(aBox()).orientation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    expect(shapeBox(aBox({ orientation: QUARTER_TURN })).orientation).toEqual({
      x: 0,
      y: Math.SQRT1_2,
      z: 0,
      w: Math.SQRT1_2,
    });
  });

  it("keeps its middle on the shape's origin whatever the turn", () => {
    // **The pivot, and the reason the gizmo needed no pivot arithmetic (ADR 0051).** A
    // half-box is symmetric about its own origin, so turning it cannot move its middle —
    // which means "turn about the centre of the box" and "turn about where it stands" are
    // the same point, for every primitive, at every angle.
    for (const angle of [0, 0.4, Math.PI / 4, Math.PI / 2, Math.PI - 0.1]) {
      const turned = shapeBox(
        aBox({
          orientation: [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)],
          shape: { type: "Capsule", len: 30, radius: 4 },
        }),
      );
      expect(turned.centre).toEqual({ x: 0, y: 20, z: 0 });
    }
  });
});

describe("a figure's box", () => {
  it("is the model's own size at the point it stands", () => {
    const figure = aFigure("lamp") as LevelFigure;
    const box = figureBox({ ...figure, at: [4, 0, 4] }, { x: 1, y: 3, z: 2 });
    expect(box.centre).toEqual({ x: 4, y: 0, z: 4 });
    expect(box.half).toEqual({ x: 1, y: 3, z: 2 });
  });

  it("turns with its yaw, which it did not before ADR 0051", () => {
    // Documented for a while as "a slightly larger hit than the prop, which is the forgiving
    // direction". Now that a turned thing can be drawn turned, an upright box round it is
    // just a box round the wrong shape.
    const figure = { ...(aFigure("lamp") as LevelFigure), yaw: Math.PI / 2 };
    expect(figureBox(figure, { x: 1, y: 3, z: 2 }).orientation).toEqual(
      yawOrientation(Math.PI / 2),
    );
    expect(yawOrientation(0)).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it("falls back to a stand-in size when the model is not attached", () => {
    // A level naming a model its place has not carried yet is a real state
    // (`apply-level.ts` skips rather than refuses), so the box still has to be drawable.
    expect(figureBox(aFigure("lamp") as LevelFigure, undefined).half).toEqual({
      x: 1,
      y: 2,
      z: 1,
    });
  });
});

describe("a ray crossing a box", () => {
  it("reports how far along it the crossing is", () => {
    // The wall's near face is at x = 41 and the ray starts at 500, so 459.
    expect(rayOrientedBoxDistance(AT_THE_WALL, shapeBox(aBox()))).toBe(459);
  });

  it("misses when it goes past the side", () => {
    expect(
      rayOrientedBoxDistance(aRay([500, 500, 0], [-1, 0, 0]), shapeBox(aBox())),
    ).toBeUndefined();
  });

  it("misses when it points away from the box", () => {
    expect(
      rayOrientedBoxDistance(aRay([500, 20, 0], [1, 0, 0]), shapeBox(aBox())),
    ).toBeUndefined();
  });

  it("reports zero for a box the ray starts inside", () => {
    expect(
      rayOrientedBoxDistance(aRay([0, 20, 0], [1, 0, 0]), shapeBox(aBox())),
    ).toBe(0);
  });

  it("misses when it is parallel to a slab the origin is outside of", () => {
    // Straight down past the wall: no x crossing, and the origin is outside the y slab.
    expect(
      rayOrientedBoxDistance(aRay([500, 20, 0], [0, -1, 0]), shapeBox(aBox())),
    ).toBeUndefined();
  });

  it("counts a face as a hit", () => {
    expect(orientedBoxContains({ x: 41, y: 20, z: 0 }, shapeBox(aBox()))).toBe(
      true,
    );
    expect(orientedBoxContains({ x: 42, y: 20, z: 0 }, shapeBox(aBox()))).toBe(
      false,
    );
  });

  it("gives the same answer as the axis-aligned test for an un-turned shape", () => {
    // **The oriented test is two rotations and the slab test, not a second slab test.** If
    // the identity turn changed the answer, the change of coordinates is wrong — and this
    // is the case where there is nothing to be wrong about, so it should be exact.
    const box = shapeBox(aBox());
    const aligned = {
      min: { x: -box.half.x, y: 20 - box.half.y, z: -box.half.z },
      max: { x: box.half.x, y: 20 + box.half.y, z: box.half.z },
    };
    for (const ray of [AT_THE_WALL, aRay([0, 20, 0], [1, 0, 0])]) {
      expect(rayOrientedBoxDistance(ray, box)).toBe(
        rayBoxDistance(ray, aligned),
      );
    }
  });

  it("is turned by the shape's turn rather than by the world", () => {
    // A wall of 40 × 3 × 40 laid on its side has its long axis along the world's y, so the
    // panel that a ray at y = 33 sailed over now catches it. This is the whole difference
    // between picking a turned shape by its turned box and by an un-turned one: the second
    // reports a panel lying on its edge as though it were still standing up, and a person
    // clicking the part of it that is actually there selects nothing.
    const thin = aBox({
      id: "panel",
      shape: { type: "Box", len: { x: 40, y: 3, z: 40 } },
    });
    // y = 33 is clear of the upright panel, whose top is at 20 + 3 + 1 = 24.
    const offTheTop = aRay([500, 33, 0], [-1, 0, 0]);

    expect(rayOrientedBoxDistance(offTheTop, shapeBox(thin))).toBeUndefined();
    // Laid on its side it reaches 40 up and down as well, so the same ray crosses it — and
    // its near face is still at x = 41, so still 459. That the ray is caught and the number
    // is unchanged is the shape of the claim: an axis-aligned answer would have missed it.
    expect(
      rayOrientedBoxDistance(
        offTheTop,
        shapeBox({ ...thin, orientation: ON_ITS_SIDE }),
      ),
    ).toBe(459);
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
    expect(
      rayOrientedBoxDistance(inside, shapeBox(items[0] as LevelShape)),
    ).toBe(0);
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
