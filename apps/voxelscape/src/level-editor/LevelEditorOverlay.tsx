import {
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  Show,
} from "solid-js";
import { VOXEL_SIZE } from "../world/level-data";
import { pickVoxel } from "../world/picker";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { mouseRay } from "./camera/project";
import { Split } from "./components/SplitPane";
import { LevelEditorContext } from "./context";
import { createLevelEditor } from "./level-editor-store";
import { LevelEditorSheet } from "./LevelEditorSheet";
import { PlanJsonPanel } from "./panels/PlanJsonPanel";
import { ShapeListPanel } from "./panels/ShapeListPanel";
import { ShapePropertiesPanel } from "./panels/ShapePropertiesPanel";
import { ToolbarPanel } from "./panels/ToolbarPanel";
import { defaultShape, shapeBounds } from "./structures/plan";
import { pickShape } from "./view/shape-picking";
import {
  LevelEditorCrosshair,
  LevelEditorTouchControls,
} from "./TouchControls";
import styles from "./LevelEditorOverlay.module.css";

/** How far a click reaches for a voxel to build on, in world units. */
const BUILD_REACH = 256;
/** How far a click reaches for an existing shape, in world units. */
const SELECT_REACH = 512;

/**
 * The level editor as an overlay over the running world: the panels sit on
 * the right of a resizable split, and the left pane is transparent, with the
 * game's own canvas constrained to it so the editor draws through the world
 * the game already mounted. A screen with no room for the panel beside the
 * canvas, or a hand with no mouse to aim, puts the panels in a sheet below the
 * canvas instead. The overlay itself ignores pointer events, so the canvas
 * beneath it keeps the camera's right-drag and wheel and receives the clicks
 * that place and select shapes.
 */
export function LevelEditorOverlay() {
  const voxelscape = useVoxelscape();
  const editor = createLevelEditor({
    structures: () => voxelscape.levelEditor.structures(),
    setStructures: (plan) => voxelscape.levelEditor.setStructures(plan),
    cameraKind: () => voxelscape.levelEditor.cameraKind(),
    setCameraKind: (kind) => voxelscape.levelEditor.setCameraKind(kind),
  });

  const [leftPane, setLeftPane] = createSignal<HTMLElement>();

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
   * Pins the shared canvas to the pane's box, so the render loop's
   * ResizeObserver sees the editor's viewport rather than the whole window and
   * keeps the camera's aspect right.
   */
  const applyCanvasBounds = (): void => {
    const canvas = voxelscape.canvas();
    const pane = leftPane();
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
    // mounted outside this overlay — can move itself left of it. A sheet below
    // the canvas leaves the right edge free, which measures as no width.
    document.documentElement.style.setProperty(
      "--level-editor-panel-width",
      `${containerRect.right - paneRect.right}px`,
    );
    document.documentElement.style.setProperty(
      "--level-editor-panel-height",
      `${containerRect.bottom - paneRect.bottom}px`,
    );
  };

  /**
   * Applies the active tool to the shape or voxel under a canvas pixel: the
   * select tool picks the shape there, any placing tool stamps its shape
   * against the face the ray meets.
   */
  const applyToolAt = (offsetX: number, offsetY: number): void => {
    const canvas = voxelscape.canvas();
    if (canvas === null) {
      return;
    }
    const ray = mouseRay(
      voxelscape.levelEditor.camera,
      canvas.clientWidth,
      canvas.clientHeight,
      offsetX,
      offsetY,
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

  /** Applies the active tool to whatever the crosshair sits on. */
  const applyToolAtCentre = (): void => {
    const canvas = voxelscape.canvas();
    if (canvas === null) {
      return;
    }
    applyToolAt(canvas.clientWidth / 2, canvas.clientHeight / 2);
  };

  // The pane is a different element in the two arrangements, so the canvas is
  // repinned to whichever one is showing rather than only the first.
  createEffect(leftPane, (pane) => {
    if (pane === undefined) {
      return;
    }
    applyCanvasBounds();
    const observer = new ResizeObserver(() => applyCanvasBounds());
    observer.observe(pane);
    return () => observer.disconnect();
  });

  onSettled(() => {
    const canvas = voxelscape.canvas();
    // The canvas has the game's handlers disabled. On a mouse, a left press
    // places or selects under the cursor; a touch only turns the camera, and
    // the touch cluster's own button places, so a finger dragging to look
    // never stamps a shape.
    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse" || event.button !== 0) {
        return;
      }
      if (editor.cameraKind() === "NoClip") {
        // The locked pointer parks at the canvas centre, so its offset says
        // nothing about where the crosshair is; and the first click only takes
        // the lock, so an unlocked press places nothing.
        if (document.pointerLockElement !== event.currentTarget) {
          return;
        }
        applyToolAtCentre();
        return;
      }
      applyToolAt(event.offsetX, event.offsetY);
    };
    canvas?.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas?.removeEventListener("pointerup", onPointerUp);
    };
  });

  onCleanup(() => {
    highlight.visible = false;
    document.documentElement.style.removeProperty("--level-editor-panel-width");
    document.documentElement.style.removeProperty(
      "--level-editor-panel-height",
    );
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

  /** What the camera's gesture does, and how a tool is applied through it. */
  const hint = (): string => {
    if (editor.cameraKind() === "NoClip") {
      return editor.coarsePointer()
        ? "Drag looks · Joystick flies · Buttons place and select"
        : "Click to look · WASD flies · Left-click places · Esc releases";
    }
    return editor.coarsePointer()
      ? "Drag orbits · Pinch zooms · Buttons place and select"
      : "Right-drag orbits · Shift+right-drag pans · Wheel zooms · Left-click places";
  };

  const canvasContents = () => (
    <>
      <div class={styles.hint}>{hint()}</div>
      {/* A tool applies at the crosshair whenever a finger or a no-clip camera
          is aiming, but under the cursor when a mouse orbits. */}
      <Show when={editor.coarsePointer() || editor.cameraKind() === "NoClip"}>
        <LevelEditorCrosshair />
      </Show>
      <Show when={editor.coarsePointer()}>
        <LevelEditorTouchControls
          tool={editor.tool}
          setTool={editor.setTool}
          apply={applyToolAtCentre}
          noClip={editor.cameraKind() === "NoClip"}
        />
      </Show>
    </>
  );

  return (
    <div class={styles.overlay}>
      <LevelEditorContext value={editor}>
        {editor.mobile() ? (
          <div class={styles.mobile}>
            <div
              class={styles.mobileCanvas}
              ref={(element) => setLeftPane(element)}
            >
              {canvasContents()}
            </div>
            <LevelEditorSheet />
          </div>
        ) : (
          <Split direction="column" style={{ width: "100%", height: "100%" }}>
            <Split.Pane
              size="1fr"
              class={styles.canvasPane}
              ref={(element) => setLeftPane(element)}
            >
              {canvasContents()}
            </Split.Pane>
            <Split.Handle size="8px" class={styles.handle} />
            <Split.Pane size="340px" class={styles.side}>
              <ToolbarPanel />
              <ShapeListPanel />
              <ShapePropertiesPanel />
              <PlanJsonPanel />
            </Split.Pane>
          </Split>
        )}
      </LevelEditorContext>
    </div>
  );
}
