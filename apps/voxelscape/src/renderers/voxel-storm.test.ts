// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DataTexture,
  RGBAFormat,
  Scene,
  UnsignedByteType,
} from "@random-mesh/rmsl/scene";
import { fromProgram } from "@random-mesh/rmsl/test";
import { PerlinNoise2D } from "../world/noise";
import {
  STORM_NOISE_SIZE,
  StormMaterial,
  buildStormNoiseTexture,
} from "./voxel-storm";

/**
 * The per-billboard attributes for a single vertex, as `buildStormGeometry`
 * lays them out. A test overrides the few that carry what it asks about.
 */
const BILLBOARD = {
  particlePos: [0, 0, 0],
  corner: [0, 0],
  drift: [0, 0, 0],
  life: 1,
  offset: 0,
  size: 1,
  phase: 0,
  uv: [0.5, 0.5],
};

/** A texture of one flat level, so a fragment's density is controlled in a test. */
const flatTexture = (level: number): DataTexture =>
  new DataTexture(
    new Uint8Array(
      Array.from({ length: 4 * 4 }, (_, i) => (i % 4 === 3 ? 255 : level)),
    ),
    2,
    2,
    1,
    RGBAFormat,
    UnsignedByteType,
  );

/** The alpha the fragment stage gives one point of the quad. */
const alphaAt = (
  material: StormMaterial,
  uv: [number, number],
  fade = 1,
): number => {
  const shade = fromProgram(material.build(new Scene()));
  const value = shade({ varyings: { vUv: uv, vFade: fade, vSeed: 0 } }).value;
  if (value === null) throw new Error("the fragment discarded");
  return value[3];
};

/**
 * Where the vertex stage puts one billboard. With no camera on the scene the
 * view and projection matrices are the identity, so what comes back is the
 * world position the shader computed.
 */
const worldPosition = (
  material: StormMaterial,
  attributes: Partial<typeof BILLBOARD> = {},
): number[] => {
  const transform = fromProgram(material.build(new Scene()), {
    stage: "vertex",
  });
  const value = transform({
    attributes: { ...BILLBOARD, ...attributes },
  }).value;
  if (value === null) throw new Error("the vertex stage produced nothing");
  return value;
};

describe("the dust noise texture", () => {
  it("bakes a full-contrast, non-flat tile", () => {
    const texture = buildStormNoiseTexture();
    const data = texture.image as Uint8Array;
    expect(texture.width).toBe(STORM_NOISE_SIZE);
    expect(data.length).toBe(STORM_NOISE_SIZE * STORM_NOISE_SIZE * 4);
    let low = 255;
    let high = 0;
    for (let i = 0; i < data.length; i += 4) {
      low = Math.min(low, data[i]);
      high = Math.max(high, data[i]);
    }
    expect(low).toBe(0);
    expect(high).toBe(255);
  });

  it("is deterministic", () => {
    expect(buildStormNoiseTexture().image).toEqual(
      buildStormNoiseTexture().image,
    );
  });

  it("bakes a noise whose lattice repeats, so the tile has no seam", () => {
    // The generator samples one whole lattice period across the image; this is
    // what makes the opposite edges meet when the texture repeats.
    const noise = new PerlinNoise2D(0x51c2);
    for (let i = 0; i < 8; i++) {
      const x = i * 17.5;
      const z = i * 29.25;
      expect(noise.fbm(x, z, 4)).toBeCloseTo(noise.fbm(x + 256, z, 4), 10);
      expect(noise.fbm(x, z, 4)).toBeCloseTo(noise.fbm(x, z + 256, 4), 10);
    }
  });
});

describe("the storm material", () => {
  it("places a billboard where its centre stands", () => {
    const material = new StormMaterial(flatTexture(255));
    const at = worldPosition(material, {
      particlePos: [0.4, 0.3, -0.2],
    });
    expect(at[0]).toBeCloseTo(0.4, 6);
    expect(at[1]).toBeCloseTo(0.3, 6);
    expect(at[2]).toBeCloseTo(-0.2, 6);
  });

  it("turns a funnel's dust about the vertical axis", () => {
    const material = new StormMaterial(flatTexture(255));
    material.kind = 1;
    material.spin = Math.PI / 2;
    material.time = 1;
    // A quarter turn in one second carries a billboard at +x around to +z.
    const at = worldPosition(material, { particlePos: [1, 0.5, 0] });
    expect(at[0]).toBeCloseTo(0, 6);
    expect(at[2]).toBeCloseTo(1, 6);
  });

  it("draws dense dust near the ground and thins toward the sky", () => {
    const material = new StormMaterial(flatTexture(255));
    const low = alphaAt(material, [0.5, 0.1]);
    const high = alphaAt(material, [0.5, 0.9]);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeGreaterThan(high);
  });

  it("draws nothing where the dust texture is empty", () => {
    const material = new StormMaterial(flatTexture(0));
    expect(alphaAt(material, [0.5, 0.1])).toBe(0);
  });

  it("fades each billboard in a disc, so its corners stay clear", () => {
    const material = new StormMaterial(flatTexture(255));
    expect(alphaAt(material, [0.5, 0.5])).toBeGreaterThan(0);
    expect(alphaAt(material, [0.02, 0.02])).toBe(0);
    expect(alphaAt(material, [0.98, 0.98])).toBe(0);
  });

  it("fades the whole storm out at zero intensity", () => {
    const material = new StormMaterial(flatTexture(255));
    material.intensity = 0;
    expect(alphaAt(material, [0.5, 0.1])).toBe(0);
  });
});
