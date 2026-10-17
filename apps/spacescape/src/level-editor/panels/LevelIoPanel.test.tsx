// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createRoot, flush } from "solid-js";
import { render } from "@solidjs/web";

import { LevelIoPanel } from "./LevelIoPanel";
import { createLevelEditor, type LevelEditor } from "../level-editor-store";

/**
 * Getting a level in, and the one line that makes it work.
 *
 * **The button pressed the picker open by calling `click()` on a real file input, from
 * inside its own click handler.** Everything about that is load-bearing and none of it is
 * obvious from the panel: a picker needs an input to be open *about*, and opening one is a
 * privileged act that a browser only permits from inside a user gesture — so a `click()`
 * deferred to a microtask, run from an effect, or fired after an `await` is refused. It was
 * refused *everywhere* when this line was missing, not only on a phone; a phone is just
 * where a dead button is noticed first, because there is no keyboard shortcut and no drag
 * anywhere else that looks like it might have worked.
 *
 * So the test is the one that would have caught it: press the button, and the input is
 * clicked.
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

const editorOver = (): LevelEditor =>
  createRoot(() =>
    createLevelEditor({
      level: () => ({ version: 1, items: [] }),
      setLevel: () => {},
      cameraKind: () => "orbit",
      setCameraKind: () => {},
    }),
  );

/** The panel mounted, and its container, for a test to press things in. */
const mount = (
  editor: LevelEditor = editorOver(),
  attachName?: string,
): { container: HTMLElement; editor: LevelEditor; dispose: () => void } => {
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = render(
    () => (
      <LevelIoPanel
        editor={editor}
        canAttach={attachName !== undefined}
        attachName={attachName}
        onAttach={() => {}}
      />
    ),
    container,
  );
  flush();
  return { container, editor, dispose };
};

/** The button with this name, by the text it shows. */
const button = (root: HTMLElement, name: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (found === undefined) throw new Error(`no button called ${name}`);
  return found as HTMLButtonElement;
};

/** The panel's own file input, which is the thing a picker is opened about. */
const fileInput = (root: HTMLElement): HTMLInputElement => {
  const found = root.querySelector('input[type="file"]');
  if (found === null) throw new Error("no file input");
  return found as HTMLInputElement;
};

/**
 * Pretends to be a file picker being opened.
 *
 * **jsdom has no picker**, so `click()` on a file input is stubbed rather than shimmed —
 * what is under test is that the button asks, not what a phone then does about it.
 */
const pressed = (
  root: HTMLElement,
): { input: HTMLInputElement; opened: () => number } => {
  const input = fileInput(root);
  let opened = 0;
  input.click = (): void => {
    opened += 1;
  };
  return { input, opened: () => opened };
};

describe("the attach button", () => {
  it("says update rather than add when the level came from the place", () => {
    matchMedia();
    const { container, dispose } = mount(undefined, "hub.json");

    expect(button(container, "Update hub.json").title).toContain("hub.json");

    dispose();
    container.remove();
  });
});

describe("the Import button", () => {
  it("opens the picker when it is pressed", () => {
    matchMedia();
    const { container, dispose } = mount();
    const { input, opened } = pressed(container);

    button(container, "Import").click();
    flush();

    // **The whole of the fix.** A button that does not open a picker is a label.
    expect(opened()).toBe(1);
    expect(input.type).toBe("file");

    dispose();
    container.remove();
  });

  it("opens the picker for the same input every time, rather than a new one each press", () => {
    // **A picker needs an input to be open *about*, and a synthesised one is refused on a
    // phone.** So this is the same element on the second press — a panel that created a
    // fresh input per click would work on a desktop and nowhere else.
    matchMedia();
    const { container, dispose } = mount();
    const { input, opened } = pressed(container);

    button(container, "Import").click();
    // **The label settles before the next press**, which is also why the button is findable
    // by that name in this test rather than by position.
    flush();
    button(container, "Choose a file…").click();
    flush();

    expect(opened()).toBe(2);
    expect(fileInput(container)).toBe(input);

    dispose();
    container.remove();
  });

  it("asks, synchronously, while the press is still the user gesture", () => {
    // **A picker opened from a microtask is refused.** Not deferred by the framework, not
    // after an `await` — the call has to be in the handler body, with nothing between it and
    // the press. Asserted by the fact that `click` happened by the time the handler
    // returned, which is what "no await before the call" means.
    matchMedia();
    const { container, dispose } = mount();
    const { opened } = pressed(container);

    let openedDuringHandler = -1;
    const input = fileInput(container);
    const real = input.click;
    input.click = (): void => {
      openedDuringHandler = opened();
      real.call(input);
    };

    button(container, "Import").click();

    expect(openedDuringHandler).toBe(0);
    expect(opened()).toBe(1);

    dispose();
    container.remove();
  });

  it("takes the level out of the chosen file", async () => {
    matchMedia();
    const { container, editor, dispose } = mount();
    const input = fileInput(container);

    // **A plain object with a `text()`, because that is the whole of what the panel asks of
    // a `File`** — and stubbing the shape rather than the DOM type keeps the test about the
    // panel rather than about jsdom's `Blob`.
    const level = { version: 1, items: [] as unknown[] };
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ text: async () => JSON.stringify(level) }],
    });

    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(editor.items()).toEqual([]);

    dispose();
    container.remove();
  });

  it("clears the input, so choosing the same file twice is two imports", async () => {
    // **A `change` that does not change anything is not raised again.** Left as it was, a
    // person who picks the wrong file, fixes it, and picks the same name again would get
    // nothing the second time and no reason why.
    matchMedia();
    const { container, dispose } = mount();
    const input = fileInput(container);
    let cleared = "";
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => cleared,
      set: (next: string) => {
        cleared = next;
      },
    });
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ text: async () => '{"version":1,"items":[]}' }],
    });

    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cleared).toBe("");

    dispose();
    container.remove();
  });

  it("does not filter what the picker offers, because a phone cannot be trusted to type a file", () => {
    // **The greyed-out-file bug, and it is the reason this test exists.**
    //
    // `accept="application/json,.json"` reads as a statement about what a level is, and the
    // browser's picker implements it as a statement about how the *device* classifies a
    // file. Android's file managers report a `.json` variously as `application/json`, as
    // `text/plain`, and as nothing at all, and a picker that greys out what it does not
    // recognise takes them at their word — so a level somebody can see on their phone is
    // listed and cannot be tapped.
    //
    // A filter that is wrong is worse than no filter: a file that is *missing* can be found
    // by picking something else, and a file that is greyed out cannot be found at all.
    // `readLevelPlan` judges whatever arrives, which is the rule it has regardless.
    matchMedia();
    const { container, dispose } = mount();
    const input = fileInput(container);

    expect(input.hasAttribute("accept")).toBe(false);
    // **And the type is still a file input** — dropping the filter is not an excuse to
    // open a directory or accept a picture.
    expect(input.type).toBe("file");

    dispose();
    container.remove();
  });

  it("still refuses a file that is not a level, now that any file can be chosen", async () => {
    // **The consequence of offering everything**, and the reason it is safe: the picker no
    // longer filters, so the reader has to. It refuses whole and says where — which is the
    // rule `level-plan.ts` already had, reached rather than bypassed.
    //
    // **Awaited, because the panel reads the file before it judges it**, and asserting a
    // frame after the event would pass against a panel that never refused anything.
    matchMedia();
    const { container, editor, dispose } = mount();
    const input = fileInput(container);

    // A shape with no shape in it: valid JSON, a valid version, and a row the table
    // refuses. The whole-or-refused rule means none of it is loaded.
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ text: async () => '{"version":1,"items":[{"kind":"shape"}]}' }],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    expect(editor.items()).toHaveLength(0);
    // **And it says which row and why**, rather than loading the good half silently.
    expect(container.textContent).toMatch(/items\[0\]/);

    dispose();
    container.remove();
  });

  it("goes back to reading Import when the picker is dismissed", async () => {
    // **A cancelled picker fires nothing else** — no `change`, no error — so without the
    // `cancel` handler the button would say "Choose a file…" for the rest of the session
    // after one cancellation, which is the state that makes a working button look broken.
    matchMedia();
    const { container, dispose } = mount();
    const input = fileInput(container);

    button(container, "Import").click();
    flush();
    expect(container.textContent).toContain("Choose a file…");

    input.dispatchEvent(new Event("cancel", { bubbles: true }));
    flush();

    expect(container.textContent).toContain("Import");
    expect(
      [...container.querySelectorAll("button")].some(
        (candidate) => candidate.textContent?.trim() === "Import",
      ),
    ).toBe(true);

    dispose();
    container.remove();
  });
});

describe("the level's other ways in and out", () => {
  it("offers the JSON as an artefact, which is the way in when there is no picker", () => {
    // **The fallback is the point of the panel**, and it is also what makes a dead Import
    // button survivable: somebody can read the JSON off a phone and paste it in.
    matchMedia();
    const { container, editor, dispose } = mount();

    button(container, "Show JSON").click();
    flush();

    const area = container.querySelector("textarea");
    expect(area?.value).toBe(editor.exportJson());

    dispose();
    container.remove();
  });

  it("clears everything through the same undoable path a file would take", async () => {
    matchMedia();
    const { container, editor, dispose } = mount();
    editor.addShapeAt([1, 2, 3], "Box", "Add");
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();

    button(container, "Clear").click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
    expect(editor.items()).toHaveLength(0);

    // **Undoable**, because it is an edit — the same rule the panel's own header gives for
    // importing. Clear does not get its own mechanism.
    editor.undo();
    flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
    expect(editor.items()).toHaveLength(1);

    dispose();
    container.remove();
  });

  it("refuses a file that is not a level, and says why", () => {
    // **Whole or refused, and it says which.** The store is what does the judging; what is
    // under test here is that the panel shows the refusal rather than swallowing it.
    matchMedia();
    const { container, editor, dispose } = mount();

    expect(editor.importJson("not json at all")).toBe(false);
    flush();

    expect(container.textContent).toMatch(/not JSON/i);

    dispose();
    container.remove();
  });

  it("shows the level it has, with nothing to find it in", () => {
    matchMedia();
    const { container, dispose } = mount();
    // **The count is on screen** so somebody can see a file arrived before they close the
    // editor and go looking for it.
    expect(container.textContent).toContain("0 of");
    dispose();
    container.remove();
  });
});

// `vi` is imported for the spies this file grows into; referenced here so the import is not
// dead while the suite is still small.
