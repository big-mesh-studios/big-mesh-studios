/**
 * The mesh a print is written from, at a resolution somebody chose.
 *
 * ## Why this is its own file and not `printedMesh` in `print-problem`
 *
 * **Because it is the one thing the worker runs, and a worker cannot import a module that
 * imports `jszip`.** `export-model` reaches the 3MF writer and so a hundred kilobytes of
 * zip; `print-problem` does not. Putting the mesh here means the worker pulls in the mesher
 * and the field and nothing else, and the writer stays on the main thread where it costs
 * four hundred milliseconds rather than ten seconds.
 *
 * ## Why the mesher is marching cubes whichever way the viewport is set
 *
 * **Because a guarantee beats an observation on the one path where "closed where it happens
 * to be resolved" is not good enough.** ADR 0030's reason, and `printProblem` refuses a mesh
 * with an edge in one triangle. There is no mode argument here to get wrong.
 */
import type { MeshProgress, MeshResult } from "@big-mesh-studios/meshing";

import { meshParts } from "../model/mesh-model";
import type { Part } from "../model/part";
import { printBudgetFor } from "./print-budget";

/**
 * The mesh a model would be printed from at `voxelSize`, or `undefined` when it has nothing
 * to mesh.
 *
 * **`voxelSize` in world units rather than a `MeshBudget`**, because a budget is the answer
 * to a question about a model and this is the question — the only thing a caller of the print
 * path has an opinion about is how fine. `printBudgetFor` is where the export's own ceiling
 * goes, so there is no way to reach this function and accidentally mesh at the viewport's.
 */
export const meshForPrint = (
  parts: readonly Part[],
  voxelSize: number,
  onProgress?: MeshProgress,
): MeshResult | undefined =>
  meshParts(parts, printBudgetFor(voxelSize), "marching-cubes", onProgress);
