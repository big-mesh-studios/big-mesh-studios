/**
 * The two kinds of file this modeller writes for a slicer.
 *
 * ## Why both, when one of them is better
 *
 * **Because the better one is not always the one the next program opens.** 3MF carries a unit
 * and a colour per corner, which is what a file meant to be printed wants and what every slicer
 * this application targets reads; STL carries triangles and nothing else, but it is the format
 * every tool made in the last thirty years reads, including the ones that never learned 3MF.
 * A model somebody has to convert by hand on a laptop is a model that did not come out of here
 * as far as they are concerned.
 *
 * **The choice is per export rather than a setting**, because it is about where the file is
 * going rather than about this model — the same figure might be printed from a 3MF at home and
 * sent to somebody who can only open an STL.
 */

/** A file a slicer can open. */
export type PrintFormat = "3mf" | "stl";

/** What each format is called, and the extension its file takes. */
export const PRINT_FORMAT_INFO: Record<
  PrintFormat,
  { readonly label: string; readonly extension: string }
> = {
  "3mf": { label: "3MF", extension: ".3mf" },
  stl: { label: "STL", extension: ".stl" },
};

/**
 * Both formats, in the order a choice offers them.
 *
 * **3MF first, because it is the richer file** — the one that keeps the colours the model was
 * painted in — and a list whose first entry is the better default is a list somebody can take
 * the first of without reading the rest.
 */
export const PRINT_FORMATS: readonly PrintFormat[] = ["3mf", "stl"];
