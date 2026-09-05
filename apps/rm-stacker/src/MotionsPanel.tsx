// The list of the figure's motions and which of them is being worked on.
// Choosing one here is what the transport winds and what a pose recorded at a
// frame goes into. What it is drawn inside — the panel it opens in — is the
// caller's to say.
import { createPopover } from "@big-mesh-studios/utils/create-popover";
import { For, Show, useContext } from "solid-js";
import {
  Icon,
  IconButton,
  iconTabStyle,
  Tab,
  tabStyle,
} from "./components/components";
import { StackerContext } from "./context";
import styles from "./MotionsPanel.module.css";

export function MotionsPanel() {
  const {
    motions,
    motion,
    selectMotion,
    addMotion,
    renameMotion,
    removeMotion,
  } = useContext(StackerContext);

  function askForName(name: string) {
    const typed = window.prompt("What should this motion be called?", name);

    if (typed !== null) {
      renameMotion(name, typed.trim());
    }
  }

  function askToRemove(name: string) {
    // A motion is not on the history the way a drawing is, so taking one away
    // cannot be taken back.
    if (window.confirm(`Take away "${name}" and every key in it?`)) {
      removeMotion(name);
    }
  }

  const MotionsPopover = createPopover();

  return (
    <>
      <MotionsPopover.Trigger
        class={[tabStyle, iconTabStyle]}
        title="The figure's motions"
      >
        <Icon kind="clapperboard" />
      </MotionsPopover.Trigger>
      <MotionsPopover.PopOver popover="manual" class={[styles.motionsPopover]}>
        <div class={styles.pane}>
          <div class={styles.header}>
            <IconButton kind="plus" onClick={addMotion} title="Add a motion" />
          </div>
          <div class={styles.list}>
            <For each={motions()}>
              {(held) => {
                const isActive = () => held.name === motion().name;
                return (
                  <div class={styles.motion} data-selected={isActive()}>
                    <Tab
                      class={styles.name}
                      selected={isActive()}
                      onClick={() => selectMotion(held.name)}
                      title={held.name}
                    >
                      <span>{held.name}</span>
                    </Tab>
                    <IconButton
                      class={styles.action}
                      kind="pen"
                      onClick={() => askForName(held.name)}
                      title="Call this motion something else"
                    />
                    <Show when={motions().length > 1}>
                      <IconButton
                        class={styles.action}
                        kind="trash"
                        onClick={() => askToRemove(held.name)}
                        title="Take this motion away"
                      />
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </MotionsPopover.PopOver>
    </>
  );
}
