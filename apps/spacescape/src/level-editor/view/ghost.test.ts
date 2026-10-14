/**
 * The drag ghost, and the two kinds of mesh it can be shown from.
 *
 * The one claim here that is easy to get wrong and impossible to check by looking is **who
 * owns the geometry**: a shape's ghost is built per drag and is the ghost's to free, while a
 * figure's ghost is drawn over the model's own geometry and is nobody's to free. Disposing
 * the shared one takes every other placement of that model out of the world with it — a
 * fridge disappearing because somebody dragged a lamp — and nothing reports it.
 */
import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  Mesh,
  Scene,
  type BufferGeometry,
} from "@random-mesh/rmsl/scene";

import { createGhost, shapeGhostMesh } from "./ghost";
import type { LevelShape } from "../../places/level/types";

const aShape: LevelShape = {
  kind: "shape",
  id: "wall",
  at: [10, 20, 30],
  shape: { type: "Box", len: { x: 40, y: 6, z: 40 } },
  combine: "Add",
};

/** A geometry that says whether it was freed, which `dispose` on a bare one does not. */
const counted = (): { geometry: BufferGeometry; frees: () => number } => {
  const geometry = new BoxGeometry(1, 1, 1);
  let frees = 0;
  const real = geometry.dispose.bind(geometry);
  geometry.dispose = () => {
    frees += 1;
    real();
  };
  return { geometry, frees: () => frees };
};

describe("the ghost's place in the scene", () => {
  it("is inside a group of its own, added once", () => {
    // **The whole reason there is a group.** rmsl draws in scene-graph order, so a mesh
    // added straight to the scene lands at the end of it — which would put the ghost after
    // the gizmo handles on the second drag, and the handles' whole visibility rests on
    // being traversed last.
    const scene = new Scene();
    const ghost = createGhost(scene);

    const mesh = new Mesh(new BoxGeometry(1, 1, 1), ghost.material);
    ghost.show(mesh, true);
    ghost.moveTo({ x: 1, y: 2, z: 3 });

    // The mesh moved, and the scene's children did not gain it.
    expect(scene.children).toHaveLength(1);
    expect(scene.children[0]?.children).toContain(mesh);

    ghost.dispose();
  });

  it("stays where it was put after a drag, across show and hide", () => {
    const scene = new Scene();
    const ghost = createGhost(scene);
    const placed = scene.children[0];

    ghost.show(new Mesh(new BoxGeometry(1, 1, 1), ghost.material), true);
    ghost.hide();
    ghost.show(new Mesh(new BoxGeometry(1, 1, 1), ghost.material), true);

    expect(scene.children[0]).toBe(placed);

    ghost.dispose();
  });

  it("takes its group out of the scene when disposed", () => {
    const scene = new Scene();
    const ghost = createGhost(scene);
    ghost.dispose();
    expect(scene.children).toHaveLength(0);
  });
});

describe("moving and turning the ghost", () => {
  const shown = () => {
    const scene = new Scene();
    const ghost = createGhost(scene);
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), ghost.material);
    ghost.show(mesh, true);
    return { ghost, mesh };
  };

  it("puts a copy where the item stands", () => {
    const { ghost, mesh } = shown();
    ghost.moveTo({ x: 10, y: 20, z: 30 });
    expect(mesh.position).toMatchObject({ x: 10, y: 20, z: 30 });
    ghost.dispose();
  });

  it("turns it without touching where it stands", () => {
    // **A position write and a quaternion write, and nothing else.** A rotate drag costs
    // one of these per frame; anything that re-meshed here would cost a drag's worth of
    // surface nets instead.
    const { ghost, mesh } = shown();
    ghost.moveTo({ x: 10, y: 20, z: 30 });
    ghost.turnTo({ x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 });

    expect(mesh.quaternion).toMatchObject({
      x: 0,
      y: Math.SQRT1_2,
      z: 0,
      w: Math.SQRT1_2,
    });
    expect(mesh.position).toMatchObject({ x: 10, y: 20, z: 30 });
    ghost.dispose();
  });

  it("has nothing to move when nothing is shown", () => {
    // A shape with no surface gives the caller no mesh, and the drag still runs — a mesh is
    // the proposal's face, not its mechanism.
    const scene = new Scene();
    const ghost = createGhost(scene);
    expect(() => {
      ghost.show(undefined, true);
      ghost.moveTo({ x: 1, y: 2, z: 3 });
      ghost.turnTo({ x: 0, y: 0, z: 0, w: 1 });
      ghost.hide();
    }).not.toThrow();
    ghost.dispose();
  });

  it("shows nothing while hidden", () => {
    const scene = new Scene();
    const ghost = createGhost(scene);
    ghost.show(new Mesh(new BoxGeometry(1, 1, 1), ghost.material), true);
    ghost.hide();
    expect(scene.children[0]?.children).toHaveLength(0);
    ghost.dispose();
  });
});

describe("who frees the ghost's geometry", () => {
  it("frees a geometry it was told it owns, when the drag ends", () => {
    const scene = new Scene();
    const ghost = createGhost(scene);
    const { geometry, frees } = counted();

    ghost.show(new Mesh(geometry, ghost.material), true);
    expect(frees()).toBe(0);

    ghost.hide();
    expect(frees()).toBe(1);
    ghost.dispose();
  });

  it("never frees one it was told belongs to a model", () => {
    // **The failure this whole flag exists to prevent.** A figure's ghost is drawn over the
    // model's own shared geometry, and that geometry belongs to every other placement of
    // that model. Freeing it takes a fridge out of the world because somebody dragged a lamp.
    const scene = new Scene();
    const ghost = createGhost(scene);
    const { geometry, frees } = counted();

    ghost.show(new Mesh(geometry, ghost.material), false);
    ghost.hide();
    ghost.dispose();
    ghost.dispose();

    expect(frees()).toBe(0);
  });

  it("frees the previous drag's geometry when a new one starts", () => {
    // Or a level of dragged shapes leaks a geometry per drag, and the renderer holds the
    // buffers for as long as it lives (`render/chunk-geometry.ts`).
    const scene = new Scene();
    const ghost = createGhost(scene);
    const first = counted();
    const second = counted();

    ghost.show(new Mesh(first.geometry, ghost.material), true);
    ghost.show(new Mesh(second.geometry, ghost.material), true);

    expect(first.frees()).toBe(1);
    expect(second.frees()).toBe(0);
    ghost.dispose();
    expect(second.frees()).toBe(1);
  });
});

describe("the mesh a dragged shape is drawn from", () => {
  it("meshes a subtract as the wall it is, not as nothing", () => {
    // **A lone `Subtract` folded against a base of `Infinity` comes out as nothing at all.**
    // Showing somebody dragging a doorway somewhere an empty ghost would be the most
    // confusing thing this tool could do.
    const scene = new Scene();
    const ghost = createGhost(scene);

    const wall = shapeGhostMesh(aShape, ghost.material);
    expect(wall).toBeDefined();

    const doorway = shapeGhostMesh(
      { ...aShape, combine: "Subtract" },
      ghost.material,
    );
    expect(doorway).toBeDefined();
    expect(doorway?.geometry).not.toBe(wall?.geometry);

    ghost.dispose();
  });

  it("bakes in no turn, so a rotate drag costs a write and not a re-mesh", () => {
    // **The reason `shapeGhostMesh` hands the mesher the identity.** `primitiveMesh` keeps
    // whatever orientation it is given, so passing the shape's own would bake the turn into
    // the vertices — and then turning the ghost would turn a mesh that no longer matches
    // the shape. The ghost's `turnTo` is where a turn belongs.
    //
    // **On a shape the turn actually moves, which is worth saying because it is easy to get
    // wrong.** A square-planed box turned a quarter turn about up is the same box, so a test
    // written on one would pass against the very thing it exists to catch. This one is 40 ×
    // 6 × 20, and a quarter turn about up swaps its two unequal extents.
    const scene = new Scene();
    const ghost = createGhost(scene);
    const lopsided: LevelShape = {
      ...aShape,
      shape: { type: "Box", len: { x: 40, y: 6, z: 20 } },
    };

    const plain = shapeGhostMesh(lopsided, ghost.material);
    const turned = shapeGhostMesh(
      { ...lopsided, orientation: [0, Math.SQRT1_2, 0, Math.SQRT1_2] },
      ghost.material,
    );

    // **Compared vertex for vertex rather than by object equality**, because the claim is
    // that the *vertices* are the same — and a re-mesh of a turned shape produces the same
    // number of vertices as an un-turned one, which is exactly what would make a shallower
    // check pass while the geometry was wrong.
    const positionsOf = (mesh: Mesh | undefined): Float32Array | undefined => {
      const attribute = mesh?.geometry.getAttribute("position");
      return attribute?.array as Float32Array | undefined;
    };
    const unturned = positionsOf(plain);
    const wouldBeTurned = positionsOf(turned);

    expect(unturned).toBeDefined();
    expect(wouldBeTurned).toHaveLength(unturned!.length);
    expect(Array.from(wouldBeTurned!)).toEqual(Array.from(unturned!));

    ghost.dispose();
  });
});
