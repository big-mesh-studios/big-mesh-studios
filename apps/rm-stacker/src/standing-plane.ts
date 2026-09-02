// A quad standing among a figure's voxels, and how one is laid across a part's
// axis: the plane a knife would cut along, and the planes standing at a part's
// panels, are all drawn this way.
import { Dimensions3D } from "@big-mesh-studios/maths";
import {
  axisSides,
  dimensionAxes,
  sideAxes,
  type DimensionKind,
} from "@big-mesh-studios/stacker/renderer";
import {
  DataTexture,
  Mesh,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  Side,
  Vector3,
} from "@random-mesh/rmsl/scene";
import { PanelMaterial } from "./panel-material";

/**
 * How much of its picture a plane keeps where the figure stands in front of it,
 * which is drawn over the figure rather than into it.
 *
 * A plane through the middle of a model is inside it almost everywhere, and one
 * that could only be seen where nothing covers it would all but disappear at
 * the moment somebody is placing it. This is the little of it that shows
 * through the model, faint enough that the plane still reads as standing inside
 * the figure rather than in front of it.
 */
const COVERED_SHARE = 0.35;

/** How solid the grid over a plane's cells is drawn. */
const GRID_OPACITY = 0.5;

/** The quad a standing plane is drawn from: one unit across, lying across the depth. */
const QUAD = new PlaneGeometry();

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
 * Which of a turned quad's own two axes count against the model's: `true` where
 * the quad's counts up as the model's counts down, which is what turning a quad
 * built across the depth to lie across another axis leaves behind.
 */
export const AGAINST: Record<
  DimensionKind,
  { across: boolean; down: boolean }
> = {
  width: { across: true, down: false },
  height: { across: false, down: true },
  depth: { across: false, down: false },
};

/**
 * How much room a plane lying across an axis takes up, and where along that
 * axis it stands, in the space a part's box is drawn in.
 */
export interface PlaneSpan {
  /** How far it reaches along the first of the two axes it spans. */
  across: number;
  /** How far it reaches along the second of them. */
  down: number;
  /** Where it stands along the axis it lies across, from the middle of the box. */
  at: number;
}

/**
 * The picture shown on a plane: one RGBA texel per cell, row by row, the rows
 * running from the bottom of the plane up.
 */
export interface Picture {
  texels: Uint8Array;
  width: number;
  height: number;
}

/**
 * How far a plane lying across `axis` has to reach in the two axes it spans to
 * cover the whole of a box `extents` big.
 *
 * The two are the axes the sides looking along `axis` are drawn across, taken
 * in the order those sides are drawn in, which is the order the quad's own two
 * axes are read as.
 */
export function spanAcross(
  extents: Dimensions3D,
  axis: DimensionKind,
): Pick<PlaneSpan, "across" | "down"> {
  const [across, down] = sideAxes[axisSides[axis][0]];
  return { across: extents[across], down: extents[down] };
}

/** Lays one quad across `axis` at the room and the place `span` gives it. */
function lieAcross(
  object: Object3D,
  axis: DimensionKind,
  span: PlaneSpan,
): void {
  const facing = FACING[axis];

  object.scale.set(span.across, span.down, 1);
  object.quaternion.setFromAxisAngle(facing.about, facing.angle);
  object.position.set(0, 0, 0);
  object.position[dimensionAxes[axis]] = span.at;
}

/**
 * A quad standing in the space a part's box is drawn in, showing a picture.
 *
 * A plane stops at the figure: what is drawn in front of it hides it, and it
 * hides what is drawn behind. One asked to show through is drawn a second time
 * over whatever covers it, faintly, so that a plane buried in a model is still
 * seen there — and takes no part in the depth of the figure, so the planes that
 * do stop at it are the ones that decide what is in front of what.
 *
 * Whoever holds one puts `panel`, and `ghost` before every panel, into the
 * space the part's box is drawn in.
 */
export class StandingPlane {
  /** The plane as it is drawn against the depth of the figure. */
  readonly panel: Mesh;
  /** The pass drawn over whatever covers it, for a plane that shows through. */
  readonly ghost: Mesh | undefined;
  /** The picture every pass reads, which `show` writes. */
  private readonly picture = new DataTexture(new Uint8Array(4), 1, 1);
  private readonly materials: PanelMaterial[];

  constructor({ showThrough = false }: { showThrough?: boolean } = {}) {
    // Cells are square on the drawing and stay square on the plane, however
    // near the camera comes to it.
    this.picture.magFilter = NearestFilter;
    this.picture.minFilter = NearestFilter;

    const material = new PanelMaterial(this.picture);
    material.transparent = true;
    material.side = Side.DoubleSide;
    // A plane that is drawn over the figure as well is an overlay on it: what
    // is drawn after such a plane is drawn against the figure's own depth
    // rather than against the plane's.
    material.depthWrite = !showThrough;

    this.panel = new Mesh(QUAD, material);
    this.materials = [material];

    if (showThrough) {
      const covered = new PanelMaterial(this.picture);
      covered.transparent = true;
      covered.side = Side.DoubleSide;
      covered.opacity = COVERED_SHARE;
      covered.depthTest = false;
      covered.depthWrite = false;

      this.ghost = new Mesh(QUAD, covered);
      this.materials.push(covered);
    }
  }

  /** Lays the plane across `axis` at the room and the place `span` gives it. */
  lie(axis: DimensionKind, span: PlaneSpan): void {
    lieAcross(this.panel, axis, span);

    if (this.ghost !== undefined) {
      lieAcross(this.ghost, axis, span);
    }
  }

  /** Which of its faces the plane is drawn on, and so which way it is seen from. */
  set facing(side: Side) {
    for (const material of this.materials) {
      material.side = side;
    }
  }

  /**
   * The colour the cells of its picture are outlined in, or undefined for a
   * plane drawn without a grid over it.
   */
  set grid(colour: number | undefined) {
    for (const material of this.materials) {
      material.gridShare = colour === undefined ? 0 : GRID_OPACITY;

      if (colour !== undefined) {
        material.gridColour.setHex(colour);
      }
    }
  }

  /** Shows `picture` on the plane, spread across the whole of it. */
  show({ texels, width, height }: Picture): void {
    this.picture.image = texels;
    this.picture.width = width;
    this.picture.height = height;
    this.picture.needsUpdate = true;

    for (const material of this.materials) {
      material.cells = [width, height];
    }
  }
}
