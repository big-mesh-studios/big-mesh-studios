/**
 * Luau support for the shared editor: the community Lezer grammar plus the
 * completion a language with no language server can honestly offer.
 *
 * ## Why a third-party grammar
 *
 * CodeMirror's own packages have no Lua language, and the Luau playground's
 * highlighter is a TextMate pipeline built for that playground rather than a
 * reusable CodeMirror language. `@fazelstudio/codemirror-lang-luau` is a native
 * Lezer grammar covering Lua 5.1 plus Luau's additions — gradual typing, type
 * aliases, string interpolation, compound assignment, `continue` — which is the
 * shape this editor needs: highlighting, indentation and folding arrive as one
 * `LanguageSupport`, with no worker and no CDN round trip.
 *
 * ## Why the completions are ours
 *
 * A Luau place is not parsed by the TypeScript worker (ADR 0060), so there is no
 * type-aware service behind this document. The package already completes its
 * keywords and the base globals; what it cannot know is the identifiers already
 * written in the document, or the members of the standard libraries the VM opens.
 * Those are the two additions below — both are textual facts, not guesses about
 * a program's types.
 *
 * **The playground's fuller completion is not available here.** It calls
 * `Luau::autocomplete` from Luau's Analysis library. `packages/luau-runtime`
 * deliberately builds Common, Ast, Bytecode, Compiler and VM but not Analysis
 * (ADR 0060 decision 8), so there is no autocomplete entry point in the shipped
 * `luau.wasm`. Type-aware completion therefore waits for the lazy analysis
 * artifact described in the plan's Phase 3, not for the compiler half this editor
 * already has.
 */

import {
  autocompletion,
  completeAnyWord,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Extension } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  luau as luauLanguageSupport,
  luauLanguage,
} from "@fazelstudio/codemirror-lang-luau";
import type { LuauAnalyzer, LuauCompletionItem } from "./types";

/**
 * The words the language reserves, in the order the package lists them.
 *
 * **A separate list from the completion vocabulary below** so keyword
 * highlighting never colours a library function blue. This is also the exact
 * set the grammar fails to emit as tokens — see `luauKeywordRanges`.
 */
const keywords = [
  "and",
  "break",
  "continue",
  "do",
  "else",
  "elseif",
  "end",
  "export",
  "false",
  "for",
  "function",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "type",
  "typeof",
  "until",
  "while",
];

/**
 * The remaining words the language package already offers, so the document-word
 * source does not show a second copy of each.
 *
 * Keep this in step with the package's own `autocomplete` list: its builtin
 * types and base-library functions. A duplicate is not a bug in the grammar,
 * only a duplicate in the popup.
 */
const builtins = [
  "any",
  "boolean",
  "buffer",
  "never",
  "number",
  "string",
  "thread",
  "table",
  "assert",
  "error",
  "getmetatable",
  "ipairs",
  "next",
  "pairs",
  "pcall",
  "print",
  "require",
  "select",
  "setmetatable",
  "tonumber",
  "tostring",
  "unpack",
  "xpcall",
];

const languageVocabulary = new Set([...keywords, ...builtins]);

/**
 * A keyword-looking word in code, strings or comments — filtered after
 * matching, because the grammar's string and comment nodes are the only way to
 * tell prose from code.
 */
const keywordPattern = new RegExp(`\\b(?:${keywords.join("|")})\\b`, "g");

/** Nodes whose contents are prose rather than code. */
const proseNode = /Comment|String/;

/**
 * Every keyword range in `[from, to)` that the grammar left untagged.
 *
 * **Why this exists at all.** The grammar's `styleTags` names `if`, `then`,
 * `end` and the rest, but Lezer never puts those tokens in the tree — the parse
 * of `if true then return 1 end` contains `IfStatement`, `Expression` and
 * `ReturnStatement` nodes and not one keyword child. A `HighlightStyle` for
 * `tags.keyword` therefore has nothing to format, and every keyword falls
 * through to the editor's plain text colour. The theme still colours
 * `tags.keyword` for grammars that do emit tokens; this scan covers the gap in
 * this one.
 *
 * **Textual, but not naive.** A word only counts if no `Comment` or `String`
 * node encloses it, so `-- if` and `"then else"` stay prose. Positions inside a
 * parse error are treated as code, which is the useful choice while typing.
 */
export function luauKeywordRanges(
  state: EditorState,
  from: number,
  to: number,
): Array<{ from: number; to: number }> {
  const tree = syntaxTree(state);
  const text = state.doc.sliceString(from, to);
  const ranges: Array<{ from: number; to: number }> = [];

  for (const match of text.matchAll(keywordPattern)) {
    const start = from + (match.index ?? 0);
    const end = start + match[0].length;

    let node: SyntaxNode | null = tree.resolveInner(start, 1);
    let prose = false;
    for (; node; node = node.parent) {
      // An interpolation is code inside an `InterpolatedString`, so stop before
      // the enclosing string would classify its expression as prose.
      if (node.name === "Interpolation") {
        break;
      }
      if (proseNode.test(node.name)) {
        prose = true;
        break;
      }
    }
    if (!prose) {
      ranges.push({ from: start, to: end });
    }
  }

  return ranges;
}

const keywordMark = Decoration.mark({ class: "cm-luau-keyword" });

const keywordHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView): DecorationSet {
      const decorations = [];
      for (const { from, to } of view.visibleRanges) {
        for (const range of luauKeywordRanges(view.state, from, to)) {
          decorations.push(keywordMark.range(range.from, range.to));
        }
      }
      return Decoration.set(decorations, true);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const keywordTheme = EditorView.theme({
  ".cm-luau-keyword": { color: "var(--cm-keyword, #7dcfff)" },
});

/**
 * The libraries a Luau state opens here, and the members of each.
 *
 * **Only the libraries the runtime actually opens.** ADR 0060 lists the set as
 * base, coroutine, string, table, math and utf8, so `os`, `io`, `debug` and
 * `task` are absent because they are absent from the VM — not by oversight.
 */
const standardLibrary: Readonly<Record<string, ReadonlyArray<string>>> = {
  coroutine: [
    "close",
    "create",
    "isyieldable",
    "resume",
    "running",
    "status",
    "wrap",
    "yield",
  ],
  math: [
    "abs",
    "acos",
    "asin",
    "atan",
    "atan2",
    "ceil",
    "clamp",
    "cos",
    "cosh",
    "deg",
    "e",
    "exp",
    "floor",
    "fmod",
    "frexp",
    "huge",
    "isfinite",
    "isinf",
    "isnan",
    "ldexp",
    "lerp",
    "log",
    "log10",
    "map",
    "max",
    "min",
    "modf",
    "nan",
    "noise",
    "phi",
    "pi",
    "pow",
    "rad",
    "random",
    "randomseed",
    "round",
    "sign",
    "sin",
    "sinh",
    "sqrt",
    "sqrt2",
    "tan",
    "tanh",
    "tau",
  ],
  string: [
    "byte",
    "char",
    "find",
    "format",
    "gmatch",
    "gsub",
    "len",
    "lower",
    "match",
    "pack",
    "packsize",
    "rep",
    "reverse",
    "split",
    "sub",
    "unpack",
    "upper",
  ],
  table: [
    "clear",
    "clone",
    "concat",
    "create",
    "find",
    "foreach",
    "foreachi",
    "freeze",
    "getn",
    "insert",
    "isfrozen",
    "maxn",
    "move",
    "pack",
    "remove",
    "sort",
    "unpack",
  ],
  utf8: ["char", "charpattern", "codepoint", "codes", "len", "offset"],
};

/**
 * Complete `library.` with that library's members.
 *
 * **A source of its own because the package's list is flat.** It names `print`
 * and `pairs`, not `table.insert`, and CodeMirror's `completeFromList` matches
 * from the start of the word after the dot, which would make every member of
 * every library a candidate for every dot. Matching the library before the dot
 * keeps `table.` to table functions and leaves `foo.` alone — there is no type
 * information here that could say what `foo` is.
 */
const libraryMembers: CompletionSource = (context) => {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const match = /([A-Za-z_]\w*)\.(\w*)$/.exec(before);
  if (!match) {
    return null;
  }
  const [, library, prefix] = match;
  const members = standardLibrary[library];
  if (!members) {
    return null;
  }

  // A dot in a comment or a string is prose, not a field access.
  const node = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (/Comment|String|Interp/.test(node.name)) {
    return null;
  }

  return {
    from: context.pos - prefix.length,
    options: members.map((name) => ({
      label: name,
      detail: library,
      type: "method",
    })),
    validFor: /^\w*$/,
  };
};

/**
 * Complete the identifiers already written in this document.
 *
 * **Not `completeAnyWord` unfiltered.** It would repeat every keyword and
 * builtin the language package has already offered, with a different completion
 * type, which the popup does not collapse. Filtering the package's vocabulary
 * leaves the names the author invented — the only ones nothing else can supply.
 */
const documentWords: CompletionSource = (context) => {
  const result = completeAnyWord(context);
  if (!result || Array.isArray(result) || !("options" in result)) {
    return result;
  }
  return {
    ...result,
    options: result.options.filter(
      (option) => !languageVocabulary.has(option.label),
    ),
  };
};

/**
 * Whether a position is prose rather than code.
 *
 * **An interpolation is code inside a string**, so the walk stops there before the
 * enclosing `InterpolatedString` would classify an expression as prose. The keyword
 * highlighter uses the same rule.
 */
const inProse = (state: EditorState, pos: number): boolean => {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
  for (; node; node = node.parent) {
    if (node.name === "Interpolation") return false;
    if (proseNode.test(node.name)) return true;
  }
  return false;
};

/** Whether a position is inside a comment, where even `require("` is prose. */
const inComment = (state: EditorState, pos: number): boolean => {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
  for (; node; node = node.parent) {
    if (node.name === "Interpolation") return false;
    if (/Comment/.test(node.name)) return true;
    if (/String/.test(node.name)) return false;
  }
  return false;
};

/**
 * The textual sources, merged, for the fallback rung of the ladder.
 *
 * **`languageDataAt` rather than a second copy of the lists.** The package's keyword
 * source, `documentWords` and `libraryMembers` are already installed as language data;
 * asking for them keeps this function in step with what the editor offers when no
 * analyzer is attached. The composed source is an `override`, never installed there, so
 * walking the data cannot find it again.
 */
const textualCompletion = (
  context: CompletionContext,
): CompletionResult | null => {
  const sources = context.state
    .languageDataAt<CompletionSource | readonly CompletionSource[]>(
      "autocomplete",
      context.pos,
    )
    .flat();

  const options: Completion[] = [];
  let from = context.pos;
  for (const source of sources) {
    const result = source(context);
    if (
      !result ||
      Array.isArray(result) ||
      result instanceof Promise ||
      !("options" in result)
    ) {
      continue;
    }
    options.push(...result.options);
    from = Math.min(from, result.from);
  }

  return options.length > 0 ? { from, options, validFor: /^\w*$/ } : null;
};

/**
 * `require("…")` completion, from the bundler's specifier map.
 *
 * **Not asked of the analyzer.** Its `StringCompletionCallback` stays `nullptr`: the
 * module rules are the bundler's, and the client already holds the map they produced.
 * The spelling the author is using is the spelling inserted (`./door` stays `./door`).
 */
const requireCompletion = (
  context: CompletionContext,
  analysis: LuauAnalyzer | undefined,
): CompletionResult | null => {
  if (!analysis?.specifiers) return null;
  if (inComment(context.state, context.pos)) return null;

  const line = context.state.doc.lineAt(context.pos);
  const before = context.state.doc.sliceString(line.from, context.pos);
  const match = /require\s*\(\s*(["'])([^"']*)$/.exec(before);
  if (!match) return null;

  const prefix = match[2] as string;
  const options = analysis
    .specifiers()
    .filter((specifier) => specifier.startsWith(prefix))
    .sort()
    .map((label) => ({ label, type: "text" }));
  if (options.length === 0) return null;

  return {
    from: context.pos - prefix.length,
    options,
    validFor: /^[^"']*$/,
  };
};

/** Map one analyzer item to the CodeMirror option that renders and applies it. */
const optionFor = (item: LuauCompletionItem): Completion => {
  const insert = item.insertText ?? item.label;
  const needsApply =
    item.replaceDotWithColon === true ||
    item.parentheses === "cursorAfter" ||
    item.parentheses === "cursorInside";

  const option: Completion = {
    label: item.label,
    // CodeMirror has no "module" icon; `text` is the neutral one for a specifier.
    type: item.kind === "module" ? "text" : item.kind,
    detail: item.detail,
  };
  if (item.typeCorrect && item.typeCorrect !== "none") {
    option.boost = 1;
  }

  if (!needsApply) {
    option.apply = insert;
    return option;
  }

  option.apply = (view, _completion, from, to) => {
    let start = from;
    let text = insert;

    // A function reached through `.` is a method: replacing the dot is the correction
    // the type checker knows and the popup can make.
    if (
      item.replaceDotWithColon &&
      from > 0 &&
      view.state.doc.sliceString(from - 1, from) === "."
    ) {
      start = from - 1;
      text = ":" + text;
    }

    let anchor = start + text.length;
    if (item.parentheses === "cursorInside") {
      text += "()";
      anchor = start + text.length - 1;
    } else if (item.parentheses === "cursorAfter") {
      text += "()";
      anchor = start + text.length;
    }

    view.dispatch({
      changes: { from: start, to, insert: text },
      selection: { anchor },
    });
  };

  return option;
};

/**
 * The analysis-backed completion source: ask types first, fall back to text.
 *
 * **The source is deliberately not in language data.** It is installed as an
 * `autocompletion` override, so `textualCompletion`'s walk of language data cannot find
 * it and recurse. The fallback is the same set of sources the editor has always used.
 */
export const luauCompletion =
  (analysis: LuauAnalyzer, path: string): CompletionSource =>
  async (context) => {
    const required = requireCompletion(context, analysis);
    if (required) return required;

    if (inProse(context.state, context.pos)) {
      return textualCompletion(context);
    }

    const line = context.state.doc.lineAt(context.pos);
    const prefix = context.state.doc.sliceString(line.from, context.pos);
    // Luau counts UTF-8 bytes; CodeMirror counts UTF-16 code units. For ASCII they
    // agree, and for everything else this is the line that keeps the request honest.
    const column = new TextEncoder().encode(prefix).length;
    const word = context.matchBefore(/\w*/);
    const from = word?.from ?? context.pos;

    try {
      const items = await analysis.complete({
        path,
        line: line.number - 1,
        column,
      });
      if (items.length > 0) {
        return { from, options: items.map(optionFor), validFor: /^\w*$/ };
      }
    } catch {
      // Every rung of the ladder is a working editor: a refused or timed-out analysis
      // answers with the textual sources instead of an error popup.
    }

    return textualCompletion(context);
  };

/**
 * Start completion after the characters `activateOnTyping` does not see: `.` and `:`
 * for a member, and a quote or paren inside `require(…)` for a specifier.
 *
 * The action is queued because `keyup` runs after CodeMirror has handled the edit but
 * `startCompletion` wants the state as it will be read by the source; a microtask is
 * late enough and does not wait on a timer.
 */
const completionTriggers = EditorView.domEventHandlers({
  keyup(event, view) {
    if (event.key === "." || event.key === ":") {
      queueMicrotask(() => startCompletion(view));
      return;
    }

    if (
      event.key === '"' ||
      event.key === "'" ||
      event.key === "(" ||
      event.key === "Backspace"
    ) {
      const position = view.state.selection.main.head;
      const line = view.state.doc.lineAt(position);
      const before = view.state.doc.sliceString(line.from, position);
      if (/require\s*\(\s*["'][^"']*$/.test(before)) {
        queueMicrotask(() => startCompletion(view));
      }
    }
  },
});

/** Options for the Luau extension. */
export interface LuauOptions {
  /** The document's key, so the analyzer knows which module the position is in. */
  path?: string;
  /** An app-owned analyzer; absent means the textual completion only. */
  analysis?: LuauAnalyzer;
}

/**
 * The Luau language extension: grammar, highlighting, indentation, folding and
 * completion.
 *
 * Returned as a fresh extension per editor because a `LanguageSupport` belongs
 * to the state it is attached to. With an analyzer the source is an `autocompletion`
 * override (types first, text second); without one the editor is exactly what it was.
 */
export const luau = (options: LuauOptions = {}): Extension => {
  const extensions: Extension[] = [
    luauLanguageSupport(),
    keywordHighlighter,
    keywordTheme,
    luauLanguage.data.of({
      autocomplete: [documentWords, libraryMembers],
    }),
  ];

  if (options.analysis) {
    extensions.push(
      autocompletion({
        override: [luauCompletion(options.analysis, options.path ?? "")],
        activateOnTypingDelay: 150,
      }),
      completionTriggers,
    );
  }

  return extensions;
};
