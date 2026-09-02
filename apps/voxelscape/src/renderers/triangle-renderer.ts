// Culled-face triangle mesh renderer: extracts each `WorldBlock`'s visible
// voxel faces into real geometry (built off the main thread by a worker) and
// rasterizes it normally. The look is carried by the materials here:
// the fragment shades the interpolated vertex normal + baked atlas UV,
// applies the same day-night sun/moon/ambient lighting and distance fog as
// the surface material, and the water pass blends over the scene with a
// Fresnel reflection.
//
// Geometry is still merged and uploaded in superchunks: every group of two
// chunk cells per axis (each chunk a 64³ block = 128³ voxels / 256³ world
// units, 8 chunks) is joined into one pair of `BufferGeometry`s. The
// per-chunk worker build is unchanged and still culls seam faces against each
// block's generated border, so a merged superchunk has no faces along its
// internal chunk boundaries; the merger only re-origins and concatenates the
// vertex data. What is drawn, though, is per chunk: each block slot gets its
// own mesh pair pointing at a slice of the shared superchunk geometry via
// `drawRange`, so the window's chunks can be culled independently — by the
// frustum, and by the hardware occlusion pass, which readbacks the window of
// terrain a sampling of the view actually shows and skips the rest.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import { float, pow, vec3, vec4 } from "@random-mesh/rmsl";
import {
  BoxGeometry,
  Builder,
  BufferGeometry,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NodeMaterial,
  Scene,
  Side,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { VoxelTileConfig } from "./atlas";
import { BLOCK_WORLD, type Dim3, type WorldBlock } from "../world/level-data";
import { setGeometryData, setOcclusionColors, type MeshArrays } from "./mesh";
import { MeshClient } from "./mesh-client";
import { OcclusionDebugMaterial } from "./occlusion-debug-material";
import { OcclusionProbeMaterial } from "./occlusion-probe-material";
import {
  isNearCell,
  probeColor,
  queryIsDue,
  scanVisible,
  targetSizeFor,
} from "./occlusion";
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
    // Every face is wound in `buildBlockMesh` toward the side it is exposed
    // on, so only the front side needs drawing.
    this.side = Side.FrontSide;
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
    // The water surface's triangle are wound toward their exposed side, and
    // its underside is never seen — the sea floor's tint covers that view.
    this.side = Side.FrontSide;
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
/** Half a superchunk's extent per axis, the half-extent of the `scBounds` box. */
const SUPERCHUNK_HALF = SUPERCHUNK_WORLD / 2;
/** Half a block's world extent per axis. */
const BLOCK_HALF = BLOCK_WORLD[0] / 2;
/**
 * Frames a superchunk may keep gaining members before a partial upload is
 * forced. A scroll's entering cells land over many frames; without this a
 * superchunk that never settles would stay empty. Six frames (~100 ms) is
 * long enough to wait out a typical meshing window while still showing
 * something when a build is stuck.
 */
const MAX_UPLOAD_STALL_FRAMES = 6;

/** Frames between the hardware occlusion queries, each a readback that stalls the pipeline. */
const DEFAULT_OCCLUSION_INTERVAL = 200;
/** Superchunk cells around the player's own that an occlusion result never hides. */
const OCCLUSION_NEAR_CELLS = 1;
/** World distance before a camera move forces an immediate occlusion query. */
const OCCLUSION_MOVE_FAST_TRACK = SUPERCHUNK_WORLD;
/** Cosine of the forward-turn past which a camera rotation forces a query. */
const OCCLUSION_TURN_FAST_TRACK = 0.75;

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
 * The world-space box a superchunk's merged geometry actually spans, for the
 * frustum test. Its two block centroids sit one `BLOCK_WORLD` apart, so the
 * union of their voxels reaches `BLOCK_HALF` before the superchunk's own
 * centre and `BLOCK_HALF + SUPERCHUNK_WORLD - BLOCK_HALF` after it: one
 * `SUPERCHUNK_HALF` each way around a centre shifted `BLOCK_HALF` out along
 * every axis. A box centred on the superchunk itself is a block-half short of
 * the far edge, which hid that sliver while it was still on screen.
 */
export const scBounds = (key: string): { center: Dim3; half: number } => {
  const [x, y, z] = scCenterOf(key);
  return {
    center: [x + BLOCK_HALF, y + BLOCK_HALF, z + BLOCK_HALF],
    half: SUPERCHUNK_HALF,
  };
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
  /**
   * Three 0..1 channels per vertex. The occlusion probe material reads this
   * as the chunk's flat colour, so the merged geometry carries what slot each
   * run of its vertices belongs to.
   */
  colors: number[];
};

const emptyArrays = (): MergedArrays => ({
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
  colors: [],
});

/** One view-frustum plane as the `[a, b, c, d]` of `a*x + b*y + c*z + d`. */
type FrustumPlane = [number, number, number, number];

/**
 * The six planes of a view-projection matrix, extracted the Gribb–Hartmann
 * way (not normalized — the sign tests below never need the magnitude). The
 * planes are named for which side of the frustum they bound.
 */
const frustumPlanes = (viewProjection: Matrix4): FrustumPlane[] => {
  const e = viewProjection.elements;
  return [
    [e[3] - e[0], e[7] - e[4], e[11] - e[8], e[15] - e[12]], // right
    [e[3] + e[0], e[7] + e[4], e[11] + e[8], e[15] + e[12]], // left
    [e[3] + e[1], e[7] + e[5], e[11] + e[9], e[15] + e[13]], // bottom
    [e[3] - e[1], e[7] - e[5], e[11] - e[9], e[15] - e[13]], // top
    [e[3] - e[2], e[7] - e[6], e[11] - e[10], e[15] - e[14]], // far
    [e[3] + e[2], e[7] + e[6], e[11] + e[10], e[15] + e[14]], // near
  ];
};

/**
 * Whether the axis-aligned box centred on `center` with half-extent `half`
 * on every axis intersects the frustum: it is fully outside the moment its
 * corner most forward along a plane's normal sits behind that plane.
 */
const inFrustum = (
  planes: FrustumPlane[],
  center: Dim3,
  half: number,
): boolean => {
  for (const [a, b, c, d] of planes) {
    const vx = a >= 0 ? center[0] + half : center[0] - half;
    const vy = b >= 0 ? center[1] + half : center[1] - half;
    const vz = c >= 0 ? center[2] + half : center[2] - half;
    if (a * vx + b * vy + c * vz + d < 0) {
      return false;
    }
  }
  return true;
};

/**
 * Appends one chunk's geometry to a superchunk's merged arrays at the
 * superchunk's origin: the chunk's block-local vertices are re-origined by
 * `(blockCenter - superchunkCenter)` and its indices are re-based on the
 * running vertex count. Every appended vertex also receives the chunk's probe
 * colour, so the merged geometry tells the occlusion pass which slot each run
 * of triangles belongs to.
 */
const appendArrays = (
  into: MergedArrays,
  a: MeshArrays,
  dx: number,
  dy: number,
  dz: number,
  color: [number, number, number],
): void => {
  const base = into.positions.length / 3;
  for (let i = 0; i < a.positions.length; i += 3) {
    into.positions.push(
      a.positions[i] + dx,
      a.positions[i + 1] + dy,
      a.positions[i + 2] + dz,
    );
    into.colors.push(color[0], color[1], color[2]);
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
  /** The uploaded geometry the slot meshes share, keyed by the merged arrays above. */
  terrainGeometry: BufferGeometry;
  waterGeometry: BufferGeometry;
  /** Each member's contiguous run of indices in the merged geometry, for its `drawRange`. */
  terrainRanges: Map<number, { start: number; count: number }>;
  waterRanges: Map<number, { start: number; count: number }>;
}

/** A chunk slice that holds nothing: whatever slice a slot actually has overwrites this. */
const EMPTY_RANGE = { start: 0, count: 0 };

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
  /** Each drawable chunk's meshes, one pair per block slot, sharing the superchunk geometry by `drawRange`. */
  private readonly scChunkTerrain = new Map<number, Mesh>();
  private readonly scChunkWater = new Map<number, Mesh>();
  /** Each slot's world-space centre, for the per-chunk frustum and near tests. */
  private readonly slotCenter = new Map<number, Dim3>();
  /** Each superchunk's merged arrays, uploaded geometry, and members' index runs. */
  private readonly scMerged = new Map<string, SuperchunkState>();
  /** Superchunks whose merged geometry must be fully re-joined (membership or data replaced). */
  private readonly scNeedsFull = new Set<string>();
  /** Superchunks whose merged geometry is stale and awaiting an upload this frame. */
  private readonly dirty = new Set<string>();
  /** Frame a superchunk's merged geometry was last uploaded on (drives the stall backstop). */
  private readonly scLastUpload = new Map<string, number>();
  private frame = 0;
  /** Slots currently holding merged geometry of either kind. */
  private readonly contentSlots = new Set<number>();
  /**
   * Blocks that changed as one edit and whose geometry has to reach the screen
   * together. A voxel on a chunk's boundary belongs to several blocks at once;
   * uploading one before the others shows it removed from that one while the
   * blocks beside it still draw the faces they culled against it, which is a
   * hole for as long as it takes the rest to land.
   */
  private readonly changedTogether: Array<{
    waitingFor: Set<number>;
    keys: Set<string>;
    since: number;
  }> = [];

  // The hardware occlusion culler: draws the window into an offscreen target
  // in one flat colour per chunk, reads the pixels back, and keeps the slots
  // that were actually visible. A chunk whose slot never appears on screen is
  // not drawn on the main pass until a later query sees it again.
  private readonly probeTerrainMaterial = new OcclusionProbeMaterial();
  private readonly probeWaterMaterial = new OcclusionProbeMaterial();
  /**
   * Draws each world chunk in the flat, visually-distinct colour of its slot
   * id, standing in for the terrain and water materials while `/render:probe`
   * is on so the occlusion culler's probe pass can be seen on screen.
   */
  private readonly probeDebugMaterial = new OcclusionDebugMaterial();
  private readonly occlusionScene = new Scene();
  private readonly scProbeTerrain = new Map<number, Mesh>();
  private readonly scProbeWater = new Map<number, Mesh>();
  private occlusionTarget: WebGLRenderTarget | null = null;
  private occlusionReadback: Uint8Array | null = null;
  /** The slots whose id won a pixel in the last query, or `null` before any ran. */
  private lastVisible: Set<number> | null = null;
  /**
   * The slots the last query's weave actually drew — a snapshot of the probe
   * scene at query time. A chunk is hidden only when it was in this set but
   * its id never won a pixel: a chunk whose geometry landed after the query
   * is one it never measured, so it keeps drawing until a later query
   * includes it.
   */
  private lastQueryTested = new Set<number>();
  private lastQueryFrame = Number.NEGATIVE_INFINITY;
  private lastQueryPosition: [number, number, number] | null = null;
  private lastQueryForward: [number, number, number] | null = null;
  private occlusionOn = true;
  private occlusionInterval = DEFAULT_OCCLUSION_INTERVAL;
  /** When on, the world draws as its probe pass: every chunk in its slot's debug colour. */
  private showProbe = false;
  /** Slots the occlusion pass is hiding this frame (content, in the frustum, neither near nor seen). */
  private occludedCount = 0;

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
    // Water probes shade over terrain but never hide it the way the real water
    // pass blends over the scene: the probe's depth stays the terrain's, so the
    // culler cannot mistake translucent water for an opaque occluder.
    this.probeWaterMaterial.depthWrite = false;

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
          if (!this.heldForGroup(index, key)) {
            this.dirty.add(key);
          }
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

  /** Opens a superchunk's member list, once. The slot meshes appear at upload. */
  private ensureSuperchunk(key: string): void {
    if (this.scMembers.has(key)) {
      return;
    }
    this.scMembers.set(key, []);
  }

  /** Removes a superchunk's meshes and its member slots' chunks once its last member leaves. */
  private removeSuperchunk(key: string): void {
    const members = this.scMembers.get(key);
    if (members !== undefined) {
      for (const m of members) {
        this.dropSlot(m.index);
      }
    }
    this.scMembers.delete(key);
    this.scMerged.delete(key);
    this.scNeedsFull.delete(key);
    this.dirty.delete(key);
    this.updateTriCount();
  }

  /** Unlinks one slot's world meshes and probes; the slot stays registered in `blockSc`. */
  private dropSlot(slot: number): void {
    for (const map of [this.scChunkTerrain, this.scChunkWater]) {
      const mesh = map.get(slot);
      if (mesh !== undefined) {
        // remove from whichever group holds the mesh, then drop the reference
        this.terrain.remove(mesh);
        this.water.remove(mesh);
        map.delete(slot);
      }
    }
    for (const map of [this.scProbeTerrain, this.scProbeWater]) {
      const probe = map.get(slot);
      if (probe !== undefined) {
        this.occlusionScene.remove(probe);
        map.delete(slot);
      }
    }
    this.contentSlots.delete(slot);
    this.slotCenter.delete(slot);
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
   * (a freshly repositioned cell whose stale surface must not flash). Each
   * member's contiguous run of indices is recorded against the merged arrays,
   * so the per-chunk meshes can be re-pointed at the freshly uploaded geometry
   * and the chunk data carries no more than its own `drawRange` and probe
   * colour.
   *
   * @returns Whether the merged geometry was uploaded.
   */
  private rebuildSuperchunk(key: string, force = false): boolean {
    const center = scCenterOf(key);
    const members = this.scMembers.get(key);
    if (members === undefined) {
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
        terrainGeometry: new BufferGeometry(),
        waterGeometry: new BufferGeometry(),
        terrainRanges: new Map(),
        waterRanges: new Map(),
      };
      this.scMerged.set(key, state);
      this.scNeedsFull.delete(key);
      for (const m of members) {
        if (this.chunkMeshes.has(m.index)) {
          this.appendChunk(state, m, center);
          appended = true;
        }
      }
    } else {
      state = existing as SuperchunkState;
      for (const m of members) {
        if (state.slots.has(m.index) || !this.chunkMeshes.has(m.index)) {
          continue;
        }
        this.appendChunk(state, m, center);
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
    setGeometryData(state.terrainGeometry, state.terrain);
    setOcclusionColors(state.terrainGeometry, state.terrain.colors);
    setGeometryData(state.waterGeometry, state.water);
    setOcclusionColors(state.waterGeometry, state.water.colors);
    this.scLastUpload.set(key, this.frame);
    this.syncSlotMeshes(key, center, state);
    this.updateTriCount();
    return true;
  }

  /** Appends one member's geometry to a superchunk's merged arrays and records its index run. */
  private appendChunk(
    state: SuperchunkState,
    m: { index: number; center: Dim3 },
    center: Dim3,
  ): void {
    const mesh = this.chunkMeshes.get(m.index)!;
    const dx = m.center[0] - center[0];
    const dy = m.center[1] - center[1];
    const dz = m.center[2] - center[2];
    const color = probeColor(m.index);
    const terrainStart = state.terrain.indices.length;
    appendArrays(state.terrain, mesh.terrain, dx, dy, dz, color);
    state.terrainRanges.set(m.index, {
      start: terrainStart,
      count: mesh.terrain.indices.length,
    });
    const waterStart = state.water.indices.length;
    appendArrays(state.water, mesh.water, dx, dy, dz, color);
    state.waterRanges.set(m.index, {
      start: waterStart,
      count: mesh.water.indices.length,
    });
    state.slots.add(m.index);
  }

  /**
   * Re-points a slot's world meshes and occlusion probes at the freshly
   * uploaded superchunk geometry, creating them the first time the slot
   * carries content. A slot that no longer carries one or the other mesh kind
   * has that mesh reduced to an empty range, hiding it.
   */
  private syncSlotMeshes(
    key: string,
    center: Dim3,
    state: SuperchunkState,
  ): void {
    for (const m of this.scMembers.get(key)!) {
      this.slotCenter.set(m.index, m.center);
      const terrainRange = state.terrainRanges.get(m.index) ?? EMPTY_RANGE;
      const waterRange = state.waterRanges.get(m.index) ?? EMPTY_RANGE;
      const hasTerrain = terrainRange.count > 0;
      const hasWater = waterRange.count > 0;
      if (hasTerrain) {
        const mesh = this.slotMesh(this.scChunkTerrain, this.terrain, m.index);
        this.seatSlotMesh(
          mesh,
          state.terrainGeometry,
          this.worldTerrainMaterial(),
          center,
          terrainRange,
        );
        const probe = this.slotMesh(
          this.scProbeTerrain,
          this.occlusionScene,
          m.index,
        );
        this.seatSlotMesh(
          probe,
          state.terrainGeometry,
          this.probeTerrainMaterial,
          center,
          terrainRange,
        );
      }
      if (hasWater) {
        const mesh = this.slotMesh(this.scChunkWater, this.water, m.index);
        this.seatSlotMesh(
          mesh,
          state.waterGeometry,
          this.worldWaterMaterial(),
          center,
          waterRange,
        );
        const probe = this.slotMesh(
          this.scProbeWater,
          this.occlusionScene,
          m.index,
        );
        this.seatSlotMesh(
          probe,
          state.waterGeometry,
          this.probeWaterMaterial,
          center,
          waterRange,
        );
      }
      this.setSlotRange(this.scChunkTerrain, m.index, terrainRange);
      this.setSlotRange(this.scChunkWater, m.index, waterRange);
      this.setSlotRange(this.scProbeTerrain, m.index, terrainRange);
      this.setSlotRange(this.scProbeWater, m.index, waterRange);
      if (hasTerrain || hasWater) {
        this.contentSlots.add(m.index);
      } else {
        this.contentSlots.delete(m.index);
      }
    }
  }

  /** Gets a slot's mesh from `map`, creating it under `container` the first time. */
  private slotMesh(
    map: Map<number, Mesh>,
    container: { add: (child: Mesh) => void },
    slot: number,
  ): Mesh {
    let mesh = map.get(slot);
    if (mesh === undefined) {
      mesh = new Mesh();
      container.add(mesh);
      map.set(slot, mesh);
    }
    return mesh;
  }

  /** Points an existing mesh at a geometry, transform, and the draw range of its chunk slice. */
  private seatSlotMesh(
    mesh: Mesh,
    geometry: BufferGeometry,
    material: NodeMaterial,
    center: Dim3,
    range: { start: number; count: number },
  ): void {
    mesh.geometry = geometry;
    mesh.material = material;
    mesh.position.set(center[0], center[1], center[2]);
    mesh.drawRange = range;
  }

  /** Shrinks a slot's existing mesh to an empty range when its data vanished. */
  private setSlotRange(
    map: Map<number, Mesh>,
    slot: number,
    range: { start: number; count: number },
  ): void {
    const mesh = map.get(slot);
    if (mesh !== undefined) {
      mesh.drawRange = range;
    }
  }

  /** The terrain world material, or the probe debug material while `/render:probe` is on. */
  private worldTerrainMaterial(): NodeMaterial {
    return this.showProbe ? this.probeDebugMaterial : this.triMaterial;
  }

  /** The water world material, or the probe debug material while `/render:probe` is on. */
  private worldWaterMaterial(): NodeMaterial {
    return this.showProbe ? this.probeDebugMaterial : this.triWaterMaterial;
  }

  /** Points every existing world mesh's material at the probe debug view on a toggle. */
  private syncProbeMaterials(): void {
    for (const mesh of this.scChunkTerrain.values()) {
      mesh.material = this.worldTerrainMaterial();
    }
    for (const mesh of this.scChunkWater.values()) {
      mesh.material = this.worldWaterMaterial();
    }
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
    for (const mesh of this.scChunkTerrain.values()) {
      tris += mesh.drawRange.count / 3;
    }
    for (const mesh of this.scChunkWater.values()) {
      tris += mesh.drawRange.count / 3;
    }
    this.totalTriangles = Math.round(tris);
  }

  /**
   * Points every chunk mesh at the camera: a chunk draws when it carries
   * geometry, its box is inside the frustum, and — once the occlusion pass has
   * any result — it is near the player or a query actually saw it. Geometry
   * stays uploaded and the content flags keep holding, so a chunk the camera
   * turns onto is shown the same frame rather than rebuilt; the degree of
   * hiding here only decides what is drawn, never what the window holds.
   */
  private applyVisibility(planes: FrustumPlane[], playerKey: string): void {
    this.occludedCount = 0;
    for (const [slot, mesh] of this.scChunkTerrain) {
      mesh.visible = this.chunkVisible(slot, mesh, planes, playerKey, true);
    }
    for (const [slot, mesh] of this.scChunkWater) {
      mesh.visible = this.chunkVisible(slot, mesh, planes, playerKey, false);
    }
  }

  /** Whether one chunk mesh draws this frame, counting what the occlusion hides. */
  private chunkVisible(
    slot: number,
    mesh: Mesh,
    planes: FrustumPlane[],
    playerKey: string,
    countOccluded: boolean,
  ): boolean {
    const center = this.slotCenter.get(slot);
    if (center === undefined || mesh.drawRange.count <= 0) {
      return false;
    }
    if (!inFrustum(planes, center, BLOCK_HALF)) {
      return false;
    }
    // The probe view draws every chunk the frustum keeps, so the whole of the
    // probe scene shows at once; the occlusion hiding below applies only to
    // the lit world.
    if (this.showProbe) {
      return true;
    }
    // A chunk the occlusion pass has never measured is never hidden by it:
    // the query that ran before its geometry landed could not have seen it,
    // so only the frustum and the near test decide. Once measured, a chunk
    // draws when it is near the player (the camera can be inside its cell,
    // and the probe cannot see the view from inside) or when the last query
    // actually saw it; anything else the query looked at but found covered is
    // skipped this frame.
    if (!this.lastQueryTested.has(slot)) {
      return true;
    }
    if (
      isNearCell(this.blockSc.get(slot) ?? "", playerKey, OCCLUSION_NEAR_CELLS)
    ) {
      return true;
    }
    if (this.lastVisible !== null && this.lastVisible.has(slot)) {
      return true;
    }
    if (countOccluded) {
      this.occludedCount++;
    }
    return false;
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

  /**
   * Whether `index`'s superchunk is being kept back because it changed
   * alongside blocks that have not been rebuilt yet. Releases every superchunk
   * the group touches once the last of them lands, so they upload as one.
   */
  private heldForGroup(index: number, key: string): boolean {
    for (let i = 0; i < this.changedTogether.length; i++) {
      const group = this.changedTogether[i];
      if (!group.waitingFor.has(index)) {
        continue;
      }
      group.waitingFor.delete(index);
      group.keys.add(key);
      if (group.waitingFor.size === 0) {
        for (const held of group.keys) {
          this.dirty.add(held);
        }
        this.changedTogether.splice(i, 1);
      }
      return true;
    }
    return false;
  }

  /**
   * Several blocks changed as one edit, and their geometry is uploaded
   * together. Pass every block holding the edited voxel — the one whose
   * interior owns it and the ones carrying it in their meshing border.
   */
  onBlocksChanged(indices: number[]): void {
    if (indices.length > 1) {
      this.changedTogether.push({
        waitingFor: new Set(indices),
        keys: new Set(),
        since: this.frame,
      });
    }
    for (const index of indices) {
      this.onBlockChanged(index);
    }
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
    // A block whose rebuild never arrives must not hold its neighbours off the
    // screen forever; past the stall backstop the group gives up whatever has
    // landed so far, and anything later uploads on its own.
    for (let i = this.changedTogether.length - 1; i >= 0; i--) {
      const group = this.changedTogether[i];
      if (this.frame - group.since < MAX_UPLOAD_STALL_FRAMES) {
        continue;
      }
      for (const held of group.keys) {
        this.dirty.add(held);
      }
      this.changedTogether.splice(i, 1);
    }
    const dirty = [...this.dirty];
    this.dirty.clear();
    // A superchunk the camera cannot see is left dirty rather than merged and
    // uploaded: the merge is the expensive part of a scroll's burst, and most
    // of the entering shell sits behind or beside the player. It rebuilds the
    // frame the camera turns onto it. The camera's world matrix is refreshed
    // here so the frustum is this frame's rather than last render's.
    camera.updateMatrixWorld(true);
    const viewProjection = new Matrix4()
      .copy(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse);
    const planes = frustumPlanes(viewProjection);
    for (const key of dirty) {
      const { center, half } = scBounds(key);
      if (!inFrustum(planes, center, half)) {
        this.dirty.add(key);
        continue;
      }
      this.rebuildSuperchunk(key);
    }
    // Hide what the camera is not looking at, now that this frame's rebuilds
    // have decided which superchunks have geometry.
    const playerKey = scKey(
      superchunkCellOf([
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ]),
    );
    this.applyVisibility(planes, playerKey);
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
   * Runs the hardware occlusion query this frame, when one is owed: draws the
   * probe scene (every content slot in its flat colour) into the offscreen
   * target and reads the pixels back, so the next `applyVisibility` can hide
   * the chunks the last query found covered. Called just before the main
   * render, so the probe is drawn from the same frame's geometry and the
   * same camera view the player sees that frame; the readback it returns
   * answers the frames after it.
   */
  occlusionFrame(renderer: WebGLRenderer, camera: PerspectiveCamera): void {
    if (!this.occlusionOn) {
      return;
    }
    if (this.scProbeTerrain.size === 0 && this.scProbeWater.size === 0) {
      return;
    }
    const gl = renderer.gl;
    const targetWidth = targetSizeFor(gl.drawingBufferWidth);
    const targetHeight = targetSizeFor(gl.drawingBufferHeight);
    camera.updateMatrixWorld(true);
    const forward = camera.getWorldDirection();
    const movedSquared =
      this.lastQueryPosition === null
        ? Number.POSITIVE_INFINITY
        : (camera.position.x - this.lastQueryPosition[0]) ** 2 +
          (camera.position.y - this.lastQueryPosition[1]) ** 2 +
          (camera.position.z - this.lastQueryPosition[2]) ** 2;
    const turnedDot =
      this.lastQueryForward === null
        ? -1
        : forward.x * this.lastQueryForward[0] +
          forward.y * this.lastQueryForward[1] +
          forward.z * this.lastQueryForward[2];
    if (
      !queryIsDue(this.frame - this.lastQueryFrame, movedSquared, turnedDot, {
        intervalFrames: this.occlusionInterval,
        moveFastTrack: OCCLUSION_MOVE_FAST_TRACK,
        turnFastTrack: OCCLUSION_TURN_FAST_TRACK,
      })
    ) {
      return;
    }
    this.occlusionTarget ??= new WebGLRenderTarget();
    this.occlusionTarget.width = targetWidth;
    this.occlusionTarget.height = targetHeight;
    if (
      this.occlusionReadback === null ||
      this.occlusionReadback.length < targetWidth * targetHeight * 4
    ) {
      this.occlusionReadback = new Uint8Array(targetWidth * targetHeight * 4);
    }
    // The canvas background is the sky, which would read back as a made-up
    // chunk id in any pixel the probes never painted. Clear the occlusion
    // pass to the reserved id-0 black, then hand the renderer back its own
    // clear colour before the visible pass uses it.
    const previousClear = gl.getParameter(gl.COLOR_CLEAR_VALUE);
    renderer.setClearColor(new Color(0, 0, 0), 1);
    renderer.render(this.occlusionScene, camera, this.occlusionTarget);
    renderer.setClearColor(
      new Color(previousClear[0], previousClear[1], previousClear[2]),
      previousClear[3],
    );
    renderer.readPixels(this.occlusionTarget, this.occlusionReadback);
    this.lastQueryTested = new Set<number>([
      ...this.scProbeTerrain.keys(),
      ...this.scProbeWater.keys(),
    ]);
    this.lastVisible = scanVisible(
      this.occlusionReadback,
      this.lastQueryTested,
    );
    this.lastQueryFrame = this.frame;
    this.lastQueryPosition = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    this.lastQueryForward = [forward.x, forward.y, forward.z];
  }

  /** On by default; when off, every chunk draws and no readback runs. */
  get occlusionEnabled(): boolean {
    return this.occlusionOn;
  }

  /** Turns the occlusion culler on or off. */
  set occlusionEnabled(on: boolean) {
    this.occlusionOn = on;
  }

  /** Frames a query's result is trusted before the GPU is asked again. */
  get occlusionIntervalFrames(): number {
    return this.occlusionInterval;
  }

  set occlusionIntervalFrames(frames: number) {
    this.occlusionInterval = Math.max(1, frames);
  }

  /** Chunks the occlusion pass is hiding this frame, for the debug line. */
  get occlusions(): number {
    return this.occludedCount;
  }

  /** Whether the world draws as its probe pass, each chunk in its slot's debug colour. */
  get probeDebug(): boolean {
    return this.showProbe;
  }

  /** Turns the probe view on or off, repointing every world mesh's material. */
  set probeDebug(on: boolean) {
    if (this.showProbe === on) {
      return;
    }
    this.showProbe = on;
    this.syncProbeMaterials();
  }

  /**
   * Terminates the mesh worker. Geometries and materials are not disposed —
   * rmsl does not expose a disposal API for them.
   */
  dispose(): void {
    this.meshes.dispose();
  }
}
