import { describe, expect, it } from "vitest";
import {
  CompletionContext,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { luau } from "./luau";

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
