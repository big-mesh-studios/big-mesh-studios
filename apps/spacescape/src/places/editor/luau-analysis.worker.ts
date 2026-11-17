/**
 * The analysis worker: the only place a place's files are handed to
 * `@big-mesh-studios/luau-runtime/analysis`.
 *
 * **The app owns this worker, not the runtime package**, because it is the piece that
 * knows a place has files, which of them the bundler treats as modules, and what
 * `require("spacescape")` means. The runtime knows how to ask Luau's frontend; this file
 * knows what to ask it about.
 *
 * **Everything is serialized through one promise chain.** Two `onmessage` handlers that
 * both `await` would otherwise interleave a `configure` into a `complete` and type-check
 * half a project. The queue is four lines and removes the whole class of ordering bug.
 *
 * **The artifact is created on the first `complete`, not on `configure`.** Opening a
 * `.luau` tab must not download three megabytes before the person types a character.
 */

import {
  LuauAnalysis,
  type LuauAnalysisCompletion,
} from "@big-mesh-studios/luau-runtime/analysis";

import type {
  LuauAnalysisRequest,
  LuauAnalysisResponse,
} from "./luau-analysis-protocol";

/** Sources by module name, and the bundler-authored specifier map. */
const sources = new Map<string, string>();
let specifiers: Record<string, string> = {};

/** The one session this worker owns. */
let analysis: LuauAnalysis | undefined;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const post = (response: LuauAnalysisResponse): void => {
  (
    globalThis as unknown as {
      postMessage(message: LuauAnalysisResponse): void;
    }
  ).postMessage(response);
};

/**
 * Create the artifact if needed and replay the current project into a fresh session.
 *
 * **`reset` then replay, not incremental patching.** A `configure` describes the file set
 * as it now is; reusing a frontend whose caches describe a deleted file is how a
 * completion ends up naming a module that no longer exists. The replay is small (the
 * files were just sent) and the call is rare.
 */
const start = async (): Promise<LuauAnalysis> => {
  if (!analysis) {
    analysis = await LuauAnalysis.create();
  }
  analysis.reset();
  for (const [name, source] of sources) {
    analysis.setSource(name, source);
  }
  for (const [specifier, module] of Object.entries(specifiers)) {
    analysis.setSpecifier(specifier, module);
  }
  return analysis;
};

const handle = async (request: LuauAnalysisRequest): Promise<void> => {
  try {
    switch (request.kind) {
      case "configure":
        sources.clear();
        for (const [name, source] of Object.entries(request.sources)) {
          sources.set(name, source);
        }
        specifiers = { ...request.specifiers };
        if (analysis) {
          await start();
        }
        return;

      case "source":
        sources.set(request.name, request.source);
        // Before the first `complete` this is a buffer entry; after it the analyzer is
        // kept current so a later completion on another file sees this edit.
        analysis?.setSource(request.name, request.source);
        return;

      case "complete": {
        const session = analysis ?? (await start());
        // `start` returns the session it just built, so a first completion and a
        // post-configure completion take the same path.
        const items: LuauAnalysisCompletion[] = session.complete(
          request.module,
          request.line,
          request.column,
        );
        post({ id: request.id, kind: "items", items });
        return;
      }

      case "reset":
        analysis?.dispose();
        analysis = undefined;
        sources.clear();
        specifiers = {};
        return;
    }
  } catch (error) {
    post({
      id: request.id,
      kind: "error",
      message: messageOf(error),
      // No session after the failure means `LuauAnalysis.create` itself failed — a bad
      // fetch, an incompatible wasm, memory — and retrying every keystroke would not
      // fix it. A checker error inside an existing session stays a fallback.
      fatal: analysis === undefined,
    });
  }
};

/** One task at a time, for the reason in the header. */
let queue: Promise<void> = Promise.resolve();

globalThis.addEventListener("message", (event) => {
  const request = (event as MessageEvent<LuauAnalysisRequest>).data;
  queue = queue.then(
    () => handle(request),
    () => handle(request),
  );
});
