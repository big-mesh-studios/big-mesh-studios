import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  Show,
  type Component,
} from "solid-js";
import type { CommandHelp, CommandOutput } from "../commands";
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

/**
 * One entry of the output: a line the world or a command printed, the echo of
 * a command as it was typed, or the table `/help` answers with.
 */
type ConsoleEntry =
  | { kind: "line"; text: string }
  | { kind: "echo"; command: string }
  | { kind: "help"; commands: CommandHelp[] };

/** A typed command, its name and arguments coloured as `/help` colours them. */
const Echo: Component<{ command: string }> = (props) => {
  const name = (): string => props.command.split(/\s/)[0];
  const args = (): string => props.command.slice(name().length);

  return (
    <div>
      <span class={styles.prompt}>{"> "}</span>
      <span class={styles.name}>{name()}</span>
      <span class={styles.args}>{args()}</span>
    </div>
  );
};

/** Every command, its name against what it does and what it takes. */
const Help: Component<{ commands: CommandHelp[] }> = (props) => (
  <dl class={styles.help}>
    <For each={props.commands}>
      {(command) => (
        <>
          <dt class={styles.name}>{command.name}</dt>
          <dd>
            <Show when={command.args}>
              <span class={styles.args}>{command.args} </span>
            </Show>
            {command.description}
          </dd>
        </>
      )}
    </For>
  </dl>
);

const ConsoleOutput: Component<{ entries: ConsoleEntry[] }> = (props) => {
  let element: HTMLOutputElement = null!;

  // keep the output scrolled to the newest entry
  createEffect(
    () => props.entries,
    () => {
      element.scrollTop = element.scrollHeight;
    },
  );

  return (
    <output ref={element} class={styles.output}>
      <For each={props.entries}>
        {(entry) => {
          switch (entry.kind) {
            case "echo":
              return <Echo command={entry.command} />;
            case "help":
              return <Help commands={entry.commands} />;
            default:
              return <div>{entry.text}</div>;
          }
        }}
      </For>
    </output>
  );
};

export interface ConsoleProps {
  onCommand: (line: string) => CommandOutput | Promise<CommandOutput>;
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
  const [entries, setEntries] = createSignal<ConsoleEntry[]>([]);

  const append = (...added: ConsoleEntry[]): void => {
    setEntries((entries) => [...entries, ...added]);
  };

  /** What a command handed back, as entries to print under its echo. */
  const printed = (output: CommandOutput): ConsoleEntry[] =>
    typeof output === "string"
      ? output.split("\n").map((text) => ({ kind: "line", text }))
      : [{ kind: "help", commands: output }];

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
        append({ kind: "line", text: notice });
      }
    },
  );

  async function onCommand(command: string) {
    if (command === "/clear") {
      setEntries([]);
      return;
    }

    const result = props.onCommand(command);

    if (!(result instanceof Promise)) {
      append({ kind: "echo", command }, ...printed(result));
      return;
    }

    append({ kind: "echo", command }, { kind: "line", text: "…" });

    try {
      append(...printed(await result));
    } catch (error) {
      append({ kind: "line", text: `command failed: ${String(error)}` });
    }
  }

  return (
    <div class={styles.underlay}>
      <Popover.Trigger class={styles.anchor}>{">_"}</Popover.Trigger>
      <Popover.PopOver class={styles.console}>
        <ConsoleOutput entries={entries()} />
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
