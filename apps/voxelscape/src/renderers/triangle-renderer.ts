// Culled-face triangle mesh renderer: extracts each `WorldBlock`'s visible
// voxel faces into real geometry (built off the main thread by a worker) and
// rasterizes it normally. Replicates the raymarched look with real geometry:
// the fragment shades the interpolated vertex normal + baked atlas UV,
// applies the same day-night sun/moon/ambient lighting and distance fog as
// `RaymarchMaterial`, and the water pass blends over the scene with the same
// Fresnel reflection as `RaymarchWaterMaterial`.
import type { Node, UniformNode } from "@random-mesh/rmsl";
import { float, pow, vec3, vec4 } from "@random-mesh/rmsl";
import {
  BoxGeometry,
  Builder,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  NodeMaterial,
  Scene,
  Side,
  Texture,
} from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { VoxelTileConfig } from "../atlas";
import type { Dim3, WorldBlock } from "../level-data";
import {
  buildBlockMesh,
  buildWaterMesh,
  extractBlockShells,
  makeBlockResolver,
  setGeometryData,
  type BlockGridLookup,
  type MeshArrays,
  type MeshBuildRequest,
  type MeshBuildResult,
} from "../mesh";
import type { BlockRenderer, DayNight } from "./block-renderer";

// Opaque terrain surface. One shared instance across every block's mesh; the
// per-face look lives in the geometry (positions/normals/baked atlas UVs).
export class TriangleMaterial extends NodeMaterial {
  // The spritesheet uploaded as one 2D texture; set asynchronously once loaded
  // (mirrors `RaymarchMaterial.tilesTexture`).
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

    // flat blue until the spritesheet is applied (mirrors the raymarch fallback)
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

// Translucent water surface pass, drawn after the opaque terrain in scene-graph
// order. Shades each fragment with the same Fresnel sky reflection + base
// transparency as the raymarch water pass; the geometry is the water surface
// mesh, so depth-testing occludes correctly against terrain and the player.
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
  scene: Scene;
  blocks: WorldBlock[];
  worldGrid: { x: number; z: number }[];
  lookupBlock: BlockGridLookup;
  waterExtinction: number;
  seaLevel: number | undefined;
}

const EMPTY_MESH: MeshArrays = {
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
};

// How many block meshes to kick off per frame while draining the queue; the
// worker does the heavy lifting so the main thread just wraps the results.
const MAX_BUILDS_PER_FRAME = 6;

export class TriangleRenderer implements BlockRenderer {
  readonly triMaterial = new TriangleMaterial();
  readonly triWaterMaterial = new TriangleWaterMaterial();
  readonly triMeshes: Mesh[] = [];
  readonly triWaterMeshes: Mesh[] = [];

  private readonly blocks: WorldBlock[];
  private readonly worldGrid: { x: number; z: number }[];
  private readonly lookupBlock: BlockGridLookup;
  private readonly waterExtinction: number;
  private readonly seaLevel: number | undefined;

  private totalTriangles: number = 0;
  // Per-voxel-id face tile rects, populated once the atlas loads; the mesh UVs
  // are baked from these, so changing them requires a mesh rebuild.
  private readonly tilesById = new Map<number, VoxelTileConfig>();
  // Meshes are built in a web worker so a block rebuild never stalls the UI;
  // the worker gets the block's voxel data plus its neighbours' boundary shells
  // and hands back transferable arrays. `pendingBuilds` holds blocks whose mesh
  // is stale, drained a few per frame while this renderer is active. `meshGen`
  // is bumped whenever a block's data or the tiles change, so a slow worker
  // result for stale data is dropped. If the worker is unavailable (no Worker,
  // build error) the synchronous `buildBlockMeshesSync` path is used instead.
  private readonly meshGen: number[] = [];
  private readonly pendingBuilds = new Set<number>();
  private readonly inflight = new Map<number, number>();
  private meshWorker: Worker | undefined;
  private workerAvailable = true;

  // Fullscreen underwater tint (the raymarch water pass tints the view
  // in-shader instead). Drawn last with depth-testing off so it washes the
  // whole view when the camera dips below the sea.
  private readonly tintMaterial: MeshBasicMaterial;
  private readonly tintMesh: Mesh;

  constructor(params: TriangleRendererParams) {
    const { scene, blocks, worldGrid, lookupBlock, waterExtinction, seaLevel } =
      params;
    this.blocks = blocks;
    this.worldGrid = worldGrid;
    this.lookupBlock = lookupBlock;
    this.waterExtinction = waterExtinction;
    this.seaLevel = seaLevel;

    for (let i = 0; i < blocks.length; i++) {
      const center = blocks[i].center;
      const triMesh = new Mesh(new BufferGeometry(), this.triMaterial);
      triMesh.position.set(center[0], center[1], center[2]);
      triMesh.visible = false;
      scene.add(triMesh);
      this.triMeshes.push(triMesh);
      const triWaterMesh = new Mesh(new BufferGeometry(), this.triWaterMaterial);
      triWaterMesh.position.set(center[0], center[1], center[2]);
      triWaterMesh.visible = false;
      // added to the scene later (see `addWaterToScene`), after the player
      // cube, so the transparent water blends over it like the raymarch water
      // pass does
      this.triWaterMeshes.push(triWaterMesh);
      this.meshGen.push(0);
      this.pendingBuilds.add(i);
    }

    this.setupMeshWorker();

    this.tintMaterial = new MeshBasicMaterial({
      color: 0x1a598c,
      transparent: true,
      opacity: 0,
    });
    this.tintMaterial.depthTest = false;
    this.tintMaterial.depthWrite = false;
    this.tintMesh = new Mesh(new BoxGeometry(4000, 4000, 4000), this.tintMaterial);
    this.tintMesh.visible = false;
  }

  private setupMeshWorker(): void {
    try {
      this.meshWorker = new Worker(
        new URL("../mesh-worker.ts", import.meta.url),
        { type: "module" },
      );
      this.meshWorker.onmessage = (ev) => {
        const msg = ev.data as MeshBuildResult;
        const gen = this.inflight.get(msg.id);
        if (gen === undefined) {
          return;
        }
        this.inflight.delete(msg.id);
        if (gen !== this.meshGen[msg.id]) {
          return; // the block changed after this request was sent
        }
        // update the persistent geometry in place so the renderer re-uploads
        // into its existing GPU buffers instead of leaking new ones
        setGeometryData(this.triMeshes[msg.id].geometry, msg.terrain);
        setGeometryData(this.triWaterMeshes[msg.id].geometry, msg.water);
        this.updateTriCount();
      };
      this.meshWorker.onerror = () => {
        // fall back to building synchronously; requeue whatever was in flight
        this.workerAvailable = false;
        console.warn(
          "[tri renderer] mesh worker errored; falling back to synchronous builds",
        );
        for (const i of this.inflight.keys()) {
          this.pendingBuilds.add(i);
        }
        this.inflight.clear();
      };
    } catch {
      this.workerAvailable = false;
    }
  }

  private buildBlockMeshesSync(indices: number[]): void {
    const tileList = [...this.tilesById.values()];
    for (const i of indices) {
      const resolver = makeBlockResolver(
        this.blocks[i].store,
        this.worldGrid[i].x,
        this.worldGrid[i].z,
        this.lookupBlock,
      );
      setGeometryData(
        this.triMeshes[i].geometry,
        buildBlockMesh(this.blocks[i].store, resolver, tileList),
      );
      setGeometryData(
        this.triWaterMeshes[i].geometry,
        buildWaterMesh(this.blocks[i].store, resolver),
      );
    }
    this.updateTriCount();
  }

  private requestBlockBuild(i: number): void {
    this.meshGen[i]++;
    this.inflight.set(i, this.meshGen[i]);
    const store = this.blocks[i].store;
    const req: MeshBuildRequest = {
      id: i,
      voxels: store.voxels,
      scale: store.scale,
      data: store.data.slice(),
      shells: extractBlockShells(
        store,
        this.worldGrid[i].x,
        this.worldGrid[i].z,
        this.lookupBlock,
      ),
      tileRects: [...this.tilesById.values()],
    };
    const transfers: Transferable[] = [req.data.buffer];
    for (const shell of Object.values(req.shells)) {
      if (shell !== null) {
        transfers.push(shell.buffer);
      }
    }
    this.meshWorker?.postMessage(req, transfers);
  }

  private drainMeshBuilds(): void {
    if (this.meshWorker !== undefined && this.workerAvailable) {
      let sent = 0;
      for (const i of this.pendingBuilds) {
        if (this.inflight.has(i)) {
          continue;
        }
        this.requestBlockBuild(i);
        this.pendingBuilds.delete(i);
        if (++sent >= MAX_BUILDS_PER_FRAME) {
          break;
        }
      }
    } else {
      this.buildBlockMeshesSync([...this.pendingBuilds]);
      this.pendingBuilds.clear();
    }
  }

  private updateTriCount(): void {
    let tris = 0;
    for (const mesh of this.triMeshes) {
      tris += mesh.geometry.drawCount / 3;
    }
    for (const mesh of this.triWaterMeshes) {
      tris += mesh.geometry.drawCount / 3;
    }
    this.totalTriangles = Math.round(tris);
  }

  get triangleCount(): number {
    return this.totalTriangles;
  }

  // Must be called once, after the player cube is added to the scene, so the
  // translucent water pass blends over it.
  addWaterToScene(scene: Scene): void {
    for (const mesh of this.triWaterMeshes) {
      scene.add(mesh);
    }
  }

  // Must be called once, after `addWaterToScene` on both renderers, so the
  // underwater tint draws over everything.
  addTintToScene(scene: Scene): void {
    scene.add(this.tintMesh);
  }

  setVisible(visible: boolean): void {
    for (const mesh of this.triMeshes) {
      mesh.visible = visible;
    }
    for (const mesh of this.triWaterMeshes) {
      mesh.visible = visible;
    }
    if (!visible) {
      this.tintMesh.visible = false;
    }
  }

  repositionBlock(index: number, center: Dim3): void {
    this.triMeshes[index].position.set(center[0], center[1], center[2]);
    this.triWaterMeshes[index].position.set(center[0], center[1], center[2]);
    // clear the geometry until the worker rebuilds it for the new terrain
    // (avoid a flash of the old block's surface at the new location, without
    // leaking the old buffers); invalidate any in-flight build for the old
    // data but don't queue a rebuild yet — `onBlockChanged` does that once the
    // new data actually arrives
    setGeometryData(this.triMeshes[index].geometry, EMPTY_MESH);
    setGeometryData(this.triWaterMeshes[index].geometry, EMPTY_MESH);
    this.meshGen[index]++;
    this.updateTriCount();
  }

  onBlockChanged(index: number): void {
    this.meshGen[index]++;
    this.pendingBuilds.add(index);
  }

  setTiles(voxelTiles: VoxelTileConfig[], texture: Texture): void {
    this.triMaterial.tilesTexture = texture;
    this.triMaterial.needsUpdate = true;
    this.tilesById.clear();
    for (const v of voxelTiles) {
      this.tilesById.set(v.id, v);
    }
    for (let i = 0; i < this.blocks.length; i++) {
      this.onBlockChanged(i);
    }
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
    this.drainMeshBuilds();
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

  // Terminates the mesh worker; geometries/materials aren't disposed — rmsl
  // doesn't expose that, matching the original code (see the identical note
  // on `RaymarchRenderer.dispose`).
  dispose(): void {
    this.meshWorker?.terminate();
  }
}
