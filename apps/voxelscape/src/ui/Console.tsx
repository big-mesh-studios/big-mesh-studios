import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import {
  createEffect,
  createSignal,
  flush,
  For,
  onCleanup,
  Show,
  type Accessor,
  type Component,
} from "solid-js";
import type { CommandHelp, CommandOutput } from "../commands";
import { isEditableTarget } from "../utils";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { PlaceEditorContent } from "./PlaceEditor";
import styles from "./Console.module.css";

export interface ConsoleInputHandle {
  /** Focuses the input and replaces what is typed, leaving the caret at the end. */
  prefill(text: string): void;
}

const ConsoleInput: Component<{
  /** Every command, for completing the one being typed and hinting what it takes. */
  commands: CommandHelp[];
  /** Whether the console panel is showing, and with it this input. */
  open: boolean;
  /** Whether opening this input should steal focus straight away. Wanted
   * when opening it is itself the deliberate "I want to type a command"
   * action (the standalone popover); not wanted when it merely comes along
   * for the ride with something else the player opened on purpose (the
   * panel's docked terminal), where it would steal focus from the thing
   * they actually meant to type into. */
  autofocus: boolean;
  onCommand(command: string): void;
  ref(handle: ConsoleInputHandle): void;
}> = (props) => {
  let element: HTMLInputElement = null!;
  let suggestions: HTMLUListElement = null!;

  const history: string[] = [];

  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [value, setValue] = createSignal(() => history[historyIndex()]);
  const [candidateIndex, setCandidateIndex] = createSignal(0);

  /**
   * The command names that fuzzy-match what is typed — every one of its
   * characters appearing in the name in the same order — ranked best match
   * first, shorter names first among equal matches. Only a name is
   * completed, so a line that has reached its arguments has none; one that
   * already spells a name out has none either, unless a longer sibling name
   * extends it too and is worth offering alongside it.
   */
  const candidatesFor = (typed: string): string[] => {
    if (!typed.startsWith("/") || typed.includes(" ")) {
      return [];
    }
    const ranked = props.commands
      .map((command) => command.name)
      .map((name) => [name, fuzzyScore(typed, name)] as const)
      .filter((scored): scored is [string, number] => scored[1] !== undefined)
      .sort(([nameA, a], [nameB, b]) => b - a || nameA.length - nameB.length)
      .map(([name]) => name);
    return ranked.length > 1 ? ranked : ranked.filter((name) => name !== typed);
  };

  /**
   * How well `typed` fuzzy-matches `name`: every character of `typed` has to
   * appear in `name` in the same order, and matches that run together or
   * land earlier score higher. `undefined` when `typed` doesn't match at all.
   */
  const fuzzyScore = (typed: string, name: string): number | undefined => {
    let cursor = 0;
    let streak = 0;
    let score = 0;
    for (const char of typed) {
      const found = name.indexOf(char, cursor);
      if (found === -1) {
        return undefined;
      }
      streak = found === cursor ? streak + 1 : 0;
      score += streak - (found - cursor);
      cursor = found + 1;
    }
    return score;
  };

  /**
   * `name` cut back to the scope boundary that follows what is already typed,
   * so completing `/cl` against `/clock:speed` reaches `/clock:` and
   * completing that again reaches the whole name. A name with no boundary
   * left to stop at completes in full.
   */
  const toScopeBoundary = (name: string, typed: string): string => {
    const boundary = name.indexOf(":", typed.length);
    return boundary === -1 ? name : name.slice(0, boundary + 1);
  };

  const typed = (): string => value() ?? "";

  /**
   * What the command being typed still takes, ghosted after it once its name is
   * spelled out in full. Completing a name is `candidate`'s job; this takes
   * over when there is no name left to complete and the question becomes what
   * goes after it.
   */
  const hint = (): string => {
    const line = typed();
    const command = props.commands.find(
      (entry) => entry.name === line.trimEnd(),
    );
    if (command?.args === undefined) {
      return "";
    }
    // A space of its own, unless what is typed already ends in one.
    return `${line.endsWith(" ") ? "" : " "}${command.args}`;
  };
  const candidates = (): string[] => candidatesFor(typed());
  /** The candidate the arrow keys have landed on, if any is left to show. */
  const candidate = (): string | undefined => candidates()[candidateIndex()];
  /** Whether `line` already spells out a command's name in full. */
  const isCommand = (line: string): boolean =>
    props.commands.some((command) => command.name === line);
  /**
   * `candidate`, only when it continues what is typed as a prefix and what is
   * typed isn't already a complete command in its own right — a fuzzy match
   * that skips ahead of the caret has no trailing remainder that can be
   * ghosted after it, and a name that already stands on its own defers to
   * `hint` instead of ghosting a longer sibling on top of it.
   */
  const ghost = (): string | undefined => {
    if (isCommand(typed())) {
      return undefined;
    }
    const name = candidate();
    return name?.startsWith(typed()) ? name : undefined;
  };

  // Showing the list again whenever the panel reopens puts it back on top of
  // the panel in the top layer, which is stacked in the order things were
  // shown.
  createEffect(
    () => props.open && candidates().length > 0,
    (shown) => {
      suggestions.togglePopover(shown);
    },
  );

  // Keeps the highlighted suggestion in view as the arrow keys walk past the
  // end of the list's scrolled window.
  createEffect(
    () => candidateIndex(),
    (index) => {
      suggestions.children[index]?.scrollIntoView({ block: "nearest" });
    },
  );

  /** Replaces what is typed, leaving the caret at the end. */
  const fill = (text: string): void => {
    setValue(text);
    setCandidateIndex(0);
    // The signal only reaches the DOM on the next microtask, and the caret
    // has to be placed behind text that is already there.
    element.value = text;
    element.focus();
    element.setSelectionRange(text.length, text.length);
  };

  const onKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) => {
    switch (event.key) {
      case "Enter": {
        const line = event.currentTarget.value.trim();
        // A line that already names a command runs as itself; one still
        // being completed runs as the completion standing behind it.
        const command = isCommand(line)
          ? line
          : (candidatesFor(line)[candidateIndex()] ?? line);

        if (command === "") {
          return;
        }

        props.onCommand(command);
        history.push(command);
        setCandidateIndex(0);
        setValue("");

        return;
      }
      case "Tab": {
        const completion = candidate();
        if (completion === undefined) {
          return;
        }
        event.preventDefault();
        const scope = completion.startsWith(typed())
          ? toScopeBoundary(completion, typed())
          : completion;
        fill(scope);
        // The name the arrows had landed on is still the one being completed,
        // so the highlight follows it to the place it takes in the shorter
        // list rather than starting over at the top.
        setCandidateIndex(
          Math.max(0, candidatesFor(scope).indexOf(completion)),
        );
        return;
      }
      case "ArrowUp": {
        // While a completion is standing behind the caret the arrows belong to
        // it, even when there is only the one and they have nowhere to go.
        const count = candidates().length;
        if (count > 0) {
          event.preventDefault();
          setCandidateIndex((index) => (index + count - 1) % count);
          return;
        }
        setHistoryIndex((index) => {
          if (index === -1) {
            return history.length - 1;
          }
          return index - 1;
        });
        return;
      }
      case "ArrowDown": {
        const count = candidates().length;
        if (count > 0) {
          event.preventDefault();
          setCandidateIndex((index) => (index + 1) % count);
          return;
        }
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

  props.ref({ prefill: fill });

  return (
    <div class={styles.field}>
      <input
        ref={element}
        value={value()}
        autofocus={props.autofocus}
        onInput={(e) => {
          setHistoryIndex(-1);
          setCandidateIndex(0);
          setValue(e.currentTarget.value);
        }}
        onKeyDown={onKeyDown}
        placeholder="type a command (/help)"
        class={styles.input}
      />
      <Show when={ghost()}>
        {(completion) => (
          <div class={styles.completion} aria-hidden="true">
            <span class={styles.typed}>{typed()}</span>
            {completion().slice(typed().length)}
          </div>
        )}
      </Show>
      <Show when={hint()}>
        {(args) => (
          <div class={styles.completion} aria-hidden="true">
            <span class={styles.typed}>{typed()}</span>
            {args()}
          </div>
        )}
      </Show>
      {/* A manual popover, kept a child of the field so that the panel around
          it counts as its ancestor and a click on a name doesn't dismiss the
          console. Showing it lifts it into the top layer, clear of the
          panel's clipped edges. */}
      <ul ref={suggestions} popover="manual" class={styles.suggestions}>
        <For each={candidates()}>
          {(name, index) => (
            <li
              class={[
                styles.suggestion,
                { [styles.selected]: index() === candidateIndex() },
              ]}
              // The input keeps the focus, so the caret sits after the name the
              // pointer picked and arguments can be typed straight on.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => fill(name)}
            >
              {name}
            </li>
          )}
        </For>
      </ul>
    </div>
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

export interface CreateConsoleProps {
  onCommand: (line: string) => CommandOutput | Promise<CommandOutput>;
  /** Every command, for completing the one being typed and hinting what it takes. */
  commands: Accessor<CommandHelp[]>;
  /**
   * A line to append to the output that no typed command asked for, such as
   * the world reporting its atproto state at startup.
   */
  notice?: Accessor<string | undefined>;
}

/**
 * The console's history and command handling, independent of wherever it is
 * drawn — the standalone popover and the panel's docked strip both run
 * commands through the same `onCommand` and read the same `entries`, so
 * neither view of the terminal can drift out of sync with the other.
 */
export interface ConsoleState {
  entries: Accessor<ConsoleEntry[]>;
  commands: Accessor<CommandHelp[]>;
  onCommand(command: string): void;
  /** Appends a line no typed command asked for, such as the place editor's
   * own Run/Publish feedback — the same scrollback a command's output goes
   * to, so the editor doesn't need a status line of its own. */
  print(text: string): void;
}

export function createConsole(props: CreateConsoleProps): ConsoleState {
  const [entries, setEntries] = createSignal<ConsoleEntry[]>([]);

  const append = (...added: ConsoleEntry[]): void => {
    setEntries((entries) => [...entries, ...added]);
  };

  /** What a command handed back, as entries to print under its echo. */
  const printed = (output: CommandOutput): ConsoleEntry[] =>
    typeof output === "string"
      ? output.split("\n").map((text) => ({ kind: "line", text }))
      : [{ kind: "help", commands: output }];

  if (props.notice !== undefined) {
    createEffect(
      () => props.notice!(),
      (notice) => {
        if (notice !== undefined) {
          append({ kind: "line", text: notice });
        }
      },
    );
  }

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

  const print = (text: string): void => {
    append({ kind: "line", text });
  };

  return { entries, commands: props.commands, onCommand, print };
}

export interface ConsoleProps {
  terminal: ConsoleState;
}

/**
 * The terminal's visible body — a header naming it, its scrollback (hidden
 * behind the header's chevron to save room), and an always-present input
 * row. It is rendered exactly once, by `Console`, whether or not the place
 * editor is open — see `Console`'s own comment for why that single mount is
 * what makes the growth into the editor a plain CSS transition rather than a
 * cut between two different elements.
 */
const TerminalBody: Component<{
  terminal: ConsoleState;
  /** Whether the scrollback is showing — owned by `Console`, not this
   * component, so other parts of the panel (the models pane, wanting the
   * room back) can collapse it too, not just this header's own chevron. */
  expanded: boolean;
  onToggle(): void;
  /** Whether the header's chevron can collapse the scrollback at all. Solo,
   * the terminal is the only thing on screen — there's nothing else the
   * room would go to, so collapsing it would just hide it for no reason.
   * Docked in the editor, collapsing actually gives the room back. */
  minimizable: boolean;
  /** Registers the input's imperative handle, for the global "/" shortcut. */
  ref(handle: ConsoleInputHandle): void;
}> = (props) => {
  return (
    <>
      <button
        type="button"
        class={styles.dockHeader}
        disabled={!props.minimizable}
        onClick={() => props.onToggle()}
        aria-expanded={props.expanded ? "true" : "false"}
        aria-label={props.expanded ? "collapse terminal" : "expand terminal"}
      >
        <span class={styles.prompt}>{">_"}</span>
        <span class={styles.dockLabel}>terminal</span>
        <Show when={props.minimizable}>
          <span class={styles.dockChevron}>{props.expanded ? "▾" : "▸"}</span>
        </Show>
      </button>
      <Show when={props.expanded}>
        <ConsoleOutput entries={props.terminal.entries()} />
      </Show>
      <div class={styles["input-container"]}>
        <span class={styles.prefix}>{">"}</span>
        <ConsoleInput
          commands={props.terminal.commands()}
          open={true}
          autofocus={true}
          onCommand={props.terminal.onCommand}
          ref={(handle) => props.ref(handle)}
        />
      </div>
    </>
  );
};

/**
 * The one scripting surface: a `>_` trigger that opens a small floating
 * terminal, which — once `/place:editor` runs from it — grows in place to
 * also hold `PlaceEditorContent`, with the terminal staying docked at its
 * bottom throughout. Opening and closing the editor resizes this same panel
 * element rather than swapping between two different ones (an earlier
 * version tried that with the View Transitions API — see ADR 0039 — and
 * found it fighting the browser's snapshot machinery more than it helped);
 * here it's a plain CSS `transition` on `width`/`height`, driven by the
 * `.editorOpen` class, and the terminal never unmounts, so focus, scroll
 * position and command history all just stay where they were.
 */
export const Console: Component<ConsoleProps> = (props) => {
  const voxelscape = useVoxelscape();
  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  const editorOpen = (): boolean => voxelscape.placeEditor.open();
  const [terminalOpen, setTerminalOpen] = createSignal(false);
  const [terminalExpanded, setTerminalExpanded] =
    createSignal(!coarsePointer());
  const shown = (): boolean => terminalOpen() || editorOpen();

  let panel: HTMLDivElement = null!;
  // The trigger button itself is outside `panel`, so a click on it would
  // otherwise also count as the "outside" click that closes the terminal —
  // undone a moment later by the same click's own toggle, which would leave
  // it looking like clicking the trigger to close never did anything.
  let anchor: HTMLButtonElement = null!;
  let input: ConsoleInputHandle = null!;
  // The editor content's own root — not the terminal's, which is a sibling
  // in the same panel — so Escape can tell "still writing a script" apart
  // from "just ran a command and hit Escape out of habit".
  let editorContent: HTMLDivElement | null = null;

  // A locked pointer is hidden and captured by the world's look controls —
  // none of the editor's fields or buttons are clickable under it, so
  // opening the editor releases it the same way the browser's own Escape
  // gesture would.
  createEffect(
    () => editorOpen(),
    (open) => {
      if (open && document.pointerLockElement !== null) {
        document.exitPointerLock();
      }
    },
  );

  // The editor's own content wants the room the scrollback was using —
  // opening the panel collapses it, the same one-time nudge as releasing
  // the pointer above; the chevron is still there for getting it back.
  createEffect(
    () => editorOpen(),
    (open) => {
      if (open) {
        setTerminalExpanded(false);
      }
    },
  );

  const controller = new AbortController();
  onCleanup(() => controller.abort());

  window.addEventListener(
    "keydown",
    (event) => {
      // Modified slashes belong to the browser (Ctrl+/ and friends), and a
      // slash typed into any text field is just a slash.
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isEditableTarget(event)
      ) {
        event.preventDefault();
        setTerminalOpen(true);
        // The panel (and this input) may not exist yet — it mounts on the
        // next microtask flush otherwise, too late for the prefill below.
        flush();
        input.prefill("/");
        return;
      }
      if (event.key !== "Escape") {
        return;
      }
      // With the editor open, Escape closes it — unless focus is inside its
      // own content (CodeMirror, a manifest field), where it's more likely
      // dismissing an autocomplete suggestion than asking to leave. The
      // terminal's own input sits outside that content, so running a
      // command and hitting Escape right after still closes the editor.
      if (editorOpen()) {
        const insideEditor =
          editorContent !== null &&
          event.target instanceof Node &&
          editorContent.contains(event.target);
        if (!insideEditor) {
          voxelscape.placeEditor.setOpen(false);
        }
        return;
      }
      // With just the terminal open, Escape closes it outright — the same
      // light-dismiss a native popover gives for free, regardless of
      // whether the command input itself happens to be focused.
      if (terminalOpen()) {
        setTerminalOpen(false);
      }
    },
    { signal: controller.signal },
  );

  // A pointerdown outside the panel closes the bare terminal, the same
  // light-dismiss a native popover would give for free — but only for the
  // terminal on its own; the editor's scrim below handles its own dismissal,
  // since closing the editor should fall back to the terminal, not to nothing.
  window.addEventListener(
    "pointerdown",
    (event) => {
      if (!terminalOpen() || editorOpen()) {
        return;
      }
      if (
        event.target instanceof Node &&
        !panel.contains(event.target) &&
        !anchor.contains(event.target)
      ) {
        setTerminalOpen(false);
      }
    },
    { signal: controller.signal },
  );

  return (
    <div class={styles.underlay}>
      <button
        ref={anchor}
        class={styles.anchor}
        onClick={() => setTerminalOpen((value) => !value)}
      >
        {">_"}
      </button>
      <Show when={editorOpen()}>
        {/* A click that lands on the scrim itself — not one that started
            inside the panel and bubbled up — closes the editor. */}
        <div
          class={styles.scrim}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              voxelscape.placeEditor.setOpen(false);
            }
          }}
        />
      </Show>
      <Show when={shown()}>
        <div
          ref={panel}
          class={[styles.panel, editorOpen() && styles.editorOpen]}
          role={editorOpen() ? "dialog" : undefined}
          aria-label={editorOpen() ? "place script editor" : undefined}
        >
          <Show when={editorOpen()}>
            <PlaceEditorContent
              ref={(element) => {
                editorContent = element;
              }}
              onStatus={props.terminal.print}
            />
          </Show>
          <div class={styles.terminal}>
            <TerminalBody
              terminal={props.terminal}
              expanded={editorOpen() ? terminalExpanded() : true}
              onToggle={() => setTerminalExpanded((value) => !value)}
              minimizable={editorOpen()}
              ref={(handle) => {
                input = handle;
              }}
            />
          </div>
        </div>
      </Show>
    </div>
  );
};
