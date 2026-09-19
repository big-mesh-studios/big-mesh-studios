import { createSignal, For } from "solid-js";
import { Tab } from "./components/components";
import { PlanJsonPanel } from "./panels/PlanJsonPanel";
import { ShapeListPanel } from "./panels/ShapeListPanel";
import { ShapePropertiesPanel } from "./panels/ShapePropertiesPanel";
import { ToolbarPanel } from "./panels/ToolbarPanel";
import styles from "./LevelEditorSheet.module.css";

/** The panels the sheet shows, in the order its tabs list them. */
const PANELS = [
  { id: "tools", label: "Tools" },
  { id: "shapes", label: "Shapes" },
  { id: "properties", label: "Properties" },
  { id: "plan", label: "Plan" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

/**
 * The editor's panels on a narrow screen, as a sheet below the canvas: one tab
 * picks which panel shows, and a chevron folds the sheet down to its tab row so
 * the canvas keeps the screen. Every panel stays mounted, so a tab switch keeps
 * the plan text and the shape list's scroll where they were.
 */
export function LevelEditorSheet() {
  const [active, setActive] = createSignal<PanelId>("tools");
  const [expanded, setExpanded] = createSignal(true);

  return (
    <div class={styles.sheet} data-expanded={expanded() || undefined}>
      <div class={styles.header}>
        <div class={styles.tabs} role="tablist">
          <For each={PANELS}>
            {(panel) => (
              <Tab
                selected={active() === panel.id}
                onClick={() => {
                  setActive(panel.id);
                  setExpanded(true);
                }}
              >
                {panel.label}
              </Tab>
            )}
          </For>
        </div>
        <button
          type="button"
          class={styles.chevron}
          aria-expanded={expanded() ? "true" : "false"}
          aria-label={
            expanded() ? "Collapse the editor panel" : "Expand the editor panel"
          }
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded() ? "▾" : "▴"}
        </button>
      </div>
      <div class={styles.content} hidden={!expanded()}>
        <div class={styles.pane} hidden={active() !== "tools"}>
          <ToolbarPanel />
        </div>
        <div class={styles.pane} hidden={active() !== "shapes"}>
          <ShapeListPanel />
        </div>
        <div class={styles.pane} hidden={active() !== "properties"}>
          <ShapePropertiesPanel />
        </div>
        <div class={styles.pane} hidden={active() !== "plan"}>
          <PlanJsonPanel />
        </div>
      </div>
    </div>
  );
}
