/**
 * The fields for whatever is selected.
 *
 * ## Why there is no drag and no gizmo
 *
 * **Because rmsl has no `TransformControls`**, and [ADR 0001](../../../../docs/adr/0001-rmsl-over-three.md)
 * names a transform gizmo as the highest-risk item in the project. voxelscape's editor has
 * none either, and it works: a level is edited by clicking a thing and typing its numbers.
 *
 * That choice has a consequence worth naming. **Moving a shape changes its parameters and
 * not its place in the fold** (`apply-level.ts`), which is why the fields below are safe to
 * drag around — a wall moved a voxel does not take its neighbours' terrain with it. It is
 * also why changing a shape's *position* cannot be confused with changing its *order*:
 * order is only editable in the list.
 *
 * ## Why the fields are generated from the primitive table
 *
 * A `Capsule` has a length and a radius; a `Sphere` has a radius; an `Ellipsoid` has three.
 * Writing nine sets of fields by hand is how an editor ends up offering a `RoundBox` a
 * field it does not have and a `Torus` none. `PRIMITIVES[kind].parameters` is already the
 * list, with a label, a minimum and a step for each ([ADR 0025](../../../../docs/adr/0025-a-primitive-is-one-table-entry.md)),
 * so this reads it.
 */

import { For, Show } from "solid-js";

import {
  Bar,
  Checkbox,
  Choice,
  ColourField,
  Empty,
  NumberField,
  Vec3Field,
} from "../components/controls";
import type { LevelEditor } from "../level-editor-store";
import { MAX_LEVEL_ITEMS } from "../../places/level/level-plan";
import type {
  Combine,
  LevelFigure,
  LevelShape,
} from "../../places/level/types";
import { isLevelShape } from "../../places/level/types";
import { MATERIAL_NAMES } from "../../render/material-names";
import {
  COMBINE_LABELS,
  MAX_SHAPE_SIZE,
  MIN_SHAPE_SIZES,
  PARAMETERS_OF,
} from "./vocabulary";
import styles from "./panels.module.css";

/** How a shape's own parameters are written, keyed by the primitive's field name. */
const PARAMETER_LABELS: Record<string, string> = {
  radius: "Radius",
  len: "Size",
  majorRadius: "Major",
  minorRadius: "Minor",
};

/** The furthest anything may be from the origin, which is the field's own ceiling. */
const MAX_POSITION = 100_000;

/** What the model picker offers: whatever the place has attached. */
export const ModelChoices = (props: { names: readonly string[] }) =>
  props.names.map((name) => ({ value: name, label: name }));

export const PropertiesPanel = (props: {
  editor: LevelEditor;
  /** The models the place carries, for the figure's model field. */
  models: readonly string[];
}) => {
  const selected = () => props.editor.selectedItem();

  /** Replaces the selected item with an edited copy. */
  const change = (next: LevelShape | LevelFigure): void => {
    const index = props.editor.selectedIndex();
    if (index === undefined) return;
    props.editor.updateItem(index, next);
  };

  const shape = (): LevelShape | undefined => {
    const item = selected();
    return item !== undefined && isLevelShape(item) ? item : undefined;
  };

  const figure = (): LevelFigure | undefined => {
    const item = selected();
    return item !== undefined && !isLevelShape(item) ? item : undefined;
  };

  return (
    <div class={styles.panel}>
      <Show
        when={selected()}
        fallback={<Empty>Select something in the world or the list.</Empty>}
      >
        <Show when={shape()}>{(current) => shapeFields(current, change)}</Show>
        <Show when={figure()}>
          {(current) => figureFields(current, props.models, change)}
        </Show>
      </Show>
    </div>
  );
};

/**
 * The fields for a shape.
 *
 * **Reading the shape fresh through `current()` on every render** rather than closing over
 * one: the item is replaced on every edit, so a closure over the value at mount would show
 * the shape as it was when the panel opened.
 */
const shapeFields = (
  current: () => LevelShape,
  change: (next: LevelShape) => void,
) => {
  const item = current();
  const kind = item.shape.type;
  const minimum = MIN_SHAPE_SIZES[kind];
  const setParameter = (
    name: string,
    value: number | { x: number; y: number; z: number },
  ): void => {
    change({
      ...item,
      shape: { ...item.shape, [name]: value } as LevelShape["shape"],
    });
  };

  /** A triple parameter's current value, defaulted so an undeclared one still reads. */
  const vectorParameter = (
    name: string,
  ): { x: number; y: number; z: number } => {
    const value = (item.shape as unknown as Record<string, unknown>)[name];
    const vector = value as { x: number; y: number; z: number } | undefined;
    return vector ?? { x: minimum, y: minimum, z: minimum };
  };

  /** A single parameter's current value. */
  const scalarParameter = (name: string): number => {
    const value = (item.shape as unknown as Record<string, unknown>)[name];
    return typeof value === "number" ? value : minimum;
  };

  return (
    <>
      <Bar label="name">
        <input
          class={styles.text}
          value={item.id}
          aria-label="Item name"
          onChange={(event) => {
            const next = event.currentTarget.value;
            // An empty or renamed name is refused by the level reader as a duplicate, so
            // it is not offered here — the name is how the file addresses the shape.
            if (next.trim() === "") return;
            change({ ...item, id: next.trim() });
          }}
        />
      </Bar>

      <Bar label="joins the world as">
        <Choice
          label="Combine"
          value={item.combine}
          choices={Object.entries(COMBINE_LABELS).map(([value, label]) => ({
            value: value as Combine,
            label,
          }))}
          onChange={(combine) => change({ ...item, combine })}
        />
        <NumberField
          label="Softness"
          value={item.softness ?? 0}
          min={0}
          max={0.25}
          step={0.01}
          onChange={(softness) => change({ ...item, softness })}
        />
      </Bar>

      <Bar label="position">
        <Vec3Field
          label="Where"
          value={item.at}
          min={-MAX_POSITION}
          max={MAX_POSITION}
          onChange={(at) => change({ ...item, at })}
        />
      </Bar>

      {/*
        **A triple gets three fields and a number gets one**, straight from the table's
        `arity`. Showing a triple as a single field would mean an ellipsoid with three
        axes to edit and one field, and whichever axis it showed would be the only one
        reachable.
      */}
      <Bar label={kind.toLowerCase()}>
        <For each={PARAMETERS_OF(kind)}>
          {(parameter) =>
            parameter.arity === 3 ? (
              <Vec3Field
                label={PARAMETER_LABELS[parameter.name] ?? parameter.name}
                value={asTriple(vectorParameter(parameter.name))}
                min={Math.max(parameter.min ?? 0, minimum)}
                max={MAX_SHAPE_SIZE}
                step={parameter.step ?? 1}
                onChange={(value) =>
                  setParameter(parameter.name, fromTriple(value))
                }
              />
            ) : (
              <NumberField
                label={PARAMETER_LABELS[parameter.name] ?? parameter.name}
                value={scalarParameter(parameter.name)}
                min={Math.max(parameter.min ?? 0, minimum)}
                max={MAX_SHAPE_SIZE}
                step={parameter.step ?? 1}
                bigStep={
                  parameter.step === undefined ? undefined : parameter.step * 10
                }
                onChange={(value) => setParameter(parameter.name, value)}
              />
            )
          }
        </For>
      </Bar>

      <Bar label="how it looks">
        <Choice
          label="Material"
          value={item.material ?? ""}
          choices={[
            { value: "", label: "None" },
            ...MATERIAL_NAMES.map((name) => ({ value: name, label: name })),
          ]}
          onChange={(material) =>
            change(
              material === ""
                ? { ...item, material: undefined }
                : { ...item, material },
            )
          }
        />
        <ColourField
          label="Colour"
          value={item.colour}
          onChange={(colour) => change({ ...item, colour })}
        />
        <Show when={item.combine !== "Paint"}>
          <p class={styles.warn}>
            Colour is only read on a <strong>Paint</strong>. This shape is a{" "}
            {item.combine === "Add" ? "n add" : "subtract"}, so the colour will
            not show.
          </p>
        </Show>
      </Bar>
    </>
  );
};

/** The fields for a figure. */
const figureFields = (
  current: () => LevelFigure,
  models: readonly string[],
  change: (next: LevelFigure) => void,
) => {
  const item = current();
  return (
    <>
      <Bar label="name">
        <input
          class={styles.text}
          value={item.id}
          aria-label="Item name"
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (next.trim() === "") return;
            change({ ...item, id: next.trim() });
          }}
        />
        <Choice
          label="Kind"
          value={item.figure}
          choices={[
            { value: "prop", label: "Prop" },
            { value: "npc", label: "NPC" },
          ]}
          onChange={(figure) => change({ ...item, figure })}
        />
      </Bar>

      <Bar label="model">
        <Choice
          label="Model"
          value={item.model}
          choices={ModelChoices({ names: models })}
          onChange={(model) => change({ ...item, model })}
        />
      </Bar>

      <Bar label="position">
        <Vec3Field
          label="Where"
          value={item.at}
          min={-MAX_POSITION}
          max={MAX_POSITION}
          onChange={(at) => change({ ...item, at })}
        />
        <NumberField
          label="Yaw"
          value={round(item.yaw ?? 0)}
          step={0.1}
          onChange={(yaw) => change({ ...item, yaw })}
        />
        <NumberField
          label="Scale"
          value={item.scale ?? 1}
          min={0.1}
          max={100}
          step={0.05}
          onChange={(scale) => change({ ...item, scale })}
        />
      </Bar>

      <Bar label="behaviour">
        <Checkbox
          label="Solid — the player walks into it"
          value={item.solid ?? true}
          onChange={(solid) => change({ ...item, solid })}
        />
        <Show when={item.figure === "npc"}>
          <input
            class={styles.text}
            value={item.name ?? ""}
            placeholder="What to call it"
            aria-label="Name"
            onChange={(event) =>
              change({ ...item, name: event.currentTarget.value })
            }
          />
          <Show when={(item.name ?? "") === ""}>
            <p class={styles.warn}>
              An npc needs a name — it is what somebody talks to. The level
              reader refuses a file with an unnamed one.
            </p>
          </Show>
        </Show>
      </Bar>
    </>
  );
};

/**
 * A vector parameter as the tuple `Vec3Field` edits, and back again.
 *
 * **The tuple because that is what the field takes**, not because a level's vectors are
 * tuples — `Vec3Field` is shared with position, which *is* `Vec3Like`. These two
 * conversions are the whole of the difference between the two shapes of number in a level.
 */
const asTriple = (v: {
  x: number;
  y: number;
  z: number;
}): [number, number, number] => [v.x, v.y, v.z];
const fromTriple = (v: readonly [number, number, number]) => ({
  x: v[0],
  y: v[1],
  z: v[2],
});

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** How full the level is, for a warning before it stops accepting more. */
export const remainingCapacity = (editor: LevelEditor): number =>
  MAX_LEVEL_ITEMS - editor.items().length;
