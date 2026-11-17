import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LuauAnalysis } from "./analysis";

/**
 * These tests run against the **committed artifact**, the way `spike.test.ts` runs the
 * VM: no emscripten, no build step, just the bytes and the loader. That is the promise a
 * fresh clone gets, and it is the only way the analysis path gets tested in CI.
 */
const sessions: Array<LuauAnalysis> = [];

const open = async (): Promise<LuauAnalysis> => {
  const analysis = await LuauAnalysis.create();
  sessions.push(analysis);
  return analysis;
};

afterEach(() => {
  for (const analysis of sessions.splice(0)) {
    analysis.dispose();
  }
});

const labels = (
  analysis: LuauAnalysis,
  module: string,
  line: number,
  column: number,
) => analysis.complete(module, line, column).map((item) => item.label);

const guestSource = `
export type Spec = { name: string, kind: string }

local M = {}

function M.log(message: string)
end

function M.createNpc(spec: Spec)
end

M.randint = function(a: number, b: number): number
    return a
end

return M
`;

const guest = (analysis: LuauAnalysis): void => {
  analysis.setSource("spacescape", guestSource);
  analysis.setSpecifier("spacescape", "spacescape");
  analysis.setSpecifier("voxelscape", "spacescape");
};

describe("Luau analysis artifact", () => {
  it("completes a member of a local table", async () => {
    const analysis = await open();
    analysis.setSource("main.luau", "local t = { alpha = 1 }\nt.");

    const items = analysis.complete("main.luau", 1, 2);
    expect(items.map((item) => item.label)).toContain("alpha");
    expect(items.find((item) => item.label === "alpha")?.kind).toBe("property");
    expect(items.find((item) => item.label === "alpha")?.detail).toBe("number");
  });

  it("completes the standard library's members", async () => {
    const analysis = await open();
    analysis.setSource("main.luau", "math.");
    expect(labels(analysis, "main.luau", 0, 5)).toContain("floor");

    analysis.setSource("main.luau", "table.");
    expect(labels(analysis, "main.luau", 0, 6)).toContain("insert");
  });

  it("completes the guest API through require", async () => {
    const analysis = await open();
    guest(analysis);
    analysis.setSource("main.luau", 'local M = require("spacescape")\nM.');

    const names = labels(analysis, "main.luau", 1, 2);
    expect(names).toContain("log");
    expect(names).toContain("createNpc");
    expect(names).toContain("randint");
  });

  it("keeps the legacy voxelscape alias pointing at the same module", async () => {
    const analysis = await open();
    guest(analysis);
    analysis.setSource("main.luau", 'local M = require("voxelscape")\nM.');

    expect(labels(analysis, "main.luau", 1, 2)).toContain("createNpc");
  });

  it("completes across files through the specifier map", async () => {
    const analysis = await open();
    analysis.setSource(
      "door.luau",
      "return { open = function() end, locked = false }",
    );
    analysis.setSpecifier("./door", "door.luau");
    analysis.setSource("main.luau", 'local door = require("./door")\ndoor.');

    const names = labels(analysis, "main.luau", 1, 5);
    expect(names).toContain("open");
    expect(names).toContain("locked");
  });

  it("invalidates dependents when a required file changes", async () => {
    const analysis = await open();
    analysis.setSource("door.luau", "return { open = function() end }");
    analysis.setSpecifier("./door", "door.luau");
    analysis.setSource("main.luau", 'local door = require("./door")\ndoor.');

    expect(labels(analysis, "main.luau", 1, 5)).not.toContain("close");

    analysis.setSource(
      "door.luau",
      "return { open = function() end, close = function() end }",
    );

    expect(labels(analysis, "main.luau", 1, 5)).toContain("close");
  });

  it("returns nothing inside a comment", async () => {
    const analysis = await open();
    analysis.setSource("main.luau", "-- math.");
    expect(analysis.complete("main.luau", 0, 7)).toEqual([]);
  });

  it("counts columns in UTF-8 bytes, not UTF-16 code units", async () => {
    const analysis = await open();
    const line = 'local s = "é"; math.';
    analysis.setSource("main.luau", line);

    const utf16 = line.length; // 20
    const bytes = new TextEncoder().encode(line).length; // 21

    expect(labels(analysis, "main.luau", 0, bytes)).toContain("floor");
    expect(labels(analysis, "main.luau", 0, utf16)).not.toContain("floor");
  });

  it("answers an empty list past the end of the source", async () => {
    const analysis = await open();
    analysis.setSource("main.luau", "math.");
    expect(analysis.complete("main.luau", 99, 0)).toEqual([]);
    expect(analysis.complete("main.luau", 0, 999)).toEqual([]);
  });

  it("returns the same ordered labels for the same request", async () => {
    const analysis = await open();
    analysis.setSource("main.luau", "math.");
    const first = labels(analysis, "main.luau", 0, 5);
    const second = labels(analysis, "main.luau", 0, 5);
    expect(second).toEqual(first);
  });

  it("disposes without aborting and starts a fresh session afterwards", async () => {
    const first = await open();
    first.setSource("main.luau", "math.");
    expect(labels(first, "main.luau", 0, 5)).toContain("floor");
    first.dispose();
    first.dispose(); // idempotent

    const second = await open();
    second.setSource("main.luau", "table.");
    expect(labels(second, "main.luau", 0, 6)).toContain("insert");
  });

  it("keeps the standard library through a reset and replay", async () => {
    const analysis = await open();
    analysis.setSource("main.luau", "math.");
    expect(labels(analysis, "main.luau", 0, 5)).toContain("floor");

    // The worker's `configure` is reset-then-replay; if `Frontend::clear` dropped the
    // builtin globals, the second real editor action would lose the standard library.
    analysis.reset();
    analysis.setSource("main.luau", "math.");
    expect(labels(analysis, "main.luau", 0, 5)).toContain("floor");
  });

  it("reports the pin's version", async () => {
    const pin = await readFile(
      join(fileURLToPath(import.meta.url), "..", "..", "pin.txt"),
      "utf8",
    );
    const tag = /^tag = (.+)$/m.exec(pin)?.[1];
    const commit = /^commit = (.+)$/m.exec(pin)?.[1];
    expect(await LuauAnalysis.version()).toBe(`${tag} ${commit}`);
  });
});
