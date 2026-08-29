// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RemoteMonsters } from "./remote-monsters";
import type { MonsterSnapshot } from "./monster";

/** Half the box a corpse pivots about; pose.y minus this is the ground. */
const HALF_HEIGHT = 1.1;
const GROUND = 10;

const snapshot = (
  hp: number,
  overrides: Partial<MonsterSnapshot> = {},
): MonsterSnapshot => ({
  id: "m1_0_0_0",
  kind: "zombie",
  pose: {
    x: 0,
    y: GROUND + HALF_HEIGHT,
    z: 5,
    yaw: 0,
    vx: 0,
    vz: 0,
  },
  hp,
  maxHp: 20,
  state: "attack",
  wanderLeft: 0,
  cooldown: 0,
  owner: "me",
  authoritativeAt: 0,
  updatedAt: Date.now(),
  ...overrides,
});

const makeRender = (snapshots: MonsterSnapshot[]): RemoteMonsters =>
  new RemoteMonsters({ getMonsters: () => snapshots });

const cube = (
  render: RemoteMonsters,
): {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
} => render.group.children[0] as never;

describe("remote monsters death animation", () => {
  it("falls a dead monster over half a second, lies it out, then removes it", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);
    expect(render.size).toBe(1);
    expect(render.group.children.length).toBe(1);

    snapshots[0] = snapshot(0);
    render.tick(1 / 60);
    // the corpse leaves the live set but the mesh stays to animate
    expect(render.size).toBe(0);
    expect(render.group.children.length).toBe(1);

    // by half a second it has fallen flat: rotated a quarter turn back
    render.tick(0.5 - 1 / 60);
    expect(cube(render).rotation.x).toBeCloseTo(-Math.PI / 2, 5);
    // and it lies with its centre on the ground, feet having stayed planted
    expect(cube(render).position.y).toBeCloseTo(GROUND, 5);

    // after the remaining half second it is gone
    render.tick(0.5);
    expect(render.group.children.length).toBe(0);
  });

  it("keeps a corpse animating after its snapshot is forgotten", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);

    snapshots[0] = snapshot(0);
    render.tick(1 / 60);
    snapshots.length = 0; // the controller forgot it once the tombstone was written
    render.tick(0.3);
    expect(render.group.children.length).toBe(1);
    expect(cube(render).rotation.x).toBeLessThan(0);

    render.tick(0.8);
    expect(render.group.children.length).toBe(0);
  });

  it("removes a monster that leaves the area without a corpse", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);
    expect(render.group.children.length).toBe(1);

    snapshots.length = 0; // the monster walked out of the window, alive
    render.tick(1 / 60);
    expect(render.group.children.length).toBe(0);
  });

  it("does not re-animate a corpse whose dead snapshot lingers", () => {
    const snapshots = [snapshot(20)];
    const render = makeRender(snapshots);
    render.tick(1 / 60);

    snapshots[0] = snapshot(0);
    render.tick(1 / 60);
    // the dead snapshot outlives the animation (the tombstone write was slow)
    render.tick(1);
    expect(render.group.children.length).toBe(0);
    render.tick(1 / 60);
    expect(render.group.children.length).toBe(0);
  });
});
