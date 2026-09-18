import { Matrix3x3, Vector3D } from "@big-mesh-studios/maths";
import { describe, expect, it } from "vitest";
import {
  poseSkeleton,
  posedWorld,
  withKey,
  withParent,
  withoutKeysAt,
} from "./pose";
import {
  composeTransforms,
  identityTransform,
  invertTransform,
  quaternionFromEuler,
  quaternionFromMatrix3,
  slerp,
  type Transform,
} from "./transform";
import type { BoneMotion, Skeleton } from "./types";

const at = (x: number, y: number, z: number): Transform => ({
  position: Vector3D.create(x, y, z),
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: 1,
});

describe("transforms", () => {
  it("carries a child by its parent's translation", () => {
    const world = composeTransforms(at(0, 1, 0), at(1, 0, 0));
    expect(world.position).toEqual({ x: 1, y: 1, z: 0 });
  });

  it("turns a child's offset with its parent's rotation", () => {
    const parent: Transform = {
      position: Vector3D.create(0, 0, 0),
      rotation: quaternionFromEuler(Vector3D.create(0, 0, Math.PI / 2)),
      scale: 1,
    };
    const world = composeTransforms(parent, at(1, 0, 0));
    expect(world.position.x).toBeCloseTo(0, 6);
    expect(world.position.y).toBeCloseTo(1, 6);
  });

  it("scales a child's offset by its parent's uniform scale", () => {
    const parent = { ...at(0, 0, 0), scale: 2 };
    const world = composeTransforms(parent, at(1, 0, 0));
    expect(world.position.x).toBeCloseTo(2, 6);
    expect(world.scale).toBe(2);
  });

  it("undoes itself when inverted", () => {
    const transform: Transform = {
      position: Vector3D.create(3, -2, 5),
      rotation: quaternionFromEuler(Vector3D.create(0.3, -0.7, 1.1)),
      scale: 2.5,
    };
    const round = composeTransforms(invertTransform(transform), transform);
    expect(round.position.x).toBeCloseTo(0, 5);
    expect(round.position.y).toBeCloseTo(0, 5);
    expect(round.position.z).toBeCloseTo(0, 5);
    expect(round.scale).toBeCloseTo(1, 6);
  });

  it("takes the short way round between a rotation and its reverse", () => {
    const from = quaternionFromEuler(Vector3D.create(0, 0, 0));
    const to = quaternionFromEuler(Vector3D.create(0, 0, 0.2));
    const negated = { x: -to.x, y: -to.y, z: -to.z, w: -to.w };
    const half = slerp(from, negated, 0.5);
    expect(half.z).toBeCloseTo(Math.sin(0.1 / 2), 5);
  });

  it("reads the same turn off a matrix that it builds from angles", () => {
    const turn = Vector3D.create(0.4, -0.9, 0.25);
    const matrix = Matrix3x3.multiply(
      Matrix3x3.multiply(
        Matrix3x3.rotationX(turn.x),
        Matrix3x3.rotationY(turn.y),
      ),
      Matrix3x3.rotationZ(turn.z),
    );
    const read = quaternionFromMatrix3(matrix);
    const built = quaternionFromEuler(turn);

    expect(read.x).toBeCloseTo(built.x, 5);
    expect(read.y).toBeCloseTo(built.y, 5);
    expect(read.z).toBeCloseTo(built.z, 5);
    expect(read.w).toBeCloseTo(built.w, 5);
  });

  it("rests at the identity", () => {
    const identity = identityTransform();
    expect(identity.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(identity.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    expect(identity.scale).toBe(1);
  });
});

describe("skeleton posing", () => {
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
        name: "arm",
        parent: "root",
        position: Vector3D.create(0, 2, 0),
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: 1,
      },
    ],
  };

  const motion: BoneMotion = {
    name: "wave",
    framesPerSecond: 10,
    loop: true,
    duration: 1,
    tracks: [
      {
        bone: "arm",
        keys: [
          {
            at: 0,
            ease: "linear",
            position: Vector3D.create(0, 2, 0),
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: 1,
          },
          {
            at: 1,
            ease: "linear",
            position: Vector3D.create(0, 4, 0),
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: 1,
          },
        ],
      },
    ],
  };

  it("leans a bone between its keys", () => {
    const posed = poseSkeleton(skeleton, motion, 0.5);
    expect(posed.get("arm")!.position.y).toBeCloseTo(3, 6);
  });

  it("composes a posed bone onto its parent", () => {
    const world = posedWorld(skeleton, motion, 1);
    expect(world.get("arm")!.position.y).toBeCloseTo(4, 6);
  });

  it("rests a bone the motion does not name", () => {
    const posed = poseSkeleton(skeleton, undefined, 0.5);
    expect(posed.get("arm")!.position.y).toBeCloseTo(2, 6);
  });
});

describe("skeleton edits", () => {
  const skeleton: Skeleton = {
    name: "chain",
    bones: [
      {
        id: "a",
        name: "a",
        parent: null,
        position: Vector3D.create(0, 0, 0),
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: 1,
      },
      {
        id: "b",
        name: "b",
        parent: "a",
        position: Vector3D.create(0, 1, 0),
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: 1,
      },
      {
        id: "c",
        name: "c",
        parent: "b",
        position: Vector3D.create(0, 1, 0),
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: 1,
      },
    ],
  };

  it("refuses a parent that would make a cycle", () => {
    const edited = withParent(skeleton, "a", "c");
    expect(edited).toBe(skeleton);
  });

  it("refuses a parent the skeleton does not hold", () => {
    const edited = withParent(skeleton, "a", "missing");
    expect(edited).toBe(skeleton);
  });

  it("hangs a bone off a new parent", () => {
    const edited = withParent(skeleton, "c", null);
    expect(edited.bones.find((bone) => bone.id === "c")!.parent).toBeNull();
  });
});

describe("keying a motion", () => {
  const motion: BoneMotion = {
    name: "test",
    framesPerSecond: 24,
    loop: true,
    duration: 0,
    tracks: [],
  };

  it("lights a key where none stood, and replaces one where it did", () => {
    const first = withKey(motion, "arm", {
      at: 0,
      ease: "linear",
      position: Vector3D.create(0, 1, 0),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 1,
    });
    const replaced = withKey(first, "arm", {
      at: 0,
      ease: "linear",
      position: Vector3D.create(0, 2, 0),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 1,
    });

    expect(replaced.tracks[0].keys).toHaveLength(1);
    expect(replaced.tracks[0].keys[0].position.y).toBe(2);
    expect(replaced.duration).toBe(0);
  });

  it("clears every key standing at a moment", () => {
    const lit = withKey(motion, "arm", {
      at: 1,
      ease: "linear",
      position: Vector3D.create(0, 1, 0),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: 1,
    });
    const cleared = withoutKeysAt(lit, 1);
    expect(cleared.tracks).toHaveLength(0);
  });
});
