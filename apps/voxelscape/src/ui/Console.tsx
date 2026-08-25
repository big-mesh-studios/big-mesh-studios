import { createEffect, createSignal, type Component } from "solid-js";

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
  let outputRef: HTMLDivElement | undefined;

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
    <div style={{ position: "absolute", inset: "0", "pointer-events": "none" }}>
      <div
        style={{
          position: "absolute",
          right: "12px",
          top: "12px",
          width: "44px",
          height: "44px",
          "border-radius": "22px",
          background: "rgba(0,0,0,0.5)",
          color: "#fff",
          font: "bold 16px monospace",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "user-select": "none",
          "touch-action": "none",
          cursor: "pointer",
          "pointer-events": "auto",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {">_"}
      </div>
      {open() && (
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: "64px",
            width: "min(360px, calc(100vw - 24px))",
            height: "260px",
            background: "rgba(0,0,0,0.78)",
            border: "1px solid rgba(255,255,255,0.25)",
            "border-radius": "8px",
            display: "flex",
            "flex-direction": "column",
            font: "12px monospace",
            color: "#c8d6e5",
            "pointer-events": "auto",
            overflow: "hidden",
          }}
        >
          <div
            ref={outputRef}
            style={{
              flex: "1",
              overflow: "auto",
              padding: "8px",
              "white-space": "pre-wrap",
              "word-break": "break-all",
            }}
          >
            {lines().map((l) => (
              <div>{l}</div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              "align-items": "center",
              "border-top": "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span style={{ padding: "6px 4px 6px 8px", color: "#6fcf97" }}>
              {">"}
            </span>
            <input
              ref={inputRef}
              value={value()}
              onInput={(e) => setValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.repeat) {
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
