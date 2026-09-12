// @vitest-environment node
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  emptyPlaceProject,
  MAIN_SCRIPT_FILE,
  readPlaceProject,
  STARTER_SCRIPT,
  writePlaceZip,
  type PlaceProject,
} from "./project";
import type { PlaceManifest } from "./place";

const MANIFEST: PlaceManifest = {
  name: "The Haunted Mesa",
  seed: 12_345,
  spawn: [128, 0, -64],
  scripts: ["main.js", "extra.js"],
};

const PROJECT: PlaceProject = {
  manifest: MANIFEST,
  scripts: {
    "main.js": "var started = false;",
    "extra.js": "function bmsTick() {}",
  },
  models: {},
};

describe("a place project", () => {
  it("starts a fresh place from a starter script with the given seed", () => {
    const fresh = emptyPlaceProject(77);
    expect(fresh.manifest).toEqual({
      name: "",
      seed: 77,
      spawn: [0, 0, 0],
      scripts: [MAIN_SCRIPT_FILE],
      mode: "solo:edit",
    });
    expect(fresh.scripts[MAIN_SCRIPT_FILE]).toBe(STARTER_SCRIPT);
    expect(fresh.models).toEqual({});
    expect(STARTER_SCRIPT).toContain("engine.onTick");
  });

  it("carries model files through its zip as bytes", async () => {
    const project: PlaceProject = {
      manifest: MANIFEST,
      scripts: { "main.js": "var started = false;" },
      models: { "fridge.zip": new Uint8Array([1, 2, 3, 4]) },
    };
    const opened = await readPlaceProject(await writePlaceZip(project));
    expect(opened.manifest.models).toEqual(["fridge.zip"]);
    expect(opened.models["fridge.zip"]).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("round-trips a project through its zip", async () => {
    const blob = await writePlaceZip(PROJECT);
    expect(blob.type).toBe("application/zip");
    await expect(readPlaceProject(blob)).resolves.toEqual(PROJECT);
  });

  it("writes every script the manifest names, in the map's order", async () => {
    const blob = await writePlaceZip(PROJECT);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("text"),
    ) as PlaceManifest;
    expect(manifest).toEqual(MANIFEST);
    expect(await zip.file("main.js")!.async("text")).toBe(
      "var started = false;",
    );
    expect(await zip.file("extra.js")!.async("text")).toBe(
      "function bmsTick() {}",
    );
  });

  it("derives the script list from the file map when the manifest carries none", async () => {
    const { scripts: _scripts, ...bare } = MANIFEST;
    const zip = await writePlaceZip({
      manifest: bare,
      scripts: { "main.js": "var started = false;" },
      models: {},
    });
    const opened = await readPlaceProject(zip);
    expect(opened.manifest.scripts).toEqual(["main.js"]);
  });

  it("refuses a zip whose manifest names a script it does not carry", async () => {
    const { scripts: _scripts, ...bare } = MANIFEST;
    const zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify({ ...bare, scripts: ["ghost.js"] }),
    );
    const blob = new Blob([await zip.generateAsync({ type: "arraybuffer" })]);
    await expect(readPlaceProject(blob)).rejects.toThrow('"ghost.js"');
  });
});
