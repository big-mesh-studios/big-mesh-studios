import { describe, it, expect } from "vitest";
import { makeOperation } from "@big-mesh-studios/csg";
import { DEFAULT_BUDGET, meshModel } from "./model-mesh";

describe("csg mesh mode", () => {
  it("meshes multiple boxes", () => {
    const ops = [
      makeOperation(0, { x: 0, y: 0, z: 0 }, { type: "Box", len: { x: 1, y: 1, z: 1 } }, "Add"),
      makeOperation(1, { x: 3, y: 0, z: 0 }, { type: "Box", len: { x: 1, y: 1, z: 1 } }, "Add"),
    ];
    const result = meshModel(ops, DEFAULT_BUDGET, "csg");
    console.log("two box tris", result?.triangles);
    expect(result).toBeDefined();
  });
});