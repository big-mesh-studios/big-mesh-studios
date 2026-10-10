/**
 * The list of what the level holds, in the order the world folds it.
 *
 * ## Why the order is editable here and by no other gesture
 *
 * **Two shapes can both be at the same height and fold differently**, because the fold
 * combines with a smooth minimum — symmetric, not associative — so where a shape sits in
 * this list decides what the terrain looks like (ADR 0016). That makes this list's order a
 * real property of the level rather than a display choice.
 *
 * It also means the ▲▼ buttons are the *only* control that changes it, and that is worth
 * saying out loud in the panel: a person who cannot tell fold order from depth order would
 * reach for the position fields in the inspector, change one, and silently rebuild the
 * whole level's fold positions.
 *
 * ## Why an item is labelled by name and kind
 *
 * Because the list is how a person finds the thing they want to change in a level of two
 * hundred. `wall-4 · box` can be scanned; `Box(12, 4, 30)` cannot.
 */

import { For, Show } from "solid-js";

import { Empty } from "../components/controls";
import type { LevelEditor } from "../level-editor-store";
import { itemLabel } from "../../places/level/level-plan";
import styles from "./panels.module.css";

export const ItemListPanel = (props: { editor: LevelEditor }) => (
  <div class={styles.panel}>
    <Show
      when={props.editor.items().length > 0}
      fallback={
        <Empty>Nothing placed yet. Pick a tool, then click the world.</Empty>
      }
    >
      <ul class={styles.list}>
        <For each={props.editor.items()}>
          {(item, index) => (
            <li
              class={[
                styles.item,
                {
                  [styles.itemSelected]:
                    props.editor.selectedIndex() === index(),
                },
              ]}
            >
              <button
                type="button"
                class={styles.itemName}
                aria-current={
                  props.editor.selectedIndex() === index() ? "true" : undefined
                }
                onClick={() => props.editor.select(index())}
              >
                {itemLabel(item)}
              </button>
              <span class={styles.itemControls}>
                <button
                  type="button"
                  class={styles.itemButton}
                  aria-label={`Move ${item.id} earlier in the fold`}
                  title="Earlier in the fold — this decides what the terrain looks like"
                  disabled={index() === 0}
                  onClick={() => props.editor.reorderItem(index(), index() - 1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  class={styles.itemButton}
                  aria-label={`Move ${item.id} later in the fold`}
                  title="Later in the fold — this decides what the terrain looks like"
                  disabled={index() === props.editor.items().length - 1}
                  onClick={() => props.editor.reorderItem(index(), index() + 1)}
                >
                  ▼
                </button>
                <button
                  type="button"
                  class={styles.itemButton}
                  aria-label={`Remove ${item.id}`}
                  onClick={() => props.editor.removeItem(index())}
                >
                  ✕
                </button>
              </span>
            </li>
          )}
        </For>
      </ul>
    </Show>
  </div>
);
