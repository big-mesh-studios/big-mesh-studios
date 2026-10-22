// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/web";

import { DrawLinesUi } from "./DrawLinesUi";
import type { WallSide } from "../../places/level/types";

/**
 * The side buttons for a picked wall segment, mounted for real.
 *
 * **Because the buttons are conditional on the pick having a stored wall behind it.** The
 * draft deliberately shows none, and an edit shows them only while its line count still matches
 * the item's; a rendering test is the honest way to check that the group appears exactly when
 * that answer exists rather than merely that the click handler works in isolation.
 */
const mount = (
  container: HTMLElement,
  side: () => WallSide | undefined,
  onSetSide: (side: WallSide) => void,
) => {
  const dispose = render(
    () => (
      <DrawLinesUi
        controller={() => undefined}
        onFinish={() => {}}
        segmentSelect={() => true}
        segmentPicked={true}
        segmentSide={side()}
        onSetSegmentSide={onSetSide}
        onDeleteSegment={() => {}}
      />
    ),
    container,
  );
  flush();
  return dispose;
};

const sideGroup = (root: HTMLElement): HTMLElement | null =>
  root.querySelector('[role="group"][aria-label="Wall side"]');

const buttonNamed = (
  root: HTMLElement,
  label: string,
): HTMLButtonElement | undefined =>
  [...root.querySelectorAll("button")].find(
    (button) => button.textContent === label,
  );

describe("the picked wall segment's side buttons", () => {
  it("marks the line's current side and reports a new one", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const [side, setSide] = createSignal<WallSide | undefined>("left");
    const onSetSide = vi.fn((next: WallSide) => setSide(next));
    const dispose = mount(container, side, onSetSide);

    expect(sideGroup(container)).not.toBeNull();
    expect(buttonNamed(container, "Left")?.getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(
      buttonNamed(container, "Right")?.getAttribute("aria-pressed"),
    ).toBeNull();

    buttonNamed(container, "Right")?.click();
    flush();
    expect(onSetSide).toHaveBeenCalledWith("right");

    dispose();
    container.remove();
  });

  it("hides the group when the pick has no stored wall behind it", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const [side, setSide] = createSignal<WallSide | undefined>(undefined);
    const dispose = mount(container, side, vi.fn());

    expect(sideGroup(container)).toBeNull();

    setSide("centre");
    flush();
    expect(sideGroup(container)).not.toBeNull();

    dispose();
    container.remove();
  });
});
