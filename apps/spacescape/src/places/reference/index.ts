/**
 * The generated place reference, as the `/place:docs` panel reads it.
 *
 * `place-api.json` is drawn by `tools/place-reference.ts` from the sources it describes, and
 * `pnpm place-reference:check` fails when the two drift. Nothing here adds to it: the artifact is
 * the source of truth, and this module only types it so a panel that reads a field the drawing does
 * not carry fails `pnpm check-types` rather than rendering a blank row.
 */
import data from "./place-api.json";
import type { PlaceReference } from "./types";

export * from "./types";

/** The drawing, typed against the shape the generator writes. */
export const placeReference: PlaceReference = data;
