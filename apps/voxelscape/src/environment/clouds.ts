// Blocky clouds: a field of low-poly puffs, generated once at startup from
// 3D Perlin noise and drawn as static meshes. The field is anchored to the
// world, not the camera, so a flying player can fly right through a puff. The
// puff noise is periodic over the wrap tile (its lattice period equals
// `CLOUD_PERIOD`, and the frequency maps exactly that many periods across the
// tile), and every frame each cell mesh is placed at
// `camera + wrap(anchor + drift - camera)` — a modulo wrap that keeps the
// field within half a tile of the camera while the pattern stays put in the
// world, exactly how the rain and snow particles surround the player. The cell
// anchors are symmetric around the origin, so the wrapped tile covers the
// camera's half-tile window completely and the sky has clouds in every
// direction; the "infinite" sky is a fixed number of static meshes whose
// positions a handful of float writes move each frame.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import { float, vec3, vec4 } from "@random-mesh/rmsl";
import {
  Builder,
  Group,
  Mesh,
  NodeMaterial,
  Scene,
  Side,
} from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { MeshArrays } from "../renderers/mesh";
import { meshArraysToGeometry } from "../renderers/mesh";
import { PerlinNoise3D } from "../world/noise";
import type { DayNightState, Phase } from "./day-night";

/** World units per cloud voxel; coarse on purpose, so a puff reads as blocks. */
export const CLOUD_VOXEL = 8;
/** Voxels per cell axis; a cell is `CLOUD_VOXEL * CLOUD_VOXELS` world units wide. */
export const CLOUD_VOXELS = 16;
/** The altitude, in world units, the cloud volumes are centred on. */
export const CLOUD_Y = 220;
/** How many times wider than tall the puffs come out; the y noise read is scaled by this. */
export const CLOUD_FLATNESS = 5;
/**
 * Lattice periods of the puff noise across one wrap tile. The noise is built
 * periodic with this period in every axis, so the field tiles seamlessly and
 * the wrap-tile seams match; must divide `CLOUD_PERIOD * 2^(octaves-1)` evenly
 * for every fBm octave's argument range to wrap cleanly (it does: a period-p
 * noise is periodic over any whole multiple of p).
 */
export const CLOUD_PERIOD = 8;
/** fBm octaves of the puff noise. */
const CLOUD_OCTAVES = 3;
/** The fBm value a voxel must clear to be cloud; lower covers more of the sky. */
const CLOUD_THRESHOLD = 0.37;
/**
 * Coverage fBm value a cell must clear to hold a puff. Below the noise floor
 * (a config's minimum) no cell is gated out and the sky's cover is set by
 * `CLOUD_THRESHOLD` alone; raise it to carve clear patches out of the sky.
 */
const CLOUD_COVERAGE_THRESHOLD = -2;
/** How strongly a cell's coverage lowers the fill threshold, making denser banks. */
const CLOUD_COVERAGE_DRIVE = 0.8;
/** Wind, in world units per second, the puffs drift in x and z. */
export const CLOUD_WIND: [number, number] = [2, 0.5];
/** Cells per wrap tile per axis; the tile is `CLOUD_CELL * TILE_CELLS` wide. */
export const TILE_CELLS = 8;
/** World units per cloud cell. */
const CLOUD_CELL = CLOUD_VOXEL * CLOUD_VOXELS;
/** The wrap tile's width in world units. */
export const CLOUD_TILE = CLOUD_CELL * TILE_CELLS;
/** Half the wrap tile in world units; the wind drift wraps within this. */
export const HALF_TILE = CLOUD_TILE / 2;
/**
 * Noise frequency, in 1/world-units: exactly `CLOUD_PERIOD` lattice periods
 * per wrap tile, which is what makes the periodic puff noise tile across the
 * tile's width.
 */
const CLOUD_FREQUENCY = CLOUD_PERIOD / CLOUD_TILE;
/** Where the cloud material starts fading toward the sky, matching the terrain fog. */
const CLOUD_FOG_START = 200;
/** Where the cloud material is fully sky-coloured, hiding the tile's far edge. */
const CLOUD_FOG_MAX = 480;
/** Distinguishes the cloud seed stream from the terrain seed. */
const PUFF_SEED_MIX = 0xc10d5;

/** How a day-night phase tints the cloud albedo, on top of its lighting. */
const PHASE_TINT: Record<Phase, [number, number, number]> = {
  day: [1, 1, 1],
  sunset: [1, 0.82, 0.6],
  night: [0.55, 0.6, 0.75],
  sunrise: [1, 0.88, 0.72],
};

/** The knobs `cloudCellVolume` samples its noise field with. */
export interface CloudCellOptions {
  /** World units per cloud voxel. */
  voxel: number;
  /** Voxels per cell axis. */
  voxels: number;
  /** Altitude the volume is centred on, in world units. */
  y: number;
  /** Y coordinate of the 3D noise is scaled by this, compressing puffs vertically. */
  flatness: number;
  /** Noise frequency, in 1/world-units. */
  frequency: number;
  /** Lattice period of the puff noise, in its own argument space. */
  period: number;
  /** fBm octaves of the puff noise. */
  octaves: number;
  /** The fBm value a voxel must clear to be cloud. */
  threshold: number;
  /** Coverage fBm value a cell must clear to hold a puff. */
  coverageThreshold: number;
  /** How strongly coverage lowers the fill threshold. */
  coverageDrive: number;
}

export const CLOUD_DEFAULTS: CloudCellOptions = {
  voxel: CLOUD_VOXEL,
  voxels: CLOUD_VOXELS,
  y: CLOUD_Y,
  flatness: CLOUD_FLATNESS,
  frequency: CLOUD_FREQUENCY,
  period: CLOUD_PERIOD,
  octaves: CLOUD_OCTAVES,
  threshold: CLOUD_THRESHOLD,
  coverageThreshold: CLOUD_COVERAGE_THRESHOLD,
  coverageDrive: CLOUD_COVERAGE_DRIVE,
};

/**
 * Wraps `v` into `[-half, half)` with modulo, so a position that crosses one
 * edge of the cloud tile reappears at the other. Written against positive
 * `half`, it never lets accumulated float error push a value out of range.
 */
export const wrapTile = (v: number, half: number): number =>
  ((((v + half) % (half * 2)) + half * 2) % (half * 2)) - half;

/**
 * Fills one cell's voxel volume with cloud: a voxel is solid where the 3D
 * puff noise at its (x, y, z) exceeds the threshold, sampled with the y
 * coordinate scaled by `flatness` so the vertical features of the noise are
 * `flatness` times shorter than the horizontal ones and the puffs come out
 * wider than they are tall.
 *
 * A cell below the coverage threshold is left empty — the knob for carving
 * clear patches out of the sky (below the noise floor it never triggers, and
 * the total cover is set by `threshold` alone). Above it, the same coverage
 * sample lowers the fill threshold where it is high, so denser areas grow
 * fatter puffs. Sampling coverage from the same periodic noise as the fill
 * keeps the whole field one seamless function of the world: a cell in one
 * tile's position matches the same cell one tile over.
 *
 * @param cx - The cell's X index within the wrap tile; cell 0 sits at the
 * tile's left half, centred on the origin, so the controller's anchors are
 * symmetric and its camera-centred wrap tiles the player's window completely.
 * @param cz - The cell's Z index within the wrap tile, likewise.
 * @param puff - The seeded, `opts.period`-periodic 3D noise the puffs are sampled from.
 * @param opts - The field's sampling knobs.
 * @returns One solid bit per voxel, `voxels³` of them, in `(y * voxels + z) * voxels + x` order.
 */
export const cloudCellVolume = (
  cx: number,
  cz: number,
  puff: PerlinNoise3D,
  opts: CloudCellOptions,
): Uint8Array => {
  const {
    voxel,
    voxels,
    y,
    flatness,
    frequency,
    octaves,
    threshold,
    coverageThreshold,
    coverageDrive,
  } = opts;
  const volume = new Uint8Array(voxels * voxels * voxels);
  const y0 = y - (voxels * voxel) / 2;
  // The tile's cells are centred on the origin (cell `cx` spans world units
  // `[(cx - TILE_CELLS/2) * cell, (cx - TILE_CELLS/2 + 1) * cell)`), so the
  // controller's anchors are symmetric and the camera-centred wrap below tiles
  // the window around the player completely.
  const x0 = (cx - TILE_CELLS / 2) * voxels * voxel;
  const z0 = (cz - TILE_CELLS / 2) * voxels * voxel;
  const cov = puff.fbm(
    (x0 + (voxels * voxel) / 2) * frequency,
    y * frequency,
    (z0 + (voxels * voxel) / 2) * frequency,
    octaves,
  );
  if (cov < coverageThreshold) {
    return volume;
  }
  const localThreshold = threshold - Math.max(0, cov) * coverageDrive;
  for (let z = 0; z < voxels; z++) {
    for (let yv = 0; yv < voxels; yv++) {
      for (let x = 0; x < voxels; x++) {
        const wx = x0 + (x + 0.5) * voxel;
        const wy = y0 + (yv + 0.5) * voxel;
        const wz = z0 + (z + 0.5) * voxel;
        const s = puff.fbm(
          wx * frequency,
          wy * frequency * flatness,
          wz * frequency,
          octaves,
        );
        if (s > localThreshold) {
          volume[(yv * voxels + z) * voxels + x] = 1;
        }
      }
    }
  }
  return volume;
};

/**
 * The fraction of the wrap tile's x/z columns that hold at least one cloud
 * voxel — the cloud cover of the sky, and the number the generator's knobs
 * are tuned against. Deterministic for a given terrain `seed` (the mix the
 * controller applies is applied here too), so a test or a parameter search can
 * measure exactly how much sky a config covers. The defaults are tuned for
 * about 40% cover.
 *
 * @param seed - The world's terrain seed, as fed to `CloudController`.
 * @param opts - The field's sampling knobs; defaults to `CLOUD_DEFAULTS`.
 */
export const cloudCoverage = (
  seed: number,
  opts: CloudCellOptions = CLOUD_DEFAULTS,
): number => {
  const puff = new PerlinNoise3D(seed ^ PUFF_SEED_MIX, opts.period);
  const n = opts.voxels;
  let covered = 0;
  let total = 0;
  for (let cz = 0; cz < TILE_CELLS; cz++) {
    for (let cx = 0; cx < TILE_CELLS; cx++) {
      const volume = cloudCellVolume(cx, cz, puff, opts);
      for (let vz = 0; vz < n; vz++) {
        for (let vx = 0; vx < n; vx++) {
          total++;
          for (let y = 0; y < n; y++) {
            if (volume[(y * n + vz) * n + vx] !== 0) {
              covered++;
              break;
            }
          }
        }
      }
    }
  }
  return covered / total;
};

/**
 * One quad's four corner offsets in cell units, per axis, matching the terrain
 * mesher's sweep convention: the face axis stays at 0 while the two tangent
 * axes sweep 0..1. UVs are absent — the cloud material needs none.
 */
const FACE_CORNERS: Array<Array<[number, number, number]>> = [
  [
    [0, 0, 0],
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
  ],
];

/**
 * Turns a solid voxel volume into cloud surface geometry: one quad per exposed
 * face, culled against the volume's own air, positioned in the cell's local
 * space (centred at the origin) so the controller can place each mesh by its
 * anchor alone. The result carries no UVs.
 */
export const buildCloudMesh = (
  volume: Uint8Array,
  voxels: number,
  voxel: number,
): MeshArrays => {
  const h = voxel / 2;
  const at = (x: number, y: number, z: number): number => {
    if (x < 0 || y < 0 || z < 0 || x >= voxels || y >= voxels || z >= voxels) {
      return 0;
    }
    return volume[(y * voxels + z) * voxels + x];
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const emit = (
    wx: number,
    wy: number,
    wz: number,
    axis: number,
    sign: number,
  ): void => {
    const base = positions.length / 3;
    for (const [xo, yo, zo] of FACE_CORNERS[axis]) {
      positions.push(
        axis === 0 ? wx + sign * h : wx + (xo - 0.5) * 2 * h,
        axis === 1 ? wy + sign * h : wy + (yo - 0.5) * 2 * h,
        axis === 2 ? wz + sign * h : wz + (zo - 0.5) * 2 * h,
      );
      normals.push(
        axis === 0 ? sign : 0,
        axis === 1 ? sign : 0,
        axis === 2 ? sign : 0,
      );
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let z = 0; z < voxels; z++) {
    for (let y = 0; y < voxels; y++) {
      for (let x = 0; x < voxels; x++) {
        if (at(x, y, z) === 0) {
          continue;
        }
        const wx = (x + 0.5 - voxels / 2) * voxel;
        const wy = (y + 0.5 - voxels / 2) * voxel;
        const wz = (z + 0.5 - voxels / 2) * voxel;
        if (at(x, y, z - 1) === 0) emit(wx, wy, wz, 2, -1);
        if (at(x, y, z + 1) === 0) emit(wx, wy, wz, 2, 1);
        if (at(x, y - 1, z) === 0) emit(wx, wy, wz, 1, -1);
        if (at(x, y + 1, z) === 0) emit(wx, wy, wz, 1, 1);
        if (at(x - 1, y, z) === 0) emit(wx, wy, wz, 0, -1);
        if (at(x + 1, y, z) === 0) emit(wx, wy, wz, 0, 1);
      }
    }
  }

  return { positions, normals, uvs: [], indices };
};

/**
 * The cloud material: a blocky puff shaded by the same sun/moon/ambient terms
 * as the terrain, with the albedo mixed toward the sky colour by distance so
 * the far edge of the wrap tile is invisible. The tint, light colours and fog
 * colour are re-derived each frame from the day-night state, so clouds follow
 * the sun, warm at dusk and darken under storm weather.
 */
export class CloudMaterial extends NodeMaterial {
  /** Phase-based albedo the lighting is applied to. */
  tint: [number, number, number] = [1, 1, 1];
  fogColor: [number, number, number] = [0.53, 0.81, 0.92];
  fogStart: number = CLOUD_FOG_START;
  fogMax: number = CLOUD_FOG_MAX;
  sunDirection: [number, number, number] = [
    1 / Math.sqrt(6),
    2 / Math.sqrt(6),
    1 / Math.sqrt(6),
  ];
  sunLightColor: [number, number, number] = [1, 1, 1];
  moonDirection: [number, number, number] = [
    -1 / Math.sqrt(6),
    -2 / Math.sqrt(6),
    -1 / Math.sqrt(6),
  ];
  moonLightColor: [number, number, number] = [0, 0, 0];
  ambientColor: [number, number, number] = [0.2, 0.2, 0.2];

  private tintUniform: UniformNode<"vec3"> | undefined;
  private fogColorUniform: UniformNode<"vec3"> | undefined;
  private fogStartUniform: UniformNode<"float"> | undefined;
  private fogMaxUniform: UniformNode<"float"> | undefined;
  private sunDirectionUniform: UniformNode<"vec3"> | undefined;
  private sunLightColorUniform: UniformNode<"vec3"> | undefined;
  private moonDirectionUniform: UniformNode<"vec3"> | undefined;
  private moonLightColorUniform: UniformNode<"vec3"> | undefined;
  private ambientColorUniform: UniformNode<"vec3"> | undefined;

  constructor() {
    super();
    this.side = Side.DoubleSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.tintUniform = b.materialUniform("tint", "vec3", () => this.tint);
    this.fogColorUniform = b.materialUniform(
      "fogColor",
      "vec3",
      () => this.fogColor,
    );
    this.fogStartUniform = b.materialUniform(
      "fogStart",
      "float",
      () => this.fogStart,
    );
    this.fogMaxUniform = b.materialUniform(
      "fogMax",
      "float",
      () => this.fogMax,
    );
    this.sunDirectionUniform = b.materialUniform(
      "sunDirection",
      "vec3",
      () => this.sunDirection,
    );
    this.sunLightColorUniform = b.materialUniform(
      "sunLightColor",
      "vec3",
      () => this.sunLightColor,
    );
    this.moonDirectionUniform = b.materialUniform(
      "moonDirection",
      "vec3",
      () => this.moonDirection,
    );
    this.moonLightColorUniform = b.materialUniform(
      "moonLightColor",
      "vec3",
      () => this.moonLightColor,
    );
    this.ambientColorUniform = b.materialUniform(
      "ambientColor",
      "vec3",
      () => this.ambientColor,
    );
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const normal = b.normalWorld.normalize().toVar();
    const positionWorld = b.positionWorld.toVar();
    const tint = this.tintUniform ?? vec3(1);
    const fogColour = this.fogColorUniform ?? vec3(0.53, 0.81, 0.92);
    const fogStart = this.fogStartUniform ?? float(CLOUD_FOG_START);
    const fogMax = this.fogMaxUniform ?? float(CLOUD_FOG_MAX);
    const sunDir = this.sunDirectionUniform ?? vec3(0.4, 0.7, 0.4).normalize();
    const sunLight = this.sunLightColorUniform ?? vec3(1);
    const moonDir =
      this.moonDirectionUniform ?? vec3(-0.4, -0.7, -0.4).normalize();
    const moonLight = this.moonLightColorUniform ?? vec3(0);
    const ambient = this.ambientColorUniform ?? vec3(0.2);

    const diffuse = normal.dot(sunDir).max(float(0));
    const moonDiffuse = normal.dot(moonDir).max(float(0));
    const lighting = ambient
      .add(sunLight.mul(diffuse))
      .add(moonLight.mul(moonDiffuse));
    const albedo = tint.mul(lighting).toVar();

    const dist = positionWorld.sub(b.cameraPosition).length().toVar();
    const fogFactor = dist.smoothstep(fogStart, fogMax).toVar();
    albedo.assign(albedo.mix(fogColour, fogFactor));
    return vec4(albedo, 1.0);
  }
}

export interface CloudControllerParams {
  /** The world's terrain seed; the cloud field is derived from it deterministically. */
  seed: number;
  /** Wind, in world units per second, the puffs drift in x and z. */
  wind?: [number, number];
  /** Sampling overrides for the generated puffs; anything left unset takes its default. */
  options?: Partial<CloudCellOptions>;
}

/** One cell's mesh and the tile-local position its anchor keeps at as the tile slides. */
interface CloudCell {
  mesh: Mesh;
  anchorX: number;
  anchorZ: number;
}

/**
 * Owns the cloud field: builds every cell's static puff mesh once from the
 * seeded periodic noise, then each `tick` drifts the whole field by the wind
 * and anchors it to the world tile the camera is in. A cell's mesh sits at
 * its world position, so the player can fly through it; the window slides by
 * one tile when the camera crosses a tile boundary, which the periodic noise
 * makes seamless. Exposes plain typed methods (`tick`, `applyLighting`,
 * `setVisible`, `describe`) and has no idea a renderer or a console exists.
 */
export class CloudController {
  /** The field of static puff meshes, for the scene to place in its draw order. */
  readonly cloudField = new Group();
  private readonly material = new CloudMaterial();
  private readonly cells: CloudCell[] = [];
  private readonly windX: number;
  private readonly windZ: number;
  private readonly y: number;
  private readonly cell: number;
  private driftX = 0;
  private driftZ = 0;
  private shown = true;

  constructor({
    seed,
    wind = CLOUD_WIND,
    options = {},
  }: CloudControllerParams) {
    const opts = { ...CLOUD_DEFAULTS, ...options };
    this.windX = wind[0];
    this.windZ = wind[1];
    this.y = opts.y;
    this.cell = opts.voxel * opts.voxels;
    const puff = new PerlinNoise3D(seed ^ PUFF_SEED_MIX, opts.period);
    for (let cz = 0; cz < TILE_CELLS; cz++) {
      for (let cx = 0; cx < TILE_CELLS; cx++) {
        const arrays = buildCloudMesh(
          cloudCellVolume(cx, cz, puff, opts),
          opts.voxels,
          opts.voxel,
        );
        if (arrays.positions.length === 0) {
          continue;
        }
        const mesh = new Mesh(meshArraysToGeometry(arrays), this.material);
        this.cloudField.add(mesh);
        this.cells.push({
          mesh,
          anchorX: (cx - TILE_CELLS / 2 + 0.5) * this.cell,
          anchorZ: (cz - TILE_CELLS / 2 + 0.5) * this.cell,
        });
      }
    }
  }

  /** The number of puff meshes the field holds. */
  get puffCount(): number {
    return this.cells.length;
  }

  /** Whether the field is currently shown. */
  get visible(): boolean {
    return this.shown;
  }

  /**
   * Drifts the field by the wind and places every cell within half a tile of
   * the camera: `camera + wrap(anchor + drift - camera)`. The wrap keeps the
   * field anchored to the world — a mesh sits at a fixed world position and
   * only jumps a whole tile (a period of the field itself) when the camera
   * crosses a boundary, so a flying player still passes through a puff — while
   * making the drawn window always surround the player: the cell anchors are
   * symmetric around the origin, so the wrapped tile covers the camera's
   * half-tile window completely and there is no empty stretch of sky at a
   * window edge. The sky is a fixed field of static meshes whose positions a
   * few float writes move each frame.
   */
  tick(dt: number, camera: PerspectiveCamera): void {
    this.driftX = wrapTile(this.driftX + this.windX * dt, HALF_TILE);
    this.driftZ = wrapTile(this.driftZ + this.windZ * dt, HALF_TILE);
    const cam = camera.position;
    for (const cell of this.cells) {
      cell.mesh.position.set(
        cam.x + wrapTile(cell.anchorX + this.driftX - cam.x, HALF_TILE),
        this.y,
        cam.z + wrapTile(cell.anchorZ + this.driftZ - cam.z, HALF_TILE),
      );
    }
  }

  /**
   * Feeds the day-night state into the shared material: the phase tint, the
   * light terms, and the fog colour the puffs fade into (already weather-tinted
   * by the caller).
   */
  applyLighting(dayNight: DayNightState): void {
    this.material.tint = PHASE_TINT[dayNight.phase];
    this.material.fogColor = dayNight.skyColor;
    this.material.sunDirection = dayNight.sunDir;
    this.material.sunLightColor = dayNight.sunLight;
    this.material.moonDirection = dayNight.moonDir;
    this.material.moonLightColor = dayNight.moonLight;
    this.material.ambientColor = dayNight.ambient;
  }

  setVisible(visible: boolean): void {
    this.shown = visible;
    this.cloudField.visible = visible;
  }

  describe(): string {
    return `clouds: ${this.shown ? "shown" : "hidden"} | ${this.cells.length} puffs | wind ${this.windX},${this.windZ} u/s`;
  }
}
