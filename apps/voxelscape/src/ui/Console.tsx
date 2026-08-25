import {
  createEffect,
  createSignal,
  For,
  Show,
  type Component,
} from "solid-js";
import styles from "./Console.module.css";

export interface ConsoleProps {
  onCommand: (line: string) => string | Promise<string>;
}

const ConsoleInput = (props: {
  onCommand(command: string): void;
  isOpen: boolean;
}) => {
  let inputRef: HTMLInputElement = null!;

  const history: string[] = [];

  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [value, setValue] = createSignal(() => history[historyIndex()]);

  // focus the input whenever the panel opens
  createEffect(
    () => props.isOpen,
    (isOpen) => {
      if (!isOpen) {
        return;
      }
      inputRef.focus();
    },
  );

  return (
    <input
      ref={inputRef}
      value={value()}
      onInput={(e) => {
        setHistoryIndex(-1);
        setValue(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        switch (e.key) {
          case "Enter": {
            const line = e.currentTarget.value.trim();

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
      }}
      placeholder="type a command (/help)"
      class={styles.input}
    />
  );
};

/**
 * A collapsible command-line overlay for debugging. The `>_` button sits at
 * the top-right; pressing it reveals a small terminal where commands typed
 * in the input are handed to `onCommand`, whose return value is echoed as
 * output.
 */
export const Console: Component<ConsoleProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [lines, setLines] = createSignal<string[]>([]);

  let outputRef: HTMLOutputElement | undefined;

  // keep the output scrolled to the newest line
  createEffect(
    () => {
      lines();
      return outputRef;
    },
    (el) => {
      if (el !== undefined) {
        el.scrollTop = el.scrollHeight;
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
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          setIsOpen((o) => !o);
        }}
        onContextMenu={(e) => e.preventDefault()}
        class={styles.anchor}
      >
        {">_"}
      </div>
      <Show when={isOpen()}>
        <div class={styles.console}>
          <output ref={outputRef} class={styles.output}>
            <For each={lines()}>{(line) => <div>{line}</div>}</For>
          </output>
          <div class={styles["input-container"]}>
            <span class={styles.prefix}>{">"}</span>
            <ConsoleInput onCommand={onCommand} isOpen={isOpen()} />
          </div>
        </div>
      </Show>
    </div>
  );
};
