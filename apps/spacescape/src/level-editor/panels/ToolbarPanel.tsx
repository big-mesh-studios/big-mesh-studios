/**
 * The toolbar: which tool a click places, and what can be taken back.
 *
 * ## Why the tools are one row and not two
 *
 * voxelscape has a tool row and a block palette below it. A level here has no block palette,
 * because it has no blocks — so the shape's *kind* and its *combine* sit in the row with the
 * tools, which means everything a click will do is on one screen. That is the whole of the
 * difference and it is the reason this panel is short.
 *
 * ## Why combine is here and not in the inspector
 *
 **Combine decides what a shape does to the world, and that is a decision made once, when
 * placing it.** It is the difference between a wall and a doorway and a patch of colour, and
 * changing it afterwards changes a shape that other shapes are folded against. So it is
 * chosen here and edited there — the inspector offers it too, for the person who did get it
 * wrong.
 */

import { For } from "solid-js";

import { Bar, Button } from "../components/controls";
import {
  GIZMO_KINDS,
  TOOL_KINDS,
  type GizmoKind,
  type LevelEditor,
} from "../level-editor-store";
import { COMBINE_LABELS, SHAPE_KINDS, SHAPE_KIND_LABELS } from "./vocabulary";
import type { Combine } from "../../places/level/types";

/** What each tool is called in the toolbar, and what it does. */
const TOOL_LABELS: Record<string, string> = {
  select: "Select",
  shape: "Shape",
  prop: "Prop",
  npc: "NPC",
  walls: "Walls",
  floor: "Floor",
  image: "Image",
};

const TOOL_TITLES: Record<string, string> = {
  select: "Pick whatever is under the pointer",
  shape: "Place a shape where you click",
  prop: "Stand a prop where you click",
  npc: "Stand a named character where you click",
  walls: "Draw lines in a plane, then Finish to raise them into walls",
  floor: "Draw one closed loop in a plane, then Finish to lay a floor",
  image:
    "Lay a reference picture on the ground to trace against, then drag to move it",
};

/**
 * What each gizmo is called, and what it says about itself.
 *
 * **Every title says where it works**, because the handles are not available everywhere and
 * a button that does nothing is worse than one that is greyed out. Orbit only: under no-clip
 * the pointer lock is on, `clientX` does not move, and there is nothing for a screen-space
 * hit test to measure (`CameraControl.claimGesture`).
 */
const GIZMO_LABELS: Record<GizmoKind, string> = {
  move: "Move",
  rotate: "Rotate",
  off: "None",
};

const GIZMO_TITLES: Record<GizmoKind, string> = {
  move: "Arrows on the selected item — drag one to move it. Orbit camera only",
  rotate: "Rings on the selected item — drag one to turn it. Orbit camera only",
  off: "No handles on the selected item; the fields are the only way to change it",
};

const COMBINES = Object.keys(COMBINE_LABELS) as Combine[];

export const ToolbarPanel = (props: { editor: LevelEditor }) => (
  <>
    <Bar label="tool">
      <For each={TOOL_KINDS}>
        {(kind) => (
          <Button
            label={TOOL_LABELS[kind] ?? kind}
            title={TOOL_TITLES[kind]}
            selected={props.editor.tool() === kind}
            onClick={() => props.editor.setTool(kind)}
          />
        )}
      </For>
    </Bar>

    {/*
      **Its own row rather than a fifth tool**, because it answers a different question.
      `tool` decides what a click on the world *does*; this decides what a press on a handle
      does, and a press on a handle is never a click. Folding them into one list would mean
      every place branching on the tool also had to answer this one — see `GizmoKind`.

      **Disabled without a selection**, which is what "there is nothing to put handles on"
      looks like, rather than a row of buttons that quietly do nothing.
    */}
    <Bar label="handles">
      <For each={GIZMO_KINDS}>
        {(kind) => (
          <Button
            label={GIZMO_LABELS[kind]}
            title={GIZMO_TITLES[kind]}
            selected={props.editor.gizmo() === kind}
            disabled={
              kind !== "off" && props.editor.selectedItem() === undefined
            }
            onClick={() => props.editor.setGizmo(kind)}
          />
        )}
      </For>
    </Bar>

    <Bar label="shape">
      <For each={SHAPE_KINDS}>
        {(kind) => (
          <Button
            label={SHAPE_KIND_LABELS[kind]}
            title={`Place a ${SHAPE_KIND_LABELS[kind].toLowerCase()}`}
            selected={props.editor.shapeKind() === kind}
            onClick={() => props.editor.setShapeKind(kind)}
          />
        )}
      </For>
    </Bar>

    <Bar label="joins the world as">
      <For each={COMBINES}>
        {(combine) => (
          <Button
            label={COMBINE_LABELS[combine]}
            title={COMBINE_TITLES[combine]}
            selected={props.editor.combine() === combine}
            onClick={() => props.editor.setCombine(combine)}
          />
        )}
      </For>
    </Bar>

    <Bar label="history">
      <Button
        label="Undo"
        title={props.editor.undoDescription() ?? "Nothing to undo"}
        disabled={!props.editor.hasUndo()}
        onClick={() => props.editor.undo()}
      />
      <Button
        label="Redo"
        title={props.editor.redoDescription() ?? "Nothing to redo"}
        disabled={!props.editor.hasRedo()}
        onClick={() => props.editor.redo()}
      />
    </Bar>

    <Bar label="camera">
      <Button
        label="Orbit"
        title="Right-drag to swing, shift-right-drag to slide, wheel to zoom"
        selected={props.editor.cameraKind() === "orbit"}
        onClick={() => props.editor.setCameraKind("orbit")}
      />
      <Button
        label="No-clip"
        title="Fly with WASD and the mouse; the tool applies at the crosshair"
        selected={props.editor.cameraKind() === "no-clip"}
        onClick={() => props.editor.setCameraKind("no-clip")}
      />
    </Bar>
  </>
);

/**
 * What each combine does, said where somebody is choosing one.
 *
 * **Colour only paints** is here because it is the one field that silently does nothing on
 * the other two. `host.ts` sets colour on a `Paint` and on nothing else, so a person who
 * picks a colour for a wall is choosing something that will not appear and nothing would
 * say so.
 */
const COMBINE_TITLES: Record<string, string> = {
  Add: "Adds material, the way terrain is built up",
  Subtract: "Cuts away — a doorway, a pit, a room",
  Paint: "Colours a surface without changing the shape",
};
