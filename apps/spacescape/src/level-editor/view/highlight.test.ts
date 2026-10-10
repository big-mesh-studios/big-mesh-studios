// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Group, Scene } from "@random-mesh/rmsl/scene";

import { createHighlight, highlightBounds } from "./highlight";
import type { LevelFigure, LevelShape } from "../../places/level/types";

/**
 * rmsl has no render-order key, so **draw order is the order things were added to the
 * scene** ([ADR 0014](../../../../docs/adr/0014-the-sky-dome-is-drawn-first.md)).
 *
 * That makes the scene graph's shape a load-bearing property rather than a tidiness
 * question, and it fails silently: a highlight added in the wrong place still draws, just
 * behind the thing it is highlighting, and nothing anywhere reports it. voxelscape pins
 * the same thing with a scene-order assertion, and this is that.
 */

/** Where the terrain, the figures and the highlight have to sit relative to each other. */
describe("the highlight is drawn over everything it highlights", () => {
  it("is added after the figures and the terrain", () => {
    const scene = new Scene();
    // The order `app.tsx` builds the world in: sky, terrain, water, zones, figures.
    const sky = new Group();
    const terrain = new Group();
    const sea = new Group();
    const zones = new Group();
    const figures = new Group();
    scene.add(sky, terrain, sea, zones, figures);

    const highlight = createHighlight(scene);

    // **After every one of them**, or it draws behind whatever it is highlighting.
    const added = scene.children.map((child) => child);
    expect(added.indexOf(highlight.mesh)).toBeGreaterThan(
      added.indexOf(figures),
    );
    expect(added.indexOf(highlight.mesh)).toBeGreaterThan(
      added.indexOf(terrain),
    );
    expect(added.at(-1)).toBe(highlight.mesh);

    highlight.dispose();
  });

  it("takes itself back out, so a closed editor leaves nothing in the world", () => {
    const scene = new Scene();
    const figures = new Group();
    scene.add(figures);

    const highlight = createHighlight(scene);
    expect(scene.children).toContain(highlight.mesh);

    highlight.dispose();
    expect(scene.children).not.toContain(highlight.mesh);
    expect(scene.children).toContain(figures);
  });
});

describe("the box drawn around a selection", () => {
  const aShape: LevelShape = {
    kind: "shape",
    id: "wall",
    at: [10, 20, 30],
    shape: { type: "Box", len: { x: 40, y: 6, z: 40 } },
    combine: "Add",
  };
  const aFigure: LevelFigure = {
    kind: "figure",
    id: "lamp",
    figure: "prop",
    model: "lantern.sdfmod",
    at: [4, 8, -6],
  };

  it("is the shape's own box", () => {
    const box = highlightBounds(aShape);
    expect(box.min.x).toBe(10 - 40 - 1);
    expect(box.max.z).toBe(30 + 40 + 1);
  });

  it("is the model's own box around a figure, which is measured not guessed", () => {
    // A hard-coded size would highlight a fridge as a lamp. `FigureModel.half` is the
    // model's own measured bounds, so the box is right for whatever was attached.
    const box = highlightBounds(aFigure, { x: 3, y: 5, z: 3 });
    expect(box).toEqual({
      min: { x: 1, y: 3, z: -9 },
      max: { x: 7, y: 13, z: -3 },
    });
  });

  it("puts a mesh over that box, centred and scaled to it", () => {
    const scene = new Scene();
    const highlight = createHighlight(scene);

    highlight.show({ min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 20, z: 30 } });

    // Centred, because the geometry is a unit cube and the mesh carries the extent.
    expect(highlight.mesh.position).toMatchObject({ x: 5, y: 10, z: 15 });
    expect(highlight.mesh.scale).toMatchObject({ x: 10, y: 20, z: 30 });
    expect(highlight.mesh.visible).toBe(true);

    highlight.dispose();
  });

  it("is invisible until something is selected", () => {
    const scene = new Scene();
    const highlight = createHighlight(scene);
    expect(highlight.mesh.visible).toBe(false);

    highlight.show({ min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } });
    expect(highlight.mesh.visible).toBe(true);

    highlight.hide();
    expect(highlight.mesh.visible).toBe(false);

    highlight.dispose();
  });

  it("never collapses to nothing, so a degenerate box cannot break the mesh", () => {
    // A shape with every extent at zero would scale the mesh to zero and produce a
    // singular transform, which shows up as an invisible object and a warning nobody
    // reads. The floor is small enough to be invisible and large enough to be finite.
    const scene = new Scene();
    const highlight = createHighlight(scene);
    highlight.show({ min: { x: 5, y: 5, z: 5 }, max: { x: 5, y: 5, z: 5 } });
    expect(highlight.mesh.scale.x).toBeGreaterThan(0);
    highlight.dispose();
  });
});
