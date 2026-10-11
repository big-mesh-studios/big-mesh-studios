/**
 * The bake: a pinned reference mesh, the atlas it produced, and coordinates carried onto a mesh
 * that has been rebuilt since.
 *
 * **Against the real xatlas**, for the same reason `./unwrap.test.ts` is: the numbers that matter
 * here — how long a bake takes, what shape the atlas is, whether every vertex came back with a
 * coordinate — are facts about the library and about this device, and a stub would only ever prove
 * that the stub agrees with itself.
 */
import { VERTEX_BYTES } from "@big-mesh-studios/meshing";
import { describe, expect, it } from "vitest";

import { budgetFor, meshParts } from "../model/mesh-model";
import { placedPart } from "../model/part";
import { toGeometry } from "../view/model-view";
import {
  bakeTexture,
  DRIFT_LIMIT,
  rebakeTexture,
  REFERENCE_BUDGET,
} from "./bake";

const sphere = (radius = 4) => [
  placedPart("sphere", { type: "Sphere", radius }, { x: 0, y: 0, z: 0 }),
];

describe("bakeTexture", () => {
  it("answers nothing for a model with no parts in it", async () => {
    // **The empty case is a state, not a failure**, and this is where it is caught: xatlas packs
    // an empty mesh into a 0x0 atlas without complaint, and a texture allocated from that would
    // be a texture nobody can paint on.
    expect(await bakeTexture([])).toBeUndefined();
  });

  it("bakes coordinates onto a pinned reference mesh", async () => {
    const bake = await bakeTexture(sphere());

    expect(bake).toBeDefined();
    // **The reference is the coarse mesh, not the one on screen** — the whole reason M2 measured
    // an unwrap at 1.4 seconds for a coarse sphere and 74 for a fine one.
    expect(bake!.reference.indices.length / 3).toBeLessThan(
      meshParts(sphere(), budgetFor(0.125))!.mesh.triangleCount,
    );
    expect(bake!.uvs.length).toBe(bake!.reference.vertexCount * 2);
    expect(bake!.surface.width).toBe(bake!.atlas.width);
    expect(bake!.surface.height).toBe(bake!.atlas.height);
  });

  it("allocates a texture the size the atlas came out at, not the one asked for", async () => {
    const bake = await bakeTexture(sphere());

    // **Requested 1024; gets whatever the packer made.** The atlas is measured 1225x847 from that
    // request, and a texture allocated at the request would clip a third of the figure's texture.
    expect(bake!.atlas.width).not.toBe(1024);
    expect(bake!.surface.pixels.length).toBe(
      bake!.atlas.width * bake!.atlas.height * 4,
    );
  });

  it("leaves the packed vertex alone", async () => {
    const bake = await bakeTexture(sphere());

    // **The assertion that justifies the whole design.** Coordinates are a parallel array the
    // application owns, and a textured model costs twenty bytes a vertex exactly as an untextured
    // one does — which is what ADR 0048's argument for not adding a fourth attribute turns on.
    expect(VERTEX_BYTES).toBe(20);
    expect(bake!.reference.positions.length).toBe(
      bake!.reference.vertexCount * 3,
    );
  });

  it("meshes the reference at the budget it names", () => {
    // **Stated rather than derived**, because the budget is the whole reason the reference is
    // cheap and a reader comparing it with the viewport's would otherwise see a mismatch.
    expect(REFERENCE_BUDGET.voxelSize).toBe(0.25);
  });
});

describe("carrying a bake onto a rebuilt mesh", () => {
  it("carries coordinates onto a mesh that has not moved", async () => {
    const bake = await bakeTexture(sphere());
    const display = meshParts(sphere())!.mesh;

    const carried = bake!.carry(display);

    // **A model that has not been edited gets its coordinates back exactly**, which is what makes
    // "the rebuild does not disturb the paint" true rather than approximately true.
    expect(carried.unmatched).toBe(0);
    expect(carried.drift).toBe(0);
  });

  it("carries onto a mesh meshed at a different resolution", async () => {
    const bake = await bakeTexture(sphere());
    const coarse = meshParts(sphere(), budgetFor(0.5))!.mesh;
    const fine = meshParts(sphere(), budgetFor(0.0625))!.mesh;

    const ontoCoarse = bake!.carry(coarse);
    const ontoFine = bake!.carry(fine);

    // **The viewport's resolution changes and the paint does not move with it.** Two coordinate
    // arrays of different lengths, both from one baked atlas, is the entire reason the reference
    // mesh is separate from the one on screen.
    expect(ontoCoarse.uvs.length).toBe(coarse.vertexCount * 2);
    expect(ontoFine.uvs.length).toBe(fine.vertexCount * 2);
    expect(ontoCoarse.unmatched).toBe(0);
    expect(ontoFine.unmatched).toBe(0);
  });

  it("measures drift as the model is moved away from where it was baked", async () => {
    const bake = await bakeTexture(sphere());

    const moved = meshParts([
      placedPart("sphere", { type: "Sphere", radius: 4 }, { x: 0, y: 0, z: 0 }),
      placedPart("bump", { type: "Sphere", radius: 0.5 }, { x: 6, y: 0, z: 0 }),
    ])!;

    const carried = bake!.carry(moved.mesh);

    // **A new part out at the edge has no counterpart on the old surface**, so it finds the
    // nearest thing that was there and the number says how far away that was. This is what the
    // rebake prompt reads, and it only works because the transfer reports a length.
    expect(carried.drift).toBeGreaterThan(1);
  });

  it("measures a vertex that has left the old surface as enormous drift", async () => {
    const bake = await bakeTexture(sphere());

    // **Every point has a nearest point, so nothing is ever `unmatched`** — that only happens for
    // an empty reference. A vertex a million units away gets the coordinates of the nearest thing
    // that *is* on the surface, and the honest answer to that is a drift measurement in six
    // figures rather than a NaN nobody can see.
    const stray = {
      positions: new Float32Array([1e6, 1e6, 1e6]),
      indices: new Uint32Array(0),
      normalOct: new Int16Array(2),
      colours: new Uint8Array(4),
      vertexCount: 1,
      triangleCount: 0,
    };
    const carried = bake!.carry(stray);

    expect(carried.unmatched).toBe(0);
    expect(carried.drift).toBeGreaterThan(1e5);
    expect(Number.isFinite(carried.uvs[0])).toBe(true);
  });
});

describe("rebakeTexture", () => {
  it("keeps the painting across a relayout", async () => {
    const first = await bakeTexture(sphere());
    first!.surface.stamp({
      from: [0.5, 0.5],
      to: [0.5, 0.5],
      width: 200,
      hardness: 1,
      colour: { r: 255, g: 0, b: 0, a: 255 },
    });
    const paintedBefore = first!.surface.sample(0.5, 0.5);

    // **A changed model, so the unwrap is a genuinely different layout.**
    const changed = [
      placedPart("sphere", { type: "Sphere", radius: 4 }, { x: 0, y: 0, z: 0 }),
      placedPart("hat", { type: "Sphere", radius: 1 }, { x: 0, y: 4, z: 0 }),
    ];
    const second = await rebakeTexture(first!, changed);

    expect(second).toBeDefined();
    // **Some red is still there somewhere**, which is the claim a rebake makes: a button that
    // silently threw away somebody's work is worse than one that says it is about to.
    expect(paintedBefore.r).toBe(255);
    let red = 0;
    for (let at = 0; at < second!.surface.pixels.length; at += 4) {
      if (second!.surface.pixels[at]! > 0) red++;
    }
    expect(red).toBeGreaterThan(0);
  });

  it("answers nothing for a model with no parts in it", async () => {
    const first = await bakeTexture(sphere());
    expect(await rebakeTexture(first!, [])).toBeUndefined();
  });
});

describe("the cost claim", () => {
  it("binds no uv attribute for a model nobody has baked", () => {
    // **The load-bearing assertion of the whole design.** An untextured model must bind no
    // coordinate attribute, carry no atlas and cost nothing — otherwise every figure in the
    // application is paying for a feature nobody asked for.
    const mesh = meshParts(sphere())!.mesh;

    expect(toGeometry(mesh)).toBeDefined();
    expect(toGeometry(mesh)!.attributes.uv).toBeUndefined();
  });

  it("binds a uv attribute only when coordinates are handed to it", async () => {
    const bake = await bakeTexture(sphere());
    const mesh = meshParts(sphere())!.mesh;
    const carried = bake!.carry(mesh);

    expect(toGeometry(mesh, carried.uvs)!.attributes.uv).toBeDefined();
  });

  it("still reads position, normal and colour with a uv attribute present", () => {
    const mesh = meshParts(sphere())!.mesh;
    const uvs = new Float32Array(mesh.vertexCount * 2).fill(0.5);

    const geometry = toGeometry(mesh, uvs);

    // **The other three attributes are untouched by the fourth.** A `uv` binding that cost a
    // normal or a colour would be a silent change to how every model is lit.
    expect(geometry!.attributes.position).toBeDefined();
    expect(geometry!.attributes.normalOct).toBeDefined();
    expect(geometry!.attributes.colour).toBeDefined();
  });
});

describe("drifted", () => {
  it("calls a fresh bake not drifted", async () => {
    const bake = await bakeTexture(sphere());
    expect(bake!.carry(meshParts(sphere())!.mesh).drift).toBeLessThan(
      DRIFT_LIMIT,
    );
  });
});
