// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";
import { render } from "@solidjs/web";

import { LevelEditorOverlay } from "./LevelEditorOverlay";
import { createLevelEditor, type LevelEditor } from "./level-editor-store";

/**
 * The overlay, mounted for real.
 *
 * **This exists because a test that stood up a *shape* of the overlay passed while the
 * overlay threw.** `mount.test.tsx` mounts a component with a signal, a memo and an effect
 * and proved that a `<Show>` is not a forbidden scope — which is true, and was still not the
 * thing that was broken. What was broken was a one-argument `createEffect` in this file,
 * which Solid 2 refuses at the *next flush*, from `index.tsx`, with a stack that points at
 * nothing near the mistake.
 *
 * So the overlay itself is mounted. jsdom has no layout, so nothing here asserts on geometry
 * — that is the stylesheet's claim, and the only honest way to check it is to open the page.
 * What this does check is that mounting it does not throw, that its panels are there, and
 * that closing it puts the canvas back.
 */

/**
 * jsdom has no `ResizeObserver`, and the overlay uses one to follow the pane.
 *
 * **A stub rather than a shim, because nothing here asserts on geometry** — jsdom has no
 * layout, so every box is zero and there is nothing to observe. What is under test is that
 * mounting does not throw and that the canvas is handed back; the stylesheet's claim about
 * where the canvas actually lands is checked by opening the page.
 */
const stubResizeObserver = (): void => {
  class NoopResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: NoopResizeObserver,
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    value: NoopResizeObserver,
  });
};

const matchMedia = (): void => {
  stubResizeObserver();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
};

/**
 * A real editor, inside its own root.
 *
 * **The root matters.** `createLevelEditor` creates signals, effects and a `createMediaQuery`
 * with an `onCleanup` in it, and Solid refuses all of that outside an owner
 * (`NO_OWNER_EFFECT`). The application gets the owner from its component; this stands one up.
 */
const editorOver = (): LevelEditor =>
  createRoot(() =>
    createLevelEditor({
      level: () => ({ version: 1, items: [] }),
      setLevel: () => {},
      cameraKind: () => "orbit",
      setCameraKind: () => {},
    }),
  );

const mount = (container: HTMLElement, editor: LevelEditor) => {
  const canvas = document.createElement("canvas");
  container.append(canvas);
  const dispose = render(
    () => (
      <LevelEditorOverlay
        editor={editor}
        canvas={canvas}
        models={["lantern.sdfmod"]}
        canAttach={false}
        onAttach={() => {}}
        onClose={() => {}}
      />
    ),
    container,
  );
  flush();
  return { dispose, canvas };
};

describe("the level editor overlay, mounted", () => {
  it("mounts without throwing", () => {
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);

    let threw: string | undefined;
    try {
      const { dispose } = mount(container, editorOver());
      dispose();
    } catch (e) {
      threw = (e as Error).message;
    }
    container.remove();

    expect(threw).toBeUndefined();
  });

  it("shows every panel, each with a heading somebody can find", () => {
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);

    const { dispose } = mount(container, editorOver());
    const text = container.textContent ?? "";

    expect(text).toContain("tool");
    expect(text).toContain("shape");
    expect(text).toContain("history");
    expect(text).toContain("camera");
    // The list starts empty and says so, rather than showing a blank box.
    expect(text).toContain("Nothing placed yet");

    dispose();
    container.remove();
  });

  it("offers every primitive and every combine in the toolbar", () => {
    // **Nine primitives, because the toolbar reads the same table the field validates
    // against.** A toolbar offering six while `createShape` offers nine is an editor that
    // quietly cannot express the level somebody is looking at (ADR 0025).
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);

    const { dispose } = mount(container, editorOver());
    const text = container.textContent ?? "";

    for (const label of [
      "Box",
      "Rounded",
      "Sphere",
      "Ellipsoid",
      "Capsule",
      "Cylinder",
      "Cone",
      "Torus",
      "Hex prism",
    ]) {
      expect(text).toContain(label);
    }
    expect(text).toContain("Add");
    expect(text).toContain("Subtract");
    expect(text).toContain("Paint");

    dispose();
    container.remove();
  });

  it("undo and redo start disabled, because there is nothing to take back yet", () => {
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);

    const { dispose } = mount(container, editorOver());
    const undo = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Undo",
    );

    expect(undo).toBeDefined();
    expect(undo?.disabled).toBe(true);

    dispose();
    container.remove();
  });

  it("puts the canvas back when it closes", () => {
    // **A closed editor that leaves `position: absolute` on the canvas** leaves it floating
    // over the page with nothing holding it, and the game underneath rendering to a box
    // nobody can see. Every one of the four styles has to go.
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);

    const { dispose, canvas } = mount(container, editorOver());
    flush();
    dispose();
    flush();

    expect(canvas.style.position).toBe("");
    expect(canvas.style.left).toBe("");
    expect(canvas.style.top).toBe("");
    expect(canvas.style.width).toBe("");
    expect(canvas.style.height).toBe("");

    container.remove();
  });
});
