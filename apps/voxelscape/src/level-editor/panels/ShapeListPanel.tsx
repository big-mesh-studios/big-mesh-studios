import { For, Show, useContext } from "solid-js";
import { Button } from "../components/components";
import { LevelEditorContext } from "../context";
import { shapeLabel } from "../structures/plan";
import styles from "./panels.module.css";

/** Every shape in the plan, with select, reorder and delete controls. */
export function ShapeListPanel() {
  const editor = useContext(LevelEditorContext);
  return (
    <div class={styles.panel}>
      <h2 class={styles.heading}>Shapes</h2>
      <Show
        when={editor.structures().length > 0}
        fallback={
          <p class={styles.muted}>
            No shapes yet. Pick a tool and click the world.
          </p>
        }
      >
        <ul class={styles.list}>
          <For each={editor.structures()}>
            {(shape, index) => (
              <li
                class={styles.item}
                data-selected={editor.selectedIndex() === index() || undefined}
              >
                <button
                  class={styles.itemButton}
                  onClick={() => editor.selectShape(index())}
                >
                  {shapeLabel(shape)}
                </button>
                <div class={styles.itemActions}>
                  <Button
                    title="Move up in the list"
                    disabled={index() === 0}
                    onClick={() => editor.moveShapeUp(index())}
                  >
                    ▲
                  </Button>
                  <Button
                    title="Move down in the list"
                    disabled={index() === editor.structures().length - 1}
                    onClick={() => editor.moveShapeDown(index())}
                  >
                    ▼
                  </Button>
                  <Button
                    title="Delete"
                    onClick={() => editor.removeShape(index())}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
