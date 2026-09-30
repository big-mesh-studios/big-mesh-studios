// @vitest-environment node
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { bundlePlaceProject } from "./bundle";
import {
  emptyPlaceProject,
  MAIN_SCRIPT_FILE,
  readPlaceProject,
  STARTER_SCRIPT,
  writePlaceZip,
  type PlaceProject,
} from "./project";
import type { PlaceManifest } from "./place";
import { createQuickJSSandbox } from "./quickjs-sandbox";

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
  levels: {},
  models: {},
};

/** One level's plan, as the text a script's `onPlan` answers with. */
const TERRACE =
  '{"structures":[{"kind":"box","min":[0,0,0],"max":[2,2,2],"id":3}],"npcs":[],"props":[]}';

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
    expect(STARTER_SCRIPT).toContain("onTick");
  });

  it("bundles the starter script and dispatches the npc it promises", async () => {
    const code = await bundlePlaceProject(
      { [MAIN_SCRIPT_FILE]: STARTER_SCRIPT },
      MAIN_SCRIPT_FILE,
    );
    const sandbox = await createQuickJSSandbox({ seed: 1, getNow: () => 0 });
    sandbox.load(code);
    sandbox.tick(0, "[]");
    const { effects } = sandbox.drain();
    expect(effects.map((e) => e.tag)).toContain("npc");
    const npc = effects.find((e) => e.tag === "npc");
    expect(JSON.parse(npc!.payload)).toMatchObject({
      id: "guide",
      x: 8,
      z: 8,
      name: "Guide",
    });
    sandbox.dispose();
  });

  it("carries model files through its zip as bytes", async () => {
    const project: PlaceProject = {
      manifest: MANIFEST,
      scripts: { "main.js": "var started = false;" },
      levels: {},
      models: { "fridge.zip": { bytes: new Uint8Array([1, 2, 3, 4]) } },
    };
    const opened = await readPlaceProject(await writePlaceZip(project));
    expect(opened.manifest.models).toEqual(["fridge.zip"]);
    // A zip read fresh carries no record of whether the model is already
    // published anywhere — only the bytes it was drawn as.
    expect(opened.models["fridge.zip"]).toEqual({
      bytes: new Uint8Array([1, 2, 3, 4]),
    });
  });

  it("round-trips a project through its zip", async () => {
    const blob = await writePlaceZip(PROJECT);
    expect(blob.type).toBe("application/zip");
    await expect(readPlaceProject(blob)).resolves.toEqual(PROJECT);
  });

  it("carries a level through its zip as a .json file under its bare name", async () => {
    const blob = await writePlaceZip({
      ...PROJECT,
      levels: { terrace: TERRACE },
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("text"),
    ) as PlaceManifest;
    expect(manifest.levels).toEqual(["terrace.json"]);
    expect(await zip.file("terrace.json")!.async("text")).toBe(TERRACE);
    const opened = await readPlaceProject(blob);
    expect(opened.levels).toEqual({ terrace: TERRACE });
  });

  it("names no level at all in the manifest when a place carries none", async () => {
    const blob = await writePlaceZip(PROJECT);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("text"),
    ) as PlaceManifest;
    expect(manifest.levels).toBeUndefined();
    expect((await readPlaceProject(blob)).levels).toEqual({});
  });

  it("refuses a zip whose manifest names a level it does not carry", async () => {
    const { scripts: _scripts, ...bare } = MANIFEST;
    const zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify({ ...bare, levels: ["hub.json"] }),
    );
    await expect(
      readPlaceProject(await zip.generateAsync({ type: "blob" })),
    ).rejects.toThrow(
      'the manifest names "hub.json", which the zip does not hold',
    );
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
      levels: {},
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
