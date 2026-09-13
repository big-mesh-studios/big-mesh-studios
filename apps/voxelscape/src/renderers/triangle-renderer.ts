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
import { float, mat3, pow, vec2, vec3, vec4 } from "@random-mesh/rmsl";
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
import type { AtlasGrid, VoxelTileConfig } from "./atlas";
import { BLOCK_WORLD, type Dim3, type WorldBlock } from "../world/level-data";
import type { BlockMeshes, MeshArrays } from "./mesh";
import {
  meshUploadBytes,
  Superchunk,
  type GeometryPair,
  type IndexRange,
} from "./superchunk";
import { MeshClient } from "./mesh-client";
import { faceNormalOf, MAX_TILE_INDEX } from "./vertex-format";
import { Counter, Phase, probe } from "../render/perf-probe";
import type { WorldWorkerPool } from "../world/worker-pool";
import { OcclusionDebugMaterial } from "./occlusion-debug-material";
import { OcclusionProbeMaterial } from "./occlusion-probe-material";
import type { SlotColoured } from "./occlusion-probe-material";
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
  /**
   * The sheet's layout, so a vertex can name its tile by the cell it sits in
   * rather than carrying the rectangle it covers. Until a sheet is loaded the
   * whole texture is one cell, which is what the flat fallback colour draws.
   */
  atlasGrid: AtlasGrid = {
    columns: 1,
    tilePixels: [1, 1],
    sheetPixels: [1, 1],
  };
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
  private atlasColumnsUniform: UniformNode<"float"> | undefined;
  private atlasTileUniform: UniformNode<"vec2"> | undefined;
  private atlasInsetUniform: UniformNode<"vec2"> | undefined;
  private tilesSampler: UniformNode<"sampler2D"> | undefined;

  constructor() {
    super();
    // Every face is wound in `buildBlockMesh` toward the side it is exposed
    // on, so only the front side needs drawing.
    this.side = Side.FrontSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    void b.attribute("packed", "vec4");
    void b.varying("brightness", "float");
    // The emitters' own light, carried beside the sky light so the fragment can
    // add it after the day-night term instead of scaling it with the sun.
    void b.varying("blockLight", "float");
    // A quad covers as many cells as its faces merged into it, and its texture
    // coordinates count those cells, so the fragment wraps them back into the
    // one tile this vertex names.
    void b.varying("tileIndex", "float");
    this.atlasColumnsUniform = b.materialUniform(
      "atlasColumns",
      "float",
      () => this.atlasGrid.columns,
    );
    this.atlasTileUniform = b.materialUniform("atlasTile", "vec2", () => [
      this.atlasGrid.tilePixels[0] / this.atlasGrid.sheetPixels[0],
      this.atlasGrid.tilePixels[1] / this.atlasGrid.sheetPixels[1],
    ]);
    this.atlasInsetUniform = b.materialUniform("atlasInset", "vec2", () => [
      0.5 / this.atlasGrid.sheetPixels[0],
      0.5 / this.atlasGrid.sheetPixels[1],
    ]);
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

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    // One attribute holds three of this vertex's four small numbers, each a
    // byte scaled into 0..1; `vertex-format.ts` says which lane is which.
    const packed = b.attribute("packed", "vec4");
    b.varying("brightness", "float").assign(packed.y);
    b.varying("blockLight", "float").assign(packed.w);
    b.varying("tileIndex", "float").assign(packed.z.mul(255).round());
    const position4 = vec4(b.position, 1);
    const localPosition = b.instancing
      ? b.instanceMatrix.mul(position4)
      : position4;
    const worldPosition = b.modelMatrix.mul(localPosition);
    b.positionWorld.assign(worldPosition.xyz);
    let normal = faceNormalOf(packed.x.mul(255).round());
    if (b.instancing) {
      normal = mat3(b.instanceMatrix).mul(normal);
    }
    b.normalWorld.assign(b.normalMatrix.mul(normal).normalize());
    b.uvVarying.assign(b.uv);
    return b.projectionMatrix.mul(b.viewMatrix.mul(worldPosition));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const normal = b.normalWorld.normalize().toVar();
    const positionWorld = b.positionWorld.toVar();
    const uv = b.uvVarying.toVar();
    const brightness = b.varying("brightness", "float").toVar();
    const blockBright = b.varying("blockLight", "float").toVar();

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
      // `fract` tiles the quad; the cell the vertex names places that tile in
      // the sheet. The renderer builds no mip chain, so wrapping in the
      // fragment costs no seam: nothing picks a level from a derivative here.
      // The half-texel inset is the one `tileRect` bakes in, and keeps a tile
      // from bleeding into the one beside it.
      const columns = this.atlasColumnsUniform ?? float(1);
      const tile = this.atlasTileUniform ?? vec2(1, 1);
      const inset = this.atlasInsetUniform ?? vec2(0, 0);
      const index = b.varying("tileIndex", "float").toVar();
      const row = index.div(columns).floor();
      const column = index.sub(row.mul(columns));
      const within = vec2(uv.x.fract(), uv.y.fract());
      const span = vec2(tile.x.sub(inset.x.mul(2)), tile.y.sub(inset.y.mul(2)));
      const inAtlas = vec2(
        column.mul(tile.x).add(inset.x).add(within.x.mul(span.x)),
        row.mul(tile.y).add(inset.y).add(within.y.mul(span.y)),
      );
      albedo = this.tilesSampler.texture(inAtlas).rgb;
    }
    // baked per-vertex light + ambient occlusion, floored so unlit niches are
    // still a whisper of shape rather than pure black
    const floorBright = brightness.max(float(0.1)).min(float(1)).toVar();
    // Sky light is what the sun, moon and ambient scale. Block light is added
    // on top after that, unmultiplied, so a fire or a lava pool lights its
    // surroundings at midnight exactly as it does at noon.
    const lit = albedo.mul(lighting.mul(floorBright).max(blockBright)).toVar();

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
    // The water surface writes depth so surfaces behind it (other water, the
    // player under the surface) resolve against it rather than drawing over.
    this.depthWrite = true;
    // The water surface's triangle are wound toward their exposed side, and
    // its underside is never seen — the sea floor's tint covers that view.
    this.side = Side.FrontSide;
  }

  protected setup(b: Builder, _scene: Scene): void {
    void b.attribute("packed", "vec4");
    void b.varying("brightness", "float");
    void b.varying("blockLight", "float");
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

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const packed = b.attribute("packed", "vec4");
    b.varying("brightness", "float").assign(packed.y);
    b.varying("blockLight", "float").assign(packed.w);
    const position4 = vec4(b.position, 1);
    const localPosition = b.instancing
      ? b.instanceMatrix.mul(position4)
      : position4;
    const worldPosition = b.modelMatrix.mul(localPosition);
    b.positionWorld.assign(worldPosition.xyz);
    let normal = faceNormalOf(packed.x.mul(255).round());
    if (b.instancing) {
      normal = mat3(b.instanceMatrix).mul(normal);
    }
    b.normalWorld.assign(b.normalMatrix.mul(normal).normalize());
    b.uvVarying.assign(b.uv);
    return b.projectionMatrix.mul(b.viewMatrix.mul(worldPosition));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    const skyColour = this.fogColorUniform ?? vec3(0.53, 0.81, 0.92);
    const waterColour = this.waterColorUniform ?? vec3(0.1, 0.35, 0.55);
    const waterOpacity = this.waterOpacityUniform ?? float(0.5);
    // Water draws by the brighter of its two light channels, as the merged
    // terrain brightness used to read.
    const brightness = b
      .varying("brightness", "float")
      .max(b.varying("blockLight", "float"))
      .toVar();

    const positionWorld = b.positionWorld.toVar();
    const rayDirection = positionWorld.sub(b.cameraPosition).normalize();
    const fresnel = float(0.05)
      .add(float(0.95).mul(pow(float(1).sub(rayDirection.y.abs()), float(3))))
      .toVar();
    const floorBright = brightness.max(float(0.1)).min(float(1)).toVar();
    const rgb = waterColour.mix(skyColour, fresnel).mul(floorBright);
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
  /**
   * The most bytes of merged geometry one frame may mark for GPU upload; a
   * burst that exceeds it stays dirty and merges over the following frames.
   * Defaults to `MAX_UPLOAD_BYTES_PER_FRAME`; a test passes a smaller value to
   * make a single frame's spending observable.
   */
  uploadBytesPerFrame?: number;
  /**
   * The world's shared worker pool, used by the fill client too. A caller
   * that hands over a pool pools one set of workers for both jobs; a caller
   * that hands over nothing gets a private pool of `hardwareConcurrency`-1
   * combined workers (or the main-thread fallback).
   */
  pool?: WorldWorkerPool;
  /**
   * Supplies the workers of the pool built when `pool` is omitted. A caller
   * that hands over one worker (or nothing) gets a single worker (or the
   * main-thread fallback) instead.
   */
  createWorker?: () => Worker | undefined;
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
 * forced, and frames an edit's group of blocks may wait on each other before
 * whatever has landed uploads alone. A scroll's entering cells land over many
 * frames; without the first, a superchunk that never settles would stay
 * empty. Without the second, a block whose rebuild never lands would hold its
 * neighbours' geometry back forever, rather than the hole the grouping exists
 * to avoid landing early instead. The shared pool's few worker threads carry
 * both fill and mesh jobs, so a build queued behind a scroll's burst can take
 * much longer than a lone job's own meshing time; 45 frames (~750 ms) gives
 * that room before either backstop gives up on a straggler.
 */
const MAX_UPLOAD_STALL_FRAMES = 45;

/**
 * The bytes of merged geometry one frame may mark for GPU upload. A scroll's
 * shell or the initial load can settle several superchunks on the same frame,
 * and each full join's first upload is a whole-buffer GPU transfer; without a
 * cap the frame that lands them pays for all of them at once. The rest of a
 * burst stays dirty and merges over the following frames, nearest first.
 */
const MAX_UPLOAD_BYTES_PER_FRAME = 2 * 1024 * 1024;

/**
 * Frames' worth of upload the recycled geometry pool holds. A scroll's burst
 * takes a handful of frames to settle, and a pair recycled during one is taken
 * again by an entering superchunk inside them; past that the pool would only be
 * holding buffers on the card against a reuse that never comes.
 */
const GEOMETRY_POOL_FRAMES = 8;

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

/**
 * The world-space box a superchunk's merged geometry actually spans, for the
 * frustum test. Its two block centroids sit one `BLOCK_WORLD` apart, so the
 * union of their voxels reaches `BLOCK_HALF` before the superchunk's own
 * centre and `BLOCK_HALF + SUPERCHUNK_WORLD - BLOCK_HALF` after it: one
 * `SUPERCHUNK_HALF` each way around a centre shifted `BLOCK_HALF` out along
 * every axis. A box centred on the superchunk itself is a block-half short of
 * the far edge, which hid that sliver while it was still on screen.
 */
export const scBounds = (cell: Dim3): { center: Dim3; half: number } => ({
  center: [
    cell[0] * SUPERCHUNK_WORLD + BLOCK_HALF,
    cell[1] * SUPERCHUNK_WORLD + BLOCK_HALF,
    cell[2] * SUPERCHUNK_WORLD + BLOCK_HALF,
  ],
  half: SUPERCHUNK_HALF,
});

/** Bytes one block's built mesh occupies before it is merged. */
const meshArraysResidentBytes = (arrays: MeshArrays): number =>
  arrays.positions.byteLength +
  arrays.packed.byteLength +
  arrays.uvs.byteLength +
  arrays.indices.byteLength;

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

/** A recycled pair, with the bytes of card memory the arrays that filled it measured. */
interface PooledGeometry extends GeometryPair {
  bytes: number;
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
  /** The merged bytes one frame may mark for upload; the tick spends against it. */
  private readonly uploadBudgetBytes: number;
  /** Bytes of merged geometry marked for upload on this tick's merges, for the debug line. */
  private uploadBytesThisFrame = 0;
  /** Superchunks merged and marked for upload during this tick. */
  private mergesThisFrame = 0;

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
  /**
   * Whether each slot's build has landed, and whether it carried any geometry
   * when it did. Outlives the build's own arrays, which are let go once a
   * superchunk has copied them in, and answers the two questions asked of a
   * member long after that: whether it is still being waited for, and whether
   * it has anything worth drawing.
   */
  private readonly meshed = new Map<number, boolean>();
  /**
   * The runs each slot's meshes were last seated on, which is not what its
   * superchunk holds for it: a member joins a superchunk's arrays in one frame
   * and can wait several more for the upload that puts them on the card and
   * re-seats the meshes. Between the two the superchunk answers for a member
   * whose meshes still point at the geometry it came from, and drawing that
   * answer draws one superchunk's vertices out of another's buffer.
   */
  private readonly seated = new Map<
    number,
    { terrain: IndexRange; water: IndexRange }
  >();
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
  private readonly superchunks = new Map<string, Superchunk>();
  /**
   * Geometry pairs returned by superchunks that left the window, handed to the
   * next superchunk to fill in place. Filling a pair the card already has
   * buffers for spares the driver an allocation per superchunk cell visited,
   * which a scroll does several of a second.
   */
  private readonly geometryPool: PooledGeometry[] = [];
  /** Bytes of card memory the pooled pairs hold, as the merged arrays that filled them measured. */
  private geometryPoolBytes = 0;
  /** The most the pool holds before a recycled pair is handed back to the card instead. */
  private readonly geometryPoolBudgetBytes: number;
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
  /** The superchunk cell each key names, kept as its three numbers so nothing reads them back out of the key. */
  private readonly scCell = new Map<string, Dim3>();
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
  /** Set while a query's readback is in flight, so a later frame does not issue another before it lands. */
  private occlusionPending = false;
  private occlusionOn = true;
  private occlusionInterval = DEFAULT_OCCLUSION_INTERVAL;
  /** When on, the world draws as its probe pass: every chunk in its slot's debug colour. */
  private showProbe = false;
  /** Slots the occlusion pass is hiding this frame (content, in the frustum, neither near nor seen). */
  private occludedCount = 0;
  /** Content slots never measured by the occlusion readback (their mesh landed after the last query). */
  private lastTimedOut = 0;
  /** Content slots left visible because the player's superchunk cell is within the near ring. */
  private lastNearExempt = 0;
  /** Content slots the last query actually saw, left visible. */
  private lastSaw = 0;
  /** Chunk meshes left visible by the last `applyVisibility`, so one draw call each. */
  private drawnMeshes = 0;
  /** One superchunk's visible members while `drawRuns` orders them, reused every frame. */
  private readonly runOrder: number[] = [];
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
    this.uploadBudgetBytes =
      params.uploadBytesPerFrame ?? MAX_UPLOAD_BYTES_PER_FRAME;
    this.geometryPoolBudgetBytes =
      this.uploadBudgetBytes * GEOMETRY_POOL_FRAMES;
    // Water probes shade over terrain but never hide it the way the real water
    // pass blends over the scene: the probe's depth stays the terrain's, so the
    // culler cannot mistake translucent water for an opaque occluder.
    this.probeWaterMaterial.depthWrite = false;

    this.meshes = new MeshClient({
      blocks,
      pool: params.pool,
      createWorker: params.createWorker,
      onMeshBuilt: (index, terrain, water) => {
        // Cache the per-chunk build so the merger can re-read it, then defer
        // the superchunk upload to the next tick so a burst of results lands
        // as a single geometry update instead of one per block. A chunk that was
        // already joined has been replaced, so it gives its room in the merged
        // arrays back and is joined again from this build on the next merge.
        this.chunkMeshes.set(index, { terrain, water });
        this.meshed.set(
          index,
          terrain.indices.length > 0 || water.indices.length > 0,
        );
        const key = this.blockSc.get(index);
        if (key !== undefined) {
          this.superchunks.get(key)?.retire(index);
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
  private ensureSuperchunk(key: string, cell: Dim3): void {
    if (this.scMembers.has(key)) {
      return;
    }
    this.scMembers.set(key, []);
    this.scCell.set(key, cell);
  }

  /** Removes a superchunk's meshes and its member slots' chunks once its last member leaves. */
  private removeSuperchunk(key: string): void {
    this.scCell.delete(key);
    const members = this.scMembers.get(key);
    if (members !== undefined) {
      for (const m of members) {
        this.dropSlot(m.index);
      }
    }
    this.scMembers.delete(key);
    const merged = this.superchunks.get(key);
    if (merged !== undefined) {
      this.recycleGeometryPair(merged);
    }
    this.superchunks.delete(key);
    this.dirty.delete(key);
    this.updateTriCount();
  }

  /**
   * A fresh upload-geometry pair, drawn from the pool when one is free. The
   * pair's identity stays constant for the life of the superchunk that took it
   * and for each superchunk that reuses it, so the renderer re-fills the same
   * GPU buffers it already holds rather than allocating new ones.
   */
  private takeGeometryPair(): GeometryPair {
    const pooled = this.geometryPool.pop();
    if (pooled !== undefined) {
      this.geometryPoolBytes -= pooled.bytes;
      return { terrain: pooled.terrain, water: pooled.water };
    }
    return {
      terrain: new BufferGeometry(),
      water: new BufferGeometry(),
    };
  }

  /**
   * Hands a superchunk's geometry pair on now that the superchunk is gone: to
   * the pool for the next superchunk to fill, or, once the pool holds a burst's
   * worth of card memory, back to the card. The arrays the pair was left with go
   * either way, since a pooled pair is filled from the arrays of whichever
   * superchunk takes it.
   */
  private recycleGeometryPair(superchunk: Superchunk): void {
    const bytes = superchunk.bytes;
    const pair = superchunk.release();
    if (this.geometryPoolBytes + bytes > this.geometryPoolBudgetBytes) {
      pair.terrain.dispose();
      pair.water.dispose();
      return;
    }
    this.geometryPool.push({ terrain: pair.terrain, water: pair.water, bytes });
    this.geometryPoolBytes += bytes;
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
    this.seated.delete(slot);
    this.slotCenter.delete(slot);
  }

  /**
   * Reconciles a superchunk's merged geometry against its current members'
   * cached builds and uploads it in place. The fast path appends only the
   * chunks that landed since the last rebuild (a scroll's entering shell), so
   * a frame costs the new geometry's size, not the whole superchunk's; a
   * member whose data was replaced or whose slot moved away gives its room in
   * the merged arrays back for the next member to write into.
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
    const members = this.scMembers.get(key);
    const cell = this.scCell.get(key);
    if (members === undefined || cell === undefined) {
      return false;
    }
    const center: Dim3 = [
      cell[0] * SUPERCHUNK_WORLD,
      cell[1] * SUPERCHUNK_WORLD,
      cell[2] * SUPERCHUNK_WORLD,
    ];
    let superchunk = this.superchunks.get(key);
    // The first merge of a cell is the only one that needs geometry of its own:
    // a member that leaves, or whose voxels changed, gives its room in these
    // arrays back, and the next member that fits writes into it.
    const first = superchunk === undefined;
    if (superchunk === undefined) {
      superchunk = new Superchunk(center, this.takeGeometryPair());
      this.superchunks.set(key, superchunk);
    }
    let appended = false;
    for (const m of members) {
      const built = this.chunkMeshes.get(m.index);
      if (built === undefined || superchunk.holds(m.index)) {
        continue;
      }
      superchunk.join(m.index, m.center, built);
      // The superchunk copied the vertices into its own arrays, so this build
      // has no reader left: the merged geometry is what draws, and a member
      // whose voxels change is meshed again from its voxels rather than from
      // here. Holding it would be a second copy of every block in the window.
      this.chunkMeshes.delete(m.index);
      appended = true;
    }
    // Upload only when the superchunk has settled (every member meshed), when
    // its membership itself changed (the stale data has to leave now), or
    // when it has been waiting too long. Otherwise defer and re-queue for the
    // next frame, so a scroll's burst of chunks costs a handful of uploads
    // instead of one per landed chunk.
    const missing = members.reduce(
      (n, m) => n + (this.meshed.has(m.index) ? 0 : 1),
      0,
    );
    const lastUpload = this.scLastUpload.get(key);
    const stalled =
      lastUpload !== undefined &&
      this.frame - lastUpload >= MAX_UPLOAD_STALL_FRAMES;
    const uploadNow = force || first || (appended && missing === 0) || stalled;
    if (!uploadNow) {
      if (appended) {
        this.dirty.add(key);
      }
      return false;
    }
    this.scLastUpload.set(key, this.frame);
    probe.count(Counter.uploads);
    this.uploadBytesThisFrame += superchunk.upload();
    this.syncSlotMeshes(key, center, superchunk);
    this.updateTriCount();
    return true;
  }

  /**
   * The bytes `rebuildSuperchunk` would mark for upload for `key` right now,
   * before the merge runs: a full re-join owes every landed member's mesh at
   * whole size, and an append-only rebuild owes its un-joined members plus the
   * un-committed tail of geometry already joined. The tick's frame budget
   * spends against this estimate, so a burst is paced in units of upload volume
   * rather than superchunk count.
   */
  private pendingUploadBytes(key: string): number {
    const members = this.scMembers.get(key);
    if (members === undefined) {
      return 0;
    }
    const superchunk = this.superchunks.get(key);
    if (superchunk === undefined) {
      // Nothing is merged here yet, so every member whose build has landed is
      // owed at whole-mesh size.
      let bytes = 0;
      for (const member of members) {
        const built = this.chunkMeshes.get(member.index);
        if (built !== undefined) {
          bytes +=
            meshUploadBytes(built.terrain) + meshUploadBytes(built.water);
        }
      }
      return bytes;
    }
    // The members not joined yet, plus what it has written since its last
    // upload — a freed run, once something fills it, or the tail it grew.
    let bytes = superchunk.pendingBytes;
    for (const member of members) {
      if (superchunk.holds(member.index)) {
        continue;
      }
      const built = this.chunkMeshes.get(member.index);
      if (built !== undefined) {
        bytes += meshUploadBytes(built.terrain) + meshUploadBytes(built.water);
      }
    }
    return bytes;
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
    superchunk: Superchunk,
  ): void {
    for (const m of this.scMembers.get(key)!) {
      this.slotCenter.set(m.index, m.center);
      const { terrain: terrainRange, water: waterRange } = superchunk.rangeOf(
        m.index,
      );
      const hasTerrain = terrainRange.count > 0;
      const hasWater = waterRange.count > 0;
      if (hasTerrain) {
        const mesh = this.slotMesh(this.scChunkTerrain, this.terrain, m.index);
        this.seatSlotMesh(
          mesh,
          superchunk.terrain,
          this.worldTerrainMaterial(),
          center,
          terrainRange,
        );
        const probe = this.probeMesh(this.scProbeTerrain, m.index);
        this.seatSlotMesh(
          probe,
          superchunk.terrain,
          this.probeTerrainMaterial,
          center,
          terrainRange,
        );
      }
      if (hasWater) {
        const mesh = this.slotMesh(this.scChunkWater, this.water, m.index);
        this.seatSlotMesh(
          mesh,
          superchunk.water,
          this.worldWaterMaterial(),
          center,
          waterRange,
        );
        const probe = this.probeMesh(this.scProbeWater, m.index);
        this.seatSlotMesh(
          probe,
          superchunk.water,
          this.probeWaterMaterial,
          center,
          waterRange,
        );
      }
      this.setSlotRange(this.scChunkTerrain, m.index, terrainRange);
      this.setSlotRange(this.scChunkWater, m.index, waterRange);
      this.setSlotRange(this.scProbeTerrain, m.index, terrainRange);
      this.setSlotRange(this.scProbeWater, m.index, waterRange);
      this.seated.set(m.index, {
        terrain: { start: terrainRange.start, count: terrainRange.count },
        water: { start: waterRange.start, count: waterRange.count },
      });
      if (hasTerrain || hasWater) {
        this.contentSlots.add(m.index);
      } else {
        this.contentSlots.delete(m.index);
      }
    }
  }

  /**
   * Gets a slot's probe mesh, creating it the first time under the occlusion
   * scene and seating the slot id it paints itself in. The id is the same for
   * every vertex the mesh draws and the material is shared with every other
   * probe, so the mesh writes it to the material it is about to be drawn with
   * rather than the geometry carrying a copy on each vertex.
   */
  private probeMesh(map: Map<number, Mesh>, slot: number): Mesh {
    const existing = map.get(slot);
    if (existing !== undefined) {
      return existing;
    }
    const mesh = this.slotMesh(map, this.occlusionScene, slot);
    const color = probeColor(slot);
    mesh.onBeforeRender = () => {
      (mesh.material as unknown as SlotColoured).slotColor = color;
    };
    return mesh;
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
      // Its own range object for the life of the mesh, never the superchunk's:
      // a frame widens this one to cover the members drawn alongside it, which
      // would otherwise be widening the record of where a member's vertices sit.
      mesh.drawRange = { start: 0, count: 0 };
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
    mesh.drawRange.start = range.start;
    mesh.drawRange.count = range.count;
  }

  /** Shrinks a slot's existing mesh to an empty range when its data vanished. */
  private setSlotRange(
    map: Map<number, Mesh>,
    slot: number,
    range: { start: number; count: number },
  ): void {
    const mesh = map.get(slot);
    if (mesh !== undefined) {
      mesh.drawRange.start = range.start;
      mesh.drawRange.count = range.count;
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
    for (const slot of this.scChunkTerrain.keys()) {
      tris += this.seatedRange(slot, true).count / 3;
    }
    for (const slot of this.scChunkWater.keys()) {
      tris += this.seatedRange(slot, false).count / 3;
    }
    this.totalTriangles = Math.round(tris);
  }

  /**
   * The run one member's mesh is seated on: what it has to draw, and where the
   * runs of the members drawn beside it begin. A mesh's `drawRange` cannot
   * answer that, because it holds what the mesh draws this frame, which may be
   * several members at once.
   */
  private seatedRange(slot: number, terrain: boolean): IndexRange {
    const runs = this.seated.get(slot);
    if (runs === undefined) {
      return EMPTY_RANGE;
    }
    return terrain ? runs.terrain : runs.water;
  }

  /**
   * Points every chunk mesh at the camera: a chunk draws when it carries
   * geometry, its box is inside the frustum, and — once the occlusion pass has
   * any result — it is near the player or a query actually saw it. Geometry
   * stays uploaded and the content flags keep holding, so a chunk the camera
   * turns onto is shown the same frame rather than rebuilt; the degree of
   * hiding here only decides what is drawn, never what the window holds.
   */
  private applyVisibility(planes: FrustumPlane[], playerCell: Dim3): void {
    this.occludedCount = 0;
    this.lastTimedOut = 0;
    this.lastNearExempt = 0;
    this.lastSaw = 0;
    this.drawnMeshes = 0;
    for (const [slot, mesh] of this.scChunkTerrain) {
      mesh.visible = this.chunkVisible(slot, true, planes, playerCell, true);
    }
    for (const [slot, mesh] of this.scChunkWater) {
      mesh.visible = this.chunkVisible(slot, false, planes, playerCell, false);
    }
    this.drawRuns(this.scChunkTerrain, true);
    this.drawRuns(this.scChunkWater, false);
  }

  /**
   * Draws each unbroken run of one superchunk's visible members as a single
   * call. Its members share a geometry, a material and a position — they are
   * all seated at the superchunk's own centre — so members whose vertices lie
   * end to end are one call's worth of work being asked for several times. The
   * first member of a run widens its range over the rest, and the rest stand
   * down; the triangles drawn are the same either way.
   *
   * Left alone while the probe pass is drawn to the screen, where each slot
   * paints itself in its own colour and has to be its own call.
   */
  private drawRuns(meshes: Map<number, Mesh>, terrain: boolean): void {
    if (this.showProbe) {
      for (const mesh of meshes.values()) {
        if (mesh.visible) {
          this.drawnMeshes++;
        }
      }
      return;
    }
    const order = this.runOrder;
    for (const [key, members] of this.scMembers) {
      const superchunk = this.superchunks.get(key);
      if (superchunk === undefined) {
        continue;
      }
      order.length = 0;
      for (const member of members) {
        if (meshes.get(member.index)?.visible === true) {
          order.push(member.index);
        }
      }
      if (order.length === 0) {
        continue;
      }
      order.sort(
        (a, b) =>
          this.seatedRange(a, terrain).start -
          this.seatedRange(b, terrain).start,
      );
      let leader = meshes.get(order[0]) as Mesh;
      let start = this.seatedRange(order[0], terrain).start;
      let count = this.seatedRange(order[0], terrain).count;
      for (let at = 1; at < order.length; at++) {
        const range = this.seatedRange(order[at], terrain);
        if (range.start === start + count) {
          count += range.count;
          (meshes.get(order[at]) as Mesh).visible = false;
          continue;
        }
        leader.drawRange.start = start;
        leader.drawRange.count = count;
        this.drawnMeshes++;
        leader = meshes.get(order[at]) as Mesh;
        start = range.start;
        count = range.count;
      }
      leader.drawRange.start = start;
      leader.drawRange.count = count;
      this.drawnMeshes++;
    }
  }

  /** Whether one chunk mesh draws this frame, counting what the occlusion hides. */
  private chunkVisible(
    slot: number,
    terrain: boolean,
    planes: FrustumPlane[],
    playerCell: Dim3,
    countOccluded: boolean,
  ): boolean {
    const center = this.slotCenter.get(slot);
    if (center === undefined || this.seatedRange(slot, terrain).count <= 0) {
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
    // The same three questions `slotHiddenByOcclusion` asks, asked once each:
    // a chunk that was never measured needs no near test, and one that is near
    // needs no look at what the query saw.
    if (!this.lastQueryTested.has(slot)) {
      this.lastTimedOut++;
      return true;
    }
    if (this.slotIsNear(slot, playerCell)) {
      this.lastNearExempt++;
      return true;
    }
    if (this.lastVisible !== null && !this.lastVisible.has(slot)) {
      if (countOccluded) {
        this.occludedCount++;
      }
      return false;
    }
    this.lastSaw++;
    return true;
  }

  /**
   * Whether the occlusion pass has *proved* `slot` covered: it was measured by
   * the last query, is not inside the player's near-cell ring, and the query
   * never saw its id win a pixel. A slot the query has not measured (its
   * geometry landed after the last readback) is never called hidden, and
   * neither is one the camera sits beside or inside, whose surroundings the
   * probe cannot see. This is the same predicate the drawing path uses, so a
   * chunk the culler hides from drawing is also a chunk whose freshly-built
   * geometry the merge stage may safely leave unbuilt.
   */
  /**
   * Whether a slot's superchunk sits on or beside the player's own, which
   * exempts it from the occlusion pass.
   */
  private slotIsNear(slot: number, playerCell: Dim3): boolean {
    const key = this.blockSc.get(slot);
    const cell = key === undefined ? undefined : this.scCell.get(key);
    return (
      cell !== undefined && isNearCell(cell, playerCell, OCCLUSION_NEAR_CELLS)
    );
  }

  private slotHiddenByOcclusion(slot: number, playerCell: Dim3): boolean {
    if (!this.lastQueryTested.has(slot)) {
      return false;
    }
    if (this.slotIsNear(slot, playerCell)) {
      return false;
    }
    return this.lastVisible !== null && !this.lastVisible.has(slot);
  }

  /**
   * Whether a superchunk's merged geometry may be left unbuilt this frame
   * because the occlusion pass has proved every one of its content members
   * covered. A superchunk with no content needs no upload, and a member that
   * is on screen, near the player, or never measured keeps the whole superchunk
   * merging, since it can only be drawn from the merged geometry. Deciding from
   * which members carry geometry works on a superchunk the moment its first
   * meshes land, so a scroll's whole occluded shell defers from its first
   * chunk, not only once it has merged once.
   */
  private scOccluded(key: string, playerCell: Dim3): boolean {
    const mergedSlots = this.superchunks.get(key)?.members;
    if (mergedSlots !== undefined && mergedSlots.size > 0) {
      for (const slot of mergedSlots as Set<number>) {
        if (!this.slotHiddenByOcclusion(slot, playerCell)) {
          return false;
        }
      }
      return true;
    }
    // Not merged yet: judge by the members whose builds have landed with actual
    // geometry. A member with no build, or one whose build is empty, does not
    // force an upload; the rest must all be proved covered.
    const members = this.scMembers.get(key);
    if (members === undefined || members.length === 0) {
      return false;
    }
    let sawContent = false;
    for (const m of members) {
      if (this.meshed.get(m.index) !== true) {
        continue;
      }
      sawContent = true;
      if (!this.slotHiddenByOcclusion(m.index, playerCell)) {
        return false;
      }
    }
    return sawContent;
  }

  get triangleCount(): number {
    return this.totalTriangles;
  }

  /** Bytes of merged geometry the last tick marked for GPU upload, for the debug line. */
  get lastTickUploadBytes(): number {
    return this.uploadBytesThisFrame;
  }

  /**
   * Bytes of every superchunk's merged attribute buffers, at the capacity they
   * have grown to rather than the part written. The graphics card holds a copy
   * of what has been uploaded of these on top of them.
   */
  get mergedGeometryBytes(): number {
    let bytes = 0;
    for (const superchunk of this.superchunks.values()) {
      bytes += superchunk.bytes;
    }
    return bytes;
  }

  /**
   * Bytes of the per-block meshes the workers built and no superchunk has
   * copied in yet: a block whose build has landed while the superchunk holding
   * it waits its turn to merge. A build is let go as it joins, so this counts
   * what is in flight rather than a second copy of what is already merged.
   */
  get blockGeometryBytes(): number {
    let bytes = 0;
    for (const built of this.chunkMeshes.values()) {
      bytes +=
        meshArraysResidentBytes(built.terrain) +
        meshArraysResidentBytes(built.water);
    }
    return bytes;
  }

  /** Superchunks the last tick merged and marked for upload. */
  get lastTickMerges(): number {
    return this.mergesThisFrame;
  }

  /** Superchunks holding block geometry that has not been merged and uploaded yet. */
  get dirtySuperchunkCount(): number {
    return this.dirty.size;
  }

  /** Blocks queued for a geometry rebuild that no worker has started yet. */
  get meshPendingCount(): number {
    return this.meshes.pendingCount;
  }

  /** Blocks a worker is building geometry for right now. */
  get meshInFlightCount(): number {
    return this.meshes.inFlightCount;
  }

  /**
   * Resizes what this holds to a window of `count` slots. Slots past the end
   * of a window that has shrunk are forgotten: their meshes leave the scene,
   * their geometry is let go, and their superchunk stops counting them among
   * its members.
   *
   * A superchunk left holding a member the window no longer has never settles
   * — the member cannot mesh, so the superchunk waits for it and stops
   * uploading — which is why this is not simply a matter of dropping meshes.
   */
  resizeTo(count: number): void {
    for (const slot of [...this.blockSc.keys()]) {
      if (slot < count) {
        continue;
      }
      this.dropSlot(slot);
      this.chunkMeshes.delete(slot);
      this.meshed.delete(slot);
      this.meshes.invalidate(slot);
      const key = this.blockSc.get(slot);
      this.blockSc.delete(slot);
      if (key === undefined) {
        continue;
      }
      const members = this.scMembers.get(key);
      const at = members?.findIndex((m) => m.index === slot) ?? -1;
      if (at >= 0) {
        members!.splice(at, 1);
      }
      if (members !== undefined && members.length === 0) {
        this.removeSuperchunk(key);
      } else {
        this.superchunks.get(key)?.retire(slot);
        this.dirty.add(key);
      }
    }
    this.meshes.resizeTo(count);
  }

  repositionBlock(index: number, center: Dim3): void {
    const newCell = superchunkCellOf(center);
    const newKey = scKey(newCell);
    const oldKey = this.blockSc.get(index);
    // the slot now holds a different cell's terrain: drop the stale build and
    // any queue for it, but don't queue a rebuild — `onBlockChanged` does that
    // once the new data actually arrives
    this.chunkMeshes.delete(index);
    this.meshed.delete(index);
    this.seated.delete(index);
    this.meshes.invalidate(index);
    // The slot's world and probe meshes still point at the old superchunk's
    // geometry pair, which the next full re-join hands back to the pool for
    // another superchunk to re-upload. Unseat them now so no mesh with a live
    // range draws whatever content that pair is next filled with at the old
    // location; the replacement mesh is seated when the new cell's build lands.
    for (const map of [
      this.scChunkTerrain,
      this.scChunkWater,
      this.scProbeTerrain,
      this.scProbeWater,
    ]) {
      const mesh = map.get(index);
      if (mesh !== undefined) {
        mesh.drawRange.start = 0;
        mesh.drawRange.count = 0;
      }
    }
    this.slotCenter.delete(index);
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
        this.superchunks.get(oldKey)?.retire(index);
        this.dirty.add(oldKey);
      }
    }
    this.ensureSuperchunk(newKey, newCell);
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

  onBlockChanged(index: number, meshes?: BlockMeshes): void {
    if (meshes !== undefined) {
      // The worker that filled this block meshed it in the same job, so its
      // geometry is already current: adopt it instead of queueing another
      // build that a busy worker would serve after other queued fills.
      this.meshes.acceptMesh(index, meshes);
      return;
    }
    this.meshes.requestBuild(index);
  }

  setTiles(
    voxelTiles: VoxelTileConfig[],
    texture: Texture,
    grid: AtlasGrid,
  ): void {
    // A vertex names its tile in one byte, so a sheet with more cells than a
    // byte can count cannot be drawn from. Caught here, where the sheet
    // arrives, rather than as tiles wrapping onto each other in the world.
    for (const tile of voxelTiles) {
      const highest = Math.max(tile.top, tile.side, tile.bottom);
      if (highest > MAX_TILE_INDEX) {
        throw new Error(
          `[atlas] tile index ${highest} is past the ${MAX_TILE_INDEX} a vertex can name`,
        );
      }
    }
    this.triMaterial.tilesTexture = texture;
    this.triMaterial.atlasGrid = grid;
    this.triMaterial.needsUpdate = true;
    this.meshes.setTiles(voxelTiles);
  }

  /** The atlas's current tile rectangles, for the fill worker's combined meshes to bake. */
  get tileRects(): VoxelTileConfig[] {
    return this.meshes.tileRects;
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
    probe.begin(Phase.meshDrain);
    this.meshes.drain();
    probe.end(Phase.meshDrain);
    // Merging landed block results into superchunk geometry keeps a burst of
    // builds reading as a few draw calls rather than a few thousand, and the
    // tick below spends a byte budget on those merges each frame so no single
    // frame pays for the whole of a scroll's burst at once. A superchunk that
    // is still meshing stays dirty and uploads once it settles (or the stall
    // backstop trips).
    this.frame++;
    this.uploadBytesThisFrame = 0;
    this.mergesThisFrame = 0;
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
    const playerCell = superchunkCellOf([
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ]);
    // Of the superchunks the gates above leave, merge and upload a frame's
    // byte budget at a time: the burst of a scroll or the initial load can
    // settle several superchunks on one frame, and each full join's first
    // upload is a whole-buffer GPU transfer. The nearest superchunks merge
    // first, so the terrain entering view ahead of the player appears before
    // the rest, and whatever exceeds the budget stays dirty like an occluded
    // superchunk does. A superchunk whose whole join alone exceeds the budget
    // still merges that frame — it is the only thing the frame could spend.
    const due: Array<{ key: string; d2: number; bytes: number }> = [];
    for (const key of dirty) {
      const cell = this.scCell.get(key);
      if (cell === undefined) {
        continue;
      }
      const { center, half } = scBounds(cell);
      if (!inFrustum(planes, center, half)) {
        this.dirty.add(key);
        continue;
      }
      // A superchunk whose every content member the occlusion pass has proved
      // covered is deferred like an off-frustum one: no point merging and
      // uploading geometry the culler has already shown the player cannot see.
      // It stays dirty — proxies behind a hill or along occluded sight-lines
      // are the bulk of what a scroll's entering shell would otherwise merge —
      // and rebuilds the frame a query or camera move re-exposes a member.
      // A superchunk with any member on screen or unmeasured still merges, so
      // nothing the player could see waits on the culler.
      if (this.scOccluded(key, playerCell)) {
        this.dirty.add(key);
        continue;
      }
      const dx = center[0] - camera.position.x;
      const dy = center[1] - camera.position.y;
      const dz = center[2] - camera.position.z;
      due.push({
        key,
        d2: dx * dx + dy * dy + dz * dz,
        bytes: this.pendingUploadBytes(key),
      });
    }
    due.sort((a, b) => a.d2 - b.d2);
    let spent = 0;
    probe.begin(Phase.merge);
    for (const candidate of due) {
      if (spent > 0 && spent + candidate.bytes > this.uploadBudgetBytes) {
        this.dirty.add(candidate.key);
        continue;
      }
      if (this.rebuildSuperchunk(candidate.key)) {
        spent += candidate.bytes;
        this.mergesThisFrame++;
        probe.count(Counter.merges);
      }
    }
    probe.end(Phase.merge);
    // Hide what the camera is not looking at, now that this frame's rebuilds
    // have decided which superchunks have geometry.
    this.applyVisibility(planes, playerCell);
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
   * target and reads the pixels back, so a later `applyVisibility` can hide
   * the chunks the query found covered. Called just before the main render,
   * so the probe is drawn from the same frame's geometry and the same
   * camera view the player sees that frame. The readback itself runs off the
   * GPU without blocking this frame, and lands a frame or a few later —
   * `applyVisibility` keeps answering from the last query that landed until
   * this one does, which is fine for a hint that only ever needs to be
   * roughly current.
   */
  occlusionFrame(renderer: WebGLRenderer, camera: PerspectiveCamera): void {
    if (!this.occlusionOn) {
      return;
    }
    if (this.occlusionPending) {
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
    // Sized exactly, so a target that shrank does not leave stale pixels past
    // the bytes this frame's `readPixels` overwrites.
    const readbackBytes = targetWidth * targetHeight * 4;
    if (
      this.occlusionReadback === null ||
      this.occlusionReadback.length !== readbackBytes
    ) {
      this.occlusionReadback = new Uint8Array(readbackBytes);
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
    const tested = new Set<number>([
      ...this.scProbeTerrain.keys(),
      ...this.scProbeWater.keys(),
    ]);
    this.occlusionPending = true;
    void this.runOcclusionQuery(
      renderer,
      this.occlusionTarget,
      this.occlusionReadback,
      tested,
      readbackBytes,
    );
    this.lastQueryFrame = this.frame;
    this.lastQueryPosition = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    this.lastQueryForward = [forward.x, forward.y, forward.z];
  }

  /**
   * Waits on one occlusion query's readback and turns it into the
   * visible-slot set a later `applyVisibility` reads. Runs detached from
   * `occlusionFrame`, which keeps `occlusionPending` set for exactly as long
   * as this takes so a later frame does not start another query over it; a
   * readback that lands nothing usable (context loss mid-flight, say) is
   * left for the next `queryIsDue` check to retry, with `lastVisible`
   * unchanged from whatever the last query that did land found.
   */
  private async runOcclusionQuery(
    renderer: WebGLRenderer,
    target: WebGLRenderTarget,
    out: Uint8Array,
    tested: Set<number>,
    readbackBytes: number,
  ): Promise<void> {
    try {
      const readback = await renderer.readPixelsAsync(target, out);
      this.lastQueryTested = tested;
      this.lastVisible = scanVisible(readback, tested, readbackBytes);
    } catch {
      // Nothing usable landed; lastVisible and lastQueryTested keep their
      // prior values, and the next queryIsDue check retries on its own.
    } finally {
      this.occlusionPending = false;
    }
  }

  /** On by default; when off, every chunk draws and no readback runs. */
  get occlusionEnabled(): boolean {
    return this.occlusionOn;
  }

  /** Turns the occlusion culler on or off; turning it on measures the view immediately. */
  set occlusionEnabled(on: boolean) {
    this.occlusionOn = on;
    if (on) {
      this.forceOcclusionQuery();
    }
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

  /**
   * Forgets when the last query ran, so the next `occlusionFrame` measures the
   * current view immediately instead of waiting out the interval or a move or
   * turn fast track.
   */
  forceOcclusionQuery(): void {
    this.lastQueryFrame = Number.NEGATIVE_INFINITY;
    this.lastQueryPosition = null;
    this.lastQueryForward = null;
  }

  /**
   * Chunk meshes the last visibility pass left drawing, which is what the
   * world pass costs in draw calls: a bind and a set of uniform uploads each.
   */
  get lastDrawnMeshes(): number {
    return this.drawnMeshes;
  }

  /** How many chunks the last probe query saw (the set it found visible). */
  get lastVisibleCount(): number {
    return this.lastVisible === null ? 0 : this.lastVisible.size;
  }

  /**
   * Where the last `applyVisibility` put the chunks it could have hidden, for
   * the debug line: some were never measured, some the player's cell let stay,
   * some the probe actually saw, and the remainder the occlusion hid.
   */
  get occlusionBreakdown(): string {
    const held = [
      `simple ${this.lastTimedOut}`,
      `near ${this.lastNearExempt}`,
      `seen ${this.lastSaw}`,
    ];
    if (this.occludedCount > 0) {
      held.push(`occluded ${this.occludedCount}`);
    }
    return held.join(", ");
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
   * Terminates the mesh worker and gives every superchunk's geometry back, the
   * pairs in use and the pooled ones alike, so a renderer torn down leaves none
   * of the world's geometry on the card. Materials are not disposed — rmsl does
   * not expose a disposal API for those.
   */
  dispose(): void {
    this.meshes.dispose();
    for (const superchunk of this.superchunks.values()) {
      const pair = superchunk.release();
      pair.terrain.dispose();
      pair.water.dispose();
    }
    for (const pooled of this.geometryPool) {
      pooled.terrain.dispose();
      pooled.water.dispose();
    }
    this.geometryPool.length = 0;
    this.geometryPoolBytes = 0;
  }
}
