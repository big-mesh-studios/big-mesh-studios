import { renderDisplayParts } from "../renderDisplayParts";
import type { AutocompleteRenderer } from "./types";

/**
 * Default autocomplete renderer with syntax highlighting and markdown support.
 * Generates structure of a div, containing enhanced rendering of TypeScript
 * display parts with the same theme as the editor.
 */
export const defaultAutocompleteRenderer: AutocompleteRenderer = (
  raw,
  editorView,
) => {
  return () => {
    const div = document.createElement("div");

    // Font only: the editor's own background/color are copied by `.ts-autocomplete`
    // itself (see tooltipTheme.ts), which reads the same `--cm-*` variables the
    // editor's theme defines rather than the editor's (intentionally transparent)
    // computed background.
    const editorStyle = window.getComputedStyle(editorView.dom);

    div.className = "ts-autocomplete";
    div.style.fontFamily = editorStyle.fontFamily;
    div.style.fontSize = editorStyle.fontSize;

    if (raw?.displayParts) {
      div.appendChild(renderDisplayParts(raw.displayParts));
    }
    return { dom: div };
  };
};
