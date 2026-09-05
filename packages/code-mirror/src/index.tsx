import {
  acceptCompletion,
  autocompletion,
  completionStatus,
} from "@codemirror/autocomplete";
import { indentLess, indentMore } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { indentUnit } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { keymap, type ViewUpdate } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import type { Remote } from "comlink";
import * as Comlink from "comlink";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onSettled,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";
import type TS from "typescript";
import {
  tsAutocomplete,
  tsFacet,
  tsGoto,
  tsHover,
  tsLinter,
  tsSync,
  tsTwoslash,
} from "./codemirror-ts";
import type { LSPAPI } from "./types";
import { createDebug, trackDeep } from "./utils";
export * from "./use-ata";

const debug = createDebug("code-mirror");

interface LSPContext {
  /** The remote handle to the language worker, from the surrounding provider. */
  api: Remote<LSPAPI>;
  /** The latest view of the files under edit, read when an editor is built. */
  files: Accessor<Record<string, string>>;
  /** Whether the worker's virtual environment is ready for language calls. */
  initialized: Accessor<boolean>;
}

const LspContext = createContext<LSPContext>();

export interface LSPProviderProps extends ParentProps {
  /** Not used yet; kept so a caller can say which packages a script imports. */
  packages?: Array<string>;
  tsconfig?: TS.CompilerOptions;
  /** Every file the editors under this provider can show, by path. */
  files: Record<string, string>;
}

/**
 * Owns the language worker and feeds it the files its editors edit. One
 * provider can wrap any number of editors; each reports through the shared
 * worker so every file's types are visible to every editor.
 */
export function LSPProvider(props: LSPProviderProps) {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  const api = Comlink.wrap<LSPAPI>(worker);
  const [initialized, setInitialized] = createSignal(false);

  onSettled(() => {
    let alive = true;
    void api.initialize().then(
      () => {
        if (alive) {
          setInitialized(true);
        }
      },
      (error: unknown) => {
        console.error(
          "code-mirror language worker failed to initialize",
          error,
        );
      },
    );
    return () => {
      alive = false;
      worker.terminate();
    };
  });

  const files = createMemo(() => props.files);

  const context: LSPContext = { api, files, initialized };

  createEffect(
    () => props.tsconfig,
    (options) => {
      if (options !== undefined) {
        void api.setCompilerOptions(options);
      }
    },
  );

  // Keep the worker's file map in step with `files`: push changed content,
  // and delete the paths the caller has closed.
  const pushed = new Map<string, string>();
  createEffect(
    () => {
      if (!initialized()) {
        return undefined;
      }
      const map = files();
      return Object.keys(map).map((path) => [path, map[path] ?? ""] as const);
    },
    (entries) => {
      if (!entries) {
        return;
      }
      const current = new Set(entries.map(([path]) => path));
      for (const path of [...pushed.keys()]) {
        if (!current.has(path)) {
          pushed.delete(path);
          void api.deleteFile(`file:///${path}`);
        }
      }
      for (const [path, code] of entries) {
        if (pushed.get(path) === code) {
          continue;
        }
        pushed.set(path, code);
        debug("api.updateFile", { path, code });
        void api.updateFile({ path: `file:///${path}`, code });
      }
    },
  );

  return <LspContext value={context}>{props.children}</LspContext>;
}

export interface CodeMirrorProps {
  /** The path of the file this editor shows, as a key into the provider's files. */
  path: string;
  /** A CodeMirror theme extension, applied when no language theme is active. */
  theme?: Extension;
  /** Called whenever the document changes, with the whole new source. */
  onInput?(event: { path: string; source: string; update: ViewUpdate }): void;
  /** Called with each editor as it is created, for a caller to hold onto. */
  onEditor?(editor: EditorView): void;
  config?: {
    tsSync?: Parameters<typeof tsSync>[0];
    tsHover?: Parameters<typeof tsHover>[0];
    tsGoto?: Parameters<typeof tsGoto>[0];
  };
}

/**
 * One code editor bound to a path in the surrounding `LSPProvider`'s files.
 * Until the language worker is ready it runs plain, then it is rebuilt with
 * the TypeScript extensions — completion, hover, lint, go-to-definition and
 * twoslash queries — wired to the worker.
 */
export function CodeMirror(props: CodeMirrorProps) {
  const lsp = useContext(LspContext);
  const [container, setContainer] = createSignal<HTMLDivElement>();
  let editor: EditorView | undefined;

  function createEditor(
    parent: HTMLDivElement,
    extensions: Array<Extension>,
  ): EditorView {
    return new EditorView({
      parent,
      doc: lsp.files()[props.path] ?? "",
      extensions: [
        basicSetup,
        javascript({
          typescript: true,
          jsx: true,
        }),
        ...(props.theme ? [props.theme] : []),
        keymap.of([
          {
            key: "Tab",
            preventDefault: true,
            shift: indentLess,
            run: (e) => {
              if (!completionStatus(e.state)) {
                return indentMore(e);
              }
              return acceptCompletion(e);
            },
          },
        ]),
        indentUnit.of("  "),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const source = update.state.doc.toString();
            debug("onInput", { path: props.path, source });
            props.onInput?.({ path: props.path, source, update });
          }
        }),
        ...extensions,
      ],
    });
  }

  onSettled(() => () => editor?.destroy());

  // The container ref lands during render, after this effect's first run, so
  // the editor is only built once the container signal has a value.
  createEffect(
    () =>
      [container(), lsp.initialized(), trackDeep(props.config ?? {})] as const,
    ([target, initialized]) => {
      if (!target) {
        return;
      }
      // A rebuild must hand selection and focus to the replacement editor.
      const previous = editor;
      const selection = previous?.state.selection;
      const shouldFocus = previous?.hasFocus;

      previous?.destroy();

      editor = createEditor(
        target,
        initialized
          ? [
              autocompletion({ override: [tsAutocomplete()] }),
              tsFacet.of({
                worker: lsp.api,
                path: `file:///${props.path}`,
              }),
              tsGoto(props.config?.tsGoto),
              tsHover(props.config?.tsHover),
              tsLinter(),
              tsSync(props.config?.tsSync),
              tsTwoslash(),
            ]
          : [],
      );

      if (selection) {
        editor.dispatch({ selection });
        if (shouldFocus) {
          editor.focus();
        }
      }

      props.onEditor?.(editor);
    },
  );

  createEffect(
    () => props.path,
    (path) => {
      const config = editor?.state.facet(tsFacet);
      if (!config) {
        return;
      }
      config.path = `file:///${path}`;
    },
  );

  return (
    <div
      style={{
        all: "initial",
        width: "100%",
        height: "100%",
        overflow: "auto",
      }}
    >
      <div ref={setContainer} />
    </div>
  );
}
