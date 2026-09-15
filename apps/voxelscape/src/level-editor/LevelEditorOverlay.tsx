import { createEffect, onCleanup, onSettled } from "solid-js";
import { VOXEL_SIZE } from "../world/level-data";
import { pickVoxel } from "../world/picker";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { mouseRay } from "./camera/project";
import { Split } from "./components/SplitPane";
import { LevelEditorContext } from "./context";
import { createLevelEditor } from "./level-editor-store";
import { PlanJsonPanel } from "./panels/PlanJsonPanel";
import { ShapeListPanel } from "./panels/ShapeListPanel";
import { ShapePropertiesPanel } from "./panels/ShapePropertiesPanel";
import { ToolbarPanel } from "./panels/ToolbarPanel";
import { defaultShape, shapeBounds } from "./structures/plan";
import { pickShape } from "./view/shape-picking";
import styles from "./LevelEditorOverlay.module.css";

/** How far a click reaches for a voxel to build on, in world units. */
const BUILD_REACH = 256;
/** How far a click reaches for an existing shape, in world units. */
const SELECT_REACH = 512;

/**
 * The level editor as an overlay over the running world: the panels sit on the
 * right of a resizable split, and the left pane is transparent, with the game's
 * own canvas constrained to it so the editor draws through the world the game
 * already mounted. The overlay itself ignores pointer events, so the canvas
 * beneath it keeps the camera's right-drag and wheel and receives the clicks
 * that place and select shapes.
 */
export function LevelEditorOverlay() {
  const voxelscape = useVoxelscape();
  const editor = createLevelEditor({
    structures: () => voxelscape.levelEditor.structures(),
    setStructures: (plan) => voxelscape.levelEditor.setStructures(plan),
  });

  let leftPane: HTMLSpanElement | undefined;

  /** The box drawn around the selected shape, owned by the world's composer. */
  const highlight = voxelscape.levelEditor.highlight;

  createEffect(
    () => editor.selectedShape(),
    (shape) => {
      if (shape === undefined) {
        highlight.visible = false;
        return;
      }
      const bounds = shapeBounds(shape);
      highlight.scale.set(
        (bounds.max[0] - bounds.min[0] + 1) * VOXEL_SIZE,
        (bounds.max[1] - bounds.min[1] + 1) * VOXEL_SIZE,
        (bounds.max[2] - bounds.min[2] + 1) * VOXEL_SIZE,
      );
      highlight.position.set(
        ((bounds.min[0] + bounds.max[0] + 1) / 2) * VOXEL_SIZE,
        ((bounds.min[1] + bounds.max[1] + 1) / 2) * VOXEL_SIZE,
        ((bounds.min[2] + bounds.max[2] + 1) / 2) * VOXEL_SIZE,
      );
      highlight.visible = true;
    },
  );

  /**
   * Pins the shared canvas to the left pane's box, so the render loop's
   * ResizeObserver sees the editor's viewport rather than the whole window and
   * keeps the camera's aspect right.
   */
  const applyCanvasBounds = (): void => {
    const canvas = voxelscape.canvas();
    const pane = leftPane;
    if (canvas === null || pane === undefined) {
      return;
    }
    const container = canvas.parentElement;
    if (container === null) {
      return;
    }
    const paneRect = pane.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    canvas.style.position = "absolute";
    canvas.style.left = `${paneRect.left - containerRect.left}px`;
    canvas.style.top = `${paneRect.top - containerRect.top}px`;
    canvas.style.width = `${paneRect.width}px`;
    canvas.style.height = `${paneRect.height}px`;
    // Publish how much of the right edge the panel takes, so the console —
    // mounted outside this overlay — can move itself left of it.
    document.documentElement.style.setProperty(
      "--level-editor-panel-width",
      `${containerRect.right - paneRect.right}px`,
    );
  };

  onSettled(() => {
    applyCanvasBounds();
    const canvas = voxelscape.canvas();
    const pane = leftPane;
    if (pane === undefined) {
      return;
    }
    const observer = new ResizeObserver(() => applyCanvasBounds());
    observer.observe(pane);

    // The canvas has the game's handlers disabled, so the editor's own click
    // places a shape with the active tool or selects one under the cursor.
    const onClick = (event: MouseEvent): void => {
      if (event.button !== 0 || canvas === null) {
        return;
      }
      const ray = mouseRay(
        voxelscape.levelEditor.camera,
        canvas.clientWidth,
        canvas.clientHeight,
        event.offsetX,
        event.offsetY,
      );
      if (ray === undefined) {
        return;
      }
      const tool = editor.tool();
      if (tool === "select") {
        const pick = pickShape(editor.structures(), ray, SELECT_REACH);
        editor.selectShape(pick?.index);
        return;
      }
      const pick = pickVoxel(
        voxelscape.world.blocks,
        [ray.origin.x, ray.origin.y, ray.origin.z],
        [ray.direction.x, ray.direction.y, ray.direction.z],
        BUILD_REACH,
      );
      if (pick.place === null) {
        return;
      }
      editor.addShape(defaultShape(tool, pick.place, editor.activeBlockId()));
    };
    canvas?.addEventListener("click", onClick);

    return () => {
      observer.disconnect();
      canvas?.removeEventListener("click", onClick);
    };
  });

  onCleanup(() => {
    highlight.visible = false;
    document.documentElement.style.removeProperty("--level-editor-panel-width");
    const canvas = voxelscape.canvas();
    if (canvas === null) {
      return;
    }
    canvas.style.position = "";
    canvas.style.left = "";
    canvas.style.top = "";
    canvas.style.width = "";
    canvas.style.height = "";
  });

  return (
    <div class={styles.overlay}>
      <LevelEditorContext value={editor}>
        <Split direction="column" style={{ width: "100%", height: "100%" }}>
          <Split.Pane
            size="1fr"
            class={styles.canvasPane}
            ref={(element) => (leftPane = element)}
          >
            <div class={styles.hint}>
              Right-drag orbits · Shift+right-drag pans · Wheel zooms ·
              Left-click places
            </div>
          </Split.Pane>
          <Split.Handle size="8px" class={styles.handle} />
          <Split.Pane size="340px" class={styles.side}>
            <ToolbarPanel />
            <ShapeListPanel />
            <ShapePropertiesPanel />
            <PlanJsonPanel />
          </Split.Pane>
        </Split>
      </LevelEditorContext>
    </div>
  );
}
