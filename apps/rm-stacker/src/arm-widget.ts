// The three arms standing at a part's root: one per axis, standing inside the
// figure so they turn with it, and dragged along their own axis. Arms tipped
// with an arrowhead slide the part a voxel at a time; arms tipped with a cube
// draw it larger or smaller.
import { Dimensions2D, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type Camera,
} from "@random-mesh/rmsl/scene";

/** Which of the three arrows is meant. */
export type WidgetAxis = keyof Vector3D;

export const widgetAxes: WidgetAxis[] = ["x", "y", "z"];

/** The colour each arrow is drawn in, so an axis is told apart at a glance. */
const AXIS_COLOUR: Record<WidgetAxis, number> = {
  x: 0xe0584c,
  y: 0x6fbf4a,
  z: 0x4a86e0,
};

/**
 * The arrow's proportions, in units of its own length: how thick the shaft is,
 * and how much of the length the head takes up.
 */
const SHAFT_RADIUS = 0.028;
const HEAD_LENGTH = 0.26;
const HEAD_RADIUS = 0.075;

/**
 * How much of the view's height an arrow spans. The camera's pinhole has a
 * focal length of two, so at distance d it sees exactly d from top to bottom,
 * which makes an arrow this fraction of d long the same size on screen however
 * far the camera has been pulled back.
 */
const VIEW_SHARE = 0.25;

/** How near the pointer has to come to an arrow, in pixels, to take hold of it. */
const GRAB_RADIUS = 12;

/**
 * How far from where the three arrows meet, in pixels, a grab has to be before
 * it names an axis. All three start at that point, so a grab on it is as near
 * to one as to another and would take hold of whichever happened to be asked
 * about first.
 */
const HUB_RADIUS = 14;

/**
 * How short an arrow has to look, in pixels, before it stops being draggable.
 * An arrow pointing nearly at the camera covers almost no screen distance, so
 * the little the pointer moves along it would stand for an enormous slide.
 */
const TOO_FORESHORTENED = 10;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Where a point in the drawn world lands on the canvas, in pixels from its top
 * left, or undefined when it falls behind the camera and so is nowhere on it.
 */
export function projectToScreen(
  point: Vector3,
  viewProjection: Matrix4,
  size: Dimensions2D,
  out = new Vector3(),
): Vector2D | undefined {
  out.copy(point).applyMatrix4(viewProjection);

  // A point behind the camera comes back through the projection mirrored into
  // the picture, where it would read as a perfectly ordinary position.
  if (out.z < -1 || out.z > 1) {
    return undefined;
  }

  return {
    x: ((out.x + 1) / 2) * size.width,
    y: ((1 - out.y) / 2) * size.height,
  };
}

/** How far `point` is from the line running between `from` and `to`, in pixels. */
export function distanceToSegment(
  point: Vector2D,
  from: Vector2D,
  to: Vector2D,
): number {
  const run = { x: to.x - from.x, y: to.y - from.y };
  const lengthSquared = run.x * run.x + run.y * run.y;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }

  const along = Math.max(
    0,
    Math.min(
      1,
      ((point.x - from.x) * run.x + (point.y - from.y) * run.y) / lengthSquared,
    ),
  );

  return Math.hypot(
    point.x - (from.x + run.x * along),
    point.y - (from.y + run.y * along),
  );
}

/** An arrow as it lies on the canvas: where its root is, and where its tip is. */
export interface ArmOnScreen {
  axis: WidgetAxis;
  from: Vector2D;
  to: Vector2D;
}

/**
 * Which arrow the pointer has hold of, or undefined when it is over none of
 * them, or over the point they all start from where no one of them is meant.
 * The nearest wins where two arrows cross, which is what makes the one drawn in
 * front the one that is grabbed.
 */
export function armUnderPointer(
  pointer: Vector2D,
  arms: ArmOnScreen[],
): WidgetAxis | undefined {
  if (
    arms.length !== 0 &&
    Math.hypot(pointer.x - arms[0].from.x, pointer.y - arms[0].from.y) <
      HUB_RADIUS
  ) {
    return undefined;
  }

  let closest: { axis: WidgetAxis; distance: number } | undefined;

  for (const arm of arms) {
    const distance = distanceToSegment(pointer, arm.from, arm.to);

    if (
      distance <= GRAB_RADIUS &&
      (closest === undefined || distance < closest.distance)
    ) {
      closest = { axis: arm.axis, distance };
    }
  }

  return closest?.axis;
}

/**
 * How far along its own axis a drag has carried an arrow, in voxels.
 *
 * The pointer moves across the canvas in two dimensions and the arrow lies
 * along one line of it, so only the part of the movement that runs along the
 * arrow counts. How much of the canvas the arrow covers is what says how much
 * the world moves per pixel: `armLength` world units span the arrow's whole
 * length on screen.
 *
 * @param dragged How far the pointer has come since the drag began, in pixels.
 * @param arm Where the arrow lies on the canvas.
 * @param armLength How long the arrow is in the drawn world.
 * @param voxelSize How much of the drawn world one voxel takes up.
 * @returns A whole number of voxels, or 0 for an arrow too foreshortened to
 * read a distance off.
 */
export function voxelsDragged(
  dragged: Vector2D,
  arm: ArmOnScreen,
  armLength: number,
  voxelSize: number,
): number {
  const run = { x: arm.to.x - arm.from.x, y: arm.to.y - arm.from.y };
  const onScreen = Math.hypot(run.x, run.y);

  if (onScreen < TOO_FORESHORTENED) {
    return 0;
  }

  const along = (dragged.x * run.x + dragged.y * run.y) / onScreen;

  return Math.round((along / onScreen) * (armLength / voxelSize));
}

/** What an arm is tipped with, which is what taking hold of it does. */
export type ArmHead = "arrow" | "cube";

/**
 * What a drag along an arm multiplies the part's size by.
 *
 * An arm's whole length on screen stands for doubling the part, and dragging
 * back along it for halving: the part grows by as much again as the pointer has
 * carried the arm's tip out past where it began.
 *
 * @param dragged How far the pointer has come since the drag began, in pixels.
 * @param arm Where the arm lies on the canvas.
 * @returns One for an arm too foreshortened to read a distance off, that being
 * the size the part is already drawn at.
 */
export function sizeDragged(dragged: Vector2D, arm: ArmOnScreen): number {
  const run = { x: arm.to.x - arm.from.x, y: arm.to.y - arm.from.y };
  const onScreen = Math.hypot(run.x, run.y);

  if (onScreen < TOO_FORESHORTENED) {
    return 1;
  }

  const along = (dragged.x * run.x + dragged.y * run.y) / onScreen;

  return Math.pow(2, along / onScreen);
}

/** One arm: a shaft with a head on it, pointing down its own axis. */
function buildArm(axis: WidgetAxis, head: ArmHead): Group {
  const arm = new Group();
  const material = new MeshBasicMaterial({ color: AXIS_COLOUR[axis] });
  // Drawn over whatever it stands in front of, so an arrow reaching into the
  // figure can still be seen and taken hold of.
  material.depthTest = false;

  const shaftLength = 1 - HEAD_LENGTH;
  const shaft = new Mesh(
    new CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, shaftLength, 8),
    material,
  );
  shaft.position.set(0, shaftLength / 2, 0);

  const tip = new Mesh(
    head === "arrow"
      ? new ConeGeometry(HEAD_RADIUS, HEAD_LENGTH, 10)
      : new BoxGeometry(HEAD_LENGTH, HEAD_LENGTH, HEAD_LENGTH),
    material,
  );
  tip.position.set(0, shaftLength + HEAD_LENGTH / 2, 0);

  arm.add(shaft, tip);

  // The shapes are built standing on the y axis, so the two other arms are
  // turned a quarter circle to lie along theirs.
  if (axis === "x") {
    arm.quaternion.setFromAxisAngle(Z_AXIS, -Math.PI / 2);
  } else if (axis === "z") {
    arm.quaternion.setFromAxisAngle(X_AXIS, Math.PI / 2);
  }

  return arm;
}

/**
 * The three arms standing at a part's root. Whoever holds one puts `group` into
 * the same space the figure is drawn in, so the arms turn as the figure turns,
 * and calls `place` whenever the root or the camera moves.
 */
export class ArmWidget {
  readonly group = new Group();
  private arms: { axis: WidgetAxis; arm: Group; tip: Vector3 }[];
  private readonly viewProjection = new Matrix4();
  private readonly scratch = new Vector3();
  private readonly worldTip = new Vector3();
  // Kept between the turns rather than made afresh for each of them.
  private readonly aboutY = new Quaternion();
  private readonly aboutZ = new Quaternion();

  /**
   * How long an arrow is in the drawn world, as of the last `place`. A drag
   * reads its distance against this.
   */
  armLength = 0;

  constructor(head: ArmHead) {
    this.arms = widgetAxes.map((axis) => {
      const arm = buildArm(axis, head);
      this.group.add(arm);
      return { axis, arm, tip: new Vector3() };
    });
  }

  get visible(): boolean {
    return this.group.visible;
  }

  set visible(visible: boolean) {
    this.group.visible = visible;
  }

  /**
   * Stands the arms at `position`, turned as `turn` turns the part, and sizes
   * them for a camera `radius` away so they take up the same part of the
   * picture however far it has zoomed.
   *
   * The arms lie along the part's own axes rather than the figure's, so the arm
   * taken hold of is the line the part will travel along.
   */
  place(position: Vector3D, radius: number, turn: Vector3D): void {
    this.armLength = VIEW_SHARE * radius;
    this.group.position.set(position.x, position.y, position.z);
    this.group.scale.set(this.armLength, this.armLength, this.armLength);
    this.group.quaternion
      .setFromAxisAngle(X_AXIS, turn.x)
      .multiply(this.aboutY.setFromAxisAngle(Y_AXIS, turn.y))
      .multiply(this.aboutZ.setFromAxisAngle(Z_AXIS, turn.z));
  }

  /**
   * Where each arrow lies on a canvas `size` big, seen through `camera`. An
   * arrow that falls behind the camera is left out, which also leaves it
   * ungrabbable.
   */
  armsOnScreen(camera: Camera, size: Dimensions2D): ArmOnScreen[] {
    // The arrows stand inside the figure, so where they have been carried to is
    // read off the whole tree above them rather than off the group alone.
    let outermost: Object3D = this.group;

    while (outermost.parent !== null) {
      outermost = outermost.parent;
    }

    outermost.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    this.viewProjection
      .copy(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse);

    const from = projectToScreen(
      this.scratch.setFromMatrixPosition(this.group.matrixWorld),
      this.viewProjection,
      size,
    );

    if (from === undefined) {
      return [];
    }

    const arms: ArmOnScreen[] = [];

    for (const { axis, tip } of this.arms) {
      tip.set(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0);
      this.worldTip.copy(tip).applyMatrix4(this.group.matrixWorld);

      const to = projectToScreen(this.worldTip, this.viewProjection, size);

      if (to !== undefined) {
        arms.push({ axis, from, to });
      }
    }

    return arms;
  }

  /** Draws the arrow for `axis` brighter, to show it is the one being dragged. */
  setHeld(axis: WidgetAxis | undefined): void {
    for (const arm of this.arms) {
      arm.arm.scale.setScalar(arm.axis === axis ? 1.15 : 1);
    }
  }
}
