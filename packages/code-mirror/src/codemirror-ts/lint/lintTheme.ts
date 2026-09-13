import { EditorView } from "@codemirror/view";

/**
 * Theme extension for the built-in TypeScript diagnostic tooltip
 * (`@codemirror/lint`'s own `.cm-tooltip-lint`/`.cm-diagnostic` markup),
 * matching its font and colors to the editor's own, via the `--cm-*` custom
 * properties the editor's theme (see `darkTheme` in
 * `packages/code-mirror/src/index.tsx`) defines.
 */
export const lintTheme = EditorView.theme({
  // Set explicitly rather than inherited, for the same reason as
  // `tooltipTheme.ts`'s `.ts-tooltip` rule: this tooltip's DOM sits under
  // CodeMirror's own `.cm-tooltip` wrapper, which declares no font, so
  // `inherit` here would walk past it to the surrounding page and pick up
  // the browser default serif font.
  ".cm-tooltip-lint, .cm-tooltip-lint *": {
    fontFamily: "monospace",
  },

  ".cm-tooltip-lint": {
    // Diagnostic text has nothing to wrap against without a width to fill —
    // `.cm-diagnostic`'s own `white-space: pre-wrap` only breaks at an
    // explicit newline until then, so a long message reads as one unbroken
    // line the tooltip stretches to fit.
    maxWidth: "400px",
    backgroundColor: "var(--cm-tooltip-bg, inherit)",
    color: "var(--cm-editor-color, inherit)",
  },

  ".cm-diagnostic": {
    borderColor: "var(--cm-tooltip-border, rgba(128, 128, 128, 0.3))",
    // A type signature can run long stretches without a space to break on
    // (nested generics, arrow types); this lets those wrap too instead of
    // overflowing the tooltip's width.
    overflowWrap: "anywhere",
  },

  ".cm-diagnosticAction": {
    backgroundColor: "var(--cm-editor-background, rgba(128, 128, 128, 0.15))",
    color: "var(--cm-editor-color, inherit)",
  },

  ".cm-panel.cm-panel-lint": {
    fontFamily: "monospace",
    backgroundColor: "var(--cm-tooltip-bg, inherit)",
    color: "var(--cm-editor-color, inherit)",
  },
});
