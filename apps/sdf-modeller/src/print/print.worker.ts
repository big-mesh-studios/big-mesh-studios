/**
 * The worker itself: four lines that exist so `print-worker.ts` does not have to.
 *
 * ## Why this is a file at all
 *
 * **Because Vite turns `new Worker(new URL("./print.worker.ts", import.meta.url))` into a
 * separate bundle, and only a real module boundary gives it something to point at.** The
 * alternative — constructing a worker from a blob of source text — would put the meshing
 * package's source into a string in the main bundle, which is neither tree-shaken nor
 * type-checked by the build's module graph.
 *
 * ## Why the import is static
 *
 * **Because the worker is only ever constructed by `print-mesh-client`, which is only ever
 * imported by `export-model`, which is already a dynamic import.** So this costs nothing on
 * the first frame: the chunk that reaches for a worker is the chunk that was already lazy
 * because of `jszip`. The same reason `print.worker.ts` does not import the writer.
 */
/// <reference lib="webworker" />

import { runPrintMesh, type PrintMeshRequest } from "./print-worker";

self.onmessage = (event: MessageEvent<PrintMeshRequest>): void => {
  runPrintMesh(event.data, (reply) => {
    self.postMessage(reply);
  });
};
