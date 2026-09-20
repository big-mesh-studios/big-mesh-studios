import { For, Show, createMemo, useContext } from "solid-js";
import type { PlanItem, PlanNpc, PlanProp, PlanShape } from "../types";
import { NumberField, Vec3Field } from "../components/fields";
import fieldStyles from "../components/fields.module.css";
import { LevelEditorContext } from "../context";
import { BLOCK_CHOICES } from "../structures/blocks";
import { useVoxelscape } from "../../voxelscape/voxelscape-context";
import styles from "./panels.module.css";

const NPC_MODELS = [
  "npc-sable.zip",
  "npc-rook.zip",
  "npc-teacher.zip",
  "npc-bully.zip",
  "npc-nerd.zip",
  "npc-brad.zip",
  "npc-alex.zip",
  "npc-brit.zip",
  "zombie.zip",
];

const PROP_MODELS = [
  "chair.zip",
  "table.zip",
  "desk.zip",
  "sofa.zip",
  "bed.zip",
  "bench.zip",
  "locker.zip",
  "vending.zip",
  "fridge.zip",
  "door.zip",
  "gate.zip",
  "bus-stop.zip",
  "dumpster.zip",
  "arcade.zip",
  "lemonade-stand.zip",
];

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

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label class={fieldStyles.field}>
      <span class={fieldStyles.label}>{props.label}</span>
      <input
        class={fieldStyles.input}
        type="text"
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function DecimalField(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label class={fieldStyles.field}>
      <span class={fieldStyles.label}>{props.label}</span>
      <input
        class={fieldStyles.input}
        type="number"
        value={props.value}
        step={props.step ?? 0.1}
        onChange={(event) => {
          const value = Number(event.currentTarget.value);
          if (Number.isFinite(value)) {
            props.onChange(value);
          }
        }}
      />
    </label>
  );
}

function BooleanField(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label class={fieldStyles.field}>
      <span class={fieldStyles.label}>{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
    </label>
  );
}

function ModelField(props: {
  label: string;
  value: string;
  models: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label class={fieldStyles.field}>
      <span class={fieldStyles.label}>{props.label}</span>
      <select
        class={styles.select}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        <For each={props.models}>
          {(model) => <option value={model}>{model}</option>}
        </For>
      </select>
    </label>
  );
}

function PositionFields(props: {
  x: number;
  y?: number;
  z: number;
  onChange: (next: { x: number; y?: number; z: number }) => void;
}) {
  return (
    <>
      <NumberField
        label="X"
        value={props.x}
        onChange={(x) => props.onChange({ x, y: props.y, z: props.z })}
      />
      <NumberField
        label="Y"
        value={props.y ?? 0}
        onChange={(y) => props.onChange({ x: props.x, y, z: props.z })}
      />
      <NumberField
        label="Z"
        value={props.z}
        onChange={(z) => props.onChange({ x: props.x, y: props.y, z })}
      />
    </>
  );
}

/** `models` with `value` appended when it does not already name it. */
const withValue = (models: string[], value: string): string[] =>
  models.includes(value) ? models : [...models, value];

/** The editable fields of the selected shape, one set per shape kind. */
export function ShapePropertiesPanel() {
  const editor = useContext(LevelEditorContext);
  const voxelscape = useVoxelscape();

  // The models the loaded place (or demo) attaches beyond the site's bundled
  // defaults, split by the `npc-` prefix into the two dropdowns. A custom NPC
  // model is named `npc-*` exactly as the bundled ones are; every other file
  // the place carries is a prop.
  const attached = createMemo(() =>
    Object.keys(voxelscape.placeEditor.activeProject?.models ?? {}),
  );
  const npcModels = createMemo(() => [
    ...NPC_MODELS,
    ...attached().filter(
      (model) => model.startsWith("npc-") && !NPC_MODELS.includes(model),
    ),
  ]);
  const propModels = createMemo(() => [
    ...PROP_MODELS,
    ...attached().filter(
      (model) => !model.startsWith("npc-") && !PROP_MODELS.includes(model),
    ),
  ]);

  const body = () => {
    const item = editor.selectedItem();
    if (item === undefined) {
      return undefined;
    }
    const updateItem = (next: PlanItem) => {
      const index = editor.selectedIndex();
      if (index !== undefined) {
        editor.setItem(index, next);
      }
    };
    const updateShape = (next: PlanShape) =>
      updateItem({ type: "structure", value: next });
    const updateNpc = (next: PlanNpc) =>
      updateItem({ type: "npc", value: next });
    const updateProp = (next: PlanProp) =>
      updateItem({ type: "prop", value: next });

    if (item.type === "npc") {
      const npc = item.value;
      return (
        <>
          <TextField
            label="ID"
            value={npc.id}
            onChange={(id) => updateNpc({ ...npc, id })}
          />
          <TextField
            label="Name"
            value={npc.name ?? ""}
            onChange={(name) => updateNpc({ ...npc, name })}
          />
          <ModelField
            label="Model"
            value={npc.model ?? "npc-sable.zip"}
            models={withValue(npcModels(), npc.model ?? "npc-sable.zip")}
            onChange={(model) => updateNpc({ ...npc, model })}
          />
          <PositionFields
            x={npc.x}
            y={npc.y}
            z={npc.z}
            onChange={(position) => updateNpc({ ...npc, ...position })}
          />
          <DecimalField
            label="Yaw"
            value={npc.yaw ?? 0}
            onChange={(yaw) => updateNpc({ ...npc, yaw })}
          />
        </>
      );
    }

    if (item.type === "prop") {
      const prop = item.value;
      return (
        <>
          <TextField
            label="ID"
            value={prop.id}
            onChange={(id) => updateProp({ ...prop, id })}
          />
          <TextField
            label="Name"
            value={prop.name ?? ""}
            onChange={(name) => updateProp({ ...prop, name })}
          />
          <ModelField
            label="Model"
            value={prop.model}
            models={withValue(propModels(), prop.model)}
            onChange={(model) => updateProp({ ...prop, model })}
          />
          <PositionFields
            x={prop.x}
            y={prop.y}
            z={prop.z}
            onChange={(position) => updateProp({ ...prop, ...position })}
          />
          <DecimalField
            label="Yaw"
            value={prop.yaw ?? 0}
            onChange={(yaw) => updateProp({ ...prop, yaw })}
          />
          <DecimalField
            label="Height"
            value={prop.height ?? 2}
            onChange={(height) => updateProp({ ...prop, height })}
          />
          <BooleanField
            label="Solid"
            checked={prop.solid ?? false}
            onChange={(solid) => updateProp({ ...prop, solid })}
          />
          <BooleanField
            label="Hazard"
            checked={prop.hazard ?? false}
            onChange={(hazard) => updateProp({ ...prop, hazard })}
          />
        </>
      );
    }

    const shape = item.value;
    switch (shape.kind) {
      case "box":
        return (
          <>
            <Vec3Field
              label="Min"
              value={shape.min}
              onChange={(min) => updateShape({ ...shape, min })}
            />
            <Vec3Field
              label="Max"
              value={shape.max}
              onChange={(max) => updateShape({ ...shape, max })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => updateShape({ ...shape, id })}
            />
          </>
        );
      case "road":
        return (
          <>
            <Vec3Field
              label="From"
              value={shape.from}
              onChange={(from) => updateShape({ ...shape, from })}
            />
            <Vec3Field
              label="To"
              value={shape.to}
              onChange={(to) => updateShape({ ...shape, to })}
            />
            <NumberField
              label="Width"
              min={1}
              value={shape.width}
              onChange={(width) => updateShape({ ...shape, width })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => updateShape({ ...shape, id })}
            />
          </>
        );
      case "house":
        return (
          <>
            <Vec3Field
              label="At"
              value={shape.at}
              onChange={(at) => updateShape({ ...shape, at })}
            />
            <Vec3Field
              label="Size"
              value={shape.size}
              onChange={(size) => updateShape({ ...shape, size })}
            />
            <BlockField
              label="Wall"
              value={shape.wall}
              onChange={(wall) => updateShape({ ...shape, wall })}
            />
            <BlockField
              label="Roof"
              value={shape.roof}
              onChange={(roof) => updateShape({ ...shape, roof })}
            />
            <BlockField
              label="Floor"
              value={shape.floor}
              onChange={(floor) => updateShape({ ...shape, floor })}
            />
          </>
        );
      case "stairs":
        return (
          <>
            <Vec3Field
              label="At"
              value={shape.at}
              onChange={(at) => updateShape({ ...shape, at })}
            />
            <label class={fieldStyles.field}>
              <span class={fieldStyles.label}>Along</span>
              <select
                class={styles.select}
                value={shape.along}
                onChange={(event) =>
                  updateShape({
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
              onChange={(steps) => updateShape({ ...shape, steps })}
            />
            <NumberField
              label="Rise"
              min={1}
              value={shape.rise}
              onChange={(rise) => updateShape({ ...shape, rise })}
            />
            <NumberField
              label="Run"
              min={1}
              value={shape.run}
              onChange={(run) => updateShape({ ...shape, run })}
            />
            <NumberField
              label="Width"
              min={1}
              value={shape.width}
              onChange={(width) => updateShape({ ...shape, width })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => updateShape({ ...shape, id })}
            />
          </>
        );
      case "ramp":
        return (
          <>
            <Vec3Field
              label="From"
              value={shape.from}
              onChange={(from) => updateShape({ ...shape, from })}
            />
            <Vec3Field
              label="To"
              value={shape.to}
              onChange={(to) => updateShape({ ...shape, to })}
            />
            <NumberField
              label="Width"
              min={1}
              value={shape.width}
              onChange={(width) => updateShape({ ...shape, width })}
            />
            <BlockField
              label="Block"
              value={shape.id}
              onChange={(id) => updateShape({ ...shape, id })}
            />
          </>
        );
    }
  };

  return (
    <div class={styles.panel}>
      <h2 class={styles.heading}>Properties</h2>
      <Show
        when={editor.selectedItem()}
        fallback={<p class={styles.muted}>Select an item to edit it.</p>}
      >
        <div class={styles.fields}>{body()}</div>
      </Show>
    </div>
  );
}
