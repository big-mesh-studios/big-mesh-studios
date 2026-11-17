import type TS from "typescript";
import type { createWorker } from "./codemirror-ts/worker";

/**
 * One completion the Luau analyzer can offer.
 *
 * **Re-declared here rather than imported from `luau-runtime`.** This package must stay
 * free of the runtime dependency; the app's client returns values that are structurally
 * the same, and the assignment is checked where the two meet. If the two shapes ever
 * need to differ, the compiler says so at that seam.
 */
export interface LuauCompletionItem {
  label: string;
  kind:
    | "property"
    | "variable"
    | "keyword"
    | "constant"
    | "type"
    | "function"
    | "module"
    | "text";
  detail?: string;
  insertText?: string;
  deprecated?: boolean;
  parentheses?: "none" | "cursorAfter" | "cursorInside";
  typeCorrect?: "none" | "correct" | "correctFunctionResult";
  replaceDotWithColon?: boolean;
}

/**
 * The app-owned analyzer the Luau completion source asks.
 *
 * `line` is 0-based and `column` counts **UTF-8 bytes** into the line, because that is
 * what Luau's lexer counts; the conversion from CodeMirror's UTF-16 offsets happens in
 * `luau.ts`, next to the request it is for.
 *
 * `specifiers` is optional and only feeds `require("…")` completion. The analyzer does
 * not answer that: its module rules belong to the bundler, and the client already holds
 * the map the bundler authored.
 */
export interface LuauAnalyzer {
  complete(request: {
    path: string;
    line: number;
    column: number;
  }): Promise<LuauCompletionItem[]>;
  specifiers?(): readonly string[];
}

/**
 * The methods the shared language worker answers, before the editor-side
 * additions below. Lives as a type so both sides of the Comlink channel
 * (the worker that implements it and the provider that wraps it) agree.
 */
export type WorkerAPI = ReturnType<typeof createWorker>;

/**
 * The full surface a code-mirror language worker exposes over Comlink: the
 * worker's own calls, plus the file and compiler-option management the
 * provider drives.
 */
export interface LSPAPI extends WorkerAPI {
  deleteFile(path: string): void;
  setCompilerOptions(options: TS.CompilerOptions): Promise<void> | void;
}
