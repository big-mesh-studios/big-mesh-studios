import { describe, expect, it } from "vitest";

import { budgetFor, meshParts, samplesFor } from "../model/mesh-model";
import { placedPart, type Part } from "../model/part";
import {
  DEFAULT_PRINT_VOXEL_SIZE,
  MAX_PRINT_VOXEL_SIZE,
  MIN_PRINT_VOXEL_SIZE,
  PRINT_RESOLUTIONS,
  describePrintEstimate,
  printBudgetFor,
  printEstimate,
  printVoxelSizeIn,
  printVoxelSizeOk,
} from "./print-budget";

/** A capsule standing on the origin, which is the smallest thing that reads as a figure. */
const body = () =>
  placedPart(
    "body",
    { type: "Capsule", len: 2, radius: 0.7 },
    { x: 0, y: 1, z: 0 },
  );

/**
 * A model a given many world units long.
 *
 * **Spheres in a row rather than one big sphere**, so the model's longest axis is a length a
 * test can state exactly. What matters to `samplesFor` is `longest`, and three spheres side by
 * side gives three times the diameter whatever the capsules do.
 */
const modelLong = (worldUnits: number): Part[] => [
  placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
  placedPart("b", { type: "Sphere", radius: 1 }, { x: worldUnits, y: 0, z: 0 }),
];

describe("the range a print will mesh at", () => {
  it("defaults to the viewport's own finest, so a max-detail preview is what prints", () => {
    // **The reason the default is `0.0625` and not something between it and the old `0.125`.**
    // Somebody who has dragged the resolution slider to the end has seen this mesh; making it
    // the default is what makes the file match the approval rather than merely resemble it.
    //
    // Measured on the default model: 42,112 triangles at `0.0625` against 9,264 at the old
    // `0.125`, for 1.1 seconds against 0.16.
    expect(DEFAULT_PRINT_VOXEL_SIZE).toBe(0.0625);
  });

  it("goes twice as fine again at the fine end", () => {
    // **Twice the viewport's finest `RESOLUTIONS` offers**, which is what was asked for, and
    // it costs seven and a half seconds and four hundred megabytes on the default model.
    expect(MAX_PRINT_VOXEL_SIZE).toBe(0.03125);
    expect(MAX_PRINT_VOXEL_SIZE).toBeLessThan(DEFAULT_PRINT_VOXEL_SIZE);
  });

  it("offers a floor, so the field's arrows have somewhere to stop", () => {
    expect(MIN_PRINT_VOXEL_SIZE).toBeLessThan(MAX_PRINT_VOXEL_SIZE);
    expect(new Set(PRINT_RESOLUTIONS).size).toBe(PRINT_RESOLUTIONS.length);
    for (const size of PRINT_RESOLUTIONS) {
      expect(printVoxelSizeOk(size)).toBe(true);
    }
  });
});

describe("printVoxelSizeIn", () => {
  it("takes anything in the range, not only the three that are offered", () => {
    // **A range rather than membership of the list**, because the field is a number and a
    // person may reasonably type a value between two of the offered ones. The list is what the
    // arrows step through; it is not what the field is allowed to hold.
    expect(printVoxelSizeIn("0.04")).toBe(0.04);
    expect(printVoxelSizeIn("0.05")).toBe(0.05);
    expect(printVoxelSizeIn(String(DEFAULT_PRINT_VOXEL_SIZE))).toBe(
      DEFAULT_PRINT_VOXEL_SIZE,
    );
  });

  it("refuses the ends of the range and everything past them", () => {
    expect(printVoxelSizeIn("0.015")).toBeUndefined();
    expect(printVoxelSizeIn("0.1")).toBeUndefined();
  });

  it("refuses the numbers that are not numbers", () => {
    // **`NaN` fails every comparison**, which is the whole of why the range check needs no case
    // of its own and cannot be got wrong by a later change to the bounds.
    for (const text of [
      "",
      " ",
      "abc",
      "0",
      "-0.01",
      "Infinity",
      "-Infinity",
    ]) {
      expect(printVoxelSizeIn(text), text).toBeUndefined();
    }
  });
});

describe("printEstimate", () => {
  it("says what a resolution will cost without meshing anything", () => {
    const estimate = printEstimate([body()], DEFAULT_PRINT_VOXEL_SIZE);

    expect(estimate).toBeDefined();
    // **The sample count is the one thing the field cannot show on its own**, because it
    // depends on the model: a model twice as long wants twice the samples for the same number.
    expect(estimate?.samples).toBe(113);
    expect(estimate?.capped).toBe(false);
  });

  it("agrees with the mesh the export will actually build", () => {
    // **The estimate is only worth showing if it is the same number the file will have.** It
    // goes through `meshRegion` rather than through `modelBounds` for exactly this reason: the
    // region is padded by a sample, and at the fine end one sample of padding is a different
    // triangle count.
    const estimate = printEstimate([body()], DEFAULT_PRINT_VOXEL_SIZE);
    const meshed = meshParts(
      [body()],
      printBudgetFor(DEFAULT_PRINT_VOXEL_SIZE),
    );

    expect(estimate?.samples).toBe(meshed?.region.samples);
    expect(estimate?.sampleSize).toBe(meshed?.region.sampleSize);
  });

  it("grows with the model, which is why the number on its own is not the cost", () => {
    // **The reason this control has a readout under it at all.** The same typed resolution is a
    // one-second print of one model and a ten-second print of another, and the person choosing
    // a number to type cannot see that from the number.
    //
    // Two models neither of which reaches the ceiling, so this is the model's own size being
    // counted and not the cap — the cap's own behaviour is the test below.
    const small = printEstimate(modelLong(2), DEFAULT_PRINT_VOXEL_SIZE);
    const large = printEstimate(modelLong(6), DEFAULT_PRINT_VOXEL_SIZE);

    expect(small?.capped).toBe(false);
    expect(large?.capped).toBe(false);
    expect(large?.samples ?? 0).toBeGreaterThan(small?.samples ?? 0);
    expect(large?.seconds ?? 0).toBeGreaterThan(small?.seconds ?? 0);
  });

  it("says when the ceiling answered instead of the number", () => {
    // **The silent case, made visible.** `samplesFor` clamps at `maxSamplesPerAxis` without
    // saying so, so a model too big to mesh at the setting asked for is meshed coarser and the
    // slider looks like it did nothing. A twenty-unit model at `0.0625` asks for 322 samples
    // and gets 256.
    const capped = printEstimate(modelLong(20), DEFAULT_PRINT_VOXEL_SIZE);
    const fitted = printEstimate(modelLong(20), MAX_PRINT_VOXEL_SIZE);

    expect(capped?.capped).toBe(true);
    expect(capped?.samples).toBe(256);
    // **And the fine setting reaches the same ceiling**, which is what makes the floor honest
    // about being past the point where more digits buy anything.
    expect(fitted?.capped).toBe(true);
    expect(fitted?.samples).toBe(256);
  });

  it("never promises more than the ceiling, whatever it is asked for", () => {
    // **The whole reason the cap is a number.** A field that would let somebody ask for a
    // thousand samples a side is a field that can ask for a hundred million field evaluations,
    // which is a tab a phone kills with the model still unsaved in it.
    for (const size of [MIN_PRINT_VOXEL_SIZE, DEFAULT_PRINT_VOXEL_SIZE]) {
      const estimate = printEstimate(modelLong(500), size);
      expect(estimate?.samples).toBeLessThanOrEqual(256);
      expect(estimate?.capped).toBe(true);
    }
  });

  it("has nothing to estimate for a model with nothing in it", () => {
    expect(printEstimate([], DEFAULT_PRINT_VOXEL_SIZE)).toBeUndefined();
  });
});

describe("printBudgetFor", () => {
  it("keeps the mesher's own floor and gives the export its own ceiling", () => {
    // **Two different reasons for two different numbers**, which is why this is not
    // `budgetFor` with a bigger number typed in: the floor is about a tiny model still being a
    // solid and the ceiling is about how long somebody will watch a bar.
    const viewport = budgetFor(DEFAULT_PRINT_VOXEL_SIZE);
    const printing = printBudgetFor(DEFAULT_PRINT_VOXEL_SIZE);

    expect(printing.minSamplesPerAxis).toBe(viewport.minSamplesPerAxis);
    expect(printing.maxSamplesPerAxis).toBeGreaterThan(
      viewport.maxSamplesPerAxis,
    );
    expect(printing.voxelSize).toBe(DEFAULT_PRINT_VOXEL_SIZE);
  });

  it("buys a long model the samples the viewport's ceiling refused it", () => {
    // **The measurable consequence, and the reason the export does not merely take a finer
    // voxel size on the same budget.** A twenty-unit model at `0.0625` asks for 322 samples:
    // at the viewport's 96 it is meshed at a third of the resolution asked for, silently, at
    // every setting; at 256 it gets what it asked for.
    const bounds = {
      min: { x: -1, y: -1, z: -1 },
      max: { x: 21, y: 1, z: 1 },
    };

    expect(
      samplesFor(bounds, printBudgetFor(DEFAULT_PRINT_VOXEL_SIZE)),
    ).toBeGreaterThan(samplesFor(bounds, budgetFor(DEFAULT_PRINT_VOXEL_SIZE)));
  });
});

describe("describePrintEstimate", () => {
  it("leads with the samples, because that is what the model decides", () => {
    // **Measured at 42,112 triangles against the 43k this says**, which is the estimate being
    // within three per cent — the reason the sentence says "about" and the reason the constant
    // it comes from is fitted rather than guessed.
    const estimate = printEstimate([body()], DEFAULT_PRINT_VOXEL_SIZE);

    expect(describePrintEstimate(estimate!)).toBe(
      "113 samples across · about 43k triangles · about 1 s",
    );
  });

  it("names the ceiling when it is the thing that answered", () => {
    const estimate = printEstimate(modelLong(20), DEFAULT_PRINT_VOXEL_SIZE);
    const said = describePrintEstimate(estimate!);

    expect(said).toContain("capped at 256");
    expect(said).toContain("256 samples across");
  });

  it("keeps the tenths on a fast print rather than rounding it away", () => {
    // **A model small enough to mesh in a fraction of a second is still not a print that takes
    // no time**, and "about 0 s" would read as a failure of the estimate rather than as a fast
    // one. This is the range somebody is choosing within when they decide not to wait.
    const estimate = printEstimate(modelLong(0.5), DEFAULT_PRINT_VOXEL_SIZE);

    expect(describePrintEstimate(estimate!)).toMatch(/about 0\.\d+ s/);
  });

  it("rounds a long wait to fives, because the tenth stops mattering there", () => {
    // **Someone reading eleven seconds is deciding whether to go and make a coffee**, which the
    // tenth of a second does not change.
    expect(describePrintEstimate({ ...blank, seconds: 11.4 })).toContain(
      "about 10 s",
    );
    expect(describePrintEstimate({ ...blank, seconds: 13.6 })).toContain(
      "about 15 s",
    );
  });
});

/** An estimate with only its duration set, for the formatting tests above. */
const blank = {
  voxelSize: DEFAULT_PRINT_VOXEL_SIZE,
  samples: 113,
  sampleSize: 0.0625,
  triangles: 43_000,
  seconds: 1,
  capped: false,
};
