// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Vector3D } from "@big-mesh-studios/maths";
import { centrePivot, type Figure, type Part, type Sides } from "../data";
import { sidesOfVolume } from "../sides";
import { createVolume } from "../volume";
import { printFigure, type PrintPart } from "./figure-print";

/** How many cells a part is across, which is also how big its drawings are. */
interface Extent {
  width: number;
  height: number;
  depth: number;
}

/** A part drawn from the named drawings, standing where it is told to stand. */
const partLike = (
  name: string,
  sides: Sides,
  placement: Partial<
    Pick<Part, "root" | "pivot" | "turn" | "scale" | "parent">
  > = {},
): Part => {
  const { width, height, depth } = {
    width: sides.front.width,
    height: sides.front.height,
    depth: sides.left.width,
  };

  return {
    name,
    sides,
    sections: [],
    root: placement.root ?? Vector3D.create(),
    pivot: placement.pivot ?? centrePivot({ width, height, depth }),
    turn: placement.turn ?? Vector3D.create(),
    scale: placement.scale ?? 1,
    parent: placement.parent ?? null,
  };
};

/** A part of the given size, with every cell of it filled with one colour. */
const partOf = (
  name: string,
  extent: Extent,
  placement: Partial<
    Pick<Part, "root" | "pivot" | "turn" | "scale" | "parent">
  > = {},
  index = 3,
): Part => {
  const volume = createVolume(extent);
  volume.voxels.fill(index);
  return partLike(name, sidesOfVolume(volume), placement);
};

/** A part of the given size with nothing drawn in it. */
const emptyPartOf = (name: string, extent: Extent): Part =>
  partLike(name, sidesOfVolume(createVolume(extent)));

const figureOf = (...parts: Part[]): Figure => ({ parts, palette: [] });

/**
 * How far a part reaches, named for the three directions of a printer rather
 * than for the three extents of a drawing: a model is stood up before it is
 * measured, so its up axis is the printer's depth.
 */
const reachOf = (part: PrintPart) => {
  const low = { across: Infinity, front: Infinity, up: Infinity };
  const high = { across: -Infinity, front: -Infinity, up: -Infinity };

  for (let v = 0; v < part.vertices.length; v += 3) {
    low.across = Math.min(low.across, part.vertices[v]);
    high.across = Math.max(high.across, part.vertices[v]);
    low.front = Math.min(low.front, part.vertices[v + 1]);
    high.front = Math.max(high.front, part.vertices[v + 1]);
    low.up = Math.min(low.up, part.vertices[v + 2]);
    high.up = Math.max(high.up, part.vertices[v + 2]);
  }

  return {
    low,
    high,
    acrossSpan: high.across - low.across,
    frontSpan: high.front - low.front,
    upSpan: high.up - low.up,
  };
};

/**
 * The room a solid's own triangles enclose, which is the solid's own volume when
 * they face outward and the negative of it when they face inward.
 */
const signedVolume = (part: PrintPart): number => {
  const { vertices, triangles } = part;
  const corner = (at: number) => {
    const v = triangles[at] * 3;
    return [vertices[v], vertices[v + 1], vertices[v + 2]] as const;
  };

  let total = 0;
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [corner(t), corner(t + 1), corner(t + 2)];
    total +=
      a[0] * (b[1] * c[2] - b[2] * c[1]) -
      a[1] * (b[0] * c[2] - b[2] * c[0]) +
      a[2] * (b[0] * c[1] - b[1] * c[0]);
  }

  return total / 6;
};

/** The middle of a solid, which a face of a convex solid faces away from. */
const middleOf = (part: PrintPart): Vector3D => {
  const { low, high } = reachOf(part);
  return Vector3D.create(
    (low.across + high.across) / 2,
    (low.front + high.front) / 2,
    (low.up + high.up) / 2,
  );
};

/**
 * How many of a solid's faces point away from its middle rather than towards it.
 *
 * A cube turned about its own middle stays convex, so this is the outwardness of
 * every face of it — which is what a slicer reads a triangle by, and what standing
 * a model up on the wrong hand would silently reverse.
 */
const outwardFaces = (part: PrintPart): number => {
  const { vertices, triangles } = part;
  const middle = middleOf(part);
  let outward = 0;

  for (let t = 0; t < triangles.length; t += 3) {
    const at = (k: number) => {
      const v = triangles[t + k] * 3;
      return [vertices[v], vertices[v + 1], vertices[v + 2]] as const;
    };
    const [a, b, c] = [at(0), at(1), at(2)];

    const edge = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
    const next = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
    const normal = [
      edge[1] * next[2] - edge[2] * next[1],
      edge[2] * next[0] - edge[0] * next[2],
      edge[0] * next[1] - edge[1] * next[0],
    ] as const;

    const centre = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    const away = [
      centre[0] - middle.x,
      centre[1] - middle.y,
      centre[2] - middle.z,
    ] as const;

    if (normal[0] * away[0] + normal[1] * away[1] + normal[2] * away[2] > 0) {
      outward++;
    }
  }

  return outward;
};

const QUARTER = Math.PI / 2;

describe("printFigure", () => {
  it("draws a solid box as its six faces, not its voxels' worth", () => {
    const [body] = printFigure(
      figureOf(partOf("body", { width: 4, height: 4, depth: 4 })),
      { height: 40 },
    );

    // A solid box has nothing showing but its own six faces, and each of those
    // is one rectangle of four corners: six quads, twelve triangles.
    expect(body.triangles).toHaveLength(12 * 3);
    expect(body.vertices).toHaveLength(6 * 4 * 3);
  });

  it("measures the whole figure to the height it is asked for", () => {
    for (const height of [40, 100, 12.5]) {
      const [body] = printFigure(
        figureOf(partOf("body", { width: 3, height: 10, depth: 3 })),
        { height },
      );

      const reach = reachOf(body);
      expect(reach.upSpan).toBeCloseTo(height, 6);
      expect(reach.low.up).toBeCloseTo(0, 6);
    }
  });

  it("stands the figure on the bed rather than through it", () => {
    const [body] = printFigure(
      figureOf(
        partOf(
          "body",
          { width: 3, height: 10, depth: 3 },
          { root: Vector3D.create(4, 7, -3) },
        ),
      ),
      { height: 50 },
    );

    expect(reachOf(body).low.up).toBeCloseTo(0, 6);
  });

  it("stands the figure up, so the height it was drawn at is the height printed", () => {
    // Ten cells up and two across: which of the model's axes is the tall one is
    // the whole of what standing it up decides.
    const [body] = printFigure(
      figureOf(partOf("body", { width: 2, height: 10, depth: 2 })),
      { height: 100 },
    );

    const reach = reachOf(body);
    expect(reach.upSpan).toBeCloseTo(100, 6);
    expect(reach.acrossSpan).toBeCloseTo(20, 6);
    expect(reach.frontSpan).toBeCloseTo(20, 6);
  });

  it("centres the figure over the middle of the bed", () => {
    const [body] = printFigure(
      figureOf(
        partOf(
          "body",
          { width: 4, height: 4, depth: 4 },
          {
            root: Vector3D.create(6, 2, -4),
          },
        ),
      ),
      { height: 40 },
    );

    const { low, high } = reachOf(body);
    expect(low.across + high.across).toBeCloseTo(0, 6);
    expect(low.front + high.front).toBeCloseTo(0, 6);
  });

  it("turns a part about its pivot", () => {
    // Four across and two up, turned a quarter turn: the long axis lies down the
    // printer's up instead of across it. The height is measured as drawn, so a
    // part on its side is measured along the axis it now lies down, and the
    // figure comes out the size it would be stood upright.
    const extent = { width: 4, height: 2, depth: 2 };
    const [upright] = printFigure(figureOf(partOf("body", extent)), {
      height: 40,
    });
    const [turned] = printFigure(
      figureOf(
        partOf("body", extent, { turn: Vector3D.create(0, 0, QUARTER) }),
      ),
      { height: 40 },
    );

    expect(reachOf(upright).acrossSpan).toBeCloseTo(80, 6);
    expect(reachOf(upright).upSpan).toBeCloseTo(40, 6);
    expect(reachOf(turned).acrossSpan).toBeCloseTo(20, 6);
    expect(reachOf(turned).upSpan).toBeCloseTo(40, 6);
  });

  it("draws a part larger when the part is drawn larger", () => {
    // A part twice its own size fills the same height, so a voxel is half of
    // what it would measure unturned.
    const [body] = printFigure(
      figureOf(partOf("body", { width: 4, height: 4, depth: 4 }, { scale: 2 })),
      { height: 40 },
    );

    expect(reachOf(body).acrossSpan).toBeCloseTo(40, 6);
  });

  it("winds every face outward, whichever way its part is turned", () => {
    for (const turn of [
      Vector3D.create(),
      Vector3D.create(0, 0, QUARTER),
      Vector3D.create(0.3, 0.7, 1.1),
    ]) {
      const [body] = printFigure(
        figureOf(partOf("body", { width: 4, height: 4, depth: 4 }, { turn })),
        { height: 40 },
      );

      expect(body.triangles).toHaveLength(12 * 3);
      expect(outwardFaces(body)).toBe(body.triangles.length / 3);
      expect(signedVolume(body)).toBeGreaterThan(0);
    }
  });

  it("encloses a solid of the room it is measured to", () => {
    // Forty millimetres to a side, and the triangles of a cube's six faces are
    // the cube itself, so the room they enclose is its volume.
    const [body] = printFigure(
      figureOf(partOf("body", { width: 4, height: 4, depth: 4 })),
      { height: 40 },
    );

    expect(signedVolume(body)).toBeCloseTo(40 ** 3, 3);
  });

  it("meshes a part wider than one chunk as one solid", () => {
    // Two chunks across, so the second chunk's triangles count from the end of
    // the first chunk's vertices rather than from its own.
    const [body] = printFigure(
      figureOf(partOf("body", { width: 40, height: 3, depth: 3 })),
      { height: 30 },
    );

    // Four hundred across by thirty by thirty, and a solid, so a chunk left
    // counting from its own vertices would not enclose any of it.
    expect(signedVolume(body)).toBeCloseTo(400 * 30 * 30, 3);

    // Ten rectangles rather than six: the chunk boundary cuts the four faces
    // that run along it in two each, which is the mesher refusing to merge a
    // rectangle it did not sweep whole rather than a seam in the model.
    expect(body.triangles).toHaveLength(10 * 2 * 3);
    expect(body.vertices).toHaveLength(10 * 4 * 3);
  });

  it("leaves out a part with nothing drawn in it", () => {
    const printed = printFigure(
      figureOf(
        partOf("body", { width: 2, height: 2, depth: 2 }),
        emptyPartOf("blank", { width: 2, height: 2, depth: 2 }),
      ),
      { height: 20 },
    );

    expect(printed.map((part) => part.name)).toEqual(["body"]);
  });

  it("refuses a height that is not a size", () => {
    const figure = figureOf(partOf("body", { width: 2, height: 2, depth: 2 }));

    for (const height of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => printFigure(figure, { height })).toThrow(/needs a height/);
    }
  });

  it("refuses a figure with nothing standing in it", () => {
    expect(() => printFigure(figureOf(), { height: 100 })).toThrow(
      /no height to print/,
    );
  });
});
