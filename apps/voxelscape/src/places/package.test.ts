// @vitest-environment node
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readPlaceZip } from "./package";
import type { PlaceManifest } from "./place";

const zipWith = async (
  files: Record<string, string | Uint8Array>,
): Promise<Blob> => {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return new Blob([await zip.generateAsync({ type: "arraybuffer" })]);
};

const MANIFEST: PlaceManifest = {
  name: "The Haunted Mesa",
  seed: 12_345,
  spawn: [128, 0, -64],
  scripts: ["main.js"],
};

describe("readPlaceZip", () => {
  it("reads a valid place zip", async () => {
    const blob = await zipWith({
      "manifest.json": JSON.stringify(MANIFEST),
      "main.js": "export default {}",
    });
    await expect(readPlaceZip(blob)).resolves.toEqual(MANIFEST);
  });

  it("accepts a manifest with no scripts", async () => {
    const { scripts: _scripts, ...bare } = MANIFEST;
    const blob = await zipWith({ "manifest.json": JSON.stringify(bare) });
    await expect(readPlaceZip(blob)).resolves.toEqual(bare);
  });

  it("refuses a zip with no manifest", async () => {
    const blob = await zipWith({ "main.js": "export default {}" });
    await expect(readPlaceZip(blob)).rejects.toThrow("manifest.json");
  });

  it("refuses a manifest that is not JSON", async () => {
    const blob = await zipWith({ "manifest.json": "{not json" });
    await expect(readPlaceZip(blob)).rejects.toThrow("not valid JSON");
  });

  it("refuses a malformed manifest", async () => {
    const blob = await zipWith({
      "manifest.json": JSON.stringify({ name: "x", seed: "no" }),
    });
    await expect(readPlaceZip(blob)).rejects.toThrow("not a place manifest");
  });

  it("refuses a manifest naming a script the zip does not carry", async () => {
    const blob = await zipWith({
      "manifest.json": JSON.stringify(MANIFEST),
    });
    await expect(readPlaceZip(blob)).rejects.toThrow('"main.js"');
  });

  it("refuses bytes that are not a zip", async () => {
    const blob = new Blob(["definitely not a zip"]);
    await expect(readPlaceZip(blob)).rejects.toThrow("not a zip");
  });
});
