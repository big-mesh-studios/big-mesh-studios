import { createEffect, createSignal, For, type Component } from "solid-js";
import { createPopover } from "../utils/create-popover";
import styles from "./Console.module.css";

const ConsoleInput: Component<{
  onCommand(command: string): void;
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
 * output.
 */
export const Console: Component<ConsoleProps> = (props) => {
  const [lines, setLines] = createSignal<string[]>([]);

  const Popover = createPopover();

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
          <ConsoleInput onCommand={onCommand} />
        </div>
      </Popover.PopOver>
    </div>
  );
};
