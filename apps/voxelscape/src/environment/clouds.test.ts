// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compileGLSL } from "@random-mesh/rmsl";
import { PerspectiveCamera, Scene } from "@random-mesh/rmsl/scene";
import { PerlinNoise3D, DEFAULT_TERRAIN } from "../world/noise";
import {
  buildCloudMesh,
  CLOUD_DEFAULTS,
  CLOUD_TILE,
  CLOUD_VOXEL,
  cloudCellVolume,
  cloudCoverage,
  CloudController,
  CloudMaterial,
  HALF_TILE,
  TILE_CELLS,
  wrapTile,
} from "./clouds";

/** One seeded, tile-periodic puff noise, shared by the field tests. */
const puff = new PerlinNoise3D(42, CLOUD_DEFAULTS.period);

describe("periodic puff noise", () => {
  it("tiles over its period in every axis", () => {
    const n = new PerlinNoise3D(42, 8);
    const points: [number, number, number][] = [
      [0.2, 0.3, 0.4],
      [3.7, 1.2, 2.9],
      [7.99, 0.5, 5.5],
    ];
    for (const [x, y, z] of points) {
      // Adding the period shifts the lattice index by exactly one period but
      // perturbs the fractional part by a last-bit float rounding, so compare
      // to a tight tolerance rather than exactly.
      expect(n.noise(x + 8, y, z)).toBeCloseTo(n.noise(x, y, z), 12);
      expect(n.noise(x, y + 8, z)).toBeCloseTo(n.noise(x, y, z), 12);
      expect(n.noise(x, y, z + 8)).toBeCloseTo(n.noise(x, y, z), 12);
    }
  });

  it("differs between seeds", () => {
    const a = new PerlinNoise3D(1, 8);
    const b = new PerlinNoise3D(2, 8);
    let differing = 0;
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        if (
          a.noise(x + 0.37, 0.5, z + 0.61) !== b.noise(x + 0.37, 0.5, z + 0.61)
        ) {
          differing++;
        }
      }
    }
    expect(differing).toBeGreaterThan(0);
  });
});

describe("cloudCellVolume", () => {
  it("is deterministic for a given seed and cell", () => {
    const a = cloudCellVolume(3, 5, puff, CLOUD_DEFAULTS);
    const b = cloudCellVolume(3, 5, puff, CLOUD_DEFAULTS);
    expect([...a]).toEqual([...b]);
  });

  it("matches the same cell one tile over, so the wrap is seamless", () => {
    const oneEast = cloudCellVolume(0, 3, puff, CLOUD_DEFAULTS);
    const nextTile = cloudCellVolume(TILE_CELLS, 3, puff, CLOUD_DEFAULTS);
    expect([...oneEast]).toEqual([...nextTile]);
    const oneWest = cloudCellVolume(7, 3, puff, CLOUD_DEFAULTS);
    const prevTile = cloudCellVolume(-1, 3, puff, CLOUD_DEFAULTS);
    expect([...oneWest]).toEqual([...prevTile]);
  });

  it("covers about 40% of the sky on the world's default terrain seed", () => {
    const cover = cloudCoverage(DEFAULT_TERRAIN.seed, CLOUD_DEFAULTS);
    expect(cover).toBeGreaterThan(0.35);
    expect(cover).toBeLessThan(0.45);
  });

  it("covers about 40% of the sky on average across seeds", () => {
    const seeds = [1, 2, 3, 42, 99, 123, 2024, 31337];
    const mean =
      seeds.reduce(
        (sum, seed) => sum + cloudCoverage(seed, CLOUD_DEFAULTS),
        0,
      ) / seeds.length;
    expect(mean).toBeGreaterThan(0.34);
    expect(mean).toBeLessThan(0.46);
  });

  it("keeps every puff inside the sky box the volume spans", () => {
    const { voxels, voxel, y } = CLOUD_DEFAULTS;
    const volume = cloudCellVolume(2, 4, puff, CLOUD_DEFAULTS);
    for (let i = 0; i < volume.length; i++) {
      if (volume[i] === 0) {
        continue;
      }
      // The voxel's world height is y0 + (yv + 0.5) * voxel, always within
      // [y - voxels*voxel/2, y + voxels*voxel/2]: assert against the bounds.
      const yv = Math.floor(i / (voxels * voxels));
      const worldY = y - (voxels * voxel) / 2 + (yv + 0.5) * voxel;
      expect(worldY).toBeGreaterThanOrEqual(y - (voxels * voxel) / 2);
      expect(worldY).toBeLessThan(y + (voxels * voxel) / 2);
    }
  });

  it("flattens the puffs: a higher flatness gives a shorter-than-wide field", () => {
    const bbox = (flatness: number): { height: number; width: number } => {
      const { voxels } = CLOUD_DEFAULTS;
      let height = 0;
      let width = 0;
      for (let cz = 0; cz < TILE_CELLS; cz++) {
        for (let cx = 0; cx < TILE_CELLS; cx++) {
          const volume = cloudCellVolume(cx, cz, puff, {
            ...CLOUD_DEFAULTS,
            flatness,
          });
          let minX = voxels;
          let maxX = -1;
          let minY = voxels;
          let maxY = -1;
          for (let i = 0; i < volume.length; i++) {
            if (volume[i] === 0) {
              continue;
            }
            const x = i % voxels;
            const y = Math.floor(i / (voxels * voxels));
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          if (maxX < 0) {
            continue;
          }
          width += maxX - minX + 1;
          height += maxY - minY + 1;
        }
      }
      return { height, width };
    };

    const flat = bbox(CLOUD_DEFAULTS.flatness);
    const round = bbox(1);
    expect(flat.height / flat.width).toBeLessThan(round.height / round.width);
  });
});

describe("buildCloudMesh", () => {
  it("emits surface quads for a solid cube and nothing for an empty volume", () => {
    const { voxels } = CLOUD_DEFAULTS;
    const cube = new Uint8Array(voxels * voxels * voxels);
    for (let y = 0; y < 2; y++) {
      for (let z = 0; z < 2; z++) {
        for (let x = 0; x < 2; x++) {
          cube[(y * voxels + z) * voxels + x] = 1;
        }
      }
    }
    const solid = buildCloudMesh(cube, voxels, CLOUD_VOXEL);
    // A 2x2x2 block of voxels has 6 faces of 4 quads each; each quad is two
    // triangles, so 6 * 4 * 2 = 48.
    expect(solid.indices.length / 3).toBe(6 * 4 * 2);

    const empty = buildCloudMesh(
      new Uint8Array(voxels * voxels * voxels),
      voxels,
      CLOUD_VOXEL,
    );
    expect(empty.indices.length).toBe(0);
    expect(empty.positions.length).toBe(0);
  });
});

describe("wrapTile", () => {
  it("keeps every value within half a tile of the origin", () => {
    for (const v of [
      -2 * HALF_TILE,
      -HALF_TILE,
      -HALF_TILE + 1,
      0,
      HALF_TILE - 1,
      HALF_TILE,
      100000,
    ]) {
      const wrapped = wrapTile(v, HALF_TILE);
      expect(wrapped).toBeGreaterThanOrEqual(-HALF_TILE);
      expect(wrapped).toBeLessThan(HALF_TILE);
    }
  });

  it("wraps a position past one edge to just inside the other", () => {
    expect(wrapTile(HALF_TILE + 5, HALF_TILE)).toBeCloseTo(-HALF_TILE + 5);
    expect(wrapTile(-HALF_TILE - 5, HALF_TILE)).toBeCloseTo(HALF_TILE - 5);
  });
});

describe("CloudController", () => {
  const camera = (x: number, z: number): PerspectiveCamera => {
    const cam = new PerspectiveCamera(50, 1, 0.1, 1000);
    cam.position.set(x, 0, z);
    return cam;
  };

  it("builds a deterministic field from the seed", () => {
    const a = new CloudController({ seed: 42 });
    const b = new CloudController({ seed: 42 });
    const c = new CloudController({ seed: 7 });
    expect(a.puffCount).toBe(b.puffCount);
    expect(a.puffCount).not.toBe(c.puffCount);
  });

  it("keeps every puff within half a tile of the camera, wherever the camera is", () => {
    const clouds = new CloudController({ seed: 42 });
    for (const [x, z] of [
      [0, 0],
      [300, -200],
      [100000, -50000],
    ] as [number, number][]) {
      clouds.tick(0, camera(x, z));
      for (const mesh of clouds.cloudField.children) {
        const p = mesh.position;
        expect(Math.abs(p.x - x)).toBeLessThanOrEqual(HALF_TILE);
        expect(Math.abs(p.z - z)).toBeLessThanOrEqual(HALF_TILE);
        expect(p.y).toBeCloseTo(CLOUD_DEFAULTS.y);
      }
    }
  });

  it("shows clouds on every side of the player at the world origin", () => {
    const clouds = new CloudController({ seed: 42 });
    clouds.tick(0, camera(0, 0));
    let negative = { x: false, z: false };
    let positive = { x: false, z: false };
    for (const mesh of clouds.cloudField.children) {
      const p = mesh.position;
      if (p.x < 0) negative.x = true;
      if (p.z < 0) negative.z = true;
      if (p.x > 0) positive.x = true;
      if (p.z > 0) positive.z = true;
    }
    expect(negative.x).toBe(true);
    expect(negative.z).toBe(true);
    expect(positive.x).toBe(true);
    expect(positive.z).toBe(true);
  });

  it("keeps every mesh at its world position as the camera walks, up to a whole tile", () => {
    const clouds = new CloudController({ seed: 42 });
    clouds.tick(0, camera(300, -200));
    const before = clouds.cloudField.children.map((m) => [
      m.position.x,
      m.position.z,
    ]);
    clouds.tick(0, camera(400, -250));
    const after = clouds.cloudField.children.map((m) => [
      m.position.x,
      m.position.z,
    ]);
    expect(before.length).toBeGreaterThan(0);
    for (let i = 0; i < before.length; i++) {
      // A mesh either stays put or jumps a whole tile (a period of the field
      // itself), so the sky's pattern is anchored to the world — a flying
      // player still passes through a puff instead of it retreating.
      expect((after[i][0] - before[i][0]) % CLOUD_TILE).toBeCloseTo(0, 6);
      expect((after[i][1] - before[i][1]) % CLOUD_TILE).toBeCloseTo(0, 6);
    }
  });

  it("holds the field against the world as the camera crosses a tile boundary", () => {
    const clouds = new CloudController({ seed: 42 });
    clouds.tick(0, camera(100, 0));
    const near = clouds.cloudField.children.map((m) => [
      m.position.x - 100,
      m.position.z,
    ]);
    clouds.tick(0, camera(100 + CLOUD_TILE, 0));
    const far = clouds.cloudField.children.map((m) => [
      m.position.x - (100 + CLOUD_TILE),
      m.position.z,
    ]);
    for (let i = 0; i < near.length; i++) {
      expect(far[i][0]).toBeCloseTo(near[i][0], 6);
      expect(far[i][1]).toBeCloseTo(near[i][1], 6);
    }
  });

  it("drifts every puff by the wind each tick", () => {
    const clouds = new CloudController({ seed: 42, wind: [2, 0] });
    clouds.tick(0, camera(512, 0));
    const before = clouds.cloudField.children.map((m) => m.position.x);
    clouds.tick(1, camera(512, 0));
    const after = clouds.cloudField.children.map((m) => m.position.x);
    expect(before.length).toBeGreaterThan(0);
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toBeCloseTo(before[i] + 2, 6);
    }
  });

  it("returns to the same pattern after a full tile of wind drift", () => {
    const clouds = new CloudController({ seed: 42, wind: [2, 0] });
    clouds.tick(0, camera(512, 0));
    const atStart = clouds.cloudField.children.map((m) => m.position.x);
    clouds.tick(CLOUD_TILE / 2, camera(512, 0));
    const afterWrap = clouds.cloudField.children.map((m) => m.position.x);
    for (let i = 0; i < atStart.length; i++) {
      expect(afterWrap[i]).toBeCloseTo(atStart[i], 6);
    }
  });

  it("hides and reveals the field through setVisible", () => {
    const clouds = new CloudController({ seed: 42 });
    expect(clouds.visible).toBe(true);
    clouds.setVisible(false);
    expect(clouds.cloudField.visible).toBe(false);
    expect(clouds.visible).toBe(false);
    clouds.setVisible(true);
    expect(clouds.cloudField.visible).toBe(true);
  });
});

describe("cloud material", () => {
  it("compiles to GLSL with its uniforms and the day-night terms", () => {
    const material = new CloudMaterial();
    const program = material.build(new Scene());
    expect(() => compileGLSL.vertex(program.vertexRoot)).not.toThrow();
    const fragment = compileGLSL.fragment(program.fragmentRoot);
    expect(fragment).toContain("fogColor");
    expect(fragment).toContain("sunLightColor");
  });
});
