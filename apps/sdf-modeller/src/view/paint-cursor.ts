/**
 * The ring under the brush, laid flat against whatever the brush is over.
 *
 * ## Why a ring and not a disc
 *
 * **Because a filled disc covers the thing it is about to paint.** The brush's job is to say
 * where the next texel goes, and a solid circle over the surface hides the first thing a person
 * needs to see — whether what they are painting over is the colour they think it is. A ring
 * answers the same question without covering the answer.
 *
 * ## Why it is drawn without a depth test
 *
 * **Because it lies *on* the surface it is describing.** A brush cursor sitting exactly on the
 * geometry is a fight with the depth buffer over which side of a triangle wins, and on a meshed
 * figure the vertex it lands nearest wins more often than not. The move and rotate handles turn
 * the depth test off for the same reason; this is the third place in this application where a
 * widget has to be visible through the thing it is attached to.
 *
 * ## Why it is a thin torus rather than a flat annulus
 *
 * **Because rmsl has no `RingGeometry`, and it has a torus** — which the rotate handles already
 * draw three of. Seen face on, a torus with a small tube is an annulus with a visible hole, which
 * is the ring. Building a flat one would be a buffer geometry written by hand to replace
 * something already in the library that does the job.
 *
 * ## Why it is scaled rather than rebuilt
 *
 * **Because a drag changes the camera's distance and the brush's width, and neither changes a
 * circle.** The ring is built once at unit size and put at a scale every frame, which is the same
 * argument `ghost.ts` makes about building its copy once.
 */
import {
  Color,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  Vector3,
} from "@random-mesh/rmsl/scene";
import type { Scene } from "@random-mesh/rmsl/scene";

/**
 * How thick the ring is, as a fraction of its radius.
 *
 * **A twentieth, which at the sizes a brush is drawn is about two pixels.** Thick enough to survive
 * being small on screen — a one-texel brush at a wide zoom would otherwise be a hairline — and
 * thin enough not to read as a disc.
 */
export const RING_TUBE = 0.05;

/** How many points round the ring. Enough to look round at the sizes it is drawn at. */
const AROUND = 48;

/** Segments round the tube. Four is a square cross-section, which is invisible at this size. */
const ACROSS = 6;

export interface PaintCursor {
  readonly mesh: () => Mesh | undefined;
  /**
   * Lays the ring flat against a surface, at a given world radius.
   *
   * **Rotated by axis and angle rather than by a matrix or a look-at**, because rmsl's
   * `Quaternion` has no `setFromUnitVectors`. The axis is the cross product of the ring's own
   * normal — +Z — with the surface's, and the angle the angle between them, which is the same
   * rotation expressed as the two numbers the library does have.
   */
  readonly place: (
    point: { readonly x: number; readonly y: number; readonly z: number },
    normal: { readonly x: number; readonly y: number; readonly z: number },
    radius: number,
  ) => void;
  /** Takes the ring off the screen. Separate from `place` because a miss does not move it. */
  readonly hide: () => void;
  readonly dispose: () => void;
}

/**
 * Added to the scene after the handles, and for the reason the handles are: the renderer draws in
 * scene-graph order and a cursor that a rebuild could put behind the model would be invisible
 * exactly when the model changed.
 */
export const createPaintCursor = (scene: Scene): PaintCursor => {
  const material = new MeshBasicMaterial({ color: new Color(0xffffff) });
  material.depthTest = false;
  material.transparent = true;
  material.opacity = 0.9;

  // **A torus lies in its own XY plane with its hole along Z**, which is the frame the rotation
  // below turns onto a surface normal.
  const ring = new Mesh(
    new TorusGeometry(1, RING_TUBE, ACROSS, AROUND),
    material,
  );
  ring.visible = false;

  scene.add(ring);

  // Reused rather than allocated, because this runs inside the render loop.
  const away = new Vector3();
  const axis = new Vector3();

  return {
    mesh: () => ring,

    place: (point, normal, radius) => {
      away.set(normal.x, normal.y, normal.z);
      if (away.length() > 0) away.normalize();

      // **The rotation from +Z onto the normal, as an axis and an angle.** The cross product of
      // the two is the axis they turn about, and its length is the sine of the angle between them,
      // so a single `atan2` of the lengths gives that angle. A normal already along +Z has no
      // cross product, and one along -Z has an axis but a zero sine — both are named here because
      // both are what a brush sees when it looks straight at a surface, or straight into a hole.
      axis.set(-away.y, away.x, 0);
      const sine = axis.length();
      const angle = Math.atan2(sine, away.z);
      if (sine > 1e-9) {
        axis.normalize();
        ring.quaternion.setFromAxisAngle(axis, angle);
      } else if (away.z < 0) {
        // **Antiparallel: any axis perpendicular to Z will do**, and X is the obvious one.
        ring.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
      } else {
        ring.quaternion.set(0, 0, 0, 1);
      }

      ring.position.set(point.x, point.y, point.z);
      ring.scale.setScalar(Math.max(radius, 1e-4));
      ring.visible = true;
    },

    hide: () => {
      ring.visible = false;
    },

    dispose: () => {
      scene.remove(ring);
      ring.geometry.dispose();
      // **No `material.dispose()`,** because rmsl's `Material` does not have one — only
      // geometries and textures do, and those the renderer releases with itself.
    },
  };
};
