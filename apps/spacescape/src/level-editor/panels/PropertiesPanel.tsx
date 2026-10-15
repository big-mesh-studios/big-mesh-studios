/**
 * The fields for whatever is selected.
 *
 * ## Why the numbers and the handles are both here
 *
 * **Because they are two ways of asking the same question and neither wins.** A drag is
 * quick and imprecise; a typed number is exact and slow, and on a phone the fields are
 * *also* the only way to reach a value a drag cannot — a wall two kilometres away needs
 * digits, not a finger. sdf-modeller offers both and the two stay in step because both
 * write the same item.
 *
 * The handles are `view/move-handles.ts` and `view/rotate-handles.ts`; ADR 0001 named the
 * transform gizmo the highest-risk item in this renderer and recorded a numeric panel as the
 * fallback if it slipped. It did not slip — it arrived, and these fields are what it landed
 * on rather than what it replaced.
 *
 * **Position and size are unchanged by that.** A shape's position is `at` and its size is
 * its primitive's own parameters, which is how they have always been edited, and a drag
 * writes to those same two places. Changing a shape's parameters keeps its fold index
 * (`apply-level.ts`), which is what makes both of them safe to use freely: a wall moved a
 * voxel does not take its neighbours' terrain with it, and it cannot be confused with
 * changing its order, because order is only editable in the list.
 *
 * ## Why the fields are generated from the primitive table
 *
 * A `Capsule` has a length and a radius; a `Sphere` has a radius; an `Ellipsoid` has three.
 * Writing nine sets of fields by hand is how an editor ends up offering a `RoundBox` a
 * field it does not have and a `Torus` none. `PRIMITIVES[kind].parameters` is already the
 * list, with a label, a minimum and a step for each ([ADR 0025](../../../../docs/adr/0025-a-primitive-is-one-table-entry.md)),
 * so this reads it.
 *
 * **Rotation is the one set that is not generated**, because it is not a property of the
 * primitive — it is a property of where this particular shape has been put. It is derived
 * from the stored quaternion for the same reason.
 */

import { For, Show } from "solid-js";

import {
  Bar,
  Button,
  Checkbox,
  Choice,
  ColourField,
  Empty,
  NumberField,
  Vec3Field,
} from "../components/controls";
import type { LevelEditor } from "../level-editor-store";
import { MAX_LEVEL_ITEMS } from "../../places/level/level-plan";
import type { PrimitiveParameter, ShapeType } from "@big-mesh-studios/sdf";
import type {
  Combine,
  LevelFigure,
  LevelItem,
  LevelShape,
  LevelWalls,
  ShapeKind,
} from "../../places/level/types";
import { isLevelShape } from "../../places/level/types";
import { MATERIAL_NAMES } from "../../render/material-names";
import type { Quat } from "@big-mesh-studios/core";
import { fromEuler, toEuler } from "../view/quaternion";
import {
  COMBINE_LABELS,
  isAxial,
  MAX_SHAPE_SIZE,
  MIN_SHAPE_SIZES,
  EDITABLE_PARAMETERS_OF,
} from "./vocabulary";
import styles from "./panels.module.css";

/**
 * How a shape's own parameters are written, keyed by the primitive's field name.
 *
 * **`len` reads "Size" here whatever the shape, and that has been right for all nine of
 * them.** A polygon's `len` is not a size — it is the floor panel's thickness — so the
 * lookup below prefers a key that names the kind, which is what `Polygon.len` is. The
 * bare-name table stays because eight primitives still share it, and a per-kind table
 * with nine rows would repeat "Radius" nine times to say one thing.
 */
const PARAMETER_LABELS: Record<string, string> = {
  radius: "Radius",
  len: "Size",
  majorRadius: "Major",
  minorRadius: "Minor",
  "Polygon.len": "Thickness",
};

/** What a panel calls one parameter of one shape, preferring the shape's own spelling. */
const labelFor = (kind: ShapeType, parameter: PrimitiveParameter): string =>
  PARAMETER_LABELS[`${kind}.${parameter.name}`] ??
  PARAMETER_LABELS[parameter.name] ??
  parameter.name;

/** The furthest anything may be from the origin, which is the field's own ceiling. */
const MAX_POSITION = 100_000;

/** What the model picker offers: whatever the place has attached. */
export const ModelChoices = (props: { names: readonly string[] }) =>
  props.names.map((name) => ({ value: name, label: name }));

export const PropertiesPanel = (props: {
  editor: LevelEditor;
  /** The models the place carries, for the figure's model field. */
  models: readonly string[];
  /** Seeds the draw controller from a wall, for the "Edit lines" button. */
  onEditWalls?: (id: string) => void;
  /** Seeds the drawing from a floor's outline; absent only if built without it. */
  onEditOutline?: (id: string) => void;
}) => {
  const selected = () => props.editor.selectedItem();

  /** Replaces the selected item with an edited copy. */
  const change = (next: LevelItem): void => {
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
    return item !== undefined && item.kind === "figure" ? item : undefined;
  };

  const walls = (): LevelWalls | undefined => props.editor.selectedWalls();

  return (
    <div class={styles.panel}>
      <Show
        when={selected()}
        fallback={<Empty>Select something in the world or the list.</Empty>}
      >
        {/*
          **Components rather than a narrowed `<Show>` child.**

          Solid 2 calls a `<Show>` child's function with tracking switched off, so a child
          that reads the accessor it was handed warns `STRICT_READ_UNTRACKED` — and then the
          fields would never update again, because an item is *replaced* on every edit and
          only a tracked read can notice. Handed the accessor itself and read inside the
          component, every field below is an ordinary tracked read. The same rule
          `precisionText` in `app.tsx` is written for.
        */}
        <Show when={shape()}>
          <ShapeFields current={narrowed(shape, "shape")} change={change} />
        </Show>
        <Show when={figure()}>
          <FigureFields
            current={narrowed(figure, "figure")}
            models={props.models}
            change={change}
          />
        </Show>
        <Show when={walls()}>
          <WallsFields
            current={narrowed(walls, "walls")}
            change={change}
            onEditWalls={props.onEditWalls}
            onEditOutline={props.onEditOutline}
          />
        </Show>
      </Show>
    </div>
  );
};

/**
 * An accessor that cannot answer `undefined`, for a panel mounted only while it has one.
 *
 * **A throw rather than an optional, and it is the trade `<Show>`'s own narrowed child
 * makes**: the fields exist only while the condition holds, so a read that finds nothing is a
 * read from after its own teardown, and there is no value to hand back that would not be a
 * lie about what is selected.
 */
const narrowed =
  <T,>(read: () => T | undefined, what: string) =>
  (): T => {
    const next = read();
    if (next === undefined)
      throw new Error(`the ${what} fields outlived their selection`);
    return next;
  };

/**
 * The fields for a shape.
 *
 * **Reading the shape fresh through `item()` on every render** rather than closing over one
 * value: the item is replaced on every edit, so a closure over what was selected at mount
 * would show the shape as it was when the panel opened.
 */
const ShapeFields = (props: {
  current: () => LevelShape;
  change: (next: LevelShape) => void;
  onEditWalls?: (id: string) => void;
  /** Seeds the drawing from a floor's outline; absent only if built without it. */
  onEditOutline?: (id: string) => void;
}) => {
  const item = props.current;
  const kind = (): ShapeKind => item().shape.type;
  const minimum = (): number => MIN_SHAPE_SIZES[kind()];

  /**
   * This shape's outline, or nothing when it has none.
   *
   * **A narrowing rather than a cast**, because the whole of this bar's condition is "is
   * this a floor" and a cast would let a sphere grow an outline bar the moment the panel
   * stopped reading the discriminant.
   */
  const outline = (): readonly { x: number; z: number }[] | undefined => {
    const shape = item().shape;
    return shape.type === "Polygon" ? shape.points : undefined;
  };

  const setParameter = (
    name: string,
    value: number | { x: number; y: number; z: number },
  ): void => {
    const edited = item();
    props.change({
      ...edited,
      shape: { ...edited.shape, [name]: value } as LevelShape["shape"],
    });
  };

  /** A triple parameter's current value, defaulted so an undeclared one still reads. */
  const vectorParameter = (
    name: string,
  ): { x: number; y: number; z: number } => {
    const value = (item().shape as unknown as Record<string, unknown>)[name];
    const vector = value as { x: number; y: number; z: number } | undefined;
    return vector ?? { x: minimum(), y: minimum(), z: minimum() };
  };

  /** A single parameter's current value. */
  const scalarParameter = (name: string): number => {
    const value = (item().shape as unknown as Record<string, unknown>)[name];
    return typeof value === "number" ? value : minimum();
  };

  return (
    <>
      <Bar label="name">
        <input
          class={styles.text}
          value={item().id}
          aria-label="Item name"
          onChange={(event) => {
            const next = event.currentTarget.value;
            // An empty or renamed name is refused by the level reader as a duplicate, so
            // it is not offered here — the name is how the file addresses the shape.
            if (next.trim() === "") return;
            props.change({ ...item(), id: next.trim() });
          }}
        />
      </Bar>

      <Bar label="joins the world as">
        <Choice
          label="Combine"
          value={item().combine}
          choices={Object.entries(COMBINE_LABELS).map(([value, label]) => ({
            value: value as Combine,
            label,
          }))}
          onChange={(combine) => props.change({ ...item(), combine })}
        />
        <NumberField
          label="Softness"
          value={item().softness ?? 0}
          min={0}
          max={0.25}
          step={0.01}
          onChange={(softness) => props.change({ ...item(), softness })}
        />
      </Bar>

      <Bar label="position">
        <Vec3Field
          label="Where"
          value={item().at}
          min={-MAX_POSITION}
          max={MAX_POSITION}
          onChange={(at) => props.change({ ...item(), at })}
        />
      </Bar>

      {/*
        **Composed from the three degrees on screen, not from the stored quaternion.**

        This is the one field in the panel whose edit is not "take the item and change one
        thing". Composing from the quaternion instead would mean every keystroke in the
        pitch field stacked a turn onto the *last committed* value rather than onto the one
        somebody is looking at — so typing 30 into yaw and then touching pitch would produce
        something that is neither of the two things the panel displayed.

        So: read the three angles out, replace one of them, build the quaternion back.
      */}
      <Show when={isAxial(kind())}>
        <Bar label="rotation">
          <RotationField
            label="Yaw"
            value={toEuler(orientationOf(item())).yaw}
            onChange={(yaw) => props.change(turned(item(), { yaw }))}
          />
          <RotationField
            label="Pitch"
            value={toEuler(orientationOf(item())).pitch}
            onChange={(pitch) => props.change(turned(item(), { pitch }))}
          />
          <RotationField
            label="Roll"
            value={toEuler(orientationOf(item())).roll}
            onChange={(roll) => props.change(turned(item(), { roll }))}
          />
        </Bar>
      </Show>

      {/*
        **A triple gets three fields and a number gets one**, straight from the table's
        `arity`. Showing a triple as a single field would mean an ellipsoid with three
        axes to edit and one field, and whichever axis it showed would be the only one
        reachable.
      */}
      <Bar label={kind().toLowerCase()}>
        {/*
         * **Filtered, and the filter is the whole of how an outline is not a field.**
         * A `variable` parameter has no `min`, no `step` and no input — it is a list of
         * points, and the one that edits it is the draw tool. Rendering it as a number
         * field would put a stepper on a value that is a length, and rendering it as an
         * empty group would put a border round nothing. So the table's own reader,
         * `dimensionGroups`, already leaves it out, and this loop leaves it out too.
         */}
        <For each={EDITABLE_PARAMETERS_OF(kind())}>
          {(parameter) =>
            parameter.arity === 3 ? (
              <Vec3Field
                label={labelFor(kind(), parameter)}
                value={asTriple(vectorParameter(parameter.name))}
                min={Math.max(parameter.min, minimum())}
                max={MAX_SHAPE_SIZE}
                step={parameter.step}
                onChange={(value) =>
                  setParameter(parameter.name, fromTriple(value))
                }
              />
            ) : (
              <NumberField
                label={labelFor(kind(), parameter)}
                value={scalarParameter(parameter.name)}
                min={Math.max(parameter.min, minimum())}
                max={MAX_SHAPE_SIZE}
                step={parameter.step}
                bigStep={parameter.step * 10}
                onChange={(value) => setParameter(parameter.name, value)}
              />
            )
          }
        </For>
      </Bar>

      {/*
       **The outline's own bar, beside the fields rather than among them.**
       *
       * The loop above has already left the outline out, which is right — it has no `min`
       * and no `step` and is not a number. But that leaves a person looking at a floor with
       * nothing at all that says the outline exists or how many corners it has, and the
       * only thing that can change it is a tool on the toolbar. So it is named here, counted
       * here, and reachable from here.
       */}
      <Show when={outline() !== undefined}>
        <Bar label="outline">
          <p class={styles.warn}>
            {outline()?.length ?? 0} points, drawn as a loop.
          </p>
          <Show when={props.onEditOutline !== undefined}>
            <Button
              label="Edit outline"
              title="Redraw this floor's outline, starting from the corners it has now"
              onClick={() => props.onEditOutline?.(item().id)}
            />
          </Show>
        </Bar>
      </Show>

      <Bar label="how it looks">
        <Choice
          label="Material"
          value={item().material ?? ""}
          choices={[
            { value: "", label: "None" },
            ...MATERIAL_NAMES.map((name) => ({ value: name, label: name })),
          ]}
          onChange={(material) =>
            props.change(
              material === ""
                ? { ...item(), material: undefined }
                : { ...item(), material },
            )
          }
        />
        <ColourField
          label="Colour"
          value={item().colour}
          onChange={(colour) => props.change({ ...item(), colour })}
        />
        <Show when={item().combine !== "Paint"}>
          <p class={styles.warn}>
            Colour is only read on a <strong>Paint</strong>. This shape is a{" "}
            {item().combine === "Add" ? "n add" : "subtract"}, so the colour
            will not show.
          </p>
        </Show>
      </Bar>
    </>
  );
};

/** The fields for a figure. Same shape as the ones above, over a different item. */
const FigureFields = (props: {
  current: () => LevelFigure;
  models: readonly string[];
  change: (next: LevelFigure) => void;
}) => {
  const item = props.current;
  return (
    <>
      <Bar label="name">
        <input
          class={styles.text}
          value={item().id}
          aria-label="Item name"
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (next.trim() === "") return;
            props.change({ ...item(), id: next.trim() });
          }}
        />
        <Choice
          label="Kind"
          value={item().figure}
          choices={[
            { value: "prop", label: "Prop" },
            { value: "npc", label: "NPC" },
          ]}
          onChange={(figure) => props.change({ ...item(), figure })}
        />
      </Bar>

      <Bar label="model">
        <Choice
          label="Model"
          value={item().model}
          choices={ModelChoices({ names: props.models })}
          onChange={(model) => props.change({ ...item(), model })}
        />
      </Bar>

      <Bar label="position">
        <Vec3Field
          label="Where"
          value={item().at}
          min={-MAX_POSITION}
          max={MAX_POSITION}
          onChange={(at) => props.change({ ...item(), at })}
        />
        <NumberField
          label="Yaw"
          value={round(item().yaw ?? 0)}
          step={0.1}
          onChange={(yaw) => props.change({ ...item(), yaw })}
        />
        <NumberField
          label="Scale"
          value={item().scale ?? 1}
          min={0.1}
          max={100}
          step={0.05}
          onChange={(scale) => props.change({ ...item(), scale })}
        />
      </Bar>

      <Bar label="behaviour">
        <Checkbox
          label="Solid — the player walks into it"
          value={item().solid ?? true}
          onChange={(solid) => props.change({ ...item(), solid })}
        />
        <Show when={item().figure === "npc"}>
          <input
            class={styles.text}
            value={item().name ?? ""}
            placeholder="What to call it"
            aria-label="Name"
            onChange={(event) =>
              props.change({ ...item(), name: event.currentTarget.value })
            }
          />
          <Show when={(item().name ?? "") === ""}>
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
 * The fields for a drawn set of walls.
 *
 * **Height and thickness are the two numbers a wall has, and the points are not a text field.**
 * A polyline edited by typing coordinates is a polyline nobody edits by typing; the way to
 * change it is to draw it again, which the Walls tool offers by reseeding itself from the
 * item. So the panel shows the height and the thickness — the properties a person adjusts
 * after drawing — and says how many points the drawing holds rather than inviting a hand-edit.
 */
const WallsFields = (props: {
  current: () => LevelWalls;
  change: (next: LevelWalls) => void;
  /** Seeds the drawing from this wall; absent only if the editor was built without it. */
  onEditWalls?: (id: string) => void;
  /** Seeds the drawing from a floor's outline; absent only if built without it. */
  onEditOutline?: (id: string) => void;
}) => {
  const item = props.current;
  const points = (): number =>
    item().lines.reduce((total, line) => total + line.length, 0);

  return (
    <>
      <Bar label="name">
        <input
          class={styles.text}
          value={item().id}
          aria-label="Item name"
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (next.trim() === "") return;
            props.change({ ...item(), id: next.trim() });
          }}
        />
      </Bar>

      <Bar label="joins the world as">
        <Choice
          label="Combine"
          value={item().combine}
          choices={Object.entries(COMBINE_LABELS).map(([value, label]) => ({
            value: value as Combine,
            label,
          }))}
          onChange={(combine) => props.change({ ...item(), combine })}
        />
        <NumberField
          label="Softness"
          value={item().softness ?? 0}
          min={0}
          max={0.25}
          step={0.01}
          onChange={(softness) => props.change({ ...item(), softness })}
        />
      </Bar>

      <Bar label="walls">
        <NumberField
          label="Height"
          value={item().height}
          min={1}
          max={MAX_SHAPE_SIZE}
          step={1}
          bigStep={10}
          onChange={(height) => props.change({ ...item(), height })}
        />
        <NumberField
          label="Thickness"
          value={item().thickness}
          min={1}
          max={MAX_SHAPE_SIZE}
          step={1}
          bigStep={5}
          onChange={(thickness) => props.change({ ...item(), thickness })}
        />
      </Bar>

      <Bar label="drawing">
        <p class={styles.warn}>
          {item().lines.length} {item().lines.length === 1 ? "line" : "lines"},{" "}
          {points()} points.
        </p>
        <Show when={props.onEditWalls !== undefined}>
          <Button
            label="Edit lines"
            title="Redraw these walls, starting from the lines they have now"
            onClick={() => props.onEditWalls?.(item().id)}
          />
        </Show>
      </Bar>

      <Bar label="how it looks">
        <Choice
          label="Material"
          value={item().material ?? ""}
          choices={[
            { value: "", label: "None" },
            ...MATERIAL_NAMES.map((name) => ({ value: name, label: name })),
          ]}
          onChange={(material) =>
            props.change(
              material === ""
                ? { ...item(), material: undefined }
                : { ...item(), material },
            )
          }
        />
        <ColourField
          label="Colour"
          value={item().colour}
          onChange={(colour) => props.change({ ...item(), colour })}
        />
        <Show when={item().combine !== "Paint"}>
          <p class={styles.warn}>
            Colour is only read on a <strong>Paint</strong>. These walls are a{" "}
            {item().combine === "Add" ? "n addition" : " subtraction"}, so the
            colour will not show.
          </p>
        </Show>
      </Bar>
    </>
  );
};

/** A vector parameter as the tuple `Vec3Field` edits, and back again. */
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

/**
 * One rotation angle, in degrees.
 *
 * **Degrees rather than radians, because the yaw field already is** — the figure's has said
 * degrees on this panel since before shapes could turn, and two rotation fields on one
 * screen using different conventions would be a small, permanent trap.
 *
 * **A step of 1 and a big step of 15.** A turn about a wall's own axis is usually a quarter
 * at most, and 15° is the increment somebody reaches for without counting; the single-degree
 * step is for the rest.
 */
const RotationField = (props: {
  label: string;
  value: number;
  onChange: (degrees: number) => void;
}) => (
  <NumberField
    label={props.label}
    value={round(props.value)}
    step={1}
    bigStep={15}
    onChange={props.onChange}
  />
);

/**
 * The turn a shape carries, as the quaternion the maths speaks.
 *
 * **The identity for a shape that names none**, which is every shape in every level written
 * before [ADR
 * 0051](../../../../docs/adr/0051-a-level-shape-carries-its-turn.md) and every shape added
 * since that was never turned. Reading it as anything else would open a level's first
 * un-turned shape's inspector showing a quarter turn.
 */
const orientationOf = (item: LevelShape): Quat =>
  item.orientation === undefined
    ? { x: 0, y: 0, z: 0, w: 1 }
    : {
        x: item.orientation[0],
        y: item.orientation[1],
        z: item.orientation[2],
        w: item.orientation[3],
      };

/**
 * The shape with one of its three angles replaced.
 *
 * **The three angles come out of what is on screen**, which is what makes editing one of them
 * not stack a turn onto a value nobody can see — see the note on the rotation bar.
 */
const turned = (
  item: LevelShape,
  changed: { yaw?: number; pitch?: number; roll?: number },
): LevelShape => {
  const shown = toEuler(orientationOf(item));
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const quaternion = fromEuler(
    toRadians(changed.yaw ?? shown.yaw),
    toRadians(changed.pitch ?? shown.pitch),
    toRadians(changed.roll ?? shown.roll),
  );
  return {
    ...item,
    orientation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
  };
};

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** How full the level is, for a warning before it stops accepting more. */
export const remainingCapacity = (editor: LevelEditor): number =>
  MAX_LEVEL_ITEMS - editor.items().length;
