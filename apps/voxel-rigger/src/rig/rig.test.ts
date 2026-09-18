import { Vector3D } from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import { boneMatching, withBinding } from "./rig";
import type { VoxelPart } from "./anchors";
import { restWorld } from "../skeleton/pose";
import { composeTransforms } from "../skeleton/transform";
import type { Skeleton } from "../skeleton/types";

const skeleton: Skeleton = {
  name: "two",
  bones: [
    {
      id: "root",
      name: "root",
      parent: null,
      position: Vector3D.create(0, 0, 0),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 1,
    },
    {
      id: "arm",
      name: "arm.left",
      parent: "root",
      position: Vector3D.create(0, 2, 0),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 1,
    },
  ],
};

/** A part that stands somewhere, with no volume behind it. */
function partAt(name: string, x: number, y: number, z: number): VoxelPart {
  return {
    name,
    part: {} as VoxelPart["part"],
    solved: {} as VoxelPart["solved"],
    anchor: {
      position: Vector3D.create(x, y, z),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 5,
    },
  };
}

describe("binding parts to bones", () => {
  it("reads the offset a part rests at from its bone", () => {
    const bindings = withBinding([], skeleton, partAt("hand", 0, 4, 0), "arm");
    expect(bindings).toHaveLength(1);
    // The arm rests at y=2, so the hand's anchor at y=4 is two above it.
    expect(bindings[0].position).toEqual({ x: 0, y: 2, z: 0 });
  });

  it("puts the part back where it rested when the bone rests", () => {
    const part = partAt("hand", 0, 4, 0);
    const bindings = withBinding([], skeleton, part, "arm");
    const bone = skeleton.bones.find((held) => held.id === "arm")!;
    const replaced = composeTransforms(restWorld(skeleton, bone), {
      position: bindings[0].position,
      rotation: bindings[0].rotation,
      scale: bindings[0].scale,
    });

    expect(replaced.position.x).toBeCloseTo(part.anchor.position.x, 6);
    expect(replaced.position.y).toBeCloseTo(part.anchor.position.y, 6);
    expect(replaced.scale).toBeCloseTo(part.anchor.scale, 6);
  });

  it("matches a part name to the bone that carries it", () => {
    expect(boneMatching(skeleton, "arm.left")).toBe("arm");
    expect(boneMatching(skeleton, "hand")).toBeUndefined();
  });
});
