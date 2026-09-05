// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DataTexture, Scene } from "@random-mesh/rmsl/scene";
import { fromProgram, type ProgramRunner } from "@random-mesh/rmsl/test";
import { TriangleMaterial, TriangleWaterMaterial } from "./triangle-renderer";

/** The unit vector the default sun shines from. */
const SUN: [number, number, number] = [
  1 / Math.sqrt(6),
  2 / Math.sqrt(6),
  1 / Math.sqrt(6),
];

const shadeTerrain = (material: TriangleMaterial): ProgramRunner =>
  fromProgram(material.build(new Scene()));

/**
 * What the terrain material paints on a surface with `normal`, sitting
 * `distance` world units straight ahead of the camera.
 */
const surface = (
  material: TriangleMaterial,
  options: {
    normal?: [number, number, number];
    distance?: number;
    uv?: [number, number];
    brightness?: number;
  } = {},
): number[] => {
  const {
    normal = [0, 1, 0],
    distance = 0,
    uv = [0, 0],
    brightness = 1,
  } = options;
  const value = shadeTerrain(material)({
    varyings: {
      normalWorld: normal,
      positionWorld: [0, 0, distance],
      uv,
      brightness,
    },
    uniforms: { cameraPosition: [0, 0, 0] },
  }).value;
  if (value === null) throw new Error("the fragment discarded");
  return value;
};

/**
 * What the water material paints where the surface point sits at
 * `positionWorld`, seen from the origin — the direction to it is what the
 * Fresnel term reads.
 */
const water = (
  material: TriangleWaterMaterial,
  positionWorld: [number, number, number],
): number[] => {
  const value = fromProgram(material.build(new Scene()))({
    varyings: { positionWorld, brightness: 1 },
    uniforms: { cameraPosition: [0, 0, 0] },
  }).value;
  if (value === null) throw new Error("the fragment discarded");
  return value;
};

describe("terrain lighting", () => {
  it("lights a surface by how squarely it faces the sun", () => {
    const material = new TriangleMaterial();
    const facing = surface(material, { normal: SUN });
    const away = surface(material, { normal: SUN.map((v) => -v) as never });

    // the untextured albedo is flat blue, so the blue channel carries the light
    expect(facing[2]).toBeCloseTo(1.2, 6);
    expect(away[2]).toBeCloseTo(0.2, 6);
    expect(facing[3]).toBe(1);
  });

  it("lights the night side with the moon instead", () => {
    const material = new TriangleMaterial();
    material.sunLightColor = [0, 0, 0];
    material.moonLightColor = [0.3, 0.3, 0.4];
    const moonlit = surface(material, {
      normal: material.moonDirection,
    });
    const shadowed = surface(material, {
      normal: material.moonDirection.map((v) => -v) as never,
    });

    expect(moonlit[2]).toBeCloseTo(0.6, 6);
    expect(shadowed[2]).toBeCloseTo(0.2, 6);
  });

  it("takes the albedo from the tile atlas at the baked coordinate", () => {
    const material = new TriangleMaterial();
    material.ambientColor = [1, 1, 1];
    material.sunLightColor = [0, 0, 0];
    // one texel per corner of a two-by-two atlas, sampled at its centre
    material.tilesTexture = new DataTexture(
      // prettier-ignore
      new Uint8Array([
        255, 0, 0, 255,   0, 255, 0, 255,
        0, 0, 255, 255,   255, 255, 0, 255,
      ]),
      2,
      2,
    );

    expect(surface(material, { uv: [0.25, 0.25] }).slice(0, 3)).toEqual([
      1, 0, 0,
    ]);
    expect(surface(material, { uv: [0.75, 0.75] }).slice(0, 3)).toEqual([
      1, 1, 0,
    ]);
  });
});

describe("terrain fog", () => {
  it("leaves a surface within the fog start untouched", () => {
    const material = new TriangleMaterial();
    expect(surface(material, { distance: material.fogStart })).toEqual(
      surface(material, { distance: 0 }),
    );
  });

  it("paints the sky colour at the render distance", () => {
    const material = new TriangleMaterial();
    material.fogColor = [0.4, 0.6, 0.8];
    expect(surface(material, { distance: material.maxDistance })).toEqual([
      ...material.fogColor,
      1,
    ]);
  });

  it("fades towards the sky colour with distance", () => {
    const material = new TriangleMaterial();
    material.fogColor = [1, 0, 0];
    const reds = [200, 280, 360, 440, 480].map(
      (distance) => surface(material, { distance })[0],
    );
    for (let i = 1; i < reds.length; i++) {
      expect(reds[i]).toBeGreaterThan(reds[i - 1]);
    }
    expect(reds[0]).toBe(0);
    expect(reds.at(-1)).toBe(1);
  });
});

describe("water surface", () => {
  it("shows the water colour when looked at from straight above", () => {
    const material = new TriangleWaterMaterial();
    const [r, g, b, alpha] = water(material, [0, -10, 0]);
    const fresnel = 0.05;

    for (const [channel, value] of [r, g, b].entries()) {
      const mixed =
        material.waterColor[channel] * (1 - fresnel) +
        material.fogColor[channel] * fresnel;
      expect(value).toBeCloseTo(mixed, 6);
    }
    expect(alpha).toBeCloseTo(material.waterOpacity + fresnel, 6);
  });

  it("reflects the sky at a grazing angle", () => {
    const material = new TriangleWaterMaterial();
    const [r, g, b, alpha] = water(material, [10, 0, 0]);
    expect([r, g, b]).toEqual(material.fogColor);
    expect(alpha).toBe(1);
  });

  it("reflects more sky the flatter the view onto it is", () => {
    const material = new TriangleWaterMaterial();
    material.fogColor = [1, 1, 1];
    material.waterColor = [0, 0, 0];
    const brightness = [10, 5, 2, 1, 0.5].map(
      (height) => water(material, [10, -height, 0])[0],
    );
    for (let i = 1; i < brightness.length; i++) {
      expect(brightness[i]).toBeGreaterThan(brightness[i - 1]);
    }
  });

  it("never draws the surface more opaque than solid", () => {
    const material = new TriangleWaterMaterial();
    material.waterOpacity = 1;
    for (const point of [
      [0, -10, 0],
      [10, -1, 0],
      [10, 0, 0],
    ] as [number, number, number][]) {
      expect(water(material, point)[3]).toBe(1);
    }
  });
});
