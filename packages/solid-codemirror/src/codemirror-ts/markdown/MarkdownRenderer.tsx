import type { SyntaxNode } from "@lezer/common";
import {
  parser as markdownParser,
  Strikethrough,
  Table,
} from "@lezer/markdown";
import {
  type Component,
  createContext,
  createMemo,
  For,
  Show,
  useContext,
} from "solid-js";

// Use parser with table and strikethrough support
const parser = markdownParser.configure([Table, Strikethrough]);
const MDRendererContext = createContext<MDRendererProps>();

interface MDRendererProps {
  content: string;
  renderers?: Partial<typeof DefaultNodeRenderers>;
}

export interface MDNode {
  type: string;
  from: number;
  to: number;
  children: MDNode[];
  content: string;
}

interface MDNodeRendererProps {
  node: MDNode;
}

function parseMarkdownTree(node: SyntaxNode, input: string): MDNode {
  const children: MDNode[] = [];
  let child = node.firstChild;

  // If this is a paragraph or similar container, we need to handle text between children
  const textContainerTypes = [
    "Paragraph",
    "Emphasis",
    "StrongEmphasis",
    "Link",
    "LinkLabel",
    "Strikethrough",
    "ListItem",
    "TaskListItem",
    "Blockquote",
    "TableCell",
    "TableHeader",
    "Table",
    "TableRow",
  ];

  if (child && textContainerTypes.includes(node.name)) {
    let lastEnd = node.from;

    // For list items, skip the list marker
    if (
      (node.name === "ListItem" || node.name === "TaskListItem") &&
      child?.name === "ListMark"
    ) {
      lastEnd = child.to;
      child = child.nextSibling;

      // For task lists, also skip the task marker that follows
      if (node.name === "TaskListItem" && child?.name === "TaskMarker") {
        lastEnd = child.to;
        child = child.nextSibling;
      }
    }

    while (child) {
      // Add any text between the last child and this child
      if (child.from > lastEnd) {
        const textContent = input.slice(lastEnd, child.from);
        if (textContent) {
          children.push({
            type: "Text",
            from: lastEnd,
            to: child.from,
            content: textContent,
            children: [],
          });
        }
      }

      // Skip various mark types during parsing
      const skipInParsing = [
        "TaskMarker",
        "QuoteMark",
        "BlockQuoteMark",
        "StrikethroughMark",
        "TableDelimiter",
        "HeaderMark",
        "TableDelimiterRow",
      ];
      if (skipInParsing.includes(child.name)) {
        lastEnd = child.to;
        child = child.nextSibling;
        continue;
      }

      children.push(parseMarkdownTree(child, input));
      lastEnd = child.to;
      child = child.nextSibling;
    }

    // Add any remaining text after the last child
    if (lastEnd < node.to) {
      const textContent = input.slice(lastEnd, node.to);
      if (textContent) {
        children.push({
          type: "Text",
          from: lastEnd,
          to: node.to,
          content: textContent,
          children: [],
        });
      }
    }
  } else {
    // For other node types, just parse children normally
    while (child) {
      children.push(parseMarkdownTree(child, input));
      child = child.nextSibling;
    }
  }

  return {
    type: node.name,
    from: node.from,
    to: node.to,
    content: input.slice(node.from, node.to),
    children,
  };
}

function extractLinkUrl(node: MDNode): string {
  const urlNode = node.children.find((child) => child.type === "URL");
  return urlNode ? urlNode.content : "#";
}

function extractImageAlt(node: MDNode): string {
  const altNode = node.children.find((child) => child.type === "AltText");
  return altNode ? altNode.content : "";
}

const NOOP = () => "";

export const DefaultNodeRenderers: Record<
  string,
  Component<MDNodeRendererProps>
> = {
  // Root document container
  Document: (props) => (
    <Show
      when={props.node.children.length > 0}
      fallback={<span>{props.node.content}</span>}
    >
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </Show>
  ),

  // Regular paragraph text
  Paragraph: (props) => (
    <Show
      when={props.node.children.length > 0}
      fallback={<span>{props.node.content}</span>}
    >
      <span>
        <For each={props.node.children}>
          {(child) => <DefaultNode node={child} />}
        </For>
      </span>
    </Show>
  ),

  // # Heading 1
  ATXHeading1: (props) => <h1>{props.node.content.replace(/^#\s+/, "")}</h1>,
  // ## Heading 2
  ATXHeading2: (props) => <h2>{props.node.content.replace(/^##\s+/, "")}</h2>,
  // ### Heading 3
  ATXHeading3: (props) => <h3>{props.node.content.replace(/^###\s+/, "")}</h3>,
  // #### Heading 4
  ATXHeading4: (props) => <h4>{props.node.content.replace(/^####\s+/, "")}</h4>,
  // ##### Heading 5
  ATXHeading5: (props) => (
    <h5>{props.node.content.replace(/^#####\s+/, "")}</h5>
  ),
  // ###### Heading 6
  ATXHeading6: (props) => (
    <h6>{props.node.content.replace(/^######\s+/, "")}</h6>
  ),

  // Indented code block (4+ spaces)
  CodeBlock: (props) => (
    <pre style={{ margin: "8px 0" }}>
      <code>
        {props.node.content.replace(/^```[\w]*\n/, "").replace(/\n```$/, "")}
      </code>
    </pre>
  ),

  // ``` fenced code blocks ```
  FencedCode: (props) => (
    <pre
      style={{
        "background-color":
          "var(--cm-editor-background, rgba(128, 128, 128, 0.1))",
        padding: "8px",
        "border-radius": "4px",
        margin: "8px 0",
      }}
    >
      <code>
        {props.node.content.replace(/^```[\w]*\n/, "").replace(/\n```$/, "")}
      </code>
    </pre>
  ),

  // `inline code`
  InlineCode: (props) => (
    <code
      style={{
        "background-color":
          "var(--cm-editor-background, rgba(128, 128, 128, 0.1))",
        padding: "2px 4px",
        "border-radius": "3px",
        "font-family": "monospace",
      }}
    >
      {props.node.content.replace(/^`+|`+$/g, "")}
    </code>
  ),

  // Plain text content
  Text: (props) => props.node.content,

  // *italic* or _italic_
  Emphasis: (props) => (
    <em>
      <Show
        when={props.node.children.length > 0}
        fallback={props.node.content.replace(/^\*|\*$/g, "")}
      >
        <For each={props.node.children}>
          {(child) => <DefaultNode node={child} />}
        </For>
      </Show>
    </em>
  ),

  // **bold** or __bold__
  StrongEmphasis: (props) => (
    <strong>
      <Show
        when={props.node.children.length > 0}
        fallback={props.node.content.replace(/^\*\*|\*\*$/g, "")}
      >
        <For each={props.node.children}>
          {(child) => <DefaultNode node={child} />}
        </For>
      </Show>
    </strong>
  ),

  // [link text](url) or [link text](url "title")
  Link: (props) => (
    <a
      href={extractLinkUrl(props.node)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </a>
  ),

  // ![alt text](image.jpg) or ![alt text](image.jpg "title")
  Image: (props) => (
    <img src={extractLinkUrl(props.node)} alt={extractImageAlt(props.node)} />
  ),

  // - bullet list or * bullet list
  BulletList: (props) => (
    <ul>
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </ul>
  ),

  // 1. ordered list
  OrderedList: (props) => (
    <ol>
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </ol>
  ),

  // List item content
  ListItem: (props) => (
    <li>
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </li>
  ),

  // > blockquote
  Blockquote: (props) => (
    <blockquote
      style={{
        "border-left": "4px solid var(--cm-editor-selectionBackground, #ddd)",
        "padding-left": "16px",
        margin: "8px 0",
      }}
    >
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </blockquote>
  ),

  // --- or *** or ___
  HorizontalRule: () => (
    <hr
      style={{
        border: "none",
        "border-top": "1px solid var(--cm-editor-selectionBackground, #ddd)",
        margin: "16px 0",
      }}
    />
  ),

  // Soft line break
  LineBreak: () => <br />,
  // Hard line break (two spaces + newline)
  HardLineBreak: () => <br />,

  // | col1 | col2 | table syntax
  Table: (props) => (
    <table
      style={{
        "border-collapse": "collapse",
        margin: "8px 0",
        width: "100%",
      }}
    >
      <Show
        when={props.node.children.some((child) => child.type === "TableHeader")}
      >
        <thead>
          <For
            each={props.node.children.filter(
              (child) => child.type === "TableHeader",
            )}
          >
            {(header) => (
              <tr>
                <For
                  each={header.children.filter(
                    (child) => child.type === "TableCell",
                  )}
                >
                  {(cell) => (
                    <th
                      style={{
                        border:
                          "1px solid var(--cm-editor-selectionBackground, #ddd)",
                        padding: "6px 12px",
                        "font-weight": "bold",
                        "background-color":
                          "var(--cm-editor-background, rgba(128, 128, 128, 0.05))",
                        "text-align": "left",
                      }}
                    >
                      {<DefaultNode node={cell} />}
                    </th>
                  )}
                </For>
              </tr>
            )}
          </For>
        </thead>
      </Show>
      <tbody>
        <For
          each={props.node.children.filter(
            (child) => child.type === "TableRow",
          )}
        >
          {(row) => (
            <tr>
              <For
                each={row.children.filter(
                  (child) => child.type === "TableCell",
                )}
              >
                {(cell) => (
                  <td
                    style={{
                      border:
                        "1px solid var(--cm-editor-selectionBackground, #ddd)",
                      padding: "6px 12px",
                      "text-align": "left",
                    }}
                  >
                    <DefaultNode node={cell} />
                  </td>
                )}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  ),

  // Table row - handled within Table
  TableRow: NOOP,
  // Table header - handled within Table
  TableHeader: NOOP,

  // Table cell content
  TableCell: (props) => (
    <Show when={props.node.children.length > 0} fallback={props.node.content}>
      <For each={props.node.children}>
        {(node) => <DefaultNode node={node} />}
      </For>
    </Show>
  ),

  // ~~strikethrough~~
  Strikethrough: (props) => (
    <del>
      <For each={props.node.children}>
        {(node) => <DefaultNode node={node} />}
      </For>
    </del>
  ),

  // Missing block-level nodes
  // Heading 1\n======= (underlined with =)
  SetextHeading1: (props) => <h1>{props.node.content.split("\n")[0]}</h1>,
  // Heading 2\n------- (underlined with -)
  SetextHeading2: (props) => <h2>{props.node.content.split("\n")[0]}</h2>,
  // Raw HTML block content
  HTMLBlock: (props) => <div innerHTML={props.node.content} />,
  // [link]: url "title" (link reference definition)
  LinkReference: NOOP,
  // <!-- HTML comment block -->
  CommentBlock: NOOP,
  // <?xml processing instruction?>
  ProcessingInstructionBlock: NOOP,

  // Missing inline nodes
  // \\escaped character
  Escape: (props) => props.node.content.slice(1),
  // &amp; &lt; HTML entities
  Entity: (props) => {
    // Simple HTML entity decoder
    const entities: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&nbsp;": "\u00A0",
      "&copy;": "\u00A9",
      "&reg;": "\u00AE",
      "&trade;": "\u2122",
    };
    return entities[props.node.content] || props.node.content;
  },
  // <span>inline HTML</span>
  HTMLTag: (props) => <span innerHTML={props.node.content} />,
  // <!-- inline comment -->
  Comment: NOOP,
  // <?xml inline processing instruction?>
  ProcessingInstruction: NOOP,
  // <https://example.com> or https://example.com (auto-detected links)
  Autolink: (props) => (
    <a href={props.node.content} target="_blank" rel="noopener noreferrer">
      {props.node.content}
    </a>
  ),

  // Missing token/mark types - return empty string
  // # (header marker)
  HeaderMark: NOOP,
  // > (quote marker)
  QuoteMark: NOOP,
  // [ ] (link bracket markers)
  LinkMark: NOOP,
  // * _ (emphasis markers)
  EmphasisMark: NOOP,
  // ` (code markers)
  CodeMark: NOOP,
  // "title" part in [text](url "title")
  LinkTitle: (props) => (
    <For each={props.node.children}>
      {(child) => <DefaultNode node={child} />}
    </For>
  ),
  // [label] part in [label](url)
  LinkLabel: (props) => (
    <For each={props.node.children}>
      {(child) => <DefaultNode node={child} />}
    </For>
  ),
  // URL part in links
  URL: (props) => props.node.content,
  // Code content without markers
  CodeText: (props) => props.node.content,
  // js in ```js (language info)
  CodeInfo: NOOP,

  // Extension nodes (GFM and others)
  // ~~ (strikethrough markers)
  StrikethroughMark: NOOP,
  // | (table delimiter)
  TableDelimiter: NOOP,
  // - [x] task list item or - [ ] task list item
  Task: (props) => (
    <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </div>
  ),
  // [x] or [ ] (task markers)
  TaskMarker: NOOP,
  // ^superscript^
  Superscript: (props) => (
    <sup>
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </sup>
  ),
  // ^ (superscript markers)
  SuperscriptMark: NOOP,
  // ~subscript~
  Subscript: (props) => (
    <sub>
      <For each={props.node.children}>
        {(child) => <DefaultNode node={child} />}
      </For>
    </sub>
  ),
  // ~ (subscript markers)
  SubscriptMark: NOOP,
  // :emoji_name:
  Emoji: (props) => <span>{props.node.content}</span>,
};

function DefaultNode(props: { node: MDNode }): any {
  const context = useContext(MDRendererContext);
  return (
    <Show
      when={
        context.renderers?.[props.node.type] ??
        DefaultNodeRenderers[props.node.type]
      }
      keyed
      fallback={props.node.content}
    >
      {(Comp) => <Comp node={props.node} />}
    </Show>
  );
}

export function MDRenderer(props: MDRendererProps) {
  const node = createMemo(() => {
    const tree = parser.parse(props.content);
    return parseMarkdownTree(tree.topNode, props.content);
  });

  return (
    <MDRendererContext value={props}>
      <span class="markdown-content" style={{ display: "contents" }}>
        <DefaultNode node={node()} />
      </span>
    </MDRendererContext>
  );
}
