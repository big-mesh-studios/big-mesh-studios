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

  it("refuses an item that is neither a shape nor a figure", () => {
    expect(bad([aBox({ kind: "vehicle" })]).why).toMatch(
      /a "shape" or a "figure"/,
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
