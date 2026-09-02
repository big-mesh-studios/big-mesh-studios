// The list of a figure's parts and the root of whichever one is being drawn
// on. Choosing a part here is what points the six drawing panels, the preview's
// outline, and the arrows at it. What it is drawn inside — the panel it opens
// in — is the caller's to say.
import { Vector3D } from "@big-mesh-studios/maths";
import { createPopover } from "@big-mesh-studios/utils/create-popover";
import { For, useContext } from "solid-js";
import { Command } from "./command/Command";
import {
  Icon,
  IconButton,
  iconTabStyle,
  Tab,
  tabStyle,
} from "./components/components";
import { StackerContext } from "./context";
import styles from "./PartsPanel.module.css";
import { widgetAxes, type WidgetAxis } from "./arm-widget";

export function PartsPanel() {
  const {
    parts,
    selectedPart,
    selectPart,
    addPart,
    duplicatePart,
    removePart,
    renamePart,
    doCommand,
  } = useContext(StackerContext);

  function moveTo(axis: WidgetAxis, to: number) {
    const part = selectedPart();
    const root = { ...part.root, [axis]: to };

    if (Vector3D.equals(root, part.root)) {
      return;
    }

    doCommand(Command.movePart(part.name, root), true, "Move Part");
  }

  /** How many degrees a turn of one radian is, a turn being typed in degrees. */
  const DEGREES = 180 / Math.PI;

  function turnTo(axis: WidgetAxis, degrees: number) {
    const part = selectedPart();

    if (Number.isNaN(degrees)) {
      return;
    }

    const turn = { ...part.turn, [axis]: degrees / DEGREES };

    if (Vector3D.equals(turn, part.turn)) {
      return;
    }

    doCommand(Command.turnPart(part.name, turn), true, "Turn Part");
  }

  function scaleTo(scale: number) {
    const part = selectedPart();

    if (Number.isNaN(scale) || scale === part.scale) {
      return;
    }

    doCommand(Command.scalePart(part.name, scale), true, "Scale Part");
  }

  function askForName() {
    const part = selectedPart();
    const typed = window.prompt("What should this part be called?", part.name);

    if (typed !== null) {
      renamePart(part.name, typed.trim());
    }
  }

  const PartsPopover = createPopover();

  return (
    <>
      <PartsPopover.Trigger
        class={[tabStyle, iconTabStyle]}
        title="The figure's parts"
      >
        <Icon kind="cubes" />
      </PartsPopover.Trigger>
      <PartsPopover.PopOver popover="manual" class={[styles.partsPopover]}>
        <div class={styles.pane}>
          <div class={styles.header}>
            <IconButton kind="plus" onClick={addPart} title="Add a part" />
          </div>
          <div class={styles.list}>
            <For each={parts()}>
              {(part) => {
                const isActive = () => part.name === selectedPart().name;
                return (
                  <div class={styles.part}>
                    <Tab
                      class={styles.partName}
                      selected={isActive()}
                      onClick={() => selectPart(part.name)}
                      title={part.name}
                    >
                      <span>{part.name}</span>
                    </Tab>
                    <IconButton
                      kind="clone"
                      onClick={() => duplicatePart(selectedPart().name)}
                      title="Duplicate this part"
                    />
                    <IconButton
                      kind="trash"
                      onClick={() => removePart(selectedPart().name)}
                      disabled={parts().length <= 1}
                      title="Remove this part"
                    />
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        <div class={[styles.pose, styles.pane]}>
          <For each={widgetAxes}>
            {(axis) => (
              <label
                class={styles.field}
                title={`Where the part stands along the ${axis} axis, in voxels`}
              >
                <span>{axis}</span>
                <input
                  type="number"
                  step="any"
                  value={selectedPart().root[axis]}
                  onChange={(event) =>
                    moveTo(axis, event.currentTarget.valueAsNumber)
                  }
                />
              </label>
            )}
          </For>
          <For each={widgetAxes}>
            {(axis) => (
              <label
                class={styles.field}
                title={`How far the part is turned about its own ${axis} axis, in degrees`}
              >
                <span>{axis}°</span>
                <input
                  type="number"
                  step="15"
                  value={Math.round(selectedPart().turn[axis] * DEGREES)}
                  onChange={(event) =>
                    turnTo(axis, event.currentTarget.valueAsNumber)
                  }
                />
              </label>
            )}
          </For>
          <label
            class={styles.field}
            title="How large the part is drawn, against the part it hangs off"
          >
            <span>×</span>
            <input
              type="number"
              step="0.1"
              min="0.01"
              value={selectedPart().scale}
              onChange={(event) => scaleTo(event.currentTarget.valueAsNumber)}
            />
          </label>
        </div>
      </PartsPopover.PopOver>
    </>
  );
}
