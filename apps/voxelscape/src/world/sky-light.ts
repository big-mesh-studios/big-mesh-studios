// Sky light propagation for one block: sunlight entering from above the
// terrain spreads through the open air so caves dim with depth and darken to
// nothing the deeper they go. Computed on the block's own `VoxelStore` (1-voxel
// meshing border included), so a cave opening that reaches the block's edge
// bleeds light from the border cells, and a seam face shades against the
// neighbour's light it holds.
import type { Dim3 } from "./level-data";
import { getHeightAt, type TerrainConfig } from "./noise";
import {
  LEVEL_MASK,
  MAX_LIGHT,
  shiftOfChannel,
  type LightChannel,
  type LightStore,
} from "./light-store";
import {
  VOXEL_AIR,
  VOXEL_CLOUD,
  isWaterId,
  type VoxelStore,
} from "./voxel-store";

/** A signed voxel coordinate waiting to spread light, with its level. */
export interface LightCursor {
  x: number;
  y: number;
  z: number;
  level: number;
  /** Whether this cursor still carries full, straight-down sky. */
  fullSky: boolean;
}

/** Whether light may rest in a voxel of this id: air, water and cloud transmit, every solid id blocks. */
export const transmitsLight = (id: number): boolean =>
  id === VOXEL_AIR || isWaterId(id) || id === VOXEL_CLOUD;

/**
 * Broadcasts one channel outward from `seeds` through one block's own stores,
 * the shape the fill workers and the per-block re-lights call. See
 * `propagateLevels` for the flood itself.
 *
 * @param store - The block's voxels; the opacity each voxel propagation tests.
 * @param light - The block's two channels; the one named by `channel` is read and written.
 * @param seeds - The starting cursors, already holding their levels.
 * @param channel - Which channel to write into.
 * @param sky - Whether this is the sky channel, granting the straight-down rule.
 */
export const propagateLight = (
  store: VoxelStore,
  light: LightStore,
  seeds: LightCursor[],
  channel: LightChannel,
  sky: boolean,
): void => {
  propagateLevels(
    {
      voxels: store.voxels,
      padding: store.padding,
      atPadded: (x, y, z) => store.atPadded(x, y, z),
      data: light.data,
      paddedIndex: (x, y, z) => light.paddedIndex(x, y, z),
    },
    seeds,
    channel,
    sky,
  );
};

/**
 * The parts of a voxel store and a light store a flood reads: the signed voxel
 * address space, its opacity, and the channel it writes. `fillSkyLight` satisfies
 * it with the block's own stores, so a single block ever floods its own volume;
 * the window's light engine reads the pair of copies a block keeps of each shared
 * world column and raises them to the brighter, so light never forks as callers
 * find new surfaces to run it over.
 */
export interface LightFloodSurface {
  /** Interior voxel count per axis, like a `VoxelStore`'s. */
  voxels: Dim3;
  /** Border rows on each face the surface is padded with, like `VOXEL_PADDING`. */
  padding: number;
  /** Reads the voxel at signed coordinates, border included. */
  atPadded(x: number, y: number, z: number): number;
  /** The two light channels, laid out as a `LightStore` holds them. */
  data: Uint8Array;
  /** The flat index of a signed voxel, border included. */
  paddedIndex(x: number, y: number, z: number): number;
}

/**
 * Broadcasts one channel outward from `seeds`, a voxel at a time, against
 * `surface` for opacity. Shared by sky and block light: sky seeds full at the
 * surface and a full-sky cursor floods straight down at full strength, while
 * block cursors always decay by one step and never carry the downward
 * exemption. Monotonic in what it writes: a level only ever rises to what the
 * flood reaches, so a caller can re-run it over a surface that already holds
 * light without extinguishing anything.
 *
 * @param surface - The voxels and light the flood reads and writes.
 * @param seeds - The starting cursors, already holding their levels.
 * @param channel - Which channel to write into.
 * @param sky - Whether this is the sky channel, granting the straight-down rule.
 */
export const propagateLevels = (
  surface: LightFloodSurface,
  seeds: LightCursor[],
  channel: LightChannel,
  sky: boolean,
): void => {
  const [nx, ny, nz] = surface.voxels;
  const p = surface.padding;
  const data = surface.data;
  const shift = shiftOfChannel(channel);
  const keep = ~(LEVEL_MASK << shift);
  const levelAt = (at: number): number => (data[at] >>> shift) & LEVEL_MASK;
  const writeLevel = (at: number, level: number): void => {
    data[at] = (data[at] & keep) | (level << shift);
  };
  const idxOf = (x: number, y: number, z: number): number =>
    surface.paddedIndex(x, y, z);
  const queue: LightCursor[] = [];
  for (const s of seeds) {
    const at = idxOf(s.x, s.y, s.z);
    if (s.level > levelAt(at)) {
      writeLevel(at, s.level);
    }
    queue.push(s);
  }
  const six = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0, 1, 0],
    [0, -1, 0],
  ];
  for (let q = 0; q < queue.length; q++) {
    const cur = queue[q];
    for (const [dx, dy, dz] of six) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      const z = cur.z + dz;
      if (
        x < -p ||
        x >= nx + p ||
        y < -p ||
        y >= ny + p ||
        z < -p ||
        z >= nz + p
      ) {
        continue;
      }
      if (!transmitsLight(surface.atPadded(x, y, z))) {
        continue;
      }
      const hereIdx = idxOf(x, y, z);
      const here = levelAt(hereIdx);
      // A full-sky cursor keeps full strength straight along its own column
      // (up or down through open air), so an open shaft stays bright to its
      // floor; a step sideways leaves the direct-sunlight column and decays.
      const next = sky && cur.fullSky && dy !== 0 ? MAX_LIGHT : cur.level - 1;
      if (next <= here) {
        continue;
      }
      writeLevel(hereIdx, next);
      queue.push({ x, y, z, level: next, fullSky: next === MAX_LIGHT });
    }
  }
};

/**
 * Fills a block's sky light end to end: seed full sky above the terrain, then
 * spread it through the open air so caves darken with depth. World X/Z come
 * from the block's `center` and `scale`, matching `fillStore`, so the seeded
 * surface and the propagated caves agree with the voxels present.
 *
 * @returns `light`, filled, for callers that adopt it directly.
 */
export const fillSkyLight = (
  store: VoxelStore,
  light: LightStore,
  center: Dim3,
  config: TerrainConfig,
): LightStore => {
  const [nx, ny, nz] = store.voxels;
  const scale = store.scale;
  const p = store.padding;
  const half = store.voxels.map((n) => n / 2);
  const worldXOf = (vx: number): number =>
    center[0] + (vx + 0.5 - half[0]) * scale;
  const worldYOf = (vy: number): number =>
    center[1] + (vy + 0.5 - half[1]) * scale;
  const worldZOf = (vz: number): number =>
    center[2] + (vz + 0.5 - half[2]) * scale;
  const seeds: LightCursor[] = [];
  for (let vz = -p; vz < nz + p; vz++) {
    const worldZ = worldZOf(vz);
    for (let vx = -p; vx < nx + p; vx++) {
      const worldX = worldXOf(vx);
      const surface = getHeightAt(worldX, worldZ, config);
      for (let vy = -p; vy < ny + p; vy++) {
        const idx = light.paddedIndex(vx, vy, vz);
        if (light.skylightAt(idx) !== 0) {
          continue;
        }
        const isAirOrWater = transmitsLight(store.atPadded(vx, vy, vz));
        if (isAirOrWater && worldYOf(vy) >= surface) {
          light.setSkylightAt(idx, MAX_LIGHT);
          seeds.push({ x: vx, y: vy, z: vz, level: MAX_LIGHT, fullSky: true });
        }
      }
    }
  }
  propagateLight(store, light, seeds, "skylight", true);
  return light;
};
