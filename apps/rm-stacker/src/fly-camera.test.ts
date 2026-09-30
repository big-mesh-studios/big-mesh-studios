import { describe, expect, it } from "vitest";
import {
  Matrix3x3,
  Vector3D,
  type Dimensions3D,
} from "@big-mesh-studios/maths";
import {
  createFlyCamera,
  flightEntry,
  flightExtent,
  flightReach,
  lookDirection,
  orbitFromFlyCamera,
  stepFlyCamera,
  type FlyCamera,
  type FlyInput,
} from "./fly-camera";
import { framedVoxelSize } from "./voxel-preview-scene";

// A turntable's own matrices are single-precision, so a fly camera placed from
// closed-form double arithmetic and the same camera placed through one of them
// agree to about seven places rather than to the last.
const FLOAT_ROUNDING = 1e-6;

/** The world-to-model turn the preview builds for a turntable at this pose. */
const worldToModelOf = (yaw: number, pitch: number, spin: number) =>
  Matrix3x3.multiply(
    Matrix3x3.rotationY(-(yaw + spin)),
    Matrix3x3.rotationX(-pitch),
  );

/** A camera that starts at rest, as one entering flight does. */
const atRest = (over: Partial<Parameters<typeof createFlyCamera>[0]> = {}) =>
  createFlyCamera({
    heading: 0,
    pitch: 0,
    distance: 3,
    voxelSize: 0.1,
    extent: 10,
    ...over,
  });

const still: FlyInput = { moveX: 0, moveY: 0, lookDx: 0, lookDy: 0 };

const held = (over: Partial<FlyInput> = {}): FlyInput => ({
  ...still,
  ...over,
});

/** Runs the camera forward for `seconds` at a steady 60 frames a second. */
const fly = (camera: FlyCamera, input: FlyInput, seconds: number) => {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
    stepFlyCamera(camera, input, 1 / 60);
  }
};

/**
 * How far one number is from another, checked with the places given. A turntable
 * placed through its own single-precision matrices agrees with one placed from
 * closed-form arithmetic to about seven places, so a comparison that goes
 * through a matrix takes fewer.
 */
const expectAxis = (value: number, expected: number, places = 9) =>
  expect(
    Math.abs(value - expected),
    `${value} against ${expected}`,
  ).toBeLessThan(10 ** -places);

const expectStopped = (camera: FlyCamera) => {
  for (const axis of ["x", "y", "z"] as const) {
    expectAxis(camera.velocity[axis], 0);
  }
};

const SIZE: Dimensions3D = { width: 12, height: 20, depth: 8 };

describe("createFlyCamera", () => {
  it("stands where the turntable's camera stood, measured from the figure", () => {
    // The turntable draws the figure rotated, so its camera only sees that
    // figure from one place relative to it: wherever its own turn carries the
    // camera's position to. A fly camera put there sees the same figure with
    // the turntable's turn taken away, so entering flight shows no jump.
    for (const [yaw, pitch, spin] of [
      [Math.PI / 4, Math.PI / 6, 0],
      [0, 0, 0],
      [-2.1, 1.2, 0.7],
      [Math.PI, 0.4, 3],
    ]) {
      const distance = 3;
      const camera = atRest({ heading: yaw + spin, pitch, distance });
      const through = Matrix3x3.transform(worldToModelOf(yaw, pitch, spin), {
        x: 0,
        y: 0,
        z: distance,
      });

      expectAxis(camera.position.x, through.x, -Math.log10(FLOAT_ROUNDING));
      expectAxis(camera.position.y, through.y, -Math.log10(FLOAT_ROUNDING));
      expectAxis(camera.position.z, through.z, -Math.log10(FLOAT_ROUNDING));
    }
  });

  it("looks at the figure it was turned away from", () => {
    const look = lookDirection(atRest());

    expectAxis(look.x, 0);
    expectAxis(look.y, 0);
    expectAxis(look.z, -1);
  });

  it("looks down as far as the figure was tilted up", () => {
    // A figure turned so that its top comes towards the viewer is a figure the
    // viewer is looking down on, so the camera standing in for the turntable is
    // above it, looking down.
    const camera = atRest({ pitch: 0.4 });
    const look = lookDirection(camera);

    expect(camera.position.y).toBeGreaterThan(0);
    expect(look.y).toBeLessThan(0);
  });

  it("starts at rest", () => {
    expectStopped(atRest());
  });

  it("flies at a rate measured in the figure's own voxels", () => {
    // The drawn world's unit is a fraction of a voxel that changes with the
    // zoom, so one speed in world units would cross a model at a different rate
    // for every size the model is drawn at. Ten times the size drawn is ten
    // times the speed, which is the same number of voxels a second either way.
    expect(atRest({ voxelSize: 0.1 }).config.speed).toBe(
      10 * atRest({ voxelSize: 0.01 }).config.speed,
    );
  });

  it("takes the settings it is given over the ones it would default to", () => {
    const camera = atRest({ config: { speed: 4, maxPitch: 0.5 } });

    expect(camera.config.speed).toBe(4);
    expect(camera.config.maxPitch).toBe(0.5);
  });
});

describe("orbitFromFlyCamera", () => {
  it("turns a turntable back to where a fly camera started", () => {
    for (const [yaw, pitch, distance] of [
      [0, 0, 3],
      [Math.PI / 4, Math.PI / 6, 2],
      [-2.1, 1.2, 7],
      [Math.PI, -0.9, 1],
    ]) {
      const back = orbitFromFlyCamera(
        atRest({ heading: yaw, pitch, distance }),
      );

      expect(back.yaw).toBeCloseTo(yaw, 9);
      expect(back.pitch).toBeCloseTo(pitch, 9);
      expect(back.radius).toBeCloseTo(distance, 9);
    }
  });

  it("turns a turntable back to where a fly camera has flown to", () => {
    // Putting the turntable back is the same view with the turning taken away,
    // which is a claim about where the camera now stands and not about where it
    // set off from.
    const camera = atRest();
    fly(camera, held({ moveX: 0.5, moveY: 1 }), 2);

    const back = orbitFromFlyCamera(camera);
    const through = Matrix3x3.transform(
      worldToModelOf(back.yaw, back.pitch, 0),
      { x: 0, y: 0, z: back.radius },
    );

    expectAxis(through.x, camera.position.x, -Math.log10(FLOAT_ROUNDING));
    expectAxis(through.y, camera.position.y, -Math.log10(FLOAT_ROUNDING));
    expectAxis(through.z, camera.position.z, -Math.log10(FLOAT_ROUNDING));
  });

  it("measures a distance the preview frames a figure against", () => {
    expect(orbitFromFlyCamera(atRest({ distance: 4.25 })).radius).toBeCloseTo(
      4.25,
      9,
    );
  });
});

describe("flightExtent", () => {
  it("is measured off the figure's longest side", () => {
    expect(flightExtent(SIZE, 0.1)).toBeCloseTo(4 * 20 * 0.1, 9);
  });

  it("grows and shrinks with the figure as it is drawn", () => {
    expect(flightExtent(SIZE, 0.2)).toBeCloseTo(2 * flightExtent(SIZE, 0.1), 9);
  });
});

describe("stepFlyCamera", () => {
  it("ramps up to its speed rather than reaching it at once", () => {
    const camera = atRest();

    stepFlyCamera(camera, held({ moveY: 1 }), 1 / 60);

    // One frame's worth of acceleration rather than the speed itself: a camera
    // that reached its speed at once could be steered at nothing but the
    // slowest pace.
    expectAxis(
      Vector3D.length(camera.velocity),
      camera.config.acceleration / 60,
    );
  });

  it("settles at its speed", () => {
    const camera = atRest();
    fly(camera, held({ moveY: 1 }), 3);

    expectAxis(Vector3D.length(camera.velocity), camera.config.speed);
  });

  it("settles back to rest when the input is let go", () => {
    const camera = atRest();
    fly(camera, held({ moveY: 1 }), 3);
    fly(camera, still, 3);

    expectStopped(camera);
  });

  it("climbs while looking up and dives while looking down", () => {
    const up = atRest();
    up.pitch = 1;
    fly(up, held({ moveY: 1 }), 1);

    const down = atRest();
    down.pitch = -1;
    fly(down, held({ moveY: 1 }), 1);

    expect(up.velocity.y).toBeGreaterThan(0);
    expect(down.velocity.y).toBeLessThan(0);
  });

  it("strafes level however far the view is tilted", () => {
    const camera = atRest();
    camera.pitch = 1.2;
    fly(camera, held({ moveX: 1 }), 1);

    expectAxis(camera.velocity.y, 0);
  });

  it("keeps its speed whatever mix of keys is held", () => {
    // Both axes asked for at once are one movement rather than two, or a
    // diagonal would be quicker than either of the two lines into it.
    const camera = atRest();
    fly(camera, held({ moveX: 1, moveY: 1 }), 3);

    expectAxis(Vector3D.length(camera.velocity), camera.config.speed);
  });

  it("strafe towards the view's right", () => {
    // Looking along positive z with up positive y, the right of that view is
    // negative x.
    const camera = atRest();
    camera.yaw = 0;
    camera.pitch = 0;
    fly(camera, held({ moveX: 1 }), 1);

    expect(camera.velocity.x).toBeLessThan(0);
    expectAxis(camera.velocity.z, 0);
  });

  it("passes through the figure rather than stopping against it", () => {
    // Nothing in the integrator reads the model, so a camera cannot be stopped
    // by one at all.
    const camera = atRest();
    fly(camera, held({ moveY: 1 }), 10);

    expect(camera.position.z).toBeLessThan(0);
  });

  it("is held inside its own extent", () => {
    const camera = atRest({ extent: 2 });
    fly(camera, held({ moveX: 1, moveY: 1 }), 20);

    expect(camera.position.x).toBeGreaterThanOrEqual(-2);
    expect(camera.position.y).toBeGreaterThanOrEqual(-2);
    expect(camera.position.z).toBeLessThanOrEqual(2);
  });

  it("turns the view with the pointer's movement", () => {
    const camera = atRest();
    const before = camera.yaw;

    stepFlyCamera(camera, held({ lookDx: 100 }), 1 / 60);

    // Positive yaw looks along positive z, so a pointer moving to the right
    // turns the view away from the way it was facing.
    expect(camera.yaw).toBeLessThan(before);
  });

  it("looks down as the pointer moves down and up as it moves up", () => {
    const camera = atRest();
    camera.pitch = 0;

    stepFlyCamera(camera, held({ lookDy: 100 }), 1 / 60);
    expect(camera.pitch).toBeLessThan(0);

    stepFlyCamera(camera, held({ lookDy: -200 }), 1 / 60);
    expect(camera.pitch).toBeGreaterThan(0);
  });

  it("stops the view short of straight up or down", () => {
    const camera = atRest();
    const limit = camera.config.maxPitch;

    fly(camera, held({ lookDy: 1 }), 10);
    expect(camera.pitch).toBeCloseTo(-limit, 9);

    fly(camera, held({ lookDy: -1 }), 20);
    expect(camera.pitch).toBeCloseTo(limit, 9);
  });

  it("moves a frame that arrived late as though it had arrived on time", () => {
    // A tab left in the background comes back with one enormous frame, and a
    // camera that took it at its word would be on the far side of the figure.
    const camera = atRest();
    fly(camera, held({ moveY: 1 }), 3);
    const before = camera.position.z;

    stepFlyCamera(camera, held({ moveY: 1 }), 30);

    // Thirty seconds at this speed is most of the figure's own extent twice
    // over, and the frame is treated as a fraction of a tenth of a second.
    expect(Math.abs(camera.position.z - before)).toBeLessThan(
      camera.config.speed / 10,
    );
  });

  it("does not move on a frame of no length at all", () => {
    const camera = atRest();
    const before = { ...camera.position };

    stepFlyCamera(camera, held({ moveY: 1 }), 0);

    expectAxis(camera.position.x, before.x);
    expectAxis(camera.position.y, before.y);
    expectAxis(camera.position.z, before.z);
  });
});

describe("flightEntry", () => {
  // The model the editor opens on: a cube thirteen voxels a side, which reaches
  // about ten and a half voxels from the middle, drawn so that it fits a turntable
  // stood three world units off.
  // The model the editor opens on: a cube thirteen voxels a side, which reaches
  // about eleven voxels from the middle — the far corner, which is what a camera
  // has to stand off to be outside it however it is turned.
  const REACH = 11.26;
  const VOXEL = 0.115;
  const STAND_OFF = 3;
  const SURFACE = 7.5;

  it("stands within reach of the figure's own surface", () => {
    // The turntable's distance is measured to the whole figure, and the crosshair
    // measures from the camera, so a camera that took the turntable's distance
    // would be looking at a figure it could not reach and the first press of the
    // first flight would find nothing at all.
    const entry = flightEntry(REACH, STAND_OFF, VOXEL);

    expect(entry - SURFACE * VOXEL).toBeLessThan(flightReach(REACH) * VOXEL);
    expect(entry - SURFACE * VOXEL).toBeGreaterThan(0);
  });

  it("stands off the surface rather than inside the figure", () => {
    const entry = flightEntry(REACH, STAND_OFF, VOXEL);

    expect(entry).toBeGreaterThan(REACH * VOXEL);
  });

  it("leaves a view that was already close enough where it was", () => {
    expect(flightEntry(REACH, 0.2, VOXEL)).toBe(0.2);
  });

  it("closes on a figure that has been flown up to", () => {
    // A figure drawn large fills the view and the turntable is stood off
    // accordingly, so the distance a camera opens at shrinks with it.
    const drawnLarge = flightEntry(REACH, STAND_OFF, VOXEL * 4);
    const drawnSmall = flightEntry(REACH, STAND_OFF, VOXEL);

    expect(drawnLarge).toBeGreaterThan(drawnSmall);
    expect(drawnLarge - SURFACE * VOXEL * 4).toBeLessThan(
      flightReach(REACH) * VOXEL * 4,
    );
  });

  it("reaches a face of the model square on, not only its corners", () => {
    // A crosshair of a fixed few voxels reaches the near corner of a figure this
    // size and stops, so looking at a face square on reports nothing at all while
    // the camera is pointing straight at the model. The reach is the figure's own
    // so that the whole of it is in range.
    const entry = flightEntry(REACH, STAND_OFF, VOXEL) / VOXEL;
    const nearestFace = entry - SURFACE;

    expect(nearestFace).toBeLessThan(flightReach(REACH));
  });

  it("reaches the far side of the figure from inside it", () => {
    // A camera opens looking at the outside of a figure, and flies in to work on
    // the inside of it. From the middle, the far side has to be in reach, or the
    // hollows of a figure could never be worked on.
    const reach = flightReach(REACH);

    expect(reach).toBeGreaterThan(SURFACE);
  });

  it("reaches a figure of any size, because it is measured from it", () => {
    // Six voxels is a reach for a figure a few voxels across. The model the editor
    // opens on is fifteen, and a reach that did not grow with it would reach
    // nothing of it.
    //
    // A figure is drawn at the size that fills the view from the turntable's
    // distance, so a larger one is drawn in smaller voxels — which is what makes
    // a stand-off of so many world units a longer way off in voxels as the figure
    // grows, and is why this has to measure in voxels to mean anything.
    for (const size of [1, 3, 15, 60, 200]) {
      const reach = (size / 2) * Math.sqrt(3);
      const voxel = framedVoxelSize(reach, STAND_OFF, 1);
      const entry = flightEntry(reach, STAND_OFF, voxel) / voxel;

      // Outside the figure, and its outer surface within reach.
      expect(entry).toBeGreaterThan(reach);
      expect(entry - size / 2).toBeLessThan(flightReach(reach));
    }
  });
});
