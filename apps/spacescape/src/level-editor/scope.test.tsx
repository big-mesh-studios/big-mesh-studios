import { describe, expect, it } from "vitest";
import {
  createEffect,
  createRoot,
  createSignal,
  createTrackedEffect,
  flush,
  getOwner,
  onCleanup,
  runWithOwner,
} from "solid-js";
import { render } from "@solidjs/web";

/**
 * Why the level editor's effects are created the way they are.
 *
 * **`onSettled` runs inside a *tracked effect*, and a tracked effect's owner is marked
 * children-forbidden** (`@solidjs/signals` `dev.js:4075`). Anything reactive created in
 * there is refused with `PRIMITIVE_IN_FORBIDDEN_SCOPE` — and the refusal surfaces during the
 * next flush rather than where the mistake is, which is why it read as an error from
 * `index.tsx` and a thousand lines from the line that caused it.
 *
 * The owner captured one level up is not forbidden, so `runWithOwner` with it is the way
 * through. It is also the *right* owner: the effects belong to the component, so they are
 * disposed when it unmounts rather than leaking into whichever scope happened to run first.
 *
 * The alternative is to hoist the effects to component level and pass the scene in through
 * holders. That is the same fix with more plumbing, and `runWithOwner` says which owner is
 * meant instead of a `let` that has to be filled in before anything reads it.
 */
// @vitest-environment jsdom
describe("an effect created inside a tracked effect", () => {
  /**
   * Declared first, and last on purpose: **an uncaught error in the reactive system halts
   * every update after it** (`REACTIVITY_HALTED`), so the test that provokes one has to come
   * after anything that needs a working reactive system.
   */
  it("is allowed under an owner captured one level up, and keeps re-running", () => {
    const seen: number[] = [];

    createRoot(() => {
      /** The component's own owner — captured before the tracked effect exists. */
      const component = getOwner();
      expect(component).not.toBeNull();
      /**
       * `ownedWrite` because this test writes from inside the root, which Solid 2 refuses.
       * The application writes from event handlers, which are outside it — the same reason
       * `create-place-editor.test.ts` writes through the editor's own API.
       */
      const [n, setN] = createSignal(0, { ownedWrite: true });

      createTrackedEffect(() => {
        runWithOwner(component, () => {
          createEffect(n, (value) => {
            seen.push(value);
          });
        });
      });

      flush();
      setN(7);
      flush();
      setN(8);
      flush();
    });

    // **Every change, not just the first.** An effect that is created but not wired to its
    // source would pass a test that only checked it did not throw, and would be a comment
    // with a runtime.
    expect(seen).toEqual([0, 7, 8]);
  });

  /**
   * The same "Solid will not tell you" family, found by the same route: a cleanup registered
   * inside an effect's effect arm is **dropped** when the component is disposed, while one
   * registered in the component body runs.
   *
   * The overlay depends on the difference. It pins the game's canvas into a pane and has to
   * hand it back on close; a cleanup that silently did not run would leave the canvas
   * `position: absolute` over a page with nothing holding it, and the game underneath
   * rendering to a box nobody can see.
   */
  it("runs a component-body cleanup on dispose, and not an effect-arm one", () => {
    const log: string[] = [];
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => {
      // Returning an element keeps `render` happy; the cleanup work is the point.
      const [n] = createSignal(0, { ownedWrite: true });
      onCleanup(() => log.push("component"));

      createEffect(n, () => {
        onCleanup(() => log.push("effect-arm"));
      });
      return <span />;
    }, host);
    flush();

    dispose();
    flush();

    expect(log).toEqual(["component"]);
  });

  it("is refused without one, because the tracked effect's owner cannot hold children", () => {
    let threw: string | undefined;
    createRoot(() => {
      const [n] = createSignal(0, { ownedWrite: true });
      createTrackedEffect(() => {
        createEffect(n, () => {});
      });
      try {
        // **The throw is here, not where the effect was created**: a tracked effect is lazy,
        // so it runs inside the flush rather than where it was written.
        flush();
      } catch (e) {
        threw = (e as Error).message;
      }
    });
    expect(threw).toMatch(/FORBIDDEN_SCOPE/);
  });
});
