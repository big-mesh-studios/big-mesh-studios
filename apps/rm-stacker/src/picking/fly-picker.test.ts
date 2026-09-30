import { describe, expect, it } from "vitest";
import {
  Bitmap,
  Matrix3x3,
  Vector3D,
  type Dimensions3D,
} from "@big-mesh-studios/maths";
import {
  centrePivot,
  REMOVED,
  sideAxes,
  sideKinds,
  solvePart,
  type Part,
  type PartPlacement,
  type Sides,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import {
  createVolume,
  packVolume,
  volumeOffset,
} from "@big-mesh-studios/stacker/volume";
import {
  crosshairOf,
  pickCrosshair,
  sameCrosshair,
  type FlyPick,
  type FlyPickView,
} from "./fly-picker";

const SIDE = 4;

/**
 * A part of `dimensions` voxels, packed for a card, where `fill` says what is in
 * each cell: nothing drawn, or a palette index.
 */
const part = (
  name: string,
  dimensions: Dimensions3D,
  fill: (x: number, y: number, z: number) => number,
): SolvedPart => {
  const { width, height, depth } = dimensions;
  const voxels = new Uint8Array(width * height * depth);

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        voxels[z * width * height + y * width + x] = fill(x, y, z);
      }
    }
  }

  return { name, dimensions, voxels: packVolume({ dimensions, voxels }) };
};

const CUBE: Dimensions3D = { width: SIDE, height: SIDE, depth: SIDE };

/** A solid cube, every cell in one colour. */
const solid = (name = "body", colour = 3): SolvedPart =>
  part(name, CUBE, () => colour);

/** A cube with nothing in it. */
const empty = (name = "body"): SolvedPart =>
  part(name, CUBE, () => Bitmap.EMPTY);

/** A cube walled on five sides, open on the high z side, hollow in the middle. */
const openBox = (name = "body", colour = 3): SolvedPart =>
  part(name, CUBE, (x, y, z) =>
    x === 0 || x === SIDE - 1 || y === 0 || y === SIDE - 1 || z === 0
      ? colour
      : Bitmap.EMPTY,
  );

/**
 * A cube with a cell of nothing all the way round it, so that every face of it
 * has a cell in front of it to put a voxel into. A cube that fills its own box
 * has nowhere to put one, and says so.
 */
const inset = (name = "body", colour = 3): SolvedPart =>
  part(name, CUBE, (x, y, z) =>
    x === 0 ||
    y === 0 ||
    z === 0 ||
    x === SIDE - 1 ||
    y === SIDE - 1 ||
    z === SIDE - 1
      ? Bitmap.EMPTY
      : colour,
  );

/**
 * Where a part of `dimensions` stands. A figure scales a part's longest side to
 * one world unit, so a cube of `SIDE` cells drawn at one voxel to the unit is
 * `SIDE` world units across and a cell is one world unit whichever axis it is
 * on, with cell zero at the low end of each axis.
 */
const standing = (
  dimensions: Dimensions3D,
  at: [number, number, number] = [0, 0, 0],
  turn: Matrix3x3 = Matrix3x3.identity(),
  scale = 1,
): PartPlacement => ({
  position: Vector3D.create(at[0], at[1], at[2]),
  turn,
  scale:
    Math.max(dimensions.width, dimensions.height, dimensions.depth) * scale,
});

/** A crosshair at `origin` looking along `direction`, over the given parts. */
const at = (
  origin: [number, number, number],
  direction: [number, number, number],
  parts: SolvedPart[],
  over: Partial<FlyPickView> = {},
): FlyPickView => ({
  solved: parts,
  placements: parts.map((one) => standing(one.dimensions)),
  origin: Vector3D.create(...origin),
  direction: Vector3D.create(...direction),
  reach: 100,
  voxelSize: 1,
  focus: Vector3D.create(),
  ...over,
});

/**
 * A crosshair outside a cube at the origin on the given side of it, looking
 * straight at the middle of it. The cube runs from -2 to 2 on every axis with
 * cell zero at the low end, so a crosshair on the high side meets cell three
 * first and one on the low side meets cell zero.
 */
const facing = (
  axis: 0 | 1 | 2,
  side: 1 | -1,
  parts: SolvedPart[],
  over: Partial<FlyPickView> = {},
) => {
  // Half a world unit on the axes the crosshair is not approaching along, which
  // is the middle of a cell rather than the boundary between two of them.
  const from: [number, number, number] = [0.5, 0.5, 0.5];
  from[axis] = side * 10;

  const towards: [number, number, number] = [0, 0, 0];
  towards[axis] = -side;

  return at(from, towards, parts, over);
};

describe("pickCrosshair", () => {
  it("meets nothing where the ray points away from the figure", () => {
    expect(
      pickCrosshair(at([0, 0, -10], [0, 0, -1], [solid()])),
    ).toBeUndefined();
  });

  it("meets nothing where a part holds no voxels at all", () => {
    expect(pickCrosshair(facing(2, 1, [empty()]))).toBeUndefined();
  });

  it("meets the near cell of a solid cube", () => {
    const pick = pickCrosshair(facing(2, 1, [solid()]));

    expect(pick?.part).toBe("body");
    // A crosshair on the high z side reaches the cube at its own high wall,
    // which is the far end of cell three.
    expect(pick?.voxel).toEqual([2, 2, 3]);
  });

  it("meets the low cell where the crosshair is on the low side", () => {
    expect(pickCrosshair(facing(2, -1, [solid()]))?.voxel).toEqual([2, 2, 0]);
  });

  it("says which way the face it met looks, whichever side it came from", () => {
    // A ray meets a face on the side it came from, so a crosshair outside a cube
    // on its high side sees that side's outward normal.
    const expected = {
      "0,1": [1, 0, 0],
      "0,-1": [-1, 0, 0],
      "1,1": [0, 1, 0],
      "1,-1": [0, -1, 0],
      "2,1": [0, 0, 1],
      "2,-1": [0, 0, -1],
    } as const;

    for (const [where, normal] of Object.entries(expected)) {
      const [axis, side] = where.split(",").map(Number) as [0 | 1 | 2, 1 | -1];

      expect(
        pickCrosshair(facing(axis, side, [solid()]))?.face?.normal,
        where,
      ).toEqual(normal);
    }
  });

  it("says how far the ray travelled to reach the face", () => {
    // The crosshair stands ten units off a cube whose near wall is at two.
    expect(pickCrosshair(facing(2, 1, [solid()]))?.distance).toBeCloseTo(8, 9);
  });

  it("stops at its reach", () => {
    // The reach is given in the figure's own voxels, so it is eight cells here
    // and the near wall is eight world units away.
    expect(
      pickCrosshair(facing(2, 1, [solid()], { reach: 7 })),
    ).toBeUndefined();
    expect(pickCrosshair(facing(2, 1, [solid()], { reach: 8 }))?.part).toBe(
      "body",
    );
  });

  it("has nowhere to put a voxel against a face on the part's own edge", () => {
    // A solid cube is solid out to its own walls, so every face it shows is on
    // the edge of its box, and a voxel outside that box is nowhere to be drawn.
    expect(pickCrosshair(facing(2, 1, [solid()]))?.face?.place).toBeUndefined();
  });

  it("puts a voxel against an interior face in the cell the ray came from", () => {
    // A box open on the side the crosshair is on lets the ray in across the
    // hollow middle and against the inside of the far wall, whose cell has a
    // neighbour on the ray's side of it to grow into.
    const pick = pickCrosshair(facing(2, 1, [openBox()]));

    expect(pick?.voxel).toEqual([2, 2, 0]);
    expect(pick?.face?.normal).toEqual([0, 0, 1]);
    expect(pick?.face?.place).toEqual([2, 2, 1]);
  });

  it("reports the colour the face it met shows", () => {
    expect(pickCrosshair(facing(2, 1, [solid("body", 7)]))?.face?.colour).toBe(
      7,
    );
  });

  it("meets the part nearest the crosshair rather than the first it is given", () => {
    // Two cubes a part-length apart along z, listed with the further one first,
    // so the ranking cannot be the order the figure holds them in.
    const back = part("back", CUBE, () => 3);
    const front = part("front", CUBE, () => 3);
    const view = at([0, 0, 10], [0, 0, -1], [back, front], {
      placements: [standing(CUBE, [0, 0, 0]), standing(CUBE, [0, 0, 6])],
    });

    const pick = pickCrosshair(view);

    expect(pick?.part).toBe("front");
    expect(pick?.distance).toBeCloseTo(2, 9);
  });

  it("measures a part on the axes it has been turned to", () => {
    // A slab eight cells long in x and two in each of y and z. Turned a quarter
    // turn about y its long axis runs along z instead, so a ray approaching it
    // along x now meets it two cells in rather than eight.
    const slab = part("slab", { width: 8, height: 2, depth: 2 }, () => 3);
    const along = (turn: Matrix3x3) =>
      pickCrosshair(
        at([10, -0.5, 0.5], [-1, 0, 0], [slab], {
          placements: [standing(slab.dimensions, [0, 0, 0], turn)],
        }),
      )?.voxel;

    expect(along(Matrix3x3.identity())).toEqual([7, 0, 1]);
    expect(along(Matrix3x3.rotationY(Math.PI / 2))).toEqual([3, 0, 1]);
  });

  it("measures a part from the point the figure is drawn from", () => {
    // A figure framed on a point of its own is drawn with that point at the
    // middle of the view, and the ray has to be measured against the same point
    // the framing used.
    const view = at([0, 0, 10], [0, 0, -1], [solid()], {
      focus: Vector3D.create(0, 0, 8),
    });

    expect(pickCrosshair(view)?.distance).toBeCloseTo(0, 9);
  });

  it("reaches the same number of a part's own cells however it is scaled", () => {
    // A part four times as large is that many cells further away again, so a
    // reach in the figure's own voxels has to be measured against the part to
    // mean the same number of cells whatever a part is scaled by.
    const drawn = (reach: number) =>
      pickCrosshair(
        at([0, 0, 40], [0, 0, -1], [solid()], {
          reach,
          placements: [standing(CUBE, [0, 0, 0], Matrix3x3.identity(), 4)],
        }),
      );

    // The near wall is thirty-two world units off, which is eight of this part's
    // own four-times-larger cells.
    expect(drawn(20)).toBeUndefined();
    expect(drawn(40)?.distance).toBeCloseTo(32, 9);
  });

  it("measures a part that is not a cube on its own longest side", () => {
    // A slab eight cells wide and two deep: every cell is one world unit
    // whichever axis it is on, so the slab is eight across, two up and two deep.
    const slab = part("slab", { width: 8, height: 2, depth: 2 }, () => 3);
    const view = at([0, -0.5, 10], [0, 0, -1], [slab], {
      placements: [standing(slab.dimensions)],
    });

    expect(pickCrosshair(view)?.voxel).toEqual([4, 0, 1]);
    expect(pickCrosshair(view)?.distance).toBeCloseTo(9, 9);
  });

  it("meets no face where the crosshair is inside a voxel", () => {
    // A camera flown into a voxel has not come through a face to get there, so
    // there is nothing to put a voxel against, though there is still a voxel to
    // take away.
    const pick = pickCrosshair(at([0.5, 0.5, 0.5], [0, 0, 1], [solid()]));

    expect(pick?.part).toBe("body");
    expect(pick?.voxel).toEqual([2, 2, 2]);
    expect(pick?.face).toBeUndefined();
    expect(pick?.distance).toBe(0);
  });

  it("crosses no boundary on the axis a ray runs along", () => {
    // A ray exactly along x crosses no x boundary at all, so it walks cell by
    // cell down that axis and the face it meets is a y or a z one.
    const pick = pickCrosshair(at([-10, -1.5, 0.5], [1, 0, 0], [openBox()]));

    // The crosshair is already inside the box in y and z, so the first cell it
    // meets in range is the low x wall, and the face it meets is an x one.
    expect(pick?.voxel).toEqual([0, 0, 2]);
    expect(pick?.face?.normal).toEqual([-1, 0, 0]);
  });

  it("ends rather than going on for ever", () => {
    // A crosshair a long way off has a long way to walk before it reaches
    // anything, and a ray that never crosses the box it is aimed at has no
    // boundary to reach. Neither may keep stepping.
    const body = solid();

    for (const direction of [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [0, 1, 0],
    ] as [number, number, number][]) {
      const pick = pickCrosshair(
        at([0, 0, -50], direction, [body], { reach: 1000 }),
      );

      // Only the ray heading back towards the cube at z = 0 meets it; the rest
      // pass by the side of it.
      expect(pick?.part, direction.join(",")).toBe(
        direction[2] === 1 ? "body" : undefined,
      );
    }
  });
});

describe("crosshairOf", () => {
  const pick = (over: Partial<FlyPick> = {}): FlyPick => ({
    part: "body",
    voxel: [1, 1, 1],
    face: {
      normal: [0, 0, -1],
      place: [1, 1, 0],
      colour: 3,
    },
    distance: 2,
    ...over,
  });

  it("is nothing at all where the ray met nothing", () => {
    expect(crosshairOf(undefined)).toBeUndefined();
  });

  it("names the part the crosshair is over", () => {
    expect(crosshairOf(pick())?.part).toBe("body");
  });

  it("can place a voxel against a face with a cell to put it in", () => {
    expect(crosshairOf(pick())?.places).toBe(true);
  });

  it("cannot place a voxel against a face on the part's own edge", () => {
    expect(crosshairOf(pick({ face: undefined }))?.places).toBe(false);
    expect(
      crosshairOf(
        pick({ face: { normal: [0, 0, 1], place: undefined, colour: 3 } }),
      )?.places,
    ).toBe(false);
  });

  it("keeps only what changes from frame to frame", () => {
    // A pick rebuilt from the same voxel carries a new distance and a new colour
    // every frame, and a crosshair that carried those would have whatever drew it
    // redrawn sixty times a second over a crosshair that had not moved.
    expect(Object.keys(crosshairOf(pick()) ?? {}).sort()).toEqual([
      "part",
      "places",
    ]);
  });
});

describe("sameCrosshair", () => {
  const at = (part: string, places: boolean) => ({ part, places });

  it("sees two built the same way as the same", () => {
    expect(sameCrosshair(at("body", true), at("body", true))).toBe(true);
  });

  it("sees a move to another part as a different one", () => {
    expect(sameCrosshair(at("body", true), at("arm", true))).toBe(false);
  });

  it("sees a press that would now do something else as a different one", () => {
    expect(sameCrosshair(at("body", true), at("body", false))).toBe(false);
  });

  it("sees a crosshair that came and went as a different one", () => {
    expect(sameCrosshair(undefined, at("body", true))).toBe(false);
    expect(sameCrosshair(at("body", true), undefined)).toBe(false);
    expect(sameCrosshair(undefined, undefined)).toBe(true);
  });
});

describe("where a voxel goes", () => {
  const N = 5;

  /**
   * A solid cube with a single voxel taken out of the middle of each of its six
   * faces, so a crosshair on the middle of any face looks into a one-voxel notch
   * and stops against the solid cell behind it.
   */
  const notched = (): SolvedPart =>
    part("body", { width: N, height: N, depth: N }, (x, y, z) => {
      const onFace =
        x === 0 ||
        x === N - 1 ||
        y === 0 ||
        y === N - 1 ||
        z === 0 ||
        z === N - 1;
      const middle = (a: number) => a === Math.floor(N / 2);
      const notched =
        (x === 0 || x === N - 1) && middle(y) && middle(z)
          ? true
          : (y === 0 || y === N - 1) && middle(x) && middle(z)
            ? true
            : (z === 0 || z === N - 1) && middle(x) && middle(y)
              ? true
              : false;

      return onFace && notched ? Bitmap.EMPTY : 3;
    });

  it("puts a voxel in the cell the ray came from, from every direction", () => {
    // The crosshair stands on the surface, so the cell a voxel goes in has to be
    // the one between the crosshair and the cell behind it — never the one
    // beyond, which would put the new voxel inside the shape and out of sight.
    const body = notched();
    const view = (axis: 0 | 1 | 2, side: 1 | -1) => {
      // The middle cell's centre, on the axes the crosshair is not approaching
      // along: a crosshair on a cell's own edge would graze past the model
      // rather than look into it.
      const from: [number, number, number] = [0, 0, 0];
      from[axis] = side * 20;

      const towards: [number, number, number] = [0, 0, 0];
      towards[axis] = -side;

      return pickCrosshair(
        at(from, towards, [body], { placements: [standing(body.dimensions)] }),
      );
    };

    for (const axis of [0, 1, 2] as const) {
      for (const side of [1, -1] as const) {
        const pick = view(axis, side);
        const where = `axis ${axis} from ${side > 0 ? "high" : "low"}`;

        // The notch is the empty cell on the surface, and the solid cell behind
        // it is one further in along the axis it was approached from.
        expect(pick?.voxel, where).toEqual([
          axis === 0 ? (side > 0 ? 3 : 1) : 2,
          axis === 1 ? (side > 0 ? 3 : 1) : 2,
          axis === 2 ? (side > 0 ? 3 : 1) : 2,
        ]);
        expect(pick?.face?.place, where).toEqual([
          axis === 0 ? (side > 0 ? 4 : 0) : 2,
          axis === 1 ? (side > 0 ? 4 : 0) : 2,
          axis === 2 ? (side > 0 ? 4 : 0) : 2,
        ]);
        expect(pick?.face?.normal, where).toEqual([
          axis === 0 ? side : 0,
          axis === 1 ? side : 0,
          axis === 2 ? side : 0,
        ]);
      }
    }
  });
});

describe("what the crosshair is read against", () => {
  const N = 5;
  const DIMS: Dimensions3D = { width: N, height: N, depth: N };

  /** The cell the crosshair stands in, which is the middle one. */
  const MIDDLE = Math.floor(N / 2);

  /**
   * A part of `N` voxels a side whose every drawing is filled, so the six
   * drawings alone make a solid cube, and which is then given `edits`.
   */
  const solidWith = (edits?: Part["edits"]): Part => ({
    name: "body",
    sides: Object.fromEntries(
      sideKinds.map((kind) => {
        const [across, down] = sideAxes[kind];

        return [
          kind,
          {
            width: DIMS[across],
            height: DIMS[down],
            data: new Uint8Array(DIMS[across] * DIMS[down]).fill(3),
          },
        ];
      }),
    ) as unknown as Sides,
    sections: [],
    root: Vector3D.create(),
    pivot: centrePivot(DIMS),
    turn: Vector3D.create(),
    scale: 1,
    parent: null,
    edits,
  });

  /**
   * A part with a channel cut straight through it along the line the crosshair
   * looks down, as a set of voxels taken away.
   *
   * The crosshair stands at the world's middle, which in a box of five cells is
   * the middle cell rather than the cell at zero — the cell an index names and
   * the place on the world it is drawn are two apart by half the box.
   */
  const channelled = (): Part => {
    const edits = createVolume(DIMS);

    for (let z = 1; z < N; z++) {
      edits.voxels[volumeOffset(DIMS, MIDDLE, MIDDLE, z)] = REMOVED;
    }

    return solidWith(edits);
  };

  const lookDown = (part: Part) =>
    pickCrosshair(
      at([0, 0, 20], [0, 0, -1], [solvePart(part)], {
        placements: [standing(DIMS)],
      }),
    );

  it("reads the volume the six drawings make, not the drawings", () => {
    // With nothing but filled drawings the cube is solid all the way through, so
    // a crosshair on its face stops against the cell it can see.
    expect(lookDown(solidWith())?.voxel).toEqual([MIDDLE, MIDDLE, 4]);
  });

  it("reads the edits on top of the volume the drawings make", () => {
    // The same six drawings with a channel cut through them are not solid all the
    // way through: a crosshair on the face looks down the channel and stops
    // against the far wall. A picker reading the drawings alone would have
    // reported the cell it can see, and one reading the edits alone would have
    // found nothing at all.
    expect(lookDown(channelled())?.voxel).toEqual([MIDDLE, MIDDLE, 0]);
  });

  it("finds a voxel that only an edit put there", () => {
    // The drawings of a blank part give an empty box, and a voxel in it is
    // nothing but an edit. The six drawings are where a model is drawn from, and
    // the edits are what a hand and a `.cvox` file both reach for, so a voxel
    // has to be findable whichever of the two is holding it.
    const edits = createVolume(DIMS);

    edits.voxels[volumeOffset(DIMS, MIDDLE, MIDDLE, 2)] = 5;

    // A drawing is emptied into a box of nothing drawn rather than of zeroes:
    // zero is a palette index, so a box of them is a solid box painted in the
    // first colour rather than an empty one.
    const blank = solidWith(edits);
    const emptied: Part = {
      ...blank,
      sides: Object.fromEntries(
        Object.entries(blank.sides).map(([kind, bitmap]) => [
          kind,
          {
            ...bitmap,
            data: new Uint8Array(bitmap.data.length).fill(Bitmap.EMPTY),
          },
        ]),
      ) as unknown as Sides,
    };

    expect(
      pickCrosshair(
        at([0, 0, 20], [0, 0, -1], [solvePart(emptied)], {
          placements: [standing(DIMS)],
        }),
      )?.voxel,
    ).toEqual([MIDDLE, MIDDLE, 2]);
  });
});

describe("the size of a voxel in the world", () => {
  // Every other test in this file reads a figure drawn a world unit to the
  // voxel, which is a size nothing in the editor is actually drawn at: a figure
  // is drawn at the size that fills the view, and a voxel of it is worth a
  // fraction of a world unit. At one world unit to the voxel a pair of unit
  // errors in the conversions cancel each other out exactly, and the crosshair
  // reads the figure correctly by accident — so these read it at the size the
  // editor really uses.
  const VOXEL = 0.107;

  it("reads a face square on, at the size a figure is really drawn", () => {
    const cube = inset();

    for (const voxelSize of [1, 0.5, VOXEL, 0.01, 4]) {
      // Ten cells off the high x face, in world units of whatever size a cell
      // currently is, so the crosshair is the same distance from the figure in
      // cells however the figure is drawn.
      const pick = pickCrosshair(
        at(
          [10 * voxelSize, 0.5 * voxelSize, 0.5 * voxelSize],
          [-1, 0, 0],
          [cube],
          { voxelSize },
        ),
      );

      expect(pick?.voxel).toEqual([SIDE - 2, 2, 2]);
      expect(pick?.face?.place).toEqual([SIDE - 1, 2, 2]);
    }
  });

  it("reaches as far as it is told to, in that size", () => {
    const cube = inset();
    const reach = 8;

    // The near face of the cube is a cell and a half in from the middle, so a
    // crosshair that many cells plus a reach off it is at the far end of what
    // the reach reaches, and one reach further is past it. Measured in cells, so
    // the size a cell is does not change the distance a reach is worth.
    const off = (cells: number) =>
      at(
        [(SIDE / 2 + 0.5 + cells) * VOXEL, 0.5 * VOXEL, 0.5 * VOXEL],
        [-1, 0, 0],
        [cube],
        { voxelSize: VOXEL, reach },
      );

    expect(pickCrosshair(off(reach * 0.5))).toBeDefined();
    expect(pickCrosshair(off(reach * 1.5))).toBeUndefined();
  });

  it("reads a part standing away from the middle of the figure", () => {
    const cube = inset();
    const moved = 6 * VOXEL;

    // The part's own middle is in figure voxels and the crosshair is in world
    // units, so a part stood off the middle is missed by however far the two are
    // measured in the wrong units.
    const pick = pickCrosshair(
      at(
        [moved + 0.5 * VOXEL, 0.5 * VOXEL, (SIDE + 3) * VOXEL],
        [0, 0, -1],
        [cube],
        {
          voxelSize: VOXEL,
          placements: [standing(cube.dimensions, [moved / VOXEL, 0, 0])],
        },
      ),
    );

    expect(pick?.voxel).toEqual([SIDE - 2, 2, 2]);
  });
});
