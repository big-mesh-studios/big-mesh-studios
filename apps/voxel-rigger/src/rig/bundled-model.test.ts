// The sample models and the bundled human rig, read end to end the way the
// editor reads them, so a change to either the format or the importer that
// breaks the pair is caught here.
import { readFile } from "node:fs/promises";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import { describe, expect, it } from "vitest";
import { importGlb } from "../animation/gltf-import";
import { DEFAULT_PALETTE } from "./palette";
import { figureParts } from "./anchors";
import { guessBindings } from "./rig";

/** `path` read as an ArrayBuffer for the importer. */
async function bytes(path: string): Promise<ArrayBuffer> {
  const data = await readFile(path);
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

describe("bundled human rig", () => {
  it("reads seventeen bones and the four kept clips", async () => {
    const imported = await importGlb(
      await bytes("public/animations/human.glb"),
    );
    expect(imported.skeleton.bones).toHaveLength(17);
    expect(imported.motions.map((motion) => motion.name).sort()).toEqual([
      "Idle",
      "Jump_Full_Short",
      "Running_A",
      "Walking_A",
    ]);

    const walk = imported.motions.find(
      (motion) => motion.name === "Walking_A",
    )!;
    expect(walk.tracks.length).toBeGreaterThan(0);
  });

  it("binds every part of the bundled human model to a bone", async () => {
    const model = await readFile("public/models/human.zip");
    const figure = await loadFigure(new Blob([model]), DEFAULT_PALETTE);
    const parts = figureParts(figure);
    const imported = await importGlb(
      await bytes("public/animations/human.glb"),
    );

    expect(parts).toHaveLength(10);
    expect(guessBindings(parts, imported.skeleton)).toHaveLength(10);
  });

  it("binds every part of the bundled fox model to a bone", async () => {
    const model = await readFile("public/models/fox.zip");
    const figure = await loadFigure(new Blob([model]), DEFAULT_PALETTE);
    const parts = figureParts(figure);
    const glb = await bytes("public/animations/Fox.glb");
    const jsonLength = new DataView(glb).getUint32(12, true);
    const json = JSON.parse(
      new TextDecoder().decode(new Uint8Array(glb, 20, jsonLength)),
    );

    // The fox file carries a texture, which the loader decodes with the
    // browser's own image APIs, so its skeleton is read from the raw glTF here
    // rather than through the importer the browser uses.
    const skeleton = {
      name: "fox",
      bones: (json.skins[0].joints as number[]).map((index) => ({
        id: json.nodes[index].name,
        name: json.nodes[index].name,
        parent: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: 1,
      })),
    };

    expect(parts).toHaveLength(22);
    expect(guessBindings(parts, skeleton)).toHaveLength(22);
  });
});
