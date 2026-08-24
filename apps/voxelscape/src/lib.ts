// Renderers and Atlas
export { AdaptiveResolution } from "./adaptive";
export {
  RendererSwitch,
  type RendererSwitchParams,
  type RendererMode,
} from "./renderers/renderer-switch";
export { createDebugCommands } from "./debug-commands";
export { RaymarchRenderer } from "./renderers/raymarch-renderer";
export { TriangleRenderer } from "./renderers/triangle-renderer";
export type { BlockRenderer } from "./renderers/block-renderer";
export {
  loadVoxelTiles,
  type LoadVoxelTilesOptions,
} from "./renderers/tile-loader";
export {
  type VoxelTileConfig,
  type SubTexture,
  type TileRect,
  type VoxelTiles,
  VOXEL_TILES,
} from "./renderers/atlas";

export * from "./input";
export * from "./perf";
export * from "./player";
export * from "./ui/Console";
import Controls_ from "./ui/Controls";
export const Controls = Controls_;

// World Management
export { BlockGrid } from "./world/block-grid";
export { WorldRing } from "./world/world-ring";
export {
  type WorldBlock,
  Level,
  BLOCK_WORLD,
  getWorldHeight,
  type Dim3,
} from "./world/level-data";
export {
  VoxelStore,
  fillStore,
  type FillStoreFn,
  VOXEL_AIR,
  VOXEL_GRASS,
  VOXEL_DIRT,
  VOXEL_WATER,
} from "./world/voxel-store";
export { DEFAULT_TERRAIN, type TerrainConfig, heightAt } from "./world/noise";

// Day/Night & Environment
export { DayNightController } from "./day-night-controller";
export { dayNightState } from "./day-night";
export { WeatherController } from "./weather-controller";
export {
  type Weather,
  type WeatherState,
  type WeatherLighting,
  weatherAt,
  weatherLighting,
  applyWeather,
} from "./weather";
