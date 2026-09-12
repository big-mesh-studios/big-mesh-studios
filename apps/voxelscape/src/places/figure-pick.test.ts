// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FIGURE_REACH, pickFigure, pickNpc } from "./figure-pick";

const npc = (
  id: string,
  x: number,
  z: number,
  y = 0,
): { id: string; x: number; y: number; z: number } => ({ id, x, y, z });

const eye = [4, 1.6, 0] as [number, number, number];

describe("pickNpc", () => {
  it("picks the nearest NPC the crosshair crosses", () => {
    const hit = pickNpc(
      eye,
      [-1, 0, 0],
      [npc("far", 1, 0), npc("near", 2.5, 0)],
    );
    expect(hit?.id).toBe("near");
    expect(hit?.distance).toBeCloseTo(0.9, 5);
  });

  it("misses an NPC that is out of reach", () => {
    expect(
      pickNpc(eye, [-1, 0, 0], [npc("gone", eye[0] - (FIGURE_REACH + 1), 0)]),
    ).toBeNull();
  });

  it("misses an NPC the ray does not cross", () => {
    expect(pickNpc(eye, [-1, 0, 0], [npc("side", 2, 2)])).toBeNull();
  });

  it("hits an NPC whose body the eye already stands inside", () => {
    const inside = npc("close", 4, 0);
    const hit = pickNpc([4, 1, 0], [0, 0, -1], [inside]);
    expect(hit?.id).toBe("close");
    expect(hit?.distance).toBe(0);
  });

  it("misses a body when the ray passes above its head", () => {
    const short = npc("short", 4, 0);
    expect(pickNpc([4, 2.6, 0], [0, 0, -1], [short])).toBeNull();
  });
});

describe("pickFigure", () => {
  it("uses a wider body when the figure's model is wider", () => {
    const fridge = { id: "fridge", x: 2.5, y: 0, z: 0, half: 1.2, height: 3 };
    // A ray down the side of the default body but inside the fridge's box.
    expect(pickFigure([4, 1.6, 1.1], [-1, 0, 0], [fridge])?.id).toBe("fridge");
    expect(
      pickFigure([4, 1.6, 1.1], [-1, 0, 0], [npc("npc", 2.5, 0)]),
    ).toBeNull();
  });

  it("tests the body in its own turned frame, not the world axes", () => {
    const origin: [number, number, number] = [1.3, 1, -3];
    const direction: [number, number, number] = [0, 0, 1];
    const facing = { id: "turned", x: 0, y: 1, z: 0, half: 1, height: 2 };
    // The ray runs a constant 1.3 units clear of the untouched, axis-aligned
    // body — outside its half-width of 1 on every side.
    expect(pickFigure(origin, direction, [facing])).toBeNull();
    // Turned a further eighth-turn, the same square body's corner swings into
    // the ray's path.
    const hit = pickFigure(origin, direction, [
      { ...facing, yaw: Math.PI / 4 },
    ]);
    expect(hit?.id).toBe("turned");
    expect(hit?.distance).toBeGreaterThan(0);
  });
});
