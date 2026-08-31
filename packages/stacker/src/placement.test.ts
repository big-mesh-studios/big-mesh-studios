import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import { boxSize, figurePlacement } from "./box";
import { FigureMeshes, solveFigure } from "./figure-meshes";
import {
  centrePivot,
  sideAxes,
  sideKinds,
  type Figure,
  type Part,
} from "./data";

/** A part of the given size, pivoting on its own middle unless told otherwise. */
const partOf = (
  name: string,
  extent: { width: number; height: number; depth: number },
  placement: Partial<Pick<Part, "root" | "pivot" | "parent">> = {},
): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => {
      const [across, down] = sideAxes[kind];
      return [kind, Bitmap.create(extent[across], extent[down])];
    }),
  ) as Part["sides"],
  root: placement.root ?? Vector3D.create(),
  pivot: placement.pivot ?? centrePivot(extent),
  parent: placement.parent ?? null,
});

const figureOf = (...parts: Part[]): Figure => ({ parts, palette: [] });

/** How wide one voxel of `part` comes out once its placement is applied. */
const drawnVoxelWidth = (part: Part, scale: number) =>
  (boxSize({
    width: part.sides.front.width,
    height: part.sides.front.height,
    depth: part.sides.left.width,
  }).width *
    scale) /
  // boxSize pads the volume by one voxel on each side, so its width covers two
  // more voxels than the model has.
  (part.sides.front.width + 2);

describe("figurePlacement", () => {
  it("draws a voxel the same size in every part, whatever each part's own box", () => {
    const small = partOf("small", { width: 8, height: 8, depth: 8 });
    const large = partOf("large", { width: 20, height: 20, depth: 20 });

    const { placements } = figurePlacement(figureOf(small, large));

    expect(drawnVoxelWidth(small, placements[0].scale)).toBeCloseTo(
      drawnVoxelWidth(large, placements[1].scale),
    );
  });

  it("centres a figure of one part on the origin, as a lone model is drawn", () => {
    const { placements } = figurePlacement(
      figureOf(partOf("body", { width: 15, height: 15, depth: 15 })),
    );

    expect(placements[0].position.x).toBeCloseTo(0);
    expect(placements[0].position.y).toBeCloseTo(0);
    expect(placements[0].position.z).toBeCloseTo(0);
  });

  it("fills about the same space as a lone model, so the camera still frames it", () => {
    const alone = figurePlacement(
      figureOf(partOf("body", { width: 16, height: 16, depth: 16 })),
    );

    // A 16-voxel box, one voxel to the unit, spans one unit across.
    expect(alone.voxelSize * 16).toBeCloseTo(1);
  });

  it("puts a part where its root says, in voxels of the shared size", () => {
    const figure = figureOf(
      partOf("torso", { width: 10, height: 10, depth: 10 }),
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        { root: Vector3D.create(0, 8, 0) },
      ),
    );

    const { voxelSize, placements } = figurePlacement(figure);

    expect(placements[1].position.y - placements[0].position.y).toBeCloseTo(
      8 * voxelSize,
    );
  });

  it("carries a part's root through its parent's", () => {
    const figure = figureOf(
      partOf(
        "torso",
        { width: 10, height: 10, depth: 10 },
        { root: Vector3D.create(0, 5, 0) },
      ),
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        { root: Vector3D.create(0, 8, 0), parent: "torso" },
      ),
    );

    const { voxelSize, placements } = figurePlacement(figure);

    // The head sits eight above the torso, which itself sits five above the
    // origin: thirteen from the figure's origin.
    expect(placements[1].position.y).toBeCloseTo(13 * voxelSize);
  });

  it("leaves the other parts where they were when one part is moved", () => {
    const before = figurePlacement(
      figureOf(
        partOf("torso", { width: 20, height: 20, depth: 20 }),
        partOf(
          "head",
          { width: 4, height: 4, depth: 4 },
          { root: Vector3D.create(0, 4, 0) },
        ),
      ),
    );
    const after = figurePlacement(
      figureOf(
        partOf("torso", { width: 20, height: 20, depth: 20 }),
        partOf(
          "head",
          { width: 4, height: 4, depth: 4 },
          { root: Vector3D.create(0, 6, 0) },
        ),
      ),
    );

    // The head stays inside the torso's span either way, so the figure's span
    // does not change and the torso is drawn in exactly the same place.
    expect(after.voxelSize).toBeCloseTo(before.voxelSize);
    expect(after.placements[0].position).toEqual(before.placements[0].position);
  });

  it("measures the box every part together fills, in voxels", () => {
    const figure = figureOf(
      partOf("torso", { width: 10, height: 12, depth: 6 }),
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        { root: Vector3D.create(0, 8, 0) },
      ),
    );

    const { extent } = figurePlacement(figure);

    // The torso spans -6..6 high about the origin and the head 6..10, so the
    // figure is sixteen high; neither part reaches past the torso's own width
    // or depth.
    expect(extent).toEqual({ width: 10, height: 16, depth: 6 });
  });

  it("draws a figure of one part inside the box that lone model is drawn in", () => {
    const dimensions = { width: 12, height: 20, depth: 7 };

    const { size } = figurePlacement(figureOf(partOf("body", dimensions)));

    expect(size.width).toBeCloseTo(boxSize(dimensions).width);
    expect(size.height).toBeCloseTo(boxSize(dimensions).height);
    expect(size.depth).toBeCloseTo(boxSize(dimensions).depth);
  });

  it("reaches a voxel past the outermost part, as each part's own box does", () => {
    const figure = figureOf(
      partOf("torso", { width: 10, height: 12, depth: 6 }),
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        { root: Vector3D.create(0, 8, 0) },
      ),
    );

    const { size, voxelSize } = figurePlacement(figure);

    // Sixteen voxels high, plus the one voxel of padding at the top and the one
    // at the bottom.
    expect(size.height).toBeCloseTo(18 * voxelSize);
  });

  it("gives a figure with no parts something to draw at", () => {
    expect(figurePlacement(figureOf())).toEqual({
      voxelSize: 1,
      extent: { width: 0, height: 0, depth: 0 },
      size: { width: 0, height: 0, depth: 0 },
      placements: [],
    });
  });
});

describe("FigureMeshes drawn at a voxel size of its own", () => {
  /** Two parts standing apart along x, the second `apartBy` voxels out. */
  const twoParts = (apartBy: number) =>
    figureOf(
      partOf(
        "still",
        { width: 8, height: 8, depth: 8 },
        {
          root: Vector3D.create(-6, 0, 0),
        },
      ),
      partOf(
        "moved",
        { width: 8, height: 8, depth: 8 },
        {
          root: Vector3D.create(apartBy, 0, 0),
        },
      ),
    );

  it("moves the part that moved by what its root changed, and moves no other", () => {
    const figure = twoParts(10);
    const held = figurePlacement(figure).voxelSize;
    const meshes = new FigureMeshes();

    meshes.sync(figure, solveFigure(figure), figurePlacement(figure, held));
    const still = meshes.meshFor("still")!.position.x;
    const moved = meshes.meshFor("moved")!.position.x;

    const slid = twoParts(15);
    meshes.sync(slid, solveFigure(slid), figurePlacement(slid, held));

    expect(meshes.meshFor("still")!.position.x).toBeCloseTo(still);
    expect(meshes.meshFor("moved")!.position.x).toBeCloseTo(moved + 5 * held);
  });

  it("draws a figure at the size it measures to when it is given none", () => {
    // Measured afresh, a part carried outwards makes every voxel in the figure
    // smaller, which draws the parts standing still nearer the origin — what a
    // drag holds a voxel size still to keep from happening under the pointer.
    const figure = twoParts(10);
    const meshes = new FigureMeshes();

    meshes.sync(figure, solveFigure(figure));
    const still = meshes.meshFor("still")!.position.x;

    const slid = twoParts(15);
    meshes.sync(slid, solveFigure(slid));

    expect(meshes.meshFor("still")!.position.x).toBeGreaterThan(still);
  });
});
