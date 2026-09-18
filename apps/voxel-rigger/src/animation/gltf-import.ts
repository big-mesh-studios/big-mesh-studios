// Reading a skeleton and its animations out of a glTF or GLB file.
//
// The file is parsed with three's loader and then thrown away: only the joint
// tree and the keyframes moving it are kept, in this rig's own vocabulary. A
// mesh the file also carries is never drawn — the voxel parts are what is
// drawn — so a file of nothing but bones and a motion is as good as a full
// character.
import {
  Object3D,
  Quaternion,
  Vector3,
  type AnimationClip,
  type KeyframeTrack,
} from "three";
import { GLTFLoader, type GLTF } from "three-stdlib";
import { Vector3D } from "@big-mesh-studios/maths";
import type {
  Bone,
  BoneKey,
  BoneMotion,
  BoneTrack,
  Skeleton,
} from "../skeleton/types";
import { slerp, type Transform } from "../skeleton/transform";

/** How a file is read: what to call the skeleton, and how large to draw it. */
export interface ImportOptions {
  /** The skeleton's name, defaulting to the file's own. */
  name?: string;
  /** How many units tall a humanoid skeleton is drawn, in voxel units. */
  targetHeight?: number;
  /** The rate the transport steps a frame at, which the keys do not depend on. */
  framesPerSecond?: number;
}

/** A skeleton and the motions read out of one file. */
export interface ImportedRig {
  skeleton: Skeleton;
  motions: BoneMotion[];
}

/** `name` stripped to the characters a bone name can safely carry. */
function sanitized(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]/g, "") || "bone";
}

/**
 * A node in the file mapped to the id of the bone that stands for it. Only the
 * joints themselves are bones; a node that merely carries them — an armature or
 * an empty at the root — is folded into the joint below it.
 */
function jointIds(joints: Object3D[]): Map<Object3D, string> {
  const ids = new Map<Object3D, string>();
  const used = new Map<string, number>();

  for (const joint of joints) {
    const base = sanitized(joint.name);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    ids.set(joint, seen === 0 ? base : `${base}.${seen}`);
  }

  return ids;
}

/** The joints a parsed file holds, in scene order. */
function collectJoints(gltf: GLTF): Object3D[] {
  const held: Object3D[] = [];

  gltf.scene.traverse((object) => {
    if (isBone(object)) {
      held.push(object);
    }
  });

  if (held.length > 0) {
    return held;
  }

  // A file of motion with no skin still names the nodes it moves, which is
  // enough to stand a skeleton up from.
  const seen = new Set<Object3D>();
  for (const clip of gltf.animations) {
    for (const track of clip.tracks) {
      const node = trackNode(gltf.scene, track.name);
      if (node !== undefined && !seen.has(node)) {
        seen.add(node);
        held.push(node);
      }
    }
  }

  return held;
}

/**
 * The node a track moves. A track is named for its node and the property it
 * runs — `FootL.quaternion` — and the node itself may carry a dot, so the
 * property is taken off the end and what is left is looked up by name.
 *
 * Reading the name here rather than through the renderer's own binding lookup
 * is deliberate: that lookup does not resolve the names this loader writes, and
 * every track would be dropped as naming no node.
 */
function trackNode(root: Object3D, trackName: string): Object3D | undefined {
  const name = nodeNameOf(trackName);

  return (
    root.getObjectByProperty("name", name) ??
    root.getObjectByProperty("uuid", name)
  );
}

/** The node a track's name is written for, with the property taken off the end. */
export function nodeNameOf(trackName: string): string {
  const dot = trackName.lastIndexOf(".");
  return dot === -1 ? trackName : trackName.slice(0, dot);
}

/** Whether a node is a joint rather than an ordinary object. */
function isBone(object: Object3D): boolean {
  return (object as Object3D & { isBone?: boolean }).isBone === true;
}

/** The nearest node above `joint` that is itself a joint. */
function jointParent(
  joint: Object3D,
  ids: Map<Object3D, string>,
): Object3D | undefined {
  let current = joint.parent;
  while (current !== null && current !== undefined) {
    if (ids.has(current)) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

/**
 * The transform of `child` read in the space of `parent`, both taken in the
 * world of the file, with translations scaled into voxel units. A joint whose
 * parent is another joint carries the offset between them; a root joint keeps
 * its own world transform.
 */
function localTransform(
  child: Object3D,
  parent: Object3D | undefined,
  scale: number,
): Transform {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const size = new Vector3();

  child.updateWorldMatrix(true, false);
  const matrix =
    parent === undefined
      ? child.matrixWorld
      : parent.matrixWorld.clone().invert().multiply(child.matrixWorld);
  matrix.decompose(position, quaternion, size);

  return {
    position: Vector3D.create(
      position.x * scale,
      position.y * scale,
      position.z * scale,
    ),
    rotation: {
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w,
    },
    scale: size.x,
  };
}

/** The height of the joint tree in the file's own units. */
function skeletonHeight(joints: Object3D[]): number {
  let low = Infinity;
  let high = -Infinity;
  const position = new Vector3();

  for (const joint of joints) {
    joint.updateWorldMatrix(true, false);
    position.setFromMatrixPosition(joint.matrixWorld);
    low = Math.min(low, position.y);
    high = Math.max(high, position.y);
  }

  return high > low ? high - low : 1;
}

/** The id of the joint `track` moves, or undefined for anything else. */
function trackTarget(
  track: KeyframeTrack,
  root: Object3D,
  ids: Map<Object3D, string>,
): string | undefined {
  const node = trackNode(root, track.name);
  return node === undefined ? undefined : ids.get(node);
}

/** Which part of a transform a track's values are read into. */
function propertyOf(
  track: KeyframeTrack,
): "position" | "quaternion" | "scale" | undefined {
  if (track.name.endsWith(".quaternion")) {
    return "quaternion";
  }
  if (track.name.endsWith(".position")) {
    return "position";
  }
  if (track.name.endsWith(".scale")) {
    return "scale";
  }
  return undefined;
}

/** How many numbers one key of `property` carries. */
function strideOf(property: "position" | "quaternion" | "scale"): number {
  return property === "quaternion" ? 4 : 3;
}

/** The values `track` carries at `time`, interpolated between its keys. */
export function readTrack(
  track: KeyframeTrack,
  property: "position" | "quaternion" | "scale",
  time: number,
): number[] {
  const stride = strideOf(property);
  const count = track.times.length;
  const last = count - 1;

  if (time <= track.times[0]) {
    return Array.from(track.values.slice(0, stride));
  }
  if (time >= track.times[last]) {
    return Array.from(
      track.values.slice(last * stride, last * stride + stride),
    );
  }

  let before = 0;
  for (let i = 0; i < count; i++) {
    if (track.times[i] <= time) {
      before = i;
    } else {
      break;
    }
  }
  const after = Math.min(last, before + 1);
  const span = track.times[after] - track.times[before];
  const share = span === 0 ? 0 : (time - track.times[before]) / span;

  const start = Array.from(
    track.values.slice(before * stride, before * stride + stride),
  );
  const end = Array.from(
    track.values.slice(after * stride, after * stride + stride),
  );

  if (property === "quaternion") {
    const turned = slerp(
      { x: start[0], y: start[1], z: start[2], w: start[3] },
      { x: end[0], y: end[1], z: end[2], w: end[3] },
      share,
    );
    return [turned.x, turned.y, turned.z, turned.w];
  }

  return start.map((value, index) => value + (end[index] - value) * share);
}

/** The moments every track moving one bone carries a key at, in order. */
function keyTimes(tracks: KeyframeTrack[]): number[] {
  const times: number[] = [];

  for (const track of tracks) {
    for (let i = 0; i < track.times.length; i++) {
      times.push(track.times[i]);
    }
  }

  times.sort((a, b) => a - b);
  return times.filter(
    (time, index) => index === 0 || time - times[index - 1] > 1e-4,
  );
}

/** One bone's keys, read off the tracks that move it. */
function boneTrack(
  bone: string,
  tracks: KeyframeTrack[],
  scale: number,
  rest: Transform,
): BoneTrack {
  const moving = tracks
    .map((track) => ({ track, property: propertyOf(track) }))
    .filter(
      (
        held,
      ): held is {
        track: KeyframeTrack;
        property: "position" | "quaternion" | "scale";
      } => held.property !== undefined,
    );

  const keys: BoneKey[] = keyTimes(tracks).map((at) => {
    const key: BoneKey = {
      at,
      ease: "linear",
      position: Vector3D.create(
        rest.position.x,
        rest.position.y,
        rest.position.z,
      ),
      rotation: { ...rest.rotation },
      scale: rest.scale,
    };

    for (const { track, property } of moving) {
      const values = readTrack(track, property, at);
      if (property === "quaternion") {
        key.rotation = {
          x: values[0],
          y: values[1],
          z: values[2],
          w: values[3],
        };
      } else if (property === "position") {
        key.position = Vector3D.create(
          values[0] * scale,
          values[1] * scale,
          values[2] * scale,
        );
      } else {
        key.scale = values[0];
      }
    }

    return key;
  });

  return { bone, keys };
}

/** The motions a clip's tracks make, over the joints the file carries. */
function motionsFrom(
  clips: AnimationClip[],
  root: Object3D,
  ids: Map<Object3D, string>,
  rest: Map<string, Transform>,
  scale: number,
  framesPerSecond: number,
): BoneMotion[] {
  return clips.map((clip) => {
    const byBone = new Map<string, KeyframeTrack[]>();

    for (const track of clip.tracks) {
      const bone = trackTarget(track, root, ids);
      if (bone === undefined || propertyOf(track) === undefined) {
        continue;
      }
      const held = byBone.get(bone) ?? [];
      held.push(track);
      byBone.set(bone, held);
    }

    const tracks: BoneTrack[] = [];
    for (const [bone, moving] of byBone) {
      const transform = rest.get(bone);
      if (transform === undefined) {
        continue;
      }
      tracks.push(boneTrack(bone, moving, scale, transform));
    }

    return {
      name: clip.name || "motion",
      framesPerSecond,
      loop: true,
      duration: clip.duration,
      tracks,
    };
  });
}

/**
 * Reads `data` — a `.glb` or `.gltf` — into a skeleton and the motions found
 * with it. The skeleton is drawn `targetHeight` voxels tall, so a file authored
 * in metres lands at the size a voxel figure is drawn at.
 */
export async function importGlb(
  data: ArrayBuffer,
  options: ImportOptions = {},
): Promise<ImportedRig> {
  const loader = new GLTFLoader();
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    loader.parse(data, "", resolve, reject as (event: unknown) => void);
  });

  const joints = collectJoints(gltf);
  if (joints.length === 0) {
    throw new Error("The file carries no skeleton.");
  }

  const height = skeletonHeight(joints);
  const scale = (options.targetHeight ?? 30) / height;
  const ids = jointIds(joints);
  const rest = new Map<string, Transform>();
  const bones: Bone[] = joints.map((joint) => {
    const id = ids.get(joint)!;
    const parent = jointParent(joint, ids);
    const transform = localTransform(joint, parent, scale);
    rest.set(id, transform);
    return {
      id,
      name: joint.name || id,
      parent: parent === undefined ? null : ids.get(parent)!,
      position: transform.position,
      rotation: transform.rotation,
      scale: transform.scale,
    };
  });

  const skeleton: Skeleton = {
    name: options.name ?? gltf.scene.name ?? "imported",
    bones,
  };
  const motions = motionsFrom(
    gltf.animations,
    gltf.scene,
    ids,
    rest,
    scale,
    options.framesPerSecond ?? 30,
  );

  return { skeleton, motions };
}
