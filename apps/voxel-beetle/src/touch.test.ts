import { describe, expect, it } from "vitest";
import { gestureFor } from "./touch";
import type { ModeKind } from "./types";

const painting: ModeKind[] = ["Draw", "Fill", "Rectangle", "Pick"];

describe("gestureFor", () => {
  it("draws with every tool that puts voxels in", () => {
    for (const mode of painting) {
      expect(gestureFor(mode, 0, "mouse")).toBe("paint");
      expect(gestureFor(mode, 1, "touch")).toBe("paint");
    }
  });

  it("moves the view with nothing in hand, whatever the pointer", () => {
    expect(gestureFor("Idle", 0, "mouse")).toBe("pan");
    expect(gestureFor("Idle", 1, "touch")).toBe("pan");
  });

  it("moves the view as soon as a second finger is down, whatever the tool", () => {
    // A pinch cannot mean to draw, and a second finger has nothing to add to a
    // stroke that is already running.
    for (const mode of ["Idle", ...painting] as ModeKind[]) {
      expect(gestureFor(mode, 2, "touch")).toBe("pan");
      expect(gestureFor(mode, 3, "touch")).toBe("pan");
    }
  });

  it("draws with the first finger of a paint tool, so a stroke is never half-panned", () => {
    for (const mode of painting) {
      expect(gestureFor(mode, 1, "touch")).toBe("paint");
    }
  });

  it("never lets a mouse ask for two, so the first finger keeps the tool", () => {
    for (const mode of ["Idle", ...painting] as ModeKind[]) {
      expect(gestureFor(mode, 1, "mouse")).toBe(
        mode === "Idle" ? "pan" : "paint",
      );
      expect(gestureFor(mode, 2, "mouse")).toBe(
        mode === "Idle" ? "pan" : "paint",
      );
    }
  });

  it("draws with a pen the way it does with a finger", () => {
    expect(gestureFor("Draw", 1, "pen")).toBe("paint");
    expect(gestureFor("Draw", 2, "pen")).toBe("pan");
  });
});
