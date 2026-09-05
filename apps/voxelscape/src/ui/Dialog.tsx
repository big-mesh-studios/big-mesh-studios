import { createSignal, For, onSettled, Show, type Component } from "solid-js";
import styles from "./Dialog.module.css";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { letterAudio } from "./letter-audio";

/** How long between one revealed letter and the next, in milliseconds. */
const LETTER_MS = 36;

/**
 * The dialog overlay: an NPC's words typed out a letter at a time, each letter
 * ticking, with the script's options offered once the prompt has finished.
 * Reading the world's `dialog` and `npcAim` accessors on its own frame loop is
 * how it keeps up — nothing signals letter-by-letter progress, so it counts its
 * own.
 */
export const DialogOverlay: Component = () => {
  const voxelscape = useVoxelscape();
  const [speaker, setSpeaker] = createSignal("");
  const [shown, setShown] = createSignal("");
  const [done, setDone] = createSignal(false);
  const [options, setOptions] = createSignal<string[]>([]);
  const [full, setFull] = createSignal("");

  onSettled(() => {
    let frame = 0;
    let lastKey = "";
    let revealed = 0;
    let began = 0;
    const tick = (now: number): void => {
      const dialog = voxelscape.dialog();
      const promptText = dialog?.prompt ?? "";
      const key = dialog === null ? "" : `${dialog.npcId}\u0000${promptText}`;
      if (key !== lastKey) {
        lastKey = key;
        if (dialog === null) {
          setSpeaker("");
          setShown("");
          setFull("");
          setOptions([]);
          setDone(false);
        } else {
          setSpeaker(dialog.name);
          setFull(promptText);
          setOptions(dialog.options);
          revealed = 0;
          began = now;
          setShown("");
          setDone(false);
        }
      }
      if (dialog !== null && !done()) {
        const due = Math.floor((now - began) / LETTER_MS);
        const target = Math.min(promptText.length, 1 + due);
        while (revealed < target) {
          revealed++;
          const ch = promptText[revealed - 1];
          if (ch !== undefined && ch !== " ") {
            letterAudio.play();
          }
        }
        setShown(promptText.slice(0, revealed));
        if (revealed >= promptText.length) {
          setDone(true);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  /** A tap on the prompt while it is typing shows the whole line at once. */
  const skip = (): void => {
    if (!done()) {
      setShown(full());
      setDone(true);
    }
  };

  return (
    <div class={styles.overlay}>
      <Show when={voxelscape.dialog() === null && voxelscape.npcAim() !== null}>
        <div class={styles.hint}>{voxelscape.npcAim()!.name} — tap to talk</div>
      </Show>
      <Show when={voxelscape.dialog() !== null}>
        <div class={styles.bubble}>
          <div class={styles.speaker}>{speaker()}</div>
          <div class={styles.prompt} onPointerDown={skip}>
            {shown()}
          </div>
          <Show when={done()}>
            <div class={styles.actions}>
              <For each={options()}>
                {(option, index) => (
                  <button
                    class={styles.option}
                    onPointerDown={() => voxelscape.choose(index())}
                  >
                    {option}
                  </button>
                )}
              </For>
            </div>
            <button
              class={styles.leave}
              aria-label="walk away"
              onPointerDown={() => voxelscape.leaveDialog()}
            >
              ✕
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
};
