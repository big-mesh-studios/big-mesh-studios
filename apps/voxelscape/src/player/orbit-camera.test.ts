// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { InputSnapshot } from "./create-input";
import {
  createCameraOrbit,
  ORBIT_CAMERA_CFG,
  type CameraOrbit,
} from "./orbit-camera";
import {
  createPlayer,
  DEFAULT_PLAYER_CONFIG,
  playerEye,
  type Player,
} from "./player";

const OPEN = () => false;

const noInput = (over: Partial<InputSnapshot> = {}): InputSnapshot => ({
  moveX: 0,
  moveY: 0,
  jump: false,
  jumpHeld: false,
  lookDx: 0,
  lookDy: 0,
  primary: false,
  primaryHeld: false,
  click: false,
  secondary: false,
  secondaryHeld: false,
  secondaryReleased: false,
  use: false,
  useHeld: false,
  select: null,
  wheel: 0,
  ...over,
});

/** A player standing on flat ground, facing `yaw`. */
const makePlayer = (yaw = 0): Player => {
  const player = createPlayer(0, DEFAULT_PLAYER_CONFIG.halfSize + 0.1, 0, {
    ...DEFAULT_PLAYER_CONFIG,
  });
  player.yaw = yaw;
  return player;
};

/**
 * One frame of the order the game loop uses: the controls are read before the
 * physics, and the boom's dynamics advance after the player has moved.
 */
const frame = (
  orbit: CameraOrbit,
  player: Player,
  dt: number,
  input: InputSnapshot = noInput(),
): { moveX: number; moveY: number } => {
  const axes = orbit.applyControls(player, dt, input);
  orbit.pose(player, dt);
  return axes;
};

const runFrames = (
  orbit: CameraOrbit,
  player: Player,
  dt: number,
  input: () => InputSnapshot,
): { moveX: number; moveY: number } => {
  let axes = { moveX: 0, moveY: 0 };
  for (let i = 0; i < Math.ceil(6 / dt); i++) {
    axes = frame(orbit, player, dt, input());
  }
  return axes;
};

/**
 * The world motion the physics will produce from a set of axes, which is the
 * forward and screen-right of the player's own heading scaled by them.
 */
const worldMotion = (
  axes: { moveX: number; moveY: number },
  yaw: number,
): [number, number] => [
  axes.moveY * Math.sin(yaw) - axes.moveX * Math.cos(yaw),
  axes.moveY * Math.cos(yaw) + axes.moveX * Math.sin(yaw),
];

describe("CameraOrbit.applyControls", () => {
  it("leaves an aligned stick alone", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(0);
    orbit.snap(player);
    const axes = runFrames(orbit, player, 1 / 60, () => noInput({ moveY: 1 }));
    expect(player.yaw).toBeCloseTo(0, 6);
    expect(axes.moveY).toBeCloseTo(1, 6);
    expect(axes.moveX).toBeCloseTo(0, 6);
  });

  it("moves the character camera-relative and turns it toward the stick", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(0);
    orbit.snap(player);
    // The character has turned away while the boom stayed where it was; holding
    // forward has to head away from the camera and swing the character back.
    player.yaw = Math.PI / 2;
    const axes = runFrames(orbit, player, 1 / 60, () => noInput({ moveY: 1 }));
    expect(player.yaw).toBeCloseTo(0, 6);
    const [vx, vz] = worldMotion(axes, player.yaw);
    // Straight along the camera's own forward, which is +Z at a boom yaw of 0.
    expect(vz).toBeGreaterThan(0.999);
    expect(Math.abs(vx)).toBeLessThan(0.001);
  });

  it("reads the stick against the camera once the boom is swung round", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(0);
    orbit.snap(player);
    // Drag the boom a half turn round, so the camera now stands on the +Z side
    // of the player and looks back along -Z. The drag is one frame's worth of
    // pixels, not a per-frame push, or the boom would go round and round.
    const turn = Math.PI / DEFAULT_PLAYER_CONFIG.lookSensitivity;
    frame(orbit, player, 1 / 60, noInput({ lookDx: -turn }));
    // Holding forward has to walk the player wherever the camera is looking,
    // which is the whole point of reading the stick against the boom. Walking
    // is horizontal, so the motion lines up with the view direction's own
    // horizontal part.
    const axes = runFrames(orbit, player, 1 / 60, () => noInput({ moveY: 1 }));
    const aim = orbit.aim();
    const [vx, vz] = worldMotion(axes, player.yaw);
    const flat = Math.hypot(aim[0], aim[2]);
    const dot = (vx * aim[0] + vz * aim[2]) / (Math.hypot(vx, vz) * flat);
    expect(dot).toBeGreaterThan(0.999);
    expect(vz).toBeLessThan(-0.9);
  });

  it("does not fight the player while they hold a look drag", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(Math.PI);
    orbit.snap(player);
    const before = orbit.pose(player, 0).position;
    frame(orbit, player, 1 / 60, noInput({ lookDx: 1 }));
    const after = orbit.pose(player, 0).position;
    // Only the drag itself moves the boom this frame; the recentering spring
    // must stay off, which a spring in flight would break.
    const moved = Math.hypot(
      after[0] - before[0],
      after[1] - before[1],
      after[2] - before[2],
    );
    expect(moved).toBeLessThan(0.5);
  });

  it("leaves the caller's own input untouched", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(0);
    orbit.snap(player);
    const input = noInput({ moveX: 0.3, moveY: 0.7, lookDx: 12, lookDy: -4 });
    orbit.applyControls(player, 1 / 60, input);
    // Whatever else reads the frame's input still sees the stick and the look
    // deltas the player actually made.
    expect(input.moveX).toBe(0.3);
    expect(input.moveY).toBe(0.7);
    expect(input.lookDx).toBe(12);
    expect(input.lookDy).toBe(-4);
  });
});

describe("CameraOrbit.pose", () => {
  it("swings behind the character while they stand still", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(0);
    orbit.snap(player);
    player.yaw = Math.PI;
    runFrames(orbit, player, 1 / 60, () => noInput());
    // Facing -Z, so behind them is the +Z side.
    expect(orbit.pose(player, 0).position[2] - player.position.z).toBeGreaterThan(6);
  });

  it("stands the eye behind the pivot on the resting boom", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(0);
    orbit.snap(player);
    const eye = playerEye(player);
    const { position } = orbit.pose(player, 0);
    expect(position[0]).toBeCloseTo(eye[0], 5);
    expect(position[2]).toBeCloseTo(
      eye[2] - ORBIT_CAMERA_CFG.dist * Math.cos(ORBIT_CAMERA_CFG.elevDefault),
      4,
    );
    expect(position[1]).toBeGreaterThan(eye[1]);
  });

  it("aims back along the boom, putting the crosshair on what the ray selects", () => {
    const orbit = createCameraOrbit(OPEN);
    const player = makePlayer(0);
    orbit.snap(player);
    runFrames(orbit, player, 1 / 60, () => noInput({ lookDx: 60, lookDy: 30 }));
    const { position, direction } = orbit.pose(player, 1 / 60);
    const eye = playerEye(player);
    // The pivot has settled onto the eye, so running the view direction forward
    // from the eye reaches the camera. The eye, the camera and the ray a tool
    // picks along are then one line, which is what makes the crosshair exact.
    const back = Math.hypot(
      eye[0] - position[0],
      eye[1] - position[1],
      eye[2] - position[2],
    );
    expect(back).toBeGreaterThan(1);
    expect(position[0] + direction[0] * back).toBeCloseTo(eye[0], 4);
    expect(position[1] + direction[1] * back).toBeCloseTo(eye[1], 4);
    expect(position[2] + direction[2] * back).toBeCloseTo(eye[2], 4);
  });

  it("shortens the boom when terrain rises between pivot and eye", () => {
    // A wall standing five units out on the camera's side of the player.
    const orbit = createCameraOrbit((_x, _y, z) => z < -5);
    const player = makePlayer(0);
    orbit.snap(player);
    runFrames(orbit, player, 1 / 60, () => noInput());
    // Unblocked would sit near z = -dist; pulled in stays well short.
    expect(orbit.pose(player, 0).position[2]).toBeGreaterThan(-7.5);
  });

  it("releases the boom again once the wall is behind the player", () => {
    let blocked = true;
    const orbit = createCameraOrbit((_x, _y, z) => blocked && z < -5);
    const player = makePlayer(0);
    orbit.snap(player);
    runFrames(orbit, player, 1 / 60, () => noInput());
    const pulledIn = orbit.pose(player, 0).position[2];
    blocked = false;
    for (let i = 0; i < 240; i++) {
      frame(orbit, player, 1 / 60);
    }
    expect(orbit.pose(player, 0).position[2]).toBeLessThan(pulledIn - 1);
  });
});
