// Culled-face triangle mesh renderer: extracts each `WorldBlock`'s visible
// voxel faces into real geometry (built off the main thread by a worker) and
// rasterizes it normally. The look is carried by the materials here:
// the fragment shades the interpolated vertex normal + baked atlas UV,
// applies the same day-night sun/moon/ambient lighting and distance fog as
// the surface material, and the water pass blends over the scene with a
// Fresnel reflection.
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
import type { Dim3, WorldBlock } from "../world/level-data";
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

const EMPTY_MESH: MeshArrays = {
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
};

export class TriangleRenderer {
  readonly triMaterial = new TriangleMaterial();
  readonly triWaterMaterial = new TriangleWaterMaterial();
  readonly triMeshes: Mesh[] = [];
  readonly triWaterMeshes: Mesh[] = [];
  /** The meshed blocks, which write depth and are drawn as opaque terrain. */
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

    for (let i = 0; i < blocks.length; i++) {
      const center = blocks[i].center;
      const triMesh = new Mesh(new BufferGeometry(), this.triMaterial);
      triMesh.position.set(center[0], center[1], center[2]);
      triMesh.visible = false;
      this.terrain.add(triMesh);
      this.triMeshes.push(triMesh);
      const triWaterMesh = new Mesh(
        new BufferGeometry(),
        this.triWaterMaterial,
      );
      triWaterMesh.position.set(center[0], center[1], center[2]);
      triWaterMesh.visible = false;
      this.water.add(triWaterMesh);
      this.triWaterMeshes.push(triWaterMesh);
    }

    this.meshes = new MeshClient({
      blocks,
      onMeshBuilt: (index, terrain, water) => {
        // Update the persistent geometry in place so the renderer re-uploads
        // into its existing GPU buffers instead of leaking new ones.
        setGeometryData(this.triMeshes[index].geometry, terrain);
        setGeometryData(this.triWaterMeshes[index].geometry, water);
        this.updateTriCount();
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
    this.meshes.invalidate(index);
    this.updateTriCount();
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
