import type { PerspectiveCamera, Texture } from "@random-mesh/rmsl/scene";
import type { VoxelTileConfig } from "./atlas";
import type { dayNightState } from "../environment/day-night";
import type { Dim3 } from "../world/level-data";

export type DayNight = ReturnType<typeof dayNightState>;

/**
 * The shared contract both rendering strategies (raymarch, triangle)
 * implement. A `RendererSwitch` owns one of each and routes calls per
 * block/frame. `applyLighting` is called on both renderers every frame
 * regardless of which is active, so the hidden one is already correct the
 * instant the mode toggles; `tick` is only called on the active one.
 */
export interface BlockRenderer {
  setVisible(visible: boolean): void;
  /**
   * The ring stepped and this block's slot now represents a different world
   * position: reposition this block's meshes and drop any stale in-flight
   * work for it, but don't queue a rebuild yet — the block's data hasn't
   * arrived at the new position (see `onBlockChanged`).
   */
  repositionBlock(index: number, center: Dim3): void;
  /**
   * This block's voxel data has changed (initial fill, ring refill) and is
   * ready to be reflected on screen.
   */
  onBlockChanged(index: number): void;
  setTiles(voxelTiles: VoxelTileConfig[], texture: Texture): void;
  applyLighting(dayNight: DayNight): void;
  tick(dt: number, camera: PerspectiveCamera): void;
  dispose(): void;
}
