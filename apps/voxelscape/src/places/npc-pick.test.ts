// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NPC_TALK_REACH, pickNpc } from "./npc-pick";

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
      pickNpc(eye, [-1, 0, 0], [npc("gone", eye[0] - (NPC_TALK_REACH + 1), 0)]),
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
