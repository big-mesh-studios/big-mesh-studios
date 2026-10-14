/**
 * Three rings standing round the level item being turned, drawn over whatever they reach
 * into.
 *
 * **Ported from `apps/sdf-modeller/src/view/rotate-handles.ts`.** The one change is what the
 * second argument to `place` means: see `VIEW_SHARE` in `move-handle.ts`.
 *
 * ## Why real geometry and not an overlay
 *
 * **For the reason the move arms are real geometry.** An HTML overlay would have to be told
 * where each point of a ring lands in three dimensions and would then be the only thing in
 * the picture that is not; a ring in the scene is placed by setting a position and a scale,
 * and the renderer puts it where everything else is. See `move-handles` for the fuller
 * version, which was written once and applies here word for word.
 *
 * ## Why the rings stand along the world's axes and never the item's
 *
 * **For the reason the arms do: it is the world that is being turned, not the item's own
 * frame.** A ring that followed the item's turn would, once the wall were laid on its side,
 * be a ring about a line that had itself moved — and the axis under the finger would no
 * longer be the axis a person read off the colours. Which matters more here than it did in
 * the sibling: a level shape carries an `orientation` of its own from ADR 0051, so this is a
 * real question rather than a hypothetical one.
 *
 * ## Why the group is added last, with the depth test off
 *
 * **Because a ring that goes behind the thing it is turning is not grabbable where it looks
 * grabbable.** The rings stand at the item's origin, inside the item, so most of each ring
 * is buried. The depth test off makes them cover the terrain, and being added to the scene
 * after the highlight makes them drawn last — the depth test alone changes nothing because
 * this renderer draws in scene-graph order (ADR 0014). See the header on `move-handles`,
 * which this shares because the two widgets stand on the same canvas under the same rules.
 */
import {
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
} from "@random-mesh/rmsl/scene";

import {
  AXES,
  AXIS_COLOUR,
  projectToScreen,
  type Axis,
  type ScreenPoint,
  type ScreenSize,
} from "./move-handle";
import {
  AROUND,
  RING_VIEW_SHARE,
  TUBE_RADIUS,
  type RingOnScreen,
} from "./rotate-handle";

/** How much bigger the ring being dragged is drawn. */
const HELD_SCALE = 1.08;

/**
 * One ring: a thin circle lying across its own axis.
 *
 * **Built lying across Z and then turned onto its axis**, rather than built three ways, so
 * there is one geometry for all three rings.
 */
const buildRing = (axis: Axis): Mesh => {
  const material = new MeshBasicMaterial({
    color: new Color(AXIS_COLOUR[axis]),
  });
  material.depthTest = false;

  const ring = new Mesh(new TorusGeometry(1, TUBE_RADIUS, 8, AROUND), material);

  // **Which way round matters**, because the axis a ring lies across has to come out
  // pointing along the axis it turns about, or a drag round it turns the part the other
  // way. `+90°` about Y takes +Z onto +X; `-90°` about X takes +Z onto +Y.
  if (axis === "x")
    ring.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
  if (axis === "y")
    ring.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);

  return ring;
};

export interface RotateHandles {
  readonly group: Group;
  /**
   * Stands the rings at `origin`, each `RING_VIEW_SHARE` of the camera's distance across.
   *
   * **Along the world's axes, and never the item's.** See the header.
   *
   * `distance` is **how far the camera is from `origin`**, not how far it is from whatever
   * it is orbiting. See the note on `VIEW_SHARE`.
   */
  readonly place: (
    origin: { readonly x: number; readonly y: number; readonly z: number },
    distance: number,
  ) => void;
  /** Where each ring lies on a canvas `size` big, seen through `camera`. */
  readonly ringsOnScreen: (
    camera: PerspectiveCamera,
    size: ScreenSize,
  ) => readonly RingOnScreen[];
  /** Draws the ring for `axis` larger, to show it is the one being dragged. */
  readonly setHeld: (axis: Axis | undefined) => void;
  readonly setVisible: (visible: boolean) => void;
  readonly dispose: () => void;
}

export const createRotateHandles = (scene: Scene): RotateHandles => {
  const group = new Group();
  const rings = AXES.map((axis) => {
    const ring = buildRing(axis);
    group.add(ring);
    return { axis, ring };
  });
  scene.add(group);

  // Reused every frame rather than allocated, for the reason the move handles give: this
  // runs inside the render loop and the garbage would be the largest thing in it.
  const viewProjection = new Matrix4();
  const middle = new Vector3();
  const point = new Vector3();
  const forward = new Vector3();

  let held: Axis | undefined;

  return {
    group,

    place: (origin, distance) => {
      const across = RING_VIEW_SHARE * distance;
      group.position.set(origin.x, origin.y, origin.z);
      group.scale.set(across, across, across);
      // **No turn is ever set**, deliberately: the rings lie along the world's axes. See
      // the header.
    },

    ringsOnScreen: (camera, size) => {
      // **The rings are children of the scene, so their world matrices come from the
      // scene's root** — read up the tree rather than off the group alone, or a camera that
      // has moved since the last frame would be measured against a stale picture.
      let root: Object3D = group;
      while (root.parent !== null) root = root.parent;
      root.updateMatrixWorld(true);
      camera.updateMatrixWorld();

      viewProjection
        .copy(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse);

      const at = projectToScreen(
        middle.setFromMatrixPosition(group.matrixWorld),
        viewProjection,
        size,
      );
      // **Behind the camera: no rings at all**, which also leaves nothing to grab. A point
      // behind the camera projects into the middle of the picture mirrored, so testing each
      // ring separately would put a handle where none is drawn.
      if (at === undefined) return [];

      const found: RingOnScreen[] = [];
      for (const { axis, ring } of rings) {
        const around: ScreenPoint[] = [];
        for (let step = 0; step < AROUND; step++) {
          const angle = (step / AROUND) * 2 * Math.PI;
          point.set(Math.cos(angle), Math.sin(angle), 0);
          point.applyMatrix4(ring.matrixWorld);
          const projected = projectToScreen(point, viewProjection, size);
          // **A point of the ring out of frame is left out rather than clamped**, so a ring
          // half behind the camera is measured only along the part of it that is drawn.
          if (projected !== undefined) around.push(projected);
        }

        if (around.length < 3) continue;

        // Whether the ring's own axis points back towards whoever is looking or away. A
        // camera looks along its own negative z.
        point.set(0, 0, 1).transformDirection(ring.matrixWorld);
        forward.set(0, 0, -1).transformDirection(camera.matrixWorld);

        found.push({
          axis,
          middle: at,
          around,
          facing: point.dot(forward) < 0,
        });
      }
      return found;
    },

    setHeld: (axis) => {
      if (axis === held) return;
      held = axis;
      for (const entry of rings) {
        entry.ring.scale.setScalar(entry.axis === held ? HELD_SCALE : 1);
      }
    },

    setVisible: (visible) => {
      group.visible = visible;
    },

    dispose: () => {
      scene.remove(group);
    },
  };
};
