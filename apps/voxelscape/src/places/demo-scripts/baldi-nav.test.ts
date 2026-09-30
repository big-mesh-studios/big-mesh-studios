// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NAV_NODES, navPath, nearestNavNode } from "./baldi-nav";

const indexOf = (id: string): number =>
  NAV_NODES.findIndex((node) => node.id === id);

describe("the school's navigation graph", () => {
  it("snaps a point to the nearest node", () => {
    expect(indexOf("hub")).toBe(nearestNavNode(0, 0));
    expect(indexOf("r-library")).toBe(nearestNavNode(-118, -50));
    expect(indexOf("d-office")).toBe(nearestNavNode(122, -10));
  });

  it("routes from the crossing to a room through that room's door", () => {
    const path = navPath(indexOf("hub"), indexOf("r-cafeteria"));
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toBe(indexOf("hub"));
    expect(path).toContain(indexOf("d-cafeteria"));
    expect(path[path.length - 1]).toBe(indexOf("r-cafeteria"));
  });

  it("routes between two rooms through the halls, never directly", () => {
    const path = navPath(indexOf("r-library"), indexOf("r-detention"));
    // Library -> its door -> the hall -> ... -> the detention door.
    expect(path[0]).toBe(indexOf("r-library"));
    expect(path).toContain(indexOf("d-library"));
    expect(path).toContain(indexOf("d-detention"));
    expect(path[path.length - 1]).toBe(indexOf("r-detention"));
    // Every step is an edge, so no step jumps across the school.
    for (let i = 1; i < path.length; i++) {
      const a = NAV_NODES[path[i - 1]];
      const b = NAV_NODES[path[i]];
      const straight =
        (a.x === b.x && a.z !== b.z) || (a.z === b.z && a.x !== b.x);
      expect(straight).toBe(true);
    }
  });

  it("reaches every node from the centre", () => {
    const from = indexOf("hub");
    for (let at = 0; at < NAV_NODES.length; at++) {
      expect(navPath(from, at).length).toBeGreaterThan(0);
    }
  });

  it("keeps every node inside the building's walls", () => {
    for (const node of NAV_NODES) {
      expect(Math.abs(node.x)).toBeLessThanOrEqual(180);
      expect(Math.abs(node.z)).toBeLessThanOrEqual(108);
    }
  });
});
