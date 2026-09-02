import { describe, expect, it } from "vitest";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import { Group } from "@random-mesh/rmsl/scene";
import { boundsCentre, boxSize, figurePlacement, fitVoxelSize } from "./box";
import {
  applyFraming,
  FigureMeshes,
  solveFigure,
  voxelReach,
} from "./figure-meshes";
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
  sections: [],
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
  it("draws a voxel one unit across in every part, whatever each part's own box", () => {
    const small = partOf("small", { width: 8, height: 8, depth: 8 });
    const large = partOf("large", { width: 20, height: 20, depth: 20 });

    const { placements } = figurePlacement(figureOf(small, large));

    expect(drawnVoxelWidth(small, placements[0].scale)).toBeCloseTo(1);
    expect(drawnVoxelWidth(large, placements[1].scale)).toBeCloseTo(1);
  });

  it("centres a figure of one part on the origin, as a lone model is drawn", () => {
    const { placements } = figurePlacement(
      figureOf(partOf("body", { width: 15, height: 15, depth: 15 })),
    );

    expect(placements[0].position.x).toBeCloseTo(0);
    expect(placements[0].position.y).toBeCloseTo(0);
    expect(placements[0].position.z).toBeCloseTo(0);
  });

  it("puts a part where its root says, in voxels", () => {
    const figure = figureOf(
      partOf("torso", { width: 10, height: 10, depth: 10 }),
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        { root: Vector3D.create(0, 8, 0) },
      ),
    );

    const { placements } = figurePlacement(figure);

    expect(placements[1].position.y - placements[0].position.y).toBeCloseTo(8);
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

    const { placements } = figurePlacement(figure);

    // The head sits eight above the torso, which itself sits five above the
    // origin: thirteen from the figure's origin.
    expect(placements[1].position.y).toBeCloseTo(13);
  });

  it("leaves every other part exactly where it was when one part is carried outside the figure", () => {
    const torso = partOf("torso", { width: 20, height: 20, depth: 20 });
    const headAt = (y: number) =>
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        {
          root: Vector3D.create(0, y, 0),
        },
      );

    const before = figurePlacement(figureOf(torso, headAt(4)));
    // Far enough out that the head alone doubles the height of the box the
    // figure fills.
    const after = figurePlacement(figureOf(torso, headAt(40)));

    expect(after.placements[0]).toEqual(before.placements[0]);
    expect(after.placements[1].scale).toEqual(before.placements[1].scale);
    expect(
      after.placements[1].position.y - before.placements[1].position.y,
    ).toBeCloseTo(36);
  });

  it("measures the box every part together fills, in voxels from the figure's origin", () => {
    const figure = figureOf(
      partOf("torso", { width: 10, height: 12, depth: 6 }),
      partOf(
        "head",
        { width: 4, height: 4, depth: 4 },
        { root: Vector3D.create(0, 8, 0) },
      ),
    );

    const { bounds } = figurePlacement(figure);

    // The torso spans -6..6 high about the origin and the head 6..10, so the
    // figure is sixteen high; neither part reaches past the torso's own width
    // or depth.
    expect(bounds.low).toEqual(Vector3D.create(-5, -6, -3));
    expect(bounds.dimensions).toEqual({ width: 10, height: 16, depth: 6 });
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

    const { size } = figurePlacement(figure);

    // Sixteen voxels high, plus the one voxel of padding at the top and the one
    // at the bottom.
    expect(size).toEqual({ width: 12, height: 18, depth: 8 });
  });

  it("gives a figure with no parts something to draw at", () => {
    expect(figurePlacement(figureOf())).toEqual({
      bounds: {
        low: Vector3D.create(),
        dimensions: { width: 0, height: 0, depth: 0 },
      },
      size: { width: 0, height: 0, depth: 0 },
      placements: [],
    });
  });
});

describe("fitVoxelSize", () => {
  it("draws a figure of one part inside the box that lone model is drawn in", () => {
    const dimensions = { width: 12, height: 20, depth: 7 };
    const { bounds, size } = figurePlacement(
      figureOf(partOf("body", dimensions)),
    );

    const voxelSize = fitVoxelSize(bounds.dimensions);

    expect(size.width * voxelSize).toBeCloseTo(boxSize(dimensions).width);
    expect(size.height * voxelSize).toBeCloseTo(boxSize(dimensions).height);
    expect(size.depth * voxelSize).toBeCloseTo(boxSize(dimensions).depth);
  });

  it("draws a figure with nothing in it at one voxel to the unit", () => {
    expect(fitVoxelSize({ width: 0, height: 0, depth: 0 })).toBe(1);
  });
});

describe("voxelReach", () => {
  const extent = { width: 4, height: 4, depth: 4 };
  const body = partOf("body", extent);
  const figure = figureOf(body);

  /** A four-voxel cube with something drawn in each of `at` and nowhere else. */
  const drawnAt = (at: [number, number, number][]) => {
    const voxels = new Uint8Array(4 * 4 * 4 * 4);

    for (const [x, y, z] of at) {
      voxels[((z * 16 + y * 4 + x) << 2) + 3] = 255;
    }

    return [{ name: body.name, dimensions: extent, voxels }];
  };

  it("measures to the furthest corner of the furthest voxel drawn in it", () => {
    // The part pivots on its own middle, so its furthest voxel runs from one
    // and a half voxels out to two along each axis.
    expect(voxelReach(figure, drawnAt([[3, 3, 3]]))).toBeCloseTo(
      Math.hypot(2, 2, 2),
    );
  });

  it("measures from the point it is given, which the figure turns about", () => {
    const middle = Vector3D.create(1.5, 1.5, 1.5);

    expect(voxelReach(figure, drawnAt([[3, 3, 3]]), middle)).toBeCloseTo(
      Math.hypot(0.5, 0.5, 0.5),
    );
  });

  it("reaches nowhere in a figure with nothing drawn in it", () => {
    expect(voxelReach(figure, drawnAt([]))).toBe(0);
  });
});

describe("applyFraming", () => {
  it("brings the focus to the origin and draws a voxel at the size it is given", () => {
    const framed = new Group();

    applyFraming(framed, {
      focus: Vector3D.create(4, -2, 0),
      voxelSize: 0.25,
    });

    expect(framed.scale.x).toBeCloseTo(0.25);
    expect(framed.position.x).toBeCloseTo(-1);
    expect(framed.position.y).toBeCloseTo(0.5);
    expect(framed.position.z).toBeCloseTo(0);
  });

  it("frames a figure on the middle of the box its parts fill", () => {
    const { bounds } = figurePlacement(
      figureOf(
        partOf("torso", { width: 10, height: 12, depth: 6 }),
        partOf(
          "head",
          { width: 4, height: 4, depth: 4 },
          { root: Vector3D.create(0, 8, 0) },
        ),
      ),
    );

    // Sixteen voxels of height reaching from six below the origin, so its
    // middle is two above.
    expect(boundsCentre(bounds)).toEqual(Vector3D.create(0, 2, 0));
  });
});

describe("FigureMeshes", () => {
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

  it("moves the mesh of the part that moved by what its root changed, and moves no other", () => {
    const figure = twoParts(10);
    const meshes = new FigureMeshes();

    meshes.sync(figure, solveFigure(figure));
    const still = meshes.meshFor("still")!.position.x;
    const moved = meshes.meshFor("moved")!.position.x;
    const scale = meshes.meshFor("moved")!.scale.x;

    const slid = twoParts(15);
    meshes.sync(slid, solveFigure(slid));

    expect(meshes.meshFor("still")!.position.x).toBe(still);
    expect(meshes.meshFor("moved")!.position.x).toBeCloseTo(moved + 5);
    expect(meshes.meshFor("moved")!.scale.x).toBe(scale);
  });
});
