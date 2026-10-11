import { describe, expect, it } from "vitest";

import { PaintSurface } from "../unwrapping/paint-surface";
import { modelMaterial } from "./model-material";

/**
 * Pretends the renderer has just uploaded the atlas.
 *
 * **A real renderer clears `needsUpdate` when it uploads, and this test has no renderer.** So
 * every case here has to clear it by hand, and without that the flag would still be true from
 * `attach` onwards — and every assertion about whether `sync` uploaded anything would pass for
 * the wrong reason.
 */
const uploaded = (material: ReturnType<typeof modelMaterial>): void => {
  if (material.texture !== undefined) material.texture.needsUpdate = false;
};

/** A surface with one stroke on it, so it is dirty and has something to upload. */
const painted = (): PaintSurface => {
  const surface = new PaintSurface(16, 16);
  surface.markChanged();
  return surface;
};

describe("ModelMaterial.sync", () => {
  it("uploads an atlas that has changed", () => {
    // **The whole bug this file exists for.** A stroke writes texels; the shader samples a GPU
    // copy of them. If nothing tells the renderer the copy is stale, the paint is correct in
    // memory and invisible on screen until something else happens to re-install the material.
    const material = modelMaterial(false);
    material.attach(painted());
    uploaded(material);

    material.sync(painted());

    expect(material.texture?.needsUpdate).toBe(true);
  });

  it("says nothing when nothing has changed", () => {
    // **The cost half.** rmsl re-uploads the entire atlas on every `needsUpdate`, so a model
    // sitting still with a four-megabyte texture must not re-send it sixty times a second. This
    // is the assertion that keeps `sync` in the frame loop rather than moving it into the
    // stamp path.
    const surface = painted();
    const material = modelMaterial(false);
    material.attach(surface);
    material.sync(surface);
    uploaded(material);

    material.sync(surface);

    expect(material.texture?.needsUpdate).toBe(false);
  });

  it("uploads once per call however many times a surface was stamped", () => {
    // **Coalescing, stated as behaviour.** The flag is set, not counted, so a frame that
    // received forty pointer moves asks for one upload — which is the only granularity rmsl
    // offers and the reason `sync` lives in the render loop.
    const surface = new PaintSurface(16, 16);
    const material = modelMaterial(false);
    material.attach(surface);
    uploaded(material);

    for (let dab = 0; dab < 40; dab++) surface.markChanged();
    material.sync(surface);
    const afterFirst = material.texture?.needsUpdate;
    uploaded(material);

    expect(afterFirst).toBe(true);
    // **And the flag is spent**, so the next frame with no paint does not upload again.
    expect(surface.dirty).toBe(false);
  });

  it("does nothing at all without a texture", () => {
    // **Before the first install there is nowhere to upload to**, and a stroke cannot have
    // happened without one — so this path is reached with a clean surface and must be harmless
    // rather than a reason to re-attach and paper over whatever came apart.
    const material = modelMaterial(false);
    expect(material.textured).toBe(false);

    expect(() => {
      material.sync(painted());
    }).not.toThrow();
  });

  it("carries the painted bytes by reference, not by copy", () => {
    // **The half that would break every other test if it were wrong.** The texture is built over
    // the surface's array, so a stamp after the upload changes what the *next* upload sends. A
    // copy at `attach` would mean a later stroke could never reach the GPU at all, and the
    // symptom would be exactly the one that was reported — paint visible only after a rebuild,
    // which rebuilds the texture from the current array and so appears to fix it.
    const surface = new PaintSurface(4, 4);
    const material = modelMaterial(false);
    material.attach(surface);

    surface.pixels[0] = 200;
    material.sync(surface);

    const texture = material.texture;
    expect(texture).toBeDefined();
    expect(texture?.image).toBe(surface.pixels);
  });
});

describe("modelMaterial", () => {
  it("takes the blend at construction rather than losing it on rebuild", () => {
    // **A rebuild makes a new material.** A blend set on the old one — or defaulted to zero on
    // the new one because nobody passed it — would reset on every edit, so the toggle would
    // appear to work and then spring back the first time anybody moved a slider.
    expect(modelMaterial(false, 1).blend).toBe(1);
    expect(modelMaterial(false).blend).toBe(0);
  });
});
