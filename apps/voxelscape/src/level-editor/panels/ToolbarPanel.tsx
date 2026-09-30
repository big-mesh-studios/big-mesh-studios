import { For, useContext } from "solid-js";
import { Bar, Button, Tab } from "../components/components";
import { LevelEditorContext } from "../context";
import { TOOL_KINDS, type ToolKind } from "../types";
import styles from "./panels.module.css";

const TOOL_LABELS: Record<ToolKind, string> = {
  select: "Select",
  box: "Box",
  road: "Road",
  house: "House",
  stairs: "Stairs",
  ramp: "Ramp",
  npc: "NPC",
  prop: "Prop",
};

/** The tool row, with undo/redo and the camera style. */
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
      <span class={styles.separator} />
      <Tab
        selected={editor.cameraKind() === "Orbit"}
        title="orbit the camera with the cursor"
        onClick={() => editor.setCameraKind("Orbit")}
      >
        Orbit
      </Tab>
      <Tab
        selected={editor.cameraKind() === "NoClip"}
        title="fly the camera through the world"
        onClick={() => editor.setCameraKind("NoClip")}
      >
        No-clip
      </Tab>
    </Bar>
  );
}
