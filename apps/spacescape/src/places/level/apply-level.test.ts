// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { BufferGeometry, Mesh, NodeMaterial } from "@random-mesh/rmsl/scene";
import { Field, OperationBVH, makeOperation } from "@big-mesh-studios/csg";
import type { Bounds } from "@big-mesh-studios/core";

import { createLevelApplier, type LevelTarget } from "./apply-level";
import {
  LEVEL_PLACE,
  levelFigureId,
  type LevelItem,
  type LevelPlan,
} from "./types";
import { PlaceRegistry } from "../place-registry";
import { SculptDocument } from "../../edit/document";
import { FigureSet } from "../../figures/figure-set";
import type { FigureModel } from "../model-library";

/**
 * The applier is where a level stops being data and becomes a world, so what is checked
 * here is the part that is easy to get quietly wrong: **which edits move a shape in the
 * fold and which do not.**
 *
 * A shape's index decides the surface (ADR 0016), because the fold combines with a smooth
 * minimum — symmetric, not associative. So an edit that changes *what* a shape is must not
 * change *where it folds*, or nudging a `Subtract` wall one voxel would move it past its
 * neighbours and quietly take their terrain with it.
 */

const aShape = (
  id: string,
  y = 20,
  combine: "Add" | "Subtract" | "Paint" = "Add",
): LevelItem => ({
  kind: "shape",
  id,
  at: [0, y, 0],
  shape: { type: "Box", len: { x: 40, y: 6, z: 40 } },
  combine,
});

const aFigure = (
  id: string,
  over: Record<string, unknown> = {},
): LevelItem => ({
  kind: "figure",
  id,
  figure: "prop",
  model: "lantern.sdfmod",
  at: [4, 0, 4],
  ...over,
});

const aPlan = (items: LevelItem[]): LevelPlan => ({ version: 1, items });

/** A world with a registry, a record of what it was told, and no figures. */
const world = (): {
  target: LevelTarget;
  registry: PlaceRegistry;
  told: Array<Bounds | undefined>;
} => {
  const registry = new PlaceRegistry(new SculptDocument().order);
  const told: Array<Bounds | undefined> = [];
  return {
    registry,
    told,
    target: {
      places: registry,
      geometryChanged: (bounds) => told.push(bounds),
    },
  };
};

/** A sphere model — the one primitive whose field is exact, so a figure really has one. */
const model = (name: string, radius: number): FigureModel => {
  const geometry = new BufferGeometry();
  const operations = [
    makeOperation(0, { x: 0, y: 0, z: 0 }, { type: "Sphere", radius }, "Add"),
  ];
  return {
    name,
    operations,
    field: new Field(new OperationBVH(operations), {
      base: () => Infinity,
      step: radius / 4,
    }),
    bounds: {
      min: { x: -radius, y: -radius, z: -radius },
      max: { x: radius, y: radius, z: radius },
    },
    half: { x: radius, y: radius, z: radius },
    triangles: 0,
    draw: (material: NodeMaterial) => new Mesh(geometry, material),
    dispose: () => geometry.dispose(),
  } as unknown as FigureModel;
};

/**
 * A world with figures.
 *
 * **The `models` reader is the seam that lets two names exist without a zip** —
 * `ModelLibrary.from` reads `.sdfmod` bytes, which is the wrong thing for a test to do and
 * would mean these tests were really testing the file reader.
 */
const worldWithFigures = (): {
  target: LevelTarget;
  registry: PlaceRegistry;
  figures: FigureSet;
} => {
  const registry = new PlaceRegistry(new SculptDocument().order);
  const figures = new FigureSet(new NodeMaterial() as never);
  const models = new Map([
    ["lantern.sdfmod", model("lantern.sdfmod", 3)],
    ["fridge.sdfmod", model("fridge.sdfmod", 5)],
  ]);
  return {
    registry,
    figures,
    target: {
      places: registry,
      figures,
      models: { get: (name) => models.get(name) },
      geometryChanged: () => {},
    },
  };
};

describe("a level applied to a world", () => {
  it("puts every shape in, under the level's own place", () => {
    const { target, registry } = world();
    createLevelApplier(target).apply(
      aPlan([aShape("floor"), aShape("wall", 30)]),
    );

    const place = registry.get(LEVEL_PLACE);
    expect(place?.ids()).toEqual(["floor", "wall"]);
    expect(place?.get("wall")?.origin).toEqual({ x: 0, y: 30, z: 0 });
  });

  it("folds the shapes in the order the file lists them", () => {
    const { target, registry } = world();
    createLevelApplier(target).apply(
      aPlan([aShape("third"), aShape("first"), aShape("second")]),
    );
    // Increasing indexes in file order, because `flatten` sorts by index and `add` hands
    // them out in the order they were added.
    const indexes = registry
      .get(LEVEL_PLACE)!
      .operations()
      .map((op) => op.index);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it("carries the shape, the combine and the colour across", () => {
    const { target, registry } = world();
    createLevelApplier(target).apply(
      aPlan([
        {
          kind: "shape",
          id: "painted",
          at: [1, 2, 3],
          shape: { type: "Sphere", radius: 8 },
          combine: "Paint",
          colour: { r: 10, g: 20, b: 30 },
          softness: 0.1,
        },
      ]),
    );
    const painted = registry.get(LEVEL_PLACE)!.get("painted")!;
    expect(painted.shape).toEqual({ type: "Sphere", radius: 8 });
    expect(painted.combine).toBe("Paint");
    expect(painted.colour).toEqual({ r: 10, g: 20, b: 30 });
    expect(painted.softness).toBeCloseTo(0.1);
    expect(painted.origin).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("tells the host once, with the box the shapes reach", () => {
    // One call, not one per shape: a level of two hundred walls applied one at a time
    // would ask the mesher for two hundred model sends, each cancelling the last.
    const { target, told } = world();
    createLevelApplier(target).apply(aPlan([aShape("a"), aShape("b", 200)]));
    expect(told).toHaveLength(1);
    expect(told[0]?.min.y).toBeLessThanOrEqual(20);
    expect(told[0]?.max.y).toBeGreaterThanOrEqual(200);
  });

  it("says nothing changed when there was nothing and there is nothing", () => {
    // `undefined` is the codebase's word for "everything changed", so answering it for a
    // level that has never held anything would re-mesh the world for an empty edit.
    const { target, told, registry } = world();
    createLevelApplier(target).apply(aPlan([]));
    expect(told).toEqual([]);
    expect(registry.get(LEVEL_PLACE)?.count).toBe(0);
  });

  it("still re-meshes what an emptied level removed", () => {
    // The box the level used to reach is gone by the time it is empty, so it has to be
    // read before the shapes come down — or the terrain keeps walls nothing holds.
    const { target, told } = world();
    const apply = createLevelApplier(target);
    apply.apply(aPlan([aShape("floor"), aShape("tower", 400)]));
    told.length = 0;

    apply.apply(aPlan([]));
    expect(told).toHaveLength(1);
    expect(told[0]?.max.y).toBeGreaterThanOrEqual(400);
  });
});

describe("changing a shape does not move it in the fold", () => {
  it("keeps every index when a shape's numbers change", () => {
    const { target, registry } = world();
    const apply = createLevelApplier(target);
    apply.apply(
      aPlan([
        aShape("floor", 20),
        aShape("pit", 24, "Subtract"),
        aShape("roof", 60),
      ]),
    );
    const before = registry
      .get(LEVEL_PLACE)!
      .operations()
      .map((op) => op.index);

    // The shape's own numbers change; which shapes there are does not.
    apply.apply(
      aPlan([
        aShape("floor", 20),
        aShape("pit", 30, "Subtract"),
        aShape("roof", 60),
      ]),
    );

    const place = registry.get(LEVEL_PLACE)!;
    expect(place.operations().map((op) => op.index)).toEqual(before);
    expect(place.get("pit")?.origin.y).toBe(30);
  });

  it("keeps a subtract where it was, so its neighbours' terrain does not change", () => {
    // The failure this exists to stop: remove-then-add would move the pit to the end of
    // the fold, and because the fold is a smooth minimum — not associative — that is a
    // different landscape, not the same one with the pit somewhere else.
    const { target, registry } = world();
    const apply = createLevelApplier(target);
    const combines = () => registry.flatten([]).map((op) => op.combine);

    apply.apply(
      aPlan([
        aShape("floor", 20),
        aShape("pit", 24, "Subtract"),
        aShape("roof", 60),
      ]),
    );
    expect(combines()).toEqual(["Add", "Subtract", "Add"]);

    apply.apply(
      aPlan([
        aShape("floor", 20),
        aShape("pit", 28, "Subtract"),
        aShape("roof", 60),
      ]),
    );
    expect(combines()).toEqual(["Add", "Subtract", "Add"]);
  });

  it("keeps the combine it was given rather than defaulting it", () => {
    const { target, registry } = world();
    const apply = createLevelApplier(target);
    apply.apply(aPlan([aShape("a"), aShape("b", 30, "Paint")]));
    apply.apply(aPlan([aShape("a"), aShape("b", 34, "Paint")]));
    expect(registry.get(LEVEL_PLACE)!.get("b")?.combine).toBe("Paint");
  });
});

describe("changing which shapes there are does rebuild", () => {
  it("refills the place in file order when one is added", () => {
    const { target, registry } = world();
    const apply = createLevelApplier(target);
    apply.apply(aPlan([aShape("a"), aShape("c")]));

    // Inserted in the middle. `add` alone would give it an index above `c`, so it would
    // fold last — which is not what the file says. A rebuild makes the file the truth.
    apply.apply(aPlan([aShape("a"), aShape("b"), aShape("c")]));

    const place = registry.get(LEVEL_PLACE)!;
    expect(place.ids()).toEqual(["a", "b", "c"]);
    const indexes = place.operations().map((op) => op.index);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it("refills it when one is removed", () => {
    const { target, registry } = world();
    const apply = createLevelApplier(target);
    apply.apply(aPlan([aShape("a"), aShape("b"), aShape("c")]));
    apply.apply(aPlan([aShape("a"), aShape("c")]));
    expect(registry.get(LEVEL_PLACE)!.ids()).toEqual(["a", "c"]);
  });

  it("refills it when the order changes, because order is the surface", () => {
    const { target, registry } = world();
    const apply = createLevelApplier(target);
    apply.apply(aPlan([aShape("floor"), aShape("paint", 22, "Paint")]));
    expect(registry.get(LEVEL_PLACE)!.operations()[0].origin.y).toBe(20);

    apply.apply(aPlan([aShape("paint", 22, "Paint"), aShape("floor")]));
    expect(registry.get(LEVEL_PLACE)!.operations()[0].origin.y).toBe(22);
  });

  it("rebuilds when the plan is replaced whole", () => {
    const { target, registry } = world();
    const apply = createLevelApplier(target);
    apply.apply(aPlan([aShape("a"), aShape("b")]));
    apply.apply(aPlan([aShape("z")]));
    expect(registry.get(LEVEL_PLACE)!.ids()).toEqual(["z"]);
  });
});

describe("a level's figures", () => {
  it("stands each one up, under an id namespaced to the level", () => {
    const { target, figures } = worldWithFigures();
    createLevelApplier(target).apply(aPlan([aFigure("lamp")]));
    expect(figures.ids()).toEqual([levelFigureId("lamp")]);
  });

  it("takes down the figures from the last apply and no others", () => {
    // `FigureSet` is shared by every place on the planet. Clearing it would take a
    // published place's furniture with it, so only the ids the level put there go.
    const { target, figures } = worldWithFigures();
    figures.add({
      id: "somebody-elses-chair",
      kind: "prop",
      model: model("x", 1),
      at: { x: 0, y: 0, z: 0 },
    });

    const apply = createLevelApplier(target);
    apply.apply(aPlan([aFigure("lamp")]));
    apply.apply(aPlan([aFigure("chair")]));

    expect(figures.ids()).toContain("somebody-elses-chair");
    expect(figures.ids()).not.toContain(levelFigureId("lamp"));
    expect(figures.ids()).toContain(levelFigureId("chair"));
  });

  it("stands up everything else when one model is not attached yet", () => {
    // Skipped, not fatal: a level is being edited, not loaded from a stranger's file. A
    // person who has not attached the model yet should still see their house.
    const { target, figures } = worldWithFigures();
    createLevelApplier(target).apply(
      aPlan([
        aFigure("missing", { model: "submarine.sdfmod" }),
        aFigure("lamp"),
      ]),
    );
    expect(figures.ids()).toEqual([levelFigureId("lamp")]);
  });

  it("follows a figure that moved", () => {
    const { target, figures } = worldWithFigures();
    const apply = createLevelApplier(target);
    apply.apply(aPlan([aFigure("lamp")]));
    apply.apply(aPlan([aFigure("lamp", { at: [80, 0, 80] })]));
    expect(figures.get(levelFigureId("lamp"))?.transform.at).toMatchObject({
      x: 80,
      z: 80,
    });
  });

  it("does nothing at all when the world has no figures", () => {
    const { target, told } = world();
    expect(() =>
      createLevelApplier(target).apply(aPlan([aFigure("lamp")])),
    ).not.toThrow();
    expect(told).toEqual([]);
  });
});
