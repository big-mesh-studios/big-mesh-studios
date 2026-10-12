// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/web";
import { createSignal, flush } from "solid-js";

import { createPalette, type Palette } from "./palette";
import { BrushPanel, defaultBrush, type BrushState } from "./brush-panel";

/** Solid 2 defers writes until the batch is flushed, so a read needs one. See ADR 0028. */
const settle = (): void => {
  flush();
};

const white = { r: 255, g: 255, b: 255, a: 255 };

/**
 * The panel over a real palette, with the colour setter counted.
 *
 * **The palette is real rather than a stand-in because two of these tests are about what does
 * *not* reach it** — a mock could only assert the panel called a function, not that the palette
 * is still holding what it was. And the whole point of the culled case is that the observable
 * is the palette's contents and not a call count.
 */
const mount = (
  overrides: Partial<Parameters<typeof BrushPanel>[0]> = {},
): {
  readonly root: HTMLElement;
  readonly palette: Palette;
  readonly painted: () => { r: number; g: number; b: number; a: number }[];
  /** Moves the brush the way the panel's caller does, so the panel's own props can be tested. */
  readonly setBrush: (
    next: BrushState | ((held: BrushState) => BrushState),
  ) => void;
} => {
  const palette = createPalette([white]);
  const painted: BrushState["colour"][] = [];
  const root = document.createElement("div");
  document.body.append(root);
  // **A signal, because that is what the app now holds.** The test for "the panel follows its
  // caller" is meaningless against a plain object: an object never triggers anything, so the
  // assertion passes or fails for reasons that have nothing to do with the panel.
  const [brush, setBrush] = createSignal<BrushState>(defaultBrush(white));
  render(
    () => (
      <BrushPanel
        brush={brush()}
        onWidth={() => {}}
        onHardness={() => {}}
        onColour={(colour) => {
          painted.push(colour);
        }}
        palette={palette}
        atlas={undefined}
        fieldDetail={undefined}
        hasPaint={false}
        dabs={0}
        onClear={() => {}}
        blend={0}
        onBlend={() => {}}
        busy={false}
        {...overrides}
      />
    ),
    root,
  );
  settle();
  return { root, palette, painted: () => painted, setBrush };
};

/** A button in the panel, found by the start of its `aria-label`. */
const button = (
  root: HTMLElement,
  prefix: string,
): HTMLButtonElement | undefined =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((found) =>
    found.getAttribute("aria-label")?.startsWith(prefix),
  );

describe("the brush panel's colour", () => {
  it("shows the colour the brush is holding, before anything is picked", () => {
    // **The reason the trigger carries a swatch rather than reading "Choose colour…".** A
    // person mid-stroke needs to know what they are holding without opening anything.
    const { root } = mount();
    expect(root.textContent).toContain("rgba(255, 255, 255, 1)");
  });

  it("follows the brush when its colour changes", () => {
    // **The test for a bug that only existed because `brush` was a plain object.**
    //
    // The app held the brush in a `let`, and reading it in this panel's JSX created no
    // dependency, so `brush = { ...brush, colour }` changed the value and drew nothing. The
    // picker opened and did nothing, which reads as a broken control rather than as a missing
    // dependency. A panel cannot tell whether its caller is reactive, but it can insist that
    // its own output tracks its props — and that assertion is what would have caught it here
    // rather than in a browser.
    const { root, setBrush } = mount();
    const chosen = { r: 12, g: 200, b: 90, a: 255 };
    setBrush((held) => ({ ...held, colour: chosen }));
    settle();
    expect(root.textContent).toContain("rgba(12, 200, 90, 1)");
  });

  it("offers the palette inline, without opening the picker", () => {
    // **The fast path.** Repainting a figure means cycling through a handful of colours
    // repeatedly; requiring the popover for that would put two taps and a dismissal between a
    // person and the thing they do most while painting.
    const { root } = mount();
    expect(button(root, "use ")).not.toBeUndefined();
  });

  it("has a trigger that opens the picker, and the panel it names", () => {
    // **Without this there is no route to a colour the palette has not got**, which was the
    // whole defect: the brush could paint one colour and no other. And the named panel has to
    // exist, or the popover opens unanchored — the silent failure `popover.tsx:5-12` names.
    const { root } = mount();
    const trigger = root.querySelector<HTMLElement>("[popovertarget]");
    expect(trigger).not.toBeNull();
    const id = trigger!.getAttribute("popovertarget")!;
    expect(document.getElementById(id)).not.toBeNull();
    expect(document.getElementById(id)!.hasAttribute("popover")).toBe(true);
  });

  it("paints with a colour picked from the palette", () => {
    const { root, painted } = mount();
    button(root, "use ")!.click();
    settle();
    expect(painted()).toEqual([white]);
  });

  it("does not add to the palette when a colour is merely chosen", () => {
    // **The bug `palette.tsx:18-27` documents, and the one this wiring could reintroduce.**
    // The picker's `onColour` fires on every pointer move, so remembering from the colour
    // setter fills the palette to its cap with the dozens of intermediate colours one drag
    // passes through, and pushes out the ones the person actually chose.
    const palette = createPalette([white]);
    const root = document.createElement("div");
    document.body.append(root);
    render(
      () => (
        <BrushPanel
          brush={defaultBrush(white)}
          onWidth={() => {}}
          onHardness={() => {}}
          // **The exact call shape a picker's drag produces: many colours, one gesture.**
          onColour={() => {
            palette.remember({ r: 12, g: 34, b: 56, a: 255 });
          }}
          palette={palette}
          atlas={undefined}
          fieldDetail={undefined}
          hasPaint={false}
          dabs={0}
          onClear={() => {}}
          blend={0}
          onBlend={() => {}}
          busy={false}
        />
      ),
      root,
    );
    settle();
    // The panel cannot stop a caller from doing this — but it must not be *asking* for it,
    // which is the half that was wrong before. This test pins the panel's side of the
    // contract: nothing here calls `remember`, so the palette is untouched.
    expect(palette.colours()).toEqual([white]);
  });

  it("adds the brush's own colour to the palette when the add box is tapped", () => {
    // **A colour the palette does not hold.** The add box adds the brush's *current* colour, so
    // tapping it while holding a colour already remembered is a no-op by design — which is
    // what the first half asserts, and the reason this test needs a brush colour of its own.
    const held = { r: 12, g: 200, b: 90, a: 255 };
    const { root, palette } = mount({ brush: { ...defaultBrush(held) } });
    expect(palette.colours()).toEqual([white]);
    button(root, "add ")!.click();
    settle();
    expect(palette.colours()).toEqual([held, white]);
  });

  it("leaves the palette alone when the add box repeats a colour it already holds", () => {
    // **So a tap on the add box is idempotent for a colour already kept**, which is the
    // property `Palette.has` exists to serve and which a cap-busting caller would otherwise
    // depend on.
    const { root, palette } = mount();
    button(root, "add ")!.click();
    settle();
    expect(palette.colours()).toEqual([white]);
  });
});
