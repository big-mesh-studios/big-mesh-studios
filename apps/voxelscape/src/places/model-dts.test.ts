// @vitest-environment node
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { generateModelDts, generateProjectModelsDts } from "./model-dts";
import type { ModelDescriptor } from "./model-descriptor";
import { saveFigure } from "@big-mesh-studios/stacker/format";
import {
  sideKinds,
  type Part,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";

const ZOMBIE: ModelDescriptor = {
  name: "zombie",
  parts: ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"],
  motions: ["idle", "walk", "attack"],
};

/**
 * Type-checks `entryPath` in `files` (plain relative names) against a real,
 * in-memory TypeScript language service, and reads back diagnostics plus (if
 * `entryPath`'s source contains a `<CURSOR>` marker) the completions offered
 * there. Every path is rooted at `/` before it reaches the service: a bare
 * name gets silently rebased onto the real process cwd otherwise, and a
 * sibling import can then never find a sibling registered under its own bare
 * name — ported as-is from the throwaway prototype that proved this out.
 */
function checkScript(
  files: Record<string, string>,
  entryPath: string,
): { diagnostics: string[]; completions: string[] } {
  const CURSOR = "<CURSOR>";
  const root = (path: string) => `/${path}`;
  const entrySource = files[entryPath];
  const cursorIndex = entrySource.indexOf(CURSOR);
  const fileTexts: Record<string, string> = Object.fromEntries(
    Object.entries(files).map(([path, source]) => [
      root(path),
      path === entryPath && cursorIndex !== -1
        ? source.replace(CURSOR, "")
        : source,
    ]),
  );
  const entryRoot = root(entryPath);
  const fileNames = Object.keys(fileTexts);

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => "0",
    getScriptSnapshot: (fileName) => {
      const text = fileTexts[fileName] ?? ts.sys.readFile(fileName);
      return text === undefined
        ? undefined
        : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
    }),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) =>
      fileTexts[fileName] !== undefined || ts.sys.fileExists(fileName),
    readFile: (fileName) => fileTexts[fileName] ?? ts.sys.readFile(fileName),
  };

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const diagnostics = [
    ...service.getSyntacticDiagnostics(entryRoot),
    ...service.getSemanticDiagnostics(entryRoot),
  ].map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
  );

  const completions =
    cursorIndex === -1
      ? []
      : (
          service.getCompletionsAtPosition(entryRoot, cursorIndex, {})
            ?.entries ?? []
        ).map((entry) => entry.name);

  return { diagnostics, completions };
}

describe("generateModelDts", () => {
  it("turns a descriptor's parts and motions into literal unions", () => {
    const dts = generateModelDts(ZOMBIE, "zombie");
    expect(dts).toContain('declare module "zombie"');
    expect(dts).toContain(
      'readonly parts: readonly ("head" | "torso" | "leftArm" | "rightArm" | "leftLeg" | "rightLeg")[];',
    );
    expect(dts).toContain(
      'readonly motions: readonly ("idle" | "walk" | "attack")[];',
    );
  });

  it("falls back to never for a model with no parts or motions", () => {
    const dts = generateModelDts(
      { name: "empty", parts: [], motions: [] },
      "empty",
    );
    expect(dts).toContain("readonly parts: readonly (never)[];");
    expect(dts).toContain("readonly motions: readonly (never)[];");
  });

  it("types a real import against the generated declaration", () => {
    const dts = generateModelDts(ZOMBIE, "zombie");
    const script = `
      import zombie from "zombie" with { type: "model" };
      const motion: "idle" | "walk" | "attack" = zombie.motions[0];
      const part = zombie.parts[0];
    `;
    const { diagnostics } = checkScript(
      { "entry.ts": script, "models.d.ts": dts },
      "entry.ts",
    );
    expect(diagnostics).toEqual([]);
  });

  it("rejects a motion not in the real list, naming the real ones", () => {
    const dts = generateModelDts(ZOMBIE, "zombie");
    const script = `
      import zombie from "zombie" with { type: "model" };
      const motion: "sprint" = zombie.motions[0];
    `;
    const { diagnostics } = checkScript(
      { "entry.ts": script, "models.d.ts": dts },
      "entry.ts",
    );
    expect(diagnostics.length).toBeGreaterThan(0);
    for (const motion of ZOMBIE.motions) {
      expect(diagnostics[0]).toContain(`"${motion}"`);
    }
  });

  it("offers the real part names as completions", () => {
    const dts = generateModelDts(ZOMBIE, "zombie");
    const script = `
      import zombie from "zombie" with { type: "model" };
      zombie.parts.includes("<CURSOR>");
    `;
    const { completions } = checkScript(
      { "entry.ts": script, "models.d.ts": dts },
      "entry.ts",
    );
    expect(completions.sort()).toEqual([...ZOMBIE.parts].sort());
  });
});

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

const modelBytes = async (parts: string[]): Promise<Uint8Array> => {
  const palette = Array.from({ length: 32 }, (_, i) => ({
    r: i,
    g: i,
    b: i,
    a: 255,
  }));
  const blob = await saveFigure({ parts: parts.map(partOf), palette });
  return new Uint8Array(await blob.arrayBuffer());
};

describe("generateProjectModelsDts", () => {
  it("generates one ambient block per attached model", async () => {
    const dts = await generateProjectModelsDts({
      "zombie.zip": await modelBytes(["head"]),
      "robot.zip": await modelBytes(["chassis"]),
    });
    expect(dts).toContain('declare module "zombie"');
    expect(dts).toContain('declare module "robot"');
  });

  it("skips a model whose bytes will not decode, without throwing", async () => {
    const dts = await generateProjectModelsDts({
      "broken.zip": new Uint8Array([1, 2, 3]),
      "zombie.zip": await modelBytes(["head"]),
    });
    expect(dts).not.toContain("broken");
    expect(dts).toContain('declare module "zombie"');
  });

  it("generates nothing for a project with no models", async () => {
    expect(await generateProjectModelsDts({})).toBe("");
  });
});
