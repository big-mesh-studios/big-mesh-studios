// The slice being edited, standing where it sits in the model.
//
// The same slice is drawn on the canvas beside the model, so the plane is where
// the two agree: it is the only thing in the preview that says which of the
// slices in front of you is the one under your fingers, and a model thirty
// voxels deep gives nothing else to say which way in you are standing.
import {
  Bitmap,
  Dimensions3D,
  type RGBA,
  type Vector3D as Vector3DType,
} from "@big-mesh-studios/maths";
import {
  dimensionCount,
  planeAxes,
  planeSlicedAxis,
  readSlice,
  type Plane,
  type Slice,
  type Volume,
} from "@big-mesh-studios/stacker/volume";
import {
  DataTexture,
  Group,
  Mesh,
  NearestFilter,
  PlaneGeometry,
  Vector3,
} from "@random-mesh/rmsl/scene";
import { PanelMaterial } from "./panel-material";

/** How far round each plane's quad has to be turned to lie down its own axis. */
const FACING: Record<Plane, Vector3> = {
  xy: new Vector3(0, 0, 0),
  yz: new Vector3(0, Math.PI / 2, 0),
  zx: new Vector3(-Math.PI / 2, 0, 0),
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

    for (const mesh of [this.panel, this.ghost]) {
      const material = mesh.material as PanelMaterial;
      material.gridColour.setHex(0x000000);
      material.gridShare = 0;
      material.opacity = PLANE_OPACITY;
      material.transparent = true;
      material.depthWrite = false;
    }

    this.group.add(this.panel, this.ghost);
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
    const reach = (axis: keyof Vector3DType) =>
      axis === "x"
        ? normalized.width
        : axis === "y"
          ? normalized.height
          : normalized.depth;
    const cell = (axis: keyof Vector3DType) =>
      reach(axis) / Math.max(1, dimensionCount[axis](dimensions));

    for (const mesh of [this.panel, this.ghost]) {
      const facing = FACING[slice.plane];
      mesh.scale.set(reach(across), reach(down), 1);
      mesh.rotation.set(facing.x, facing.y, facing.z);
      mesh.position.set(0, 0, 0);
      mesh.position[fixed] = (slice.at + 0.5) * cell(fixed) - reach(fixed) / 2;
    }
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
