/**
 * Meshing a print off the main thread, and the three messages that cross to do it.
 *
 * ## Why there is a worker at all
 *
 * **Because the finest export is seven and a half seconds of arithmetic, and a page that
 * stops painting for seven and a half seconds reads as a crash rather than as work.** The
 * numbers are measured — at `0.03125` a default model is twelve million field evaluations
 * and about a hundred and seventy-seven thousand triangles — and the main thread is the
 * only thread this application has. Somebody who chooses the fine end is willing to wait;
 * they are not willing to have the interface stop answering while they do.
 *
 * ## Why only the meshing goes across and not the whole export
 *
 * **Because meshing is 95% of the cost and the writer is the rest.** Measured on the same
 * model at `0.03125`: seven and a half seconds to mesh, forty-one milliseconds to reduce the
 * colours and stand the model on the bed, three hundred and ninety-two to write and zip the
 * 3MF. Moving the writer across as well would mean `jszip` in the worker chunk for four
 * percent of the wait, and would make the worker import the module whose whole reason for
 * existing is to keep that library off the first frame.
 *
 * So the worker takes a model and a resolution and gives back a mesh, and the main thread
 * does everything else to it exactly as it did before.
 *
 * ## Why the progress is a fraction rather than a stage name
 *
 * **Because the stage that takes the time is one long loop and a stage name would be a bar
 * that does not move.** `MeshProgress` counts work units across both of the mesher's passes,
 * so what crosses here is a number between nothing and one, and it moves at the rate the
 * arithmetic is going rather than at the rate the stages change.
 *
 * ## Why there is no id and no cancellation
 *
 * **Because an export is one at a time and the control that starts one is disabled while it
 * runs.** A protocol with request ids is a protocol that can interleave two requests, and
 * this one cannot: the export button is `disabled` on `busy`, and `attempt` in `app.tsx`
 * serialises the file operations that could start a second. What is here is the smallest
 * thing that can carry a model and come back with a mesh.
 */
import type { MeshResult } from "@big-mesh-studios/meshing";

import type { Part } from "../model/part";
import { meshForPrint } from "./print-mesh";

/** What the main thread asks a worker for. */
export interface PrintMeshRequest {
  /** The model as it is at the moment the export was pressed. */
  readonly parts: readonly Part[];
  /** How finely to mesh it, in world units a sample. */
  readonly voxelSize: number;
}

/**
 * What a worker says back.
 *
 * **Three kinds rather than a result and an error channel**, because the failure here is
 * not exceptional: `meshForPrint` returns `undefined` for a model with nothing in it, which
 * is a normal answer that the print gate then turns into a sentence. A discriminated union
 * says which is which without either side guessing.
 */
export type PrintMeshReply =
  | { readonly kind: "progress"; readonly fraction: number }
  | { readonly kind: "mesh"; readonly result: MeshResult | undefined }
  | { readonly kind: "failed"; readonly reason: string };

/**
 * How far a mesh has got, as a fraction from nothing to one.
 *
 * **A fraction here and a work count in `MeshProgress`,** because they are for different
 * readers: the mesher's two passes are different sizes and the mesher is the only thing that
 * knows both of them, while everything past the `postMessage` wants a number it can hand
 * straight to a `<progress>`.
 */
export type PrintMeshProgress = (fraction: number) => void;

/**
 * The worker's half, and the only part of this file worth testing.
 *
 * **`post` is a parameter rather than the global so that this loads in a test.** Everything
 * here is then a function of its arguments, and `print.worker.ts` is the four lines that
 * wire `self.onmessage` and `self.postMessage` into them.
 */
export const runPrintMesh = (
  request: PrintMeshRequest,
  post: (reply: PrintMeshReply) => void,
): void => {
  try {
    const result = meshForPrint(
      request.parts,
      request.voxelSize,
      (done, total) => {
        if (total > 0) post({ kind: "progress", fraction: done / total });
      },
    );
    post({ kind: "mesh", result });
  } catch (reason) {
    // **A thrown error is turned into a message rather than left to become an `error` event.**
    // An uncaught throw in a worker surfaces as `onerror` on the main thread with the file
    // and line but no message a person can act on, and the one thing that goes wrong in a
    // print this expensive is worth saying.
    post({
      kind: "failed",
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  }
};
