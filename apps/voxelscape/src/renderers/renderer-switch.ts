import type { Vector3D } from "../utils/maths";
import type {
  PerspectiveCamera,
  Scene,
  Texture,
} from "@random-mesh/rmsl/scene";
import type { VoxelTileConfig } from "./atlas";
import type { WorldBlock } from "../world/level-data";
import { sampleFetchCount } from "../render/perf";
import type { DayNight } from "./block-renderer";
import { RaymarchRenderer } from "./raymarch-renderer";
import { TriangleRenderer } from "./triangle-renderer";

export type RendererMode = "ray" | "tri";

export interface RendererSwitchParams {
  scene: Scene;
  blocks: WorldBlock[];
  padding: number;
  blockWorld: Vector3D;
  fogDistance: number;
  fogStart: number;
  debugPerf: boolean;
  waterExtinction: number;
  seaLevel: number | undefined;
  initialMode?: RendererMode;
}

/**
 * Coordinator owning one `RaymarchRenderer` and one `TriangleRenderer`, and
 * which of the two is currently visible. `applyLighting` fans out to both
 * renderers every frame, so the hidden one is already correct the instant
 * the mode toggles; `tick` only runs on the active one.
 */
export class RendererSwitch {
  readonly raymarch: RaymarchRenderer;
  readonly triangle: TriangleRenderer;
  private mode_: RendererMode;

  constructor(params: RendererSwitchParams) {
    const {
      scene,
      blocks,
      padding,
      blockWorld,
      fogDistance,
      fogStart,
      debugPerf,
      waterExtinction,
      seaLevel,
      initialMode,
    } = params;
    this.raymarch = new RaymarchRenderer({
      scene,
      blocks,
      padding,
      blockWorld,
      fogDistance,
      fogStart,
      debugPerf,
      waterExtinction,
      seaLevel: seaLevel ?? 0,
    });
    this.triangle = new TriangleRenderer({
      scene,
      blocks,
      waterExtinction,
      seaLevel,
    });
    this.mode_ = initialMode ?? "tri";
    const rayOn = this.mode_ === "ray";
    this.raymarch.setVisible(rayOn);
    this.triangle.setVisible(!rayOn);
  }

  get mode(): RendererMode {
    return this.mode_;
  }

  get triangleCount(): number {
    return this.triangle.triangleCount;
  }

  /**
   * The debug-perf HUD line for whichever renderer is active. In triangle
   * mode this is free and always current; in raymarch mode the fetches-per-ray
   * figure comes from a GPU readback, so it's only computed when `sample` is
   * true — the caller decides how often that's affordable.
   */
  describeDebugStats(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    sample: boolean,
  ): string {
    if (this.mode_ === "tri") {
      return `tri | tris: ${this.triangleCount.toLocaleString()}`;
    }
    if (!sample) {
      return "ray";
    }
    const s = sampleFetchCount(gl, width, height);
    return `ray | fetches/ray: ${s.fetchesPerRay.toFixed(1)} (${s.rays} rays)`;
  }

  /**
   * Must be called once, after the player cube is added to the scene: the
   * translucent water passes (raymarch, then triangle) and the triangle
   * renderer's underwater tint all rely on scene-graph draw order to blend
   * over what's already been drawn.
   */
  addTranslucentPassesToScene(scene: Scene): void {
    this.raymarch.addWaterToScene(scene);
    this.triangle.addWaterToScene(scene);
    this.triangle.addTintToScene(scene);
  }

  setMode(mode: RendererMode): string {
    this.mode_ = mode;
    const rayOn = mode === "ray";
    this.raymarch.setVisible(rayOn);
    this.triangle.setVisible(!rayOn);
    return mode === "ray"
      ? "renderer: ray (raymarch)"
      : "renderer: tri (surface triangles)";
  }

  repositionBlock(index: number, center: Vector3D): void {
    this.raymarch.repositionBlock(index, center);
    this.triangle.repositionBlock(index, center);
  }

  onBlockChanged(index: number): void {
    this.raymarch.onBlockChanged(index);
    this.triangle.onBlockChanged(index);
  }

  setTiles(voxelTiles: VoxelTileConfig[], texture: Texture): void {
    this.raymarch.setTiles(voxelTiles, texture);
    this.triangle.setTiles(voxelTiles, texture);
  }

  applyLighting(dayNight: DayNight): void {
    this.raymarch.applyLighting(dayNight);
    this.triangle.applyLighting(dayNight);
  }

  tick(dt: number, camera: PerspectiveCamera): void {
    if (this.mode_ === "ray") {
      this.raymarch.tick(dt, camera);
    } else {
      this.triangle.tick(dt, camera);
    }
  }

  dispose(): void {
    this.raymarch.dispose();
    this.triangle.dispose();
  }
}
