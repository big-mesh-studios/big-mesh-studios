import { describe, expect, it } from "vitest";
import {
  Group,
  Matrix4,
  PerspectiveCamera,
  Vector3,
} from "@random-mesh/rmsl/scene";
import {
  armUnderPointer,
  distanceToSegment,
  projectToScreen,
  TranslateWidget,
  voxelsDragged,
  type ArmOnScreen,
} from "./translate-widget";
import { FAR, FOV, NEAR, rotateFigure } from "./voxel-preview-scene";

/** An arrow lying flat across the canvas, `length` pixels long, from `from`. */
const across = (
  axis: ArmOnScreen["axis"],
  from: { x: number; y: number },
  length: number,
): ArmOnScreen => ({
  axis,
  from,
  to: { x: from.x + length, y: from.y },
});

describe("distanceToSegment", () => {
  it("measures straight out from the middle of the line", () => {
    expect(
      distanceToSegment({ x: 50, y: 30 }, { x: 0, y: 0 }, { x: 100, y: 0 }),
    ).toBeCloseTo(30);
  });

  it("measures from an end for a point past it, not from the line it lies on", () => {
    expect(
      distanceToSegment({ x: 130, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }),
    ).toBeCloseTo(30);
  });

  it("measures from the point itself for a line of no length", () => {
    expect(
      distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
    ).toBeCloseTo(5);
  });
});

describe("armUnderPointer", () => {
  const arms = [
    across("x", { x: 100, y: 100 }, 60),
    { axis: "y", from: { x: 100, y: 100 }, to: { x: 100, y: 40 } } as const,
  ];

  it("finds the arrow the pointer is over", () => {
    expect(armUnderPointer({ x: 130, y: 103 }, arms)).toBe("x");
    expect(armUnderPointer({ x: 103, y: 70 }, arms)).toBe("y");
  });

  it("takes the nearer of two arrows running close together", () => {
    // Turned nearly edge-on, two arrows lie almost along each other; the one
    // whose line the pointer is actually on is the one it takes.
    const overlapping = [
      { axis: "x", from: { x: 100, y: 100 }, to: { x: 200, y: 140 } },
      { axis: "z", from: { x: 100, y: 100 }, to: { x: 200, y: 120 } },
    ] as const;

    expect(armUnderPointer({ x: 190, y: 122 }, [...overlapping])).toBe("z");
    expect(armUnderPointer({ x: 186, y: 136 }, [...overlapping])).toBe("x");
  });

  it("finds nothing where the pointer is clear of them all", () => {
    expect(armUnderPointer({ x: 300, y: 300 }, arms)).toBeUndefined();
  });

  it("names no axis on the point every arrow starts from", () => {
    // Every arrow is equally near there, so taking one would be taking whichever
    // was asked about first rather than the one that was aimed at.
    expect(armUnderPointer({ x: 100, y: 100 }, arms)).toBeUndefined();
    expect(armUnderPointer({ x: 104, y: 97 }, arms)).toBeUndefined();
  });

  it("names an axis once the pointer is along one arrow rather than on the hub", () => {
    expect(armUnderPointer({ x: 140, y: 100 }, arms)).toBe("x");
    expect(armUnderPointer({ x: 100, y: 60 }, arms)).toBe("y");
  });
});

describe("voxelsDragged", () => {
  // An arrow 100 pixels long standing for 2 units of the drawn world, where a
  // voxel takes up a tenth of a unit: 100 pixels is 20 voxels, 5 pixels is one.
  const arm = across("x", { x: 0, y: 0 }, 100);
  const ARM_LENGTH = 2;
  const VOXEL_SIZE = 0.1;

  it("counts the voxels a drag along the arrow covers", () => {
    expect(voxelsDragged({ x: 25, y: 0 }, arm, ARM_LENGTH, VOXEL_SIZE)).toBe(5);
  });

  it("counts backwards for a drag against the arrow", () => {
    expect(voxelsDragged({ x: -25, y: 0 }, arm, ARM_LENGTH, VOXEL_SIZE)).toBe(
      -5,
    );
  });

  it("ignores the part of a drag that runs across the arrow", () => {
    expect(voxelsDragged({ x: 25, y: 80 }, arm, ARM_LENGTH, VOXEL_SIZE)).toBe(
      5,
    );
  });

  it("lands on whole voxels, so a part never sits between them", () => {
    expect(
      Number.isInteger(
        voxelsDragged({ x: 27, y: 0 }, arm, ARM_LENGTH, VOXEL_SIZE),
      ),
    ).toBe(true);
  });

  it("holds still for an arrow pointing almost straight at the camera", () => {
    // Six pixels long on screen: a pixel of movement would stand for a slide of
    // several voxels, so the drag is refused rather than made wildly sensitive.
    const foreshortened = across("x", { x: 0, y: 0 }, 6);

    expect(
      voxelsDragged({ x: 40, y: 0 }, foreshortened, ARM_LENGTH, VOXEL_SIZE),
    ).toBe(0);
  });
});

describe("the arrows standing in a turned figure", () => {
  const SIZE = { width: 640, height: 480 };
  const RADIUS = 3;
  const ROOT = { x: 0.3, y: 0.1, z: -0.2 };

  /** The camera the preview looks through, ready to project points. */
  const lookOn = () => {
    const camera = new PerspectiveCamera(
      FOV,
      SIZE.width / SIZE.height,
      NEAR,
      FAR,
    );
    camera.position.set(0, 0, RADIUS);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const viewProjection = new Matrix4()
      .copy(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse);

    return { camera, viewProjection };
  };

  /** The preview's scene: a widget standing in a figure turned on a turntable. */
  const standing = (yaw: number, pitch: number) => {
    const turntable = new Group();
    rotateFigure(turntable, yaw, pitch, 0);

    const widget = new TranslateWidget();
    turntable.add(widget.group);
    widget.place(ROOT, RADIUS);

    return { turntable, widget };
  };

  /** Where a point of the figure's own space lands on the canvas. */
  const drawnOn = (
    turntable: Group,
    viewProjection: Matrix4,
    point: { x: number; y: number; z: number },
  ) => {
    turntable.updateMatrixWorld(true);
    return projectToScreen(
      new Vector3(point.x, point.y, point.z).applyMatrix4(
        turntable.matrixWorld,
      ),
      viewProjection,
      SIZE,
    )!;
  };

  it("meets at the root as the figure draws it, however the figure is turned", () => {
    for (const [yaw, pitch] of [
      [0, 0],
      [Math.PI / 4, Math.PI / 6],
      [-2.1, 1.2],
    ]) {
      const { turntable, widget } = standing(yaw, pitch);
      const { camera, viewProjection } = lookOn();
      const hub = widget.armsOnScreen(camera, SIZE)[0].from;
      const root = drawnOn(turntable, viewProjection, ROOT);

      expect(hub.x, `yaw ${yaw}`).toBeCloseTo(root.x, 3);
      expect(hub.y, `yaw ${yaw}`).toBeCloseTo(root.y, 3);
    }
  });

  it("points each arrow the way its axis carries the part across the canvas", () => {
    const { turntable, widget } = standing(Math.PI / 4, Math.PI / 6);
    const { camera, viewProjection } = lookOn();
    const at = drawnOn(turntable, viewProjection, ROOT);

    for (const arm of widget.armsOnScreen(camera, SIZE)) {
      const slid = drawnOn(turntable, viewProjection, {
        ...ROOT,
        [arm.axis]: ROOT[arm.axis] + 0.2,
      });
      const arrow = Math.atan2(arm.to.y - arm.from.y, arm.to.x - arm.from.x);
      const carried = Math.atan2(slid.y - at.y, slid.x - at.x);

      // A degree apart at most: the arrow and the part it moves run along the
      // same line of the world, and only the spread of the perspective tells
      // the two directions apart at all.
      expect(Math.abs(arrow - carried), arm.axis).toBeLessThan(Math.PI / 180);
    }
  });
});
