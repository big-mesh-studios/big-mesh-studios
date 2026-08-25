import { createEffect, createSignal, type Component } from "solid-js";
import styles from "./Console.module.css";

export interface ConsoleProps {
  onCommand: (line: string) => string | Promise<string>;
}

/**
 * A collapsible command-line overlay for debugging. The `>_` button sits at
 * the top-right; pressing it reveals a small terminal where commands typed
 * in the input are handed to `onCommand`, whose return value is echoed as
 * output.
 */
export const Console: Component<ConsoleProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [lines, setLines] = createSignal<string[]>([]);
  const [value, setValue] = createSignal("");
  let inputRef: HTMLInputElement | undefined;
  let outputRef: HTMLOutputElement | undefined;

  const submit = (): void => {
    const line = value().trim();
    if (line === "") {
      return;
    }
    const output = props.onCommand(line);
    const emit = (text: string): void => {
      const echoed =
        text === "" ? [`> ${line}`] : [`> ${line}`, ...text.split("\n")];
      setLines((prev) => [...prev, ...echoed]);
    };
    if (typeof output === "string") {
      emit(output);
    } else {
      setLines((prev) => [...prev, `> ${line}`, "…"]);
      void output
        .then((text) => {
          setLines((prev) => [
            ...prev,
            ...(text === "" ? [] : text.split("\n")),
          ]);
        })
        .catch((err) => {
          setLines((prev) => [...prev, `command failed: ${String(err)}`]);
        });
    }
    setValue("");
  };

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

  // focus the input whenever the panel opens
  createEffect(
    () => open(),
    (isOpen) => {
      if (isOpen) {
        inputRef?.focus();
      }
    },
  );

  return (
    <div class={styles.underlay}>
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        onContextMenu={(e) => e.preventDefault()}
        class={styles.anchor}
      >
        {">_"}
      </div>
      {open() && (
        <div class={styles.console}>
          <output ref={outputRef} class={styles.output}>
            {lines().map((l) => (
              <div>{l}</div>
            ))}
          </output>
          <div class={styles["input-container"]}>
            <span class={styles.prefix}>{">"}</span>
            <input
              ref={inputRef}
              value={value()}
              onInput={(e) => setValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submit();
                }
              }}
              placeholder="type a command (/help)"
              style={{
                flex: "1",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                font: "12px monospace",
                padding: "6px 8px 6px 0",
                "min-width": "0",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
