// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  compilePlacePlan,
  isStructurePlan,
  MAX_PLAN_SHAPES,
  parseStructurePlan,
} from "./plan";
import { PlaceBundleError } from "./bundle";

const BOX = { kind: "box", min: [0, 0, 0], max: [1, 1, 1], id: 25 };
const REGION = {
  min: [0, 0, 0] as [number, number, number],
  max: [64, 64, 64] as [number, number, number],
};

describe("parseStructurePlan", () => {
  it("reads an empty plan as no shapes", () => {
    expect(parseStructurePlan("")).toEqual([]);
    expect(parseStructurePlan("   ")).toEqual([]);
  });

  it("accepts every shape kind", () => {
    const plan = [
      BOX,
      { kind: "road", from: [0, 0, 0], to: [8, 0, 0], width: 3, id: 4 },
      {
        kind: "house",
        at: [0, 0, 0],
        size: [5, 4, 5],
        wall: 25,
        roof: 26,
        floor: 4,
      },
      {
        kind: "stairs",
        at: [0, 0, 0],
        along: "x",
        steps: 4,
        rise: 1,
        run: 2,
        width: 3,
        id: 25,
      },
      { kind: "ramp", from: [0, 0, 0], to: [4, 4, 0], width: 3, id: 4 },
    ];
    expect(parseStructurePlan(JSON.stringify(plan))).toEqual(plan);
  });

  it("refuses a staircase or incline the world cannot generate", () => {
    expect(
      parseStructurePlan(
        JSON.stringify([
          {
            kind: "stairs",
            at: [0, 0, 0],
            along: "diagonal",
            steps: 4,
            rise: 1,
            run: 2,
            width: 3,
            id: 25,
          },
        ]),
      ),
    ).toBeNull();
    expect(
      parseStructurePlan(
        JSON.stringify([
          { kind: "ramp", from: [0, 0, 0], to: [99999, 0, 0], width: 3, id: 4 },
        ]),
      ),
    ).toBeNull();
  });

  it("refuses malformed JSON, a non-array, and a bad shape", () => {
    expect(parseStructurePlan("not json")).toBeNull();
    expect(parseStructurePlan("{}")).toBeNull();
    expect(parseStructurePlan(JSON.stringify([{ kind: "box" }]))).toBeNull();
    expect(
      parseStructurePlan(JSON.stringify([{ ...BOX, min: [2, 0, 0] }])),
    ).toBeNull();
    expect(
      parseStructurePlan(JSON.stringify([{ ...BOX, id: 999 }])),
    ).toBeNull();
  });

  it("refuses a plan longer than the shape bound", () => {
    expect(isStructurePlan(new Array(MAX_PLAN_SHAPES + 1).fill(BOX))).toBe(
      false,
    );
  });
});

const ENTRY = `
export function bmsTick(): void {}
export function bmsPlan(contextJson: string): string {
  const context = JSON.parse(contextJson) as { seed: number };
  return JSON.stringify([
    { kind: "box", min: [0, 0, 0], max: [1, 1, 1], id: context.seed },
  ]);
}
`;

describe("compilePlacePlan", () => {
  it("runs the script's bmsPlan and returns its shapes", async () => {
    const plan = await compilePlacePlan({
      files: { "main.ts": ENTRY },
      entry: "main.ts",
      seed: 7,
      region: REGION,
    });
    expect(plan).toEqual([
      { kind: "box", min: [0, 0, 0], max: [1, 1, 1], id: 7 },
    ]);
  });

  it("returns no shapes for a script that defines no bmsPlan", async () => {
    const plan = await compilePlacePlan({
      files: { "main.ts": `export function bmsTick(): void {}` },
      entry: "main.ts",
      seed: 1,
      region: REGION,
    });
    expect(plan).toEqual([]);
  });

  it("refuses a plan the world cannot generate", async () => {
    await expect(
      compilePlacePlan({
        files: {
          "main.ts": `
            export function bmsTick(): void {}
            export function bmsPlan(): string {
              return JSON.stringify([{ kind: "box", min: [0, 0, 0], max: [0, 0, 0], id: -1 }]);
            }
          `,
        },
        entry: "main.ts",
        seed: 1,
        region: REGION,
      }),
    ).rejects.toBeInstanceOf(PlaceBundleError);
  });
});
