import { describe, expect, it } from "vitest";
import { Vector3 } from "@random-mesh/rmsl/scene";
import {
  quatFromAxisAngle,
  quatFromBasis,
  rayPlanePoint,
  rigLookingAt,
  rigV,
  rigW,
} from "./rig";

describe("quatFromBasis", () => {
  it("rebuilds the rotation an axis-angle produced", () => {
    const quarterTurn = quatFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    const u = new Vector3(1, 0, 0).applyQuaternion(quarterTurn);
    const v = new Vector3(0, 1, 0).applyQuaternion(quarterTurn);
    const w = new Vector3(0, 0, 1).applyQuaternion(quarterTurn);
    const rebuilt = quatFromBasis(u, v, w);
    const rotated = new Vector3(1, 0, 0).applyQuaternion(rebuilt);
    expect(rotated.x).toBeCloseTo(u.x);
    expect(rotated.y).toBeCloseTo(u.y);
    expect(rotated.z).toBeCloseTo(u.z);
  });
});

describe("rigLookingAt", () => {
  it("puts w from the target to the camera and keeps v upright", () => {
    const rig = rigLookingAt(new Vector3(0, 0, -10), new Vector3(0, 0, 0));
    expect(rig).toBeDefined();
    const w = rigW(rig!);
    expect(w.x).toBeCloseTo(0);
    expect(w.y).toBeCloseTo(0);
    expect(w.z).toBeCloseTo(-1);
    expect(rigV(rig!).y).toBeCloseTo(1);
  });

  it("refuses a camera sitting on its target", () => {
    expect(
      rigLookingAt(new Vector3(0, 0, 0), new Vector3(0, 0, 0)),
    ).toBeUndefined();
  });
});

describe("rayPlanePoint", () => {
  it("finds where a ray crosses a plane", () => {
    const point = rayPlanePoint(
      { origin: new Vector3(0, 0, 5), direction: new Vector3(0, 0, -1) },
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 1),
    );
    expect(point).toBeDefined();
    expect(point!.x).toBeCloseTo(0);
    expect(point!.y).toBeCloseTo(0);
    expect(point!.z).toBeCloseTo(0);
  });

  it("has no crossing for a ray parallel to the plane", () => {
    expect(
      rayPlanePoint(
        { origin: new Vector3(0, 0, 5), direction: new Vector3(1, 0, 0) },
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 1),
      ),
    ).toBeUndefined();
  });
});
