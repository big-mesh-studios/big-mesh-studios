// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { InputSnapshot } from "./create-input";
import {
  createPlayer,
  DEFAULT_PLAYER_CONFIG,
  deathCameraPose,
  updatePlayer,
  type Player,
  type PlayerWorld,
} from "./player";

const NO_INPUT: InputSnapshot = {
  moveX: 0,
  moveY: 0,
  jump: false,
  jumpHeld: false,
  lookDx: 0,
  lookDy: 0,
  primary: false,
  secondary: false,
  secondaryHeld: false,
  secondaryReleased: false,
  select: null,
  wheel: 0,
};

const NO_WATER = () => false;

/**
 * A world shaped like a heightmap: solid everywhere below the surface the
 * given function returns, open air above it.
 */
const terrainOf = (
  heightAt: (x: number, z: number) => number,
): PlayerWorld => ({
  groundHeightAt: (x, _y, z) => heightAt(x, z),
  inWaterAt: NO_WATER,
  solidAt: (x, y, z) => y < heightAt(x, z),
  halfExtent: 1e9,
});

const FLAT = terrainOf(() => 0);
const FAR_GROUND = terrainOf(() => -1000);

/** Walks the player forward for `frames`, facing +X, optionally holding jump. */
const walkEast = (
  player: Player,
  world: PlayerWorld,
  frames: number,
  jumpHeld: boolean = false,
): void => {
  player.yaw = Math.PI / 2;
  for (let i = 0; i < frames; i++) {
    updatePlayer(player, 1 / 60, { ...NO_INPUT, moveY: 1, jumpHeld }, world);
  }
};

describe("updatePlayer horizontal speed ramp", () => {
  it("builds up to the configured speed gradually instead of snapping to it", () => {
    const player = createPlayer(0, 0, 0);
    const speedAt = (): number => Math.hypot(player.vx, player.vz);
    updatePlayer(player, 1 / 60, { ...NO_INPUT, moveY: 1 }, FAR_GROUND);
    // one frame in, still well short of full speed
    expect(speedAt()).toBeGreaterThan(0);
    expect(speedAt()).toBeLessThan(DEFAULT_PLAYER_CONFIG.speed);

    for (let i = 0; i < 60; i++) {
      updatePlayer(player, 1 / 60, { ...NO_INPUT, moveY: 1 }, FAR_GROUND);
    }
    // held long enough, it reaches (and doesn't overshoot) full speed
    expect(speedAt()).toBeCloseTo(DEFAULT_PLAYER_CONFIG.speed, 5);
  });

  it("decelerates back down instead of stopping instantly when input releases", () => {
    const player = createPlayer(0, 0, 0);
    for (let i = 0; i < 60; i++) {
      updatePlayer(player, 1 / 60, { ...NO_INPUT, moveY: 1 }, FAR_GROUND);
    }
    expect(Math.hypot(player.vx, player.vz)).toBeCloseTo(
      DEFAULT_PLAYER_CONFIG.speed,
      5,
    );

    updatePlayer(player, 1 / 60, NO_INPUT, FAR_GROUND);
    const speedAfterOneFrame = Math.hypot(player.vx, player.vz);
    expect(speedAfterOneFrame).toBeGreaterThan(0);
    expect(speedAfterOneFrame).toBeLessThan(DEFAULT_PLAYER_CONFIG.speed);

    for (let i = 0; i < 60; i++) {
      updatePlayer(player, 1 / 60, NO_INPUT, FAR_GROUND);
    }
    expect(Math.hypot(player.vx, player.vz)).toBeCloseTo(0, 5);
  });
});

describe("updatePlayer walking into terrain it can't climb", () => {
  const CLIFF_TOP = 50;
  // flat ground up to x=0, then a sheer face rising far above the player
  const CLIFF = terrainOf((x) => (x >= 0 ? CLIFF_TOP : 0));

  it("stops at a cliff face instead of being lifted up onto its top", () => {
    const player = createPlayer(-3, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    walkEast(player, CLIFF, 120);
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
    // held outside the cliff by the width of the collision box
    expect(player.position.x).toBeLessThan(0);
    expect(player.position.x).toBeCloseTo(
      -DEFAULT_PLAYER_CONFIG.collisionRadius,
      2,
    );
  });

  it("walks under an overhang rather than popping up onto its roof", () => {
    const ROOF = 7;
    const SLAB_BOTTOM = 3;
    // a floor at 0 everywhere, with a slab of rock hanging over x >= 0
    const overhang: PlayerWorld = {
      groundHeightAt: (x, y) => (x >= 0 && y >= SLAB_BOTTOM ? ROOF : 0),
      inWaterAt: NO_WATER,
      solidAt: (x, y) => y < 0 || (x >= 0 && y >= SLAB_BOTTOM && y < ROOF),
      halfExtent: 1e9,
    };
    const player = createPlayer(-3, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    walkEast(player, overhang, 120);
    expect(player.position.x).toBeGreaterThan(0);
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
  });

  it("does not strand the player mid-air when they jump into an overhang", () => {
    const ROOF = 6;
    const SLAB_BOTTOM = 3;
    const lowTunnel: PlayerWorld = {
      groundHeightAt: (_x, y) => (y >= SLAB_BOTTOM ? ROOF : 0),
      inWaterAt: NO_WATER,
      solidAt: (_x, y) => y < 0 || (y >= SLAB_BOTTOM && y < ROOF),
      halfExtent: 1e9,
    };
    const player = createPlayer(0, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    // one settling frame: jumping needs the player to be on the ground first
    updatePlayer(player, 1 / 60, NO_INPUT, lowTunnel);
    updatePlayer(player, 1 / 60, { ...NO_INPUT, jump: true }, lowTunnel);
    expect(player.position.y).toBeGreaterThan(DEFAULT_PLAYER_CONFIG.halfSize);
    for (let i = 0; i < 60; i++) {
      updatePlayer(player, 1 / 60, NO_INPUT, lowTunnel);
    }
    // back on the floor under the slab, not floating against its underside
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
    expect(player.onGround).toBe(true);
  });
});

describe("updatePlayer climbing out of a shaft", () => {
  // a shaft dug straight down: floor at 0 within a voxel either side of
  // x=0, with the ground it was dug out of standing 6 units above that
  const SHAFT_DEPTH = 6;
  const SHAFT = terrainOf((x) => (Math.abs(x) < 1 ? 0 : SHAFT_DEPTH));

  it("climbs the wall and gets out when jump is held", () => {
    const player = createPlayer(0, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    walkEast(player, SHAFT, 240, true);
    expect(player.position.y).toBeCloseTo(
      SHAFT_DEPTH + DEFAULT_PLAYER_CONFIG.halfSize,
      5,
    );
    expect(player.position.x).toBeGreaterThan(1);
    expect(player.onGround).toBe(true);
  });

  it("stays at the bottom when jump isn't held, so walls still stop the player", () => {
    const player = createPlayer(0, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    walkEast(player, SHAFT, 240);
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
    expect(player.position.x).toBeLessThan(1);
  });

  it("falls back down when jump is released partway up", () => {
    const player = createPlayer(0, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    walkEast(player, SHAFT, 12, true);
    const partway = player.position.y;
    expect(partway).toBeGreaterThan(DEFAULT_PLAYER_CONFIG.halfSize);
    expect(partway).toBeLessThan(SHAFT_DEPTH);
    walkEast(player, SHAFT, 120);
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
  });
});

describe("updatePlayer stepping and falling", () => {
  it("steps up onto a rise one voxel tall and keeps walking", () => {
    const step = terrainOf((x) =>
      x >= 0 ? DEFAULT_PLAYER_CONFIG.stepHeight : 0,
    );
    const player = createPlayer(-3, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    walkEast(player, step, 120);
    expect(player.position.x).toBeGreaterThan(0);
    expect(player.position.y).toBeCloseTo(
      DEFAULT_PLAYER_CONFIG.stepHeight + DEFAULT_PLAYER_CONFIG.halfSize,
      5,
    );
  });

  it("walks off a ledge and lands on the ground below", () => {
    const LEDGE = 20;
    const drop = terrainOf((x) => (x < 0 ? LEDGE : 0));
    const player = createPlayer(-3, LEDGE + DEFAULT_PLAYER_CONFIG.halfSize, 0);
    walkEast(player, drop, 120);
    expect(player.position.x).toBeGreaterThan(0);
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
    expect(player.onGround).toBe(true);
  });

  it("still lands after a fall long enough to cover many voxels per frame", () => {
    const player = createPlayer(0, 100, 0);
    for (let i = 0; i < 300; i++) {
      updatePlayer(player, 1 / 60, NO_INPUT, FLAT);
    }
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
    expect(player.onGround).toBe(true);
  });
});

describe("updatePlayer falling through water and air", () => {
  const fallFor = (world: PlayerWorld, frames: number): number => {
    const player = createPlayer(0, 50, 0);
    for (let i = 0; i < frames; i++) {
      updatePlayer(player, 1 / 60, NO_INPUT, world);
    }
    return 50 - player.position.y;
  };

  it("sinks slowly in water and falls at full gravity out of it", () => {
    const submerged: PlayerWorld = { ...FLAT, inWaterAt: () => true };
    const dropped = fallFor(FLAT, 30);
    expect(dropped).toBeGreaterThan(fallFor(submerged, 30) * 4);
  });

  it("falls normally down a dry shaft, however deep it was dug", () => {
    // The player's own mining is what used to break this: whether they were
    // in water was inferred from how the terrain generator would have filled
    // the column, so a shaft dug below sea level counted as flooded.
    const SHAFT_FLOOR = -40;
    const shaft = terrainOf((x) => (Math.abs(x) < 1 ? SHAFT_FLOOR : 0));
    const player = createPlayer(0, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    for (let i = 0; i < 60; i++) {
      updatePlayer(player, 1 / 60, NO_INPUT, shaft);
    }
    // one second of free fall: full gravity as the speed, and half of
    // gravity times the second squared as the distance
    expect(player.vy).toBeCloseTo(-DEFAULT_PLAYER_CONFIG.gravity, 0);
    expect(DEFAULT_PLAYER_CONFIG.halfSize - player.position.y).toBeCloseTo(
      DEFAULT_PLAYER_CONFIG.gravity / 2,
      0,
    );
  });
});

describe("updatePlayer ground sampling near a narrow tunnel wall", () => {
  // A tunnel one unit either side of x=0 (floor height 0); everywhere else
  // is a much taller wall (height 50) — standing right at the tunnel's edge
  // means the exact centre point sits close to the wall's own column.
  const TUNNEL_HALF_WIDTH = 1;
  const TUNNEL = terrainOf((x) => (Math.abs(x) < TUNNEL_HALF_WIDTH ? 0 : 50));

  it("stays on the tunnel floor instead of catapulting onto the wall beside it", () => {
    // the exact centre point has drifted just past the tunnel's boundary —
    // a single-point sample here would land on the wall, not the tunnel
    const edgeX = TUNNEL_HALF_WIDTH + 0.05;
    const player = createPlayer(edgeX, DEFAULT_PLAYER_CONFIG.halfSize, 0);
    updatePlayer(player, 1 / 60, NO_INPUT, TUNNEL);
    expect(player.position.y).toBeCloseTo(DEFAULT_PLAYER_CONFIG.halfSize, 5);
  });

  it("still finds the wall's own top when standing well away from the tunnel", () => {
    const player = createPlayer(
      TUNNEL_HALF_WIDTH + 5,
      50 + DEFAULT_PLAYER_CONFIG.halfSize,
      0,
    );
    updatePlayer(player, 1 / 60, NO_INPUT, TUNNEL);
    expect(player.position.y).toBeCloseTo(
      50 + DEFAULT_PLAYER_CONFIG.halfSize,
      5,
    );
  });
});

describe("updatePlayer flying", () => {
  it("climbs along the look direction instead of falling, over empty space", () => {
    const player = createPlayer(0, 100, 0);
    player.flying = true;
    player.yaw = Math.PI / 2; // facing +X
    player.pitch = 0.6; // looking up
    for (let i = 0; i < 120; i++) {
      updatePlayer(player, 1 / 60, { ...NO_INPUT, moveY: 1 }, FAR_GROUND);
    }
    expect(player.position.y).toBeGreaterThan(100);
    expect(player.position.x).toBeGreaterThan(0);
  });

  it("holds altitude over empty space with no input", () => {
    const player = createPlayer(0, 100, 0);
    player.flying = true;
    for (let i = 0; i < 120; i++) {
      updatePlayer(player, 1 / 60, NO_INPUT, FAR_GROUND);
    }
    expect(player.position.y).toBe(100);
  });

  it("stops against the ground when flying down into it", () => {
    const player = createPlayer(0, 10, 0);
    player.flying = true;
    player.yaw = Math.PI / 2;
    player.pitch = -0.6; // looking down
    for (let i = 0; i < 600; i++) {
      updatePlayer(player, 1 / 60, { ...NO_INPUT, moveY: 1 }, FLAT);
    }
    // the collision box bottoms out at the surface (feet on the ground)
    expect(player.position.y).toBeGreaterThanOrEqual(1);
    expect(player.position.y).toBeLessThan(2);
  });
});

describe("deathCameraPose", () => {
  const GROUND = 4;

  const makePlayer = (overrides: Partial<Player> = {}): Player => {
    const player = createPlayer(0, GROUND + DEFAULT_PLAYER_CONFIG.halfSize, 0);
    return { ...player, ...overrides };
  };

  it("holds the standing eye and pitch at progress zero", () => {
    const player = makePlayer({ yaw: Math.PI / 2, pitch: 0.3 });
    const pose = deathCameraPose(0, player);
    expect(pose.position[0]).toBe(0);
    expect(pose.position[1]).toBe(GROUND + DEFAULT_PLAYER_CONFIG.eyeHeight);
    expect(pose.position[2]).toBe(0);
    expect(pose.pitch).toBeCloseTo(0.3, 10);
  });

  it("sweeps the eye down to the ground and the view up to the sky at progress one", () => {
    const player = makePlayer({ yaw: 0, pitch: 0 });
    const pose = deathCameraPose(1, player);
    // fallen backward along the heading, the eye ends at the feet on the ground
    expect(pose.position[1]).toBeCloseTo(GROUND, 5);
    expect(pose.position[2]).toBeCloseTo(-DEFAULT_PLAYER_CONFIG.eyeHeight, 5);
    expect(pose.position[0]).toBeCloseTo(0, 5);
    expect(pose.pitch).toBeCloseTo(Math.PI / 2, 5);
  });

  it("tips backward along the heading, not sideways", () => {
    const player = makePlayer({ yaw: Math.PI / 2, pitch: 0 });
    const pose = deathCameraPose(1, player);
    expect(pose.position[0]).toBeCloseTo(-DEFAULT_PLAYER_CONFIG.eyeHeight, 5);
    expect(pose.position[2]).toBeCloseTo(0, 5);
  });

  it("clamps progress outside 0..1", () => {
    const player = makePlayer({ pitch: 0.1 });
    expect(deathCameraPose(-1, player).position[1]).toBe(
      deathCameraPose(0, player).position[1],
    );
    expect(deathCameraPose(2, player).position[1]).toBe(
      deathCameraPose(1, player).position[1],
    );
  });
});
