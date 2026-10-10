// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";
import { render } from "@solidjs/web";

import { PropertiesPanel } from "./PropertiesPanel";
import { createLevelEditor, type LevelEditor } from "../level-editor-store";
import { isLevelShape } from "../../places/level/types";

/**
 * The inspector, mounted for real.
 *
 * **This exists because the panel raised `STRICT_READ_UNTRACKED` and still looked fine.**
 * A `<Show>` child's narrowed accessor is a memo, and Solid 2 calls that child with tracking
 * switched off — so reading it in the child's body warned, and the fields would have gone on
 * showing whatever was selected when the panel opened, because nothing they read was
 * subscribed to anything. Both halves of that are silent to the eye, so both are asserted.
 */

const matchMedia = (): void => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
};

/** A real editor, inside its own root — the store creates signals, effects and a listener. */
const editorOver = (): LevelEditor =>
  createRoot(() =>
    createLevelEditor({
      level: () => ({ version: 1, items: [] }),
      setLevel: () => {},
      cameraKind: () => "orbit",
      setCameraKind: () => {},
    }),
  );

/**
 * Runs `work` with every `console.warn` collected, rather than swallowed.
 *
 * **Collected and restored rather than mocked**, because a diagnostic that arrives during
 * the *next* flush is still this test's business, and a spy installed too narrowly would
 * miss exactly the read that is meant to be caught.
 */
const warningsFrom = async (work: () => Promise<void>): Promise<string[]> => {
  const seen: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    seen.push(args.map(String).join(" "));
  };
  try {
    await work();
    flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
  } finally {
    console.warn = original;
  }
  return seen;
};

const mount = (container: HTMLElement, editor: LevelEditor) => {
  const dispose = render(
    () => <PropertiesPanel editor={editor} models={["lantern.sdfmod"]} />,
    container,
  );
  flush();
  return dispose;
};

/**
 * The first number in a three-number field, which is how a shape's size is edited.
 *
 * **Found through the `legend` rather than the input's own label**, because a `Vec3Field`
 * labels its *fieldset* and gives the three inputs inside it the axis names — so three
 * inputs are called "x" and only the group knows which shape they belong to.
 */
const firstOf = (root: HTMLElement, group: string): HTMLInputElement => {
  const found = [...root.querySelectorAll("fieldset")].find(
    (set) => set.querySelector("legend")?.textContent === group,
  );
  const input = found?.querySelector("input");
  if (input === null || input === undefined)
    throw new Error(`no field called ${group}`);
  return input as HTMLInputElement;
};

describe("the level editor's inspector", () => {
  it("raises no dev diagnostics when an item is selected and edited", async () => {
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);
    const editor = editorOver();

    const warnings = await warningsFrom(async () => {
      const dispose = mount(container, editor);
      editor.addShapeAt([1, 2, 3], "Box", "Add");
      await new Promise((resolve) => setTimeout(resolve, 0));
      flush();
      editor.select(0);
      flush();
      dispose();
    });

    container.remove();
    expect(warnings).toEqual([]);
  });

  it("shows the shape as it is now, not as it was when it was selected", async () => {
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);
    const editor = editorOver();

    const dispose = mount(container, editor);
    editor.addShapeAt([1, 2, 3], "Box", "Add");
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
    editor.select(0);
    flush();

    // **Half the size, through the editor's own API rather than by typing.** A field that
    // never re-reads its item would show 24 here for the rest of the session.
    const item = editor.items()[0];
    if (item === undefined || !isLevelShape(item))
      throw new Error("nothing was placed");
    editor.updateItem(0, {
      ...item,
      shape: { type: "Box", len: { x: 12, y: 12, z: 12 } },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(firstOf(container, "Size").value).toBe("12");

    dispose();
    container.remove();
  });

  it("says so when nothing is selected, rather than showing an empty inspector", () => {
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = mount(container, editorOver());

    expect(container.textContent).toContain("Select something");

    dispose();
    container.remove();
  });
});
