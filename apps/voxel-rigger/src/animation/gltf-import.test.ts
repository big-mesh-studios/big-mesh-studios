import { QuaternionKeyframeTrack, VectorKeyframeTrack } from "three";
import { describe, expect, it } from "vitest";
import { nodeNameOf, readTrack } from "./gltf-import";

describe("gltf track names", () => {
  it("takes the property off the end and keeps a dotted node name", () => {
    expect(nodeNameOf("FootL.quaternion")).toBe("FootL");
    expect(nodeNameOf("mixamorig:Hips.position")).toBe("mixamorig:Hips");
    expect(nodeNameOf("Bone.001.scale")).toBe("Bone.001");
    expect(nodeNameOf("Hips")).toBe("Hips");
  });
});

describe("gltf track sampling", () => {
  it("leans a position between its keys", () => {
    const track = new VectorKeyframeTrack(
      "hip.position",
      [0, 1],
      [0, 0, 0, 10, 0, 0],
    );
    expect(readTrack(track, "position", 0.5)).toEqual([5, 0, 0]);
  });

  it("holds the ends outside the keys it has", () => {
    const track = new VectorKeyframeTrack(
      "hip.position",
      [1, 2],
      [1, 0, 0, 3, 0, 0],
    );
    expect(readTrack(track, "position", 0)).toEqual([1, 0, 0]);
    expect(readTrack(track, "position", 9)).toEqual([3, 0, 0]);
  });

  it("turns a quaternion the short way between its keys", () => {
    const turn = new QuaternionKeyframeTrack(
      "hip.quaternion",
      [0, 1],
      [0, 0, 0, 1, 0, 0, Math.sin(0.05), Math.cos(0.05)],
    );
    const half = readTrack(turn, "quaternion", 0.5);
    expect(half[2]).toBeCloseTo(Math.sin(0.025), 5);
    expect(half[3]).toBeCloseTo(Math.cos(0.025), 5);
  });
});
