import { describe, expect, it } from "vitest";

import { budgetFor, meshParts, type MeshResult } from "../model/mesh-model";
import { placedPart } from "../model/part";
import {
  DEFAULT_PRINT_VOXEL_SIZE,
  MAX_PRINT_VOXEL_SIZE,
  PRINT_MAX_SAMPLES_PER_AXIS,
  printBudgetFor,
} from "./print-budget";
import { meshForPrint } from "./print-mesh";
import { printProblem } from "./print-problem";

/** A capsule standing on the origin, which is the smallest thing that reads as a figure. */
const body = () =>
  placedPart(
    "body",
    { type: "Capsule", len: 2, radius: 0.7 },
    { x: 0, y: 1, z: 0 },
  );

/**
 * A mesh of these parts, or a thrown error.
 *
 * **So a test can state a fact about the model rather than about a nullable result.** Every
 * assertion here is about a model that exists; `meshForPrint` returning `undefined` is tested
 * once, on its own.
 */
const meshOf = (
  parts: ReturnType<typeof placedPart>[],
  voxelSize = DEFAULT_PRINT_VOXEL_SIZE,
): MeshResult => {
  const result = meshForPrint(parts, voxelSize);
  if (result === undefined) throw new Error("this model meshed to nothing");
  return result;
};

describe("meshForPrint", () => {
  it("comes back closed, which is the whole reason the export re-meshes", () => {
    // **The gate depends on this and nothing else does.** `printProblem` looks at
    // `report.boundaryEdges`, so a mesh that is not watertight here is a model the export will
    // refuse — and ADR 0030's reason for preferring marching cubes is that it is closed at
    // every resolution rather than closed-where-resolved.
    //
    // **Measured, and worth saying plainly: at print resolution surface nets closed every
    // model tried here too**, so this is a guarantee rather than an observed rescue. The
    // choice does not rest on the preview failing today; it rests on not having to know whether
    // it will.
    const printed = meshOf([body()]);

    expect(printed.report.boundaryEdges).toBe(0);
    expect(printed.report.watertight).toBe(true);
    expect(printProblem(printed)).toBeUndefined();
  });

  it("holds a subtraction closed, which is where a boolean makes a hole", () => {
    // **A difference is the case that matters and it is not the same as a union.** A `Subtract`
    // introduces a surface with nothing behind it, so a mesher that leaves an edge in one
    // triangle leaves the rim of the cut open.
    const carved = [
      placedPart(
        "block",
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        { x: 0, y: 1, z: 0 },
      ),
      placedPart(
        "bore",
        { type: "Cylinder", len: 2, radius: 0.35 },
        { x: 0, y: 1, z: 0 },
        { combine: "Subtract" },
      ),
    ];

    expect(meshOf(carved).report.watertight).toBe(true);
  });

  it("meshes finer than the viewport's default, because a print is not a preview", () => {
    // **A resolution chosen for the destination.** `0.25` is what the screen rebuilds at so a
    // rebuild lands while a finger is down; a file going to a printer is not that, and this is
    // the measurable consequence.
    expect(DEFAULT_PRINT_VOXEL_SIZE).toBeLessThan(budgetFor(0.25).voxelSize);

    const coarse = meshParts([body()], budgetFor(0.25), "marching-cubes");

    expect(meshOf([body()]).triangles).toBeGreaterThan(coarse?.triangles ?? 0);
  });

  it("meshes twice as finely again when asked, which is the whole point of the control", () => {
    // **The fine end doubles the samples on every axis, which is eight times the work** — and
    // on a model of this size the cap is nowhere near it, so this is the setting actually
    // taking effect rather than a number being quietly clamped back to the default.
    //
    // Measured on this model: 113 samples a side and 42,112 triangles at the default, 228 and
    // 177,056 at the fine end. Twice the samples a side is about four times the triangles,
    // because a mesh's triangle count goes with its surface area and not its volume.
    //
    // **Sixty seconds, because this is the only test in the repository that meshes at the
    // export's fine end** and it takes about eight on a phone. Everything else here works at
    // the default, which is a second.
    const fine = meshOf([body()], MAX_PRINT_VOXEL_SIZE);
    const coarse = meshOf([body()]);

    expect(fine.region.samples).toBeGreaterThan(coarse.region.samples * 2 - 4);
    expect(fine.triangles).toBeGreaterThan(coarse.triangles * 3);
  }, 60_000);

  it("has nothing to say about a model with no parts", () => {
    expect(meshForPrint([], DEFAULT_PRINT_VOXEL_SIZE)).toBeUndefined();
  });

  it("tells a caller watching a progress bar that it finished", () => {
    // **The progress callback's contract is that `done` reaches `total`, once.** That is what
    // lets the export's worker send a final fraction rather than the bar stalling at 99% — so
    // it is the one property worth pinning here, and the fact that it moves at all comes from
    // the meshing package's own test.
    const fractions: number[] = [];
    meshForPrint([body()], DEFAULT_PRINT_VOXEL_SIZE, (done, total) => {
      fractions.push(done / total);
    });

    expect(fractions.length).toBeGreaterThan(1);
    expect(fractions.at(-1)).toBe(1);
    // **Monotone, because a bar that goes backwards is worse than no bar.**
    expect(
      fractions.every((at, i) => i === 0 || at >= (fractions[i - 1] as number)),
    ).toBe(true);
  });
});

describe("printBudgetFor", () => {
  it("raises the ceiling on samples, which is what a resolution setting means", () => {
    // **The clamp is the feature for a rebuild and the bug for a print.** `samplesFor` asks for
    // `longestAxis / voxelSize` and clamps at `maxSamplesPerAxis`, so at the viewport's own 96 a
    // model twenty units long is meshed coarsely at *every* setting and says nothing — the
    // number on the slider becomes a request that is silently refused.
    //
    // A twenty-unit model at the export's default asks for 322 samples. At 96 it would get a
    // third of them; at `PRINT_MAX_SAMPLES_PER_AXIS` it gets all of them.
    const budget = printBudgetFor(DEFAULT_PRINT_VOXEL_SIZE);

    expect(budget.maxSamplesPerAxis).toBe(PRINT_MAX_SAMPLES_PER_AXIS);
    expect(budget.maxSamplesPerAxis).toBeGreaterThan(
      budgetFor(DEFAULT_PRINT_VOXEL_SIZE).maxSamplesPerAxis,
    );
    expect(budget.voxelSize).toBe(DEFAULT_PRINT_VOXEL_SIZE);
  });

  it("keeps the floor on samples a side, so a tiny model is still a solid", () => {
    expect(printBudgetFor(DEFAULT_PRINT_VOXEL_SIZE).minSamplesPerAxis).toBe(
      budgetFor(DEFAULT_PRINT_VOXEL_SIZE).minSamplesPerAxis,
    );
  });

  it("holds the worst case to a cost a phone survives", () => {
    // **The reason the cap exists, and the reason it is a number rather than a phrase.**
    // Measured on a phone-class machine at 256 samples a side — the most any model can now ask
    // for — meshing is about sixteen million samples, eleven seconds and five hundred megabytes.
    // At 512 it is a hundred and thirty million and two and a half gigabytes, which is a tab
    // the browser kills with the model still unsaved in it.
    const voxels = (PRINT_MAX_SAMPLES_PER_AXIS + 2) ** 3;

    expect(voxels).toBeLessThan(20_000_000);
  });
});
