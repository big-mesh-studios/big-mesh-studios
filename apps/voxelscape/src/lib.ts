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
export {
  cellKey,
  cellsInSphere,
  ChunkSphere,
  sphereCells,
  type CellCoord,
} from "./world/chunk-sphere";
export {
  createVoxelWorld,
  type VoxelWorld,
  type VoxelWorldConfig,
  type InitialDrawProgress,
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

// Renderers and Atlas
export {
  VOXEL_TILES,
  type SubTexture,
  type TileRect,
  type VoxelTileConfig,
  type VoxelTiles,
} from "./renderers/atlas";
export {
  loadVoxelTiles,
  type LoadVoxelTilesOptions,
} from "./renderers/tile-loader";
export { TriangleRenderer, type DayNight } from "./renderers/triangle-renderer";

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
  SWORD,
  TOOLS,
  type InventoryItem,
} from "./player/inventory";
export { HeldItem, type HeldItemParams } from "./player/held-item";
export {
  buildSwordModel,
  loadSwordModel,
  SPRITESHEET_HEIGHT,
  SPRITESHEET_URL,
  SPRITESHEET_WIDTH,
  SWORD_SPRITE,
  SWORD_SPRITE_BBOX,
} from "./player/sword-model";
export {
  BASE_ROTATION_ANGLE,
  BASE_ROTATION_AXIS,
  HANDLE_FRACTION,
  poseAt,
  PULLED_POSE,
  quatRotate,
  RECOVER_TIME,
  REST_POSE,
  SWING_TIME,
  swingTransform,
  SWUNG_POSE,
  WINDUP_TIME,
  type SwingPose,
  type SwingState,
  type SwingTransform,
} from "./player/swing";
export * from "./player/player";
export { createPlayerSkin, type PlayerSkin } from "./player/player-skin";

// Day/Night & Environment
export {
  createEnvironment,
  type Environment,
  type EnvironmentConfig,
} from "./environment/create-environment";
export {
  cloudCellVolume,
  cloudCoverage,
  CloudController,
  CloudMaterial,
  type CloudCellOptions,
  type CloudControllerParams,
} from "./environment/clouds";
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
  type EditChunkEdit,
  type EditChunkRecord,
} from "./atproto/edits";
export {
  createModelLibrary,
  locateAccount,
  MONSTER_MODEL_NAME,
  publishedModels,
  WORLD_MODEL_ACCOUNT,
  type AccountLocation,
  type LocateAccount,
  type ModelLibrary,
} from "./atproto/models";

// Multiplayer (cluster-based WebRTC mesh over atproto)
export { MeshPeer, type MeshPeerParams } from "./multiplayer/mesh-peer";
export {
  MultiplayerController,
  type MultiplayerParams,
  type MultiplayerStatus,
} from "./multiplayer/multiplayer-controller";
export { round, type Pose, type PoseMessage } from "./multiplayer/pose";
export {
  decodeMessage,
  encodeMessage,
  MAX_EDITS_PER_MESSAGE,
  MAX_VOXEL_ID,
  MAX_WORLD_VOXEL,
  type EditItem,
  type EditWire,
  type MeshMessage,
  type PoseWire,
} from "./multiplayer/messages";
export { createPeerJSSignaling } from "./multiplayer/peerjs-transport";
export type {
  PeerTransport,
  SignalingFactory,
  SignalingRemote,
  SignalingTransport,
} from "./multiplayer/transport";
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

// The debug console: the command table and the components that show it
export {
  createCommands as createDebugCommands,
  type CommandEntry,
  type CommandHelp,
  type CommandOutput,
} from "./commands";
export * from "./ui/Console";
export { EditHud } from "./ui/EditHud";
export { LoadingScreen, LoadingToast } from "./ui/LoadingScreen";
export { createToasts, Toast } from "./ui/Toasts";
import Controls_ from "./ui/CoarseControls";
export const Controls = Controls_;
