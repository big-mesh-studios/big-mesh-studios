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
