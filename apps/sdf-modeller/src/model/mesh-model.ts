/**
 * This application's half of turning a document into triangles.
 *
 * ## Why there is a module here at all
 *
 * **The meshing itself is not in this application.** `@big-mesh-studios/meshing`'s
 * `model-mesh.ts` takes a list of `Operation`s and returns a mesh, and it is what the
 * viewport, the export and the print path all use. `apps/spacescape` uses the same
 * functions, on models a place script stands in its world rather than on a document
 * anybody is editing — which is the point of moving them, rather than a second copy.
 *
 * What stays here is the one step that is this application's: **a `Part` is not an
 * `Operation`.** A part carries an id, an optional colour and a decision about which
 * mesher it was last looked at with; an operation carries a position in a fold. The
 * conversion is where three of those differences have to be settled, and each is a
 * decision rather than a mechanical mapping — so it is written out, once, here.
 *
 * ## The three decisions
 *
 * 1. **The list order is the fold order, and that now means something.** With every part
 *    an `Add` the fold came out the same however the list was arranged, so a part's
 *    position was bookkeeping. A `Subtract` in the list makes it not: `A`, `B`, then a
 *    difference of `C` is a different solid from the same three parts in another order,
 *    and nothing recovers which was meant. So the indices are the parts' positions
 *    deliberately, and reordering a model is editing it.
 * 2. **`Paint` is deliberately not reachable.** It adds no material — it only colours — and
 *    a part's colour counts whatever its boolean is, so a coloured `Add` already covers it.
 *    Mapping it would offer a mode that does strictly less than `Add`.
 * 3. **Colour and opacity together or neither.** An opacity with no colour is a number
 *    nothing reads, so it is not passed — which keeps `Operation.colour` the single thing
 *    that decides whether a part has an appearance of its own.
 */

import { makeOperation, type Operation } from "@big-mesh-studios/csg";
import {
  budgetFor,
  DEFAULT_BUDGET,
  DEFAULT_MESH_MODE,
  meshModel,
  meshRegion,
  MESH_MODES,
  operationsField,
  primitiveMesh,
  releaseScratch,
  RESOLUTIONS,
  samplesFor,
} from "@big-mesh-studios/meshing";
import type {
  MeshBudget,
  MeshMode,
  MeshResult,
} from "@big-mesh-studios/meshing";

import type { Part } from "./part";

export {
  DEFAULT_BUDGET,
  DEFAULT_MESH_MODE,
  MESH_MODES,
  RESOLUTIONS,
  budgetFor,
  meshModel,
  meshRegion,
  operationsField,
  primitiveMesh,
  releaseScratch,
  samplesFor,
};
export type { MeshBudget, MeshMode, MeshResult };

/**
 * A document's parts as CSG operations, one per part, in list order.
 *
 * **The list order is the fold order — see the note at the top of this file**, which is
 * about why `Subtract` makes it load-bearing rather than incidental. Every consumer of a
 * document's geometry goes through here, so there is one answer to "in what order does
 * this model fold" rather than one per caller.
 */
export const partsToOperations = (parts: readonly Part[]): Operation[] =>
  parts.map((part, index) =>
    makeOperation(index, part.origin, part.shape, part.combine, {
      orientation: part.orientation,
      softness: part.softness,
      // **Both or neither**, for the reason at the top of this file.
      ...(part.colour === undefined
        ? {}
        : { colour: part.colour, opacity: part.opacity ?? 1 }),
    }),
  );

/**
 * Meshes one part on its own, for a drag ghost.
 *
 * **`primitiveMesh` over a one-part conversion, and the difference matters.** A lone
 * `Subtract` folded against a base of `Infinity` comes out as nothing at all, so a preview
 * of a difference would be an empty scene — which is a very confusing thing to show somebody
 * who is dragging it somewhere. `primitiveMesh` forces `Add` and a hard edge, which gives
 * the primitive's own surface: the shape that is going somewhere, rather than the effect it
 * currently has on the model.
 */
export const primitivePartMesh = (
  part: Part,
  budget: MeshBudget = DEFAULT_BUDGET,
): MeshResult | undefined =>
  primitiveMesh(partsToOperations([part])[0]!, budget);

/**
 * Meshes a document, which is `meshModel` over `partsToOperations`.
 *
 * **A separate name rather than a defaulted parameter**, because the two calls that differ
 * are both in this application and both would otherwise read as `meshModel(parts)` at one
 * and `meshModel(operations)` at the other — which is a difference in what is being
 * meshed that no type can state, since a `Part` and an `Operation` are structurally
 * similar enough that passing the wrong one is not error at compile time.
 */
export const meshParts = (
  parts: readonly Part[],
  budget: MeshBudget = DEFAULT_BUDGET,
  mode: MeshMode = DEFAULT_MESH_MODE,
): MeshResult | undefined => meshModel(partsToOperations(parts), budget, mode);
