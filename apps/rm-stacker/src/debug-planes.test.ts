import { Bitmap, Dimensions3D, Vector3D } from "@big-mesh-studios/maths";
import {
  centrePivot,
  figurePlacement,
  sideKinds,
  type Part,
  type Section,
  type SideKind,
  type Sides,
} from "@big-mesh-studios/stacker/renderer";
import { Mesh, Side, Vector3 } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";
import { DebugPlanes } from "./debug-planes";
import { cutSection } from "./panels";
import { voxelCellEdges } from "./voxel-preview-scene";

// A part five voxels wide, seven high and three deep, so that no two axes are
// the same length and a plane stood across the wrong one shows up as a wrong
// place.
const DIMENSIONS = { width: 5, height: 7, depth: 3 };

/** The volume the part is marched in, which is what its sides bound. */
const VOLUME = Dimensions3D.normalize(DIMENSIONS);

/** The six drawings of a part that size, each across the two axes its side spans. */
const sides = (): Sides => {
  const { width, height, depth } = DIMENSIONS;
  return {
    front: Bitmap.create(width, height),
    back: Bitmap.create(width, height),
    left: Bitmap.create(depth, height),
    right: Bitmap.create(depth, height),
    top: Bitmap.create(width, depth),
    bottom: Bitmap.create(width, depth),
  };
};

const part = (sections: Section[] = []): Part => ({
  name: "body",
  sides: sides(),
  sections,
  turn: Vector3D.create(),
  scale: 1,
  root: Vector3D.create(),
  pivot: centrePivot(DIMENSIONS),
  parent: null,
});

/** The planes standing at the one part of a figure, drawn against its depth. */
const panelsOf = (planes: DebugPlanes): Mesh[] =>
  planes.group.children[0].children[1].children as Mesh[];

/** The planes standing at a figure of one part, `sections` cut across it. */
const stand = (sections: Section[] = []): Mesh[] => {
  const figure = { parts: [part(sections)], palette: [] };
  const planes = new DebugPlanes();

  planes.sync(figure, figurePlacement(figure).placements);

  return panelsOf(planes);
};

/** The plane standing at `side`, the sides coming first and in their own order. */
const sidePlane = (planes: Mesh[], side: SideKind) =>
  planes[sideKinds.indexOf(side)];

/** Which of its faces a plane is drawn on. */
const facing = (plane: Mesh) => plane.material.side;

/** The cut this many voxels along `axis`, which a knife would make. */
const cut = (axis: keyof Dimensions3D, at: number) =>
  cutSection(part(), axis, at)!;

describe("DebugPlanes", () => {
  it("stands each side at the end of the axis it looks along", () => {
    const planes = stand();
    const at = (side: SideKind) => sidePlane(planes, side).position;

    expect(at("left").x).toBeCloseTo(-VOLUME.width / 2);
    expect(at("right").x).toBeCloseTo(VOLUME.width / 2);
    expect(at("bottom").y).toBeCloseTo(-VOLUME.height / 2);
    expect(at("top").y).toBeCloseTo(VOLUME.height / 2);
    expect(at("back").z).toBeCloseTo(-VOLUME.depth / 2);
    expect(at("front").z).toBeCloseTo(VOLUME.depth / 2);
  });

  it("faces each side along that axis", () => {
    const planes = stand();
    const along = (side: SideKind) =>
      new Vector3(0, 0, 1).applyQuaternion(sidePlane(planes, side).quaternion);

    expect(along("right").x).toBeCloseTo(1);
    expect(along("top").y).toBeCloseTo(1);
    expect(along("front").z).toBeCloseTo(1);
  });

  it("spans the volume across the two axes a side is drawn across", () => {
    const planes = stand();
    const front = sidePlane(planes, "front").scale;

    expect(front.x).toBeCloseTo(VOLUME.width);
    expect(front.y).toBeCloseTo(VOLUME.height);

    const top = sidePlane(planes, "top").scale;

    expect(top.x).toBeCloseTo(VOLUME.width);
    expect(top.y).toBeCloseTo(VOLUME.depth);
  });

  it("shows a side from where the side looks at the part", () => {
    const planes = stand();

    expect(facing(sidePlane(planes, "front"))).toBe(Side.FrontSide);
    expect(facing(sidePlane(planes, "back"))).toBe(Side.BackSide);
  });

  it("stands both faces of every cut where that cut divides the part", () => {
    const planes = stand([cut("width", 2), cut("height", 3)]);

    expect(planes.length).toBe(sideKinds.length + 4);

    const [beforeAcross, afterAcross, beforeDown] = planes.slice(
      sideKinds.length,
    );
    const [x] = voxelCellEdges(DIMENSIONS, [2, 0, 0]);
    const [, y] = voxelCellEdges(DIMENSIONS, [0, 3, 0]);

    expect(beforeAcross.position.x).toBeCloseTo(x);
    expect(afterAcross.position.x).toBeCloseTo(x);
    expect(beforeDown.position.y).toBeCloseTo(y);
  });

  it("shows a cut's two faces one each way, as the sides they are drawn like are seen", () => {
    const planes = stand([cut("width", 2)]);
    const [before, after] = planes.slice(sideKinds.length);

    // The face closing the run before the cut is drawn the way the right is,
    // and the one opening the run after it the way the left is.
    expect(facing(before)).toBe(Side.FrontSide);
    expect(facing(after)).toBe(Side.BackSide);
  });

  it("takes down the planes of a cut that is undone", () => {
    const figure = { parts: [part([cut("width", 2)])], palette: [] };
    const planes = new DebugPlanes();

    planes.sync(figure, figurePlacement(figure).placements);

    figure.parts[0].sections = [];
    planes.sync(figure, figurePlacement(figure).placements);

    expect(panelsOf(planes).length).toBe(sideKinds.length);
  });
});
