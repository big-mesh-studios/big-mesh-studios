// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";
import { render } from "@solidjs/web";

import { PropertiesPanel } from "./PropertiesPanel";
import { createLevelEditor, type LevelEditor } from "../level-editor-store";
import { isLevelShape } from "../../places/level/types";
import { toEuler } from "../view/quaternion";
import type { Quat } from "@big-mesh-studios/core";

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

/**
 * The rotation fields, and the one way they can be wrong.
 *
 * **They are the only fields in the panel whose edit is not "change one thing".** Every other
 * field copies the item and replaces a number; these replace one *angle*, which means
 * building a quaternion from all three. Composed from the stored quaternion rather than
 * from what the panel is showing, every keystroke would stack a turn onto the last committed
 * value — so typing 30 into yaw and then touching pitch would produce something that is
 * neither of the two things on screen, and the field would read back a third.
 */
describe("the rotation fields", () => {
  /** The rotation field with this label, by the label's own text rather than by position. */
  const rotation = (root: HTMLElement, label: string): HTMLInputElement => {
    // **The label's `span`, and not the `<label>`'s text.** A `NumberField` puts its name in
    // a span and its two stepper glyphs beside the input, so the whole label reads "Yaw−+"
    // and matching on that would find nothing.
    const found = [...root.querySelectorAll("label")].find(
      (candidate) =>
        candidate.querySelector("span")?.textContent?.trim() === label,
    );
    const input = found?.querySelector("input");
    if (input === null || input === undefined)
      throw new Error(`no rotation field called ${label}`);
    return input as HTMLInputElement;
  };

  /** The turn the stored item carries, for reading back what the fields composed. */
  const storedTurn = (editor: LevelEditor): Quat => {
    const item = editor.items()[0];
    if (
      item === undefined ||
      !isLevelShape(item) ||
      item.orientation === undefined
    )
      throw new Error("nothing was turned");
    const [x, y, z, w] = item.orientation;
    return { x, y, z, w };
  };

  /** An editor with one shape of `kind` selected, and the panel mounted over it. */
  const over = async (kind: "Box" | "Sphere") => {
    matchMedia();
    const container = document.createElement("div");
    document.body.append(container);
    const editor = editorOver();
    const dispose = mount(container, editor);
    editor.addShapeAt([1, 2, 3], kind, "Add");
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
    editor.select(0);
    flush();
    return { container, editor, dispose };
  };

  it("reads zero for a shape nobody has turned", async () => {
    // **Every shape in every level written before ADR 0051 has no `orientation` at all.**
    // Read as anything but the identity, the first un-turned shape a person opened would be
    // showing a quarter turn they had never given it.
    const { container, editor, dispose } = await over("Box");

    expect(rotation(container, "Yaw").value).toBe("0");
    expect(rotation(container, "Pitch").value).toBe("0");
    expect(rotation(container, "Roll").value).toBe("0");
    expect(editor.items()[0]).not.toHaveProperty("orientation");

    dispose();
    container.remove();
  });

  it("shows the turn the shape actually has", async () => {
    const { container, editor, dispose } = await over("Box");
    const item = editor.items()[0];
    if (item === undefined || !isLevelShape(item))
      throw new Error("nothing was placed");

    editor.updateItem(0, {
      ...item,
      orientation: [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    // **45°, read back out of the stored quaternion** — the panel derives rather than keeps.
    expect(rotation(container, "Yaw").value).toBe("45");

    dispose();
    container.remove();
  });

  it("keeps the other two angles when one is edited", async () => {
    // **The claim the composition exists for.** Composed from the stored quaternion, editing
    // pitch after setting yaw to 30 would produce a turn that is neither the one displayed
    // nor the one anybody asked for, and the yaw field would immediately read something else.
    const { container, editor, dispose } = await over("Box");
    const typed = rotation(container, "Yaw");
    typed.value = "30";
    typed.dispatchEvent(new Event("input", { bubbles: true }));
    typed.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(rotation(container, "Yaw").value).toBe("30");

    const pitched = rotation(container, "Pitch");
    pitched.value = "10";
    pitched.dispatchEvent(new Event("input", { bubbles: true }));
    pitched.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    const angles = toEuler(storedTurn(editor));
    expect(angles.yaw).toBeCloseTo(30, 3);
    expect(angles.pitch).toBeCloseTo(10, 3);
    expect(angles.roll).toBeCloseTo(0, 3);

    dispose();
    container.remove();
  });

  it("is not offered for a sphere, where a turn could never show", async () => {
    const { container, dispose } = await over("Sphere");
    expect(container.textContent).not.toContain("Yaw");
    dispose();
    container.remove();
  });

  it("is offered for a rounded box and an ellipsoid, which do turn visibly", async () => {
    // **The two that are easy to exclude by mistake.** Rounding a box's corners is not making
    // it symmetric, and an ellipsoid with three different radii is not a sphere.
    const container = document.createElement("div");
    document.body.append(container);
    const editor = editorOver();
    const dispose = mount(container, editor);
    editor.addShapeAt([1, 2, 3], "Box", "Add");
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
    const item = editor.items()[0];
    if (item === undefined || !isLevelShape(item))
      throw new Error("nothing was placed");

    for (const shape of [
      { type: "RoundBox" as const, len: { x: 40, y: 6, z: 20 }, radius: 1 },
      { type: "Ellipsoid" as const, radius: { x: 4, y: 6, z: 8 } },
    ]) {
      editor.updateItem(0, { ...item, shape });
      await new Promise((resolve) => setTimeout(resolve, 0));
      flush();
      expect(container.textContent, `no Yaw field for ${shape.type}`).toContain(
        "Yaw",
      );
    }

    dispose();
    container.remove();
  });
});
