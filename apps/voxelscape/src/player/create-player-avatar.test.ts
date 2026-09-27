// @vitest-environment jsdom
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";
import { createPlayerAvatar, type AvatarTerrain } from "./create-player-avatar";
import { DEFAULT_PLAYER_CONFIG, playerEye } from "./player";

const NO_WATER = () => false;

/** Flat ground at zero, so a player spawned on it is standing on it. */
const FLAT_TERRAIN: AvatarTerrain = {
  getHeightAt: () => 0,
  getGroundHeightAt: (_x, _y, _z) => 0,
  getInWaterAt: NO_WATER,
  getSolidAt: (_x, y) => y < 0,
};

const makeAvatar = (spawn: [number, number, number]) => {
  const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
  return {
    camera,
    avatar: createPlayerAvatar({ camera, terrain: FLAT_TERRAIN, spawn }),
  };
};

/** How far the camera stands from a point, which is what "moved" means here. */
const distance = (camera: PerspectiveCamera, at: readonly number[]): number =>
  Math.hypot(
    camera.position.x - at[0],
    camera.position.y - at[1],
    camera.position.z - at[2],
  );

/** The unit direction from `from` to `to`, which is a line through both. */
const unit = (
  from: { x: number; y: number; z: number },
  to: readonly number[],
): [number, number, number] => {
  const dx = to[0] - from.x;
  const dy = to[1] - from.y;
  const dz = to[2] - from.z;
  const length = Math.hypot(dx, dy, dz);
  return [dx / length, dy / length, dz / length];
};

describe("PlayerAvatar.look", () => {
  it("aims from the player's eye", () => {
    const { avatar } = makeAvatar([4, 0, -6]);
    const { origin } = avatar.look();
    // The spawn height is where the player stands, not where the eye is: the
    // eye is that plus the eye height, above the cube's centre.
    expect(origin[0]).toBeCloseTo(4, 5);
    expect(origin[2]).toBeCloseTo(-6, 5);
    expect(origin[1] - avatar.player.position.y).toBeCloseTo(
      DEFAULT_PLAYER_CONFIG.eyeHeight,
      5,
    );
    expect(origin).toEqual(playerEye(avatar.player));
  });

  it("follows the player as they move", () => {
    const { avatar } = makeAvatar([0, 0, 0]);
    avatar.player.position.set(10, 3, -2);
    expect(avatar.look().origin).toEqual([
      10,
      3 + DEFAULT_PLAYER_CONFIG.eyeHeight,
      -2,
    ]);
  });

  it("still aims from the eye once the camera has moved off it", () => {
    const { camera, avatar } = makeAvatar([0, 0, 0]);
    const firstPerson = avatar.look();

    avatar.setFirstPerson(false);
    avatar.place(0);

    // A third person view stands the camera back behind the player, and a
    // reach measured from there would be a reach from a place the player is
    // not standing, so the origin has to stay the eye.
    const eye = playerEye(avatar.player);
    expect(avatar.look().origin).toEqual(eye);
    // The direction is the line the view is drawn on rather than the player's
    // own look, which is what puts the crosshair on the target.
    expect(avatar.look().direction).not.toEqual(firstPerson.direction);
    expect(avatar.look().direction).toEqual(unit(camera.position, eye));

    // The camera really did move, or the two assertions above pass vacuously.
    expect(distance(camera, eye)).toBeGreaterThan(
      DEFAULT_PLAYER_CONFIG.followBack - 1,
    );
  });

  it("puts the crosshair on the ray it picks along in third person", () => {
    const { camera, avatar } = makeAvatar([0, 0, 0]);
    avatar.setFirstPerson(false);
    avatar.player.pitch = 0.5;
    avatar.place(0);

    const { origin, direction } = avatar.look();
    // Running the pick ray forward from the eye has to reach the camera, so
    // that what the crosshair is drawn over is what the ray selects.
    const ahead = Math.hypot(
      camera.position.x - origin[0],
      camera.position.y - origin[1],
      camera.position.z - origin[2],
    );
    expect(ahead).toBeGreaterThan(1);
    expect(origin[0] - direction[0] * ahead).toBeCloseTo(camera.position.x, 4);
    expect(origin[1] - direction[1] * ahead).toBeCloseTo(camera.position.y, 4);
    expect(origin[2] - direction[2] * ahead).toBeCloseTo(camera.position.z, 4);
  });
});

describe("PlayerAvatar the camera pose", () => {
  it("puts the camera on the eye in first person", () => {
    const { camera, avatar } = makeAvatar([4, 0, -6]);
    avatar.place(0);
    expect(distance(camera, playerEye(avatar.player))).toBeCloseTo(0, 5);
    expect(avatar.firstPerson).toBe(true);
  });

  it("stands the camera off the eye in third person", () => {
    const { camera, avatar } = makeAvatar([0, 0, 0]);
    avatar.setFirstPerson(false);
    avatar.place(0);
    expect(distance(camera, playerEye(avatar.player))).toBeGreaterThan(
      DEFAULT_PLAYER_CONFIG.followBack - 1,
    );
  });
});
