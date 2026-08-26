// Renderers and Atlas
export { AdaptiveResolution } from "./adaptive";
export { createDebugCommands } from "./debug-commands";
export {
  VOXEL_TILES,
  type SubTexture,
  type TileRect,
  type VoxelTileConfig,
  type VoxelTiles,
} from "./renderers/atlas";
export type { BlockRenderer } from "./renderers/block-renderer";
export { RaymarchRenderer } from "./renderers/raymarch-renderer";
export {
  RendererSwitch,
  type RendererMode,
  type RendererSwitchParams,
} from "./renderers/renderer-switch";
export {
  loadVoxelTiles,
  type LoadVoxelTilesOptions,
} from "./renderers/tile-loader";
export { TriangleRenderer } from "./renderers/triangle-renderer";

export * from "./create-input";
export * from "./perf";
export * from "./player";
export * from "./ui/Console";
import Controls_ from "./ui/CoarseControls";
export const Controls = Controls_;

// World Management
export { BlockGrid } from "./world/block-grid";
export {
  blockWorldVoxelRange,
  EditLayer,
  editLayerFromSnapshot,
  localToWorldVoxel,
  worldVoxelToLocal,
  type VoxelEdit,
  type WorldVoxel,
} from "./world/edit-layer";
export {
  createEditPersistence,
  type EditPersistence,
} from "./world/edit-persistence";
export {
  BLOCK_WORLD,
  getWorldHeight,
  Level,
  syncLevelFromStore,
  type Dim3,
  type WorldBlock,
} from "./world/level-data";
export { DEFAULT_TERRAIN, heightAt, type TerrainConfig } from "./world/noise";
export { DEFAULT_REACH, pickVoxel, type VoxelPick } from "./world/picker";
export {
  fillStore,
  VOXEL_AIR,
  VOXEL_DIRT,
  VOXEL_GRASS,
  VOXEL_WATER,
  VoxelStore,
  type FillStoreFn,
} from "./world/voxel-store";
export { WorldRing } from "./world/world-ring";

// Editing & Inventory
export {
  EditingController,
  type EditingControllerParams,
} from "./editing-controller";
export {
  BREAK_YIELD,
  BREAKABLE,
  COLLECTABLE,
  Inventory,
  type InventoryItem,
} from "./inventory";

// atproto / Bluesky
export {
  AtprotoController,
  type AtpControllerOptions,
  type AtpStatus,
} from "./atproto/atproto-controller";
export {
  chunkKey,
  chunkOf,
  EDIT_CHUNK_DIM,
  EDIT_COLLECTION,
  groupEditsByChunk,
  makeRkey,
  mergeIntoLayer,
  parseChunkKey,
  recordsToEntries,
  recordVoxel,
  type EditChunkCoord,
  type EditChunkRecord,
} from "./atproto/edits";

// Day/Night & Environment
export { dayNightState } from "./day-night";
export { DayNightController } from "./day-night-controller";
export { SoundController, thunderTiming } from "./sound-controller";
export {
  applyWeather,
  weatherAt,
  weatherLighting,
  type Weather,
  type WeatherLighting,
  type WeatherState,
} from "./weather";
export {
  WeatherController,
  type WeatherControllerParams,
  type WeatherView,
} from "./weather-controller";
