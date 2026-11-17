/**
 * The four messages between the editor and the analysis worker.
 *
 * **Raw `postMessage`, not Comlink.** The protocol needs two things — drop a stale
 * answer, and know which request failed — and a request id gives both for free. Comlink
 * would add a dependency for a proxy over a function that is already synchronous inside
 * the worker.
 *
 * `configure` is sent once per file set (and on a project revision); `source` on every
 * keystroke; `complete` for a popup. `reset` exists for a caller that wants to drop the
 * frontend without tearing the worker down.
 */

import type { LuauAnalysisCompletion } from "@big-mesh-studios/luau-runtime/analysis";

export type LuauAnalysisRequest =
  | {
      id: number;
      kind: "configure";
      sources: Record<string, string>;
      specifiers: Record<string, string>;
    }
  | { id: number; kind: "source"; name: string; source: string }
  | {
      id: number;
      kind: "complete";
      module: string;
      line: number;
      column: number;
    }
  | { id: number; kind: "reset" };

export type LuauAnalysisResponse =
  | { id: number; kind: "items"; items: LuauAnalysisCompletion[] }
  | {
      id: number;
      kind: "error";
      message: string;
      /**
       * The artifact could not be created, so every later request would fail the same
       * way. A checker error after creation is not fatal and is left as a fallback.
       */
      fatal?: boolean;
    };
