/**
 * Asking for an unwrap without blocking the page, and coping where there is no worker.
 *
 * ## Why a worker rather than just calling it
 *
 * **Because the unwrap takes seconds, not milliseconds.** Measured on this device: 1.4 seconds for
 * a 9,740-triangle sphere, 11.6 for 38,732, and 74 for 84,044 — the table in `./unwrap` has the
 * rest. A rebake is a deliberate act, but holding the page still for a second and a half while
 * somebody's model is a spinner is not a deliberate act they asked for, and on a busy main thread
 * it is worse than that. The mesh it is handed is deliberately coarse (see
 * `REFERENCE_VOXEL_SIZE`) precisely so that this cost is the small one.
 *
 * ## Why the fallback is not a warning
 *
 * **Because it is the normal path in a test and the degraded one in an old browser, and a function
 * that warns is a function everybody learns to ignore.** The fallback does the same work on the
 * main thread and resolves with the same answer; the only thing lost is that the page stops while
 * it happens.
 *
 * ## Why importing the adapter here costs nothing
 *
 * **Because the quarter of a megabyte is behind `loadXAtlas` and not behind this import.** The
 * adapter itself is a few hundred lines of arithmetic; it reaches for `xatlas-wasm` with a
 * *dynamic* import of its own, so the WebAssembly becomes its own chunk whether it is reached
 * through a worker or through the fallback below. Verified in the build output: the chunk holding
 * `findWasmBinary` is not in `index.html`'s preload graph and not in the main bundle, so it is
 * fetched the first time somebody actually paints.
 */
import {
  loadXAtlas,
  unwrapMesh,
  type UnwrapOptions,
  type UnwrapResult,
} from "./unwrap";
import type { UnwrapReply, UnwrapRequest } from "./unwrap-worker";

/** How the caller hears about an unwrap going on, for a status line or a progress bar. */
export type UnwrapProgress = (fraction: number) => void;

/**
 * The worker could not run at all, as distinct from the unwrap it was asked for failing.
 *
 * **A class rather than a flag because the two must not be confused.** A worker that never
 * started — blocked, or a browser that constructs one and then cannot run it — is a missing
 * worker, and the same work is perfectly possible on this thread, just slowly. A worker that
 * started and came back `failed` has told us something about the *model*, and running the same
 * thing again on this thread would fail the same way after waiting twice as long.
 */
class WorkerUnavailable extends Error {}

/**
 * Unwraps a mesh off the main thread, or on it where there is no worker.
 *
 * **Resolves with `undefined` for a mesh with nothing in it**, which is a model with no parts
 * rather than a failure — the same answer the in-worker path gives, so a caller needs no special
 * case for which one ran.
 */
export const unwrapOffThread = async (
  mesh: {
    readonly positions: Float32Array;
    readonly indices: Uint32Array;
    readonly vertexCount: number;
  },
  options?: UnwrapOptions,
  onProgress?: UnwrapProgress,
): Promise<UnwrapResult | undefined> => {
  if (typeof Worker === "undefined") {
    return unwrapHere(mesh, options, onProgress);
  }

  const worker = new Worker(new URL("./unwrap.worker.ts", import.meta.url), {
    type: "module",
  });

  try {
    return await new Promise<UnwrapResult | undefined>((resolve, reject) => {
      const settle = (): void => {
        worker.terminate();
      };
      worker.onmessage = (event: MessageEvent<UnwrapReply>): void => {
        const reply = event.data;
        if (reply.kind === "progress") {
          onProgress?.(reply.fraction);
          return;
        }
        settle();
        if (reply.kind === "failed") {
          reject(new Error(reply.reason));
          return;
        }
        resolve(reply.kind === "atlas" ? reply.result : undefined);
      };
      worker.onerror = (event: ErrorEvent): void => {
        settle();
        // **`message` rather than a generic sentence**, because a worker that fails to load its
        // own module reports the reason here and nothing anywhere else will — the same reasoning
        // as `meshForPrintOffThread`. It becomes the reason to try again here, not a message.
        reject(
          new WorkerUnavailable(
            event.message || "the unwrapping worker failed",
          ),
        );
      };

      const request: UnwrapRequest = {
        positions: mesh.positions,
        indices: mesh.indices,
        vertexCount: mesh.vertexCount,
        ...(options === undefined ? {} : { options }),
      };
      worker.postMessage(request);
    });
  } catch (reason) {
    if (!(reason instanceof WorkerUnavailable)) throw reason;
    return unwrapHere(mesh, options, onProgress);
  }
};

/** The unwrap on this thread, for a browser with no worker. */
const unwrapHere = async (
  mesh: {
    readonly positions: Float32Array;
    readonly indices: Uint32Array;
    readonly vertexCount: number;
  },
  options?: UnwrapOptions,
  onProgress?: UnwrapProgress,
): Promise<UnwrapResult | undefined> => {
  onProgress?.(0);
  onProgress?.(0.5);
  const result = unwrapMesh(
    await loadXAtlas(),
    {
      positions: mesh.positions,
      indices: mesh.indices,
      vertexCount: mesh.vertexCount,
    },
    options,
  );
  onProgress?.(1);
  return result;
};
