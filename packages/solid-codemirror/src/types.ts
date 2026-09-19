import type TS from "typescript";
import type { createWorker } from "./codemirror-ts/worker";

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
