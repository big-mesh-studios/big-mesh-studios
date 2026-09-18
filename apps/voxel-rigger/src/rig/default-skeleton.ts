// The skeleton a fresh rig starts with: a plain humanoid standing on the
// ground, in voxel units, so a rig can be drawn on before anything is imported.
// Joints are named after the bones a humanoid clip usually drives, which is
// what lets an imported animation find them.
import { Vector3D } from "@big-mesh-studios/maths";
import type { Bone, Skeleton } from "../skeleton/types";

/** A bone resting at `position` from its parent, facing as the figure does. */
function bone(
  id: string,
  name: string,
  parent: string | null,
  position: Vector3D,
): Bone {
  return {
    id,
    name,
    parent,
    position,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: 1,
  };
}

/** A humanoid skeleton about thirty voxels tall, hips at the origin. */
export function defaultSkeleton(): Skeleton {
  return {
    name: "humanoid",
    bones: [
      bone("hips", "hips", null, Vector3D.create(0, 0, 0)),
      bone("spine", "spine", "hips", Vector3D.create(0, 3, 0)),
      bone("chest", "chest", "spine", Vector3D.create(0, 4, 0)),
      bone("neck", "neck", "chest", Vector3D.create(0, 2.5, 0)),
      bone("head", "head", "neck", Vector3D.create(0, 2, 0)),
      bone(
        "upper-arm.left",
        "upper-arm.left",
        "chest",
        Vector3D.create(2, 1.5, 0),
      ),
      bone(
        "lower-arm.left",
        "lower-arm.left",
        "upper-arm.left",
        Vector3D.create(0, -4, 0),
      ),
      bone(
        "hand.left",
        "hand.left",
        "lower-arm.left",
        Vector3D.create(0, -3, 0),
      ),
      bone(
        "upper-arm.right",
        "upper-arm.right",
        "chest",
        Vector3D.create(-2, 1.5, 0),
      ),
      bone(
        "lower-arm.right",
        "lower-arm.right",
        "upper-arm.right",
        Vector3D.create(0, -4, 0),
      ),
      bone(
        "hand.right",
        "hand.right",
        "lower-arm.right",
        Vector3D.create(0, -3, 0),
      ),
      bone(
        "upper-leg.left",
        "upper-leg.left",
        "hips",
        Vector3D.create(1.5, -1, 0),
      ),
      bone(
        "lower-leg.left",
        "lower-leg.left",
        "upper-leg.left",
        Vector3D.create(0, -5, 0),
      ),
      bone(
        "foot.left",
        "foot.left",
        "lower-leg.left",
        Vector3D.create(0, -5, 0),
      ),
      bone(
        "upper-leg.right",
        "upper-leg.right",
        "hips",
        Vector3D.create(-1.5, -1, 0),
      ),
      bone(
        "lower-leg.right",
        "lower-leg.right",
        "upper-leg.right",
        Vector3D.create(0, -5, 0),
      ),
      bone(
        "foot.right",
        "foot.right",
        "lower-leg.right",
        Vector3D.create(0, -5, 0),
      ),
    ],
  };
}
