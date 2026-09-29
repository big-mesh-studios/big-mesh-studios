import { describe, expect, it } from "vitest";
import { planeAxes, planeSlicedAxis } from "@big-mesh-studios/stacker/volume";
import { Vector3 } from "@random-mesh/rmsl/scene";
import { PLANE_KINDS } from "./constants";
import { layingDown } from "./slice-plane";

/** Where one of a box's axes runs, as the three numbers of a unit vector. */
const along = (axis: "x" | "y" | "z") => [
  axis === "x" ? 1 : 0,
  axis === "y" ? 1 : 0,
  axis === "z" ? 1 : 0,
];

describe("the turn a plane's quad takes", () => {
  for (const plane of PLANE_KINDS) {
    const [across, down] = planeAxes[plane];
    const fixed = planeSlicedAxis[plane];

    // The quad is built lying in its own x and y, and the picture put on it runs u
    // from left to right and v from bottom to top. So the turn has to carry the
    // quad's width onto the axis the plane runs across and its height onto the axis
    // it runs down, and leave its face along the axis the plane does not vary. A
    // turn that gets either of the first two wrong leaves the slice drawn sideways
    // and the model a quarter turn out of step with the canvas beside it, and no
    // single right angle about one axis gives all three.
    it(`carries a quad's width onto ${plane}'s across axis and its height onto its down axis`, () => {
      const turn = layingDown(across, down, fixed);
      const turned = (x: number, y: number, z: number) =>
        new Vector3(x, y, z).applyQuaternion(turn).toArray();

      expect(turned(1, 0, 0)).toEqual(along(across));
      expect(turned(0, 1, 0)).toEqual(along(down));
      expect(turned(0, 0, 1)).toEqual(along(fixed));
    });
  }
});
