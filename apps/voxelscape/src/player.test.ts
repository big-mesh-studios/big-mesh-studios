// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createPlayer, updatePlayer, PLAYER_CFG } from "./player";
import type { InputSnapshot } from "./input";

const NO_INPUT: InputSnapshot = {
  moveX: 0,
  moveY: 0,
  jump: false,
  jumpHeld: false,
  lookDx: 0,
  lookDy: 0,
  break: false,
  place: false,
  select: null,
};

const FAR_GROUND = () => -1000;
const NO_WATER = () => -Infinity;

describe("updatePlayer horizontal speed ramp", () => {
  it("builds up to the configured speed gradually instead of snapping to it", () => {
    const player = createPlayer(0, 0, 0);
    const speedAt = (): number => Math.hypot(player.vx, player.vz);
    updatePlayer(
      player,
      1 / 60,
      { ...NO_INPUT, moveY: 1 },
      FAR_GROUND,
      NO_WATER,
      1e9,
    );
    // one frame in, still well short of full speed
    expect(speedAt()).toBeGreaterThan(0);
    expect(speedAt()).toBeLessThan(PLAYER_CFG.speed);

    for (let i = 0; i < 60; i++) {
      updatePlayer(
        player,
        1 / 60,
        { ...NO_INPUT, moveY: 1 },
        FAR_GROUND,
        NO_WATER,
        1e9,
      );
    }
    // held long enough, it reaches (and doesn't overshoot) full speed
    expect(speedAt()).toBeCloseTo(PLAYER_CFG.speed, 5);
  });

  it("decelerates back down instead of stopping instantly when input releases", () => {
    const player = createPlayer(0, 0, 0);
    for (let i = 0; i < 60; i++) {
      updatePlayer(
        player,
        1 / 60,
        { ...NO_INPUT, moveY: 1 },
        FAR_GROUND,
        NO_WATER,
        1e9,
      );
    }
    expect(Math.hypot(player.vx, player.vz)).toBeCloseTo(PLAYER_CFG.speed, 5);

    updatePlayer(player, 1 / 60, NO_INPUT, FAR_GROUND, NO_WATER, 1e9);
    const speedAfterOneFrame = Math.hypot(player.vx, player.vz);
    expect(speedAfterOneFrame).toBeGreaterThan(0);
    expect(speedAfterOneFrame).toBeLessThan(PLAYER_CFG.speed);

    for (let i = 0; i < 60; i++) {
      updatePlayer(player, 1 / 60, NO_INPUT, FAR_GROUND, NO_WATER, 1e9);
    }
    expect(Math.hypot(player.vx, player.vz)).toBeCloseTo(0, 5);
  });
});

describe("updatePlayer ground sampling near a narrow tunnel wall", () => {
  // A tunnel one unit either side of x=0 (floor height 0); everywhere else
  // is a much taller wall (height 50) — standing right at the tunnel's edge
  // means the exact centre point sits close to the wall's own column.
  const TUNNEL_HALF_WIDTH = 1;
  const tunnelGround = (x: number): number =>
    Math.abs(x) < TUNNEL_HALF_WIDTH ? 0 : 50;

  it("stays on the tunnel floor instead of catapulting onto the wall beside it", () => {
    // the exact centre point has drifted just past the tunnel's boundary —
    // a single-point sample here would land on the wall, not the tunnel
    const edgeX = TUNNEL_HALF_WIDTH + 0.05;
    const player = createPlayer(edgeX, PLAYER_CFG.halfSize, 0);
    updatePlayer(
      player,
      1 / 60,
      NO_INPUT,
      (x) => tunnelGround(x),
      NO_WATER,
      1e9,
    );
    expect(player.position.y).toBeCloseTo(PLAYER_CFG.halfSize, 5);
  });

  it("still finds the wall's own top when standing well away from the tunnel", () => {
    const player = createPlayer(
      TUNNEL_HALF_WIDTH + 5,
      50 + PLAYER_CFG.halfSize,
      0,
    );
    updatePlayer(
      player,
      1 / 60,
      NO_INPUT,
      (x) => tunnelGround(x),
      NO_WATER,
      1e9,
    );
    expect(player.position.y).toBeCloseTo(50 + PLAYER_CFG.halfSize, 5);
  });
});
