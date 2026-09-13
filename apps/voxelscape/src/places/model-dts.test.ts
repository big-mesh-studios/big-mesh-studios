// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { generateProjectModelsDts } from "./model-dts";
import type { AttachedModel } from "./project";
import { saveFigure } from "@big-mesh-studios/stacker/format";
import {
  sideKinds,
  type Part,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";

const VOXELSCAPE_DTS = readFileSync(
  fileURLToPath(new URL("./voxelscape.d.ts", import.meta.url)),
  "utf8",
);

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
): Promise<AttachedModel> => {
  const palette = Array.from({ length: 32 }, (_, i) => ({
    r: i,
    g: i,
    b: i,
    a: 255,
  }));
  const blob = await saveFigure(
    { parts: parts.map(partOf), palette },
    motions.map((name) => ({
      name,
      framesPerSecond: 12,
      loop: true,
      parts: [],
    })),
  );
  return { bytes: new Uint8Array(await blob.arrayBuffer()) };
};

describe("generateProjectModelsDts", () => {
  it("generates one combined ModelsByName augmentation", async () => {
    const dts = await generateProjectModelsDts({
      "zombie.zip": await modelBytes(["head"]),
      "robot.zip": await modelBytes(["chassis"]),
    });
    expect(dts).toContain('declare module "voxelscape"');
    expect(dts).toContain('"zombie":');
    expect(dts).toContain('"robot":');
  });

  it("turns each model's parts and motions into literal unions", async () => {
    const dts = await generateProjectModelsDts({
      "zombie.zip": await modelBytes(
        ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"],
        ["idle", "walk", "attack"],
      ),
    });
    expect(dts).toContain('readonly file: "zombie.zip";');
    expect(dts).toContain(
      'readonly parts: readonly ("head" | "torso" | "leftArm" | "rightArm" | "leftLeg" | "rightLeg")[];',
    );
    expect(dts).toContain(
      'readonly motions: readonly ("idle" | "walk" | "attack")[];',
    );
  });

  it("falls back to never for a model with no motions", async () => {
    const dts = await generateProjectModelsDts({
      "empty.zip": await modelBytes(["head"]),
    });
    expect(dts).toContain("readonly motions: readonly (never)[];");
  });

  it("skips a model whose bytes will not decode, without throwing", async () => {
    const dts = await generateProjectModelsDts({
      "broken.zip": { bytes: new Uint8Array([1, 2, 3]) },
      "zombie.zip": await modelBytes(["head"]),
    });
    expect(dts).not.toContain("broken");
    expect(dts).toContain('"zombie":');
  });

  it("generates nothing for a project with no models", async () => {
    expect(await generateProjectModelsDts({})).toBe("");
  });

  it("types a real createNpc call against the generated augmentation", async () => {
    const dts = await generateProjectModelsDts({
      "zombie.zip": await modelBytes(
        ["head", "torso"],
        ["idle", "walk", "attack"],
      ),
    });
    const script = `
      import { createNpc } from "voxelscape";
      const zombie = createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0 });
      const motion: "idle" | "walk" | "attack" = zombie.model.motions[0];
      const part = zombie.model.parts[0];
    `;
    const { diagnostics } = checkScript(
      {
        "entry.ts": script,
        "voxelscape.d.ts": VOXELSCAPE_DTS,
        "models.d.ts": dts,
      },
      "entry.ts",
    );
    expect(diagnostics).toEqual([]);
  });

  it("rejects a motion not in the real list, naming the real ones", async () => {
    const motions = ["idle", "walk", "attack"];
    const dts = await generateProjectModelsDts({
      "zombie.zip": await modelBytes(["head"], motions),
    });
    const script = `
      import { createNpc } from "voxelscape";
      const zombie = createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0 });
      const motion: "sprint" = zombie.model.motions[0];
    `;
    const { diagnostics } = checkScript(
      {
        "entry.ts": script,
        "voxelscape.d.ts": VOXELSCAPE_DTS,
        "models.d.ts": dts,
      },
      "entry.ts",
    );
    expect(diagnostics.length).toBeGreaterThan(0);
    for (const motion of motions) {
      expect(diagnostics[0]).toContain(`"${motion}"`);
    }
  });

  it("offers the real part names as completions", async () => {
    const parts = ["head", "torso", "leftArm"];
    const dts = await generateProjectModelsDts({
      "zombie.zip": await modelBytes(parts),
    });
    const script = `
      import { createNpc } from "voxelscape";
      const zombie = createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0 });
      zombie.model.parts.includes("<CURSOR>");
    `;
    const { completions } = checkScript(
      {
        "entry.ts": script,
        "voxelscape.d.ts": VOXELSCAPE_DTS,
        "models.d.ts": dts,
      },
      "entry.ts",
    );
    expect(completions.sort()).toEqual([...parts].sort());
  });

  it("rejects a model name no attached model carries", async () => {
    const dts = await generateProjectModelsDts({
      "zombie.zip": await modelBytes(["head"]),
    });
    const script = `
      import { createNpc } from "voxelscape";
      const robot = createNpc({ model: "robot", id: "robot-1", x: 0, z: 0 });
    `;
    const { diagnostics } = checkScript(
      {
        "entry.ts": script,
        "voxelscape.d.ts": VOXELSCAPE_DTS,
        "models.d.ts": dts,
      },
      "entry.ts",
    );
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]).toContain('"zombie"');
  });
});
