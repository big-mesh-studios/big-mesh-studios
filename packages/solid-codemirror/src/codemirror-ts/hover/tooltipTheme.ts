import { EditorView } from "@codemirror/view";

/**
 * Theme extension for TypeScript tooltips that matches their font and colors
 * to the editor's own, via the `--cm-*` custom properties the editor's theme
 * (see `darkTheme` in `packages/code-mirror/src/index.tsx`) defines.
 */
export const tooltipTheme = EditorView.theme(
  {
    // Set explicitly rather than inherited: a tooltip's DOM sits under
    // CodeMirror's own `.cm-tooltip` wrapper, which is styled by CodeMirror's
    // built-in base theme (not this one) and declares neither a font nor,
    // outside dark mode, a text color — so `inherit` here would walk past it
    // to the surrounding page and pick up the browser default serif font and
    // (in dark mode) `.cm-tooltip`'s own hard-coded white instead of this
    // editor's font and text color.
    ".ts-tooltip, .ts-tooltip *": {
      fontFamily: "monospace !important",
    },

    ".ts-tooltip": {
      border: "1px solid",
      borderColor: "var(--cm-tooltip-border, rgba(128, 128, 128, 0.3))",
      borderRadius: "4px",
      padding: "8px",
      maxWidth: "400px",
      fontSize: "inherit",
      backgroundColor: "var(--cm-tooltip-bg, inherit)",
      color: "var(--cm-editor-color, inherit)",
      zIndex: "9999 !important",
      position: "relative",
    },

    ".ts-autocomplete, .ts-autocomplete *": {
      fontFamily: "monospace !important",
    },

    ".ts-autocomplete": {
      border: "1px solid",
      borderColor: "var(--cm-tooltip-border, rgba(128, 128, 128, 0.3))",
      borderRadius: "4px",
      padding: "4px 8px",
      maxWidth: "300px",
      fontSize: "inherit",
      backgroundColor: "var(--cm-tooltip-bg, inherit)",
      color: "var(--cm-editor-color, inherit)",
    },

    ".tooltip-content": {
      lineHeight: "1.4",
      "& strong": {
        fontWeight: "bold",
      },
      "& em": {
        fontStyle: "italic",
      },
    },

    ".inline-code": {
      fontFamily: "inherit",
      backgroundColor: "rgba(128, 128, 128, 0.15)",
      padding: "1px 3px",
      borderRadius: "2px",
      fontSize: "0.9em",
    },

    ".tooltip-code-block": {
      margin: "4px 0",
      padding: "6px 8px",
      backgroundColor: "rgba(128, 128, 128, 0.1)",
      border: "1px solid rgba(128, 128, 128, 0.2)",
      borderRadius: "3px",
      fontFamily: "inherit",
      fontSize: "0.9em",
      overflow: "auto",
    },

    ".tooltip-code": {
      fontFamily: "inherit",
      fontSize: "inherit",
      color: "inherit",
    },

    // TypeScript-specific quick info styling
    ".quick-info-keyword": {
      color: "var(--cm-keyword, #0000ff)",
    },

    ".quick-info-className": {
      color: "var(--cm-type, #008000)",
    },

    ".quick-info-interfaceName": {
      color: "var(--cm-type, #008000)",
    },

    ".quick-info-functionName": {
      color: "var(--cm-variable, #0000ff)",
    },

    ".quick-info-methodName": {
      color: "var(--cm-variable, #0000ff)",
    },

    ".quick-info-propertyName": {
      color: "var(--cm-property, #000000)",
    },

    ".quick-info-parameterName": {
      color: "var(--cm-variable2, #0055aa)",
    },

    ".quick-info-typeParameterName": {
      color: "var(--cm-type, #008000)",
    },

    ".quick-info-comment": {
      color: "var(--cm-comment, #808080)",
      fontStyle: "italic",
    },

    ".quick-info-stringLiteral": {
      color: "var(--cm-string, #aa1111)",
    },

    ".quick-info-numericLiteral": {
      color: "var(--cm-number, #116644)",
    },
  },
  { dark: false },
);
