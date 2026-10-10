/**
 * Asking for a print's mesh without blocking the page, and coping where there is no worker.
 *
 * ## Why the fallback is not a warning
 *
 * **Because it is the normal path in a test and the degraded one in an old browser, and a
 * function that warns is a function everybody learns to ignore.** Where `Worker` is missing
 * the same `meshForPrint` runs here, synchronously, and the caller cannot tell the
 * difference — which is right, because the only thing it loses is a progress bar that had
 * nowhere to draw and a page that does not repaint for seven seconds.
 *
 * ## Why a worker per export rather than one held open
 *
 * **Because there is nothing to keep.** The mesher holds its scratch in module state, and
 * that state is what makes a worker worth holding — but an export happens once in a while
 * and its mesh is written out and thrown away. A worker per export costs a module load of
 * about a hundred milliseconds and buys back seven seconds of a live page, and holding one
 * open would mean a megabyte of scratch that survives the last export for no reason.
 *
 * ## Why `terminate` runs in a `finally`
 *
 * **Because a refusal is the common failure here.** `printProblem` turns an open-edged mesh
 * into a sentence, and a model that has been scaled past its own resolution comes back with
 * no surface in it — both of which reach here as a normal reply. A worker left running after
 * either is a thread doing nothing for the rest of the session.
 */
import type { MeshResult } from "@big-mesh-studios/meshing";

import type { Part } from "../model/part";
import { meshForPrint } from "./print-mesh";
import type {
  PrintMeshProgress,
  PrintMeshReply,
  PrintMeshRequest,
} from "./print-worker";

/**
 * The mesh a print would be written from, off the main thread where there is one.
 *
 * **Resolves rather than rejects for a model that has nothing in it**, which is `undefined`
 * and is the same answer `meshForPrint` gives; only a worker that fails to start or dies
 * mid-mesh rejects, and both of those are faults rather than answers.
 */
export const meshForPrintOffThread = (
  parts: readonly Part[],
  voxelSize: number,
  onProgress?: PrintMeshProgress,
): Promise<MeshResult | undefined> => {
  if (typeof Worker === "undefined") {
    return Promise.resolve(
      meshForPrint(parts, voxelSize, (done, total) => {
        if (total > 0) onProgress?.(done / total);
      }),
    );
  }

  const worker = new Worker(new URL("./print.worker.ts", import.meta.url), {
    type: "module",
  });

  return new Promise<MeshResult | undefined>((resolve, reject) => {
    const settle = (): void => {
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<PrintMeshReply>): void => {
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
      resolve(reply.result);
    };
    worker.onerror = (event: ErrorEvent): void => {
      settle();
      // **`message` rather than a generic sentence**, because a worker that fails to load its
      // own module reports the reason here and nothing anywhere else will.
      reject(new Error(event.message || "the meshing worker failed"));
    };

    const request: PrintMeshRequest = { parts, voxelSize };
    worker.postMessage(request);
  });
};
