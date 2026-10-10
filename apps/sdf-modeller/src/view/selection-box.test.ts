// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Scene, type Mesh } from "@random-mesh/rmsl/scene";

import { createSelectionBox } from "./selection-box";
import { axisAngle, placedPart } from "../model/part";

/**
 * The box that marks a selection, as geometry.
 *
 * **rmsl's `Scene` and the geometry classes are arithmetic and need no WebGL context**, so
 * the one claim here that cannot be checked by looking at a screen — that the box is turned
 * with the part so an outline around a laid-down limb is not a loose upright box — is pinned
 * against numbers.
 */

const theMesh = (scene: Scene): Mesh => scene.children[0] as Mesh;

describe("the selection box", () => {
  it("starts hidden, so an empty selection draws nothing", () => {
    const scene = new Scene();
    createSelectionBox(scene);
    expect(theMesh(scene).visible).toBe(false);
  });

  it("stands on the part and is as big as its box", () => {
    const scene = new Scene();
    const box = createSelectionBox(scene);
    // A hard box of `len` 1 has half-extents 1 padded by `shapePadding`'s 1, so a full size
    // of 4 on every axis.
    box.show(
      placedPart(
        "part",
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        {
          x: 3,
          y: 4,
          z: 5,
        },
      ),
    );
    const mesh = theMesh(scene);
    expect(mesh.position).toEqual({ x: 3, y: 4, z: 5 });
    expect(mesh.scale).toEqual({ x: 4, y: 4, z: 4 });
    expect(mesh.visible).toBe(true);
  });

  it("turns with the part", () => {
    const scene = new Scene();
    const box = createSelectionBox(scene);
    box.show(
      placedPart(
        "part",
        { type: "Box", len: { x: 5, y: 0.5, z: 0.5 } },
        { x: 0, y: 0, z: 0 },
        { orientation: axisAngle(0, 0, 1, Math.PI / 2) },
      ),
    );
    // A quarter turn about Z is `sin(45°)` on its own axis and `cos(45°)` on `w`.
    expect(theMesh(scene).quaternion.z).toBeCloseTo(Math.SQRT1_2);
    expect(theMesh(scene).quaternion.w).toBeCloseTo(Math.SQRT1_2);
  });

  it("hides the box it showed, and takes it out of the scene on dispose", () => {
    const scene = new Scene();
    const box = createSelectionBox(scene);
    box.show(
      placedPart("part", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    );
    box.hide();
    expect(theMesh(scene).visible).toBe(false);
    box.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
