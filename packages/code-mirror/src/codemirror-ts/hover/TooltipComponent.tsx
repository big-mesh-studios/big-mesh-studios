import { highlightingFor } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import type { Highlighter, Tag } from "@lezer/highlight";
import { For, Show, createContext, createMemo, useContext } from "solid-js";
import type ts from "typescript";
import { createDebug } from "../../utils";
import { MDRenderer, type MDNode } from "../markdown/MarkdownRenderer";
import type { HoverInfo } from "./getHover";
import { LezerHighlighter } from "./LezerHighlighter";

const debug = createDebug("codemirror-ts/TooltipComponent");

interface TooltipProps {
  info: HoverInfo;
  editorView: EditorView;
}

// Tags whose text reads as a block of its own rather than an inline note.
const BLOCK_TAGS = [
  "example",
  "description",
  "summary",
  "remarks",
  "see",
  "todo",
  "deprecated",
  "throws",
  "fires",
  "listens",
  "yields",
  "emits",
] as const;

/** A highlighter that borrows the code highlighting classes the editor uses. */
function createHighlighter(editorView: EditorView): Highlighter {
  return {
    style: (tags: readonly Tag[]) => {
      return highlightingFor(editorView.state, tags);
    },
  };
}

const TooltipComponentContext = createContext<{ editorView: EditorView }>();

const codeRenderers = {
  CodeBlock: (props: { node: MDNode }) => {
    const { editorView } = useContext(TooltipComponentContext);
    return (
      <div style={{ margin: "8px 0" }}>
        <LezerHighlighter
          code={props.node.content
            .replace(/^```[\w]*\n/, "")
            .replace(/\n```$/, "")}
          language="typescript"
          highlighter={createHighlighter(editorView)}
        />
      </div>
    );
  },
  FencedCode: (props: { node: MDNode }) => {
    const { editorView } = useContext(TooltipComponentContext);
    return (
      <div
        style={{
          "background-color":
            "var(--cm-editor-background, rgba(128, 128, 128, 0.1))",
          padding: "8px",
          "border-radius": "4px",
          margin: "8px 0",
        }}
      >
        <LezerHighlighter
          code={props.node.content
            .replace(/^```[\w]*\n/, "")
            .replace(/\n```$/, "")}
          language="typescript"
          highlighter={createHighlighter(editorView)}
        />
      </div>
    );
  },
};

function TypeSignature(props: { parts: ts.SymbolDisplayPart[] }) {
  const { editorView } = useContext(TooltipComponentContext);
  return (
    <div class="tooltip-content">
      <LezerHighlighter
        code={props.parts.map((part) => part.text).join("")}
        language="typescript"
        highlighter={createHighlighter(editorView)}
      />
    </div>
  );
}

function Documentation(props: { parts: ts.SymbolDisplayPart[] }) {
  return (
    <div
      class="tooltip-documentation"
      style={{
        "margin-top": "8px",
        "border-top": "1px solid rgba(128, 128, 128, 0.3)",
        "padding-top": "8px",
      }}
    >
      <div class="tooltip-markdown-content">
        <MDRenderer
          content={props.parts.map((part) => part.text).join("")}
          renderers={codeRenderers}
        />
      </div>
    </div>
  );
}

function JSDocTag(props: { tag: any }) {
  const tagText = createMemo(() => {
    if (props.tag.text && Array.isArray(props.tag.text)) {
      return props.tag.text.map((part: any) => part.text || part).join("");
    }
    return props.tag.text ?? "";
  });

  const isBlockTag = createMemo(() => BLOCK_TAGS.includes(props.tag.name));

  return (
    <div class="tooltip-tag" style={{ "margin-bottom": "4px" }}>
      <strong style={{ color: "#569cd6" }}>@{props.tag.name}</strong>
      <Show when={tagText()}>
        <Show
          when={isBlockTag()}
          fallback={
            <span style={{ display: "inline" }}>
              <MDRenderer content={tagText()} renderers={codeRenderers} />
            </span>
          }
        >
          <div style={{ "margin-top": "4px", "margin-left": "12px" }}>
            <MDRenderer content={tagText()} renderers={codeRenderers} />
          </div>
        </Show>
      </Show>
    </div>
  );
}

/**
 * The hover tooltip content: the hovered symbol's signature, its
 * documentation, and its JSDoc tags, with code drawn using the editor's own
 * highlighting classes so the tooltip matches the surrounding theme.
 */
export function TooltipComponent(props: TooltipProps) {
  debug("rendering tooltip");

  // Copy the editor's theme classes so nested code inherits its look.
  const themeClasses = createMemo(() => {
    return props.editorView.dom.className
      .split(" ")
      .filter(
        (cls) =>
          cls.includes("cm-theme-") ||
          cls.includes("cm-editor") ||
          cls.includes("theme-") ||
          cls === "cm-focused",
      )
      .join(" ");
  });

  return (
    <TooltipComponentContext value={{ editorView: props.editorView }}>
      <div
        class={`ts-tooltip cm-tooltip-content ${themeClasses()}`}
        style={{
          padding: "8px",
          "max-width": "600px",
          "max-height": "400px",
          "overflow-y": "auto",
          "border-radius": "4px",
          border:
            "1px solid var(--cm-tooltip-border, rgba(128, 128, 128, 0.3))",
          "background-color": "var(--cm-tooltip-bg, inherit)",
          "z-index": "1000",
          position: "relative",
        }}
      >
        <Show when={props.info.quickInfo?.displayParts}>
          {(parts) => <TypeSignature parts={parts()} />}
        </Show>

        <Show when={props.info.quickInfo?.documentation}>
          {(documentation) => <Documentation parts={documentation()} />}
        </Show>

        <Show when={props.info.quickInfo?.tags}>
          {(tags) => (
            <div class="tooltip-tags" style={{ "margin-top": "8px" }}>
              <For each={tags()}>{(tag) => <JSDocTag tag={tag} />}</For>
            </div>
          )}
        </Show>
      </div>
    </TooltipComponentContext>
  );
}
