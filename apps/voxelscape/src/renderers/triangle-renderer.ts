// Culled-face triangle mesh renderer: extracts each `WorldBlock`'s visible
// voxel faces into real geometry (built off the main thread by a worker) and
// rasterizes it normally. The look is carried by the materials here:
// the fragment shades the interpolated vertex normal + baked atlas UV,
// applies the same day-night sun/moon/ambient lighting and distance fog as
// the surface material, and the water pass blends over the scene with a
// Fresnel reflection.
//
// Geometry is drawn in superchunks: every group of two chunk cells per axis
// (each chunk a 64³ block = 128³ voxels / 256³ world units, 8 chunks) is
// merged into one mesh pair. The per-chunk worker build is unchanged and
// still culls seam faces against each block's generated border, so a merged
// superchunk has no faces along its internal chunk boundaries; the merger
// only re-origins and concatenates the vertex data. One draw call then
// covers 8 chunks instead of one, keeping the ~260-block window to a few
// dozen meshes.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import { float, pow, vec3, vec4 } from "@random-mesh/rmsl";
import {
  BoxGeometry,
  Builder,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  NodeMaterial,
  Scene,
  Side,
  Texture,
} from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { VoxelTileConfig } from "./atlas";
import { BLOCK_WORLD, type Dim3, type WorldBlock } from "../world/level-data";
import { setGeometryData, type MeshArrays } from "./mesh";
import { MeshClient } from "./mesh-client";
import type { dayNightState } from "../environment/day-night";

export type DayNight = ReturnType<typeof dayNightState>;

/**
 * Opaque terrain surface material. One shared instance across every block's
 * mesh; the per-face look lives in the geometry (positions, normals, baked
 * atlas texture coordinates).
 */
export class TriangleMaterial extends NodeMaterial {
  /**
   * The spritesheet uploaded as one 2D texture, set asynchronously once
   * loaded.
   */
  tilesTexture: Texture | null = null;
  maxDistance: number = 480;
  fogStart: number = 200;
  fogColor: [number, number, number] = [0.53, 0.81, 0.92];
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

  private maxDistanceUniform: UniformNode<"float"> | undefined;
  private fogStartUniform: UniformNode<"float"> | undefined;
  private fogColorUniform: UniformNode<"vec3"> | undefined;
  private sunDirectionUniform: UniformNode<"vec3"> | undefined;
  private sunLightColorUniform: UniformNode<"vec3"> | undefined;
  private moonDirectionUniform: UniformNode<"vec3"> | undefined;
  private moonLightColorUniform: UniformNode<"vec3"> | undefined;
  private ambientColorUniform: UniformNode<"vec3"> | undefined;
  private tilesSampler: UniformNode<"sampler2D"> | undefined;

  constructor() {
    super();
    this.side = Side.DoubleSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.maxDistanceUniform = b.materialUniform(
      "maxDistance",
      "float",
      () => this.maxDistance,
    );
    this.fogStartUniform = b.materialUniform(
      "fogStart",
      "float",
      () => this.fogStart,
    );
    this.fogColorUniform = b.materialUniform(
      "fogColor",
      "vec3",
      () => this.fogColor,
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
    if (this.tilesTexture !== null) {
      this.tilesSampler = b.sampler(
        "tilesAtlas",
        "sampler2D",
        () => this.tilesTexture,
      );
    }
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const normal = b.normalWorld.normalize().toVar();
    const positionWorld = b.positionWorld.toVar();
    const uv = b.uvVarying.toVar();

    const lightDir =
      this.sunDirectionUniform ?? vec3(0.4, 0.7, 0.4).normalize();
    const lightColour = this.sunLightColorUniform ?? vec3(1.0);
    const moonDir =
      this.moonDirectionUniform ?? vec3(-0.4, -0.7, -0.4).normalize();
    const moonLightColour = this.moonLightColorUniform ?? vec3(0);
    const ambientColour = this.ambientColorUniform ?? vec3(0.2);
    const fogColour = this.fogColorUniform ?? vec3(0.53, 0.81, 0.92);
    const fogNear = this.fogStartUniform ?? float(200);
    const maxDist = this.maxDistanceUniform ?? float(480);

    const diffuse = normal.dot(lightDir).max(float(0));
    const moonDiffuse = normal.dot(moonDir).max(float(0));
    const lighting = ambientColour
      .add(lightColour.mul(diffuse))
      .add(moonLightColour.mul(moonDiffuse));

    // flat blue until the spritesheet is applied
    let albedo = vec3(0.0, 0.0, 1.0);
    if (this.tilesSampler !== undefined) {
      albedo = this.tilesSampler.texture(uv).rgb;
    }
    const lit = albedo.mul(lighting).toVar();

    const dist = positionWorld.sub(b.cameraPosition).length().toVar();
    const fogFactor = dist.smoothstep(fogNear, maxDist).toVar();
    lit.assign(lit.mix(fogColour, fogFactor));
    return vec4(lit, 1.0);
  }
}

/**
 * Translucent water surface material, drawn after the opaque terrain in
 * scene-graph order. Shades each fragment with the same Fresnel sky
 * reflection and base transparency; the geometry
 * is the water surface mesh, so depth-testing occludes correctly against
 * terrain and the player.
 */
export class TriangleWaterMaterial extends NodeMaterial {
  fogColor: [number, number, number] = [0.53, 0.81, 0.92];
  waterColor: [number, number, number] = [0.1, 0.35, 0.55];
  waterOpacity: number = 0.5;

  private fogColorUniform: UniformNode<"vec3"> | undefined;
  private waterColorUniform: UniformNode<"vec3"> | undefined;
  private waterOpacityUniform: UniformNode<"float"> | undefined;

  constructor() {
    super();
    this.transparent = true;
    this.depthWrite = false;
    this.side = Side.DoubleSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    this.fogColorUniform = b.materialUniform(
      "fogColor",
      "vec3",
      () => this.fogColor,
    );
    this.waterColorUniform = b.materialUniform(
      "waterColor",
      "vec3",
      () => this.waterColor,
    );
    this.waterOpacityUniform = b.materialUniform(
      "waterOpacity",
      "float",
      () => this.waterOpacity,
    );
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const skyColour = this.fogColorUniform ?? vec3(0.53, 0.81, 0.92);
    const waterColour = this.waterColorUniform ?? vec3(0.1, 0.35, 0.55);
    const waterOpacity = this.waterOpacityUniform ?? float(0.5);

    const positionWorld = b.positionWorld.toVar();
    const rayDirection = positionWorld.sub(b.cameraPosition).normalize();
    const fresnel = float(0.05)
      .add(float(0.95).mul(pow(float(1).sub(rayDirection.y.abs()), float(3))))
      .toVar();
    const rgb = waterColour.mix(skyColour, fresnel);
    const alpha = fresnel.add(waterOpacity).min(float(1));
    return vec4(rgb, alpha);
  }
}

export interface TriangleRendererParams {
  blocks: WorldBlock[];
  waterExtinction: number;
  seaLevel: number | undefined;
  /**
   * Called with a block's index once its geometry has been built and handed
   * to the mesh. Until then the block draws as nothing, however much voxel
   * data it holds.
   */
  onBlockMeshed?: (index: number) => void;
}

/** Chunk cells per superchunk per axis: 2 chunks of 64³ voxels, 256³ world units. */
export const SUPERCHUNK_SPAN = 2;
/** World units per superchunk axis. */
const SUPERCHUNK_WORLD = SUPERCHUNK_SPAN * BLOCK_WORLD[0];
/**
 * Frames a superchunk may keep gaining members before a partial upload is
 * forced. A scroll's entering cells land over many frames; without this a
 * superchunk that never settles would stay empty. Six frames (~100 ms) is
 * long enough to wait out a typical meshing window while still showing
 * something when a build is stuck.
 */
const MAX_UPLOAD_STALL_FRAMES = 6;

/**
 * The superchunk cell a block belongs to, from the world-space centre of that
 * block. Blocks stack in every axis, so a cell coordinate is as often negative
 * as positive: the division rounds down rather than toward zero, which is what
 * keeps every group exactly `SUPERCHUNK_SPAN` cells wide across the origin
 * instead of one double-width group straddling it.
 */
export const superchunkCellOf = (center: Dim3): [number, number, number] => [
  Math.floor(center[0] / SUPERCHUNK_WORLD),
  Math.floor(center[1] / SUPERCHUNK_WORLD),
  Math.floor(center[2] / SUPERCHUNK_WORLD),
];

const scKey = (c: [number, number, number]): string =>
  `${c[0]},${c[1]},${c[2]}`;

const scCenterOf = (key: string): Dim3 => {
  const [x, y, z] = key.split(",").map(Number);
  return [x * SUPERCHUNK_WORLD, y * SUPERCHUNK_WORLD, z * SUPERCHUNK_WORLD];
};

/**
 * The accumulating vertex arrays of a superchunk's merged geometry, kept as
 * plain growable arrays so a landed chunk can be appended without re-joining
 * the whole superchunk.
 */
type MergedArrays = {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
};

const emptyArrays = (): MergedArrays => ({
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
});

/**
 * Appends one chunk's geometry to a superchunk's merged arrays at the
 * superchunk's origin: the chunk's block-local vertices are re-origined by
 * `(blockCenter - superchunkCenter)` and its indices are re-based on the
 * running vertex count.
 */
const appendArrays = (
  into: MergedArrays,
  a: MeshArrays,
  dx: number,
  dy: number,
  dz: number,
): void => {
  const base = into.positions.length / 3;
  for (let i = 0; i < a.positions.length; i += 3) {
    into.positions.push(
      a.positions[i] + dx,
      a.positions[i + 1] + dy,
      a.positions[i + 2] + dz,
    );
  }
  for (let i = 0; i < a.normals.length; i++) {
    into.normals.push(a.normals[i]);
  }
  for (let i = 0; i < a.uvs.length; i++) {
    into.uvs.push(a.uvs[i]);
  }
  for (let i = 0; i < a.indices.length; i++) {
    into.indices.push(a.indices[i] + base);
  }
};

/** A superchunk's merged arrays plus the member slots already joined into them. */
interface SuperchunkState {
  slots: Set<number>;
  terrain: MergedArrays;
  water: MergedArrays;
}

export class TriangleRenderer {
  /** One shared material instance across every superchunk's terrain mesh. */
  readonly triMaterial = new TriangleMaterial();
  readonly triWaterMaterial = new TriangleWaterMaterial();
  /**
   * The meshed world, one mesh per superchunk, writing depth as opaque
   * terrain.
   */
  readonly terrain = new Group();
  /**
   * The water surfaces over those blocks, blending over whatever was drawn
   * before them and never writing depth.
   */
  readonly water = new Group();
  /**
   * A box around the camera, washing the whole view when it dips below the
   * sea. Depth testing is off, so it covers whatever is already drawn.
   */
  readonly underwaterTint = new Group();

  private readonly waterExtinction: number;
  private readonly seaLevel: number | undefined;

  private totalTriangles: number = 0;
  /**
   * Turns blocks' voxel data into the geometry these meshes draw. It is sent
   * a block's data including the one-voxel meshing border, which is what lets
   * seam faces be culled against the surrounding world without reading any
   * neighbour.
   */
  private readonly meshes: MeshClient;
  private readonly onBlockMeshed?: (index: number) => void;

  /** Each block's freshly built geometry, keyed by slot, for the merger to re-read. */
  private readonly chunkMeshes = new Map<
    number,
    { terrain: MeshArrays; water: MeshArrays }
  >();
  /** The blocks currently forming each superchunk, in connection order. */
  private readonly scMembers = new Map<
    string,
    Array<{ index: number; center: Dim3 }>
  >();
  /** Which superchunk each block slot belongs to right now. */
  private readonly blockSc = new Map<number, string>();
  private readonly scTerrainMesh = new Map<string, Mesh>();
  private readonly scWaterMesh = new Map<string, Mesh>();
  /** Each superchunk's merged arrays and the member slots joined into them. */
  private readonly scMerged = new Map<string, SuperchunkState>();
  /** Superchunks whose merged geometry must be fully re-joined (membership or data replaced). */
  private readonly scNeedsFull = new Set<string>();
  /** Superchunks whose merged geometry is stale and awaiting an upload this frame. */
  private readonly dirty = new Set<string>();
  /** Frame a superchunk's merged geometry was last uploaded on (drives the stall backstop). */
  private readonly scLastUpload = new Map<string, number>();
  private frame = 0;
  /** Superchunks whose merged geometry is non-empty (content mirrors `visible`). */
  private readonly contentTerrain = new Set<string>();
  private readonly contentWater = new Set<string>();

  // Fullscreen underwater tint (the water pass tints the view
  // in-shader instead). Drawn last with depth-testing off so it washes the
  // whole view when the camera dips below the sea.
  private readonly tintMaterial: MeshBasicMaterial;
  private readonly tintMesh: Mesh;

  constructor(params: TriangleRendererParams) {
    const { blocks, waterExtinction, seaLevel, onBlockMeshed } = params;
    this.waterExtinction = waterExtinction;
    this.seaLevel = seaLevel;
    this.onBlockMeshed = onBlockMeshed;

    this.meshes = new MeshClient({
      blocks,
      onMeshBuilt: (index, terrain, water) => {
        // Cache the per-chunk build so the merger can re-read it, then defer
        // the superchunk upload to the next tick so a burst of results lands
        // as a single geometry update instead of one per block. A chunk that
        // was already joined has been replaced, so its superchunk must be
        // re-joined in full rather than appended to.
        this.chunkMeshes.set(index, { terrain, water });
        const key = this.blockSc.get(index);
        if (key !== undefined) {
          if (this.scMerged.get(key)?.slots.has(index) === true) {
            this.scNeedsFull.add(key);
          }
          this.dirty.add(key);
        }
        this.onBlockMeshed?.(index);
      },
    });

    this.tintMaterial = new MeshBasicMaterial({
      color: 0x1a598c,
      transparent: true,
      opacity: 0,
    });
    this.tintMaterial.depthTest = false;
    this.tintMaterial.depthWrite = false;
    this.tintMesh = new Mesh(
      new BoxGeometry(4000, 4000, 4000),
      this.tintMaterial,
    );
    this.tintMesh.visible = false;
    this.underwaterTint.add(this.tintMesh);
  }

  /** Creates a superchunk's pair of meshes and its member list, once. */
  private ensureSuperchunk(key: string): void {
    if (this.scMembers.has(key)) {
      return;
    }
    this.scMembers.set(key, []);
    const center = scCenterOf(key);
    const triMesh = new Mesh(new BufferGeometry(), this.triMaterial);
    triMesh.position.set(center[0], center[1], center[2]);
    triMesh.visible = false;
    this.terrain.add(triMesh);
    this.scTerrainMesh.set(key, triMesh);
    const waterMesh = new Mesh(new BufferGeometry(), this.triWaterMaterial);
    waterMesh.position.set(center[0], center[1], center[2]);
    waterMesh.visible = false;
    this.water.add(waterMesh);
    this.scWaterMesh.set(key, waterMesh);
  }

  /** Removes a superchunk's meshes once its last member leaves. */
  private removeSuperchunk(key: string): void {
    const tri = this.scTerrainMesh.get(key);
    const water = this.scWaterMesh.get(key);
    if (tri !== undefined) {
      this.terrain.remove(tri);
    }
    if (water !== undefined) {
      this.water.remove(water);
    }
    this.scTerrainMesh.delete(key);
    this.scWaterMesh.delete(key);
    this.scMembers.delete(key);
    this.scMerged.delete(key);
    this.scNeedsFull.delete(key);
    this.contentTerrain.delete(key);
    this.contentWater.delete(key);
    this.dirty.delete(key);
    this.updateTriCount();
  }

  /**
   * Reconciles a superchunk's merged geometry against its current members'
   * cached builds and uploads it in place. The fast path appends only the
   * chunks that landed since the last rebuild (a scroll's entering shell), so
   * a frame costs the new geometry's size, not the whole superchunk's; any
   * change that invalidates already-joined data (membership moved, a chunk's
   * data replaced) marks the superchunk for a full re-join.
   *
   * The merged arrays are uploaded once the superchunk's currently-meshing
   * members all land, so a scroll that fills a shell one chunk at a time pays
   * for one GPU upload per superchunk instead of one per frame; a superchunk
   * that fails to settle within `MAX_UPLOAD_STALL_FRAMES` still uploads what
   * it has. `force` bypasses the wait for a spot that has to change right away
   * (a freshly repositioned cell whose stale surface must not flash).
   *
   * @returns Whether the merged geometry was uploaded.
   */
  private rebuildSuperchunk(key: string, force = false): boolean {
    const center = scCenterOf(key);
    const members = this.scMembers.get(key);
    const triMesh = this.scTerrainMesh.get(key);
    const waterMesh = this.scWaterMesh.get(key);
    if (
      members === undefined ||
      triMesh === undefined ||
      waterMesh === undefined
    ) {
      return false;
    }
    const existing = this.scMerged.get(key);
    const wasFull = existing === undefined || this.scNeedsFull.has(key);
    let state: SuperchunkState;
    let appended = false;
    if (wasFull) {
      state = {
        slots: new Set(),
        terrain: emptyArrays(),
        water: emptyArrays(),
      };
      this.scMerged.set(key, state);
      this.scNeedsFull.delete(key);
      for (const m of members) {
        const mesh = this.chunkMeshes.get(m.index);
        if (mesh === undefined) {
          continue;
        }
        appendArrays(
          state.terrain,
          mesh.terrain,
          m.center[0] - center[0],
          m.center[1] - center[1],
          m.center[2] - center[2],
        );
        appendArrays(
          state.water,
          mesh.water,
          m.center[0] - center[0],
          m.center[1] - center[1],
          m.center[2] - center[2],
        );
        state.slots.add(m.index);
        appended = true;
      }
    } else {
      state = existing as SuperchunkState;
      for (const m of members) {
        if (state.slots.has(m.index)) {
          continue;
        }
        const mesh = this.chunkMeshes.get(m.index);
        if (mesh === undefined) {
          continue;
        }
        appendArrays(
          state.terrain,
          mesh.terrain,
          m.center[0] - center[0],
          m.center[1] - center[1],
          m.center[2] - center[2],
        );
        appendArrays(
          state.water,
          mesh.water,
          m.center[0] - center[0],
          m.center[1] - center[1],
          m.center[2] - center[2],
        );
        state.slots.add(m.index);
        appended = true;
      }
    }
    // Upload only when the superchunk has settled (every member meshed), when
    // its membership itself changed (the stale data has to leave now), or
    // when it has been waiting too long. Otherwise defer and re-queue for the
    // next frame, so a scroll's burst of chunks costs a handful of uploads
    // instead of one per landed chunk.
    const missing = members.reduce(
      (n, m) => n + (this.chunkMeshes.has(m.index) ? 0 : 1),
      0,
    );
    const lastUpload = this.scLastUpload.get(key);
    const stalled =
      lastUpload !== undefined &&
      this.frame - lastUpload >= MAX_UPLOAD_STALL_FRAMES;
    const uploadNow =
      force || wasFull || (appended && missing === 0) || stalled;
    if (!uploadNow) {
      if (appended) {
        this.dirty.add(key);
      }
      return false;
    }
    setGeometryData(triMesh.geometry, state.terrain);
    setGeometryData(waterMesh.geometry, state.water);
    this.scLastUpload.set(key, this.frame);
    const has = (a: { positions: ArrayLike<number> }): boolean =>
      a.positions.length > 0;
    if (has(state.terrain)) {
      this.contentTerrain.add(key);
    } else {
      this.contentTerrain.delete(key);
    }
    if (has(state.water)) {
      this.contentWater.add(key);
    } else {
      this.contentWater.delete(key);
    }
    // A superchunk is drawn when it has geometry to draw and not otherwise.
    // Nothing else hides it: there is one renderer, so there is no state in
    // which the world is loaded and deliberately not shown.
    triMesh.visible = this.contentTerrain.has(key);
    waterMesh.visible = this.contentWater.has(key);
    this.updateTriCount();
    return true;
  }

  /**
   * Builds one block's mesh on the calling thread, before returning. For the
   * block that has to be on screen before the player is let in, which cannot
   * afford to wait for the mesh worker to start.
   */
  meshNow(index: number): void {
    this.meshes.buildNow(index);
  }

  private updateTriCount(): void {
    let tris = 0;
    for (const mesh of this.scTerrainMesh.values()) {
      tris += mesh.geometry.drawCount / 3;
    }
    for (const mesh of this.scWaterMesh.values()) {
      tris += mesh.geometry.drawCount / 3;
    }
    this.totalTriangles = Math.round(tris);
  }

  get triangleCount(): number {
    return this.totalTriangles;
  }

  repositionBlock(index: number, center: Dim3): void {
    const newKey = scKey(superchunkCellOf(center));
    const oldKey = this.blockSc.get(index);
    // the slot now holds a different cell's terrain: drop the stale build and
    // any queue for it, but don't queue a rebuild — `onBlockChanged` does that
    // once the new data actually arrives
    this.chunkMeshes.delete(index);
    this.meshes.invalidate(index);
    if (oldKey !== undefined) {
      const oldMembers = this.scMembers.get(oldKey);
      const slot = oldMembers?.findIndex((m) => m.index === index) ?? -1;
      if (slot >= 0) {
        oldMembers!.splice(slot, 1);
      }
      if (oldMembers !== undefined && oldMembers.length === 0) {
        this.removeSuperchunk(oldKey);
      } else if (oldMembers !== undefined) {
        // the slot's joined geometry is stale in its old superchunk; a full
        // re-join on the next tick drops it. No synchronous upload: a scroll
        // repositions the whole entering cap, and uploading each of those in
        // one frame is the stall we are trying to avoid.
        this.scNeedsFull.add(oldKey);
        this.dirty.add(oldKey);
      }
    }
    this.ensureSuperchunk(newKey);
    this.blockSc.set(index, newKey);
    this.scMembers.get(newKey)!.push({ index, center });
  }

  onBlockChanged(index: number): void {
    this.meshes.requestBuild(index);
  }

  setTiles(voxelTiles: VoxelTileConfig[], texture: Texture): void {
    this.triMaterial.tilesTexture = texture;
    this.triMaterial.needsUpdate = true;
    this.meshes.setTiles(voxelTiles);
  }

  applyLighting(dayNight: DayNight): void {
    this.triMaterial.fogColor = dayNight.skyColor;
    this.triMaterial.sunDirection = dayNight.sunDir;
    this.triMaterial.sunLightColor = dayNight.sunLight;
    this.triMaterial.moonDirection = dayNight.moonDir;
    this.triMaterial.moonLightColor = dayNight.moonLight;
    this.triMaterial.ambientColor = dayNight.ambient;
    this.triWaterMaterial.fogColor = dayNight.skyColor;
  }

  tick(_dt: number, camera: PerspectiveCamera): void {
    // keep draining the mesh-build queue a few blocks per frame (the worker
    // does the heavy lifting off the main thread)
    this.meshes.drain();
    // upload one merged superchunk geometry per dirty superchunk, so a burst
    // of block results reads as a few draw calls rather than a few thousand;
    // a superchunk that is still meshing stays dirty and uploads once it
    // settles (or the stall backstop trips)
    this.frame++;
    const dirty = [...this.dirty];
    this.dirty.clear();
    for (const key of dirty) {
      this.rebuildSuperchunk(key);
    }
    // fullscreen underwater tint when the camera dips below the sea
    if (this.seaLevel !== undefined) {
      const depth = this.seaLevel - camera.position.y;
      if (depth > 0) {
        this.tintMesh.visible = true;
        this.tintMesh.position.copy(camera.position);
        this.tintMaterial.opacity = Math.min(
          1,
          1 - Math.exp(-this.waterExtinction * depth),
        );
      } else {
        this.tintMesh.visible = false;
      }
    } else {
      this.tintMesh.visible = false;
    }
  }

  /**
   * Terminates the mesh worker. Geometries and materials are not disposed —
   * rmsl does not expose a disposal API for them.
   */
  dispose(): void {
    this.meshes.dispose();
  }
}
