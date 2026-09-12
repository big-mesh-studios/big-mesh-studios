// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  modelDescriptorFor,
  modelSpecifierFor,
  resolveModelFile,
} from "./model-descriptor";
import { saveFigure } from "@big-mesh-studios/stacker/format";
import {
  sideKinds,
  type Figure,
  type Motion,
  type Part,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";

const partOf = (name: string): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => [kind, Bitmap.create(2, 2)]),
  ) as Record<SideKind, Bitmap>,
  sections: [],
  root: Vector3D.create(),
  pivot: Vector3D.create(),
  turn: Vector3D.create(),
  scale: 1,
  parent: null,
});

const modelBytes = async (
  parts: string[],
  motions: string[] = [],
): Promise<Uint8Array> => {
  const figure: Figure = {
    parts: parts.map(partOf),
    palette: Array.from({ length: 32 }, (_, i) => ({
      r: i,
      g: i,
      b: i,
      a: 255,
    })),
  };
  const motionList: Motion[] = motions.map((name) => ({
    name,
    framesPerSecond: 12,
    loop: true,
    parts: [],
  }));
  const blob = await saveFigure(figure, motionList);
  return new Uint8Array(await blob.arrayBuffer());
};

describe("modelSpecifierFor", () => {
  it("strips a .zip extension", () => {
    expect(modelSpecifierFor("zombie.zip")).toBe("zombie");
  });

  it("is case-insensitive about the extension", () => {
    expect(modelSpecifierFor("zombie.ZIP")).toBe("zombie");
  });

  it("names no specifier for a file that is not a model zip", () => {
    expect(modelSpecifierFor("readme.txt")).toBeNull();
  });
});

describe("resolveModelFile", () => {
  it("resolves a bare specifier to its .zip file", () => {
    const models = { "zombie.zip": new Uint8Array() };
    expect(resolveModelFile(models, "zombie")).toBe("zombie.zip");
  });

  it("resolves a specifier that already names the exact file", () => {
    const models = { "zombie.zip": new Uint8Array() };
    expect(resolveModelFile(models, "zombie.zip")).toBe("zombie.zip");
  });

  it("names no file for a model the project does not carry", () => {
    expect(resolveModelFile({}, "zombie")).toBeNull();
  });
});

describe("modelDescriptorFor", () => {
  it("names the descriptor after the specifier, not anything in the file", async () => {
    const bytes = await modelBytes(["head"]);
    const descriptor = await modelDescriptorFor("zombie", bytes);
    expect(descriptor.name).toBe("zombie");
  });

  it("lists the figure's real part names, in order", async () => {
    const bytes = await modelBytes(["head", "torso", "leftArm"]);
    const descriptor = await modelDescriptorFor("zombie", bytes);
    expect(descriptor.parts).toEqual(["head", "torso", "leftArm"]);
  });

  it("lists the figure's real motion names, in order", async () => {
    const bytes = await modelBytes(["head"], ["idle", "walk", "attack"]);
    const descriptor = await modelDescriptorFor("zombie", bytes);
    expect(descriptor.motions).toEqual(["idle", "walk", "attack"]);
  });

  it("lists no motions for a model that has none", async () => {
    const bytes = await modelBytes(["head"]);
    const descriptor = await modelDescriptorFor("zombie", bytes);
    expect(descriptor.motions).toEqual([]);
  });
});
