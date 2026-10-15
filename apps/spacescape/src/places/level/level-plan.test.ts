import { describe, expect, it } from "vitest";

import {
  MAX_LEVEL_ITEMS,
  itemLabel,
  parseLevelPlan,
  readLevelPlan,
  writeLevelPlan,
} from "./level-plan";
import { LEVEL_PLACE, type LevelItem } from "./types";
import { MAX_OPERATIONS_PER_PLACE } from "../place-registry";

/**
 * A level file is untrusted input that reaches the fold.
 *
 * Everything here is a property of that claim: it is accepted or refused whole, an unknown
 * key is a refusal rather than a shrug, a duplicate id is caught before anything is built,
 * and the array order the fold will use is the order in the file. The last one is not a
 * nicety — a shape's index decides the surface (ADR 0016), so a reader that sorted or
 * deduplicated on the way in would fold two peers differently from one file.
 */

const aBox = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  kind: "shape",
  id: "wall",
  at: [0, 20, 0],
  shape: { type: "Box", len: { x: 40, y: 6, z: 40 } },
  combine: "Add",
  ...over,
});

const aFigure = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  kind: "figure",
  id: "lamp",
  figure: "prop",
  model: "lantern.sdfmod",
  at: [4, 0, 4],
  ...over,
});

/**
 * A floor: a `Polygon` shape, twenty-four across and four thick, centred where it is put.
 *
 * **A shape rather than a kind**, which is the decision ADR 0053 records — so this has no
 * `up`, no `lines` and no reader of its own, and the reader that accepts it is the same
 * one that accepts a box.
 */
const aFloor = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  kind: "shape",
  id: "floor",
  at: [20, 0, 0],
  shape: {
    type: "Polygon",
    len: 4,
    points: [
      { x: -12, z: -12 },
      { x: 12, z: -12 },
      { x: 12, z: 12 },
      { x: -12, z: 12 },
    ],
  },
  combine: "Add",
  ...over,
});

/** A unit square with one vertex exactly on the local origin. */
const squareAtOrigin = (): Record<string, unknown>[] => [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 4, z: 4 },
  { x: 0, z: 4 },
];

/** A walls item: one run along +X, thirty tall, six thick. */
const aWalls = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  kind: "walls",
  id: "drawn",
  at: [20, 15, 0],
  up: [0, 1, 0],
  lines: [
    [
      [0, 0, 0],
      [40, 0, 0],
    ],
  ],
  height: 30,
  thickness: 6,
  combine: "Add",
  ...over,
});

const level = (items: unknown[]): unknown => ({ version: 1, items });

/** Reads a file that is meant to be good, so a test says only what it cares about. */
const ok = (items: unknown[]) => {
  const read = readLevelPlan(level(items));
  if (!("plan" in read)) {
    throw new Error(`expected a level, refused: ${read.refusal.why}`);
  }
  return read.plan;
};

/** Reads a file that is meant to be refused, and says where it was refused. */
const bad = (items: unknown[]) => {
  const read = readLevelPlan(level(items));
  if ("plan" in read) throw new Error("expected a refusal, got a level");
  return read.refusal;
};

describe("a level file that is right", () => {
  it("reads back the items it was given", () => {
    const plan = ok([aBox(), aFigure()]);
    expect(plan.version).toBe(1);
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]).toMatchObject({
      kind: "shape",
      id: "wall",
      combine: "Add",
    });
    expect(plan.items[1]).toMatchObject({ kind: "figure", figure: "prop" });
  });

  it("keeps the optional fields it was given and invents none", () => {
    const plan = ok([
      aBox({
        colour: { r: 12, g: 34, b: 56 },
        material: "brick",
        softness: 0.1,
      }),
    ]);
    expect(plan.items[0]).toMatchObject({
      colour: { r: 12, g: 34, b: 56 },
      material: "brick",
      softness: 0.1,
    });
    expect(Object.keys(plan.items[0])).not.toContain("orientation");
  });

  it("folds under the level's own place, not a one an item could name", () => {
    // An item saying which place it belongs to is a field a person could set wrong with
    // nothing to tell them, so it is not in the vocabulary at all — and a file carrying
    // one is refused rather than quietly overwritten, because a field that silently does
    // nothing is worse than one that is rejected.
    expect(bad([aBox({ place: "somewhere-else" })]).why).toMatch(
      /carries a place/,
    );
    expect(ok([aBox()]).items[0].kind).toBe("shape");
    expect(LEVEL_PLACE).toBe("level");
  });

  it("round-trips through the writer", () => {
    const items: LevelItem[] = [
      {
        kind: "shape",
        id: "wall",
        at: [1, 2, 3],
        shape: { type: "Sphere", radius: 4 },
        combine: "Paint",
        colour: { r: 1, g: 2, b: 3 },
      },
      {
        kind: "figure",
        id: "lamp",
        figure: "npc",
        model: "chef.sdfmod",
        at: [0, 1, 0],
        name: "Ada",
      },
    ];
    const first = readLevelPlan(
      JSON.parse(writeLevelPlan({ version: 1, items })),
    );
    expect(first).toEqual({ plan: { version: 1, items } });
  });

  it("round-trips a turned shape, which it used to drop on the way in", () => {
    // **The reason ADR 0051 exists.** The table has declared `orientation` a `quat` since the
    // vocabulary was written, so a payload carrying one always passed the check — and this
    // reader used to build the item without it, which meant a rotated shape loaded un-rotated
    // with nothing saying so. This is the test that would have caught it.
    const turned: readonly [number, number, number, number] = [
      0,
      Math.SQRT1_2,
      0,
      Math.SQRT1_2,
    ];
    const plan = ok([aBox({ orientation: turned })]);
    expect(plan.items[0]).toMatchObject({ orientation: turned });

    const written = writeLevelPlan(plan);
    expect(readLevelPlan(JSON.parse(written))).toEqual({ plan });
  });

  it("refuses a turn that is not four numbers, rather than reading one anyway", () => {
    // The table's own check, reached through the level reader rather than restated — which is
    // the whole point of mapping an item onto the effect it stands for.
    expect(bad([aBox({ orientation: [0, 0, 1] })]).why).toMatch(/four numbers/);
    expect(bad([aBox({ orientation: "sideways" })]).why).toMatch(
      /four numbers/,
    );
  });

  it("refuses a turn with a part outside the unit ball", () => {
    // A quaternion of magnitude 2 is not a rotation, and reading it as one is how a shape ends
    // up somewhere nobody put it.
    expect(bad([aBox({ orientation: [0, 0, 0, 2] })]).why).toMatch(
      /outside -1 to 1/,
    );
  });

  it("invents no turn for a shape that names none", () => {
    // Absent means the identity, and identity is what `makeOperation` would have used, so an
    // un-turned shape must not grow a key.
    expect("orientation" in (ok([aBox()]).items[0] as object)).toBe(false);
  });

  it("writes it for a person to read, not for a machine to load", () => {
    const text = writeLevelPlan({ version: 1, items: [] });
    expect(text).toContain("\n  ");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("says what each item is in the list, by name rather than by numbers", () => {
    const plan = ok([
      aBox({ id: "deck" }),
      aFigure({ id: "chef", figure: "npc", name: "Ada" }),
    ]);
    expect(plan.items.map(itemLabel)).toEqual(["deck · box", "chef · npc"]);
  });
});

describe("the order in the file is the order in the fold", () => {
  it("keeps it exactly as written", () => {
    const ids = ["third", "first", "second", "fourth"];
    const plan = ok(ids.map((id) => aBox({ id })));
    expect(plan.items.map((item) => item.id)).toEqual(ids);
  });

  it("mixes shapes and figures without sorting them into groups", () => {
    // voxelscape's editor has to flatten three arrays into one and therefore has to
    // decide an order. Here the order is already written down, and re-grouping it would
    // be inventing an order the author did not choose.
    const plan = ok([
      aFigure({ id: "a-lamp" }),
      aBox({ id: "b-wall" }),
      aFigure({ id: "c-chair" }),
      aBox({ id: "d-floor" }),
    ]);
    expect(plan.items.map((item) => item.id)).toEqual([
      "a-lamp",
      "b-wall",
      "c-chair",
      "d-floor",
    ]);
  });
});

describe("a level file that is wrong", () => {
  it("is refused rather than partly read", () => {
    // The whole rule of ADR 0017, one level up: 500 good rows and one bad row is not a
    // level with 500 shapes in it.
    const items = Array.from({ length: 50 }, (_, i) => aBox({ id: `w${i}` }));
    items.push(aBox({ id: "broken", combine: "Melt" }));
    const refusal = bad(items);
    expect(refusal.where).toBe("items[50]");
    expect(refusal.why).toMatch(/combine/);
  });

  it("names the row and the field, so the file can be opened and fixed", () => {
    const refusal = bad([aBox(), aFigure({ at: [1, "two", 3] })]);
    expect(refusal.where).toBe("items[1]");
    expect(refusal.why).toMatch(/at/);
  });

  it("is refused whole for an unknown key, because a level file reaches a place", () => {
    // A manifest tolerates unknown fields because a manifest never gets this far. This
    // one does, so a file from a newer editor has to be refused rather than half-read.
    expect(bad([aBox({ wobble: 3 })]).why).toMatch(/wobble is not a field/);
  });

  it("refuses two items under one id, before anything is built from either", () => {
    const refusal = bad([aBox({ id: "wall" }), aFigure({ id: "wall" })]);
    expect(refusal.why).toMatch(/both called "wall"/);
  });

  it("refuses an unnamed npc, which is the one rule the effect table cannot hold", () => {
    // `createProp` and `createNpc` are one tag, so the difference is only enforceable
    // where the two functions are declared. A level has one `figure` field and so has to
    // say it here.
    expect(bad([aFigure({ figure: "npc", name: undefined })]).why).toMatch(
      /name is required for an npc/,
    );
    expect(() => ok([aFigure({ figure: "npc", name: "Ada" })])).not.toThrow();
  });

  it("refuses an item that is none of the kinds a level holds", () => {
    expect(bad([aBox({ kind: "vehicle" })]).why).toMatch(
      /a "shape", a "figure" or "walls"/,
    );
  });

  it("refuses a shape whose primitive is not one this build has", () => {
    expect(bad([aBox({ shape: { type: "Hyperboloid" } })]).why).toMatch(
      /shape/,
    );
  });

  it("refuses a field the primitive it names does not take", () => {
    // A Capsule has a number for `len`. An object is not a shape that would fold; it is a
    // field that means something else entirely.
    expect(
      bad([
        aBox({
          shape: { type: "Capsule", len: { x: 1, y: 2, z: 3 }, radius: 2 },
        }),
      ]).why,
    ).toMatch(/len/);
  });

  it("refuses a number that is out of bounds rather than clamping it", () => {
    expect(bad([aBox({ softness: 0.9 })]).why).toMatch(/softness/);
  });

  it("refuses a material name that is not on the list", () => {
    expect(bad([aBox({ material: "chrome" })]).why).toMatch(/material/);
  });

  it("refuses a level that is too big to be a level", () => {
    const items = Array.from({ length: MAX_LEVEL_ITEMS + 1 }, (_, i) =>
      aBox({ id: `w${i}` }),
    );
    expect(bad(items).why).toMatch(new RegExp(String(MAX_LEVEL_ITEMS)));
  });

  it("refuses a version it does not read, rather than guessing at the fields", () => {
    const read = readLevelPlan({ version: 2, items: [] });
    expect("refusal" in read && read.refusal.why).toMatch(/this build reads 1/);
  });

  it("refuses text that is not JSON, saying so rather than throwing", () => {
    const read = parseLevelPlan("{ not json");
    expect("refusal" in read && read.refusal.why).toMatch(/not JSON/);
  });

  it("refuses a file that is not an object at all", () => {
    expect("refusal" in readLevelPlan([])).toBe(true);
    expect("refusal" in readLevelPlan(null)).toBe(true);
    expect("refusal" in readLevelPlan("level")).toBe(true);
  });

  it("refuses a level whose items are not a list", () => {
    const read = readLevelPlan({ version: 1, items: { wall: {} } });
    expect("refusal" in read && read.refusal.where).toBe("items");
  });
});

describe("a level that is too big", () => {
  it("is capped by the place it folds under, not by a number of its own", () => {
    // Two numbers that have to agree is a way for them to stop agreeing, so the limit is
    // the place's. Being *at* it is the point: `PlaceHandle.add` refuses a full place, so a
    // level at the ceiling leaves no room under its own name — a refusal that names
    // itself, which is what `MAX_OPERATIONS_PER_PLACE` is for.
    expect(MAX_LEVEL_ITEMS).toBe(MAX_OPERATIONS_PER_PLACE);
    expect(
      bad(
        Array.from({ length: MAX_LEVEL_ITEMS + 1 }, (_, i) =>
          aBox({ id: `w${i}` }),
        ),
      ).why,
    ).toMatch(/holds 2001/);
    expect(() =>
      ok(
        Array.from({ length: MAX_LEVEL_ITEMS }, (_, i) =>
          aBox({ id: `w${i}` }),
        ),
      ),
    ).not.toThrow();
  });
});

describe("a level's walls", () => {
  it("reads a walls item back with its lines, height and thickness", () => {
    const plan = ok([aWalls()]);
    expect(plan.items[0]).toMatchObject({
      kind: "walls",
      id: "drawn",
      up: [0, 1, 0],
      height: 30,
      thickness: 6,
      combine: "Add",
    });
    const walls = plan.items[0];
    expect(walls.kind === "walls" && walls.lines).toEqual([
      [
        [0, 0, 0],
        [40, 0, 0],
      ],
    ]);
  });

  it("round-trips through a file, unchanged", () => {
    const written = writeLevelPlan(ok([aWalls()]));
    const read = parseLevelPlan(written);
    expect("plan" in read && read.plan.items).toEqual(ok([aWalls()]).items);
  });

  it("refuses a line with fewer than two points, because that is not a wall", () => {
    expect(bad([aWalls({ lines: [[[0, 0, 0]]] })]).why).toMatch(
      /fewer than two points/,
    );
  });

  it("refuses an upward direction of no length", () => {
    expect(bad([aWalls({ up: [0, 0, 0] })]).why).toMatch(/zero vector/);
  });

  it("refuses a field it does not know, rather than half-reading it", () => {
    expect(bad([aWalls({ thickness2: 3 })]).where).toMatch(/\.thickness2$/);
  });

  it("labels a walls item by its id, its lines and its points", () => {
    const walls = ok([aWalls()]).items[0];
    if (walls.kind !== "walls") throw new Error("expected walls");
    expect(itemLabel(walls)).toBe("drawn · walls (1, 2 points)");
  });
});

/**
 * A floor is a `LevelShape` whose `shape` is a `Polygon`, not a fourth kind.
 *
 * **Which means it goes through `checkShape` and the shape path rather than a narrow one of
 * its own** — the whole of what `draw-walls-plan.md` recorded as the price of a third item
 * kind is absent here, and these are the tests that would notice if it crept back in.
 */
describe("a level's floor", () => {
  it("reads a polygon shape back with its outline and thickness", () => {
    const plan = ok([aFloor()]);
    const item = plan.items[0];
    if (item.kind !== "shape" || item.shape.type !== "Polygon") {
      throw new Error("expected a polygon shape");
    }
    expect(item.shape.points).toEqual([
      { x: -12, z: -12 },
      { x: 12, z: -12 },
      { x: 12, z: 12 },
      { x: -12, z: 12 },
    ]);
    expect(item.shape.len).toBe(4);
  });

  it("round-trips through a file, unchanged", () => {
    const written = writeLevelPlan(ok([aFloor()]));
    const read = parseLevelPlan(written);
    expect("plan" in read && read.plan.items).toEqual(ok([aFloor()]).items);
  });

  it("accepts a vertex at the origin, because that is a position and not a size", () => {
    // **The one that would have been refused by accident.** Every other size in a shape is
    // checked against `MIN_SHAPE_SIZE`, a floor of 1e-3, because a size of nothing is not
    // a shape. An outline's coordinates are positions, and a symmetrically drawn floor has
    // one vertex exactly at the local origin — so routing these through the same check
    // would turn away every square anybody drew without saying why.
    expect(
      ok([
        aFloor({
          shape: { type: "Polygon", len: 4, points: squareAtOrigin() },
        }),
      ]).items,
    ).toHaveLength(1);
  });

  it("refuses an outline with fewer than three points", () => {
    expect(
      bad([
        aFloor({
          shape: {
            type: "Polygon",
            len: 4,
            points: [
              { x: 0, z: 0 },
              { x: 1, z: 0 },
            ],
          },
        }),
      ]).why,
    ).toMatch(/takes 3 to 64/);
  });

  it("refuses an outline with more points than the table allows", () => {
    const many = Array.from({ length: 65 }, (_, i) => ({ x: i, z: i * 2 }));
    expect(
      bad([aFloor({ shape: { type: "Polygon", len: 4, points: many } })]).why,
    ).toMatch(/takes 3 to 64/);
  });

  it("refuses the same point twice, because that edge divides by zero", () => {
    // **Not a formatting complaint.** The distance to an edge is found by projecting onto
    // it and dividing by its squared length, so a zero-length edge is a NaN and a NaN in
    // a field is a hole nothing downstream can explain. A person closing a drawn loop on
    // the point they started from produces exactly this, which is why it is refused here
    // rather than guarded against at every sample.
    expect(
      bad([
        aFloor({
          shape: {
            type: "Polygon",
            len: 4,
            points: [
              { x: 0, z: 0 },
              { x: 4, z: 0 },
              { x: 4, z: 4 },
              { x: 0, z: 0 },
            ],
          },
        }),
      ]).why,
    ).toMatch(/same point twice/);
  });

  it("refuses the closing point repeated, which is what a closed loop looks like", () => {
    // The same two vertices as above, but at the seam rather than in the middle — the
    // shape a drawing tool hands over when it keeps the point the hand came back to.
    expect(
      bad([
        aFloor({
          shape: {
            type: "Polygon",
            len: 4,
            points: [
              { x: 0, z: 0 },
              { x: 4, z: 0 },
              { x: 4, z: 4 },
              { x: 0, z: 4 },
              { x: 0, z: 0 },
            ],
          },
        }),
      ]).why,
    ).toMatch(/same point twice/);
  });

  it("refuses a point that is not a pair of numbers", () => {
    for (const bad0 of [
      [
        { x: 0, z: 0 },
        { x: 1, z: 0 },
        { x: 0, y: 1 },
      ],
      [{ x: 0, z: 0 }, { x: 1, z: 0 }, [2, 2]],
      [
        { x: 0, z: 0 },
        { x: 1, z: 0 },
        { x: "4", z: 4 },
      ],
      [
        { x: 0, z: 0 },
        { x: 1, z: 0 },
        { x: null, z: 4 },
      ],
    ]) {
      expect(
        bad([aFloor({ shape: { type: "Polygon", len: 4, points: bad0 } })]).why,
        JSON.stringify(bad0),
      ).toMatch(/points|finite number|object/);
    }
  });

  it("refuses a coordinate outside the field's own ceiling", () => {
    expect(
      bad([
        aFloor({
          shape: {
            type: "Polygon",
            len: 4,
            points: [
              { x: 0, z: 0 },
              { x: 1e9, z: 0 },
              { x: 0, z: 1 },
            ],
          },
        }),
      ]).why,
    ).toMatch(/outside -1000000 to 1000000/);
  });

  it("refuses a thickness that is not a size", () => {
    expect(
      bad([
        aFloor({
          shape: {
            type: "Polygon",
            len: 0,
            points: [
              { x: 0, z: 0 },
              { x: 1, z: 0 },
              { x: 0, z: 1 },
            ],
          },
        }),
      ]).why,
    ).toMatch(/outside 0.001 to 1000000/);
  });

  it("labels a floor by its type, like any other shape", () => {
    expect(itemLabel(ok([aFloor()]).items[0])).toBe("floor · polygon");
  });
});
