import { For, Show, useContext } from "solid-js";
import type { PlanShape } from "../types";
import { NumberField, Vec3Field } from "../components/fields";
import fieldStyles from "../components/fields.module.css";
import { LevelEditorContext } from "../context";
import { BLOCK_CHOICES } from "../structures/blocks";
import styles from "./panels.module.css";

function BlockField(props: {
  label: string;
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <label class={fieldStyles.field}>
      <span class={fieldStyles.label}>{props.label}</span>
      <select
        class={styles.select}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.currentTarget.value))}
      >
        <For each={BLOCK_CHOICES}>
          {(block) => <option value={block.id}>{block.name}</option>}
        </For>
      </select>
    </label>
  );
}

/** The editable fields of the selected shape, one set per shape kind. */
export function ShapePropertiesPanel() {
  const editor = useContext(LevelEditorContext);

  const body = () => {
    const shape = editor.selectedShape();
    if (shape === undefined) {
      return undefined;
    }
    const update = (next: PlanShape) => {
      const index = editor.selectedIndex();
      if (index !== undefined) {
        editor.setShape(index, next);
      }
    };

    switch (shape.kind) {
      case "box":
        return (
          <>
            <Vec3Field
              label="Min"
              value={shape.min}
              onChange={(min) => update({ ...shape, min })}
            />
            <Vec3Field
              label="Max"
              value={shape.max}
              onChange={(max) => update({ ...shape, max })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => update({ ...shape, id })}
            />
          </>
        );
      case "road":
        return (
          <>
            <Vec3Field
              label="From"
              value={shape.from}
              onChange={(from) => update({ ...shape, from })}
            />
            <Vec3Field
              label="To"
              value={shape.to}
              onChange={(to) => update({ ...shape, to })}
            />
            <NumberField
              label="Width"
              min={1}
              value={shape.width}
              onChange={(width) => update({ ...shape, width })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => update({ ...shape, id })}
            />
          </>
        );
      case "house":
        return (
          <>
            <Vec3Field
              label="At"
              value={shape.at}
              onChange={(at) => update({ ...shape, at })}
            />
            <Vec3Field
              label="Size"
              value={shape.size}
              onChange={(size) => update({ ...shape, size })}
            />
            <BlockField
              label="Wall"
              value={shape.wall}
              onChange={(wall) => update({ ...shape, wall })}
            />
            <BlockField
              label="Roof"
              value={shape.roof}
              onChange={(roof) => update({ ...shape, roof })}
            />
            <BlockField
              label="Floor"
              value={shape.floor}
              onChange={(floor) => update({ ...shape, floor })}
            />
          </>
        );
      case "stairs":
        return (
          <>
            <Vec3Field
              label="At"
              value={shape.at}
              onChange={(at) => update({ ...shape, at })}
            />
            <label class={fieldStyles.field}>
              <span class={fieldStyles.label}>Along</span>
              <select
                class={styles.select}
                value={shape.along}
                onChange={(event) =>
                  update({
                    ...shape,
                    along: event.currentTarget.value === "z" ? "z" : "x",
                  })
                }
              >
                <option value="x">x</option>
                <option value="z">z</option>
              </select>
            </label>
            <NumberField
              label="Steps"
              min={1}
              value={shape.steps}
              onChange={(steps) => update({ ...shape, steps })}
            />
            <NumberField
              label="Rise"
              min={1}
              value={shape.rise}
              onChange={(rise) => update({ ...shape, rise })}
            />
            <NumberField
              label="Run"
              min={1}
              value={shape.run}
              onChange={(run) => update({ ...shape, run })}
            />
            <NumberField
              label="Width"
              min={1}
              value={shape.width}
              onChange={(width) => update({ ...shape, width })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => update({ ...shape, id })}
            />
          </>
        );
      case "ramp":
        return (
          <>
            <Vec3Field
              label="From"
              value={shape.from}
              onChange={(from) => update({ ...shape, from })}
            />
            <Vec3Field
              label="To"
              value={shape.to}
              onChange={(to) => update({ ...shape, to })}
            />
            <NumberField
              label="Width"
              min={1}
              value={shape.width}
              onChange={(width) => update({ ...shape, width })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => update({ ...shape, id })}
            />
          </>
        );
    }
  };

  return (
    <div class={styles.panel}>
      <h2 class={styles.heading}>Properties</h2>
      <Show
        when={editor.selectedShape()}
        fallback={<p class={styles.muted}>Select a shape to edit it.</p>}
      >
        <div class={styles.fields}>{body()}</div>
      </Show>
    </div>
  );
}
