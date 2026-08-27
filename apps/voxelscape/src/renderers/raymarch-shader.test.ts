// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compileGLSL } from "@random-mesh/rmsl";
import { DataTexture, Scene } from "@random-mesh/rmsl/scene";
import { fromProgram } from "@random-mesh/rmsl/test";
import { Level, type WorldBlock } from "../world/level-data";
import { VOXEL_GRASS, VOXEL_WATER, VoxelStore } from "../world/voxel-store";
import { RaymarchMaterial, RaymarchWaterMaterial } from "./raymarch-renderer";

/** Voxels along each axis of the test block: two broad cells of four voxels. */
const VOXELS = 8;

/** Where the block's local space ends, in world units, on every axis. */
const HALF = VOXELS / 2;

/** The unit vector the default sun shines from. */
const SUN: [number, number, number] = [
  1 / Math.sqrt(6),
  2 / Math.sqrt(6),
  1 / Math.sqrt(6),
];

/**
 * A block of `VOXELS` cubed one-unit voxels centred on the origin, holding
 * whatever `fill` writes into its level. Voxel `(x, y, z)` occupies the world
 * cube from `(x, y, z) - HALF` to one unit further along each axis.
 */
const testBlock = (fill: (level: Level) => void = () => {}): WorldBlock => {
  const level = new Level({
    broadDim: [2, 2, 2],
    chunkDim: [4, 4, 4],
    storageDim: [VOXELS, VOXELS, VOXELS],
    dimensions: [VOXELS, VOXELS, VOXELS],
  });
  fill(level);
  return {
    level,
    center: [0, 0, 0],
    store: new VoxelStore({
      dims: [VOXELS, VOXELS, VOXELS],
      voxels: [VOXELS, VOXELS, VOXELS],
      scale: 1,
    }),
  };
};

/** Fills one horizontal layer of a level, edge to edge. */
const layer = (level: Level, y: number, voxel: number): void => {
  for (let x = 0; x < VOXELS; x++) {
    for (let z = 0; z < VOXELS; z++) {
      level.set(x, y, z, voxel);
    }
  }
};

/**
 * What the terrain material paints for a ray leaving `camera` towards
 * `towards`, both in world space. The varying carries the point on the block's
 * bounding box the fragment belongs to, which is what sets the ray's
 * direction.
 */
const march = (
  material: RaymarchMaterial,
  camera: [number, number, number],
  towards: [number, number, number],
): { colour: number[]; fragDepth: number | undefined } => {
  const result = fromProgram(material.build(new Scene()))({
    varyings: { vModelPos: towards },
    uniforms: { cameraPosition: camera },
  });
  if (result.value === null) throw new Error("the fragment discarded");
  return { colour: result.value, fragDepth: result.fragDepth };
};

/** A terrain material marching one block, with no tile atlas applied. */
const terrain = (block: WorldBlock): RaymarchMaterial => {
  const material = new RaymarchMaterial();
  material.setBlocks([block]);
  return material;
};

/** The one-block world every marching test starts from: a floor at `y = 0`. */
const floorBlock = (): WorldBlock =>
  testBlock((level) => layer(level, 0, VOXEL_GRASS));

describe("terrain marching", () => {
  it("hits the floor below the camera and lights it as an upward face", () => {
    const block = floorBlock();
    const { colour, fragDepth } = march(
      terrain(block),
      [0, HALF - 0.5, 0],
      [0, -HALF, 0],
    );

    // the untextured albedo is flat blue, so the blue channel carries the light
    expect(colour[2]).toBeCloseTo(0.2 + SUN[1], 4);
    expect(colour[3]).toBe(1);
    expect(fragDepth).toBeLessThan(1);
  });

  it("lights a wall the sun strikes at a slant less than a floor", () => {
    const block = testBlock((level) => {
      for (let y = 0; y < VOXELS; y++) {
        for (let z = 0; z < VOXELS; z++) level.set(0, y, z, VOXEL_GRASS);
      }
    });
    const wall = march(terrain(block), [HALF + 2, 0, 0], [-HALF, 0, 0]);

    // the wall's normal faces +x, which meets the sun at a third of the angle
    expect(wall.colour[2]).toBeCloseTo(0.2 + SUN[0], 4);
    expect(wall.colour[3]).toBe(1);
  });

  it("leaves a ray that meets nothing transparent, at the far plane", () => {
    const block = floorBlock();
    const { colour, fragDepth } = march(
      terrain(block),
      [0, 0, 0],
      [0, HALF, 0],
    );

    expect(colour).toEqual([0, 0, 0, 0]);
    expect(fragDepth).toBe(1);
  });

  it("draws nothing beyond the render distance", () => {
    const block = floorBlock();
    const material = terrain(block);
    material.maxDistance = 1;

    expect(march(material, [0, HALF - 0.5, 0], [0, -HALF, 0]).colour).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("fades a hit into the sky colour the further off it is", () => {
    const block = floorBlock();
    const material = terrain(block);
    material.fogStart = 0;
    material.maxDistance = 40;
    material.fogColor = [1, 0, 0];

    const reds = [0, 1, 2, 3].map(
      (height) =>
        march(material, [0, HALF - 0.5 + height, 0], [0, -HALF, 0]).colour[0],
    );
    for (let i = 1; i < reds.length; i++) {
      expect(reds[i]).toBeGreaterThan(reds[i - 1]);
    }
  });

  it("marches straight through water to the bed below it", () => {
    const dry = floorBlock();
    const flooded = testBlock((level) => {
      layer(level, 0, VOXEL_GRASS);
      for (let y = 1; y < 4; y++) layer(level, y, VOXEL_WATER);
    });
    const camera: [number, number, number] = [0, HALF - 0.5, 0];

    expect(march(terrain(flooded), camera, [0, -HALF, 0])).toEqual(
      march(terrain(dry), camera, [0, -HALF, 0]),
    );
  });

  it("looks past the voxel a camera is buried in", () => {
    const block = testBlock((level) => {
      layer(level, 0, VOXEL_GRASS);
      layer(level, 1, VOXEL_GRASS);
      layer(level, 3, VOXEL_GRASS);
    });
    const buried: [number, number, number] = [0, -HALF + 0.5, 0];
    const { colour } = march(terrain(block), buried, [0, HALF, 0]);

    // the ceiling of the gap faces down, away from the sun, so it is lit by
    // the ambient term alone — and shaded at all only because the march left
    // the solid it started inside before it began registering hits
    expect(colour[2]).toBeCloseTo(0.2, 6);
    expect(colour[3]).toBe(1);
  });
});

describe("terrain tile atlas", () => {
  /** One texel a corner, so a degenerate rectangle picks a colour outright. */
  const ATLAS = new DataTexture(
    // prettier-ignore
    new Uint8Array([
      255, 0, 0, 255,   0, 255, 0, 255,
      0, 0, 255, 255,   255, 255, 0, 255,
    ]),
    2,
    2,
  );
  const RED: [number, number, number, number] = [0.25, 0.25, 0.25, 0.25];
  const GREEN: [number, number, number, number] = [0.75, 0.25, 0.75, 0.25];
  const BLUE: [number, number, number, number] = [0.25, 0.75, 0.25, 0.75];

  const textured = (block: WorldBlock): RaymarchMaterial => {
    const material = terrain(block);
    material.tilesTexture = ATLAS;
    material.voxelTiles = [
      { id: VOXEL_GRASS, top: RED, side: GREEN, bottom: BLUE },
    ];
    material.ambientColor = [1, 1, 1];
    material.sunLightColor = [0, 0, 0];
    return material;
  };

  it("takes the top, side and bottom tile from the face that was hit", () => {
    const block = testBlock((level) => {
      layer(level, 0, VOXEL_GRASS);
      layer(level, 1, VOXEL_GRASS);
      layer(level, 3, VOXEL_GRASS);
    });
    const material = textured(block);
    const above: [number, number, number] = [0, HALF - 0.5, 0];
    const buried: [number, number, number] = [0, -HALF + 0.5, 0];

    const top = march(material, above, [0, -HALF, 0]).colour;
    const bottom = march(material, buried, [0, HALF, 0]).colour;
    const alongside: [number, number, number] = [HALF + 2, -HALF + 1.5, 0];
    const side = march(material, alongside, [-HALF, -HALF + 1.5, 0]).colour;

    expect(top.slice(0, 3)).toEqual([1, 0, 0]);
    expect(side.slice(0, 3)).toEqual([0, 1, 0]);
    expect(bottom.slice(0, 3)).toEqual([0, 0, 1]);
  });

  it("leaves a voxel no tile names unlit rather than blue", () => {
    const block = testBlock((level) => layer(level, 0, 7));
    const { colour } = march(
      textured(block),
      [0, HALF - 0.5, 0],
      [0, -HALF, 0],
    );

    expect(colour).toEqual([0, 0, 0, 1]);
  });
});

describe("water marching", () => {
  const waterBlock = (): WorldBlock =>
    testBlock((level) => {
      layer(level, 0, VOXEL_GRASS);
      layer(level, 1, VOXEL_WATER);
    });

  const marchWater = (
    material: RaymarchWaterMaterial,
    camera: [number, number, number],
    towards: [number, number, number],
  ): { colour: number[]; fragDepth: number | undefined } => {
    const result = fromProgram(material.build(new Scene()))({
      varyings: { vModelPos: towards },
      uniforms: { cameraPosition: camera },
    });
    if (result.value === null) throw new Error("the fragment discarded");
    return { colour: result.value, fragDepth: result.fragDepth };
  };

  const water = (block: WorldBlock): RaymarchWaterMaterial => {
    const material = new RaymarchWaterMaterial();
    material.setBlocks([block]);
    material.seaLevel = -HALF + 2;
    return material;
  };

  it("reflects the sky off the surface it finds, by the viewing angle", () => {
    const block = waterBlock();
    const material = water(block);
    const { colour, fragDepth } = marchWater(
      material,
      [0, HALF - 0.5, 0],
      [0, -HALF, 0],
    );

    const fresnel = 0.05;
    for (const [channel, value] of colour.slice(0, 3).entries()) {
      expect(value).toBeCloseTo(
        material.waterColor[channel] * (1 - fresnel) +
          material.fogColor[channel] * fresnel,
        6,
      );
    }
    expect(colour[3]).toBeCloseTo(material.waterOpacity + fresnel, 6);
    expect(fragDepth).toBeLessThan(1);
  });

  it("draws nothing where the ray meets no water", () => {
    const block = testBlock((level) => layer(level, 0, VOXEL_GRASS));
    expect(
      marchWater(water(block), [0, HALF - 0.5, 0], [0, -HALF, 0]).colour,
    ).toEqual([0, 0, 0, 0]);
  });
});

describe("underwater tint", () => {
  const waterMaterial = (): RaymarchWaterMaterial => {
    const material = new RaymarchWaterMaterial();
    material.setBlocks([testBlock()]);
    return material;
  };

  const waterAt = (
    material: RaymarchWaterMaterial,
    cameraPosition: [number, number, number],
    towards: [number, number, number] = [0, -HALF, 0],
  ): { colour: number[]; fragDepth: number | undefined } => {
    const result = fromProgram(material.build(new Scene()))({
      varyings: { vModelPos: towards },
      uniforms: { cameraPosition },
    });
    if (result.value === null) throw new Error("the fragment discarded");
    return { colour: result.value, fragDepth: result.fragDepth };
  };

  it("thickens the tint the deeper the camera sits below the sea", () => {
    const material = waterMaterial();
    material.seaLevel = 2;
    const depths = [0, 1, 2, 4];
    const alphas = depths.map(
      (depth) => waterAt(material, [0, 2 - depth, 0]).colour[3],
    );

    expect(alphas[0]).toBe(0);
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeGreaterThan(alphas[i - 1]);
      expect(alphas[i]).toBeCloseTo(
        1 - Math.exp(-material.waterExtinction * depths[i]),
        6,
      );
    }
  });

  it("tints the whole view in the water colour, right up against the camera", () => {
    const material = waterMaterial();
    material.seaLevel = 3;
    material.waterColor = [0.2, 0.4, 0.6];
    const { colour, fragDepth } = waterAt(material, [0, 0, 0]);

    expect(colour.slice(0, 3)).toEqual(material.waterColor);
    expect(fragDepth).toBeCloseTo(0.0001, 8);
  });

  it("leaves the view clear for a camera above the sea", () => {
    const material = waterMaterial();
    material.seaLevel = -2;
    expect(waterAt(material, [0, 0, 0]).colour).toEqual([0, 0, 0, 0]);
  });

  it("leaves the view clear for a camera outside every block", () => {
    const material = waterMaterial();
    material.seaLevel = 1000;
    expect(waterAt(material, [0, 500, 0]).colour).toEqual([0, 0, 0, 0]);
  });
});

describe("raymarch shader compilation", () => {
  it("draws nothing until the material has blocks", () => {
    const shade = fromProgram(new RaymarchMaterial().build(new Scene()));
    expect(shade().value).toEqual([0, 0, 0, 0]);
  });

  it("compiles a one-block world to GLSL", () => {
    const block = floorBlock();
    const program = terrain(block).build(new Scene());

    expect(compileGLSL.vertex(program.vertexRoot)).toContain(
      "projectionMatrix",
    );
    const fragment = compileGLSL.fragment(program.fragmentRoot);
    expect(fragment).toContain("b0_broadVoxels");
    expect(fragment).toContain("b0_fineVoxels");
  });

  it("compiles the fetch-count heatmap as its own shader", () => {
    const material = terrain(testBlock());
    const shaded = compileGLSL.fragment(
      material.build(new Scene()).fragmentRoot,
    );
    material.debugFetchCount = true;
    const counted = compileGLSL.fragment(
      material.build(new Scene()).fragmentRoot,
    );

    expect(counted).not.toEqual(shaded);
  });

  it("compiles the water pass to GLSL", () => {
    const material = new RaymarchWaterMaterial();
    material.setBlocks([testBlock()]);
    const program = material.build(new Scene());

    expect(compileGLSL.vertex(program.vertexRoot)).toContain(
      "projectionMatrix",
    );
    expect(compileGLSL.fragment(program.fragmentRoot)).toContain("waterColor");
  });
});
