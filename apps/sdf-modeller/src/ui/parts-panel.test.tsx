// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/web";
import { flush } from "solid-js";
import { PRIMITIVE_NAMES } from "@big-mesh-studios/sdf";

import {
  createModelStore,
  MAX_PARTS,
  type ModelStore,
} from "../model/model-store";
import { placedPart, type Part } from "../model/part";
import { PartsPanel } from "./parts-panel";
import styles from "./parts-panel.module.css";

/** A sphere at `x`, which is the smallest thing the panel can be asked about. */
const sphereAt = (id: string, x: number): Part =>
  placedPart(id, { type: "Sphere", radius: 1 }, { x, y: 0, z: 0 });

/**
 * The panel over a real store, with the callback counted.
 *
 * **The store is real rather than a stand-in** because the panel's whole argument is that it
 * does not keep any state of its own: what a press does is decided by `ModelStore.duplicate`,
 * and a mock would only be able to assert that this panel calls a function it was given.
 */
const mount = (initial: readonly Part[] = []) => {
  const store: ModelStore = createModelStore(initial);
  const copied: string[] = [];
  const root = document.createElement("div");
  document.body.append(root);
  render(
    () => (
      <PartsPanel
        store={store}
        primitives={PRIMITIVE_NAMES}
        onDuplicate={(id) => {
          copied.push(id);
        }}
      />
    ),
    root,
  );
  flush();

  const button = (): HTMLButtonElement | undefined =>
    root.querySelector<HTMLButtonElement>(`.${styles.duplicate}`) ?? undefined;
  return {
    store,
    button,
    /** The ids the panel said had been copied, in order. */
    copied: () => [...copied],
    parts: () => store.parts().map((part) => `${part.id}@${part.origin.x}`),
    press: () => {
      button()?.click();
      flush();
    },
  };
};

describe("the duplicate button", () => {
  it("is disabled with nothing selected, rather than refusing every press", () => {
    // **The reason the move tool is disabled the same way.** A button that is live and does
    // nothing teaches a person that the button is broken; one that is dim says so at a glance.
    const panel = mount([]);
    expect(panel.button()?.disabled).toBe(true);
  });

  it("is enabled as soon as there is a part to copy", () => {
    const panel = mount([sphereAt("a", 1)]);
    expect(panel.button()?.disabled).toBe(false);
  });

  it("copies the selected part in place and selects the copy", () => {
    const panel = mount([sphereAt("a", 1)]);

    panel.press();

    expect(panel.parts()).toEqual(["a@1", `${panel.store.selected()}@1`]);
    expect(panel.store.selected()).not.toBe("a");
  });

  it("copies the selected part rather than the first one", () => {
    // **The button acts on the selection, not on the head of the list.** A panel that copied
    // the first part would be right whenever the person happens to be working on the first
    // part, which is most of the time right up until it is not.
    const panel = mount([sphereAt("a", 1), sphereAt("b", 7)]);
    panel.store.select("b");
    flush();

    panel.press();

    expect(panel.parts()).toEqual([
      "a@1",
      "b@7",
      `${panel.store.selected()}@7`,
    ]);
  });

  it("says which part it copied, once and only once", () => {
    // **The callback is what puts the pointer into the move tool**, so a copy the panel did not
    // report would leave the person dragging the original.
    const panel = mount([sphereAt("a", 1)]);

    panel.press();

    expect(panel.copied()).toEqual([panel.store.selected()]);
  });

  it("copies a part added afterwards as readily as the first one", () => {
    const panel = mount([sphereAt("a", 1)]);
    panel.store.add(sphereAt("b", 4));
    flush();

    panel.press();

    expect(panel.parts()).toEqual([
      "a@1",
      "b@4",
      `${panel.store.selected()}@4`,
    ]);
  });

  it("is disabled once the model is full, because the store would refuse the copy", () => {
    // **The ceiling is a fact about the fold, not about this panel** — see `MAX_PARTS`. A live
    // button at `MAX_PARTS` would be a button whose press is thrown away.
    const panel = mount(
      Array.from({ length: MAX_PARTS }, (_, i) => sphereAt(`p${i}`, i)),
    );
    expect(panel.button()?.disabled).toBe(true);
  });

  it("does not copy anything while it is disabled", () => {
    const panel = mount([]);
    panel.press();
    expect(panel.parts()).toEqual([]);
    expect(panel.copied()).toEqual([]);
  });
});
