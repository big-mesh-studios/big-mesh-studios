// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { BufferGeometry, Mesh, NodeMaterial } from "@random-mesh/rmsl/scene";

import { Field, OperationBVH, makeOperation } from "@big-mesh-studios/csg";

import { FigureSet } from "./figure-set";
import { GameWorld } from "../world/game-world";

/**
 * `draw` as a real model has it: a closure over **one** geometry.
 *
 * **The first version of this helper called `new BufferGeometry()` inside `draw`,** so every
 * instance of a model got its own — which is exactly the mistake ADR 0047 exists to prevent,
 * introduced by the test that was meant to be checking for it. A fixture that defeats the
 * mechanism it is testing is worse than no fixture: the test passes for the wrong reason and
 * nobody looks again.
 */
const drawOver =
  (geometry: BufferGeometry) =>
  (m: NodeMaterial): Mesh =>
    new Mesh(geometry, m);

/** A sphere model, which is the one shape whose field is exact. */
const model = (radius: number) => {
  const geometry = new BufferGeometry();
  return {
    name: "ball",
    operations: [
      makeOperation(0, { x: 0, y: 0, z: 0 }, { type: "Sphere", radius }, "Add"),
    ],
    field: new Field(
      new OperationBVH([
        makeOperation(
          0,
          { x: 0, y: 0, z: 0 },
          { type: "Sphere", radius },
          "Add",
        ),
      ]),
      { base: () => Infinity, step: radius / 4 },
    ),
    bounds: {
      min: { x: -radius, y: -radius, z: -radius },
      max: { x: radius, y: radius, z: radius },
    },
    half: { x: radius, y: radius, z: radius },
    triangles: 0,
    draw: drawOver(geometry),
    dispose: () => geometry.dispose(),
  };
};

/**
 * A model with no drawable geometry.
 *
 * **Because a figure with no mesh is a real state, not a degenerate one**: a `.sdfmod` whose
 * operations are smaller than one sample meshes to nothing, and a place that stands one should
 * have a figure that collides rather than a script error.
 */
const blankModel = () => ({
  ...model(1),
  draw: () => undefined,
});

const material = () => new NodeMaterial();

/**
 * A second material, standing in for the terrain's and the aimed figure's.
 *
 * **Two instances rather than one, which is the point of the whole mechanism.** rmsl has no
 * per-mesh uniform and `onBeforeRender` carries neither the mesh nor the material, so "tint this
 * one and not the others" can only be said by giving the aimed figure a different material.
 */
const materials = () => {
  const plain = new NodeMaterial();
  const tinted = new NodeMaterial();
  return { plain, tinted, set: new FigureSet(plain, tinted) };
};

describe("FigureSet", () => {
  it("adds a figure, and refuses a second one with the same id", () => {
    const figures = new FigureSet(material());
    const ball = model(1);

    expect(
      figures.add({
        id: "a",
        kind: "prop",
        model: ball,
        at: { x: 0, y: 0, z: 0 },
      }),
    ).toBeDefined();
    // **Refused rather than replaced**, for the reason `PlaceRegistry.add` refuses: two peers
    // must not disagree about whether an id means the first figure or the second.
    expect(
      figures.add({
        id: "a",
        kind: "prop",
        model: ball,
        at: { x: 9, y: 0, z: 0 },
      }),
    ).toBeUndefined();
    expect(figures.size).toBe(1);
    expect(figures.get("a")!.transform.at).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("moves a figure by writing three numbers, and says whether there was one", () => {
    const figures = new FigureSet(material());
    figures.add({
      id: "a",
      kind: "npc",
      model: model(1),
      at: { x: 0, y: 0, z: 0 },
    });

    expect(figures.move("a", { x: 5, y: 0, z: 0 })).toBe(true);
    expect(figures.get("a")!.transform.at).toEqual({ x: 5, y: 0, z: 0 });
    // Yaw is left alone when the caller does not name one, because a move is a move.
    figures.move("a", { x: 6, y: 0, z: 0 }, 1);
    expect(figures.get("a")!.transform.yaw).toBe(1);
    expect(figures.move("nothing", { x: 0, y: 0, z: 0 })).toBe(false);
  });

  it("keeps a figure with no surface, rather than refusing to place it", () => {
    // **A `.sdfmod` smaller than one sample meshes to nothing**, and a place that stands one
    // should get a figure that collides rather than a script error. The mesh is optional
    // everywhere it is read for exactly this.
    const figures = new FigureSet(material());
    const figure = figures.add({
      id: "blank",
      kind: "prop",
      model: blankModel(),
      at: { x: 0, y: 0, z: 0 },
    });

    expect(figure).toBeDefined();
    expect(figure!.mesh).toBeUndefined();
    expect(figures.size).toBe(1);
  });

  it("collides against its solid figures and ignores the rest", () => {
    const figures = new FigureSet(material());
    figures.add({
      id: "fridge",
      kind: "prop",
      model: model(2),
      at: { x: 0, y: 0, z: 0 },
    });
    figures.add({
      id: "coin",
      kind: "prop",
      model: model(0.4),
      at: { x: 10, y: 0, z: 0 },
      solid: false,
    });

    expect(figures.solidDistanceAt({ x: 0, y: 0, z: 0 })).toBeLessThan(0);
    // **And the coin is not in the way, which is the whole reason `solid` exists**: a pickup
    // you walk through is a pickup, and a pickup you trip over is a bug.
    expect(figures.solidDistanceAt({ x: 10, y: 0, z: 0 })).toBeGreaterThan(1);
  });

  it("answers undefined for a distance when nothing is solid at all", () => {
    // **Different from "far away",** and the same distinction `getMediumAt` draws: a world with
    // no figures and a world with figures that are all far away are different states.
    expect(
      new FigureSet(material()).solidDistanceAt({ x: 0, y: 0, z: 0 }),
    ).toBeUndefined();
  });

  it("takes a figure out of the scene, and forgets it", () => {
    const figures = new FigureSet(material());
    figures.add({
      id: "a",
      kind: "prop",
      model: model(1),
      at: { x: 0, y: 0, z: 0 },
    });

    expect(figures.remove("a")).toBe(true);
    expect(figures.remove("a")).toBe(false);
    expect(figures.size).toBe(0);
    expect(figures.get("a")).toBeUndefined();
  });

  it("forgets everything when it is cleared", () => {
    const figures = new FigureSet(material());
    figures.add({
      id: "a",
      kind: "prop",
      model: model(1),
      at: { x: 0, y: 0, z: 0 },
    });
    figures.add({
      id: "b",
      kind: "npc",
      model: model(1),
      at: { x: 3, y: 0, z: 0 },
    });

    figures.clear();
    expect(figures.size).toBe(0);
    expect(figures.ids()).toEqual([]);
  });

  it("tints exactly the figure it is aimed at, and no other", () => {
    // **One field on one mesh.** The geometry is still the model's and still shared, which is
    // the property that makes twelve fridges cost one fridge.
    const { plain, tinted, set } = materials();
    const ball = model(1);
    set.add({ id: "a", kind: "prop", model: ball, at: { x: 0, y: 0, z: 0 } });
    set.add({ id: "b", kind: "prop", model: ball, at: { x: 0, y: 0, z: 30 } });

    set.aim("a");
    expect(set.get("a")!.mesh!.material).toBe(tinted);
    expect(set.get("b")!.mesh!.material).toBe(plain);
    expect(set.aimed?.id).toBe("a");

    // **And it moves**, because a crosshair that moved and left the tint behind would be
    // pointing at the wrong figure for as long as it took to notice.
    set.aim("b");
    expect(set.get("a")!.mesh!.material).toBe(plain);
    expect(set.get("b")!.mesh!.material).toBe(tinted);

    // **And it clears**, so "aimed at nothing" is expressible — a frame in which the crosshair
    // left every figure has to be able to say so.
    set.aim(undefined);
    expect(set.get("b")!.mesh!.material).toBe(plain);
    expect(set.aimed).toBeUndefined();
  });

  it("leaves the geometry shared while it tints", () => {
    // **The mechanism from ADR 0047, under the one operation that could undo it.** A tint
    // implemented by cloning the geometry would pass every test above and quietly give a place
    // with twelve of one model twelve models' worth of buffers.
    const { set } = materials();
    const ball = model(1);
    for (let i = 0; i < 12; i++) {
      set.add({
        id: `i${i}`,
        kind: "prop",
        model: ball,
        at: { x: i, y: 0, z: 0 },
      });
    }
    set.aim("i7");

    const geometries = new Set(
      set.list().map((figure) => figure.mesh!.geometry),
    );
    expect(geometries.size, "twelve tinted-or-not, one geometry").toBe(1);
  });

  it("clears the tint when the aimed figure is taken out", () => {
    // **A tint left on a dead mesh** would mean the next `aim` of that id short-circuits — and
    // since an id is never reused, it would never be cleared at all.
    const { set } = materials();
    set.add({
      id: "a",
      kind: "prop",
      model: model(1),
      at: { x: 0, y: 0, z: 0 },
    });
    set.aim("a");

    set.remove("a");
    expect(set.aimed).toBeUndefined();
  });

  it("treats an unknown id as aimed at nothing rather than as an error", () => {
    // **A frame's worth of staleness, which is the only way an unknown id arrives here.**
    const { plain, set } = materials();
    set.add({
      id: "a",
      kind: "prop",
      model: model(1),
      at: { x: 0, y: 0, z: 0 },
    });
    set.aim("gone");

    expect(set.aimed).toBeUndefined();
    expect(set.get("a")!.mesh!.material).toBe(plain);
  });

  it("finds what the crosshair is on", () => {
    const figures = new FigureSet(material());
    figures.add({
      id: "far",
      kind: "prop",
      model: model(1),
      at: { x: 0, y: 0, z: 30 },
    });

    expect(
      figures.pick({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })?.figure.id,
    ).toBe("far");
    expect(
      figures.pick({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }),
    ).toBeUndefined();
  });
});

describe("a world with figures in it", () => {
  /**
   * **The seam, tested as the thing it promises.** A figure is not in the fold (ADR 0047), so
   * the only way the player collides with one is if the world asks the figures as well as the
   * field — and the only way that can be right is if it asks both with one `min`, because
   * `getSolidAt` wants the sign and `getGroundDistanceAt` wants a length to step by.
   */
  const world = (figures: FigureSet) =>
    new GameWorld({
      field: () => ({
        distance: () => 100,
        gradient: () => ({ x: 0, y: 1, z: 0 }),
      }),
      figureDistanceAt: (p) => figures.solidDistanceAt(p),
    });

  it("says a figure is solid even though the field says there is nothing there", () => {
    const figures = new FigureSet(material());
    figures.add({
      id: "a",
      kind: "prop",
      model: model(2),
      at: { x: 0, y: 0, z: 0 },
    });

    expect(world(figures).getSolidAt({ x: 0, y: 0, z: 0 })).toBe(true);
    expect(world(figures).getSolidAt({ x: 50, y: 0, z: 0 })).toBe(false);
  });

  it("finds the top of a figure to stand on, which is what a step-height cannot do", () => {
    const figures = new FigureSet(material());
    figures.add({
      id: "a",
      kind: "prop",
      model: model(2),
      at: { x: 0, y: 0, z: 0 },
    });

    // Standing below the sphere's top, the march walks out of it and stops on its surface —
    // so a player can stand on a figure exactly as they stand on terrain.
    const surface = world(figures).getGroundDistanceAt(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    expect(surface).toBeCloseTo(2, 6);
  });

  it("is unchanged with no figures, which is every world that is not a place's", () => {
    const empty = new FigureSet(material());
    // `undefined` from the reader means "no figures", so the field is used on its own — the
    // same distinction `mediumAt` draws, and the same reason the option is optional.
    expect(world(empty).getSolidAt({ x: 0, y: 0, z: 0 })).toBe(false);
  });
});
