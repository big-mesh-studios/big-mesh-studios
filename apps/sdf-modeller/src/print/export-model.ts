/**
 * The way out: a model as a file a slicer opens.
 *
 * ## What this file is for
 *
 * `../print/print-problem` answers whether a model can be printed and this writes it. They are
 * separate modules because only one of them needs a zip library: importing the gate through this
 * one would put `jszip` on the first frame, and the build says so out loud when it is not.
 *
 * ## Why the export re-meshes rather than using what is on screen
 *
 * **Because the mesh on screen is not the mesh being printed.** The viewport's resolution is
 * chosen so a rebuild arrives while a finger is still down (see `../model/mesh-model`), which
 * is the coarsest thing the application ever does on purpose. Printing at that resolution would
 * print the coarse one, and would print it silently.
 *
 * So the export meshes again, through `meshForPrintOffThread`, which is marching cubes at
 * whatever resolution this export was asked for. The scratch is the held one `meshModel`
 * already keeps, so this costs no allocation the viewport has not already paid for.
 *
 * ## Why the meshing is asked for and not waited on here
 *
 * **Because it is up to seven and a half seconds and this function is on the main thread.**
 * `meshForPrintOffThread` hands the work to a worker and calls back with progress, so the
 * interface keeps answering while the finest resolution is being meshed. See
 * `./print-mesh-client` for what does and does not go across.
 */
import type { RGBA } from "@big-mesh-studios/core";

import type { Part } from "../model/part";
import { DEFAULT_MAX_COLOURS, quantiseColours } from "./quantise";
import { printProblem } from "./print-problem";
import { meshForPrintOffThread } from "./print-mesh-client";
import { DEFAULT_PRINT_VOXEL_SIZE } from "./print-budget";
import type { PrintMeshProgress } from "./print-worker";
import { standOnBed } from "./stand";
import {
  encodeThreeMf,
  type PrintSolid,
  type ThreeMfOptions,
} from "./three-mf";

/** What a caller chooses about a print; everything else is derived from the model. */
export interface PrintOptions {
  /** How tall the model should stand, in millimetres. */
  readonly heightMm?: number;
  /** The most colours the destination printer can hold. */
  readonly maxColours?: number;
  /**
   * How finely to mesh it, in world units a sample.
   *
   * **A number and not a `MeshBudget`,** because the export's own ceiling on samples is part of
   * what "a print" means — see `./print-budget`. A caller who could pass a budget could drop
   * the cap and mesh a model at a cost that kills the tab.
   */
  readonly voxelSize?: number;
  /** The name a slicer shows the file under. */
  readonly title?: string;
  /** A picture of the model as a PNG. */
  readonly thumbnail?: Uint8Array;
  /** Told how far the meshing has got, where somebody is waiting to see it. */
  readonly onProgress?: PrintMeshProgress;
}

/** The name a model with no name of its own is written under. */
const DEFAULT_TITLE = "sdf-modeller model";

/**
 * The mesh as the one solid a 3MF file holds, and the palette its slots name.
 *
 * **Both, together, because the two cannot be separated.** A slot in the solid is an index into
 * the palette that came out of the same reduction, and handing a caller the solid without the
 * palette would mean it had to run the reduction a second time to find out what slot three
 * means.
 */
export const printedSolidOf = (
  result: NonNullable<Awaited<ReturnType<typeof meshForPrintOffThread>>>,
  heightMm: number,
  maxColours: number,
  name: string = DEFAULT_TITLE,
): { solid: PrintSolid; palette: readonly RGBA[] } => {
  const { positions, indices, colours, vertexCount } = result.mesh;
  const reduced = quantiseColours(colours, indices, maxColours);
  return {
    solid: {
      name,
      vertices: standOnBed(positions, vertexCount, heightMm),
      indices,
      colours: reduced.slots,
    },
    palette: reduced.palette,
  };
};

/**
 * The model as the bytes of a `.3mf`.
 *
 * @throws with the reason from `printProblem`, which is the same sentence the export control
 * was disabled with.
 */
export const exportThreeMf = async (
  parts: readonly Part[],
  options: PrintOptions = {},
): Promise<Blob> => {
  const heightMm = options.heightMm ?? 100;
  const maxColours = options.maxColours ?? DEFAULT_MAX_COLOURS;
  const title = options.title;

  const result = await meshForPrintOffThread(
    parts,
    options.voxelSize ?? DEFAULT_PRINT_VOXEL_SIZE,
    options.onProgress,
  );
  const problem = printProblem(result);
  if (problem !== undefined) {
    throw new Error(problem);
  }
  // Narrowed by `printProblem`, which is the only thing that could have refused.
  const mesh = result as NonNullable<typeof result>;

  const { solid, palette } = printedSolidOf(
    mesh,
    heightMm,
    maxColours,
    title ?? DEFAULT_TITLE,
  );

  const written: ThreeMfOptions = {
    ...(title === undefined ? {} : { title }),
    ...(options.thumbnail === undefined
      ? {}
      : { thumbnail: options.thumbnail }),
  };

  return encodeThreeMf([solid], palette, written);
};

export { DEFAULT_HEIGHT_MM } from "./print-problem";
export { DEFAULT_PRINT_VOXEL_SIZE } from "./print-budget";
