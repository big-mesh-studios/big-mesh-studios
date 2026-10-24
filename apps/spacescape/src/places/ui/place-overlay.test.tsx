// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { flush } from "solid-js";
import { render } from "@solidjs/web";

import type { HostImage } from "../host";
import { PlaceOverlay } from "./PlaceOverlay";

/**
 * The place overlay, mounted for real, with a picture in it.
 *
 * **This exists because the same one-argument `createEffect` that `level-editor/overlay.test.tsx`
 * was written for was still in this file**, in the `<For>` that draws a place's HUD images. It
 * was invisible until a place called `showImage` — which is what a camera shutter does — because
 * the `<For>` body only runs for an item, and an empty list has no items. Solid 2 refuses the
 * one-argument form at the next flush, with a stack that points nowhere near the mistake.
 */

const image: HostImage = {
  id: "reception-image",
  source: { photo: "reception-photo" },
  corner: "top-right",
  width: 256,
  height: 144,
};

const mount = (images: readonly HostImage[]) => {
  const container = document.createElement("div");
  document.body.append(container);
  const drawn: HTMLCanvasElement[] = [];
  const dispose = render(
    () => (
      <PlaceOverlay
        narration={() => undefined}
        dialog={() => undefined}
        ending={() => undefined}
        images={() => images}
        revision={() => 0}
        drawImage={(_image, canvas) => drawn.push(canvas)}
        onChoose={() => {}}
        onRestart={() => {}}
        suspendPointerLock={() => () => {}}
      />
    ),
    container,
  );
  flush();
  return { container, dispose, drawn };
};

describe("the place overlay, mounted", () => {
  it("mounts with no pictures", () => {
    let threw: string | undefined;
    try {
      const { dispose } = mount([]);
      dispose();
    } catch (error) {
      threw = (error as Error).message;
    }

    expect(threw).toBeUndefined();
  });

  it("mounts with a picture in a corner", () => {
    // **The report.** `showImage` adds an image, the `<For>` body runs, and its effect is
    // created for the first time. An empty overlay passes while this throws.
    let threw: string | undefined;
    let container: HTMLElement | undefined;
    let drawn = 0;
    try {
      const mounted = mount([image]);
      container = mounted.container;
      drawn = mounted.drawn.length;
      flush();
    } catch (error) {
      threw = (error as Error).message;
    }
    const canvases = container?.querySelectorAll("canvas").length;
    container?.remove();

    expect(threw).toBeUndefined();
    expect(canvases).toBe(1);
    // **The picture is actually put in the canvas**, not merely a canvas element created. The
    // effect's first run is after the ref, so a still photo does not wait for a revision bump.
    expect(drawn).toBe(1);
  });
});
