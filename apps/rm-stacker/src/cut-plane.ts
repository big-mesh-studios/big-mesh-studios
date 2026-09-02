// The plane a cut stands in, shown through the figure while a knife is held
// over a panel: a quad the width of the part's box, standing where the part
// would be divided, in the colour that axis's cuts are drawn in.
import { Dimensions3D } from "@big-mesh-studios/maths";
import {
  boxSize,
  standAs,
  type PartPlacement,
} from "@big-mesh-studios/stacker/renderer";
import { Group } from "@random-mesh/rmsl/scene";
import { flatPicture } from "./panel-drawing";
import { axisColourHex } from "./panels";
import { spanAcross, StandingPlane } from "./standing-plane";
import type { Cut } from "./types";

/** How much of the figure behind it a cut's plane lets through. */
const OPACITY = 0.4;

/**
 * Where `cut` stands from the middle of a part `dimensions` big, along the axis
 * it divides, in the space that part's box is drawn in.
 */
export function alongTheCut(
  dimensions: Dimensions3D,
  { axis, at }: Cut,
): number {
  // The volume is marched from the low end of each axis at half of it below the
  // middle, so a cut so many voxels along stands that far up from there.
  return (
    Dimensions3D.normalize(dimensions)[axis] * (at / dimensions[axis] - 0.5)
  );
}

/**
 * The plane a cut would stand in, drawn inside the part it cuts.
 *
 * Whoever holds one puts `group` into the space the figure's parts are placed
 * in, and calls `place` whenever the cut, the part or its box changes.
 */
export class CutPlane {
  readonly group = new Group();
  /** The plane itself, which the group carries to the part and turns with it. */
  private readonly plane = new StandingPlane({ showThrough: true });

  constructor() {
    this.group.add(this.plane.ghost!, this.plane.panel);
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
   * reaches a voxel past the volume on every side, so it comes out past the part
   * it cuts however full of voxels that part is.
   */
  place(placement: PartPlacement, dimensions: Dimensions3D, cut: Cut): void {
    standAs(this.group, placement);
    this.plane.lie(cut.axis, {
      ...spanAcross(boxSize(dimensions), cut.axis),
      at: alongTheCut(dimensions, cut),
    });
    this.plane.show(flatPicture(axisColourHex(cut.axis), OPACITY));
  }
}
