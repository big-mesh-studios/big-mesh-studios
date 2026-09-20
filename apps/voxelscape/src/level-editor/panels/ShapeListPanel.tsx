import { For, Show, useContext } from "solid-js";
import { Button } from "../components/components";
import { LevelEditorContext } from "../context";
import { itemLabel } from "../structures/plan";
import styles from "./panels.module.css";

/** Every item in the plan, with select, reorder and delete controls. */
export function ShapeListPanel() {
  const editor = useContext(LevelEditorContext);
  return (
    <div class={styles.panel}>
      <h2 class={styles.heading}>Plan</h2>
      <Show
        when={editor.items().length > 0}
        fallback={
          <p class={styles.muted}>
            No items yet. Pick a tool and click the world.
          </p>
        }
      >
        <ul class={styles.list}>
          <For each={editor.items()}>
            {(item, index) => (
              <li
                class={styles.item}
                data-selected={editor.selectedIndex() === index() || undefined}
              >
                <button
                  class={styles.itemButton}
                  onClick={() => editor.selectShape(index())}
                >
                  {itemLabel(item)}
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
                    disabled={index() === editor.items().length - 1}
                    onClick={() => editor.moveShapeDown(index())}
                  >
                    ▼
                  </Button>
                  <Button
                    title="Delete"
                    onClick={() => editor.removeItem(index())}
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
