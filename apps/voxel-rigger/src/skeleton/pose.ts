// Reading a pose off a skeleton: where every bone rests, where a motion carries
// it at a moment, and how a change to the bone tree is made.
import { Vector3D } from "@big-mesh-studios/maths";
import {
  cloneTransform,
  composeTransforms,
  identityTransform,
  slerp,
  type Transform,
} from "./transform";
import type {
  Bone,
  BoneKey,
  BoneMotion,
  BoneTrack,
  Ease,
  Skeleton,
} from "./types";

/** The bone called `id`, or undefined for a skeleton that has none. */
export function findBone(skeleton: Skeleton, id: string): Bone | undefined {
  return skeleton.bones.find((bone) => bone.id === id);
}

/** The bone called `name`, or undefined for a skeleton that has none. */
export function findBoneByName(
  skeleton: Skeleton,
  name: string,
): Bone | undefined {
  return skeleton.bones.find((bone) => bone.name === name);
}

/** How a bone stands at rest, in its parent's space. */
export function restTransform(bone: Bone): Transform {
  return {
    position: Vector3D.create(
      bone.position.x,
      bone.position.y,
      bone.position.z,
    ),
    rotation: { ...bone.rotation },
    scale: bone.scale,
  };
}

/**
 * Where `bone` rests in the skeleton, its own rest carried by every bone above
 * it. A parent naming a bone the skeleton does not hold, and a cycle of
 * parents, both end the walk, so a tree that is not one still places a bone.
 */
export function restWorld(skeleton: Skeleton, bone: Bone): Transform {
  const chain: Bone[] = [];
  const seen = new Set<string>();
  let current: Bone | undefined = bone;

  while (current !== undefined && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);
    const parent: string | null = current.parent;
    current = parent === null ? undefined : findBone(skeleton, parent);
  }

  let world = identityTransform();

  for (const node of chain.reverse()) {
    world = composeTransforms(world, restTransform(node));
  }

  return world;
}

/** How far along the run from one key to the next a pose stands. */
function eased(ease: Ease, share: number): number {
  switch (ease) {
    case "hold":
      return 0;
    case "in":
      return share * share;
    case "out":
      return share * (2 - share);
    case "in-out":
      return share * share * (3 - 2 * share);
    default:
      return share;
  }
}

/** The transform the key before `time` carries, and the one after it. */
function surrounding(
  track: BoneTrack,
  time: number,
): { before: BoneKey; after?: BoneKey } | undefined {
  const keys = track.keys;
  if (keys.length === 0) {
    return undefined;
  }

  let before = keys[0];
  for (const key of keys) {
    if (key.at <= time) {
      before = key;
    } else {
      return { before, after: key };
    }
  }

  return { before };
}

/** Where `track` carries its bone at `time`, or undefined for a track with no keys. */
export function sampleTrack(
  track: BoneTrack,
  time: number,
  out: Transform = identityTransform(),
): Transform | undefined {
  const pair = surrounding(track, time);
  if (pair === undefined) {
    return undefined;
  }

  const { before, after } = pair;

  if (after === undefined || after.at === before.at) {
    out.position = Vector3D.create(
      before.position.x,
      before.position.y,
      before.position.z,
    );
    out.rotation = { ...before.rotation };
    out.scale = before.scale;
    return out;
  }

  const share = eased(before.ease, (time - before.at) / (after.at - before.at));

  out.position.x =
    before.position.x + (after.position.x - before.position.x) * share;
  out.position.y =
    before.position.y + (after.position.y - before.position.y) * share;
  out.position.z =
    before.position.z + (after.position.z - before.position.z) * share;
  out.scale = before.scale + (after.scale - before.scale) * share;
  slerp(before.rotation, after.rotation, share, out.rotation);
  return out;
}

/**
 * The transform every bone of `skeleton` stands at, in its parent's space, at
 * `time` seconds into `motion`. A bone the motion does not name rests as it was
 * drawn.
 */
export function poseSkeleton(
  skeleton: Skeleton,
  motion: BoneMotion | undefined,
  time: number,
): Map<string, Transform> {
  const posed = new Map<string, Transform>();

  for (const bone of skeleton.bones) {
    posed.set(bone.id, restTransform(bone));
  }

  if (motion === undefined) {
    return posed;
  }

  for (const track of motion.tracks) {
    const transform = sampleTrack(track, time);
    if (transform !== undefined && posed.has(track.bone)) {
      posed.set(track.bone, transform);
    }
  }

  return posed;
}

/**
 * Where every bone stands in the skeleton, in the skeleton's own space, at
 * `time` seconds into `motion`. A bone's parent is looked up by id, so a bone
 * whose parent is missing starts a chain of its own.
 */
export function posedWorld(
  skeleton: Skeleton,
  motion: BoneMotion | undefined,
  time: number,
): Map<string, Transform> {
  const local = poseSkeleton(skeleton, motion, time);
  const world = new Map<string, Transform>();

  const walk = (
    bone: Bone,
    seen: Set<string>,
    out: Map<string, Transform>,
  ): Transform => {
    const held = out.get(bone.id);
    if (held !== undefined) {
      return held;
    }

    const own = local.get(bone.id) ?? restTransform(bone);
    const parent =
      bone.parent === null ? undefined : findBone(skeleton, bone.parent);

    // A parent that is itself or a bone already walked would recurse forever, so
    // the walk stops and the bone is placed as if it had no parent at all.
    if (parent === undefined || seen.has(bone.id)) {
      out.set(bone.id, own);
      return own;
    }

    seen.add(bone.id);
    const parentWorld = walk(parent, seen, out);
    const composed = composeTransforms(parentWorld, own);
    out.set(bone.id, composed);
    return composed;
  };

  for (const bone of skeleton.bones) {
    walk(bone, new Set(), world);
  }

  return world;
}

/**
 * A copy of `skeleton` with `bone` added, or the same skeleton where a bone of
 * that id is already held.
 */
export function withBone(skeleton: Skeleton, bone: Bone): Skeleton {
  if (findBone(skeleton, bone.id) !== undefined) {
    return skeleton;
  }
  return { ...skeleton, bones: [...skeleton.bones, bone] };
}

/** Every bone that hangs off `root`, `root` itself included. */
export function subtree(skeleton: Skeleton, root: string): Set<string> {
  const held = new Set<string>([root]);
  let grew = true;

  while (grew) {
    grew = false;
    for (const bone of skeleton.bones) {
      if (bone.parent !== null && held.has(bone.parent) && !held.has(bone.id)) {
        held.add(bone.id);
        grew = true;
      }
    }
  }

  return held;
}

/** A copy of `skeleton` without `id` or anything hanging off it. */
export function withoutBone(skeleton: Skeleton, id: string): Skeleton {
  const gone = subtree(skeleton, id);
  return {
    ...skeleton,
    bones: skeleton.bones.filter((bone) => !gone.has(bone.id)),
  };
}

/**
 * A copy of `skeleton` with `id` hung off `parent`. A parent that would make
 * the tree a cycle, or that the skeleton does not hold, leaves the skeleton as
 * it was.
 */
export function withParent(
  skeleton: Skeleton,
  id: string,
  parent: string | null,
): Skeleton {
  if (parent !== null && findBone(skeleton, parent) === undefined) {
    return skeleton;
  }

  if (parent !== null && subtree(skeleton, id).has(parent)) {
    return skeleton;
  }

  return {
    ...skeleton,
    bones: skeleton.bones.map((bone) =>
      bone.id === id ? { ...bone, parent } : bone,
    ),
  };
}

/** A copy of `skeleton` with `id`'s rest transform replaced. */
export function withBoneTransform(
  skeleton: Skeleton,
  id: string,
  transform: Transform,
): Skeleton {
  return {
    ...skeleton,
    bones: skeleton.bones.map((bone) =>
      bone.id === id
        ? {
            ...bone,
            position: Vector3D.create(
              transform.position.x,
              transform.position.y,
              transform.position.z,
            ),
            rotation: { ...transform.rotation },
            scale: transform.scale,
          }
        : bone,
    ),
  };
}

/** A copy of `bone` sharing none of its vectors. */
export function cloneBone(bone: Bone): Bone {
  const transform = cloneTransform(restTransform(bone));
  return {
    ...bone,
    position: transform.position,
    rotation: transform.rotation,
    scale: transform.scale,
  };
}

/** The moment the last key of `motion` stands at. */
export function motionDuration(motion: BoneMotion): number {
  let last = 0;
  for (const track of motion.tracks) {
    for (const key of track.keys) {
      last = Math.max(last, key.at);
    }
  }
  return last;
}

/** The first track moving `bone`, or undefined for a motion that does not. */
export function trackFor(
  motion: BoneMotion,
  bone: string,
): BoneTrack | undefined {
  return motion.tracks.find((track) => track.bone === bone);
}

/** The tracks of `motion` with `bone`'s replaced, the keys kept in order. */
function withTrack(
  motion: BoneMotion,
  bone: string,
  keys: BoneKey[],
): BoneMotion {
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  const tracks = motion.tracks.some((track) => track.bone === bone)
    ? motion.tracks.map((track) =>
        track.bone === bone ? { bone, keys: sorted } : track,
      )
    : [...motion.tracks, { bone, keys: sorted }];

  return { ...motion, tracks, duration: motionDuration({ ...motion, tracks }) };
}

/**
 * `motion` with `key` standing at its own moment on `bone`, replacing any key
 * already standing there.
 */
export function withKey(
  motion: BoneMotion,
  bone: string,
  key: BoneKey,
): BoneMotion {
  const track = trackFor(motion, bone);
  const keys = (track?.keys ?? []).filter(
    (held) => Math.abs(held.at - key.at) > 1e-3,
  );
  keys.push(key);
  return withTrack(motion, bone, keys);
}

/** `motion` without any key standing at `time`, within a thousandth of a second. */
export function withoutKeysAt(motion: BoneMotion, time: number): BoneMotion {
  const tracks = motion.tracks
    .map((track) => ({
      bone: track.bone,
      keys: track.keys.filter((key) => Math.abs(key.at - time) > 1e-3),
    }))
    .filter((track) => track.keys.length > 0);

  return { ...motion, tracks, duration: motionDuration({ ...motion, tracks }) };
}
