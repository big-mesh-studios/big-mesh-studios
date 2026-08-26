// The assembled world, and the context its UI components read it from
export {
  createVoxelscape,
  type Voxelscape,
  type VoxelscapeConfig,
} from "./voxelscape/create-voxelscape";
export {
  useVoxelscape,
  VoxelscapeContext as VoxelscapeProvider,
} from "./voxelscape/voxelscape-context";

// World Management
export { BlockGrid } from "./world/block-grid";
export {
  createVoxelWorld,
  type VoxelWorld,
  type VoxelWorldConfig,
} from "./world/create-voxel-world";
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

// Renderers and Atlas
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

// The canvas, the frame loop, and what keeps them within budget
export { AdaptiveResolution } from "./render/adaptive";
export {
  createRenderLoop,
  type RenderLoop,
  type RenderLoopConfig,
} from "./render/create-render-loop";
export * from "./render/perf";

// The player: their body, their input, and what they do to the world
export * from "./player/create-input";
export {
  createPlayerAvatar,
  type AvatarTerrain,
  type PlayerAvatar,
  type PlayerAvatarConfig,
} from "./player/create-player-avatar";
export {
  EditingController,
  type EditingControllerParams,
} from "./player/editing-controller";
export {
  BREAK_YIELD,
  BREAKABLE,
  COLLECTABLE,
  Inventory,
  type InventoryItem,
} from "./player/inventory";
export * from "./player/player";

// Day/Night & Environment
export {
  createEnvironment,
  type Environment,
  type EnvironmentConfig,
} from "./environment/create-environment";
export { dayNightState } from "./environment/day-night";
export { DayNightController } from "./environment/day-night-controller";
export { SoundController, thunderTiming } from "./environment/sound-controller";
export {
  applyWeather,
  weatherAt,
  weatherLighting,
  type Weather,
  type WeatherLighting,
  type WeatherState,
} from "./environment/weather";
export {
  WeatherController,
  type WeatherControllerParams,
  type WeatherView,
} from "./environment/weather-controller";

// atproto
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
export { claimedHandle, confirmHandle } from "./atproto/handles";
export {
  createDidDocumentResolver,
  createHandleResolver,
  type DidDocument,
} from "./atproto/identity";
export {
  createAtprotoRepoClient,
  type AtprotoRepoClient,
} from "./atproto/repo-client";

// Multiplayer (cluster-based WebRTC mesh over atproto)
export { MeshPeer, type MeshPeerParams } from "./multiplayer/mesh-peer";
export {
  MultiplayerController,
  type MultiplayerParams,
  type MultiplayerStatus,
} from "./multiplayer/multiplayer-controller";
export { createPeerJSSignaling } from "./multiplayer/peerjs-transport";
export {
  decodePose,
  encodePose,
  type Pose,
  type PoseMessage,
} from "./multiplayer/pose";
export {
  hashDid,
  horizontalDistance,
  isPresenceRecord,
  makePresence,
  PRESENCE_COLLECTION,
  PRESENCE_RKEY,
  type PresenceRecord,
} from "./multiplayer/presence";
export { labelText, RemotePlayers } from "./multiplayer/remote-players";
export {
  CLUSTER_DEFAULTS,
  rosterFromPresences,
  selectNeighbors,
  type ClusterInput,
  type ClusterOptions,
  type ClusterSelection,
  type RosterEntry,
} from "./multiplayer/roster";
export type {
  PeerTransport,
  SignalingFactory,
  SignalingRemote,
  SignalingTransport,
} from "./multiplayer/transport";

// The debug console: the command table and the components that show it
export {
  createCommands as createDebugCommands,
  type CommandEntry,
} from "./commands";
export * from "./ui/Console";
export { EditHud } from "./ui/EditHud";
import Controls_ from "./ui/CoarseControls";
export const Controls = Controls_;
