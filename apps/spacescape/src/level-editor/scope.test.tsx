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

import { createDrawLinesController } from "./draw/draw-lines-controller";

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

  /**
   * **What an effect arm *can* do about it: return the teardown.** That is the other half of
   * the measurement above and the one an application actually writes.
   *
   * The application used `onCleanup` inside three arms that take the world away from the
   * player when the level editor opens — the input disabled, the pointer lock suspended, a
   * canvas listener that places shapes. None of them ever ran, so closing the editor left a
   * person who could not look around and could not walk, with no error beyond a dev warning
   * naming a rule they had to go and read. Returning the teardown runs it on the next run and
   * at dispose, and **the arm needs no owner at all** — which is why it works where
   * `onCleanup` silently does not.
   */
  it("runs a returned teardown on the next run and at dispose, and needs no owner", () => {
    const log: string[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    const original = console.warn;
    const warnings: unknown[][] = [];
    console.warn = (...args: unknown[]) => warnings.push(args);

    let open!: (value: boolean) => void;
    const dispose = render(() => {
      const [isOpen, setOpen] = createSignal(false, { ownedWrite: true });
      open = setOpen;
      createEffect(isOpen, (value) => {
        log.push(`open:${value}`);
        return () => log.push(`closed:${value}`);
      });
      return <span />;
    }, host);
    flush();

    open(true);
    flush();
    open(false);
    flush();
    dispose();
    flush();

    console.warn = original;

    expect(log).toEqual([
      "open:false",
      "closed:false",
      "open:true",
      "closed:true",
      "open:false",
      "closed:false",
    ]);
    // **Not one warning**, which is the difference between this shape and the one above.
    expect(warnings).toEqual([]);
  });

  /**
   * The other rule of the same family, and the one that made a **black screen**: a write to a
   * signal from inside an owned scope is refused, and the refusal halts the whole reactive
   * system rather than failing where it was written.
   *
   * The level editor's setup needs both halves at once. The draw controller makes a signal, so
   * it has to be *created* under the component's owner (the tracked effect's owner cannot hold
   * children — the rule above); but the signal that publishes it is written from `runWithOwner`'s
   * callback, which is an owned scope, so the write has to be *outside* it. This test is the
   * app's exact shape: make under the owner, publish from outside. Move the publish inside and
   * the page goes black with no error at the line that did it — which is why it is pinned here
   * rather than left to the next person to rediscover.
   */
  it("publishes a controller built under the component's owner, from outside it", () => {
    createRoot(() => {
      const component = getOwner();
      const [controller, setController] = createSignal<
        ReturnType<typeof createDrawLinesController> | undefined
      >(undefined, { ownedWrite: true });

      setController(
        runWithOwner(component, () =>
          createDrawLinesController({
            groundAt: () => undefined,
            upAt: () => ({ x: 0, y: 1, z: 0 }),
            projectToScreen: () => undefined,
            snapRadius: 10,
          }),
        ),
      );
      flush();

      expect(controller()).toBeDefined();
      expect(controller()?.state().active).toBe(false);
    });
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
