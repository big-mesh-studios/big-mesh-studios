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

    // Copy theme from editor for consistent styling
    const editorElement = editorView.dom;
    const editorStyle = window.getComputedStyle(editorElement);

    div.className = "ts-autocomplete";
    div.style.backgroundColor = editorStyle.backgroundColor;
    div.style.color = editorStyle.color;
    div.style.fontFamily = editorStyle.fontFamily;
    div.style.fontSize = editorStyle.fontSize;

    if (raw?.displayParts) {
      div.appendChild(renderDisplayParts(raw.displayParts));
    }
    return { dom: div };
  };
};
