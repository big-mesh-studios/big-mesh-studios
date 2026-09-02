import {
  dimensionKinds,
  sideAxes,
  axisSides,
} from "@big-mesh-studios/stacker/renderer";
import { Vector3 } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";
import { AGAINST, StandingPlane } from "./standing-plane";

/** Where the quad's own axes point once it has been laid across `axis`. */
const laidAcross = (axis: (typeof dimensionKinds)[number]) => {
  const plane = new StandingPlane();

  plane.lie(axis, { across: 1, down: 1, at: 0 });

  return {
    across: new Vector3(1, 0, 0).applyQuaternion(plane.panel.quaternion),
    down: new Vector3(0, 1, 0).applyQuaternion(plane.panel.quaternion),
  };
};

describe("AGAINST", () => {
  it("says which way a quad laid across each axis counts the axes it spans", () => {
    for (const axis of dimensionKinds) {
      const [across, down] = sideAxes[axisSides[axis][0]];
      const pointing = laidAcross(axis);
      // The axis each of the quad's own points along, as the one number of the
      // three that a unit turned onto a model axis leaves standing.
      const along = (turned: Vector3, spans: string) =>
        ({ width: turned.x, height: turned.y, depth: turned.z })[
          spans as "width"
        ];

      expect(along(pointing.across, across)).toBeCloseTo(
        AGAINST[axis].across ? -1 : 1,
      );
      expect(along(pointing.down, down)).toBeCloseTo(
        AGAINST[axis].down ? -1 : 1,
      );
    }
  });
});
