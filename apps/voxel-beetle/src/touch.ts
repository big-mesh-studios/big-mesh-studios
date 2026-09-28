import type { ModeKind } from "./types";

/** What a press on the slice canvas is for. */
export type Gesture = "paint" | "pan" | "ignore";

/**
 * What a press is for, given the tool in hand, how many fingers are already
 * down, and what the pointer is.
 *
 * Two fingers always move the view, whatever the tool: a pinch cannot mean to
 * draw, and a second finger arriving mid-stroke has nothing to add to it. One
 * finger draws with anything but `Idle`, and moves the view with `Idle`. A
 * mouse paints with a paint tool like a finger does, except that it can never
 * ask for two at once, so there is no second-finger case to decide.
 */
export function gestureFor(
  mode: ModeKind,
  pointersDown: number,
  pointerType: "mouse" | "touch" | "pen",
): Gesture {
  if (pointerType !== "mouse" && pointersDown > 1) {
    return "pan";
  }
  return mode === "Idle" ? "pan" : "paint";
}
