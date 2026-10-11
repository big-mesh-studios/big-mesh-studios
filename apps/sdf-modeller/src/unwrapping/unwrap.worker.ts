/**
 * The worker itself: four lines that exist so `unwrap-worker.ts` does not have to.
 *
 * ## Why this file is a file at all
 *
 * **Because Vite turns `new Worker(new URL("./unwrap.worker.ts", import.meta.url))` into a
 * separate bundle, and only a real module boundary gives it something to point at.** The same
 * reason `./print/print.worker.ts` is thirty-one lines rather than none, and the reason that file
 * is not tested: there is nothing in it to test.
 *
 * ## Why the heavy import is here and not at the top of the module
 *
 * **`import("./unwrap")` inside the reply handler, and `./unwrap` in turn imports
 * `xatlas-wasm` dynamically.** The library is one 288 kB ESM file with the WebAssembly inlined as
 * a string literal — no side-car to fetch and nothing to configure — but still a quarter of a
 * megabyte to parse, and this worker is only ever constructed when somebody actually rebakes the
 * coordinates. Keeping the import behind the call means an application that loads but never
 * unwraps never parses it.
 */
/// <reference lib="webworker" />

import { loadXAtlas } from "./unwrap";
import { runUnwrap, type UnwrapRequest } from "./unwrap-worker";

self.onmessage = (event: MessageEvent<UnwrapRequest>): void => {
  void runUnwrap(
    event.data,
    (reply) => {
      self.postMessage(reply);
    },
    loadXAtlas,
  );
};
