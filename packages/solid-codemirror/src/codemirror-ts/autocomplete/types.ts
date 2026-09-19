import type { Completion } from "@codemirror/autocomplete";
import type { EditorView } from "@codemirror/view";
import type { RawCompletionItem } from "../types";

export type AutocompleteOptions = {
  renderAutocomplete?: AutocompleteRenderer;
};

export type AutocompleteRenderer = (
  arg0: RawCompletionItem,
  editorView: EditorView,
) => Completion["info"];
