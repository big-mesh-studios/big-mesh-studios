import { describe, expect, it } from "vitest";
import {
  CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import type { LuauAnalyzer, LuauCompletionItem } from "./types";
import { luau, luauCompletion, luauKeywordRanges } from "./luau";

const stateFor = (doc: string): EditorState =>
  EditorState.create({ doc, extensions: [luau()] });

/**
 * Every label the language's completion sources offer at the end of `doc`.
 *
 * **Flattened, because language data may hold a source or an array of them** — the package
 * contributes one source and this module contributes two — and awaited synchronously,
 * because the sources here are all synchronous. A source that returned a promise would be
 * skipped rather than awaited; no such source exists in this document.
 */
const completionLabels = (doc: string): Array<string> => {
  const state = stateFor(doc);
  const position = doc.length;
  const labels: Array<string> = [];
  for (const source of state
    .languageDataAt<CompletionSource | readonly CompletionSource[]>(
      "autocomplete",
      position,
    )
    .flat()) {
    const result = source(new CompletionContext(state, position, true));
    if (!result || Array.isArray(result) || !("options" in result)) {
      continue;
    }
    labels.push(...result.options.map((option) => option.label));
  }
  return labels;
};

describe("Luau language support", () => {
  it("parses Luau syntax rather than Lua 5.1 alone", () => {
    const doc = `export type Point = { x: number, y: number }

local function add(a: number, b: number): number
  return a + b
end

local value: Point = { x = 1, y = 2 }
local label = \`point {value.x}\`
print(add(value.x, value.y), label)
`;
    const errors: Array<string> = [];
    syntaxTree(stateFor(doc)).iterate({
      enter(node) {
        if (node.type.isError) {
          errors.push(node.name);
        }
      },
    });

    expect(errors).toEqual([]);
  });

  it("completes a standard library's members after its dot", () => {
    expect(completionLabels("table.")).toContain("insert");
  });

  it("does not mistake a dotted comment for a field access", () => {
    expect(completionLabels("-- table.")).not.toContain("insert");
  });
});

/**
 * The keyword words `luauKeywordRanges` finds in `doc`, in order.
 *
 * The grammar emits no keyword tokens (see the function's doc comment), so this
 * is the only place the decoration source can be checked without a DOM.
 */
const highlightedKeywords = (doc: string): Array<string> =>
  luauKeywordRanges(stateFor(doc), 0, doc.length).map(({ from, to }) =>
    doc.slice(from, to),
  );

describe("Luau keyword highlighting", () => {
  it("finds every keyword in code", () => {
    expect(highlightedKeywords("if true then return 1 end")).toEqual([
      "if",
      "true",
      "then",
      "return",
      "end",
    ]);
  });

  it("leaves comments and strings alone", () => {
    expect(
      highlightedKeywords('-- if true\nlocal label = "then else"\n'),
    ).toEqual(["local"]);
  });

  it("does not colour builtins as keywords", () => {
    expect(highlightedKeywords('print(string.format("if"))')).toEqual([]);
  });

  it("treats an interpolation expression as code", () => {
    expect(
      highlightedKeywords("local s = `value {if true then 1 else 2}`"),
    ).toEqual(["local", "if", "true", "then", "else"]);
  });
});

/** A fake analyzer that records every request it receives. */
const fakeAnalyzer = (items: LuauCompletionItem[]) => {
  const requests: Array<{ path: string; line: number; column: number }> = [];
  const analyzer: LuauAnalyzer = {
    async complete(request) {
      requests.push(request);
      return items;
    },
  };
  return { analyzer, requests };
};

const resultAt = async (
  doc: string,
  analyzer: LuauAnalyzer,
): Promise<CompletionResult | null> => {
  const state = EditorState.create({
    doc,
    extensions: [luau({ path: "main.luau", analysis: analyzer })],
  });
  const source = luauCompletion(analyzer, "main.luau");
  return await source(new CompletionContext(state, doc.length, false));
};

const labelsOf = (result: CompletionResult | null): Array<string> =>
  result && !Array.isArray(result)
    ? result.options.map((option) => option.label)
    : [];

describe("Luau analysis-backed completion", () => {
  it("asks the analyzer and maps its items", async () => {
    const { analyzer, requests } = fakeAnalyzer([
      {
        label: "insert",
        kind: "function",
        detail: "(table, number) -> ()",
        parentheses: "cursorInside",
      },
    ]);

    const result = await resultAt("table.", analyzer);

    expect(requests).toEqual([{ path: "main.luau", line: 0, column: 6 }]);
    expect(labelsOf(result)).toEqual(["insert"]);
    expect(result?.from).toBe(6);
    expect(result?.options[0]?.detail).toBe("(table, number) -> ()");
  });

  it("sends a UTF-8 byte column, not a UTF-16 offset", async () => {
    const { analyzer, requests } = fakeAnalyzer([]);
    const doc = 'local s = "é"; math.';

    await resultAt(doc, analyzer);

    expect(requests[0]?.column).toBe(new TextEncoder().encode(doc).length);
    expect(requests[0]?.column).not.toBe(doc.length);
  });

  it("falls back to textual completion when the analyzer rejects", async () => {
    const analyzer: LuauAnalyzer = {
      async complete() {
        throw new Error("analysis is unavailable");
      },
    };

    expect(labelsOf(await resultAt("table.", analyzer))).toContain("insert");
  });

  it("falls back to textual completion when the analyzer returns nothing", async () => {
    const { analyzer } = fakeAnalyzer([]);
    expect(labelsOf(await resultAt("table.", analyzer))).toContain("insert");
  });

  it("does not expose the composed source through language data", () => {
    const { analyzer, requests } = fakeAnalyzer([
      { label: "from-analysis", kind: "property" },
    ]);
    const state = EditorState.create({
      doc: "table.",
      extensions: [luau({ path: "main.luau", analysis: analyzer })],
    });

    const sources = state
      .languageDataAt<CompletionSource | readonly CompletionSource[]>(
        "autocomplete",
        6,
      )
      .flat();
    for (const source of sources) {
      source(new CompletionContext(state, 6, false));
    }

    // The fallback may look at language data, but the analyzer-backed source must not
    // be reachable that way: that is the recursion trap in the plan.
    expect(requests).toHaveLength(0);
  });

  it("completes require specifiers from the analyzer's map", async () => {
    const analyzer: LuauAnalyzer = {
      async complete() {
        return [];
      },
      specifiers() {
        return ["./door", "./door.luau", "spacescape"];
      },
    };

    const doc = 'local d = require("./d';
    const result = await resultAt(doc, analyzer);

    expect(labelsOf(result)).toEqual(["./door", "./door.luau"]);
    expect(result?.from).toBe(doc.lastIndexOf("./d"));
  });
});
