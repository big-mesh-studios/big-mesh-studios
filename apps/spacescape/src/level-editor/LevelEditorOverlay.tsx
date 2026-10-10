/**
 * The editor, laid over the running world.
 *
 * ## It does not own a canvas
 *
 * **The world's own canvas is pinned into the panel's left pane**, and the world's own
 * renderer draws through it. So the editor has no scene, no renderer and no second copy of
 * anything: what is on screen is the world, with panels over it.
 *
 * That works because the canvas is `100% × 100%` of a `position: relative` root and its
 * `ResizeObserver` watches the canvas element rather than the window (`viewport.ts`), so
 * absolutely positioning it into a pane is enough for the renderer to follow. voxelscape's
 * `applyCanvasBounds` is the same trick and the reason it works there too.
 *
 * ## Why the game loop is suspended rather than slowed
 *
 * `game.tick` is what calls `placeCamera` every frame (`engine/game.ts`), so the player
 * would fight the editor's camera for it. Stopping it also stops the physics, the NPCs and
 * the place's own `onTick`, which is the point: **a level should not change under the person
 * editing it.** Re-starting is a matter of the game reading its own state again, which it
 * does on the next frame.
 *
 * ## Why the panels are a sheet on a narrow screen
 *
 * A 340px side panel beside a canvas is unusable on a phone, and it is worse than useless
 * because the person is editing numbers with a thumb. So below the breakpoint — or on any
 * coarse pointer, because a phone held sideways is wider than the breakpoint and still has
 * no mouse — the panels become a sheet under the canvas with one tab per panel.
 *
 * **Every panel stays mounted and is hidden with `hidden`.** Unmounting and remounting a
 * subtree in this app can destroy the WebGL context — which is what
 * `@big-mesh-studios/ui`'s `Activity` exists to prevent — and here nothing needs the
 * context, but the level's own state does: the panels read the same store, and a panel that
 * remounted would re-read it through a mirror that has not flushed. Keeping them mounted
 * costs nothing and removes the question.
 */

import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";

import { ToolbarPanel } from "./panels/ToolbarPanel";
import { ItemListPanel } from "./panels/ItemListPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { LevelIoPanel } from "./panels/LevelIoPanel";
import type { LevelEditor } from "./level-editor-store";
import { Button, Tab } from "./components/controls";
import styles from "./LevelEditorOverlay.module.css";

/** The panels, and the tab that chooses each. */
const PANELS = [
  { id: "tools", label: "Tools" },
  { id: "items", label: "Level" },
  { id: "properties", label: "Properties" },
  { id: "level", label: "File" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

/**
 * Puts the canvas where the pane says it should be, and puts it back afterwards.
 *
 * **Every value is written in pixels from a measured rect**, because the canvas sizes itself
 * from its own box (`viewport.ts:112`) and a percentage would need the pane to be its parent.
 * The `ResizeObserver` is on the pane rather than on the canvas, so dragging the divider
 * moves the viewport with it instead of waiting for the next window resize.
 *
 * The occupied rectangle is published as a CSS custom property so the console — which is
 * mounted *outside* this overlay and knows nothing about it — can move itself clear of the
 * panels rather than sitting underneath them.
 */
const applyCanvasBounds = (
  canvas: HTMLCanvasElement,
  pane: HTMLElement | undefined,
): (() => void) => {
  // **No pane, nothing to do** — which is the state between mounting and the ref firing.
  //
  const root = document.documentElement;
  if (pane === undefined) return () => {};

  const place = (): void => {
    const box = pane.getBoundingClientRect();
    const outer = canvas.parentElement?.getBoundingClientRect() ?? box;
    canvas.style.position = "absolute";
    canvas.style.left = `${box.left - outer.left}px`;
    canvas.style.top = `${box.top - outer.top}px`;
    canvas.style.width = `${box.width}px`;
    canvas.style.height = `${box.height}px`;
    root.style.setProperty(
      "--level-editor-width",
      `${Math.round(outer.right - box.right)}px`,
    );
  };

  const observer = new ResizeObserver(place);
  observer.observe(pane);
  place();

  return () => {
    observer.disconnect();
    // Every one of the four, and the custom property: leaving `position: absolute` on would
    // leave the canvas floating over the page with nothing holding it.
    canvas.style.position = "";
    canvas.style.left = "";
    canvas.style.top = "";
    canvas.style.width = "";
    canvas.style.height = "";
    root.style.removeProperty("--level-editor-width");
  };
};

export const LevelEditorOverlay = (props: {
  editor: LevelEditor;
  canvas: HTMLCanvasElement;
  models: readonly string[];
  canAttach: boolean;
  onAttach: () => void;
  onClose: () => void;
}) => {
  const [pane, setPane] = createSignal<HTMLDivElement>();
  const [tab, setTab] = createSignal<PanelId>("tools");
  // **Folded on a phone so the world is visible while somebody is picking where to click.**
  const [folded, setFolded] = createSignal(false);

  /**
   * The teardown for whichever pin is currently in place, held so the component's own
   * cleanup can run it.
   *
   * **`onCleanup` inside a `createEffect`'s effect arm does not run when the component is
   * disposed** — measured, not assumed; the effect-arm cleanup is dropped and the canvas is
   * left with `position: absolute` over a page with nothing holding it. A cleanup registered
   * in the component body *does* run. So the undo is held here and called from there.
   */
  let undoCanvasBounds: (() => void) | undefined;
  onCleanup(() => undoCanvasBounds?.());

  /**
   * Pins the canvas to the pane, and moves it when the pane does.
   *
   * **The compute arm watches the pane and the effect arm uses what it is handed.** Reading
   * `pane()` inside the effect instead would be a reactive read outside a tracking scope —
   * it would not re-run, and Solid says so (`STRICT_READ_UNTRACKED`). The value the compute
   * returned *is* `pane()`, and it is also the one this wants.
   *
   * The compute being the accessor itself is what makes this fire at all: `ref={setPane}`
   * gives `undefined` first and the element a moment later, and a version that watched
   * nothing would pin the canvas to nothing.
   *
   * Restoring before re-pinning rather than only on dispose, because a pane that moved and
   * then moved back would otherwise leave two observers on it.
   */
  createEffect(pane, (element) => {
    undoCanvasBounds?.();
    undoCanvasBounds = applyCanvasBounds(props.canvas, element);
  });

  const mobile = () => props.editor.mobile();

  const body = () => (
    <>
      <div hidden={tab() !== "tools" && mobile()} class={styles.paneBody}>
        <ToolbarPanel editor={props.editor} />
      </div>
      <div hidden={tab() !== "items" && mobile()} class={styles.paneBody}>
        <ItemListPanel editor={props.editor} />
      </div>
      <div hidden={tab() !== "properties" && mobile()} class={styles.paneBody}>
        <PropertiesPanel editor={props.editor} models={props.models} />
      </div>
      <div hidden={tab() !== "level" && mobile()} class={styles.paneBody}>
        <LevelIoPanel
          editor={props.editor}
          canAttach={props.canAttach}
          onAttach={props.onAttach}
        />
      </div>
    </>
  );

  return (
    <div class={styles.root} data-mobile={mobile() ? "true" : undefined}>
      <div class={styles.viewport} ref={setPane} />

      <div class={styles.panel} data-folded={folded() ? "true" : undefined}>
        <div class={styles.panelHead}>
          <Show when={mobile()}>
            <div class={styles.tabs} role="tablist">
              <For each={PANELS}>
                {(entry) => (
                  <Tab
                    label={entry.label}
                    selected={tab() === entry.id}
                    onSelect={() => setTab(entry.id)}
                  />
                )}
              </For>
            </div>
          </Show>
          <Show when={mobile()}>
            <button
              type="button"
              class={styles.chevron}
              aria-expanded={folded() ? "false" : "true"}
              aria-label={folded() ? "Show the panels" : "Hide the panels"}
              onClick={() => setFolded(!folded())}
            >
              {folded() ? "▴" : "▾"}
            </button>
          </Show>
          <Button label="Done" onClick={props.onClose} />
        </div>
        <div class={styles.panelBody} hidden={mobile() && folded()}>
          {body()}
        </div>
      </div>
    </div>
  );
};

/**
 * The hint under the viewport.
 *
 * **Said where the gesture happens, and only while the editor is open.** "Left-click places"
 * is advice for a mouse; on a phone the tool applies at a crosshair on a button, and saying
 * "left-click" there would be advice for a machine nobody is holding.
 */
export const LevelEditorHint = (props: {
  cameraKind: () => "orbit" | "no-clip";
  coarsePointer: () => boolean;
  tool: () => string;
}) => (
  <p class={styles.hint}>
    {props.coarsePointer()
      ? "Tap Apply to place · drag to look"
      : props.cameraKind() === "orbit"
        ? "Left-click places · right-drag orbits · shift-right-drag pans · wheel zooms"
        : "Left-click places · WASD and the mouse fly · the tool applies at the crosshair"}
  </p>
);

/**
 * The mobile apply-and-toggle cluster.
 *
 * **A finger never places anything on its own.** Placing and looking are the same gesture in
 * a first-person camera, so on a phone they have to be separate: a thumb on Apply places, a
 * thumb elsewhere looks. The toggle is what lets somebody look *and* place without letting
 * go.
 */
export const LevelEditorTouchControls = (props: {
  onApply: () => void;
  onToggleSelect: () => void;
  selecting: () => boolean;
}) => (
  <div class={styles.touch}>
    <button
      type="button"
      class={styles.touchToggle}
      aria-pressed={props.selecting() ? "true" : "false"}
      onClick={props.onToggleSelect}
    >
      Select
    </button>
    <button type="button" class={styles.touchApply} onClick={props.onApply}>
      Apply
    </button>
  </div>
);
