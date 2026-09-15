import { For, useContext } from "solid-js";
import { Bar, Button, Tab } from "../components/components";
import { LevelEditorContext } from "../context";
import { BLOCK_CHOICES } from "../structures/blocks";
import { TOOL_KINDS, type ToolKind } from "../types";
import styles from "./panels.module.css";

const TOOL_LABELS: Record<ToolKind, string> = {
  select: "Select",
  box: "Box",
  road: "Road",
  house: "House",
  stairs: "Stairs",
  ramp: "Ramp",
};

/** The tool row, the block palette, and undo/redo. */
export function ToolbarPanel() {
  const editor = useContext(LevelEditorContext);
  return (
    <Bar>
      <For each={TOOL_KINDS}>
        {(tool) => (
          <Tab
            selected={editor.tool() === tool}
            onClick={() => editor.setTool(tool)}
          >
            {TOOL_LABELS[tool]}
          </Tab>
        )}
      </For>
      <span class={styles.separator} />
      <For each={BLOCK_CHOICES}>
        {(block) => (
          <Tab
            selected={editor.activeBlockId() === block.id}
            title={`Block ${block.id}`}
            onClick={() => editor.setActiveBlockId(block.id)}
          >
            {block.name}
          </Tab>
        )}
      </For>
      <span class={styles.separator} />
      <Button
        disabled={!editor.hasUndo()}
        title={editor.undoDescription()}
        onClick={() => editor.undo()}
      >
        Undo
      </Button>
      <Button
        disabled={!editor.hasRedo()}
        title={editor.redoDescription()}
        onClick={() => editor.redo()}
      >
        Redo
      </Button>
    </Bar>
  );
}
