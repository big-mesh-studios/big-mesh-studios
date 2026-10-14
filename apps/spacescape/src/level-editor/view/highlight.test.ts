// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Group, Scene } from "@random-mesh/rmsl/scene";

import { createHighlight, highlightBounds } from "./highlight";
import type { OrientedBox } from "./picking";
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

  /** A box standing at the origin with nothing to say about which way it faces. */
  const upright = (
    half: { x: number; y: number; z: number },
    centre = { x: 0, y: 0, z: 0 },
  ): OrientedBox => ({
    centre,
    half,
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  });

  it("is the shape's own box", () => {
    const box = highlightBounds(aShape);
    expect(box.centre).toEqual({ x: 10, y: 20, z: 30 });
    expect(box.half.x).toBe(41);
    expect(box.half.z).toBe(41);
  });

  it("is the model's own box around a figure, which is measured not guessed", () => {
    // A hard-coded size would highlight a fridge as a lamp. `FigureModel.half` is the
    // model's own measured bounds, so the box is right for whatever was attached.
    expect(highlightBounds(aFigure, { x: 3, y: 5, z: 3 })).toEqual({
      centre: { x: 4, y: 8, z: -6 },
      half: { x: 3, y: 5, z: 3 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    });
  });

  it("turns with the shape it is around", () => {
    // The reason `show` takes an `OrientedBox` and not a `{min, max}` pair (ADR 0051). A
    // selection that stayed upright while its subject lay at 45° would be a box round the
    // wrong shape — and it would read as a selection that stopped taking.
    const box = highlightBounds({
      ...aShape,
      orientation: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
    });
    expect(box.orientation).toEqual({
      x: 0,
      y: Math.SQRT1_2,
      z: 0,
      w: Math.SQRT1_2,
    });
    // **And the reach is unchanged**, because `half` is measured along the shape's own axes
    // and the axes are what the turn moves.
    expect(box.half).toEqual(highlightBounds(aShape).half);
  });

  it("puts a mesh over that box, centred and scaled to it", () => {
    const scene = new Scene();
    const highlight = createHighlight(scene);

    highlight.show(upright({ x: 5, y: 10, z: 15 }, { x: 5, y: 10, z: 15 }));

    // On the centre, because the geometry is a unit cube and the mesh carries the extent —
    // and doubled, because a unit cube's reach is half its scale.
    expect(highlight.mesh.position).toMatchObject({ x: 5, y: 10, z: 15 });
    expect(highlight.mesh.scale).toMatchObject({ x: 10, y: 20, z: 30 });
    expect(highlight.mesh.visible).toBe(true);

    highlight.dispose();
  });

  it("carries the box's turn onto the mesh, not just its size", () => {
    const scene = new Scene();
    const highlight = createHighlight(scene);
    const turn = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 };

    highlight.show({ ...upright({ x: 4, y: 1, z: 4 }), orientation: turn });

    expect(highlight.mesh.quaternion).toMatchObject(turn);
    // **The middle does not move.** rmsl scales, then turns, then translates, so the box
    // turns about its own centre rather than swinging away from the shape.
    expect(highlight.mesh.position).toMatchObject({ x: 0, y: 0, z: 0 });

    highlight.dispose();
  });

  it("is invisible until something is selected", () => {
    const scene = new Scene();
    const highlight = createHighlight(scene);
    expect(highlight.mesh.visible).toBe(false);

    highlight.show(upright({ x: 1, y: 1, z: 1 }));
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
    highlight.show(upright({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 }));
    expect(highlight.mesh.scale.x).toBeGreaterThan(0);
    highlight.dispose();
  });
});
