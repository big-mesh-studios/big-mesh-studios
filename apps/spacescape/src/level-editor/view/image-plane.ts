/**
 * A reference image laid flat on the ground, to trace a level against.
 *
 * ## What this is for
 *
 * Somebody building a level often has a picture of what they are building — a floor plan, a
 * screenshot, a hand drawing — and wants to trace its walls and floor with the drawing tools.
 * This draws that picture as one quad lying on the local ground plane, semi-transparent, so it
 * can be seen *through* the terrain while the walls tool is used.
 *
 * ## Why the depth test is off
 *
 * **Because a reference that the hillside hides is a reference that is not there.** The whole
 * point is to trace against it while orbiting the ground, and the ground is exactly what would
 * occlude it. So the material ignores depth like the draft (`draw-lines-overlay.ts`) and the
 * move handles (`move-handles.ts`) do — and, like them, it must be added to the scene *after*
 * the world to show at all, because rmsl draws in insertion order
 * ([ADR 0014](../../../../docs/adr/0014-the-sky-dome-is-drawn-first.md)). The caller keeps it
 * before the draft so the draft lines still paint on top of it.
 *
 * ## Why it is not geometry
 *
 * A reference image is a tracing aid, not something the level *is*. It never becomes a
 * `LevelItem`, never folds into the CSG, and never reaches `apply-level.ts`; it is a single
 * mesh plus (optionally) a top-level annotation on the level file. See `docs/image-plane-plan.md`.
 *
 * ## Why the plane's normal is the frame's up, and not `+Y`
 *
 * **The same reason `draw/plane.ts` gives a wall's plane the frame's up**: up is a function of
 * position ([ADR 0037](../../../../docs/adr/0037-up-is-a-function-of-where-you-are.md)). On a
 * flat world the plane lies in world XZ; on a planet it lies on the local ground wherever it is
 * placed, so tracing works at the equator and the pole alike. Hard-coding `+Y` would tip the
 * image off the ground everywhere but one small patch.
 */

import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Side,
  type Scene,
  type Texture,
} from "@random-mesh/rmsl/scene";
import {
  normalize,
  onbFromDirection,
  rotateAboutAxis,
  type Quat,
  type Vec3,
} from "@big-mesh-studios/core";

import { quatFromBasis } from "../../places/level/walls";
import { DEFAULT_IMAGE_PLANE_OPACITY } from "../image/image-plane-state";

/** Where the image sits and how it is laid, in world space. */
export interface ImagePlanePose {
  /** The middle of the image, on the ground. */
  readonly at: Vec3;
  /** The image's normal — up out of the ground at `at`. */
  readonly up: Vec3;
  /** Turn about `up`, in radians, so a plan can be twisted to line up with the terrain. */
  readonly yaw: number;
  /** How wide the image is across the plane, in world units. Height follows the aspect. */
  readonly width: number;
}

/**
 * The turn that lays a quad's own axes onto the ground plane, `yaw` about the normal.
 *
 * **Built from the basis and not from angles**, exactly as `walls.ts` builds a wall box's turn:
 * the columns are the images of the quad's local +X, +Y and +Z, which are the plane's two
 * tangents and its normal, and `quatFromBasis` is the standard matrix-to-quaternion extraction.
 * The two tangents are turned by `yaw` about the normal first, so the image spins in its own
 * plane rather than being re-derived from a world axis it does not have.
 *
 * **A zero normal becomes world up**, matching `planeThrough` (`draw/plane.ts`): `normalize`
 * answers the zero vector with zero, and `onbFromDirection` of zero would be a plane with no
 * directions at all.
 */
export const imagePlaneQuaternion = (up: Vec3, yaw: number): Quat => {
  const normalized = normalize(up);
  const normal =
    normalized.x === 0 && normalized.y === 0 && normalized.z === 0
      ? { x: 0, y: 1, z: 0 }
      : normalized;
  const { b1, b2 } = onbFromDirection(normal);
  const axisA = rotateAboutAxis(b1, normal, yaw);
  const axisB = rotateAboutAxis(b2, normal, yaw);
  return quatFromBasis(axisA, axisB, normal);
};

/**
 * The single quad that draws a reference image, or nothing when there is none.
 *
 * **Owns its geometry**, so `dispose` frees it; the texture it is handed is disposed on
 * replacement and on `dispose`, because this is the only thing that knows when the last one is
 * no longer needed. `MeshBasicMaterial` itself has no `dispose` — it holds no GPU buffers of
 * its own — so, like the highlight, only the geometry and the texture are released
 * (`highlight.ts`).
 */
export interface ImagePlaneOverlay {
  /** The mesh, so a caller can read its transform or position it by hand. */
  readonly mesh: Mesh;
  /** Shows `texture`, sized to its own `aspect` (width ÷ height). */
  setImage(texture: Texture, aspect: number): void;
  /** Lays the plane down at a pose, replacing whatever pose was set. */
  setPose(pose: ImagePlanePose): void;
  /** How see-through the image is. */
  setOpacity(opacity: number): void;
  /** Whether the image is drawn. Hidden by default, and while the editor is closed. */
  setVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * Adds the image plane to `scene`, hidden until it is given an image.
 *
 * **Added here, and the caller keeps the order** (before the draft overlay), because that is
 * the only way it shows over the terrain at all — see the header.
 */
export const createImagePlaneOverlay = (scene: Scene): ImagePlaneOverlay => {
  const geometry = new PlaneGeometry(1, 1);
  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: DEFAULT_IMAGE_PLANE_OPACITY,
    // **Two-sided, because the image is on the ground.** A single-sided quad vanishes when the
    // camera drops below it, which is every time somebody kneels to place a wall by eye.
    side: Side.DoubleSide,
  });
  // Over the world, for the reason in the header. Depth *write* stays off so the terrain behind
  // it is not occluded by a reference that is not solid.
  material.depthTest = false;
  material.depthWrite = false;

  const mesh = new Mesh(geometry, material);
  mesh.visible = false;
  scene.add(mesh);

  /** The image's height ÷ width, so `width` alone sizes it. 1 until an image arrives. */
  let aspect = 1;
  let texture: Texture | undefined;

  return {
    mesh,

    setImage(next, nextAspect): void {
      if (next === texture) return;
      // **Disposed on replacement, not left to the collector.** A texture keys a GPU object in
      // the renderer, and replacing the reference repeatedly would leak one per image.
      texture?.dispose();
      texture = next;
      material.map = next;
      material.needsUpdate = true;
      aspect = nextAspect > 0 ? nextAspect : 1;
    },

    setPose(pose): void {
      mesh.position.set(pose.at.x, pose.at.y, pose.at.z);
      const turn = imagePlaneQuaternion(pose.up, pose.yaw);
      mesh.quaternion.set(turn.x, turn.y, turn.z, turn.w);
      // rmsl applies scale, then rotation, then translation, so a unit quad scaled to the
      // image's reach and turned about its own middle stays centred on `at`.
      mesh.scale.set(pose.width, pose.width / aspect, 1);
    },

    setOpacity(opacity): void {
      material.opacity = opacity;
    },

    setVisible(visible): void {
      mesh.visible = visible;
    },

    dispose(): void {
      scene.remove(mesh);
      geometry.dispose();
      texture?.dispose();
      texture = undefined;
    },
  };
};
