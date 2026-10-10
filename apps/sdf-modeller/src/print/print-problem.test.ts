import { describe, expect, it } from "vitest";
import type { MeshReport } from "@big-mesh-studios/meshing";

import type { MeshResult } from "../model/mesh-model";
import { placedPart } from "../model/part";
import { DEFAULT_PRINT_VOXEL_SIZE } from "./print-budget";
import { meshForPrint } from "./print-mesh";
import { printProblem, printReadout } from "./print-problem";

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
 * once, on its own, in `print-mesh.test.ts`.
 */
const meshOf = (parts: ReturnType<typeof placedPart>[]): MeshResult => {
  const result = meshForPrint(parts, DEFAULT_PRINT_VOXEL_SIZE);
  if (result === undefined) throw new Error("this model meshed to nothing");
  return result;
};

/**
 * A mesh whose report says something else.
 *
 * **Every field named, rather than spread over the original**, because a spread of a value read
 * through an optional chain widens each field to `number | undefined` and the result is no
 * longer a `MeshReport`. Naming them is also what makes it obvious that a test is asserting
 * about a report and not about a different mesh.
 */
const reporting = (
  result: MeshResult,
  changes: Partial<MeshReport>,
): MeshResult => {
  const was = result.report;
  return {
    ...result,
    report: {
      vertexCount: was.vertexCount,
      triangleCount: was.triangleCount,
      boundaryEdges: was.boundaryEdges,
      nonManifoldEdges: was.nonManifoldEdges,
      inconsistentEdges: was.inconsistentEdges,
      degenerateTriangles: was.degenerateTriangles,
      weldDistance: was.weldDistance,
      volume: was.volume,
      watertight: was.watertight,
      ...changes,
    },
  };
};

describe("printProblem", () => {
  it("says nothing about a model that is ready to print", () => {
    expect(printProblem(meshOf([body()]))).toBeUndefined();
  });

  it("says a model with no parts has nothing in it", () => {
    expect(printProblem(undefined)).toMatch(/nothing in it to print/);
  });

  it("refuses a lidless shell, and says how badly", () => {
    // **The one failure that is not a matter of degree.** A mesh with an edge in one triangle
    // is not a solid, and a slicer will decide for itself what to do with the hole. ADR 0030
    // calls a clipped model the failure most likely to ship, so this is the gate and the others
    // are not.
    const printed = meshOf([body()]);

    expect(printProblem(reporting(printed, { boundaryEdges: 3 }))).toMatch(
      /3 open edges/,
    );
    // **Singular too**, because the sentence is shown to a person and "1 open edges" is the kind
    // of thing that teaches somebody not to read the messages.
    expect(printProblem(reporting(printed, { boundaryEdges: 1 }))).toMatch(
      /1 open edge —/,
    );
  });

  it("refuses a model with no surface rather than writing an empty file", () => {
    // **The real way to get here** is a model whose features are thinner than the sampling
    // grid's spacing — the budget caps samples per axis, so a model's own size decides its
    // spacing, and a small enough torus falls between samples. The threshold is a sampling
    // coincidence rather than a number, so what is tested is the branch and not a model that
    // happens to land on the wrong side of it today.
    //
    // **`triangles` and not `report.triangleCount`**, which is the field the gate reads: the
    // two are the same number by construction and reading the wrong one here would leave this
    // test passing on a refusal that is not the one being described.
    expect(printProblem({ ...meshOf([body()]), triangles: 0 })).toMatch(
      /no surface/,
    );
  });

  it("lets through the faults a printer's own slicing absorbs", () => {
    // **Non-manifold edges, wound-backwards winding and degenerate triangles are worse news
    // **but not this news.** Refusing every mesh with one of them would refuse meshes that
    // come out fine, and the report beside the control is where those are said.
    const poor = reporting(meshOf([body()]), {
      nonManifoldEdges: 2,
      inconsistentEdges: 1,
      degenerateTriangles: 3,
    });

    expect(printProblem(poor)).toBeUndefined();
  });
});

describe("printReadout", () => {
  it("says the report, so the control beside the button has something to show", () => {
    expect(
      printReadout(meshForPrint([body()], DEFAULT_PRINT_VOXEL_SIZE)),
    ).toMatch(/watertight|triangle/);
    expect(printReadout(undefined)).toBe("nothing to print");
  });
});
