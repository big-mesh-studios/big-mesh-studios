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
 * **Authoring needs a network, and this is where that is true.** The worker fetches TypeScript and
 * the standard library `lib.*.d.ts` from esm.sh. Until it answers, each editor runs plain — no
 * completions, no lint — and rebuilds itself with the TypeScript extensions when it does. A person
 * offline gets a working text editor, which is the degraded case rather than a broken one.
 */

import { For, createMemo, type Component } from "solid-js";
import { Activity } from "@big-mesh-studios/ui/activity";
import {
  CodeMirror,
  darkTheme,
  LSPProvider,
} from "@big-mesh-studios/solid-codemirror";

import {
  EDITOR_COMPILER_OPTIONS,
  GUEST_LIBRARY_FILES,
} from "./guest-library-files";

export interface PlaceEditorPanesProps {
  /** The place's scripts, by file name. Changing a key mounts a pane for it. */
  readonly files: Readonly<Record<string, string>>;
  /** Which file is in front of the person, as a key into `files`. */
  readonly active: string;
  onActive(name: string): void;
  onInput(name: string, source: string): void;
}

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

  return (
    <LSPProvider files={files()} tsconfig={EDITOR_COMPILER_OPTIONS}>
      <For each={Object.keys(props.files)}>
        {(name) => (
          <Activity when={props.active === name}>
            <div class="cm-pane" role="tabpanel" id={`place-tabpanel-${name}`}>
              <CodeMirror
                path={name}
                theme={darkTheme}
                onInput={({ source }) => props.onInput(name, source)}
              />
            </div>
          </Activity>
        )}
      </For>
    </LSPProvider>
  );
};
