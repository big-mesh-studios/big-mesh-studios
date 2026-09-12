import { createSignal, For, onSettled, Show, type Component } from "solid-js";
import styles from "./Dialog.module.css";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import type { HudReadout } from "../places/script-host";
import { letterAudio } from "./letter-audio";

/** How long between one revealed letter and the next, in milliseconds. */
const LETTER_MS = 36;
/** How long a narration line stays on screen before it fades, in milliseconds. */
const NARRATION_MS = 6_000;

/** How full a bar readout is drawn, as a percentage clamped to 0..100. */
const fillPercent = (readout: HudReadout): number => {
  if (readout.max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (readout.value / readout.max) * 100));
};

/**
 * The meters and lines a place script shows over the world — a fullness meter,
 * a checkpoint counter. It reads the world's `hud` accessor on its own frame
 * loop, the way the dialog overlay does, so a script that changes a readout
 * needs no signal of its own.
 */
export const ScriptHud: Component = () => {
  const voxelscape = useVoxelscape();
  const [readouts, setReadouts] = createSignal<HudReadout[]>([]);

  onSettled(() => {
    let frame = 0;
    let last = "";
    const tick = (): void => {
      const current = voxelscape.hud();
      const key = JSON.stringify(current);
      if (key !== last) {
        last = key;
        setReadouts(current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  return (
    <Show when={readouts().length > 0}>
      <div class={styles.hud}>
        <For each={readouts()}>
          {(readout) => (
            <div class={styles["hud-item"]}>
              <Show when={readout.label !== ""}>
                <span class={styles["hud-label"]}>{readout.label}</span>
              </Show>
              <Show
                when={readout.kind === "bar"}
                fallback={
                  <span class={styles["hud-text"]}>{readout.text}</span>
                }
              >
                <div class={styles["hud-bar"]}>
                  <div
                    class={styles["hud-bar-fill"]}
                    style={{ width: `${fillPercent(readout)}%` }}
                  />
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

/**
 * The line a script shows with no figure speaking it — the inner voice that
 * tells the player what they are thinking. It is not a dialog: no options, and
 * it clears itself after a moment so play carries on.
 */
export const Narration: Component = () => {
  const voxelscape = useVoxelscape();
  const [line, setLine] = createSignal<{ name: string; text: string } | null>(
    null,
  );

  onSettled(() => {
    let last: { name: string; text: string } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const tick = (): void => {
      const current = voxelscape.narration();
      if (current !== last) {
        last = current;
        setLine(current);
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        if (current !== null) {
          timer = setTimeout(() => voxelscape.dismissNarration(), NARRATION_MS);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  });

  return (
    <Show when={line() !== null}>
      <div class={styles.narration}>
        <div class={styles["narration-name"]}>{line()!.name}</div>
        <div class={styles["narration-text"]}>{line()!.text}</div>
      </div>
    </Show>
  );
};

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
      <Show when={voxelscape.cutscene()}>
        <div class={styles["letterbox-top"]} />
        <div class={styles["letterbox-bottom"]} />
      </Show>
      <ScriptHud />
      <Narration />
      <Show when={voxelscape.dialog() === null && voxelscape.npcAim() !== null}>
        <div class={styles.hint}>
          {voxelscape.npcAim()!.name} — tap to {voxelscape.npcAim()!.action}
        </div>
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
