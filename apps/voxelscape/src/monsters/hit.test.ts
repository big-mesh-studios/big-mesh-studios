// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import {
  partDimensions,
  solveVoxels,
} from "@big-mesh-studios/stacker/renderer";
import { DEFAULT_REACH } from "../world/picker";
import {
  createPlayer,
  DEFAULT_PLAYER_CONFIG,
  lookDirection,
} from "../player/player";
import { RemoteMonsters } from "./remote-monsters";
import { pickMonster, SWORD_DAMAGE, SWORD_REACH, type MonsterHit } from "./hit";
import type { MonsterSnapshot } from "./monster";

const snapshot = (
  overrides: Partial<MonsterSnapshot> = {},
): MonsterSnapshot => ({
  id: "m1_0_0_0",
  kind: "zombie",
  pose: { x: 0, y: 1.1, z: 0, yaw: 0, vx: 0, vz: 0 },
  hp: 20,
  maxHp: 20,
  state: "chase",
  wanderLeft: 0,
  cooldown: 0,
  owner: "me",
  authoritativeAt: 0,
  updatedAt: 0,
  ...overrides,
});

const hit = (result: MonsterHit | null): number | null =>
  result?.distance ?? null;

describe("sword reach and damage", () => {
  it("is 60% of the block placement reach", () => {
    expect(SWORD_REACH).toBeCloseTo(DEFAULT_REACH * 0.6);
  });

  it("kills a full-health zombie in three swings", () => {
    expect(Math.ceil(20 / SWORD_DAMAGE)).toBe(3);
  });
});

describe("pickMonster", () => {
  it("hits a monster the crosshair ray crosses", () => {
    const m = snapshot({ pose: { x: 0, y: 1.1, z: 0, yaw: 0, vx: 0, vz: 0 } });
    const result = pickMonster([0, 1.1, -2], [0, 0, 1], [m]);
    expect(result?.id).toBe(m.id);
    // the ray meets the body's near face, 0.45 short of the centre
    expect(hit(result)).toBeCloseTo(1.55, 6);
  });

  it("misses a monster off to the side of the ray", () => {
    // the zombie's body is 0.7 wide, so an offset of 0.75 clears it
    const m = snapshot({ pose: { x: 0, y: 1.1, z: 0, yaw: 0, vx: 0, vz: 0 } });
    expect(pickMonster([0.75, 1.1, -2], [0, 0, 1], [m])).toBeNull();
  });

  it("misses a monster beyond the sword's reach", () => {
    const m = snapshot({ pose: { x: 0, y: 1.1, z: 6, yaw: 0, vx: 0, vz: 0 } });
    expect(pickMonster([0, 1.1, 0], [0, 0, 1], [m])).toBeNull();
  });

  it("hits a monster inside the sword's reach", () => {
    const m = snapshot({ pose: { x: 0, y: 1.1, z: 5, yaw: 0, vx: 0, vz: 0 } });
    expect(pickMonster([0, 1.1, 0], [0, 0, 1], [m])).not.toBeNull();
  });

  it("counts a monster the ray starts inside as a hit at distance zero", () => {
    const m = snapshot({ pose: { x: 0, y: 1.1, z: 0, yaw: 0, vx: 0, vz: 0 } });
    expect(hit(pickMonster([0, 1.1, 0], [0, 0, 1], [m]))).toBe(0);
  });

  it("returns the nearest monster along the ray", () => {
    const near = snapshot({
      id: "m1_0_0_1",
      pose: { x: 0, y: 1.1, z: 2, yaw: 0, vx: 0, vz: 0 },
    });
    const far = snapshot({
      id: "m1_0_0_2",
      pose: { x: 0, y: 1.1, z: 4, yaw: 0, vx: 0, vz: 0 },
    });
    expect(pickMonster([0, 1.1, 0], [0, 0, 1], [far, near])?.id).toBe(near.id);
  });

  it("skips dead monsters", () => {
    const dead = snapshot({ hp: 0 });
    expect(pickMonster([0, 1.1, -1], [0, 0, 1], [dead])).toBeNull();
  });

  it("hits a zombie's centre whatever way it faces", () => {
    const facing = snapshot({
      pose: { x: 0, y: 1.1, z: 5, yaw: 0, vx: 0, vz: 0 },
    });
    const turned = snapshot({
      pose: { x: 0, y: 1.1, z: 5, yaw: Math.PI / 2, vx: 0, vz: 0 },
    });
    expect(pickMonster([0, 1.1, 0], [0, 0, 1], [facing])?.id).toBe(facing.id);
    expect(pickMonster([0, 1.1, 0], [0, 0, 1], [turned])?.id).toBe(turned.id);
  });

  it("rotates the body with the zombie's yaw", () => {
    // An offset of 0.6 is within the 0.7 shoulder span when the zombie faces
    // the ray, but past the 0.45 front-back when it is turned sideways.
    const facing = snapshot({
      pose: { x: 0, y: 1.1, z: 5, yaw: 0, vx: 0, vz: 0 },
    });
    const turned = snapshot({
      pose: { x: 0, y: 1.1, z: 5, yaw: Math.PI / 2, vx: 0, vz: 0 },
    });
    expect(pickMonster([0.6, 1.1, 0], [0, 0, 1], [facing])?.id).toBe(facing.id);
    expect(pickMonster([0.6, 1.1, 0], [0, 0, 1], [turned])).toBeNull();
  });
});

/** The ground height the standing tests stand on. */
const GROUND = 10;

/** A player whose feet are on the ground at `GROUND`, exactly as the avatar builds one. */
const standingPlayer = (
  x: number,
  z: number,
): ReturnType<typeof createPlayer> =>
  createPlayer(x, GROUND + DEFAULT_PLAYER_CONFIG.halfSize, z);

/** A zombie standing on the ground, cube centre at half its own height. */
const standingZombie = (
  x: number,
  z: number,
  overrides: Partial<MonsterSnapshot> = {},
): MonsterSnapshot =>
  snapshot({
    pose: {
      x,
      y: GROUND + 1.1,
      z,
      yaw: 0,
      vx: 0,
      vz: 0,
    },
    ...overrides,
  });

/** Turns the player to face `target`, the way the camera and crosshair do. */
const aimAt = (
  player: ReturnType<typeof createPlayer>,
  target: { x: number; y: number; z: number },
): void => {
  const dx = target.x - player.position.x;
  const dy = target.y - (player.position.y + DEFAULT_PLAYER_CONFIG.eyeHeight);
  const dz = target.z - player.position.z;
  player.yaw = Math.atan2(dx, dz);
  player.pitch = Math.asin(dy / Math.hypot(dx, dy, dz));
};

/** The crosshair ray, exactly as `createPlayerAvatar.look()` builds it. */
const crosshair = (
  player: ReturnType<typeof createPlayer>,
): {
  origin: [number, number, number];
  direction: [number, number, number];
} => ({
  origin: [
    player.position.x,
    player.position.y + DEFAULT_PLAYER_CONFIG.eyeHeight,
    player.position.z,
  ],
  direction: lookDirection(player),
});

describe("pickMonster from the player's crosshair", () => {
  it("hits a zombie ahead on the ground, aimed down at its body", () => {
    // The eye sits at ground + 1.9, a zombie's cube spans ground to
    // ground + 2.2, so aiming at its middle is a downward ray — the case a
    // level-forward ray never exercises.
    const player = standingPlayer(0, 0);
    const zombie = standingZombie(0, 5);
    aimAt(player, { x: zombie.pose.x, y: zombie.pose.y, z: zombie.pose.z });
    const { origin, direction } = crosshair(player);
    expect(direction[1]).toBeLessThan(0);
    expect(pickMonster(origin, direction, [zombie])?.id).toBe(zombie.id);
  });

  it("hits a zombie offset to the side, aimed at it diagonally", () => {
    const player = standingPlayer(0, 0);
    const zombie = standingZombie(-3, 4);
    aimAt(player, { x: zombie.pose.x, y: zombie.pose.y, z: zombie.pose.z });
    const { origin, direction } = crosshair(player);
    expect(pickMonster(origin, direction, [zombie])?.id).toBe(zombie.id);
  });

  it("hits the nearer zombie when two stand in front of the player", () => {
    const player = standingPlayer(0, 0);
    const near = standingZombie(0, 3, { id: "m1_0_0_1" });
    const far = standingZombie(0, 5, { id: "m1_0_0_2" });
    aimAt(player, { x: 0, y: GROUND + 1.1, z: 5 });
    const { origin, direction } = crosshair(player);
    expect(pickMonster(origin, direction, [far, near])?.id).toBe(near.id);
  });

  it("misses a zombie behind the player's back", () => {
    const player = standingPlayer(0, 0);
    player.yaw = 0;
    player.pitch = 0;
    const zombie = standingZombie(0, -5);
    const { origin, direction } = crosshair(player);
    expect(pickMonster(origin, direction, [zombie])).toBeNull();
  });
});

describe("pickMonster on rays with negative components", () => {
  it("hits a zombie below the ray's origin, looking straight down", () => {
    // Pre-fix, the slab test never swapped near and far on the y axis, so a
    // downward ray always missed.
    const zombie = standingZombie(0, 0);
    const result = pickMonster([0, GROUND + 4, 0], [0, -1, 0], [zombie]);
    expect(result?.id).toBe(zombie.id);
    // distance to the cube's top, GROUND + 2.2
    expect(hit(result)).toBeCloseTo(1.8, 6);
  });
});

describe("pickMonster against the rendered model", () => {
  const MODEL = new URL("../../public/models/zombie.zip", import.meta.url);

  it("covers the body the bundled model draws", async () => {
    const figure = await loadFigure(readFileSync(MODEL) as unknown as Blob);
    const m = standingZombie(0, 5);
    const render = new RemoteMonsters({ getMonsters: () => [m] });
    render.setFigure(figure);
    render.tick(1 / 60);

    // The figure the model is drawn as is always scaled to stand 2.2 units
    // tall, so the box its parts together fill matches the hitbox half-height
    // of 1.1 exactly.
    const copy = render.group.children[0] as unknown as {
      position: { y: number };
      scale: { y: number };
      children: {
        position: { y: number };
        scale: { y: number };
        geometry: { attributes: { position: { array: Float32Array } } };
      }[];
    };
    let highest = -Infinity;
    let lowest = Infinity;
    for (const mesh of copy.children) {
      const yValues = mesh.geometry.attributes.position.array.filter(
        (_v: number, i: number) => (i - 1) % 3 === 0,
      );
      highest = Math.max(
        highest,
        mesh.position.y + Math.max(...yValues) * mesh.scale.y,
      );
      lowest = Math.min(
        lowest,
        mesh.position.y + Math.min(...yValues) * mesh.scale.y,
      );
    }
    const boxTop = copy.position.y + highest * copy.scale.y;
    const boxBottom = copy.position.y + lowest * copy.scale.y;
    expect(boxTop).toBeCloseTo(m.pose.y + 1.1, 6);
    expect(boxBottom).toBeCloseTo(m.pose.y - 1.1, 6);

    // The visible voxel body sits inside that box, so the hitbox covers every
    // part of the model a player can aim at. The body's voxel rows map to
    // world offsets from the pose, which the hitbox half-height must span.
    const part = figure.parts[0];
    const dimensions = partDimensions(part);
    const { width, height, depth } = dimensions;
    const voxels = solveVoxels(dimensions, part.sides);
    let bodyMinY = height;
    let bodyMaxY = 0;
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const solid =
            (voxels[(z * width * height + y * width + x) * 4 + 3] &
              0b11000000) !==
            0;
          if (solid) {
            bodyMinY = Math.min(bodyMinY, y);
            bodyMaxY = Math.max(bodyMaxY, y);
          }
        }
      }
    }
    expect(bodyMaxY).toBeGreaterThan(bodyMinY);
    const bodyBottomOffset = -0.5 + (bodyMinY + 0.5) / height;
    const bodyTopOffset = -0.5 + (bodyMaxY + 0.5) / height;
    expect(bodyTopOffset).toBeLessThanOrEqual(1.1);
    expect(bodyBottomOffset).toBeGreaterThanOrEqual(-1.1);
  });
});
