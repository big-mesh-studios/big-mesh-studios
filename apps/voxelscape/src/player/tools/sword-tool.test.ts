// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { AimTarget } from "../../places/figure-pick";
import type { InputSnapshot } from "../create-input";
import type { EditingController } from "../editing-controller";
import type { VoxelPick } from "../../world/picker";
import {
  GUARD_POSE,
  GUARD_TIME,
  RECOVER_TIME,
  REST_POSE,
  SWING_TIME,
  swordPose,
  SwordTool,
  SWORD_DAMAGE,
  SWUNG_POSE,
} from "./sword-tool";
import type { ToolContext } from "./tool";

const actor = (overrides: Partial<AimTarget> = {}): AimTarget => ({
  id: "m1",
  x: 0,
  y: 0,
  z: -3,
  ...overrides,
});

const NO_VOXEL: VoxelPick = { target: null, place: null, distance: Infinity };

const buttons = (overrides: Partial<InputSnapshot> = {}): InputSnapshot => ({
  moveX: 0,
  moveY: 0,
  jump: false,
  jumpHeld: false,
  lookDx: 0,
  lookDy: 0,
  primary: false,
  click: false,
  secondary: false,
  secondaryHeld: false,
  secondaryReleased: false,
  use: false,
  select: null,
  wheel: 0,
  ...overrides,
});

const makeContext = (
  overrides: {
    voxel?: VoxelPick;
    actors?: AimTarget[];
  } = {},
) => {
  const breakBlock = vi.fn((): string | null => "broke Dirt at 0,0,0");
  const strike = vi.fn();
  const setGuarding = vi.fn();
  const ctx: ToolContext = {
    editing: {
      pick: () => overrides.voxel ?? NO_VOXEL,
      breakBlock,
    } as unknown as EditingController,
    look: () => ({ origin: [0, 1.1, 0], direction: [0, 0, -1] }),
    position: () => ({ x: 7, y: 0, z: 9 }),
    strikeables: () => overrides.actors ?? [],
    strike,
    setGuarding,
  };
  return { ctx, breakBlock, strike, setGuarding };
};

describe("swordPose", () => {
  it("rests, swings out, and recovers back to rest", () => {
    expect(swordPose("idle", 0, 0)).toEqual(REST_POSE);
    expect(swordPose("swing", 0, 0)).toEqual(REST_POSE);
    expect(swordPose("swing", 1, 0)).toEqual(SWUNG_POSE);
    expect(swordPose("recover", 0, 0)).toEqual(SWUNG_POSE);
    expect(swordPose("recover", 1, 0)).toEqual(REST_POSE);
  });

  it("raises the sword into the guard only while at rest", () => {
    expect(swordPose("idle", 0, 1)).toEqual(GUARD_POSE);
    // a raised guard does not bleed into a swing already under way
    expect(swordPose("swing", 0, 1)).toEqual(REST_POSE);
  });
});

describe("SwordTool.pick", () => {
  it("finds nothing when neither an actor nor a voxel is in front", () => {
    const { ctx } = makeContext();
    expect(new SwordTool(ctx).pick()).toEqual({
      primary: null,
      secondary: null,
    });
  });

  it("takes the actor when it is nearer than the voxel", () => {
    const { ctx } = makeContext({
      actors: [actor()],
      voxel: { target: [0, 0, -4], place: null, distance: 8 },
    });
    expect(new SwordTool(ctx).pick().primary).toMatchObject({
      kind: "actor",
      id: "m1",
    });
  });

  it("takes the voxel when a wall stands between the player and the actor", () => {
    const { ctx } = makeContext({
      actors: [actor()],
      voxel: { target: [0, 0, -1], place: null, distance: 1 },
    });
    expect(new SwordTool(ctx).pick().primary).toMatchObject({
      kind: "voxel",
      distance: 1,
    });
  });
});

describe("SwordTool.primary", () => {
  it("digs the voxel it is over", () => {
    const { ctx, breakBlock, strike } = makeContext({
      voxel: { target: [1, 2, 3], place: null, distance: 2 },
    });
    const tool = new SwordTool(ctx);
    expect(tool.primary(tool.pick())).toContain("broke");
    expect(breakBlock).toHaveBeenCalledWith([1, 2, 3]);
    expect(strike).not.toHaveBeenCalled();
  });

  it("strikes the actor it is over, from where the player stands", () => {
    const { ctx, strike } = makeContext({ actors: [actor()] });
    const tool = new SwordTool(ctx);
    tool.primary(tool.pick());
    expect(strike).toHaveBeenCalledWith("m1", SWORD_DAMAGE, 7, 9);
  });

  it("swings at nothing, so the animation plays whatever the press finds", () => {
    const { ctx } = makeContext();
    const tool = new SwordTool(ctx);
    expect(tool.primary(tool.pick())).toBeNull();
    expect(tool.pose()).toEqual(REST_POSE);
    tool.update(SWING_TIME / 2, buttons());
    expect(tool.pose()).not.toEqual(REST_POSE);
  });
});

describe("SwordTool guard", () => {
  it("raises on a held secondary and lowers when it is let go", () => {
    const { ctx, setGuarding } = makeContext();
    const tool = new SwordTool(ctx);
    tool.update(GUARD_TIME, buttons({ secondaryHeld: true }));
    expect(setGuarding).toHaveBeenLastCalledWith(true);
    expect(tool.pose()).toEqual(GUARD_POSE);
    tool.update(GUARD_TIME, buttons({ secondaryHeld: false }));
    expect(setGuarding).toHaveBeenLastCalledWith(false);
    expect(tool.pose()).toEqual(REST_POSE);
  });

  it("reports the guard only when it changes", () => {
    const { ctx, setGuarding } = makeContext();
    const tool = new SwordTool(ctx);
    for (let i = 0; i < 4; i++) {
      tool.update(0.01, buttons({ secondaryHeld: true }));
    }
    expect(setGuarding).toHaveBeenCalledTimes(1);
  });

  it("drops while a swing runs, so a swing is never guarded through", () => {
    const { ctx, setGuarding } = makeContext();
    const tool = new SwordTool(ctx);
    tool.update(GUARD_TIME, buttons({ secondaryHeld: true }));
    tool.primary(tool.pick());
    tool.update(0.01, buttons({ secondaryHeld: true }));
    expect(setGuarding).toHaveBeenLastCalledWith(false);
  });

  it("lowers when the sword is put away mid-guard", () => {
    const { ctx, setGuarding } = makeContext();
    const tool = new SwordTool(ctx);
    tool.update(GUARD_TIME, buttons({ secondaryHeld: true }));
    tool.stow();
    expect(setGuarding).toHaveBeenLastCalledWith(false);
    expect(tool.pose()).toEqual(REST_POSE);
  });
});

describe("SwordTool.update", () => {
  it("runs a swing through to recovery and back to rest", () => {
    const { ctx } = makeContext();
    const tool = new SwordTool(ctx);
    tool.primary(tool.pick());
    tool.update(SWING_TIME, buttons());
    expect(tool.pose()).toEqual(SWUNG_POSE);
    tool.update(RECOVER_TIME, buttons());
    expect(tool.pose()).toEqual(REST_POSE);
  });
});
