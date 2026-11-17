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
  completeAnyWord,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import {
  luau as luauLanguageSupport,
  luauLanguage,
} from "@fazelstudio/codemirror-lang-luau";

/**
 * The words the language package already offers, so the document-word source
 * does not show a second copy of each.
 *
 * Keep this in step with the package's own `autocomplete` list: its keywords,
 * builtin types and base-library functions. A duplicate is not a bug in the
 * grammar, only a duplicate in the popup.
 */
const languageVocabulary = new Set([
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
]);

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
 * The Luau language extension: grammar, highlighting, indentation, folding and
 * completion.
 *
 * Returned as a fresh extension per editor because a `LanguageSupport` belongs
 * to the state it is attached to.
 */
export const luau = (): Extension => [
  luauLanguageSupport(),
  luauLanguage.data.of({
    autocomplete: [documentWords, libraryMembers],
  }),
];
