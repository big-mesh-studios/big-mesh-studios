// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render } from "@solidjs/web";
import { createSignal, flush } from "solid-js";

import { ColourPicker, picksFromScreen } from "./colour-picker";

/** Solid 2 defers writes until the batch is flushed, so a read needs one. See ADR 0028. */
const settle = (): void => {
  flush();
};

/**
 * Lets the eyedropper's promise settle.
 *
 * **A timeout rather than a resolved promise,** because there are two hops between the click and
 * the colour: `open()` resolving, and the `await` in `pickFromScreen` continuing after it. A
 * fixed macrotask drains both, where a single `await Promise.resolve()` drains one and the test
 * passes or fails depending on how many awaits the handler happens to have.
 */
const drained = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Stands in for the browser's `EyeDropper`, resolved or refused.
 *
 * **A class rather than a function returning an object** because the picker does `new` on it —
 * a stub that only satisfies a bare call would pass while the real code threw on every click,
 * which is the shape of a test that agrees with a bug.
 */
const eyeDropperThat = (outcome: () => Promise<{ sRGBHex: string }>) => {
  const Stub = class {
    open = (): Promise<{ sRGBHex: string }> => outcome();
  };
  window.EyeDropper = Stub as unknown as typeof window.EyeDropper;
};

afterEach(() => {
  // **Cleared rather than left set,** so a test that installs a stub cannot leak it into the
  // next one and make the "no button where the API is missing" case pass for the wrong reason.
  delete window.EyeDropper;
});

const white = { r: 255, g: 255, b: 255, a: 255 };

/**
 * The picker over a colour, with the setter counted.
 *
 * **The colour is a signal rather than a plain object,** for the reason `brush-panel.test.tsx`
 * gives: an object never triggers anything, so a test asserting the picker *follows* its caller
 * would pass or fail for reasons that have nothing to do with the picker.
 */
const mount = (
  colour: { r: number; g: number; b: number; a: number } = white,
) => {
  const chosen: (typeof white)[] = [];
  const root = document.createElement("div");
  document.body.append(root);
  const [held] = createSignal(colour);
  render(
    () => (
      <ColourPicker
        colour={held()}
        onColour={(next) => {
          chosen.push(next);
        }}
      />
    ),
    root,
  );
  settle();
  return { root, chosen: () => chosen };
};

const buttons = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button"));

describe("the eyedropper's availability", () => {
  it("offers nothing at all where the browser has no EyeDropper", () => {
    // **jsdom has no `EyeDropper`, which makes this the real unsupported case rather than a
    // stand-in for it.**
    //
    // The picker otherwise renders *zero* buttons, so a count of zero says two things at once:
    // the eyedropper was not drawn, and nothing else took its place. A test asserting only that
    // the button was hidden would still pass if something had been rendered in its stead, and
    // `Show` emitting nothing is the property the layout below `.outputRow` depends on.
    const { root } = mount();
    expect(buttons(root)).toHaveLength(0);
  });

  it("offers exactly one where the browser has one", () => {
    // **The positive case, so the guard is not passing by being permanently false.** Without it,
    // every other test here would be equally satisfied by a button that never appears.
    eyeDropperThat(() => Promise.resolve({ sRGBHex: "#0ac85a" }));
    const { root } = mount();
    expect(buttons(root)).toHaveLength(1);
  });

  it("reports the browser's answer rather than asking about a member that cannot be called", () => {
    // **A member that is present but not a constructor is not usable**, and `'EyeDropper' in
    // window` would claim it is. A browser that shipped something else under the name should
    // cost the tool, not a `TypeError` on every click.
    window.EyeDropper = {} as unknown as typeof window.EyeDropper;
    expect(picksFromScreen()).toBe(false);
    expect(buttons(mount().root)).toHaveLength(0);
  });
});

describe("the eyedropper", () => {
  it("takes the colour the screen gave", async () => {
    // **The one thing the tool is for**, and the assertion that pins the `#rrggbb` parse: a
    // picked colour has to arrive as the same bytes the picker would have written had a person
    // typed them into the fields.
    eyeDropperThat(() => Promise.resolve({ sRGBHex: "#0ac85a" }));
    const { root, chosen } = mount();
    buttons(root)[0].click();
    await drained();
    settle();
    expect(chosen()).toEqual([{ r: 10, g: 200, b: 90, a: 255 }]);
  });

  it("leaves the picked colour fully opaque whatever the alpha slider was set to", async () => {
    // **A pixel off the screen has no transparency to report**, so the format's silence is the
    // answer and not a gap. This is asserted rather than left implicit because it is the one
    // place a picked colour and a dragged one disagree — a translucent brush picked from the
    // screen would otherwise come back opaque, which is visible and therefore worth pinning.
    eyeDropperThat(() => Promise.resolve({ sRGBHex: "#0ac85a" }));
    const { root, chosen } = mount({ ...white, a: 128 });
    buttons(root)[0].click();
    await drained();
    settle();
    expect(chosen().at(-1)?.a).toBe(255);
  });

  it("changes nothing when the person dismisses the overlay with Escape", async () => {
    // **Escape is how this interaction ends, not a fault.** The browser rejects the promise
    // when the overlay is dismissed, so the handler must absorb it — an unhandled rejection here
    // would surface in the console of every picker open on a browser that has the API.
    //
    // The assertion is that `onColour` never fired, which the picker's own effect makes free:
    // it only calls out when the colour actually changed, and a refused pick changed nothing.
    eyeDropperThat(() => Promise.reject(new Error("dismissed")));
    const { root, chosen } = mount();
    buttons(root)[0].click();
    await drained();
    settle();
    expect(chosen()).toEqual([]);
  });
});
