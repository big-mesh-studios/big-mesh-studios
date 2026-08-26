import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  type Component,
} from "solid-js";
import { createPopover } from "../utils/create-popover";
import { isEditableTarget } from "../utils/utils";
import styles from "./Console.module.css";

export interface ConsoleInputHandle {
  /** Focuses the input and replaces what is typed, leaving the caret at the end. */
  prefill(text: string): void;
}

const ConsoleInput: Component<{
  onCommand(command: string): void;
  ref(handle: ConsoleInputHandle): void;
}> = (props) => {
  let element: HTMLInputElement = null!;

  const history: string[] = [];

  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [value, setValue] = createSignal(() => history[historyIndex()]);

  const onKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) => {
    switch (event.key) {
      case "Enter": {
        const line = event.currentTarget.value.trim();

        if (line === "") {
          return;
        }

        props.onCommand(line);
        history.push(line);
        setValue("");

        return;
      }
      case "ArrowUp": {
        setHistoryIndex((index) => {
          if (index === -1) {
            return history.length - 1;
          }
          return index - 1;
        });
        return;
      }
      case "ArrowDown": {
        setHistoryIndex((index) => {
          if (index === history.length - 1) {
            return -1;
          }
          return index + 1;
        });
        return;
      }
    }
  };

  props.ref({
    prefill(text) {
      setValue(text);
      // The signal only reaches the DOM on the next microtask, and the caret
      // has to be placed behind text that is already there.
      element.value = text;
      element.focus();
      element.setSelectionRange(text.length, text.length);
    },
  });

  return (
    <input
      ref={element}
      value={value()}
      autofocus
      onInput={(e) => {
        setHistoryIndex(-1);
        setValue(e.currentTarget.value);
      }}
      onKeyDown={onKeyDown}
      placeholder="type a command (/help)"
      class={styles.input}
    />
  );
};

const ConsoleOutput: Component<{ lines: string[] }> = (props) => {
  let element: HTMLOutputElement = null!;

  // keep the output scrolled to the newest line
  createEffect(
    () => props.lines,
    () => {
      element.scrollTop = element.scrollHeight;
    },
  );

  return (
    <output ref={element} class={styles.output}>
      <For each={props.lines}>{(line) => <div>{line}</div>}</For>
    </output>
  );
};

export interface ConsoleProps {
  onCommand: (line: string) => string | Promise<string>;
  /**
   * A line to append to the output that no typed command asked for, such as
   * the world reporting its atproto state at startup.
   */
  notice?: string;
}

/**
 * A collapsible command-line overlay for debugging. The `>_` button sits at
 * the top-right; pressing it reveals a small terminal where commands typed
 * in the input are handed to `onCommand`, whose return value is echoed as
 * output. Typing `/` while playing opens it too, with the slash already
 * entered.
 */
export const Console: Component<ConsoleProps> = (props) => {
  const [lines, setLines] = createSignal<string[]>([]);

  const Popover = createPopover();

  let input: ConsoleInputHandle = null!;

  const controller = new AbortController();
  onCleanup(() => controller.abort());

  window.addEventListener(
    "keydown",
    (event) => {
      // Modified slashes belong to the browser (Ctrl+/ and friends), and a
      // slash typed into any text field is just a slash.
      if (
        event.key !== "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event)
      ) {
        return;
      }
      event.preventDefault();
      // Looking around holds the pointer lock, which hides the cursor and
      // would leave the console unclickable.
      document.exitPointerLock();
      Popover.open();
      input.prefill("/");
    },
    { signal: controller.signal },
  );

  createEffect(
    () => props.notice,
    (notice) => {
      if (notice !== undefined) {
        setLines((prev) => [...prev, notice]);
      }
    },
  );

  async function onCommand(command: string) {
    if (command === "/clear") {
      setLines([]);
      return;
    }

    const result = props.onCommand(command);

    if (typeof result === "string") {
      setLines((prev) => [...prev, `> ${command}`, ...result.split("\n")]);
    } else {
      setLines((prev) => [...prev, `> ${command}`, "…"]);

      try {
        const text = await result;
        setLines((prev) => [...prev, ...text.split("\n")]);
      } catch (error) {
        setLines((prev) => [...prev, `command failed: ${String(error)}`]);
      }
    }
  }

  return (
    <div class={styles.underlay}>
      <Popover.Trigger class={styles.anchor}>{">_"}</Popover.Trigger>
      <Popover.PopOver class={styles.console}>
        <ConsoleOutput lines={lines()} />
        <div class={styles["input-container"]}>
          <span class={styles.prefix}>{">"}</span>
          <ConsoleInput
            onCommand={onCommand}
            ref={(handle) => {
              input = handle;
            }}
          />
        </div>
      </Popover.PopOver>
    </div>
  );
};
