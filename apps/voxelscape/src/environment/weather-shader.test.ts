// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compileGLSL } from "@random-mesh/rmsl";
import { Line2NodeMaterial, Scene } from "@random-mesh/rmsl/scene";
import { fromProgram, render } from "@random-mesh/rmsl/test";
import { ParticleMaterial } from "./weather-controller";

/**
 * The per-particle attributes for a single vertex of one quad, as
 * `makeParticleGeometry` lays them out. A test overrides the few that carry
 * what it is asking about.
 */
const PARTICLE = {
  particlePos: [0, 0, 0],
  corner: [0, 0],
  drift: [0, 0, 0],
  life: 10,
  offset: 0,
  size: [1, 1],
  spin: 0,
  uv: [0.5, 0.5],
};

/**
 * The alpha the fragment stage gives one point of the quad, `uv` running from
 * zero at one corner to one at the opposite one.
 */
const alphaAt = (
  material: ParticleMaterial,
  uv: [number, number],
  fade = 1,
): number => {
  const shade = fromProgram(material.build(new Scene()));
  const value = shade({ varyings: { vUv: uv, vFade: fade } }).value;
  if (value === null) throw new Error("the fragment discarded");
  return value[3];
};

/**
 * Where the vertex stage puts one particle. With no camera on the scene the
 * view and projection matrices are the identity, so what comes back out of
 * clip space is the world position the shader computed.
 */
const worldPosition = (
  material: ParticleMaterial,
  attributes: Partial<typeof PARTICLE> = {},
): number[] => {
  const transform = fromProgram(material.build(new Scene()), {
    stage: "vertex",
  });
  const value = transform({ attributes: { ...PARTICLE, ...attributes } }).value;
  if (value === null) throw new Error("the vertex stage produced nothing");
  return value;
};

/** The lifetime fade the vertex stage passes to the fragment stage. */
const fadeOf = (material: ParticleMaterial): number => {
  const transform = fromProgram(material.build(new Scene()), {
    stage: "vertex",
  });
  return transform({ attributes: PARTICLE }).varyings.vFade as number;
};

const rain = (): ParticleMaterial => {
  const material = new ParticleMaterial();
  material.tint = [0.75, 0.8, 0.9];
  material.sway = 0.4;
  material.intensity = 1;
  return material;
};

const snow = (): ParticleMaterial => {
  const material = new ParticleMaterial();
  material.tint = [0.95, 0.97, 1];
  material.sway = 1.6;
  material.disc = true;
  material.intensity = 1;
  return material;
};

describe("particle fragment shape", () => {
  it("paints the tint at full alpha in the middle of the quad", () => {
    const material = rain();
    const shade = fromProgram(material.build(new Scene()));
    expect(shade.unbound).toEqual([]);
    expect(shade({ varyings: { vUv: [0.5, 0.5], vFade: 1 } }).value).toEqual([
      0.75, 0.8, 0.9, 1,
    ]);
  });

  it("leaves the corners of the quad transparent", () => {
    for (const corner of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as [number, number][]) {
      expect(alphaAt(rain(), corner)).toBe(0);
      expect(alphaAt(snow(), corner)).toBe(0);
    }
  });

  it("scales alpha by the storm intensity and the lifetime fade", () => {
    const material = rain();
    material.intensity = 0.5;
    expect(alphaAt(material, [0.5, 0.5], 0.5)).toBeCloseTo(0.25, 6);
    material.intensity = 0;
    expect(alphaAt(material, [0.5, 0.5])).toBe(0);
  });

  it("falls off radially for snow and along the axes for rain", () => {
    const distance = 0.25;
    const diagonal = distance / Math.SQRT2;
    const axis: [number, number] = [0.5 + distance, 0.5];
    const corner: [number, number] = [0.5 + diagonal, 0.5 + diagonal];

    expect(alphaAt(snow(), axis)).toBeCloseTo(alphaAt(snow(), corner), 6);
    expect(alphaAt(rain(), corner)).toBeGreaterThan(alphaAt(rain(), axis));
  });

  it("fades snow out over the outer rim of the disc", () => {
    const material = snow();
    const alphas = [0, 0.2, 0.4, 0.42, 0.45, 0.48, 0.5].map((radius) =>
      alphaAt(material, [0.5 + radius, 0.5]),
    );
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeLessThanOrEqual(alphas[i - 1]);
    }
    expect(alphas[0]).toBe(1);
    expect(alphas.at(-1)).toBe(0);
  });

  it("covers the quad with a round flake and a squarer drop", () => {
    const cover = (material: ParticleMaterial): string =>
      render(fromProgram(material.build(new Scene())), {
        width: 24,
        height: 12,
        inputs: ({ u, v }) => ({ varyings: { vUv: [u, v], vFade: 1 } }),
      }).toAscii();

    expect(cover(snow())).toMatchInlineSnapshot(`
      "        .-=++=-.        
          .=#@@@@@@@@@@#=.    
         +%@@@@@@@@@@@@@@%+   
       .*@@@@@@@@@@@@@@@@@@*. 
       +@@@@@@@@@@@@@@@@@@@@+ 
      .#@@@@@@@@@@@@@@@@@@@@#.
      .#@@@@@@@@@@@@@@@@@@@@#.
       +@@@@@@@@@@@@@@@@@@@@+ 
       .*@@@@@@@@@@@@@@@@@@*. 
         +%@@@@@@@@@@@@@@%+   
          .=#@@@@@@@@@@#=.    
              .-=++=-.        "
    `);
    expect(cover(rain())).toMatchInlineSnapshot(`
      "                        
                              
                              
            :##########:      
            -##########-      
            -##########-      
            -##########-      
            -##########-      
            :##########:      
                              
                              
                              "
    `);
  });
});

describe("particle vertex motion", () => {
  it("keeps every particle within half a tile of the camera", () => {
    const material = rain();
    material.tileSize = 200;
    material.camPos = [1517, 0, -913];
    const [x, , z] = worldPosition(material, { particlePos: [40, 5, 160] });
    expect(Math.abs(x - material.camPos[0])).toBeLessThanOrEqual(100);
    expect(Math.abs(z - material.camPos[2])).toBeLessThanOrEqual(100);
  });

  it("holds the field still against the camera as it crosses a tile", () => {
    const material = rain();
    const attributes = { particlePos: [40, 5, 160] };

    material.camPos = [0, 0, 0];
    const near = worldPosition(material, attributes);
    material.camPos = [material.tileSize, 0, -2 * material.tileSize];
    const far = worldPosition(material, attributes);

    for (const axis of [0, 1, 2]) {
      expect(far[axis] - material.camPos[axis]).toBeCloseTo(near[axis], 5);
    }
  });

  it("returns a particle to its starting point after one lifetime", () => {
    const material = snow();
    material.sway = 0;
    const attributes = { particlePos: [3, 20, -7], drift: [1, -18, 0.5] };

    material.time = 0;
    const start = worldPosition(material, attributes);
    material.time = PARTICLE.life;
    const recycled = worldPosition(material, attributes);

    expect(recycled).toSatisfy((p: number[]) =>
      p.every((v, axis) => Math.abs(v - start[axis]) < 1e-5),
    );
  });

  it("carries a particle along its drift as its lifetime runs", () => {
    const material = rain();
    const attributes = { particlePos: [0, 30, 0], drift: [0, -20, 0] };

    material.time = 0;
    const [, top] = worldPosition(material, attributes);
    material.time = PARTICLE.life / 2;
    const [, middle] = worldPosition(material, attributes);

    expect(top).toBeCloseTo(30, 5);
    expect(middle).toBeCloseTo(20, 5);
  });

  it("sways snow sideways over time and leaves rain falling straight", () => {
    const swaying = snow();
    const straight = rain();
    straight.sway = 0;
    const attributes = { particlePos: [0, 10, 0] };

    const sampleX = (material: ParticleMaterial, time: number): number => {
      material.time = time;
      return worldPosition(material, attributes)[0];
    };

    const swayed = [0.5, 1, 1.5, 2].map((t) => sampleX(swaying, t));
    expect(Math.max(...swayed) - Math.min(...swayed)).toBeGreaterThan(0.1);
    for (const t of [0.5, 1, 1.5, 2]) {
      expect(sampleX(straight, t)).toBeCloseTo(0, 6);
    }
  });

  it("hides a particle at both ends of its lifetime", () => {
    const material = rain();

    material.time = 0;
    expect(fadeOf(material)).toBe(0);
    material.time = PARTICLE.life / 2;
    expect(fadeOf(material)).toBe(1);
    material.time = PARTICLE.life * 0.999;
    expect(fadeOf(material)).toBeLessThan(0.01);
  });

  it("shrinks the quad to nothing where the fade is zero", () => {
    const material = rain();
    material.sway = 0;
    const attributes = { corner: [1, 1], size: [4, 4] };

    material.time = PARTICLE.life / 2;
    const open = worldPosition(material, attributes);
    material.time = 0;
    const closed = worldPosition(material, attributes);

    expect(open[0]).toBeCloseTo(4, 5);
    expect(open[1]).toBeCloseTo(4, 5);
    expect(closed[0]).toBeCloseTo(0, 6);
    expect(closed[1]).toBeCloseTo(0, 6);
  });
});

describe("weather shader compilation", () => {
  it("declares every per-particle attribute the geometry provides", () => {
    const program = new ParticleMaterial().build(new Scene());
    const names = program.attributes.map((a) => a.name);
    for (const expected of Object.keys(PARTICLE)) {
      expect(names).toContain(expected);
    }
  });

  it("compiles the rain and snow materials to GLSL", () => {
    for (const material of [rain(), snow()]) {
      const program = material.build(new Scene());
      expect(compileGLSL.vertex(program.vertexRoot)).toContain("viewMatrix");
      expect(compileGLSL.fragment(program.fragmentRoot)).toContain("tint");
    }
  });

  it("compiles a world-units lightning bolt material", () => {
    const bolt = new Line2NodeMaterial({
      color: 0xcfe0ff,
      linewidth: 0.7,
      worldUnits: true,
      transparent: true,
      opacity: 1,
    });
    const program = bolt.build(new Scene());
    expect(() => compileGLSL.vertex(program.vertexRoot)).not.toThrow();
    expect(() => compileGLSL.fragment(program.fragmentRoot)).not.toThrow();
  });
});
