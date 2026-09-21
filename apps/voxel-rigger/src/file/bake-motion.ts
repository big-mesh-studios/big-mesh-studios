// Turning a rig's motion into the motion format a voxel model carries, so a
// figure animated here can be played in a world that only knows the model zip.
// A rig moves bones and hangs parts off them; a model motion moves parts
// directly. Baking samples every bone at each key of the motion, reads the
// world transform of each bound part from its bone, and writes that part's
// local pose as a key — so playing the baked motion poses the parts exactly
// where the rig did.
import { Matrix3x3, Vector3D, type Quaternion } from "@big-mesh-studios/maths";
import {
  composePose,
  partDimensions,
  turnAngles,
  turnMatrix,
  type Figure,
  type Key,
  type Motion,
  type PartKeys,
} from "@big-mesh-studios/stacker/renderer";
import { saveFigure } from "@big-mesh-studios/stacker/format";
import { bindingTransform } from "../rig/rig";
import { posedWorld } from "../skeleton/pose";
import { composeTransforms, identityTransform } from "../skeleton/transform";
import type { Binding, BoneMotion, Skeleton } from "../skeleton/types";

/**
 * `figure` with every part's hierarchy folded into its own transform, so each
 * part stands parentless where it stood. Baking needs this: a model motion
 * moves parts directly, and a part still hanging off another would be carried
 * by it as well as by the key.
 */
export function flattenFigure(figure: Figure): Figure {
  return {
    ...figure,
    parts: figure.parts.map((part) => {
      const pose = composePose(figure, part);
      return {
        ...part,
        root: Vector3D.create(pose.at.x, pose.at.y, pose.at.z),
        turn: turnAngles(pose.turn),
        scale: pose.scale,
        parent: null,
      };
    }),
  };
}

/** The turn a quaternion describes, as the column-major matrix a part's turn is read from. */
function matrix3FromQuaternion(rotation: Quaternion): Matrix3x3 {
  const { x, y, z, w } = rotation;
  const matrix = Matrix3x3.create();

  matrix[0] = 1 - 2 * (y * y + z * z);
  matrix[1] = 2 * (x * y + z * w);
  matrix[2] = 2 * (x * z - y * w);
  matrix[3] = 2 * (x * y - z * w);
  matrix[4] = 1 - 2 * (x * x + z * z);
  matrix[5] = 2 * (y * z + x * w);
  matrix[6] = 2 * (x * z + y * w);
  matrix[7] = 2 * (y * z - x * w);
  matrix[8] = 1 - 2 * (x * x + y * y);

  return matrix;
}

/**
 * Every moment a key of `motion` stands at, in seconds, with the start of the
 * run, so the baked motion has a key wherever the rig changed.
 */
function keyMoments(motion: BoneMotion): number[] {
  const moments = new Set<number>([0]);
  for (const track of motion.tracks) {
    for (const key of track.keys) {
      moments.add(key.at);
    }
  }
  return [...moments].sort((a, b) => a - b);
}

/**
 * `motion` baked into the model motion that plays the same poses on `figure`.
 *
 * Each part bound to a bone gets a key at every moment the rig had one,
 * standing where that bone carried the part then. The part's own rest is
 * ignored between keys and read fresh at each, because the figure has been
 * flattened: what a key says is the part's whole pose, not an offset from its
 * rest.
 *
 * @param figure The model the parts belong to. Its hierarchy is flattened, so
 * the figure passed to `writeAnimatedModel` is the one that must be saved.
 */
export function bakeMotion(
  figure: Figure,
  skeleton: Skeleton,
  bindings: Binding[],
  motion: BoneMotion,
): Motion {
  const flattened = flattenFigure(figure);
  const framesPerSecond =
    motion.framesPerSecond > 0 ? motion.framesPerSecond : 12;
  const moments = keyMoments(motion);
  const worlds = moments.map((time) => posedWorld(skeleton, motion, time));

  const parts: PartKeys[] = [];
  for (const part of flattened.parts) {
    const binding = bindings.find((held) => held.part === part.name);
    if (binding === undefined) {
      continue;
    }
    const dimensions = partDimensions(part);
    const longest = Math.max(
      dimensions.width,
      dimensions.height,
      dimensions.depth,
    );
    const middle = Vector3D.create(
      dimensions.width / 2 - part.pivot.x,
      dimensions.height / 2 - part.pivot.y,
      dimensions.depth / 2 - part.pivot.z,
    );
    const keys: Key[] = [];
    moments.forEach((time, index) => {
      const bone = worlds[index].get(binding.bone) ?? identityTransform();
      const placement = composeTransforms(bone, bindingTransform(binding));
      const turn = turnAngles(matrix3FromQuaternion(placement.rotation));
      const scale = longest > 0 ? placement.scale / longest : placement.scale;
      const carried = Matrix3x3.transform(
        turnMatrix(turn),
        Vector3D.multiplyScalar(middle, scale),
      );
      keys.push({
        at: Math.round(time * framesPerSecond),
        ease: "linear",
        root: Vector3D.create(
          placement.position.x - carried.x,
          placement.position.y - carried.y,
          placement.position.z - carried.z,
        ),
        turn,
        scale,
      });
    });
    parts.push({ part: part.name, keys });
  }

  return {
    name: motion.name,
    framesPerSecond,
    loop: motion.loop,
    parts,
  };
}

/**
 * `figure` written as a model zip carrying `motion` baked for it, so the world
 * a script draws it in can play it. The figure that is written is the flattened
 * one baking produced, which is the figure the motion's keys pose.
 */
export async function writeAnimatedModel(
  figure: Figure,
  skeleton: Skeleton,
  bindings: Binding[],
  motion: BoneMotion,
): Promise<Blob> {
  const flattened = flattenFigure(figure);
  return saveFigure(flattened, [
    bakeMotion(figure, skeleton, bindings, motion),
  ]);
}
