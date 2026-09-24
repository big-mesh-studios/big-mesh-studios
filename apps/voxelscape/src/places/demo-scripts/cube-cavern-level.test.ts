// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  FLOORS_PER_RUN,
  GRID,
  THEMES,
  buildFloor,
  hubShapes,
  type FloorPlan,
  type ThemeId,
} from "./cube-cavern-level";

/** Every cell index reachable from the entrance over the floor's doorways. */
const reachable = (plan: FloorPlan): Set<number> => {
  const adjacency = new Map<number, number[]>();
  for (const key of plan.connections) {
    const [a, b] = key.split("-").map(Number);
    adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
  }
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    for (const next of adjacency.get(cell) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
};

describe("the Cube Cavern floors", () => {
  it("lays the same floor for the same seed and floor", () => {
    const a = buildFloor(1_234, 2, "yellow");
    const b = buildFloor(1_234, 2, "yellow");
    expect(a.shapes).toEqual(b.shapes);
    expect(a.enemySpawns).toEqual(b.enemySpawns);
    expect(a.connections).toEqual(b.connections);
  });

  it("lays a different floor for a different seed", () => {
    const a = buildFloor(1, 1, "yellow");
    const b = buildFloor(99, 1, "yellow");
    expect(JSON.stringify(a.shapes)).not.toBe(JSON.stringify(b.shapes));
  });

  it("joins every room of a floor to the entrance", () => {
    for (const floor of [1, 2, 3]) {
      const plan = buildFloor(7, floor, "yellow");
      expect(plan.rooms).toHaveLength(GRID * GRID);
      expect(plan.connections.length).toBeGreaterThanOrEqual(GRID * GRID - 1);
      expect(reachable(plan).size).toBe(GRID * GRID);
    }
  });

  it("puts the entrance, the shop and the exit on different rooms", () => {
    const plan = buildFloor(42, 1, "yellow");
    const keys = new Set([
      `${plan.entrance.x},${plan.entrance.z}`,
      `${plan.shop.x},${plan.shop.z}`,
      `${plan.exit.x},${plan.exit.z}`,
    ]);
    expect(keys.size).toBe(3);
  });

  it("paves every floor with its theme's enemies and some torches", () => {
    const plan = buildFloor(5, 1, "yellow");
    expect(plan.shapes.length).toBeGreaterThan(0);
    expect(plan.torchSpawns.length).toBeGreaterThan(0);
    expect(plan.enemySpawns.length).toBeGreaterThan(0);
    expect(plan.enemySpawns.every((s) => s.kind.id.length > 0)).toBe(true);
  });

  it("gives every theme an enemy pool and a rare brute", () => {
    for (const id of Object.keys(THEMES) as ThemeId[]) {
      const theme = THEMES[id];
      expect(theme.enemies.length).toBeGreaterThan(0);
      expect(theme.mega.health).toBeGreaterThan(theme.enemies[0].health);
    }
    expect(THEMES.yellow.boss).toBe(true);
  });

  it("counts three floors to a run", () => {
    expect(FLOORS_PER_RUN).toBe(3);
  });

  it("lays a hub with a floor and four walls", () => {
    const shapes = hubShapes();
    expect(shapes.some((shape) => shape.kind === "surface")).toBe(true);
    expect(
      shapes.filter((shape) => shape.kind === "box").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("grades the whole cavern site inside the streamed window", () => {
    const surfaces = hubShapes().flatMap((shape) =>
      shape.kind === "surface" &&
      shape.min !== undefined &&
      shape.max !== undefined
        ? [{ min: shape.min, max: shape.max }]
        : [],
    );
    for (const floor of [1, 2, 3]) {
      const plan = buildFloor(3, floor, "yellow");
      // The site must sit within the world's stream radius (four 128-unit
      // chunks) of the spawn, or the player is moved onto unloaded ground.
      const reach = Math.max(
        Math.hypot(plan.entrance.x, plan.entrance.z),
        Math.hypot(plan.exit.x, plan.exit.z),
      );
      expect(reach).toBeLessThan(4 * 128);
      // The boot plan already grades that ground flat.
      const covered = surfaces.some(
        (box) =>
          plan.exit.x / 2 >= box.min[0] &&
          plan.exit.x / 2 <= box.max[0] &&
          plan.exit.z / 2 >= box.min[2] &&
          plan.exit.z / 2 <= box.max[2],
      );
      expect(covered).toBe(true);
    }
  });
});
