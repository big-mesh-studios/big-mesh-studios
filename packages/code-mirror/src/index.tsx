import {
  acceptCompletion,
  autocompletion,
  completionStatus,
} from "@codemirror/autocomplete";
import { indentLess, indentMore } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  indentUnit,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { keymap, type ViewUpdate } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { tags } from "@lezer/highlight";
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

/**
 * A dark editor surface that leaves the background to the element behind it,
 * so a caller's own panel colour shows through while the code text stays light.
 */
export const darkTheme: Extension = [
  EditorView.theme(
    {
      "&": {
        color: "#d6d6d6",
        backgroundColor: "transparent",
        // Lets the "@container" query below the find/replace panel's grid
        // react to this editor's own rendered width, not the browser
        // viewport's — the editor can sit in a narrow column of a wide
        // window just as easily as it can fill one.
        containerType: "inline-size",
        // Read by the hover tooltip, autocomplete popup and twoslash widget
        // (see packages/code-mirror/src/codemirror-ts), so every overlay
        // this editor renders draws from this one palette instead of its own.
        "--cm-editor-color": "#d6d6d6",
        "--cm-keyword": "#c678dd",
        "--cm-variable": "#61afef",
        "--cm-variable2": "#d6d6d6",
        "--cm-type": "#e5c07b",
        "--cm-property": "#e06c75",
        "--cm-comment": "#7f848e",
        "--cm-string": "#98c379",
        "--cm-number": "#d19a66",
        "--cm-editor-background": "rgba(255, 255, 255, 0.06)",
        "--cm-editor-selectionBackground": "rgba(111, 207, 151, 0.25)",
        "--cm-tooltip-bg": "rgba(10, 12, 16, 0.98)",
        "--cm-tooltip-border": "rgba(255, 255, 255, 0.25)",
      },
      ".cm-content": {
        caretColor: "#e06c75",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "#e06c75",
      },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor: "rgba(111, 207, 151, 0.25)",
        },
      ".cm-gutters": {
        backgroundColor: "transparent",
        border: "none",
        color: "#6b7c8c",
      },
      ".cm-activeLine": {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
      },
      ".cm-twoslash": {
        color: "#7f848e",
        fontStyle: "italic",
        marginLeft: "0.5em",
      },
      // The find/replace panel (from `basicSetup`'s `searchKeymap`) sits
      // outside `.cm-scroller`, the only element CodeMirror's own base theme
      // gives a font-family to, so left alone it falls through the `all:
      // initial` wrapper around this editor to the browser's default serif
      // font.
      ".cm-panels": {
        fontFamily: "monospace",
      },
      // Laid out on a grid rather than the base theme's inline flow (a run
      // of inputs, buttons and labels broken onto a second line by a bare
      // `<br>`), using named areas so each of the three breakpoints below
      // can reshape the layout by redeclaring `gridTemplateAreas` (and the
      // matching columns) alone — every element keeps the same `grid-area`
      // regardless of which shape is active.
      ".cm-panel.cm-search": {
        display: "grid",
        // The field column is capped rather than `1fr`, so it doesn't
        // stretch to fill the panel's full width; the three button columns
        // share one fixed size (rather than each sizing to its own row's
        // widest label) so "next"/"prev"/"all" line up with "replace"/
        // "replace all" beneath them at the same width.
        gridTemplateColumns:
          "minmax(140px, 200px) repeat(3, 84px) repeat(3, auto)",
        gridTemplateAreas: `
          "search next prev all case re word"
          "rfield rep  repall .   .    .  .   "
        `,
        alignItems: "center",
        columnGap: "6px",
        rowGap: "4px",
        padding: "6px 28px 6px 8px",
        backgroundColor: "var(--cm-tooltip-bg, inherit)",
        color: "var(--cm-editor-color, inherit)",
        // The base theme's own line break between the search and replace
        // rows — the grid areas above make it redundant, and left alone it
        // claims a cell of its own.
        "& br": {
          display: "none",
        },
        "& input, & button, & label": {
          margin: 0,
        },
        "& label": {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          justifySelf: "start",
        },
        "& input[name=search]": { gridArea: "search" },
        "& input[name=replace]": { gridArea: "rfield" },
        "& button[name=next]": { gridArea: "next" },
        "& button[name=prev]": { gridArea: "prev" },
        "& button[name=select]": { gridArea: "all" },
        "& button[name=replace]": { gridArea: "rep" },
        "& button[name=replaceAll]": { gridArea: "repall" },
        "& label:nth-of-type(1)": { gridArea: "case" },
        "& label:nth-of-type(2)": { gridArea: "re" },
        "& label:nth-of-type(3)": { gridArea: "word" },
        "& .cm-textfield": {
          width: "100%",
          maxWidth: "200px",
          minWidth: 0,
          backgroundColor: "var(--cm-editor-background, transparent)",
          color: "var(--cm-editor-color, inherit)",
          border:
            "1px solid var(--cm-tooltip-border, rgba(255, 255, 255, 0.25))",
          borderRadius: "3px",
          padding: "2px 6px",
        },
        "& .cm-button": {
          backgroundColor: "var(--cm-editor-background, transparent)",
          color: "var(--cm-editor-color, inherit)",
          border:
            "1px solid var(--cm-tooltip-border, rgba(255, 255, 255, 0.25))",
          borderRadius: "3px",
          backgroundImage: "none",
        },
        // Just the named buttons placed in the grid — not the absolutely
        // positioned close button, which sizes to its own "×" instead.
        "& button[name=next], & button[name=prev], & button[name=select], & button[name=replace], & button[name=replaceAll]":
          {
            width: "100%",
            textAlign: "center",
          },
      },
      // Between the wide and narrow shapes: not wide enough for the
      // checkboxes to share a row with the fields and buttons, but wide
      // enough for all five buttons ("next" through "replace all") to sit
      // on one row rather than the narrow shape's two.
      "@container (max-width: 820px) and (min-width: 521px)": {
        ".cm-panel.cm-search": {
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateAreas: `
            "search search search rfield rfield"
            "next   prev   all    rep    repall"
            "case   case   re     re     word"
          `,
        },
      },
      // Below this width even one row of five buttons no longer fits: the
      // search and replace fields share a row, their buttons split across
      // two rows of their own, and the checkboxes come last — each row a
      // fixed number of even columns, since a container this narrow reads
      // better as a tidy control grid than one that reflows to the width of
      // whatever label happens to be in it.
      "@container (max-width: 520px)": {
        ".cm-panel.cm-search": {
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateAreas: `
            "search search search rfield rfield rfield"
            "next   next   prev   prev   all    all"
            "rep    rep    rep    repall repall repall"
            "case   case   re     re     word   word"
          `,
        },
      },
    },
    { dark: true },
  ),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.keyword, color: "#c678dd" },
      {
        tag: [tags.function(tags.variableName), tags.labelName],
        color: "#61afef",
      },
      {
        tag: [tags.typeName, tags.className, tags.namespace],
        color: "#e5c07b",
      },
      { tag: [tags.name, tags.propertyName], color: "#e06c75" },
      {
        tag: [tags.number, tags.constant(tags.name), tags.standard(tags.name)],
        color: "#d19a66",
      },
      { tag: [tags.string, tags.special(tags.string)], color: "#98c379" },
      { tag: [tags.regexp, tags.escape], color: "#56b6c2" },
      {
        tag: [tags.operator, tags.operatorKeyword, tags.bool, tags.null],
        color: "#56b6c2",
      },
      { tag: [tags.comment, tags.meta], color: "#7f848e" },
      { tag: tags.invalid, color: "#ff6b6b" },
    ]),
  ),
];

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
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
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
        overflow: "hidden",
      }}
    >
      <div
        ref={setContainer}
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      />
    </div>
  );
}
