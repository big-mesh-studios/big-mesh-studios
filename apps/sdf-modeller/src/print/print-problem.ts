/**
 * Whether a model can be printed, and what to tell somebody who is about to find out.
 *
 * ## Why this is separate from `export-model`
 *
 * **Because the question is about a mesh and the writing is about a file, and only one of them
 * needs a zip library.** `export-model` reaches `three-mf` and so `jszip`, which is a hundred
 * kilobytes; importing `printProblem` from it to answer a question in a popover would put that
 * hundred kilobytes on the first frame. Splitting them means the interface can say whether a
 * model is printable without the writer in the bundle at all, and the export's chunk stays
 * lazy — which the build says so out loud when it is not.
 *
 * ## Why the answer is a sentence and not a boolean
 *
 * **Because the caller has to show it.** The export throws this string, and the button's
 * `title` is this string, so a person is told the reason the code refused for and there is no
 * second wording to keep in step. A boolean would leave the message to be written twice and
 * would guarantee the two drifted.
 */
import {
  describeReport,
  type MeshReport,
  type MeshResult,
} from "@big-mesh-studios/meshing";

/**
 * How tall a model stands when nobody says otherwise.
 *
 * **A hundred millimetres, and the number is a starting point rather than a decision.** It is
 * roughly the largest thing an FDM machine's bed takes in one go and small enough to print in an
 * evening, which is the range between "too small to see" and "too big to finish" that somebody
 * opening a 3D printer for the first time wants to be inside.
 */
export const DEFAULT_HEIGHT_MM = 100;

/**
 * Why this model cannot be printed, or `undefined` when it can.
 *
 * **Open edges refuse; nothing else does.** A mesh with an edge in one triangle rather than two
 * is not a solid, and a slicer will decide for itself what to do with the hole — which is
 * usually to fill it or to ignore it. ADR 0030 calls a clipped model "the failure most likely to
 * ship". Non-manifold edges, inconsistent winding and degenerate triangles are worse news but
 * not that news: a printer's own slicing and the union of a solid with itself absorb them far
 * more often than they cause a visible fault, and refusing every mesh with one of them would
 * refuse meshes that come out fine.
 *
 * @param result What `meshForPrint` returned.
 */
export const printProblem = (
  result: MeshResult | undefined,
): string | undefined => {
  if (result === undefined) {
    return "this model has nothing in it to print";
  }
  // **`MeshResult.triangles` rather than `report.triangleCount`**, which is the same number by
  // construction and is what `describeReport` reads. Two sources for one fact is a thing to know
  // about rather than to tidy away: a caller reading this should not have to work out which of
  // the two the gate means.
  if (result.triangles === 0) {
    return "this model has no surface in it — nothing to print";
  }
  const { boundaryEdges } = result.report;
  if (boundaryEdges > 0) {
    return `${boundaryEdges} open edge${boundaryEdges === 1 ? "" : "s"} — the model is a lidless shell and will not print as drawn`;
  }
  return undefined;
};

/** What the status line says about a model's printability, next to the export control. */
export const printReadout = (result: MeshResult | undefined): string =>
  result === undefined ? "nothing to print" : describeReport(result.report);

/** A report with some of its numbers changed, which is only ever a test's business. */
export type { MeshReport };
