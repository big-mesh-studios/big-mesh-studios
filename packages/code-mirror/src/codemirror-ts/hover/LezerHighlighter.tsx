import { javascript } from "@codemirror/lang-javascript";
import { Highlighter, highlightTree } from "@lezer/highlight";
import { type Component, createMemo } from "solid-js";

interface LezerHighlighterProps {
  code: string;
  language?: "javascript" | "typescript";

  highlighter: Highlighter;
  class?: string;
}

export const LezerHighlighter: Component<LezerHighlighterProps> = (props) => {
  const highlightedCode = createMemo(() => {
    const lang = javascript({ typescript: props.language === "typescript" });
    const tree = lang.language.parser.parse(props.code);

    let html = "";
    let pos = 0;

    // Use the highlighter from the active theme
    highlightTree(tree, props.highlighter, (from, to, classes) => {
      // Add any unhighlighted text before this token
      if (from > pos) {
        html += escapeHtml(props.code.slice(pos, from));
      }

      // Add the highlighted token
      const tokenText = props.code.slice(from, to);
      if (classes) {
        html += `<span class="${classes}">${escapeHtml(tokenText)}</span>`;
      } else {
        html += escapeHtml(tokenText);
      }

      pos = to;
    });

    // Add any remaining unhighlighted text
    if (pos < props.code.length) {
      html += escapeHtml(props.code.slice(pos));
    }

    return html;
  });

  return (
    <code
      class={`cm-content cm-editor ${props.class}`}
      style={{
        "font-family": "monospace",
        "white-space": "pre",
        display: "block",
        background: "transparent",
      }}
      innerHTML={highlightedCode()}
    />
  );
};

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
