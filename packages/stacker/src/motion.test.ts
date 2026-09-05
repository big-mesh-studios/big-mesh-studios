import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import {
  centrePivot,
  sideAxes,
  sideKinds,
  type Figure,
  type Part,
} from "./data";
import {
  keyAt,
  keysFor,
  NO_MOTION,
  poseAt,
  poseFigure,
  withKey,
  withoutKey,
  type Ease,
  type Key,
  type Motion,
} from "./motion";

const EXTENT = { width: 5, height: 7, depth: 3 };

/** A part of that size, standing where it was drawn. */
const partOf = (name: string): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      return [kind, Bitmap.create(EXTENT[across], EXTENT[down])];
    }),
  ) as Part["sides"],
  sections: [],
  root: Vector3D.create(),
  pivot: centrePivot(EXTENT),
  turn: Vector3D.create(),
  scale: 1,
  parent: null,
});

/** A key standing at `at`, as far along the width as it stands frames in. */
const keyOf = (at: number, ease: Ease = "linear"): Key => ({
  at,
  root: Vector3D.create(at, 0, 0),
  turn: Vector3D.create(),
  scale: 1 + at,
  ease,
});

const motionOf = (part: string, keys: Key[]): Motion => ({
  ...NO_MOTION,
  parts: [{ part, keys }],
});

describe("poseAt", () => {
  const keys = [keyOf(0), keyOf(10)];

  it("gives nothing where a part has no keys", () => {
    expect(poseAt([], 5)).toBeUndefined();
  });

  it("holds a part at its first key before that key, and at its last after it", () => {
    expect(poseAt(keys, -5)?.root.x).toBe(0);
    expect(poseAt(keys, 100)?.root.x).toBe(10);
  });

  it("stands a part in the pose of the key it is on", () => {
    expect(poseAt(keys, 0)?.scale).toBe(1);
    expect(poseAt(keys, 10)?.scale).toBe(11);
  });

  it("runs between two keys at a steady rate", () => {
    expect(poseAt(keys, 5)?.root.x).toBeCloseTo(5);
    expect(poseAt(keys, 5)?.scale).toBeCloseTo(6);
    expect(poseAt(keys, 2)?.root.x).toBeCloseTo(2);
  });

  it("finds the pair a frame falls between when there are several", () => {
    const many = [keyOf(0), keyOf(4), keyOf(8), keyOf(20)];

    expect(poseAt(many, 6)?.root.x).toBeCloseTo(6);
    expect(poseAt(many, 14)?.root.x).toBeCloseTo(14);
  });

  it("keeps the earlier pose all the way to the next key when it is held", () => {
    const held = [keyOf(0, "hold"), keyOf(10)];

    expect(poseAt(held, 1)?.root.x).toBe(0);
    expect(poseAt(held, 9.9)?.root.x).toBe(0);
    expect(poseAt(held, 10)?.root.x).toBe(10);
  });

  it("eases towards the middle and away from it, and is halfway at half", () => {
    const gathering = [keyOf(0, "in"), keyOf(10)];
    const losing = [keyOf(0, "out"), keyOf(10)];
    const both = [keyOf(0, "in-out"), keyOf(10)];

    expect(poseAt(gathering, 2.5)?.root.x).toBeLessThan(2.5);
    expect(poseAt(losing, 2.5)?.root.x).toBeGreaterThan(2.5);
    expect(poseAt(both, 2.5)?.root.x).toBeLessThan(2.5);
    expect(poseAt(both, 5)?.root.x).toBeCloseTo(5);
    expect(poseAt(both, 7.5)?.root.x).toBeGreaterThan(7.5);
  });

  it("turns the short way about", () => {
    const turned = (from: number, to: number) =>
      poseAt(
        [
          { ...keyOf(0), turn: Vector3D.create(0, from, 0) },
          { ...keyOf(10), turn: Vector3D.create(0, to, 0) },
        ],
        5,
      )?.turn.y;

    // Ten degrees short of the whole way round is ten degrees back, so halfway
    // there is five degrees back rather than a hundred and seventy five on.
    expect(turned(0, (350 / 180) * Math.PI)).toBeCloseTo((-5 / 180) * Math.PI);
    expect(turned(0, (40 / 180) * Math.PI)).toBeCloseTo((20 / 180) * Math.PI);
  });
});

describe("poseFigure", () => {
  const figure = (): Figure => ({
    parts: [partOf("body"), partOf("arm")],
    palette: [],
  });

  it("hands back the figure it was given when the motion moves nothing", () => {
    const standing = figure();

    expect(poseFigure(standing, NO_MOTION, 5)).toBe(standing);
  });

  it("stands the parts a motion names where it puts them", () => {
    const posed = poseFigure(
      figure(),
      motionOf("arm", [keyOf(0), keyOf(10)]),
      5,
    );

    expect(posed.parts[1].root.x).toBeCloseTo(5);
    expect(posed.parts[1].scale).toBeCloseTo(6);
  });

  it("leaves a part it does not name standing as it was drawn", () => {
    const standing = figure();
    const posed = poseFigure(standing, motionOf("arm", [keyOf(4)]), 4);

    expect(posed.parts[0]).toBe(standing.parts[0]);
  });

  it("leaves the drawings alone and the figure it was given unchanged", () => {
    const standing = figure();
    const posed = poseFigure(
      standing,
      motionOf("arm", [keyOf(0), keyOf(10)]),
      5,
    );

    expect(posed.parts[1].sides).toBe(standing.parts[1].sides);
    expect(standing.parts[1].root.x).toBe(0);
  });
});

describe("keys of a motion", () => {
  it("stands a key at its frame, in the order the keys stand", () => {
    const motion = withKey(
      withKey(NO_MOTION, "arm", keyOf(10)),
      "arm",
      keyOf(4),
    );

    expect(keysFor(motion, "arm").map((key) => key.at)).toEqual([4, 10]);
  });

  it("puts a key in the place of one already standing at that frame", () => {
    const motion = withKey(withKey(NO_MOTION, "arm", keyOf(4)), "arm", {
      ...keyOf(4),
      scale: 3,
    });

    expect(keysFor(motion, "arm")).toHaveLength(1);
    expect(keyAt(motion, "arm", 4)?.scale).toBe(3);
  });

  it("takes a key away, and the part with it once it has none left", () => {
    const motion = withKey(
      withKey(NO_MOTION, "arm", keyOf(4)),
      "arm",
      keyOf(8),
    );

    expect(keysFor(withoutKey(motion, "arm", 4), "arm").map(({ at }) => at)) //
      .toEqual([8]);
    expect(
      withoutKey(withoutKey(motion, "arm", 4), "arm", 8).parts,
    ).toHaveLength(0);
  });

  it("leaves the motion it was given alone", () => {
    const motion = withKey(NO_MOTION, "arm", keyOf(4));

    withKey(motion, "arm", keyOf(8));
    withoutKey(motion, "arm", 4);

    expect(keysFor(motion, "arm")).toHaveLength(1);
    expect(NO_MOTION.parts).toHaveLength(0);
  });
});
