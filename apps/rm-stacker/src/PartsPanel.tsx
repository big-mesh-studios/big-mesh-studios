// The list of a figure's parts and the root of whichever one is being drawn
// on. Choosing a part here is what points the six drawing panels, the preview's
// outline, and the arrows at it. What it is drawn inside — the panel it opens
// in — is the caller's to say.
import { Vector3D } from "@big-mesh-studios/maths";
import { For, Show, useContext } from "solid-js";
import { Command } from "./command/Command";
import { IconButton, Tab } from "./components/components";
import { StackerContext } from "./context";
import styles from "./PartsPanel.module.css";
import { type WidgetAxis } from "./translate-widget";

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
    const root = { ...part.root, [axis]: Math.round(to) };

    if (Vector3D.equals(root, part.root)) {
      return;
    }

    doCommand(Command.movePart(part.name, root), true, "Move Part");
  }

  function askForName() {
    const part = selectedPart();
    const typed = window.prompt("What should this part be called?", part.name);

    if (typed !== null) {
      renamePart(part.name, typed.trim());
    }
  }

  return (
    <>
      <div class={styles.header}>
        <IconButton kind="plus" onClick={addPart} title="Add a part" />
        <IconButton
          kind="clone"
          onClick={() => duplicatePart(selectedPart().name)}
          title="Duplicate this part"
        />
        <IconButton
          kind="pen-to-square"
          onClick={askForName}
          title="Rename this part"
        />
      </div>
      <div class={styles.list}>
        <For each={parts()}>
          {(part) => {
            const isActive = () => part.name === selectedPart().name;
            return (
              <div
                style={{
                  display: "grid",
                  "grid-template-columns": isActive() ? "1fr auto" : "",
                }}
              >
                <Tab
                  class={styles.part}
                  selected={isActive()}
                  onClick={() => selectPart(part.name)}
                  title={part.name}
                >
                  <span>{part.name}</span>
                </Tab>
                <Show when={isActive()}>
                  <IconButton
                    kind="trash"
                    onClick={() => removePart(selectedPart().name)}
                    disabled={parts().length <= 1}
                    title="Remove this part"
                  />
                </Show>
              </div>
            );
          }}
        </For>
      </div>
      {/* A figure of one part has nothing to place that part against, so its
          root says nothing until there is a second one. */}
      {/* <Show when={parts().length > 1}>
        <div class={styles.root}>
          <For each={widgetAxes}>
            {(axis) => (
              <label class={styles.field}>
                <span>{axis}</span>
                <input
                  type="number"
                  step="1"
                  value={selectedPart().root[axis]}
                  onChange={(event) =>
                    moveTo(axis, event.currentTarget.valueAsNumber)
                  }
                />
              </label>
            )}
          </For>
        </div>
      </Show> */}
    </>
  );
}
