// The three rings that turn a part about its pivot: one per axis, standing at
// the pivot inside the figure so they turn with it, and dragged round to turn
// the part about the axis the ring lies across.
import { Dimensions2D, Vector2D, Vector3D } from "@big-mesh-studios/maths";
import {
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  TorusGeometry,
  Vector3,
  type Camera,
} from "@random-mesh/rmsl/scene";
import {
  distanceToSegment,
  projectToScreen,
  widgetAxes,
  type WidgetAxis,
} from "./arm-widget";

/** The colour each ring is drawn in, the same one the arm for that axis takes. */
const AXIS_COLOUR: Record<WidgetAxis, number> = {
  x: 0xe0584c,
  y: 0x6fbf4a,
  z: 0x4a86e0,
};

/** How thick a ring is drawn, in units of its own radius. */
const TUBE_RADIUS = 0.02;

/**
 * How much of the view's height a ring spans, across. The camera's pinhole has
 * a focal length of two, so at distance d it sees exactly d from top to bottom,
 * which makes a ring this fraction of d across the same size on screen however
 * far the camera has been pulled back.
 */
const VIEW_SHARE = 0.3;

/** How near the pointer has to come to a ring, in pixels, to take hold of it. */
const GRAB_RADIUS = 12;

/** How many points a ring is measured along where it lies on the canvas. */
const AROUND = 48;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/** A ring as it lies on the canvas: where its middle is, and its way round. */
export interface RingOnScreen {
  axis: WidgetAxis;
  middle: Vector2D;
  /** Where the ring runs, point by point, in the order it is walked. */
  around: Vector2D[];
  /**
   * Whether the axis the ring lies across points towards whoever is looking.
   * A ring seen from its far side runs the other way about the canvas, so a
   * drag round it turns the part the other way as well.
   */
  facing: boolean;
}

/**
 * Which ring the pointer has hold of, or undefined when it is over none. The
 * nearest wins where two rings cross, which is what makes the one drawn in
 * front the one that is taken hold of.
 */
export function ringUnderPointer(
  pointer: Vector2D,
  rings: RingOnScreen[],
): WidgetAxis | undefined {
  let closest: { axis: WidgetAxis; distance: number } | undefined;

  for (const ring of rings) {
    for (let index = 0; index < ring.around.length; index++) {
      const distance = distanceToSegment(
        pointer,
        ring.around[index],
        ring.around[(index + 1) % ring.around.length],
      );

      if (
        distance <= GRAB_RADIUS &&
        (closest === undefined || distance < closest.distance)
      ) {
        closest = { axis: ring.axis, distance };
      }
    }
  }

  return closest?.axis;
}

/**
 * How far round its own axis a drag has carried a ring, in radians.
 *
 * A ring stands for a turn about the middle it is drawn round, so what a drag
 * says is the angle it has swept about that middle — from where the pointer
 * took hold to where it is now, the long way round being the way it went if
 * that is where it has got to. A ring seen from behind runs the other way about
 * the canvas, so the same sweep is the opposite turn.
 *
 * @param from Where the pointer took hold of the ring, in pixels.
 * @param to Where the pointer is now, in pixels.
 */
export function radiansDragged(
  from: Vector2D,
  to: Vector2D,
  ring: RingOnScreen,
): number {
  const swept =
    Math.atan2(to.y - ring.middle.y, to.x - ring.middle.x) -
    Math.atan2(from.y - ring.middle.y, from.x - ring.middle.x);

  // The canvas counts its y downwards, so an angle swept across it runs the
  // opposite way to one swept in the world.
  return (ring.facing ? -1 : 1) * swept;
}

/** One ring: a thin circle lying across its own axis. */
function buildRing(axis: WidgetAxis): Mesh {
  const material = new MeshBasicMaterial({ color: AXIS_COLOUR[axis] });
  // Drawn over whatever it stands in front of, so a ring reaching into the
  // figure can still be seen and taken hold of.
  material.depthTest = false;

  const ring = new Mesh(new TorusGeometry(1, TUBE_RADIUS, 8, AROUND), material);

  // The circle is built lying across the z axis, so the two other rings are
  // turned a quarter circle to lie across theirs. Which way round matters: the
  // axis a ring lies across has to come out pointing along the axis it turns
  // about, or a drag round it turns the part the other way.
  if (axis === "x") {
    ring.quaternion.setFromAxisAngle(Y_AXIS, Math.PI / 2);
  } else if (axis === "y") {
    ring.quaternion.setFromAxisAngle(X_AXIS, -Math.PI / 2);
  }

  return ring;
}

/**
 * The three rings standing at a part's pivot. Whoever holds one puts `group`
 * into the same space the figure is drawn in, so the rings turn as the figure
 * turns, and calls `place` whenever the pivot or the camera moves.
 */
export class TurnWidget {
  readonly group = new Group();
  private readonly rings: { axis: WidgetAxis; ring: Mesh }[];
  private readonly viewProjection = new Matrix4();
  private readonly middle = new Vector3();
  private readonly point = new Vector3();
  private readonly forward = new Vector3();
  // Kept between the turns rather than made afresh for each of them.
  private readonly aboutY = new Quaternion();
  private readonly aboutZ = new Quaternion();

  constructor() {
    this.rings = widgetAxes.map((axis) => {
      const ring = buildRing(axis);
      this.group.add(ring);
      return { axis, ring };
    });
  }

  get visible(): boolean {
    return this.group.visible;
  }

  set visible(visible: boolean) {
    this.group.visible = visible;
  }

  /**
   * Stands the rings at `position`, turned as `turn` turns the part, and sizes
   * them for a camera `radius` away so they take up the same part of the
   * picture however far it has zoomed.
   *
   * The rings lie along the part's own axes rather than the figure's, so the
   * ring taken hold of is the circle the part will travel round.
   */
  place(position: Vector3D, radius: number, turn: Vector3D): void {
    const across = VIEW_SHARE * radius;
    this.group.position.set(position.x, position.y, position.z);
    this.group.scale.set(across, across, across);
    this.group.quaternion
      .setFromAxisAngle(X_AXIS, turn.x)
      .multiply(this.aboutY.setFromAxisAngle(Y_AXIS, turn.y))
      .multiply(this.aboutZ.setFromAxisAngle(Z_AXIS, turn.z));
  }

  /**
   * Where each ring lies on a canvas `size` big, seen through `camera`. A ring
   * whose middle falls behind the camera is left out, which also leaves it
   * ungrabbable.
   */
  ringsOnScreen(camera: Camera, size: Dimensions2D): RingOnScreen[] {
    // The rings stand inside the figure, so where they have been carried to is
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

    const middle = projectToScreen(
      this.middle.setFromMatrixPosition(this.group.matrixWorld),
      this.viewProjection,
      size,
    );

    if (middle === undefined) {
      return [];
    }

    const rings: RingOnScreen[] = [];

    for (const { axis, ring } of this.rings) {
      const around: Vector2D[] = [];

      for (let step = 0; step < AROUND; step++) {
        const angle = (step / AROUND) * 2 * Math.PI;
        this.point.set(Math.cos(angle), Math.sin(angle), 0);
        this.point.applyMatrix4(ring.matrixWorld);

        const at = projectToScreen(this.point, this.viewProjection, size);

        if (at !== undefined) {
          around.push(at);
        }
      }

      if (around.length < 3) {
        continue;
      }

      // Whether the ring's own axis, once the figure has been turned, points
      // back towards whoever is looking or away from them. A camera looks
      // along its own negative z.
      this.point.set(0, 0, 1).transformDirection(ring.matrixWorld);
      this.forward.set(0, 0, -1).transformDirection(camera.matrixWorld);

      rings.push({
        axis,
        middle,
        around,
        facing: this.point.dot(this.forward) < 0,
      });
    }

    return rings;
  }

  /** Draws the ring for `axis` brighter, to show it is the one being dragged. */
  setHeld(axis: WidgetAxis | undefined): void {
    for (const ring of this.rings) {
      ring.ring.scale.setScalar(ring.axis === axis ? 1.08 : 1);
    }
  }
}
