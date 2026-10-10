/**
 * How finely the export meshes, and what that will cost before anybody commits to it.
 *
 * ## Why this is a module rather than two constants in `print-problem`
 *
 * **Because there are now three questions here and only one of them is "can this be
 * printed".** `print-problem` answers that, in a sentence, from a mesh it is handed. This
 * answers "how finely", "is that legal" and "what will it cost" — and the middle one is a
 * value the interface has to draw a number field around, which the print gate never does.
 *
 * ## Why the export has a higher ceiling than the viewport, and it is the important number
 *
 * **`PRINT_MAX_SAMPLES_PER_AXIS` is what a resolution setting actually means.** `samplesFor`
 * asks for `longestAxis / voxelSize` and clamps it, so a voxel size on its own is a request
 * rather than an answer — and for any model bigger than `voxelSize · 96` the viewport's own
 * ceiling quietly answers "no" and meshes it coarsely instead. Nobody is told. A prop twenty
 * units long at the finest setting the viewport offers gets a hundred samples and looks fine.
 *
 * That is the right trade for a rebuild that has to land while a finger is down, and it is
 * the wrong trade for a file going to a slicer, which is why the export carries its own
 * ceiling rather than a finer voxel size on the same budget.
 *
 * **Two hundred and fifty-six rather than "as fine as asked", because a ceiling is what makes
 * the number field safe.** Measured on this application's default model at 256 samples a side
 * — the worst case any model can now reach — the mesh is about sixteen million samples,
 * eleven seconds and five hundred megabytes. At 512 it is a hundred and thirty million
 * samples and two and a half gigabytes, which is a tab a phone kills outright with the model
 * still unsaved in it. A cap turns "how fine can you make this" from a question with a
 * crash at the end of it into a question with a fixed worst case.
 *
 * ## The two ends of the range, and which one is the default
 *
 * **The default is `0.0625` — the viewport's own finest — and the fine end is half of it.**
 *
 * The export used to be `0.125`, which on a default model is fifty-five samples across the
 * longest axis and about nine thousand triangles. Measured against the alternatives on that
 * same model:
 *
 * ```text
 *   voxel   samples   triangles   time      peak RSS
 *   0.25    26        1,752       0.08 s      93 MB
 *   0.125   55        9,264       0.16 s     103 MB    the old export
 *   0.0625  113       42,112      1.1 s      188 MB    the default now
 *   0.03125 228       177,056     7.5 s      439 MB    the fine end
 *   0.02    361       450,308     37.6 s   1,101 MB    past it, and the reason there is a cap
 * ```
 *
 * So `0.0625` is four and a half times the triangles of `0.125` for a second, which is the
 * difference between a file with visible facets on a curve and one without — and it is the
 * resolution somebody has already looked at by dragging the viewport slider to the end,
 * which is the point: the finest preview and the default print are the same mesh.
 *
 * **`0.03125` is the fine end because it is twice the viewport's finest, and it costs seven
 * and a half seconds.** Somebody who is about to print rather than about to look will wait
 * for that, and the worker means waiting is not the same as watching a frozen page. It is
 * seventeen thousand more triangles per unit of model, which on a figure is the difference
 * between a curve and a smooth curve.
 *
 * **And `0.015625` is offered as the floor rather than hidden**, even though the cap makes
 * it produce the same file as anything coarser on any model over two units long. A control
 * that silently ignores what somebody typed into it is worse than one that says what it did,
 * and `printEstimate` says what it did — which is why the floor can be honest about being
 * past the point where more digits buy anything.
 */
import type { MeshBudget } from "@big-mesh-studios/meshing";

import { budgetFor, meshRegion, partsToOperations } from "../model/mesh-model";
import type { Part } from "../model/part";

/**
 * The most samples the export will take on any one axis, whatever voxel size is asked for.
 *
 * **Two hundred and fifty-six, and the reasoning is the module's own header.** It is the
 * number that bounds an export's memory and time rather than the voxel size, and it is
 * raised rather than derived: `DEFAULT_BUDGET`'s ninety-six is a rebuild deadline and this is
 * a one-off somebody is watching a progress bar for.
 */
export const PRINT_MAX_SAMPLES_PER_AXIS = 256;

/** How finely the export meshes when nobody says otherwise, in world units a sample. */
export const DEFAULT_PRINT_VOXEL_SIZE = 0.0625;

/** The finest the export will mesh at, which is half the viewport's own finest. */
export const MAX_PRINT_VOXEL_SIZE = 0.03125;

/** The finest number the control accepts, which the cap makes the practical end of the range. */
export const MIN_PRINT_VOXEL_SIZE = 0.015625;

/**
 * The settings the export offers, finest first — the order a control wants them in.
 *
 * **A list, and not a slider over the interval between the ends.** Same reason
 * `RESOLUTIONS` is a list: the cost is cubic in the reciprocal, so the middle of a slider's
 * travel is a ratio nobody can predict. Here the list is also what the number field's
 * `min`/`max`/`step` are derived from, which is one list rather than five literals.
 */
export const PRINT_RESOLUTIONS = [
  MIN_PRINT_VOXEL_SIZE,
  MAX_PRINT_VOXEL_SIZE,
  DEFAULT_PRINT_VOXEL_SIZE,
] as const;

/**
 * The budget for one of `PRINT_RESOLUTIONS`, with the export's own ceiling on samples.
 *
 * **`budgetFor` from the meshing package rather than spreading `DEFAULT_BUDGET` here**,
 * because that is what it is for and a second spread of the same object is a place the
 * `minSamplesPerAxis` floor could be quietly changed without the viewport changing with it.
 */
export const printBudgetFor = (voxelSize: number): MeshBudget => ({
  ...budgetFor(voxelSize),
  maxSamplesPerAxis: PRINT_MAX_SAMPLES_PER_AXIS,
});

/**
 * Whether a typed voxel size is one this export will mesh at.
 *
 * **A range rather than membership of `PRINT_RESOLUTIONS`, because the field is a number
 * and a person may reasonably type a value between two of the offered ones.** The list is
 * what the arrows step through; it is not what the field is allowed to hold.
 *
 * **Zero, negatives, `NaN` and `Infinity` all fail the range check**, which is the whole of
 * why this is a range rather than `voxelSize > 0`: `NaN` fails every comparison, so it needs
 * no case of its own and cannot slip through the other half.
 */
export const printVoxelSizeIn = (text: string): number | undefined => {
  const value = Number(text);
  return printVoxelSizeOk(value) ? value : undefined;
};

/** Whether `value` is a voxel size this export will mesh at. See `printVoxelSizeIn`. */
export const printVoxelSizeOk = (value: number): boolean =>
  Number.isFinite(value) &&
  value >= MIN_PRINT_VOXEL_SIZE &&
  value <= DEFAULT_PRINT_VOXEL_SIZE;

/** What a print at a given resolution will cost, worked out without meshing anything. */
export interface PrintEstimate {
  /** The voxel size that was asked for. */
  readonly voxelSize: number;
  /** Samples a side, which is what the cap actually decided. */
  readonly samples: number;
  /** The spacing the mesh came out at, which is `voxelSize` unless the cap said otherwise. */
  readonly sampleSize: number;
  /** Roughly how many triangles a mesh of this many samples a side carries. */
  readonly triangles: number;
  /** Roughly how long it takes, in seconds. */
  readonly seconds: number;
  /** Whether the cap answered instead of the voxel size. */
  readonly capped: boolean;
}

/**
 * Triangles per sample squared, measured rather than guessed.
 *
 * **Because a mesh's triangle count goes with its surface area and not its volume**, so it
 * scales with `samples²` — the difference between the 256 cap costing 2.3× the work of 228
 * samples and costing 1.3× the triangles. Fitting the measured points gives 3.4 within about
 * a tenth across a 40× range of sizes, which is close enough to be worth showing and is the
 * reason the estimate says "about".
 *
 * ```text
 *   samples    measured    3.4·s²
 *   26         1,752       2,298
 *   55         9,264       10,285
 *   113        42,112      43,408
 *   179        108,016     108,966
 *   228        177,056     176,738
 *   286        280,892     278,082
 *   361        450,308     443,016
 * ```
 */
const TRIANGLES_PER_SAMPLE_SQUARED = 3.4;

/**
 * Seconds a field evaluation takes, on the machine these numbers were measured on.
 *
 * **Six hundred nanoseconds, and it is linear in the sample count** — the dominant cost is
 * the sampling pass and it is a field evaluation per sample, so there is nothing to curve
 * here. The spread across the measured range is 6.0 to 8.3, so 6.5 is near the optimistic
 * end and the display rounds generously.
 *
 * **It is a property of the device, not of this code**, and a desktop is several times
 * quicker. That is why `describePrintEstimate` says "about" and why the seconds are the last
 * thing in the sentence rather than the first: they are for telling a one-second print from
 * a ten-second one, not for planning a print run.
 */
const SECONDS_PER_SAMPLE = 6.5e-7;

/**
 * What a print of these parts at this resolution will cost, or `undefined` for a model with
 * nothing in it.
 *
 * **Through `meshRegion` rather than through `samplesFor` and `modelBounds`**, because
 * `meshRegion` is the function the export itself calls and it pads the model's bounds by a
 * sample before sampling them. An estimate computed from unpadded bounds is off by two
 * voxels of region at every size, which at the fine end is a different triangle count from
 * the one the file is about to have.
 *
 * **It is cheap rather than free** — a BVH build and a bounds walk, no sampling — so this
 * runs on every keystroke in the resolution field without being noticed.
 */
export const printEstimate = (
  parts: readonly Part[],
  voxelSize: number,
): PrintEstimate | undefined => {
  const region = meshRegion(
    partsToOperations(parts),
    printBudgetFor(voxelSize),
  );
  if (region === undefined) return undefined;
  const samples = region.samples;
  // **The sample grid is two larger than the region**, which is how both meshers allocate it
  // and therefore how many field evaluations there are — `MeshResult.samples` says the same.
  const voxels = (samples + 2) ** 3;
  return {
    voxelSize,
    samples,
    sampleSize: region.sampleSize,
    triangles: Math.round(TRIANGLES_PER_SAMPLE_SQUARED * samples * samples),
    seconds: voxels * SECONDS_PER_SAMPLE,
    // **A spacing coarser than the one asked for is the cap answering, and nothing else
    // can make it so.** `samplesFor` only ever rounds `asked` *up*, so an uncapped model
    // comes out at `longest / ceil(longest / voxelSize)`, which is never above `voxelSize`.
    capped: region.sampleSize > voxelSize,
  };
};

/**
 * What the resolution control says underneath itself.
 *
 * **Samples, triangles and seconds, in that order, because they are what the three
 * questions are in the order somebody asks them.** How fine, how big a file, how long a wait.
 *
 * **The cap is stated rather than hidden**, because a model too big to mesh at the setting
 * asked for is the one case where the number somebody typed is not the number they get, and
 * it is silent in every other layer — `samplesFor` clamps and says nothing.
 */
export const describePrintEstimate = (estimate: PrintEstimate): string => {
  const { samples, triangles, seconds } = estimate;
  const parts = [
    `${samples} samples across`,
    `about ${countOf(triangles)} triangles`,
    estimate.capped
      ? `about ${describeSeconds(seconds)}, capped at ${PRINT_MAX_SAMPLES_PER_AXIS}`
      : `about ${describeSeconds(seconds)}`,
  ];
  return parts.join(" · ");
};

/** `42,112` as `42k`, matching the status line's own shorthand for the same quantity. */
const countOf = (count: number): string =>
  count < 1000 ? String(count) : `${Math.round(count / 1000)}k`;

/**
 * A duration as a number with one decimal until it stops mattering.
 *
 * **Tenths of a second below ten seconds and fives above**, because the two ends of this range
 * are being read for different things. Somebody choosing between `0.2 s` and `1 s` is deciding
 * whether to wait at all, and "0 s" or a rounded "about 2 s" would both be worse than useless;
 * somebody choosing between eight and eleven seconds has already committed and is deciding
 * whether to go and make a coffee, where the tenth is noise.
 *
 * **`0.1` as the floor rather than zero**, because a model small enough to mesh in under a
 * tenth of a second is still not a print that takes no time, and "about 0 s" reads as a
 * failure of the estimate rather than as a fast one.
 */
const describeSeconds = (seconds: number): string =>
  seconds < 10
    ? `${Math.max(0.1, Math.round(seconds * 10) / 10)} s`
    : `${Math.round(seconds / 5) * 5} s`;
