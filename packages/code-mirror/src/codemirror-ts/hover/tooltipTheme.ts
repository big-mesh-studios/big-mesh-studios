import { EditorView } from "@codemirror/view";

/**
 * Theme extension for TypeScript tooltips that provides consistent styling
 * and ensures tooltips inherit the editor's theme colors and fonts.
 */
export const tooltipTheme = EditorView.theme(
  {
    "&": {
      "--tooltip-font": "inherit",
    },

    ".ts-tooltip": {
      border: "1px solid",
      borderColor: "var(--cm-tooltip-border, rgba(128, 128, 128, 0.3))",
      borderRadius: "4px",
      padding: "8px",
      maxWidth: "400px",
      fontFamily: "inherit",
      fontSize: "inherit",
      backgroundColor: "inherit",
      color: "inherit",
      zIndex: "9999 !important",
      position: "relative",
    },

    // Ensure tooltip inherits editor's monospace font when inside editor context
    ".cm-editor .ts-tooltip, .cm-editor .ts-tooltip *": {
      fontFamily: "inherit !important",
    },

    ".ts-autocomplete": {
      border: "1px solid",
      borderColor: "var(--cm-tooltip-border, rgba(128, 128, 128, 0.3))",
      borderRadius: "4px",
      padding: "4px 8px",
      maxWidth: "300px",
      fontFamily: "inherit",
      fontSize: "inherit",
      backgroundColor: "inherit",
      color: "inherit",
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
      fontWeight: "bold",
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

/**
 * Dark theme variant for tooltips
 */
export const tooltipDarkTheme = EditorView.theme(
  {
    ".inline-code": {
      backgroundColor: "rgba(255, 255, 255, 0.15)",
    },

    ".tooltip-code-block": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },

    ".quick-info-keyword": {
      color: "var(--cm-keyword, #569cd6)",
    },

    ".quick-info-className": {
      color: "var(--cm-type, #4ec9b0)",
    },

    ".quick-info-interfaceName": {
      color: "var(--cm-type, #4ec9b0)",
    },

    ".quick-info-functionName": {
      color: "var(--cm-variable, #dcdcaa)",
    },

    ".quick-info-methodName": {
      color: "var(--cm-variable, #dcdcaa)",
    },

    ".quick-info-propertyName": {
      color: "var(--cm-property, #9cdcfe)",
    },

    ".quick-info-parameterName": {
      color: "var(--cm-variable2, #9cdcfe)",
    },

    ".quick-info-typeParameterName": {
      color: "var(--cm-type, #4ec9b0)",
    },

    ".quick-info-comment": {
      color: "var(--cm-comment, #6a9955)",
    },

    ".quick-info-stringLiteral": {
      color: "var(--cm-string, #ce9178)",
    },

    ".quick-info-numericLiteral": {
      color: "var(--cm-number, #b5cea8)",
    },
  },
  { dark: true },
);
