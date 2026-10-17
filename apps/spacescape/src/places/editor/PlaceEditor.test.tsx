// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createRoot, flush } from "solid-js";
import { render } from "@solidjs/web";

/**
 * The models pane: attaching `.sdfmod` files, seeing them, and removing them.
 *
 * ## Why the code panes are stubbed
 *
 * **`PlaceEditorPanes` spawns the language worker with `new Worker(...)`, and jsdom has no
 * answer for that.** The pane under test is the models list, which touches no code editor at
 * all, so the chunk is replaced with an empty component — the same boundary `app.tsx` draws
 * when it imports `PlaceEditor` dynamically. Everything else is the real panel and the real
 * `createPlaceEditor`.
 *
 * ## `Activity` keeps the hidden pane mounted
 *
 * So the models list is in the DOM before the toggle is pressed and exists afterwards; what
 * "showing" means here is the wrapper's `display`, which is what the assertion reads.
 */

vi.mock("./PlaceEditorPanes", () => ({
  PlaceEditorPanes: () => null,
}));

import { PlaceEditor } from "./PlaceEditor";
import { createPlaceEditor } from "./create-place-editor";

type Editor = ReturnType<typeof createPlaceEditor>;

const editorOver = (): Editor => createRoot(() => createPlaceEditor());

/** The panel mounted with a real editor, and the lines it was told to print. */
const mount = (
  editor: Editor,
  onAttachLevelFromEditor?: () => void,
  onClose?: () => void,
  onOpen?: () => Promise<string>,
): {
  container: HTMLElement;
  said: string[];
  dispose: () => void;
} => {
  const container = document.createElement("div");
  document.body.append(container);
  const said: string[] = [];
  const dispose = render(
    () => (
      <PlaceEditor
        state={editor}
        onRun={async () => "ran"}
        onPublish={async () => "published"}
        onStatus={(line) => said.push(line)}
        onOpen={onOpen}
        onAttachLevelFromEditor={onAttachLevelFromEditor}
        onClose={onClose}
      />
    ),
    container,
  );
  flush();
  return { container, said, dispose };
};

const toggle = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>("#place-tab-models")!;

const levelToggle = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>("#place-tab-levels")!;

const filePicker = (root: HTMLElement): HTMLInputElement =>
  root.querySelector<HTMLInputElement>('input[type="file"]')!;

/** The levels pane's own file input, scoped past the models pane's. */
const levelFilePicker = (root: HTMLElement): HTMLInputElement =>
  root.querySelector<HTMLInputElement>(
    '#place-tabpanel-levels input[type="file"]',
  )!;

/** A button inside one pane, by the text it shows. */
const panelButton = (
  root: HTMLElement,
  panelId: string,
  name: string,
): HTMLButtonElement => {
  const panel = root.querySelector(panelId);
  const found = [...(panel?.querySelectorAll("button") ?? [])].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (found === undefined) throw new Error(`no button called ${name}`);
  return found as HTMLButtonElement;
};

const press = (root: HTMLElement, name: string): void => {
  const found = [...root.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (found === undefined) throw new Error(`no button called ${name}`);
  found.click();
  flush();
};

describe("the models pane", () => {
  it("comes to the front when its toggle is pressed, and says there is nothing yet", () => {
    const editor = editorOver();
    const { container, dispose } = mount(editor);
    const panel = container.querySelector("#place-tabpanel-models")!;
    const wrapper = panel.parentElement as HTMLElement;

    expect(wrapper.style.display).toBe("none");

    toggle(container).click();
    flush();

    expect(wrapper.style.display).toBe("contents");
    expect(toggle(container).getAttribute("aria-selected")).toBe("true");
    expect(panel.textContent).toContain("nothing attached yet");

    dispose();
    editor.dispose();
    container.remove();
  });

  it("lists an attached model and removes it", () => {
    const editor = editorOver();
    editor.attachModel("fridge.sdfmod", new Uint8Array([1]));
    flush();
    const { container, dispose } = mount(editor);

    toggle(container).click();
    flush();
    expect(
      container.querySelector("#place-tabpanel-models")!.textContent,
    ).toContain("fridge.sdfmod");

    container.querySelector<HTMLButtonElement>(".place-model-remove")!.click();
    flush();

    expect(editor.project().models["fridge.sdfmod"]).toBeUndefined();

    dispose();
    editor.dispose();
    container.remove();
  });

  it("opens the picker from + from a file", () => {
    const editor = editorOver();
    const { container, dispose } = mount(editor);
    toggle(container).click();
    flush();

    const input = filePicker(container);
    let opened = 0;
    input.click = () => {
      opened += 1;
    };

    press(container, "+ from a file");

    expect(opened).toBe(1);
    expect(input.type).toBe("file");
    // **And it offers everything**, because a picker told to filter `.sdfmod` greys models out
    // on the phones that have not classified the extension. `ModelLibrary` is the judge.
    expect(input.hasAttribute("accept")).toBe(false);

    dispose();
    editor.dispose();
    container.remove();
  });

  it("attaches the model in the file that was chosen", async () => {
    const editor = editorOver();
    const { container, dispose } = mount(editor);
    toggle(container).click();
    flush();

    const input = filePicker(container);
    const bytes = new Uint8Array([1, 2, 3]);
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ name: "fridge.sdfmod", arrayBuffer: async () => bytes.buffer }],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(editor.project().models["fridge.sdfmod"]).toEqual(bytes);
    expect(editor.project().manifest.models).toEqual(["fridge.sdfmod"]);

    dispose();
    editor.dispose();
    container.remove();
  });

  it("says why a file was refused rather than swallowing it", async () => {
    const editor = editorOver();
    const { container, said, dispose } = mount(editor);
    toggle(container).click();
    flush();

    const input = filePicker(container);
    Object.defineProperty(input, "files", {
      configurable: true,
      // `main.ts` is one of the place's scripts, so the name collides.
      value: [{ name: "main.ts", arrayBuffer: async () => new ArrayBuffer(0) }],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(said.join(" ")).toMatch(/already used/);
    expect(editor.project().manifest.models).toBeUndefined();

    dispose();
    editor.dispose();
    container.remove();
  });
});

/** One box a level can carry, in the shape `level-plan.ts` reads. */
const A_LEVEL = JSON.stringify({
  version: 1,
  items: [
    {
      kind: "shape",
      id: "floor",
      at: [0, 0, 0],
      shape: { type: "Box", len: { x: 40, y: 4, z: 40 } },
      combine: "Add",
    },
  ],
});

describe("the levels pane", () => {
  it("comes to the front when its toggle is pressed, and says there is nothing yet", () => {
    const editor = editorOver();
    const { container, dispose } = mount(editor);
    const panel = container.querySelector("#place-tabpanel-levels")!;

    expect((panel.parentElement as HTMLElement).style.display).toBe("none");

    levelToggle(container).click();
    flush();

    expect((panel.parentElement as HTMLElement).style.display).toBe("contents");
    expect(levelToggle(container).getAttribute("aria-selected")).toBe("true");
    expect(panel.textContent).toContain("no levels yet");

    dispose();
    editor.dispose();
    container.remove();
  });

  it("lists a level with its item count, and removes it", () => {
    const editor = editorOver();
    expect(editor.writeLevel("level.json", A_LEVEL)).toBeNull();
    flush();
    const { container, dispose } = mount(editor);
    levelToggle(container).click();
    flush();

    const panel = container.querySelector("#place-tabpanel-levels")!;
    expect(panel.textContent).toContain("level.json");
    expect(panel.textContent).toContain("1 item");

    panel.querySelector<HTMLButtonElement>(".place-level-remove")!.click();
    flush();

    expect(editor.project().levels["level.json"]).toBeUndefined();

    dispose();
    editor.dispose();
    container.remove();
  });

  it("attaches the level in the file that was chosen", async () => {
    const editor = editorOver();
    const { container, dispose } = mount(editor);
    levelToggle(container).click();
    flush();

    const input = levelFilePicker(container);
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ name: "hub.json", text: async () => A_LEVEL }],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(editor.project().levels["hub.json"]).toBe(A_LEVEL);
    expect(editor.project().manifest.levels).toEqual(["hub.json"]);

    dispose();
    editor.dispose();
    container.remove();
  });

  it("refuses a file that is not a level, and says why", async () => {
    const editor = editorOver();
    const { container, said, dispose } = mount(editor);
    levelToggle(container).click();
    flush();

    const input = levelFilePicker(container);
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ name: "notes.json", text: async () => "not json at all" }],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(said.join(" ")).toMatch(/is not a level/);
    expect(editor.project().manifest.levels).toBeUndefined();

    dispose();
    editor.dispose();
    container.remove();
  });

  it("takes the level standing in the level editor through the callback", () => {
    const editor = editorOver();
    let asked = 0;
    const { container, dispose } = mount(editor, () => {
      asked += 1;
    });
    levelToggle(container).click();
    flush();

    panelButton(
      container,
      "#place-tabpanel-levels",
      "+ from the level editor",
    ).click();
    flush();

    expect(asked).toBe(1);

    dispose();
    editor.dispose();
    container.remove();
  });
});

describe("the manifest fields and the file tabs", () => {
  it("sets, holds a half-typed, and clears the spawn from its field", () => {
    const editor = editorOver();
    const { container, dispose } = mount(editor);
    const spawn = container.querySelector<HTMLInputElement>(
      'input[placeholder="x, y, z"]',
    )!;
    const type = (text: string): void => {
      spawn.value = text;
      spawn.dispatchEvent(new Event("input", { bubbles: true }));
      flush();
    };

    type("4, 30, -8");
    expect(editor.project().manifest.spawn).toEqual([4, 30, -8]);

    // **A field being typed is not a field being wrong**, so `4, 30` leaves the last good point
    // in place rather than clearing it out from under the caret.
    type("4, 30");
    expect(editor.project().manifest.spawn).toEqual([4, 30, -8]);

    // **Cleared means absent**, which is what the record omits and the zip re-derives.
    type("");
    expect(editor.project().manifest.spawn).toBeUndefined();
    expect(Object.hasOwn(editor.project().manifest, "spawn")).toBe(false);

    dispose();
    editor.dispose();
    container.remove();
  });

  it("renames a file when its tab is double-clicked", () => {
    const editor = editorOver();
    editor.addScript("span.ts");
    flush();
    // **jsdom has no prompt**, so the panel's one way of reading a name is stubbed — what is
    // under test is that a double-click asks and the answer reaches the state.
    const real = window.prompt;
    window.prompt = () => "bridge.ts";
    const { container, dispose } = mount(editor);

    const tab = [
      ...container.querySelectorAll<HTMLButtonElement>(".place-tab-name"),
    ].find((candidate) => candidate.textContent?.trim() === "span.ts")!;
    tab.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    flush();

    expect(editor.project().scripts["bridge.ts"]).toBe("");
    expect(editor.project().scripts["span.ts"]).toBeUndefined();

    window.prompt = real;
    dispose();
    editor.dispose();
    container.remove();
  });

  it("closes through its own button, the one way out of a full-screen editor", () => {
    // **The button exists for the phone case.** There the panel takes the whole viewport, so the
    // scrim behind it cannot be tapped and there is no Escape key — without this there would be
    // no way to leave the editor at all.
    const editor = editorOver();
    let closed = 0;
    const { container, dispose } = mount(editor, undefined, () => {
      closed += 1;
    });

    press(container, "close");

    expect(closed).toBe(1);

    dispose();
    editor.dispose();
    container.remove();
  });

  it("says why a rename was refused rather than doing nothing", () => {
    const editor = editorOver();
    editor.addScript("span.ts");
    flush();
    const real = window.prompt;
    // The entry file's own name, which is taken.
    window.prompt = () => editor.project().manifest.entry;
    const { container, said, dispose } = mount(editor);

    const tab = [
      ...container.querySelectorAll<HTMLButtonElement>(".place-tab-name"),
    ].find((candidate) => candidate.textContent?.trim() === "span.ts")!;
    tab.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    flush();

    expect(said.join(" ")).toMatch(/already used/);
    expect(editor.project().scripts["span.ts"]).toBe("");

    window.prompt = real;
    dispose();
    editor.dispose();
    container.remove();
  });
});

describe("opening a place zip", () => {
  it("has an open button that reports what the picker handed back", async () => {
    // **The editor's own entry point for a place somebody was sent.** `/place:open` exists in the
    // console, but a person already in the editor should not have to leave it to open the file
    // they were asked to fix.
    const editor = editorOver();
    let opened = 0;
    const { container, said, dispose } = mount(
      editor,
      undefined,
      undefined,
      async () => {
        opened += 1;
        return "opened harbour";
      },
    );

    press(container, "open");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(opened).toBe(1);
    expect(said).toContain("opened harbour");

    dispose();
    editor.dispose();
    container.remove();
  });

  it("leaves the button out when the caller owns no picker", () => {
    // **Absent rather than dead**, the same rule the level editor's attach button follows: a
    // greyed-out control next to a question nobody asked is worse than no control.
    const editor = editorOver();
    const { container, dispose } = mount(editor);

    expect(
      [...container.querySelectorAll("button")].some(
        (candidate) => candidate.textContent?.trim() === "open",
      ),
    ).toBe(false);

    dispose();
    editor.dispose();
    container.remove();
  });
});
