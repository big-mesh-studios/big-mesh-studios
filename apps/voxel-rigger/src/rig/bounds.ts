// The box a whole rig fills, which is what the viewport frames when a skeleton
// or a model is put in front of it.
import { Vector3D } from "@big-mesh-studios/maths";
import type { VoxelPart } from "./anchors";
import { restWorld } from "../skeleton/pose";
import type { Skeleton } from "../skeleton/types";

/** A point to frame on, and how far the rig reaches from it. */
export interface RigBounds {
  centre: Vector3D;
  radius: number;
}

/** Everything about a rig that takes up room: joints and part anchors alike. */
export function rigBounds(parts: VoxelPart[], skeleton: Skeleton): RigBounds {
  const points: Vector3D[] = [];

  for (const bone of skeleton.bones) {
    points.push(restWorld(skeleton, bone).position);
  }

  for (const part of parts) {
    const { position, scale } = part.anchor;
    // A part reaches half its box from its anchor on every axis.
    points.push(
      Vector3D.create(
        position.x - scale / 2,
        position.y - scale / 2,
        position.z - scale / 2,
      ),
      Vector3D.create(
        position.x + scale / 2,
        position.y + scale / 2,
        position.z + scale / 2,
      ),
    );
  }

  if (points.length === 0) {
    return { centre: Vector3D.create(0, 0, 0), radius: 20 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }

  const centre = Vector3D.create(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  );
  const radius = Math.max(
    4,
    Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2,
  );

  return { centre, radius };
}
