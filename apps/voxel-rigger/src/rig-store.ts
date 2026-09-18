// The rig an editor holds: the skeleton being drawn, the voxel parts hung off
// it, the motions that move it, and the transport playing them. State is a
// factory returning signals and the methods that write them, so every view
// reads the same rig through context rather than owning a copy of it.
import { Vector3D } from "@big-mesh-studios/maths";
import { createMemo, createSignal } from "solid-js";
import type { Figure } from "@big-mesh-studios/stacker/renderer";
import { figureParts, type VoxelPart } from "./rig/anchors";
import type { Project } from "./file/project";
import { defaultSkeleton } from "./rig/default-skeleton";
import { DEFAULT_PALETTE } from "./rig/palette";
import {
  guessBindings,
  withBinding,
  withMovedBinding,
  withoutBinding,
} from "./rig/rig";
import {
  findBone,
  poseSkeleton,
  restTransform,
  restWorld,
  withBone,
  withBoneTransform,
  withKey,
  withParent,
  withoutBone,
  withoutKeysAt,
} from "./skeleton/pose";
import {
  composeTransforms,
  identityTransform,
  invertTransform,
  quaternionFromEuler,
} from "./skeleton/transform";
import type { Binding, Bone, BoneMotion, Skeleton } from "./skeleton/types";
import type { RGBA } from "@big-mesh-studios/maths";

/** What the pointer does in the viewport. */
export type Mode = "orbit" | "draw" | "bone" | "part";

/** Everything undo and redo hands back. */
interface Snapshot {
  skeleton: Skeleton;
  parts: VoxelPart[];
  palette: RGBA[];
  bindings: Binding[];
  motions: BoneMotion[];
}

/** How much of a turn a nudged bone takes, in radians. */
const NUDGE = Math.PI / 36;

export function createRig() {
  const [skeleton, setSkeleton] = createSignal<Skeleton>(defaultSkeleton());
  const [parts, setParts] = createSignal<VoxelPart[]>([]);
  const [palette, setPalette] = createSignal<RGBA[]>(DEFAULT_PALETTE);
  const [bindings, setBindings] = createSignal<Binding[]>([]);
  const [motions, setMotions] = createSignal<BoneMotion[]>([]);
  const [motionName, setMotionName] = createSignal<string | null>(null);
  const [time, setTime] = createSignal(0);
  const [playing, setPlaying] = createSignal(false);
  const [selectedBone, setSelectedBone] = createSignal<string | null>("hips");
  const [selectedPart, setSelectedPart] = createSignal<string | null>(null);
  const [mode, setMode] = createSignal<Mode>("orbit");
  const [status, setStatus] = createSignal("Draw a skeleton or import one.");
  const [frameToken, setFrameToken] = createSignal(0);

  const motion = createMemo(
    () => motions().find((held) => held.name === motionName()) ?? undefined,
  );
  const duration = createMemo(() => motion()?.duration ?? 0);
  /** Where every bone stands at the current moment, in its parent's space. */
  const posed = createMemo(() => poseSkeleton(skeleton(), motion(), time()));

  const undoStack: Snapshot[] = [];
  const redoStack: Snapshot[] = [];
  const [undoDepth, setUndoDepth] = createSignal(0);
  const [redoDepth, setRedoDepth] = createSignal(0);

  function snapshot(): Snapshot {
    return {
      skeleton: skeleton(),
      parts: parts(),
      palette: palette(),
      bindings: bindings(),
      motions: motions(),
    };
  }

  function restore(held: Snapshot): void {
    setSkeleton(held.skeleton);
    setParts(held.parts);
    setPalette(held.palette);
    setBindings(held.bindings);
    setMotions(held.motions);
  }

  /** Records the rig as it stands, before a change is made to it. */
  function commit(): void {
    undoStack.push(snapshot());
    redoStack.length = 0;
    setUndoDepth(undoStack.length);
    setRedoDepth(0);
  }

  function undo(): void {
    const previous = undoStack.pop();
    if (previous === undefined) {
      return;
    }
    redoStack.push(snapshot());
    restore(previous);
    setUndoDepth(undoStack.length);
    setRedoDepth(redoStack.length);
  }

  function redo(): void {
    const next = redoStack.pop();
    if (next === undefined) {
      return;
    }
    undoStack.push(snapshot());
    restore(next);
    setUndoDepth(undoStack.length);
    setRedoDepth(redoStack.length);
  }

  let boneCounter = 0;

  /** A name no bone of `skeleton` carries yet. */
  function freshBoneName(prefix: string): string {
    boneCounter += 1;
    return `${prefix}.${boneCounter}`;
  }

  /**
   * A bone placed at `point`, which is read in the space of `parent` so a joint
   * dropped on a turned limb hangs where it was dropped.
   */
  function addBoneAt(parentId: string | null, point: Vector3D): string {
    commit();
    const parent =
      parentId === null ? undefined : findBone(skeleton(), parentId);
    const name = freshBoneName(parent?.name ?? "bone");
    const id = name;

    const local =
      parent === undefined
        ? {
            position: Vector3D.create(point.x, point.y, point.z),
            rotation: identityTransform().rotation,
            scale: 1,
          }
        : (() => {
            const worldToParent = invertTransform(
              restWorld(skeleton(), parent),
            );
            const local = composeTransforms(worldToParent, {
              position: Vector3D.create(point.x, point.y, point.z),
              rotation: identityTransform().rotation,
              scale: 1,
            });
            return {
              position: local.position,
              rotation: local.rotation,
              scale: local.scale,
            };
          })();

    const created: Bone = {
      id,
      name,
      parent: parentId,
      position: local.position,
      rotation: local.rotation,
      scale: local.scale,
    };

    setSkeleton((held) => withBone(held, created));
    setSelectedBone(id);
    setStatus(`Added ${name}.`);
    return id;
  }

  /**
   * Puts a bone where an edit carries it. With a motion in hand the edit lands
   * on that motion as a key at the current moment, so posing writes the
   * animation; with none it lands on the bone's rest as it was drawn.
   */
  function applyBoneEdit(
    id: string,
    position: Vector3D,
    rotation: { x: number; y: number; z: number; w: number },
    scale: number,
  ): void {
    const current = motion();
    if (current !== undefined) {
      const next = withKey(current, id, {
        at: time(),
        ease: "linear",
        position: Vector3D.create(position.x, position.y, position.z),
        rotation: { ...rotation },
        scale,
      });
      setMotions((list) =>
        list.map((held) => (held.name === next.name ? next : held)),
      );
      return;
    }

    setSkeleton((held) =>
      withBoneTransform(held, id, { position, rotation, scale }),
    );
  }

  function moveBone(id: string, position: Vector3D): void {
    const bone = findBone(skeleton(), id);
    if (bone === undefined) {
      return;
    }
    applyBoneEdit(id, position, bone.rotation, bone.scale);
  }

  function turnBone(id: string, rotation: Vector3D): void {
    const bone = findBone(skeleton(), id);
    if (bone === undefined) {
      return;
    }
    applyBoneEdit(id, bone.position, quaternionFromEuler(rotation), bone.scale);
  }

  function scaleBone(id: string, scale: number): void {
    const bone = findBone(skeleton(), id);
    if (bone === undefined) {
      return;
    }
    applyBoneEdit(id, bone.position, bone.rotation, Math.max(0.01, scale));
  }

  function nudgeBone(id: string, delta: Vector3D): void {
    const bone = findBone(skeleton(), id);
    if (bone === undefined) {
      return;
    }
    moveBone(id, Vector3D.add(bone.position, delta));
  }

  function nudgeTurn(id: string, delta: Vector3D): void {
    const bone = findBone(skeleton(), id);
    if (bone === undefined) {
      return;
    }
    const turn = quaternionToEuler(bone.rotation);
    turnBone(id, Vector3D.add(turn, delta));
  }

  function renameBone(id: string, name: string): void {
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    commit();
    setSkeleton((held) => ({
      ...held,
      bones: held.bones.map((bone) =>
        bone.id === id ? { ...bone, name: trimmed } : bone,
      ),
    }));
  }

  function deleteBone(id: string): void {
    commit();
    setSkeleton((held) => withoutBone(held, id));
    setBindings((held) => held.filter((binding) => binding.bone !== id));
    setMotions((held) =>
      held.map((motion) => ({
        ...motion,
        tracks: motion.tracks.filter((track) => track.bone !== id),
      })),
    );
    if (selectedBone() === id) {
      setSelectedBone(null);
    }
    setStatus("Deleted bone.");
  }

  function reparentBone(id: string, parent: string | null): void {
    commit();
    setSkeleton((held) => withParent(held, id, parent));
  }

  /** Hangs every part off the bone whose name it carries, where one matches. */
  function autoBind(): void {
    commit();
    setBindings(guessBindings(parts(), skeleton()));
    setStatus("Guessed bindings from part and bone names.");
  }

  /** Makes the plain humanoid skeleton the rig, keeping the parts. */
  function useDefaultSkeleton(): void {
    commit();
    const fresh = defaultSkeleton();
    setSkeleton(fresh);
    setSelectedBone(fresh.bones[0]?.id ?? null);
    setBindings(guessBindings(parts(), fresh));
    setFrameToken((held) => held + 1);
    setStatus("Reset to the humanoid skeleton.");
  }

  /** Empties the skeleton, leaving a rig with nothing to hang parts off. */
  function clearSkeleton(): void {
    commit();
    setSkeleton({ name: "empty", bones: [] });
    setBindings([]);
    setSelectedBone(null);
    setStatus("Cleared the skeleton.");
  }

  function loadFigure(figure: Figure): void {
    commit();
    const loaded = figureParts(figure);
    setParts(loaded);
    setPalette(figure.palette);
    setBindings((held) => guessBindings(loaded, skeleton()));
    setFrameToken((held) => held + 1);
    setStatus(`Loaded ${loaded.length} part(s).`);
  }

  function bindPart(partName: string, boneId: string): void {
    const part = parts().find((held) => held.name === partName);
    if (part === undefined) {
      return;
    }
    commit();
    setBindings((held) => withBinding(held, skeleton(), part, boneId));
    setStatus(`Bound ${partName}.`);
  }

  function unbindPart(partName: string): void {
    commit();
    setBindings((held) => withoutBinding(held, partName));
  }

  function moveBinding(partName: string, position: Vector3D): void {
    setBindings((held) =>
      withMovedBinding(held, partName, (binding) => ({ ...binding, position })),
    );
  }

  function turnBinding(partName: string, rotation: Vector3D): void {
    setBindings((held) =>
      withMovedBinding(held, partName, (binding) => ({
        ...binding,
        rotation: quaternionFromEuler(rotation),
      })),
    );
  }

  /** Makes `imported` the rig's skeleton and motions, and guesses the bindings. */
  function importRig(imported: Skeleton, importedMotions: BoneMotion[]): void {
    commit();
    const chosen = preferredMotion(importedMotions);
    setSkeleton(imported);
    setMotions(importedMotions);
    setMotionName(chosen?.name ?? null);
    setTime(0);
    // A file of several clips lands ready to watch: the walk or jump is picked
    // out and set playing, rather than whatever happened to be listed first.
    setPlaying(chosen !== undefined);
    setSelectedBone(imported.bones[0]?.id ?? null);
    setBindings((held) => guessBindings(parts(), imported));
    setFrameToken((held) => held + 1);
    setStatus(
      chosen === undefined
        ? `Imported ${imported.bones.length} bone(s), no motions.`
        : `Imported ${imported.bones.length} bone(s). Playing “${chosen.name}”.`,
    );
  }

  /** Makes a saved project the rig held now. */
  function restoreProject(project: Project): void {
    commit();
    const loaded = figureParts(project.figure);
    setParts(loaded);
    setPalette(project.figure.palette);
    setSkeleton(project.skeleton);
    setBindings(project.bindings);
    setMotions(project.motions);
    setMotionName(project.motions[0]?.name ?? null);
    setTime(0);
    setPlaying(false);
    setSelectedBone(project.skeleton.bones[0]?.id ?? null);
    setFrameToken((held) => held + 1);
    setStatus("Opened project.");
  }

  /**
   * Writes every bone's current rest transform into the selected motion as a
   * key at the current moment. The skeleton is posed where it is edited, so
   * posing it and keying is how a motion of one's own is built up.
   */
  function keyPose(): void {
    const now = time();
    const current = motion();
    const held = skeleton();
    let next: BoneMotion = current ?? {
      name: "motion-1",
      framesPerSecond: 24,
      loop: true,
      duration: 0,
      tracks: [],
    };

    for (const bone of held.bones) {
      const transform = restTransform(bone);
      next = withKey(next, bone.id, {
        at: now,
        ease: "linear",
        position: transform.position,
        rotation: transform.rotation,
        scale: transform.scale,
      });
    }

    commit();
    if (current === undefined) {
      setMotions((list) => [...list, next]);
      setMotionName(next.name);
    } else {
      setMotions((list) =>
        list.map((motion) => (motion.name === next.name ? next : motion)),
      );
    }
    setStatus(`Keyed the pose at ${now.toFixed(2)}s.`);
  }

  /** Removes every key standing at the current moment from the selected motion. */
  function clearKey(): void {
    const current = motion();
    if (current === undefined) {
      return;
    }
    commit();
    const next = withoutKeysAt(current, time());
    setMotions((list) =>
      list.map((motion) => (motion.name === next.name ? next : motion)),
    );
    setStatus(`Cleared keys at ${time().toFixed(2)}s.`);
  }

  function addMotion(imported: BoneMotion): void {
    commit();
    setMotions((held) => [
      ...held.filter((motion) => motion.name !== imported.name),
      imported,
    ]);
    setMotionName(imported.name);
    setTime(0);
    setPlaying(false);
  }

  function selectMotion(name: string | null): void {
    setMotionName(name);
    setTime(0);
    setPlaying(false);
  }

  function advance(delta: number): void {
    const current = motion();
    if (!playing() || current === undefined || current.duration <= 0) {
      return;
    }
    let next = time() + delta;
    if (current.loop) {
      next %= current.duration;
    } else if (next >= current.duration) {
      next = current.duration;
      setPlaying(false);
    }
    setTime(next);
  }

  function stepFrame(delta: number): void {
    const current = motion();
    const fps = current?.framesPerSecond ?? 12;
    const span = current?.duration ?? 0;
    let next = time() + delta / fps;
    if (span > 0) {
      next = Math.min(span, Math.max(0, next));
    } else {
      next = Math.max(0, next);
    }
    setTime(next);
  }

  return {
    skeleton,
    parts,
    palette,
    bindings,
    motions,
    motion,
    motionName,
    duration,
    time,
    playing,
    posed,
    selectedBone,
    selectedPart,
    mode,
    status,
    frameToken,
    requestFrame: () => setFrameToken((held) => held + 1),
    undoDepth,
    redoDepth,
    canUndo: createMemo(() => undoDepth() > 0),
    canRedo: createMemo(() => redoDepth() > 0),
    setMode,
    setStatus,
    setTime,
    setPlaying,
    setSelectedBone,
    setSelectedPart,
    addBoneAt,
    moveBone,
    turnBone,
    scaleBone,
    nudgeBone,
    nudgeTurn,
    renameBone,
    deleteBone,
    reparentBone,
    loadFigure,
    autoBind,
    useDefaultSkeleton,
    clearSkeleton,
    bindPart,
    unbindPart,
    moveBinding,
    turnBinding,
    importRig,
    restoreProject,
    keyPose,
    clearKey,
    addMotion,
    selectMotion,
    advance,
    stepFrame,
    undo,
    redo,
    commit,
    nudgeStep: NUDGE,
  };
}

/**
 * The motion to play first out of a file: one whose name walks, jumps or runs,
 * which is what someone importing a character wants to see; otherwise the one
 * listed first.
 */
function preferredMotion(motions: BoneMotion[]): BoneMotion | undefined {
  for (const wanted of ["walk", "jump", "run", "idle"]) {
    const match = motions.find((motion) =>
      motion.name.toLowerCase().includes(wanted),
    );
    if (match !== undefined) {
      return match;
    }
  }

  return motions[0];
}

/**
 * The three angles a quaternion turns by. The same order the models are posed
 * in, so a bone nudged in the viewport and a part posed in the editor read
 * their turns the same way.
 */
function quaternionToEuler(rotation: {
  x: number;
  y: number;
  z: number;
  w: number;
}): Vector3D {
  const { x, y, z, w } = rotation;
  const m00 = 1 - 2 * (y * y + z * z);
  const m01 = 2 * (x * y - z * w);
  const m02 = 2 * (x * z + y * w);
  const m11 = 1 - 2 * (x * x + z * z);
  const m12 = 2 * (y * z - x * w);
  const m22 = 1 - 2 * (x * x + y * y);
  const m21 = 2 * (y * z + x * w);

  const upright = Math.min(1, Math.max(-1, m02));
  const out = Vector3D.create();
  out.y = Math.asin(upright);
  if (Math.abs(upright) < 0.9999999) {
    out.x = Math.atan2(-m12, m22);
    out.z = Math.atan2(-m01, m00);
  } else {
    out.x = Math.atan2(m21, m11);
  }
  return out;
}
