/**
 * The editor's code panes: one CodeMirror per file, over a language service holding the guest
 * library.
 *
 * ## A lazy chunk, and the reason is the module
 *
 * **This file imports `@big-mesh-studios/solid-codemirror` and nothing else in this directory
 * does**, which is what makes it worth splitting out. CodeMirror with a TypeScript language service
 * over Comlink is a third of a megabyte and a CDN round trip, and a person who opens the editor to
 * change a seed should not pay for it — so `PlaceEditor` imports this module dynamically and shows a
 * line of prose until the chunk lands. The sibling project does the same for the same reason (its
 * ADR 0028).
 *
 * **Authoring needs a network, and this is where that is true for TypeScript.** The worker
 * fetches TypeScript and the standard library `lib.*.d.ts` from esm.sh. Until it answers, a
 * TypeScript editor has no type-aware completions or lint, and rebuilds itself when it does. A
 * person offline gets a working text editor, which is the degraded case rather than a broken
 * one. A Luau pane is not waiting on that worker at all: its grammar and local completions are
 * in the editor chunk.
 */

import {
  For,
  Show,
  createEffect,
  createMemo,
  onCleanup,
  untrack,
  type Component,
} from "solid-js";
import { Activity } from "@big-mesh-studios/ui/activity";
import {
  CodeMirror,
  darkTheme,
  LSPProvider,
  type CodeMirrorLanguage,
} from "@big-mesh-studios/solid-codemirror";

import { GUEST_MODULE } from "../bridge";
import { luauGuestSource, luauModuleSpecifiers } from "../luau-bundle";
import { LuauAnalysisClient } from "./luau-analysis";
import {
  EDITOR_COMPILER_OPTIONS,
  GUEST_LIBRARY_FILES,
} from "./guest-library-files";

export interface PlaceEditorPanesProps {
  /** The place's scripts, by file name. Changing a key mounts a pane for it. */
  readonly files: Readonly<Record<string, string>>;
  /** Which file is in front of the person, as a key into `files`. */
  readonly active: string;
  /**
   * Changes when the whole project is replaced from outside the editor.
   *
   * **A keyed `Show` around the panes, not a source prop on each `CodeMirror`.** CodeMirror is
   * deliberately told to ignore changes to a file's source while it is open — that is the echo of
   * the person's own typing coming back — so replacing the document needs a different signal. A
   * keyed `Show` disposes the old editors and builds new ones from the new project, which is
   * exactly what closing and reopening the panel used to do.
   */
  readonly revision: number;
  onActive(name: string): void;
  onInput(name: string, source: string): void;
}

/**
 * The language a place file is written in.
 *
 * **The extension is the same signal the host branches on** (ADR 0060): a `.luau` entry is
 * a Luau place, so its pane gets the Luau grammar rather than a JavaScript one applied to a
 * language it does not describe. Only the TypeScript branch reaches the language worker —
 * asking it about a `.luau` path answers `Could not find source file`, which is noise
 * rather than help. A file that is neither is shown as plain text, the honest fallback.
 */
const languageOf = (name: string): CodeMirrorLanguage =>
  /\.[cm]?[jt]sx?$/.test(name)
    ? "typescript"
    : name.endsWith(".luau")
      ? "luau"
      : "plain";

/**
 * Every file's editor, with the guest library's types in reach.
 *
 * **One `LSPProvider` over all of them rather than one each.** The provider owns the worker and the
 * file map, and every editor reports through it — so a type declared in `span.ts` is visible from
 * `main.ts`, and the worker is fetched once however many files the place has.
 *
 * **Every pane stays mounted, hidden rather than removed.** `Activity` keeps the DOM and the
 * scroll position of a tab nobody is looking at, and unmounting a CodeMirror and building it again
 * puts the caret back at the top and throws away the undo history — which for a tab somebody
 * switched away from and back to twice is a worse bug than the memory.
 */
export const PlaceEditorPanes: Component<PlaceEditorPanesProps> = (props) => {
  /**
   * The worker's file map: the guest library and what it names, plus the place's own files.
   *
   * **A memo rather than a value**, because the pane rebuilds this on every keystroke and the
   * guest library half never changes. `LSPProvider` pushes only the files whose content differs,
   * so the unchanged four are pushed once and the changed one on every edit.
   */
  const files = createMemo<Record<string, string>>(() => ({
    ...GUEST_LIBRARY_FILES,
    ...props.files,
  }));

  /**
   * Whether this place has a Luau document at all.
   *
   * **A boolean memo, not `props.files` directly**, so typing in a Luau file does not
   * recreate the analyzer: the client is one object for the session, and its identity is
   * part of the editor's rebuild key.
   */
  const hasLuau = createMemo(() =>
    Object.keys(props.files).some((name) => name.endsWith(".luau")),
  );

  /**
   * The analyzer client for this editor session. Constructing it is cheap; the worker
   * and the wasm are created on the first completion, so opening the panel costs
   * nothing.
   */
  const clients = new Set<LuauAnalysisClient>();
  onCleanup(() => {
    for (const client of clients) client.dispose();
    clients.clear();
  });

  const analyzer = createMemo(() => {
    if (!hasLuau()) return undefined;
    const client = new LuauAnalysisClient();
    clients.add(client);
    return client;
  });

  /**
   * The set of file names, which is what a `configure` is for. Contents change on every
   * keystroke and go through `setSource` instead.
   */
  const fileSet = createMemo(() => Object.keys(props.files).sort().join("\n"));

  createEffect(
    () => {
      // Tracked: a revision is a project replaced from outside, even when the names
      // did not change. Contents are read untracked so a keystroke does not replay them.
      void props.revision;
      fileSet();
      return analyzer();
    },
    (client) => {
      if (!client) return;

      untrack(() => {
        const place = Object.fromEntries(
          Object.entries(props.files).filter(([name]) =>
            name.endsWith(".luau"),
          ),
        );
        client.configure(
          { ...place, [GUEST_MODULE]: luauGuestSource({}) },
          luauModuleSpecifiers(place),
        );
      });
    },
  );

  return (
    <LSPProvider files={files()} tsconfig={EDITOR_COMPILER_OPTIONS}>
      {/* **Keyed by `revision`**, so an adopted project replaces every open document rather
          than leaving the active tab showing the previous place's source. A keystroke does not
          change the revision, so the echo of a person's typing still does not rebuild an
          editor under their caret. */}
      <Show when={props.revision} keyed>
        {(_revision) => (
          <For each={Object.keys(props.files)}>
            {(name) => (
              <Activity when={props.active === name}>
                <div
                  class="cm-pane"
                  role="tabpanel"
                  id={`place-tabpanel-${name}`}
                >
                  <CodeMirror
                    path={name}
                    theme={darkTheme}
                    language={languageOf(name)}
                    luauAnalysis={
                      name.endsWith(".luau") ? analyzer() : undefined
                    }
                    onInput={({ source }) => {
                      if (name.endsWith(".luau")) {
                        analyzer()?.setSource(name, source);
                      }
                      props.onInput(name, source);
                    }}
                  />
                </div>
              </Activity>
            )}
          </For>
        )}
      </Show>
    </LSPProvider>
  );
};
