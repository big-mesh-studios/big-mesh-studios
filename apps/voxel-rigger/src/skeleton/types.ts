// The rig vocabulary: a skeleton of bones, the keyframes a motion plays on
// them, and the bindings that hang voxel parts off them.
//
// A bone carries the transform it rests in, measured from its parent. A motion
// carries the transforms bones stand in at moments in time. A binding carries
// the transform a part rests in, measured from the bone it hangs off. Nothing
// here knows how any of it is drawn.
import type { Quaternion, Vector3D } from "@big-mesh-studios/maths";
import type { Transform } from "./transform";

/** How a pose moves from one key to the next. */
export type Ease = "linear" | "in" | "out" | "in-out" | "hold";

/** One joint of a skeleton, resting in its parent's space. */
export interface Bone {
  id: string;
  name: string;
  parent: string | null;
  /** Where the joint sits, measured from its parent's joint. */
  position: Vector3D;
  rotation: Quaternion;
  scale: number;
}

/** A tree of bones a voxel figure is hung off. */
export interface Skeleton {
  name: string;
  bones: Bone[];
}

/** A transform a bone stands in at one moment of a motion, and how it leaves it. */
export interface BoneKey extends Transform {
  /** When it stands, in seconds from the start of the motion. */
  at: number;
  ease: Ease;
}

/** The keys one bone stands at, in the order they stand. */
export interface BoneTrack {
  bone: string;
  keys: BoneKey[];
}

/** What a skeleton does over time. */
export interface BoneMotion {
  name: string;
  framesPerSecond: number;
  loop: boolean;
  /** The moment the last key stands at, which is the whole run of the motion. */
  duration: number;
  tracks: BoneTrack[];
}

/**
 * A part hung off a bone: where it sits measured from that bone's rest joint,
 * so the part follows the bone however the bone is posed.
 */
export interface Binding {
  part: string;
  bone: string;
  position: Vector3D;
  rotation: Quaternion;
  scale: number;
}

/** A skeleton, the parts bound to it, and the motions that move it. */
export interface Rig {
  skeleton: Skeleton;
  bindings: Binding[];
  motions: BoneMotion[];
}
