// The slice being edited, standing where it sits in the model, with a line round
// it.
//
// The same slice is drawn on the canvas beside the model, so the plane is where
// the two agree: it is the only thing in the preview that says which of the
// slices in front of you is the one under your fingers, and a model thirty
// voxels deep gives nothing else to say which way in you are standing. A plane
// faint enough to see the model through cannot say where its own edge is, so the
// line round it is what says how far the slice runs and how deep in the model it
// has been cut.
import {
  Bitmap,
  Dimensions3D,
  Vector3D,
  type RGBA,
} from "@big-mesh-studios/maths";
import {
  dimensionCount,
  planeAxes,
  planeSlicedAxis,
  readSlice,
  type Axis,
  type Plane,
  type Slice,
  type Volume,
} from "@big-mesh-studios/stacker/volume";
import {
  DataTexture,
  Group,
  Line2NodeMaterial,
  LineSegments2,
  LineSegmentsGeometry,
  Matrix4,
  Mesh,
  NearestFilter,
  PlaneGeometry,
  Quaternion,
} from "@random-mesh/rmsl/scene";
import { PanelMaterial } from "./panel-material";
import { boxEdges } from "./voxel-preview-scene";

// A dim grey, thin, and solid enough to read as an edge against a model of any
// colour behind it.
const EDGE_COLOUR = 0xa8aeb6;
const EDGE_WIDTH = 1;
const EDGE_OPACITY = 0.8;

/** Where one of a box's axes runs, as the three numbers of a unit vector. */
const along = (axis: Axis): [number, number, number] => [
  axis === "x" ? 1 : 0,
  axis === "y" ? 1 : 0,
  axis === "z" ? 1 : 0,
];

/**
 * The turn that lays a quad flat on a plane: its width along the axis the plane
 * runs across, its height along the axis it runs down, and its face along the axis
 * it does not vary.
 *
 * A plane's three axes are the box's three axes in another order, and the two
 * orders that are not the one a quad is built in are a third of a revolution about
 * the diagonal between them, which no single right angle about one axis gives.
 */
export const layingDown = (
  across: Axis,
  down: Axis,
  fixed: Axis,
): Quaternion => {
  const [ax, ay, az] = along(across);
  const [dx, dy, dz] = along(down);
  const [fx, fy, fz] = along(fixed);

  // A matrix is set in columns, so each of the three axes a quad is to lie down is
  // a column of it: the quad's own x, then its own y, then its own z.
  return new Quaternion().setFromRotationMatrix(
    new Matrix4().set(ax, dx, fx, 0, ay, dy, fy, 0, az, dz, fz, 0, 0, 0, 0, 1),
  );
};

/**
 * How solidly the plane is drawn. It is a guide to where the slice is rather
 * than part of the model, so it is faint and takes no part in the depth: a
 * voxel in front of it is not hidden by it.
 */
const PLANE_OPACITY = 0.3;

export class SlicePlane {
  readonly group = new Group();

  private readonly panel: Mesh;
  private readonly ghost: Mesh;
  private readonly edge: LineSegments2;
  private readonly picture = new DataTexture(new Uint8Array(4), 1, 1);

  constructor() {
    this.picture.magFilter = NearestFilter;
    this.picture.minFilter = NearestFilter;
    this.picture.needsUpdate = true;

    this.panel = new Mesh(
      new PlaneGeometry(1, 1),
      new PanelMaterial(this.picture),
    );
    this.ghost = new Mesh(
      new PlaneGeometry(1, 1),
      new PanelMaterial(this.picture),
    );
    this.edge = new LineSegments2(
      new LineSegmentsGeometry(),
      new Line2NodeMaterial({
        color: EDGE_COLOUR,
        linewidth: EDGE_WIDTH,
        opacity: EDGE_OPACITY,
        transparent: true,
      }),
    );

    for (const mesh of [this.panel, this.ghost]) {
      const material = mesh.material as PanelMaterial;
      material.gridColour.setHex(0x000000);
      material.gridShare = 0;
      material.opacity = PLANE_OPACITY;
      material.transparent = true;
      material.depthWrite = false;
    }
    (this.edge.material as Line2NodeMaterial).depthWrite = false;

    this.group.add(this.panel, this.ghost, this.edge);
  }

  /**
   * The slice drawn into the texture: one texel a cell, the rows running from
   * the bottom of the plane up, which is the way the slice's own cells count
   * down and the way a `DataTexture` is read.
   *
   * A cell with nothing in it is left clear rather than filled with the plane's
   * own colour, so that the voxels behind the plane still show through the
   * gaps in the slice.
   */
  private draw(volume: Volume, slice: Slice, palette: RGBA[]) {
    const { width, height } = slice;
    if (this.picture.width !== width || this.picture.height !== height) {
      this.picture.image = new Uint8Array(width * height * 4);
      this.picture.width = width;
      this.picture.height = height;
    }

    const texels = this.picture.image as Uint8Array;
    for (let v = 0; v < height; v++) {
      for (let u = 0; u < width; u++) {
        const index = readSlice(volume, slice, u, v);
        const colour = index === Bitmap.EMPTY ? undefined : palette[index];
        const at = (v * width + u) * 4;
        texels[at] = colour?.r ?? 0;
        texels[at + 1] = colour?.g ?? 0;
        texels[at + 2] = colour?.b ?? 0;
        texels[at + 3] = colour === undefined ? 0 : PLANE_OPACITY * 255;
      }
    }
    this.picture.needsUpdate = true;

    for (const mesh of [this.panel, this.ghost]) {
      (mesh.material as PanelMaterial).cells = [width, height];
    }
  }

  /**
   * Where the plane stands, in the space the model is drawn in: the box the
   * volume is normalized into, centred on the origin. The slice is named by its
   * index from the low end of the box, so it stands half a cell in from where
   * that index falls.
   */
  private place(dimensions: Volume["dimensions"], slice: Slice) {
    const normalized = Dimensions3D.normalize(dimensions);
    const [across, down] = planeAxes[slice.plane];
    const fixed = planeSlicedAxis[slice.plane];
    const reach = (axis: keyof Vector3D) =>
      axis === "x"
        ? normalized.width
        : axis === "y"
          ? normalized.height
          : normalized.depth;
    const cell = (axis: keyof Vector3D) =>
      reach(axis) / Math.max(1, dimensionCount[axis](dimensions));

    const middle = (slice.at + 0.5) * cell(fixed) - reach(fixed) / 2;

    for (const mesh of [this.panel, this.ghost]) {
      mesh.scale.set(reach(across), reach(down), 1);
      mesh.quaternion.copy(layingDown(across, down, fixed));
      mesh.position.set(0, 0, 0);
      mesh.position[fixed] = middle;
    }

    // The line round the slice is a slab a cell thick rather than a rectangle, so
    // that where the slice stands in the depth of the model is a distance the
    // model itself is measured against, and the slice is a layer of it rather than
    // a sheet of paper in it.
    const corner = (end: "near" | "far") =>
      Vector3D.create(
        end === "near" ? -reach(across) / 2 : reach(across) / 2,
        end === "near" ? -reach(down) / 2 : reach(down) / 2,
        end === "near" ? middle - cell(fixed) / 2 : middle + cell(fixed) / 2,
      );
    const geometry = this.edge.geometry;
    geometry.setPositions(boxEdges(corner("near"), corner("far")));

    // setPositions swaps in fresh instance attributes whose needsUpdate flag is
    // false, so the renderer would keep drawing the last slice's edges.
    geometry.attributes.instanceStart.needsUpdate = true;
    geometry.attributes.instanceEnd.needsUpdate = true;
  }

  /**
   * The plane drawn at the slice named, showing what is in it, or hidden where
   * the preview is not to show it.
   */
  show(volume: Volume, slice: Slice, palette: RGBA[], visible: boolean) {
    this.group.visible = visible;
    if (!visible) {
      return;
    }
    this.draw(volume, slice, palette);
    this.place(volume.dimensions, slice);
  }
}
