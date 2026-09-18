// Binding voxel parts to bones: reading the offset a part rests at from the
// bone it hangs off, and guessing those bindings from the names both carry.
import { Vector3D } from "@big-mesh-studios/maths";
import type { VoxelPart } from "./anchors";
import { restWorld } from "../skeleton/pose";
import {
  composeTransforms,
  invertTransform,
  type Transform,
} from "../skeleton/transform";
import type { Binding, Skeleton } from "../skeleton/types";

/** A part's rest transform read in the space of the bone it hangs off. */
export function bindingFrom(anchor: Transform, bindBone: Transform): Binding {
  const local = composeTransforms(invertTransform(bindBone), anchor);
  return {
    part: "",
    bone: "",
    position: local.position,
    rotation: local.rotation,
    scale: local.scale,
  };
}

/** `bindings` with `part` hung off `bone`, replacing any binding it had. */
export function withBinding(
  bindings: Binding[],
  skeleton: Skeleton,
  part: VoxelPart,
  boneId: string,
): Binding[] {
  const bone = skeleton.bones.find((candidate) => candidate.id === boneId);
  if (bone === undefined) {
    return bindings;
  }

  const local = bindingFrom(part.anchor, restWorld(skeleton, bone));
  const binding: Binding = {
    part: part.name,
    bone: boneId,
    position: local.position,
    rotation: local.rotation,
    scale: local.scale,
  };

  return [...bindings.filter((held) => held.part !== part.name), binding];
}

/** `bindings` without any binding for `part`. */
export function withoutBinding(bindings: Binding[], part: string): Binding[] {
  return bindings.filter((binding) => binding.part !== part);
}

/** `bindings` with one replaced, matched by the part it hangs off, if it is held. */
export function withMovedBinding(
  bindings: Binding[],
  part: string,
  move: (binding: Binding) => Binding,
): Binding[] {
  return bindings.map((binding) =>
    binding.part === part ? move(binding) : binding,
  );
}

/** The binding holding `part`, or undefined for a part nothing binds. */
export function bindingFor(
  bindings: Binding[],
  part: string,
): Binding | undefined {
  return bindings.find((binding) => binding.part === part);
}

/** A name stripped to the letters and digits two names can be compared on. */
function normalized(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The bone whose name best matches `part`: the longest bone name that appears
 * whole in the part name, or that the part name appears whole in. Undefined
 * where no name contains another.
 */
export function boneMatching(
  skeleton: Skeleton,
  part: string,
): string | undefined {
  const wanted = normalized(part);
  let best: { id: string; length: number } | undefined;

  for (const bone of skeleton.bones) {
    const candidate = normalized(bone.name);
    const matches = wanted.includes(candidate) || candidate.includes(wanted);
    if (!matches) {
      continue;
    }
    if (best === undefined || candidate.length > best.length) {
      best = { id: bone.id, length: candidate.length };
    }
  }

  return best?.id;
}

/**
 * A first guess at the bindings for `parts`: each part hung off the bone whose
 * name it carries, or left unbound where no bone name matches.
 */
export function guessBindings(
  parts: VoxelPart[],
  skeleton: Skeleton,
): Binding[] {
  let bindings: Binding[] = [];

  for (const part of parts) {
    const boneId = boneMatching(skeleton, part.name);
    if (boneId === undefined) {
      continue;
    }
    bindings = withBinding(bindings, skeleton, part, boneId);
  }

  return bindings;
}

/** A binding's transform, copied for a caller that means to keep it. */
export function bindingTransform(binding: Binding): Transform {
  return {
    position: Vector3D.create(
      binding.position.x,
      binding.position.y,
      binding.position.z,
    ),
    rotation: { ...binding.rotation },
    scale: binding.scale,
  };
}
