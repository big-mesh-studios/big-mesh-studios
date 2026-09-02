// The plane a cut stands in, shown through the figure while a knife is held
// over a panel: a quad the width of the part's box, standing where the part
// would be divided, in the colour that axis's cuts are drawn in.
import { Dimensions3D } from "@big-mesh-studios/maths";
import {
  axisSides,
  boxSize,
  dimensionAxes,
  sideAxes,
  standAs,
  type DimensionKind,
  type PartPlacement,
} from "@big-mesh-studios/stacker/renderer";
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Side,
  Vector3,
} from "@random-mesh/rmsl/scene";
import { axisColourHex } from "./panels";
import type { Cut } from "./types";

/** How much of what stands behind it the plane lets through. */
const OPACITY = 0.4;

/**
 * How much it lets through where the figure stands in front of it, which is
 * drawn over the figure rather than into it.
 *
 * A plane through the middle of a model is inside it almost everywhere, and one
 * that could only be seen where nothing covers it would all but disappear at
 * the moment somebody is placing it. This is the little of it that shows
 * through the model, faint enough that the plane still reads as standing inside
 * the figure rather than in front of it.
 */
const COVERED_OPACITY = 0.12;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

/**
 * How the quad, which is built lying across the depth, is turned to lie across
 * each of the other two axes.
 */
const FACING: Record<DimensionKind, { about: Vector3; angle: number }> = {
  width: { about: Y_AXIS, angle: Math.PI / 2 },
  height: { about: X_AXIS, angle: -Math.PI / 2 },
  depth: { about: X_AXIS, angle: 0 },
};

/**
 * The plane a cut would stand in, drawn inside the part it cuts.
 *
 * Whoever holds one puts `group` into the space the figure's parts are placed
 * in, and calls `place` whenever the cut, the part or its box changes.
 */
export class CutPlane {
  readonly group = new Group();
  /** Where the plane stands inside the part's box, which the group turns with it. */
  private readonly standing = new Group();
  private readonly materials: MeshBasicMaterial[];

  constructor() {
    const geometry = new PlaneGeometry();

    // The faint pass first, so the one that stops at the figure is laid over
    // the one that shows through it rather than under it.
    this.materials = [
      { opacity: COVERED_OPACITY, depthTest: false },
      { opacity: OPACITY, depthTest: true },
    ].map(({ opacity, depthTest }) => {
      const material = new MeshBasicMaterial({
        opacity,
        transparent: true,
        side: Side.DoubleSide,
      });
      material.depthTest = depthTest;
      // The plane stands among the voxels rather than closing them off, so
      // what is drawn after it is drawn against the depth of the figure.
      material.depthWrite = false;
      this.standing.add(new Mesh(geometry, material));
      return material;
    });

    this.group.add(this.standing);
    // Nowhere until a cut is placed in it.
    this.group.visible = false;
  }

  get visible(): boolean {
    return this.group.visible;
  }

  set visible(visible: boolean) {
    this.group.visible = visible;
  }

  /**
   * Stands the plane where `cut` divides a part `dimensions` big, standing as
   * `placement` stands that part.
   *
   * The plane spans the whole of the box the part is marched inside, which
   * reaches a voxel past the volume on every side, so it comes out past the
   * part it cuts however full of voxels that part is.
   */
  place(
    placement: PartPlacement,
    dimensions: Dimensions3D,
    { axis, at }: Cut,
  ): void {
    standAs(this.group, placement);

    const box = boxSize(dimensions);
    const [across, down] = sideAxes[axisSides[axis][0]];
    const normalized = Dimensions3D.normalize(dimensions);
    const facing = FACING[axis];

    this.standing.scale.set(box[across], box[down], 1);
    this.standing.quaternion.setFromAxisAngle(facing.about, facing.angle);
    this.standing.position.set(0, 0, 0);
    // The volume is marched from the low end of each axis at half the box below
    // the middle, so a cut so many voxels along stands that far up from there.
    this.standing.position[dimensionAxes[axis]] =
      normalized[axis] * (at / dimensions[axis] - 0.5);

    for (const material of this.materials) {
      material.color.setHex(axisColourHex(axis));
    }
  }
}
