import {
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
} from "@random-mesh/rmsl/scene";
import {
  createEffect,
  createSignal,
  type Accessor,
  type Setter,
} from "solid-js";
import {
  describeSetup,
  WalkTraceRecorder,
  type WalkTraceFile,
} from "./walk-trace";
import { isEditableTarget } from "../utils";
import { AtprotoController } from "../atproto/atproto-controller";
import { createModelLibrary, type ModelLibrary } from "../atproto/models";
import { createPlaceLibrary, createPlacePublisher } from "../atproto/places";
import type { PlaceLibrary, PlacePublisher } from "../atproto/places";
import {
  DEFAULT_WORLD_URL,
  parsePlaceAtUri,
  type PlaceMode,
} from "../places/place";
import type { PlaceProject } from "../places/project";
import type { ScriptConsole } from "../places/script-console";
import {
  VoxelFigures,
  type FigureAimBox,
  type RenderedFigure,
} from "../places/voxel-figures";
import { cutscenePoseAt, type CameraStart } from "../places/cutscene";
import { createEndingLog, endingLogKey } from "../places/ending-log";
import {
  compilePlacePlan,
  emptyLevelPlan,
  normalizeLevelPlan,
  planRegionAround,
  type LevelPlan,
} from "../places/plan";
import { FireFigures } from "../renderers/fire-figures";
import { ExplosionFigures } from "../renderers/explosion-figures";
import { FireEmbers } from "../world/fire-ember";
import { pickFigure, type AimTarget } from "../places/figure-pick";
import { pickVoxel } from "../world/picker";
import type {
  DialogState,
  HudReadout,
  ScriptedField,
  ScriptedNpc,
  ScriptedProp,
} from "../places/script-host";
import type { ScriptItemDefinition } from "../places/effects";
import type { Commander } from "../commands";
import { createCommands } from "../commands";
import { createEnvironment } from "../environment/create-environment";
import { MultiplayerController } from "../multiplayer/multiplayer-controller";
import { createPeerJSSignaling } from "../multiplayer/peerjs-transport";
import {
  createInput,
  type InputController,
  type InputSnapshot,
} from "../player/create-input";
import {
  createPlayerAvatar,
  type AvatarTerrain,
} from "../player/create-player-avatar";
import {
  boxGroundAt,
  boxVelocityAt,
  solidBoxAt,
  type SolidBox,
} from "../player/prop-collision";
import { EditingController } from "../player/editing-controller";
import { Hand } from "../player/hand";
import { PlayerHealth } from "../player/health";
import { Inventory } from "../player/inventory";
import { ITEM_ORDER, ITEMS, type ItemId } from "../player/items";
import {
  DEFAULT_PLAYER_CONFIG,
  lookDirection,
  type Player,
  type PlayerConfig,
  type PlayerWorld,
} from "../player/player";
import { loadSpriteModel } from "../player/sprite-model";
import type { Target, Tool, ToolContext } from "../player/tools/tool";
import { BucketTool } from "../player/tools/bucket-tool";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import type { Model } from "@big-mesh-studios/stacker/renderer";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import { AdaptiveResolution } from "../render/adaptive";
import { createRenderLoop } from "../render/create-render-loop";
import { FlowController } from "../world/flow-controller";
import {
  createVoxelWorld,
  type InitialDrawProgress,
  type VoxelWorld,
} from "../world/create-voxel-world";
import { KitCameraControl } from "../level-editor/camera/KitCameraControl";
import { NoClipCameraControl } from "../level-editor/camera/NoClipCameraControl";
import type {
  CameraControl,
  CameraControlsKind,
} from "../level-editor/camera/CameraControl";
import { mouseRay, projectPtToScreen } from "../level-editor/camera/project";
import type { SubTexture, VoxelTiles } from "../renderers/atlas";
import { cellsInSphere } from "../world/chunk-sphere";
import { type Dim3 } from "../world/level-data";
import type { StructurePlan } from "../world/structure-fill";
import { DEFAULT_TERRAIN, type TerrainConfig } from "../world/noise";
import { Field, Phase, probe } from "../render/perf-probe";

/** Sky blue, matching the material's default fog color so the horizon blends. */
const SKY_BLUE = 0x87ceeb;

/**
 * The input a cutscene gives the physics: nothing pressed. Gravity and the
 * ground snap still run, so a player standing still in a shot stays stood.
 */
const CUTSCENE_INPUT: InputSnapshot = {
  moveX: 0,
  moveY: 0,
  jump: false,
  jumpHeld: false,
  lookDx: 0,
  lookDy: 0,
  primary: false,
  click: false,
  secondary: false,
  secondaryHeld: false,
  secondaryReleased: false,
  use: false,
  select: null,
  wheel: 0,
};

/**
 * A Blob over a model's bytes. The copy strips the `SharedArrayBuffer`
 * possibility TypeScript gives a `Uint8Array`, so the bytes are a `BlobPart`
 * the DOM will accept.
 */
const modelBlob = (bytes: Uint8Array): Blob =>
  new Blob([
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  ]);

/**
 * A movement a benchmark drives the player along in place of the keyboard.
 * The player is carried over the terrain rather than walked into it, so a
 * route covers the ground it says it covers instead of stopping at the first
 * hillside, and the distance it travels is decided by the frame's own `dt`
 * rather than by how many frames a slow machine managed to draw.
 */
export interface BenchRoute {
  /** The compass direction travelled, in radians, measured from due north. */
  heading: number;
  /** World units travelled a second along that heading. */
  speed: number;
  /** Radians a second the view turns by, positive to the left. */
  turn: number;
  /** How long the route runs, in seconds. */
  seconds: number;
}

/** A place whose scripts run in this world from boot, rather than by console. */
export interface PlaceBoot {
  /** The place's script files, keyed by manifest-relative path. */
  files: Record<string, string>;
  /** The file execution starts from; it or a file it imports registers with `engine.onTick`. */
  entry: string;
  /** The seed the place's scripts are run against. */
  seed: number;
  /** The rm-stacker models the place carries, keyed by manifest-relative path. */
  models?: Record<string, Uint8Array>;
}

export interface VoxelscapeConfig {
  /**
   * Whether the canvas starts drawn multisampled, which `/render:msaa` then
   * flips. Defaults to off: the several samples a pixel is held at are the
   * largest thing this world keeps on a phone's graphics card — 54MiB of a
   * Galaxy A15's — and cost the card no measurable time either way, so what
   * they buy is smoother edges between surfaces and nothing else.
   */
  antialias?: boolean;
  /** Radius of the block window in X and Z, in chunks. Also sets the fog and camera far distances. */
  chunkRadius?: number;
  /** Radius of the block window in Y, in chunks; defaults to 2, flattening the window toward the ground. */
  chunkRadiusY?: number;
  /** Terrain noise settings shared by every block in the ring. */
  terrain?: TerrainConfig;
  /**
   * Extra voxel ids and the spritesheet tiles their faces show, merged over the
   * built-in tile map when the sheet loads. A place that adds block ids names
   * their tiles here.
   */
  customVoxelTiles?: Record<number, VoxelTiles>;
  /** The full static level plan, including structures, NPCs, and props. */
  plan?: LevelPlan;
  /** Structures every chunk is stamped with, over its generated terrain. */
  structures?: StructurePlan;
  /** The place whose scripts this world runs from boot, if it is a published one. */
  place?: PlaceBoot;
  /**
   * The manifest, scripts and models of the place or demo this world booted
   * from, for `/place:editor` to open on — omitted only on the fallback
   * procedural world, which has no place project to show.
   */
  activeProject?: PlaceProject;
  /**
   * Whether the `/place:editor` panel is showing, and how to flip it —
   * injected so the flag survives this instance being replaced by a reboot
   * instead of resetting closed along with it; defaults to a fresh,
   * instance-local signal when omitted, for a bench or test harness that
   * builds a world with no persistent UI of its own around it.
   */
  placeEditorOpen?: [Accessor<boolean>, Setter<boolean>];
  /**
   * Whether the `/place:level-editor` overlay is showing, and how to flip it —
   * injected the same way `placeEditorOpen` is, so the flag survives this
   * instance being replaced by a reboot. Defaults to a fresh, instance-local
   * signal.
   */
  levelEditorOpen?: [Accessor<boolean>, Setter<boolean>];
  /**
   * How this place handles other players and their edits; omitted for the
   * default world and for a place published before modes existed, both of
   * which keep multiplayer unscoped and edits self-only rather than being
   * migrated onto one of the four named modes.
   */
  mode?: PlaceMode;
  /**
   * What this world is, for scoping multiplayer and edits to it: a place's
   * `at://` address, a demo's synthetic `demo:<id>`, or omitted for the
   * default world.
   */
  placeUri?: string;
  /** When true, only surface voxels are written into each block's GPU chunks instead of the full solid volume. */
  /** Where the player starts, in world units; the spawn height is the terrain surface there. */
  spawn?: Dim3;
  /** Movement settings for this world's player; anything omitted takes its default. */
  player?: Partial<PlayerConfig>;
  /**
   * Starts the world with the GPU timer and the per-frame statistics passed to
   * `onDebugStats` turned on, which `/render:perf` then toggles. Defaults to
   * whether the page URL's hash contains `perf`.
   */
  debugPerf?: boolean;
  /**
   * Moves the address bar to a different place or demo, for `/place:join`
   * and `/place:demo` — what that means to the browser (a real path, a hash,
   * something else) is not this module's business, nor is what happens once
   * it does: the caller booted this world in response to the address it
   * already had, and is trusted to do the same when this one changes.
   * Defaults to setting `window.location.hash` directly.
   */
  navigate?: (to: string) => void;
  /** Receives the statistics line once per frame while `debugPerf` is on. */
  onDebugStats?: (line: string) => void;
  /**
   * Receives lines the world reports without being asked to — currently only
   * the atproto state settled at startup, which is the answer to "am I still
   * signed in?" after a reload. Meant for the debug console.
   */
  onNotice?: (line: string) => void;
}

/**
 * What the statistics panel reads: one snapshot of what the world costs right
 * now. Gathered when asked rather than held, so nothing is counted on a frame
 * nobody is looking.
 */
export interface WorldStats {
  /**
   * The whole JavaScript heap, which only Chromium reports; undefined
   * elsewhere. Counts the storage behind the typed arrays below as well as the
   * objects around them, so those are inside this number rather than beside it.
   */
  heapBytes: number | undefined;
  /** Of what the world holds: its voxels and the light shadowing them. */
  voxelBytes: number;
  /** The superchunks' merged geometry, at the capacity it grew to. */
  mergedGeometryBytes: number;
  /** Per-block meshes no superchunk has copied in yet. */
  blockGeometryBytes: number;
  blocks: number;
  chunkRadius: number;
  triangles: number;
  /** Blocks waiting on terrain, and on geometry. */
  fillsPending: number;
  meshesPending: number;
}

export interface Voxelscape {
  scene: Scene;
  camera: PerspectiveCamera;
  /**
   * The streamed voxel world itself, so the level editor can restamp its
   * structures and read its blocks without building a second world.
   */
  world: VoxelWorld;
  /** The canvas the world is mounted on, or null before `mount`. */
  canvas: Accessor<HTMLCanvasElement | null>;
  /**
   * The level editor's handle on the running world: whether it is showing, the
   * camera it draws through, which control style drives that camera, and the
   * plan it edits.
   */
  levelEditor: {
    open: Accessor<boolean>;
    setOpen(open: boolean): void;
    camera: PerspectiveCamera;
    /** Which camera style drives the editor, Orbit or NoClip. */
    cameraKind: Accessor<CameraControlsKind>;
    setCameraKind(kind: CameraControlsKind): void;
    /** The control for the active camera style. */
    control: Accessor<CameraControl>;
    plan: Accessor<LevelPlan>;
    setPlan(plan: LevelPlan): void;
    /**
     * The aim box a planned NPC or prop wears, or null before its model has
     * loaded: half the body's width and depth and the height it draws at.
     */
    figureAimBox(kind: "npc" | "prop", id: string): FigureAimBox | null;
    /** The box drawn around the selected item; the overlay sizes and shows it. */
    highlight: Mesh;
  };
  player: Player;
  input: InputController;
  inventory: Inventory;
  /** The player's hearts and the death fall that empties them. */
  health: PlayerHealth;
  commands: Commander;
  /**
   * The place script editor: opening it, running the draft's script, and
   * reading and publishing places.
   */
  placeEditor: {
    /** Whether the `/place:editor` panel is showing. */
    open: Accessor<boolean>;
    setOpen(open: boolean): void;
    /** The signed-in account the editor publishes from, or null while signed out. */
    accountDid: string | null;
    /** The handle to show for `did`, or the did itself when it has none. */
    resolveHandle(did: string): Promise<string>;
    /**
     * Whether the place currently loaded is a real published place owned by
     * the signed-in account — false for a built-in demo and for anyone
     * else's place, both of which Run has to clone before it may run them.
     */
    isMine: boolean;
    /** The DID that published the place actually running, or null when it
     * has none to attribute — a built-in demo, or the site's own fallback
     * world. */
    owner: string | null;
    /** The manifest, scripts and models of the place or demo actually
     * running, or null when this world has none to seed the editor from. */
    activeProject: PlaceProject | null;
    /** The seed a freshly created place starts from: the world being played. */
    defaultSeed: number;
    places: PlaceLibrary;
    publisher: PlacePublisher;
    /** Reads any account's published rm-stacker models, for attaching one to
     * the draft by handle instead of only by uploading its zip file. */
    models: ModelLibrary;
    /**
     * Loads the draft's scripts into the running place host, seeded from the
     * draft, dresses any props they place with the draft's model files, and
     * rebuilds the world's structures from the draft's recompiled plan. The
     * player is left where they stand, so a creator can iterate on a level
     * without being sent back to the spawn point.
     */
    runScript(
      files: Record<string, string>,
      entry: string,
      seed: number,
      models?: Record<string, Uint8Array>,
      spawn?: Dim3,
    ): Promise<string>;
    /**
     * Records `atUri` as the place this session now owns, once a clone has
     * published it to the signed-in account, and moves the address bar to
     * its `/<handle>/<name>` address.
     */
    claim(atUri: string): Promise<void>;
  };
  /** Whether `onDebugStats` is being called, which `/render:perf` toggles. */
  debugPerf: Accessor<boolean>;
  /** Whether the statistics panel is shown, which `/debug:stats` toggles. */
  showStats: Accessor<boolean>;
  /** What the world costs right now, for the panel to draw. */
  stats: () => WorldStats;
  /** Last strike or use result, so the HUD can show silent failures. */
  editStatus: Accessor<string>;
  /** What the crosshair is over, or null when the primary button would find nothing. */
  target: Accessor<Target | null>;
  /**
   * The NPC or prop the crosshair is on, or null when none is in reach. The
   * action says whether a tap talks to it or uses it.
   */
  npcAim: Accessor<{ id: string; name: string; action: "talk" | "use" } | null>;
  /** The dialog the local player is in, or null when nobody is talking. */
  dialog: Accessor<DialogState | null>;
  /** The item a place script has the local player holding, or null. */
  scriptItem: Accessor<ScriptItemDefinition | null>;
  /** The ending a place script has reached, or null while the game runs. */
  ending: Accessor<{ title: string; text: string } | null>;
  /** A line a place's script is showing with no figure speaking it. */
  narration: Accessor<{ name: string; text: string } | null>;
  /** Clears the current narration line. */
  dismissNarration(): void;
  /** Whether a place's script is playing a camera sequence right now. */
  cutscene: Accessor<boolean>;
  /** The readouts a place's script is showing in the local player's HUD. */
  hud: () => HudReadout[];
  /** Starts the place's game over, fresh from the beginning. */
  restart(): void;
  /** The player starts talking to the NPC with `id`, if a script has one. */
  talkTo(id: string): void;
  /** The player picks option `option` of the dialog on screen. */
  choose(option: number): void;
  /** The player ends the current dialog. */
  leaveDialog(): void;
  /**
   * The spritesheet crop each item's hotbar icon is drawn from, filled in as
   * the sprites load. An item absent here is shown by name instead.
   */
  icons: Accessor<Partial<Record<ItemId, SubTexture>>>;
  /** How much of the world is on screen, for a loading screen to show and dismiss on. */
  loading: Accessor<InitialDrawProgress>;
  /**
   * Whether the canvas is drawn multisampled. A host renders the canvas keyed
   * on this, because a context's sample count cannot change: turning it on or
   * off has to throw the canvas away and mount onto a new one.
   */
  multisampling: Accessor<boolean>;
  /**
   * Attaches a renderer to `canvas` and starts the frame loop. Returns a
   * function that stops the loop and releases the renderer, leaving the world
   * itself intact so it can be mounted onto another canvas.
   */
  mount(canvas: HTMLCanvasElement): () => void;
  /** Unmounts if mounted, then releases the world, its workers, and its listeners. */
  dispose(): void;
}

/**
 * Builds a voxel world — terrain ring, renderers, player, weather, sound,
 * editing and sync — and owns its frame loop. Touches no DOM beyond the
 * canvas passed to `mount`.
 */
export const createVoxelscape = ({
  antialias = false,
  chunkRadius = 4,
  chunkRadiusY = 2,
  terrain = DEFAULT_TERRAIN,
  customVoxelTiles,
  plan,
  structures,
  place,
  activeProject,
  placeEditorOpen: placeEditorOpenSignal,
  levelEditorOpen: levelEditorOpenSignal,
  mode,
  placeUri = DEFAULT_WORLD_URL,
  spawn = [0, 0, 0],
  debugPerf: initialDebugPerf = __PERF__ &&
    typeof window !== "undefined" &&
    window.location.hash.includes("perf"),
  navigate = (to) => {
    window.location.hash = to;
  },
  onDebugStats,
  onNotice,
  player,
}: VoxelscapeConfig = {}): Voxelscape => {
  /**
   * Whether this place starts multiplayer at all, whether anyone can edit its
   * blocks, and — if so — whose edits become durable: `undefined` covers both
   * the default world and a place published before modes existed, and keeps
   * exactly today's behaviour (multiplayer unscoped, edits self-only) rather
   * than being migrated onto one of the four named modes.
   */
  const multiplayerAllowed =
    mode === undefined || mode === "multi" || mode === "multi:edit";
  const editingAllowed =
    mode === undefined || mode === "solo:edit" || mode === "multi:edit";
  const editScope: "self" | "everyone" =
    mode === "multi:edit" ? "everyone" : "self";

  const [editStatus, setEditStatus] = createSignal("");
  const [target, setTarget] = createSignal<Target | null>(null);
  const [npcAim, setNpcAim] = createSignal<{
    id: string;
    name: string;
    action: "talk" | "use";
  } | null>(null);
  const [dialog, setDialog] = createSignal<DialogState | null>(null);
  /** The item the local player holds, as a place script last set it. */
  const [scriptItem, setScriptItem] = createSignal<ScriptItemDefinition | null>(
    null,
  );
  /** The ending a place script has reached, or null while the game runs. */
  const [ending, setEnding] = createSignal<{
    title: string;
    text: string;
  } | null>(null);
  /** A line a place's script is showing with no figure speaking it. */
  const [narration, setNarration] = createSignal<{
    name: string;
    text: string;
  } | null>(null);
  /** Whether a place's script is playing a camera sequence right now. */
  const [cutscene, setCutscene] = createSignal(false);
  const [icons, setIcons] = createSignal<Partial<Record<ItemId, SubTexture>>>(
    {},
  );
  const [debugPerf, setDebugPerf] = createSignal(initialDebugPerf);
  const [showStats, setShowStats] = createSignal(false);

  /**
   * What the world costs right now. Read from the world and the renderer
   * themselves rather than from the performance probe, which the build players
   * get leaves out entirely — the panel these feed is worth having in any
   * build.
   */
  const stats = (): WorldStats => {
    const heap = (
      performance as unknown as { memory?: { usedJSHeapSize: number } }
    ).memory;
    return {
      heapBytes: heap?.usedJSHeapSize,
      voxelBytes: world.voxelBytes,
      mergedGeometryBytes: world.renderer.mergedGeometryBytes,
      blockGeometryBytes: world.renderer.blockGeometryBytes,
      blocks: world.blocks.length,
      chunkRadius: world.chunkRadius,
      triangles: world.renderer.triangleCount,
      fillsPending: world.fillPendingCount,
      meshesPending: world.renderer.meshPendingCount,
    };
  };
  /**
   * Whether the canvas is drawn multisampled. How many samples a pixel is held
   * at is settled when the drawing context is made and fixed for its life, so
   * what reads this is the mount, and changing it remakes the canvas.
   */
  const [multisampling, setMultisamplingSignal] = createSignal(antialias);
  /** Whether the `/place:editor` panel is showing. */
  const [placeEditorOpen, setPlaceEditorOpen] =
    placeEditorOpenSignal ?? createSignal(false);
  /** Whether the `/place:level-editor` overlay is showing. */
  const [levelEditorOpen, setLevelEditorOpen] =
    levelEditorOpenSignal ?? createSignal(false);
  /** The plan the world currently uses, kept in step with the editor and scripts. */
  const [levelPlan, setLevelPlan] = createSignal<LevelPlan>(
    plan ??
      (structures === undefined
        ? emptyLevelPlan()
        : normalizeLevelPlan(structures)),
  );
  /** Where the cursor last was on the canvas, for the editor camera's aiming. */
  const [editorMouse, setEditorMouse] = createSignal<Vector2 | undefined>(
    undefined,
  );
  /**
   * Which style drives the level editor's camera. A device with a coarse
   * pointer opens the editor flying through the world, where a mouse keeps the
   * orbit control it can aim with a cursor.
   */
  const [editorCameraKind, setEditorCameraKind] =
    createSignal<CameraControlsKind>(
      createMediaQuery("(any-pointer: coarse)")() ? "NoClip" : "Orbit",
    );
  // The mount and its unmount are lifecycle work: `mount` runs under the
  // canvas component's settled effect and the returned unmount runs while that
  // owner is being disposed, so this one signal opts into writes from an owned
  // scope.
  const [mountedCanvasEl, setMountedCanvasEl] =
    createSignal<HTMLCanvasElement | null>(null, { ownedWrite: true });
  // Reassigned once a clone publishes this session's place under the
  // signed-in account, so `placeEditor.isMine` reads true right away rather
  // than waiting for the address-bar navigation to reboot the world.
  let ownedPlaceUri = placeUri;
  /**
   * What was last aimed at and whether a hand held anything, so the aim
   * signal only moves when either changes.
   */
  let lastAimId: string | null = null;

  const input = createInput();
  const environment = createEnvironment({
    getGroundHeightAt: (x, z) => world.getHeightAt(x, z),
  });

  const [loading, setLoading] = createSignal<InitialDrawProgress>({
    drawn: 0,
    total: cellsInSphere(chunkRadius, chunkRadiusY),
    spawnDrawn: false,
  });

  const world = createVoxelWorld({
    chunkRadius,
    chunkRadiusY,
    terrain,
    customVoxelTiles,
    structures: levelPlan().structures,
    spawn,
    placeUri,
    onInitialDraw: setLoading,
  });

  /**
   * Camera with a far plane beyond the ring's physical extent, so box
   * geometry is never clipped (fog and early ray termination hide the
   * actual cutoff).
   */
  const camera = new PerspectiveCamera(50, 1.0, 0.1, world.ringRadius + 200);
  /**
   * The level editor's orbit camera. It is separate from the game camera
   * because the player rewrites that one's pose every frame; the frame loop
   * draws from whichever is active.
   */
  const editorCamera = new PerspectiveCamera(
    50,
    1.0,
    0.1,
    world.ringRadius + 200,
  );
  /** The camera the frame loop draws from: the editor's while it is open. */
  const activeCamera = (): PerspectiveCamera =>
    levelEditorOpen() ? editorCamera : camera;
  /**
   * The solid boxes the place's props present, refreshed each frame from what
   * the script has placed. The player's samplers below fold them in, so the
   * physics treats a bed or a counter like terrain it walks around and onto.
   */
  const propBoxes: SolidBox[] = [];
  /**
   * The boxes the script marked hazardous, rebuilt each frame alongside the
   * solid ones. A hazard need not be solid — a patch of poison on the floor is
   * walked through — so these are collected separately.
   */
  const hazardBoxes: Array<{ id: string; box: SolidBox }> = [];
  /**
   * The fields the place's script has declared, refreshed each frame like the
   * boxes. Each holds a box that acts on a player standing inside it — a push
   * toward a target velocity, or a quicksand that slows and sinks them.
   */
  const fieldBoxes: ScriptedField[] = [];
  const playerTerrain: AvatarTerrain = {
    getHeightAt: (x, z) => world.getHeightAt(x, z),
    getGroundHeightAt: (x, y, z) =>
      Math.max(
        world.getGroundHeightAt(x, y, z),
        boxGroundAt(propBoxes, x, y, z),
      ),
    getInWaterAt: (x, y, z) => world.getInWaterAt(x, y, z),
    getSolidAt: (x, y, z) =>
      world.getSolidAt(x, y, z) || solidBoxAt(propBoxes, x, y, z),
    getSurfaceVelocityAt: (x, y, z) => boxVelocityAt(propBoxes, x, y, z),
    getMediumAt: (x, y, z) => {
      // Sums the pushes and takes the worst quicksand, so the answer is
      // order-independent the way the rest of the shared clock is.
      let pushVx = 0;
      let pushVz = 0;
      let pushVy: number | null = null;
      let speedScale = 1;
      let sink = 0;
      let found = false;
      for (const field of fieldBoxes) {
        if (
          x < field.min[0] ||
          x > field.max[0] ||
          y < field.min[1] ||
          y > field.max[1] ||
          z < field.min[2] ||
          z > field.max[2]
        ) {
          continue;
        }
        found = true;
        if (field.kind === "push") {
          pushVx += field.vx;
          pushVz += field.vz;
          if (field.vy !== undefined) {
            pushVy = (pushVy ?? 0) + field.vy;
          }
        } else {
          if (field.speedScale < speedScale) {
            speedScale = field.speedScale;
          }
          if (field.sink > sink) {
            sink = field.sink;
          }
        }
      }
      if (!found) {
        return null;
      }
      return { pushVx, pushVz, pushVy, speedScale, sink };
    },
  };
  const avatar = createPlayerAvatar({
    camera,
    terrain: playerTerrain,
    spawn,
    player,
  });

  /**
   * The cube centre the player starts at, kept so a respawn returns there.
   * Reading `world.getHeightAt` again would not: it returns the topmost solid
   * voxel in the column, which is the roof once the house around spawn has
   * streamed in — the reason a restart put the player on top of it.
   */
  const spawnY = avatar.player.position.y;

  /**
   * Where the player is put back on their feet after dying: the place spawn
   * until a script sets a checkpoint, then that. A script's `player-checkpoint`
   * gives feet coordinates, so the cube centre is derived when it is stored.
   */
  const respawn = { x: spawn[0], y: spawnY, z: spawn[2], yaw: 0 };

  /** Puts the player back on their feet at `respawn`, clearing the fall. */
  const standAtRespawn = (): void => {
    avatar.player.position.set(respawn.x, respawn.y, respawn.z);
    avatar.player.yaw = respawn.yaw;
    avatar.player.pitch = 0;
    avatar.player.vx = 0;
    avatar.player.vy = 0;
    avatar.player.vz = 0;
    avatar.player.onGround = false;
    avatar.player.flying = false;
    health.respawn();
    walkTrace.event("respawn");
  };

  /**
   * The player's hearts and the death sequence. When a zombie's swing empties
   * them, or a script kills the player, the camera plays the fall a corpse
   * does, then this stands the player back up at the last checkpoint.
   */
  const health = new PlayerHealth({
    onFallDone: standAtRespawn,
  });

  /** The height below which the script kills the player, or null when unset. */
  let voidY: number | null = null;

  /** The hazard props the player was touching last frame, so a touch fires once. */
  const touchingHazards = new Set<string>();

  // The world's scripted NPCs, drawn from whatever the console's script host
  // has placed and wearing the bundled model their id names. Nothing draws
  // until /script:demo loads a script that places them.
  let scriptConsole: ScriptConsole | null = null;
  const plannedNpcs = (): ScriptedNpc[] =>
    levelPlan().npcs.map((npc) => ({
      id: npc.id,
      name: npc.name ?? "NPC",
      model: npc.model ?? "",
      modelUri: npc.modelUri ?? "",
      x: npc.x,
      y: npc.y ?? world.getHeightAt(npc.x, npc.z),
      z: npc.z,
      yaw: npc.yaw ?? 0,
    }));
  const plannedProps = (): ScriptedProp[] =>
    levelPlan().props.map((prop) => ({
      id: prop.id,
      model: prop.model,
      name: prop.name ?? prop.id,
      x: prop.x,
      y: prop.y ?? world.getHeightAt(prop.x, prop.z),
      z: prop.z,
      yaw: prop.yaw ?? 0,
      height: prop.height ?? 2,
      solid: prop.solid ?? false,
      hazard: prop.hazard ?? false,
      ...(prop.conveyor !== undefined ? { conveyor: prop.conveyor } : {}),
    }));
  // The endings this place's game has already reached, kept in the page's own
  // storage so a collecting game remembers them across a restart. A world with
  // no place has no game to remember.
  const endingLog =
    place === undefined
      ? null
      : createEndingLog(endingLogKey(place.seed, place.entry));
  const npcFigures = new VoxelFigures({
    getFigures: () => {
      const figures: RenderedFigure[] = [];
      for (const npc of [...plannedNpcs(), ...(scriptConsole?.npcs() ?? [])]) {
        const pose = scriptConsole?.npcPose(npc.id) ?? null;
        figures.push(
          pose === null
            ? npc
            : {
                id: npc.id,
                x: npc.x + pose.dx,
                y: npc.y + pose.dy,
                z: npc.z + pose.dz,
                yaw: npc.yaw + pose.yaw,
                spin: { axis: pose.spinAxis, angle: pose.spinAngle },
              },
        );
      }
      return figures;
    },
    modelFor: (id) => {
      const npc =
        scriptConsole?.npc(id) ??
        plannedNpcs().find((planned) => planned.id === id) ??
        null;
      if (npc !== null && npc.modelUri !== "") {
        return npc.modelUri;
      }
      if (npc !== null && npc.model !== "") {
        return npc.model;
      }
      return id === "sable"
        ? "npc-sable.zip"
        : id === "rook"
          ? "npc-rook.zip"
          : "zombie.zip";
    },
  });
  // Props are any other object a script stands in the world — a fridge, a
  // vending machine — drawn from the rm-stacker model it names, exactly as the
  // zombies and NPCs are. A prop with a motion is drawn where the shared clock
  // has carried it.
  const propFigures = new VoxelFigures({
    getFigures: () => {
      const figures: RenderedFigure[] = [];
      for (const prop of [
        ...plannedProps(),
        ...(scriptConsole?.props() ?? []),
      ]) {
        const pose = scriptConsole?.propPose(prop.id) ?? null;
        figures.push(
          pose === null
            ? prop
            : {
                id: prop.id,
                x: prop.x + pose.dx,
                y: prop.y + pose.dy,
                z: prop.z + pose.dz,
                yaw: prop.yaw + pose.yaw,
                height: prop.height,
                spin: { axis: pose.spinAxis, angle: pose.spinAngle },
              },
        );
      }
      return figures;
    },
    modelFor: (id) =>
      scriptConsole?.prop(id)?.model ??
      plannedProps().find((planned) => planned.id === id)?.model ??
      "",
  });
  // A scripted fire is its own particle flame, drawn from the same billboard
  // shader the bomb-bloom demo uses, with its ember kindled into the floor.
  const fireFigures = new FireFigures(() => scriptConsole?.fires() ?? []);
  // A scripted blast is its own radial particle burst, drawn while its host
  // record is fresh.
  const explosionFigures = new ExplosionFigures(
    () => scriptConsole?.explosions() ?? [],
  );
  // The embers the fires kindle, kept so a restart can put the floor back.
  const fireEmbers = new FireEmbers(
    world.blocks,
    (indices) => world.renderer.onBlocksChanged(indices),
    world.light,
  );

  /**
   * Rebuilds the boxes the player collides with and the hazard boxes it touches
   * from the current props, both refreshed each frame so a prop the script
   * moves or retires is met where it now is.
   */
  const refreshPropBoxes = (): void => {
    propBoxes.length = 0;
    hazardBoxes.length = 0;
    for (const prop of [...plannedProps(), ...(scriptConsole?.props() ?? [])]) {
      if (!prop.solid && !prop.hazard) {
        continue;
      }
      const bounds = propFigures.aimBounds(prop.id);
      if (bounds === null) {
        continue;
      }
      const pose = scriptConsole?.propPose(prop.id) ?? null;
      const cx = prop.x + (pose?.dx ?? 0);
      const cy = prop.y + (pose?.dy ?? 0);
      const cz = prop.z + (pose?.dz ?? 0);
      const box: SolidBox = {
        minX: cx - bounds.half,
        maxX: cx + bounds.half,
        minY: cy,
        maxY: cy + bounds.height,
        minZ: cz - bounds.half,
        maxZ: cz + bounds.half,
        ...(pose !== null
          ? {
              yaw: prop.yaw + pose.yaw,
              vx: pose.vx,
              vy: pose.vy,
              vz: pose.vz,
            }
          : prop.conveyor !== undefined
            ? { vx: prop.conveyor.vx, vz: prop.conveyor.vz }
            : {}),
      };
      if (prop.solid) {
        propBoxes.push(box);
      }
      if (prop.hazard) {
        hazardBoxes.push({ id: prop.id, box });
      }
    }
    // Barriers are boxes that block only the player, so they join the same
    // solids a solid prop's own box does — nothing anywhere else collides with
    // them, being script-steered or drawn on the page rather than walked in.
    for (const barrier of scriptConsole?.barriers() ?? []) {
      propBoxes.push({
        minX: barrier.min[0],
        maxX: barrier.max[0],
        minY: barrier.min[1],
        maxY: barrier.max[1],
        minZ: barrier.min[2],
        maxZ: barrier.max[2],
      });
    }
  };

  /**
   * Fills the fields a script has declared into the physics sampler, so one
   * boxed region can push a player or hold them like quicksand. Refreshed each
   * frame alongside the prop boxes, because a script may retire a field the
   * way it retires a prop.
   */
  const refreshFields = (): void => {
    fieldBoxes.length = 0;
    for (const field of scriptConsole?.fields() ?? []) {
      fieldBoxes.push(field);
    }
  };

  /**
   * Reports each hazardous prop the player's cube newly overlaps, once per
   * contact, so a script hears a `player-touched` fact the way it hears a
   * `zone-entered`.
   */
  const checkHazardTouch = (): void => {
    const p = avatar.player.position;
    const half = avatar.player.config.halfSize;
    const touching = new Set<string>();
    for (const { id, box } of hazardBoxes) {
      const overlaps =
        p.x + half >= box.minX &&
        p.x - half <= box.maxX &&
        p.y + half >= box.minY &&
        p.y - half <= box.maxY &&
        p.z + half >= box.minZ &&
        p.z - half <= box.maxZ;
      if (overlaps) {
        touching.add(id);
        if (!touchingHazards.has(id)) {
          void scriptConsole?.touched(id);
        }
      }
    }
    touchingHazards.clear();
    for (const id of touching) {
      touchingHazards.add(id);
    }
  };

  /**
   * Every script NPC as a pickable body: the shape a strike aims at, and the
   * hint's own aim, both read from the same list so they never drift apart.
   */
  const npcAimTargets = (): AimTarget[] => {
    const targets: AimTarget[] = [];
    for (const npc of [...plannedNpcs(), ...(scriptConsole?.npcs() ?? [])]) {
      const box = npcFigures.aimBounds(npc.id);
      targets.push({
        id: npc.id,
        x: npc.x,
        y: npc.y,
        z: npc.z,
        half: box?.half,
        height: box?.height,
        yaw: npc.yaw,
      });
    }
    return targets;
  };

  /**
   * Bakes each model a place carries once and gives it to both figure
   * renderers, so an NPC or a prop can wear whichever the script names.
   */
  const loadPlaceModels = async (
    models: Record<string, Uint8Array>,
  ): Promise<void> => {
    for (const [name, bytes] of Object.entries(models)) {
      try {
        const figure = await loadFigure(modelBlob(bytes));
        npcFigures.setFigure(name, figure);
        propFigures.setFigure(name, figure);
      } catch (err) {
        onNotice?.(
          `model "${name}" did not load — ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  };

  const inventory = new Inventory();
  // ── Starting inventory ────────────────────────────────────────────────────
  // The player begins with a sword already in hand and 64 of every wool colour
  // so they can start building straight away.
  const WOOL_IDS: ItemId[] = [
    "wool_white",
    "wool_orange",
    "wool_magenta",
    "wool_light_blue",
    "wool_yellow",
    "wool_lime",
    "wool_pink",
    "wool_gray",
    "wool_light_gray",
    "wool_cyan",
    "wool_purple",
    "wool_blue",
    "wool_brown",
    "wool_green",
    "wool_red",
    "wool_black",
  ];
  inventory.add("bucket", 1);
  for (const woolId of WOOL_IDS) {
    inventory.add(woolId, 64);
  }
  // Place the sword in slot 0, bucket in slot 1, and leave remaining slots (2-4) blank.
  inventory.setHotbarSlot(0, "sword");
  inventory.setHotbarSlot(1, "bucket");
  inventory.setHotbarSlot(2, null);
  inventory.setHotbarSlot(3, null);
  inventory.setHotbarSlot(4, null);
  inventory.setSelected("sword");
  // ─────────────────────────────────────────────────────────────────────────
  const hand = new Hand({ camera });
  // The fluid simulation: wakes on player edits and on chunk fills, ticks at
  // Minecraft's per-kind spread speeds, and reports its changed blocks to the
  // renderer exactly as a player edit would.
  const flow = new FlowController({
    blocks: world.blocks,
    resolve: (w) => world.blockIndexAtVoxel(w),
    onBlocksEdited: (indices) => world.renderer.onBlocksChanged(indices),
    light: world.light,
  });
  world.onBlockFilled((i) => flow.wakeBlock(i));
  const editing = new EditingController({
    blocks: world.blocks,
    layer: world.editLayer,
    inventory,
    onBlocksEdited: (indices) => world.renderer.onBlocksChanged(indices),
    onEditRecorded: () => world.scheduleSave(),
    // Peers apply these immediately; the atproto sync is still what settles
    // disagreements.
    onEdit: (w, id, updatedAt) =>
      multiplayer.broadcastEdits([
        { x: w[0], y: w[1], z: w[2], id, ts: updatedAt },
      ]),
    onVoxelWritten: (w, id) => flow.wakeVoxel(w, id),
    getLook: () => avatar.look(),
    getPlayerVoxels: () => avatar.occupiedVoxels(),
    light: world.light,
  });

  /**
   * Applies whether editing is allowed right now: closed outright by mode, or
   * open but waiting on the sign-in a `multi:edit` place needs before anyone's
   * edits would have anywhere durable and shared to go.
   */
  const updateEditingEnabled = (): void => {
    editing.setEnabled(
      editingAllowed && (editScope !== "everyone" || atproto.did !== null),
    );
  };

  const toolContext: ToolContext = {
    editing,
    look: () => avatar.look(),
    position: () => avatar.player.position,
    strikeables: () => npcAimTargets(),
    strike: (id, amount, attackerX, attackerZ) => {
      // The attacker sees the hit flash on their own client the instant the
      // swing lands, whatever the place's script goes on to decide about it
      // — the same way it never waited on a monster's owner to confirm one.
      npcFigures.flashHit(id);
      void scriptConsole?.hit(id, amount, attackerX, attackerZ);
    },
    setGuarding: (raised) => health.setGuarding(raised),
  };
  const tools = Object.fromEntries(
    ITEM_ORDER.map((id) => [id, ITEMS[id].tool(toolContext)]),
  ) as Record<ItemId, Tool>;

  /** The item the hand holds, so the tool it names is put away when it changes. */
  let wielded: ItemId | null = null;
  const wield = (next: ItemId | null): void => {
    if (next === wielded) {
      return;
    }
    if (wielded !== null) {
      tools[wielded].stow();
    }
    wielded = next;
  };

  // `atproto.did` itself is a plain getter, not a signal, so JSX that reads
  // `placeEditor.accountDid`/`.isMine`/`.owner` only ever sees the value as
  // of whenever that JSX last happened to run — signing in while the place
  // editor is already open would otherwise never be reflected there. This
  // mirrors it into a signal from the one place both a restored session and
  // a fresh sign-in or sign-out already report through: `AtprotoController`'s
  // own `onConnected`/`onSignedOut` hooks.
  const [accountDid, setAccountDid] = createSignal<string | null>(null);
  const atproto = new AtprotoController({
    layer: world.editLayer,
    seed: terrain.seed,
    place: placeUri,
    editScope,
    getHandle: () => "",
    onMerged: (changed) => {
      if (changed > 0) {
        world.reapplyEdits();
        world.scheduleSave();
      }
    },
    onConnected: (did) => {
      setAccountDid(did);
      if (multiplayerAllowed) {
        void multiplayer.start();
      }
      updateEditingEnabled();
      // Signing in unlocks the upload and self-scoped-read halves of a sync
      // that don't run without an account; the shared-read half already ran
      // once at boot below, and runs again here too, harmlessly.
      void atproto.sync();
      // Their own cube wears the face peers see, which is how they check it.
      void atproto
        .resolvePicture(did)
        .then(async (picture) => {
          if (picture !== null) {
            avatar.setPicture(await createImageBitmap(picture));
          }
        })
        .catch(() => {
          // No picture is a look, not a failure worth reporting.
        });
    },
    onSignedOut: () => {
      setAccountDid(null);
      void multiplayer.stop();
      updateEditingEnabled();
    },
  });
  updateEditingEnabled();
  // A `multi:edit` place's shared edits are public reads, needing no account,
  // so this runs before anyone has signed in rather than waiting for
  // `/account:sync` or a connected session to remember to ask for them.
  void atproto.sync();

  const multiplayer = new MultiplayerController({
    getRepoClient: () => atproto.repoClient,
    getDid: () => atproto.did,
    seed: terrain.seed,
    scope: placeUri,
    getPose: () => ({
      x: avatar.player.position.x,
      y: avatar.player.position.y,
      z: avatar.player.position.z,
      yaw: avatar.player.yaw,
      pitch: avatar.player.pitch,
    }),
    resolveHandle: (did) => atproto.resolveHandle(did),
    resolvePicture: (did) => atproto.resolvePicture(did),
    createSignaling: createPeerJSSignaling,
    camera,
    onRemoteEdits: (_did, edits) => {
      world.applyEdits(
        edits.map((e) => ({
          w: [e.x, e.y, e.z],
          edit: { id: e.id, updatedAt: e.ts },
        })),
      );
    },
    // A peer's live-tracked NPC is theirs to chase with; we just display
    // wherever they say it stands.
    onRemoteScriptEntities: (_did, updates) => {
      for (const update of updates) {
        scriptConsole?.applyRemoteNpc(
          update.id,
          update.x,
          update.y,
          update.z,
          update.yaw,
        );
      }
    },
    // A peer's own script facts, folded into this client's copy of the
    // shared log so both scripts converge on the same NPCs and dialogs.
    onRemoteScriptEvents: (_did, events) => {
      void scriptConsole?.applyRemoteEvents(events);
    },
    // A peer's script hurt this player: apply it to the local health.
    onRemotePlayerDamage: (_did, damage) => {
      if (damage.target === (atproto.did ?? "")) {
        dealDamage(damage.amount, "remote-script");
      }
    },
  });

  const modelLibrary = createModelLibrary();

  // Live model addresses a script's NPCs have named, fetched once each and
  // baked under their own `at://` address — `VoxelFigures.loadModel` bakes a
  // figure under any string key, not only a place's own bundled files. A
  // fetch that fails (the account's server hiccupping, say) is retried
  // after a cooldown rather than given up on for the rest of the session —
  // an entity a script keeps alive stays worth trying to draw.
  const NPC_MODEL_RETRY_MS = 4_000;
  const resolvedNpcModels = new Set<string>();
  const pendingNpcModels = new Set<string>();
  const failedNpcModelAt = new Map<string, number>();
  const resolveNpcModel = (uri: string): void => {
    if (uri === "" || resolvedNpcModels.has(uri) || pendingNpcModels.has(uri)) {
      return;
    }
    const failedAt = failedNpcModelAt.get(uri);
    if (failedAt !== undefined && Date.now() - failedAt < NPC_MODEL_RETRY_MS) {
      return;
    }
    pendingNpcModels.add(uri);
    void (async () => {
      try {
        const model = await modelLibrary.byUri(uri);
        await npcFigures.loadModel(uri, await modelLibrary.file(model));
        resolvedNpcModels.add(uri);
        failedNpcModelAt.delete(uri);
      } catch (err) {
        failedNpcModelAt.set(uri, Date.now());
        onNotice?.(
          `model "${uri}" did not load — ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } finally {
        pendingNpcModels.delete(uri);
      }
    })();
  };

  // A bundled model file a plan's NPC or prop has named, fetched from this
  // site's `models/` and baked under the file name for both figure renderers.
  // Baking again under a name `dressNpcs` or the running place's attached
  // files already covered just replaces the figure, so the sets only stop this
  // one source re-fetching its own names; a fetch that fails is retried after
  // a cooldown rather than given up on, so a figure the editor just placed
  // still comes up when its bytes are reachable.
  const BUNDLED_MODEL_RETRY_MS = 4_000;
  const bakedBundledModels = new Set<string>();
  const pendingBundledModels = new Set<string>();
  const failedBundledModelAt = new Map<string, number>();
  const resolveBundledModel = (file: string): void => {
    if (
      file === "" ||
      bakedBundledModels.has(file) ||
      pendingBundledModels.has(file)
    ) {
      return;
    }
    const failedAt = failedBundledModelAt.get(file);
    if (
      failedAt !== undefined &&
      Date.now() - failedAt < BUNDLED_MODEL_RETRY_MS
    ) {
      return;
    }
    pendingBundledModels.add(file);
    void (async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}models/${file}`,
        );
        if (!response.ok) {
          throw new Error(`fetch answered ${response.status}`);
        }
        const figure = await loadFigure(await response.blob());
        npcFigures.setFigure(file, figure);
        propFigures.setFigure(file, figure);
        bakedBundledModels.add(file);
        failedBundledModelAt.delete(file);
      } catch (err) {
        failedBundledModelAt.set(file, Date.now());
        onNotice?.(
          `model "${file}" did not load — ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } finally {
        pendingBundledModels.delete(file);
      }
    })();
  };

  const placeLibrary = createPlaceLibrary();
  const placePublisher = createPlacePublisher({
    getClient: () => atproto.repoClient,
    getRepo: () => atproto.did,
  });

  /** The camera pose a running cutscene started from, and which one it is. */
  let cutsceneFrom: CameraStart | null = null;
  let cutsceneStart = -1;

  /**
   * Puts the camera where the local player's cutscene says it is, or returns
   * without touching it when none runs. The starting pose is the live camera's
   * the first frame a sequence is seen, so a shot moves out of what the player
   * was already looking at. A sequence that has played out is cleared, and the
   * camera snapped back to the player.
   */
  const applyCutsceneCamera = (): void => {
    const state = scriptConsole?.cutsceneFor("") ?? null;
    if (state === null) {
      return;
    }
    if (state.startMs !== cutsceneStart) {
      cutsceneStart = state.startMs;
      const dir = camera.getWorldDirection(new Vector3());
      cutsceneFrom = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        lookX: camera.position.x + dir.x,
        lookY: camera.position.y + dir.y,
        lookZ: camera.position.z + dir.z,
      };
      setCutscene(true);
    }
    if (cutsceneFrom === null) {
      return;
    }
    const pose = cutscenePoseAt(
      state,
      scriptConsole?.getNow() ?? Date.now(),
      cutsceneFrom,
    );
    camera.position.set(pose.x, pose.y, pose.z);
    camera.lookAt(pose.lookX, pose.lookY, pose.lookZ);
    if (pose.done) {
      scriptConsole?.clearCutscene("");
      cutsceneStart = -1;
      cutsceneFrom = null;
      setCutscene(false);
      avatar.place();
    }
  };

  /**
   * Starts the place's game over: the player stands back up at spawn and the
   * script runs from a fresh interpreter, while the world it built stays.
   */
  const restartPlace = (): void => {
    setEnding(null);
    setDialog(null);
    setCutscene(false);
    cutsceneStart = -1;
    cutsceneFrom = null;
    // A fresh run starts from the place's own spawn, not wherever the last
    // run's checkpoints had reached.
    respawn.x = spawn[0];
    respawn.y = spawnY;
    respawn.z = spawn[2];
    respawn.yaw = 0;
    voidY = null;
    touchingHazards.clear();
    avatar.player.position.set(spawn[0], spawnY, spawn[2]);
    avatar.player.vx = 0;
    avatar.player.vy = 0;
    avatar.player.vz = 0;
    avatar.player.onGround = false;
    avatar.player.flying = false;
    health.respawn();
    // The fresh script lights no fires, so the embers of the old run go back
    // to being the floor they kindled from.
    fireEmbers.clear();
    void scriptConsole?.restart();
  };

  // The console's place script, built only when a /script: command first needs
  // it, so the interpreter is not loaded by every world that never runs one.
  const scriptConsoleFor = async (): Promise<ScriptConsole> => {
    if (scriptConsole === null) {
      const { ScriptConsole: ScriptConsoleClass } =
        await import("../places/script-console");
      scriptConsole = new ScriptConsoleClass({
        getHeightAt: (x, z) => world.getHeightAt(x, z),
        getSolidAt: (x, y, z) => world.getSolidAt(x, y, z),
        getWaterAt: (x, y, z) => world.getInWaterAt(x, y, z),
        // The local avatar plus whoever the mesh has a live link to.
        getPlayers: () => [
          {
            did: atproto.did ?? "",
            x: avatar.player.position.x,
            y: avatar.player.position.y,
            z: avatar.player.position.z,
          },
          ...multiplayer.peerPositions(),
        ],
        getNow: () => multiplayer.getNow(),
        report: (line) => onNotice?.(line),
        onDialog: (player, state) => {
          if (player === "") {
            setDialog(state);
          }
        },
        onEnding: (player, state) => {
          if (player === "") {
            setEnding(state);
            if (state !== null) {
              endingLog?.record(state.title);
            }
          }
        },
        onRestart: () => restartPlace(),
        onTime: (command) => {
          if (command.clear === true) {
            environment.dayNight.clearOverride();
          }
          if (command.seconds !== undefined) {
            environment.dayNight.jumpTo(command.seconds);
          }
          if (command.speed !== undefined) {
            environment.dayNight.setSpeed(command.speed);
          }
        },
        onNarrate: (_player, line) => setNarration(line),
        onPlayerPlace: (player, at) => {
          if (player !== "" && player !== (atproto.did ?? "")) {
            return;
          }
          // The script gives the player's feet; the avatar's position is the
          // centre of its cube, `halfSize` above them.
          avatar.player.position.set(
            at.x,
            at.y === undefined
              ? avatar.player.position.y
              : at.y + avatar.player.config.halfSize,
            at.z,
          );
          if (at.yaw !== undefined) {
            avatar.player.yaw = at.yaw;
          }
          avatar.player.vx = 0;
          avatar.player.vy = 0;
          avatar.player.vz = 0;
          avatar.player.onGround = false;
          avatar.place();
        },
        onPlayerFace: (player, at) => {
          if (player !== "" && player !== (atproto.did ?? "")) {
            return;
          }
          avatar.player.yaw = Math.atan2(
            at.x - avatar.player.position.x,
            at.z - avatar.player.position.z,
          );
          avatar.place();
        },
        onPlayerSpeed: (player, multiplier) => {
          if (player !== "" && player !== (atproto.did ?? "")) {
            return;
          }
          avatar.player.config.speed = DEFAULT_PLAYER_CONFIG.speed * multiplier;
        },
        onPlayerJump: (player, multiplier) => {
          if (player !== "" && player !== (atproto.did ?? "")) {
            return;
          }
          avatar.player.config.jumpSpeed =
            DEFAULT_PLAYER_CONFIG.jumpSpeed * multiplier;
        },
        onPlayerDamage: (player, amount, source) => {
          if (player === "" || player === (atproto.did ?? "")) {
            dealDamage(amount, "script", source);
          } else {
            multiplayer.broadcastPlayerDamage({ target: player, amount });
          }
        },
        onEntityMove: (state) => {
          multiplayer.broadcastScriptEntities([state]);
        },
        onEvent: (event) => {
          multiplayer.broadcastScriptEvents([event]);
        },
        onCheckpoint: (player, at) => {
          if (player !== "") {
            return;
          }
          respawn.x = at.x;
          respawn.z = at.z;
          if (at.y !== undefined) {
            respawn.y = at.y + avatar.player.config.halfSize;
          }
          if (at.yaw !== undefined) {
            respawn.yaw = at.yaw;
          }
        },
        onKill: (player) => {
          if (player !== "") {
            return;
          }
          health.kill();
        },
        onRespawn: (player) => {
          if (player !== "") {
            return;
          }
          standAtRespawn();
        },
        onVoid: (y) => {
          voidY = y;
        },
        onFire: (fire) => {
          fireEmbers.seed(fire);
        },
        onSound: (player, name) => {
          // A sound aimed at one named player means that peer alone; empty
          // means every local peer plays its own copy of the same effect.
          if (player !== "") {
            return;
          }
          environment.sound.playSfx(name);
        },
        getEndings: () => endingLog?.seen() ?? [],
      });
    }
    return scriptConsole;
  };

  // A place joined from its address runs its scripts as soon as the console
  // that hosts them exists, so its NPCs and dialogs are live without the player
  // typing a command. Its structure plan was compiled before the world was
  // built, because the terrain it stamps has to be in place for the first fill.
  // Every model is baked and given to the figure renderers before the script
  // itself starts: a script's first tick commonly places an NPC wearing one
  // of them immediately, and a figure not yet registered when that NPC is
  // created is a figure it never picks up, not one it grows into moments
  // later. An NPC or prop the script grounds itself (no explicit height) may
  // still land on a column whose terrain has not streamed in yet — that
  // settles on its own once it has, rather than being waited for here (see
  // `ScriptHost`'s own re-grounding).
  if (place !== undefined) {
    void loadPlaceModels(place.models ?? {})
      .then(() => scriptConsoleFor())
      .then((console) =>
        console.loadProject(
          place.files,
          place.entry,
          place.seed,
          place.models ?? {},
        ),
      )
      .then((line) => onNotice?.(line))
      .catch((err) =>
        onNotice?.(
          `place script did not load — ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );
  }

  /** The player starts talking to the NPC `id` names, over the script host. */
  const npcTalk = (id: string): void => {
    void scriptConsoleFor()
      .then((console) => console.talkTo(id))
      .catch(() => {});
  };
  /** The player uses the entity `id` names, whatever they are holding, over the script host. */
  const npcUse = (id: string): void => {
    const held = scriptConsole?.heldItem()?.id ?? "";
    void scriptConsoleFor()
      .then((console) => console.use(id, held))
      .catch(() => {});
  };
  /** The player uses the item `id` names on its own, over the script host. */
  const itemUse = (id: string): void => {
    void scriptConsoleFor()
      .then((console) => console.useItem(id))
      .catch(() => {});
  };
  /** The player picks option `option` (0-based) of the current dialog. */
  const npcChoose = (option: number): void => {
    if (dialog() === null) {
      return;
    }
    void scriptConsoleFor()
      .then((console) => console.chooseOption(option))
      .catch(() => {});
  };
  /** The player ends the current dialog. */
  const npcLeave = (): void => {
    if (dialog() === null) {
      return;
    }
    void scriptConsoleFor()
      .then((console) => console.leaveTalk())
      .catch(() => {});
  };

  const script = {
    demo: () => scriptConsoleFor().then((console) => console.loadSample()),
    state: () => scriptConsoleFor().then((console) => console.describe()),
    talk: (id: string) =>
      scriptConsoleFor().then((console) => console.talk(id)),
    choose: (option: number) =>
      scriptConsoleFor().then((console) => console.choose(option)),
    leave: () => scriptConsoleFor().then((console) => console.leave()),
  };

  /** Dresses the NPC figures in the models this site bundles, best effort. */
  const dressNpcs = async (): Promise<void> => {
    for (const file of ["npc-sable.zip", "npc-rook.zip", "zombie.zip"]) {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}models/${file}`,
        );
        if (response.ok) {
          npcFigures.setFigure(file, await loadFigure(await response.blob()));
        }
      } catch {
        // An NPC whose model cannot load is simply not drawn until one does.
      }
    }
  };
  void dressNpcs();

  // Every item drawn from the site's spritesheet is read once, for the mesh
  // the hand holds and the crop its hotbar icon shows; a failure to load just
  // leaves that item undrawn rather than blocking the world.
  let bucketEmpty: { model: Model; bbox: SubTexture } | undefined;
  const bucketFilled = new Map<
    "water" | "lava",
    { model: Model; bbox: SubTexture }
  >();
  const bucketTool = tools["bucket"] as BucketTool;
  const applyBucketFill = (fill: "water" | "lava" | null): void => {
    const state = fill === null ? bucketEmpty : bucketFilled.get(fill);
    if (state === undefined) {
      return;
    }
    hand.setModel("bucket", state.model);
    setIcons((current) => ({ ...current, bucket: state.bbox }));
  };
  bucketTool.onFillChange = () => applyBucketFill(bucketTool.fill);
  for (const id of ITEM_ORDER) {
    const sprite = ITEMS[id].sprite;
    if (sprite === null) {
      continue;
    }
    void loadSpriteModel(sprite)
      .then(({ model, bbox }) => {
        if (id === "bucket") {
          bucketEmpty = { model, bbox };
          applyBucketFill(bucketTool.fill);
        }
        hand.setModel(id, model);
        setIcons((current) => ({ ...current, [id]: bbox }));
      })
      .catch((err) =>
        console.warn(`[${id}] not drawn; the player holds nothing.`, err),
      );
  }
  // The bucket's two full states swap its model and icon in as it is filled
  // and emptied, so the held sprite matches what the tool is carrying.
  for (const fill of ["water", "lava"] as const) {
    void loadSpriteModel(`bucket_${fill}`)
      .then(({ model, bbox }) => {
        bucketFilled.set(fill, { model, bbox });
        applyBucketFill(bucketTool.fill);
      })
      .catch((err) =>
        console.warn(`[bucket_${fill}] not drawn; the fill shows empty.`, err),
      );
  }

  /**
   * Everything drawn, in the order it is drawn. There is no depth-sorted pass
   * for transparency, so a group's place in this list is the whole of what
   * puts it in front of or behind another.
   */
  const scene = new Scene();
  /**
   * The box drawn around the level editor's selected item. It lives in the
   * scene so it draws over the world, and stays hidden until one is selected.
   */
  const levelEditorHighlight = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.35,
    }),
  );
  levelEditorHighlight.visible = false;
  scene.add(
    environment.sky,
    world.terrain,
    avatar.body,
    multiplayer.avatars,
    npcFigures.group,
    propFigures.group,
    fireFigures.group,
    explosionFigures.group,
    world.water,
    environment.weatherEffects,
    world.underwaterTint,
    levelEditorHighlight,
    // The camera carries the held sword, and it has to be part of the scene
    // for its children to be drawn; it also sits last so the sword draws over
    // the world when it overlaps the view.
    camera,
  );

  // A restored session is the one thing that happens without being asked for,
  // so it is the one thing worth saying unprompted.
  void atproto.init().then((line) => onNotice?.(line));

  /**
   * The render scale for this world, held across mounts rather than by any one
   * canvas, so a remount keeps the scale this already measured its way to.
   */
  const resolution = new AdaptiveResolution();

  /** The canvas the world is mounted on, for a trace's marks to read back. */
  let mountedCanvas: HTMLCanvasElement | undefined;

  /**
   * Records a walk, so a bug somebody walked into can be walked into again.
   * What it snapshots is everything a reader would have to match: the terrain
   * it was generated from, the window it was streamed into, and the settings
   * that decide what any of that costs.
   */
  const walkTrace = new WalkTraceRecorder(probe, {
    setup: () => ({
      href: window.location.href,
      userAgent: navigator.userAgent,
      cores: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      viewport: mountedCanvas && {
        width: mountedCanvas.width,
        height: mountedCanvas.height,
      },
      terrain,
      window: {
        chunkRadius: world.chunkRadius,
        chunkRadiusY: world.chunkRadiusY,
        lodBands: world.lodBands,
      },
      render: {
        multisampling: multisampling(),
        resolution: resolution.describe(),
      },
      workers: world.workerPool.describe(),
      clock: environment.dayNight.describe(),
      spawn,
    }),
    pose: () => {
      const at = avatar.player.position;
      const look = camera.getWorldDirection(new Vector3());
      return {
        position: [at.x, at.y, at.z],
        facing: [look.x, look.y, look.z],
      };
    },
  });

  /**
   * Takes damage on the local player and, while a walk is being recorded,
   * logs why — a walk trace otherwise has no way to say what killed anybody,
   * only where they were standing when it happened.
   */
  const dealDamage = (amount: number, cause: string, source?: string): void => {
    const taken = health.takeDamage(amount);
    if (taken === 0) {
      return;
    }
    // The entity's own current position, read fresh rather than trusted
    // from whatever the effect happened to carry — this is what actually
    // answers "was the thing that hit me anywhere near what I was looking
    // at", not just that a hit landed.
    const attackerNpc =
      source === undefined ? null : (scriptConsole?.npc(source) ?? null);
    walkTrace.event(health.dead ? "death" : "damage", {
      cause,
      amount: taken,
      hp: health.hp,
      attacker:
        attackerNpc === null
          ? undefined
          : {
              id: source!,
              position: [attackerNpc.x, attackerNpc.y, attackerNpc.z],
            },
    });
    if (health.dead) {
      // A death the world can name is a death the script hears about too, the
      // way it already hears about the void: the last damage a player took is
      // a fact a place's rules can fold over.
      void scriptConsole?.died(cause);
    }
  };

  /** The place script editor's door into the world: opening it, running the
   * draft's script, and reading and publishing places. */
  const placeEditor = {
    open: placeEditorOpen,
    setOpen: setPlaceEditorOpen,
    /** The signed-in account the editor publishes from, or null while signed out. */
    get accountDid(): string | null {
      return accountDid();
    },
    /** The handle to show for `did`, or the did itself when it has none. */
    resolveHandle: (did: string): Promise<string> => atproto.resolveHandle(did),
    /**
     * Whether the place currently loaded is a real published place, and this
     * account is the one that published it. A built-in demo and anyone
     * else's place both read false here, whatever `parsePlaceAtUri` makes of
     * their address — Run would otherwise hand a draft script to the same
     * host driving the place everyone else there is playing, or reload a
     * demo nobody owns as if it were an edit. (Collaborators and forking are
     * their own later doors into this, not exceptions bolted onto this
     * check.)
     */
    get isMine(): boolean {
      const parsed = parsePlaceAtUri(ownedPlaceUri);
      return parsed !== null && parsed.repo === accountDid();
    },
    get owner(): string | null {
      return parsePlaceAtUri(ownedPlaceUri)?.repo ?? null;
    },
    activeProject: activeProject ?? null,
    /** The seed a freshly created place starts from: the world being played. */
    defaultSeed: terrain.seed,
    places: placeLibrary,
    publisher: placePublisher,
    /** Reads any account's published rm-stacker models, for attaching one to
     * the draft by handle instead of only by uploading its zip file. */
    models: modelLibrary,
    runScript: (
      files: Record<string, string>,
      entry: string,
      seed: number,
      models?: Record<string, Uint8Array>,
      spawnPoint?: Dim3,
    ) => {
      return (async () => {
        // Baked and registered before the script itself runs — see the boot
        // path above for why an NPC's model has to already be there.
        if (models !== undefined) {
          await loadPlaceModels(models);
        }
        const scriptConsole = await scriptConsoleFor();
        // The world's structures come from the same plan the script's own Run
        // compiles, so a creator who edits shapes sees the change on the
        // terrain they are standing on. The cells either plan reaches are
        // regenerated in place; the player is not moved.
        let structuresLine = "";
        try {
          const plan = await compilePlacePlan({
            files,
            entry,
            models: models ?? {},
            seed,
            region: planRegionAround(spawnPoint ?? spawn),
          });
          if (
            plan.structures.length > 0 ||
            plan.npcs.length > 0 ||
            plan.props.length > 0
          ) {
            setLevelPlan(plan);
          }
          const count = `${plan.structures.length} structure shape${
            plan.structures.length === 1 ? "" : "s"
          }`;
          structuresLine =
            plan.structures.length === 0
              ? ""
              : world.setStructures(plan.structures)
                ? ` — ${count} rebuilt`
                : ` — ${count} already in place`;
        } catch (err) {
          structuresLine = ` — structures unchanged (this plan did not compile: ${
            err instanceof Error ? err.message : String(err)
          })`;
        }
        const line = await scriptConsole.loadProject(
          files,
          entry,
          seed,
          models ?? {},
        );
        return `${line}${structuresLine}`;
      })();
    },
    async claim(atUri: string): Promise<void> {
      ownedPlaceUri = atUri;
      const parsed = parsePlaceAtUri(atUri);
      if (parsed === null) {
        return;
      }
      const handle = await atproto.resolveHandle(parsed.repo);
      navigate(`/${handle}/${parsed.rkey}`);
    },
  };

  const commands = createCommands({
    renderer: world.renderer,
    workerPool: world.workerPool,
    world,
    dayNight: environment.dayNight,
    weather: environment.weather,
    sound: environment.sound,
    atproto,
    multiplayer,
    health,
    places: placeLibrary,
    placePublisher,
    defaultSeed: terrain.seed,
    placeUri,
    navigate,
    togglePlaceEditor: () => {
      const next = !placeEditorOpen();
      setPlaceEditorOpen(next);
      return next
        ? "place editor opened — write your place's scripts, run them, then publish"
        : "place editor closed";
    },
    toggleLevelEditor: () => {
      const next = !levelEditorOpen();
      setLevelEditorOpen(next);
      if (next) {
        // The editor and the script editor are two answers to the same panel;
        // opening one puts the other away.
        setPlaceEditorOpen(false);
      }
      return next
        ? "level editor opened — build the world's structures, then /place:level-editor closes it"
        : "level editor closed";
    },
    script,
    resolution,
    setView: (mode) => {
      avatar.setFirstPerson(mode === "first");
      return `camera: ${mode}-person view`;
    },
    setPlayerVisible: (visible) => {
      avatar.setCubeVisible(visible);
      return visible ? "player cube shown" : "player cube hidden";
    },
    setMoveSpeed: (n) => {
      if (n !== undefined) {
        avatar.player.config.speed = n;
      }
      return `move speed: ${avatar.player.config.speed} units/sec`;
    },
    setLookSensitivity: (n) => {
      if (n !== undefined) {
        avatar.player.config.lookSensitivity = n;
      }
      return `look sensitivity: ${avatar.player.config.lookSensitivity} rad/px`;
    },
    setFlying: (flying) => {
      const next = flying ?? !avatar.player.flying;
      avatar.player.flying = next;
      if (next) {
        // don't carry the fall they were in into the air
        avatar.player.vy = 0;
        avatar.player.onGround = false;
      }
      return next ? "flying" : "walking";
    },
    setNoClip: (noclip) => {
      const next = noclip ?? !avatar.player.noclip;
      avatar.player.noclip = next;
      if (next) {
        // don't carry the fall they were in into the air
        avatar.player.vy = 0;
        avatar.player.onGround = false;
      }
      return next ? "no-clip" : "collisions on";
    },
    setEditorCamera: (kind) => {
      const next =
        kind ?? (editorCameraKind() === "NoClip" ? "Orbit" : "NoClip");
      setEditorCameraKind(next);
      return next === "NoClip"
        ? "level editor camera: no-clip"
        : "level editor camera: orbit";
    },
    setDebugPerf: (on) => {
      if (!__PERF__) {
        return "performance readout unavailable in this build";
      }
      const next = on ?? !debugPerf();
      setDebugPerf(next);
      return next ? "performance readout shown" : "performance readout hidden";
    },
    traceStart: (name) => {
      if (walkTrace.recording) {
        return "a walk is already being traced; /trace:stop writes it";
      }
      const setup = walkTrace.start(name);
      // Said out loud as well as written down: the console then carries what
      // the world was set to, beside whatever is typed next.
      return [
        `tracing "${name}"`,
        describeSetup(setup),
        "/trace:mark what you see, /trace:stop to write it",
      ].join("\n");
    },
    traceMark: (note) => {
      if (!walkTrace.recording) {
        return "nothing is being traced; /trace:start first";
      }
      walkTrace.mark(note);
      return `marked ${walkTrace.marked}: ${note || "(no note)"}`;
    },
    traceSnap: async (note) => {
      const trace = await walkTrace.snap(note);
      return writeTrace(trace, `snapped "${note || "(no note)"}"`);
    },
    traceStop: async () => {
      const trace = await walkTrace.stop();
      if (trace === undefined) {
        return "nothing is being traced";
      }
      const said =
        `traced ${trace.seconds.toFixed(0)}s, ${trace.marks.length} ` +
        `mark${trace.marks.length === 1 ? "" : "s"}, ${trace.events.length} ` +
        `logged event${trace.events.length === 1 ? "" : "s"}`;
      return writeTrace(trace, said);
    },
    setShowStats: (on) => {
      const next = on ?? !showStats();
      setShowStats(next);
      return next ? "stats shown" : "stats hidden";
    },
    setMultisampling: (on) => {
      const next = on ?? !multisampling();
      if (next === multisampling()) {
        return `multisampling is already ${next ? "on" : "off"}`;
      }
      setMultisamplingSignal(next);
      // The canvas the world is mounted on goes with the old context, and the
      // geometry and textures are uploaded again into the new one, so the world
      // stops for as long as that takes.
      return next
        ? "multisampling on — remaking the canvas"
        : "multisampling off — remaking the canvas";
    },
  });

  /** Reusable color object, updated in place each frame so sky updates don't allocate. */
  const skyColor = new Color(SKY_BLUE);

  let unmount: (() => void) | null = null;
  /** Seconds before the next lava burn may land while the player stands in it. */
  let lavaBurnCooldown = 0;
  /** Seconds before the held weapon item may fire again. */
  let weaponCooldown = 0;
  /** Seconds of contact damage each lava burn deals (about a quarter of a heart per burn). */
  const LAVA_BURN = 1;

  // Benchmarks drive the real world through a URL flag, the way `#perf` does.
  // The page is handed the moving body, what the window has streamed and
  // drawn, the console the world already answers, the probe recording the
  // frame, and the routes the player can be sent along.
  if (__PERF__ && window.location.hash.includes("bench")) {
    (window as unknown as { __voxelscape?: object }).__voxelscape = {
      player: avatar.player.position,
      cellReady: (x: number, y: number, z: number) => world.cellReady(x, y, z),
      loading: () => loading(),
      blockCount: world.blocks.length,
      cellsInSphere,
      chunkRadius,
      chunkRadiusY,
      run: (line: string) => commands.run(line),
      queues: () => ({
        fillPending: world.fillPendingCount,
        fillInFlight: world.fillInFlightCount,
        meshPending: world.renderer.meshPendingCount,
        meshInFlight: world.renderer.meshInFlightCount,
        dirtySuperchunks: world.renderer.dirtySuperchunkCount,
      }),
      probe,
      drive: (next: BenchRoute) => {
        route = { ...next, remaining: next.seconds };
      },
      driving: () => route !== undefined,
    };
  }

  /** Advances everything by `dt` seconds, leaving the scene ready to draw. */
  /** The benchmark route being driven, and how much of its time is left. */
  let route: (BenchRoute & { remaining: number }) | undefined;

  /**
   * Carries the player one frame along the route: forward over the terrain
   * surface, turning the view, and asking the world to scroll to where they
   * now stand. The scroll is asked for here because the frame's own scroll
   * sits behind the gate that holds physics while the player's cell streams
   * in, and a route that outruns the streaming would otherwise never ask for
   * the cell it is standing in.
   */
  const driveRoute = (dt: number): void => {
    if (route === undefined) {
      return;
    }
    route.remaining -= dt;
    if (route.remaining <= 0) {
      route = undefined;
      return;
    }
    const position = avatar.player.position;
    if (route.speed !== 0) {
      position.x += Math.sin(route.heading) * route.speed * dt;
      position.z += Math.cos(route.heading) * route.speed * dt;
      position.y =
        world.getHeightAt(position.x, position.z) +
        avatar.player.config.halfSize +
        0.1;
      avatar.player.vx = 0;
      avatar.player.vy = 0;
      avatar.player.vz = 0;
      avatar.player.onGround = true;
    }
    if (route.turn !== 0) {
      avatar.player.yaw += route.turn * dt;
    }
    avatar.place();
    // Under the same phase the frame's own scroll is timed under: a benchmark
    // drives the player from here instead, and the window's work — evicting
    // slots, teleporting them onto entering cells, asking for their fills — is
    // the same work either way. Timed anywhere else it would read as a frame
    // that spent seventeen milliseconds on nothing anybody named.
    probe.begin(Phase.scroll);
    world.scrollTo(position.x, position.y, position.z);
    probe.end(Phase.scroll);
  };

  /** Hands the probe this frame's queue depths, counters and player position. */
  const reportGauges = (): void => {
    if (!probe.armed) {
      return;
    }
    const renderer = world.renderer;
    probe.gauge(Field.uploadBytes, renderer.lastTickUploadBytes);
    probe.gauge(Field.merges, renderer.lastTickMerges);
    probe.gauge(Field.triangles, renderer.triangleCount);
    probe.gauge(Field.occluded, renderer.occlusions);
    probe.gauge(Field.visible, renderer.lastVisibleCount);
    probe.gauge(Field.drawnMeshes, renderer.lastDrawnMeshes);
    probe.gauge(Field.meshPending, renderer.meshPendingCount);
    probe.gauge(Field.meshInFlight, renderer.meshInFlightCount);
    probe.gauge(Field.dirtySuperchunks, renderer.dirtySuperchunkCount);
    probe.gauge(Field.fillPending, world.fillPendingCount);
    probe.gauge(Field.fillInFlight, world.fillInFlightCount);
    const voxelBytes = world.voxelBytes;
    const mergedGeometryBytes = renderer.mergedGeometryBytes;
    const blockGeometryBytes = renderer.blockGeometryBytes;
    probe.gauge(Field.voxelBytes, voxelBytes);
    probe.gauge(Field.mergedGeometryBytes, mergedGeometryBytes);
    probe.gauge(Field.blockGeometryBytes, blockGeometryBytes);
    probe.gauge(
      Field.residentBytes,
      voxelBytes + mergedGeometryBytes + blockGeometryBytes,
    );
    const position = avatar.player.position;
    probe.gauge(
      Field.cellReady,
      world.cellReady(position.x, position.y, position.z) ? 1 : 0,
    );
    probe.gauge(Field.playerX, position.x);
    probe.gauge(Field.playerY, position.y);
    probe.gauge(Field.playerZ, position.z);
  };

  /**
   * The level editor's camera control: the same toolbox-style orbit control the
   * editor uses standalone, aimed at the world it is mounted over. It is
   * attached to the canvas by `mount` and only acts while the editor is open.
   */
  const editorControl = new KitCameraControl({
    getActiveCamera: () => editorCamera,
    getProjection: () => "Perspective",
    mousePos: () => editorMouse(),
    mouseRay: () => {
      const canvas = mountedCanvasEl();
      const position = editorMouse();
      if (canvas === null || position === undefined) {
        return undefined;
      }
      return mouseRay(
        editorCamera,
        canvas.clientWidth,
        canvas.clientHeight,
        position.x,
        position.y,
      );
    },
    projectPtToScreen: (pt) => {
      const canvas = mountedCanvasEl();
      if (canvas === null) {
        return undefined;
      }
      return projectPtToScreen(
        editorCamera,
        canvas.clientWidth,
        canvas.clientHeight,
      )(pt);
    },
    pickingDist: ({ mouseRay: ray }) => {
      const pick = pickVoxel(
        world.blocks,
        [ray.origin.x, ray.origin.y, ray.origin.z],
        [ray.direction.x, ray.direction.y, ray.direction.z],
        256,
      );
      return pick.target === null
        ? undefined
        : { t: pick.distance, objectId: "" };
    },
  });

  /**
   * The world the no-clip editor camera flies through: nothing blocks it, no
   * water grips it, and it is held inside the same far extent the camera can
   * see. The free-fly integrator is the player's own, so the terrain it would
   * collide with is only turned off here.
   */
  const editorNoClipWorld: PlayerWorld = {
    getGroundHeightAt: () => -Infinity,
    getInWaterAt: () => false,
    getSolidAt: () => false,
    halfExtent: world.ringRadius,
  };

  /**
   * The level editor's no-clip camera: free flight driven by the player's
   * `/player:no-clip` movement, for a hand that steers a view more easily than
   * it places a cursor.
   */
  const editorNoClipControl = new NoClipCameraControl({
    input,
    getActiveCamera: () => editorCamera,
    world: editorNoClipWorld,
    speed: 30,
  });

  /** The camera control the active style drives. */
  const editorCameraControl = (): CameraControl =>
    editorCameraKind() === "NoClip" ? editorNoClipControl : editorControl;

  const advance = (dt: number): void => {
    const progress = loading();
    if (progress.drawn < progress.total) {
      // These frames cost what generating terrain costs, not what drawing it
      // does, and the resolution would drop to fit a load that is about to end.
      resolution.hold();
    }
    if (progress.spawnDrawn) {
      driveRoute(dt);
    }
    // Only the player waits. Moving the renderers' tick in here deadlocks:
    // it is what builds the geometry this is waiting for. The world-ready
    // half holds them still while a scroll's player cell has been asked for
    // but has not landed, so physics never reads a cell that holds nothing.
    // The place editor being open holds them still too — writing a script
    // is not something the world it describes should be able to interrupt.
    const simulationReady =
      progress.spawnDrawn &&
      !placeEditorOpen() &&
      world.cellReady(
        avatar.player.position.x,
        avatar.player.position.y,
        avatar.player.position.z,
      );
    // The player's own world holds still while the level editor is open — the
    // camera belongs to someone designing rather than someone playing — but
    // the figures keep reconciling, so an NPC or prop placed from the editor
    // is drawn the moment its model reaches the browser.
    if (simulationReady && !levelEditorOpen()) {
      health.tick(dt);
      if (health.dead) {
        // The player's body lies where it fell: no input, no editing, and no
        // swing — just the death fall the camera plays while the world keeps
        // simulating around the corpse. `onFallDone` stands them back up at
        // spawn once it has lain out, and the ordinary branch below runs
        // from this frame on.
        avatar.placeDeath(health.fallProgress);
        wield(null);
        setTarget(null);
        hand.show(null, null);
      } else {
        probe.begin(Phase.player);
        const snapshot = input.consume();
        const locked = scriptConsole?.controlsLocked("") ?? false;
        refreshPropBoxes();
        refreshFields();
        avatar.move(dt, locked ? CUTSCENE_INPUT : snapshot);
        checkHazardTouch();
        probe.end(Phase.player);
        if (locked) {
          // A cutscene owns the view and the body: no aim, no tools, and no
          // held model, while the camera plays.
          setTarget(null);
          setNpcAim(null);
          wield(null);
          hand.show(null, null);
        } else {
          // Selecting first, so the rest of the frame — the pick, both buttons,
          // and what the hand draws — all belong to the same tool.
          if (snapshot.select !== null) {
            inventory.selectSlot(snapshot.select);
          }
          if (snapshot.wheel !== 0) {
            inventory.selectStep(snapshot.wheel);
          }
          wield(inventory.selectedId);
          const tool = tools[inventory.selectedId];
          // An NPC or prop the crosshair is on can be talked to or used with the
          // same tap or click that would otherwise strike; the aim is recomputed
          // every frame so the hint tracks what the crosshair is over.
          const look = avatar.look();
          const orbit = [look.origin[0], look.origin[1], look.origin[2]] as [
            number,
            number,
            number,
          ];
          const heading = [
            look.direction[0],
            look.direction[1],
            look.direction[2],
          ] as [number, number, number];
          const aimTargets: AimTarget[] = npcAimTargets();
          for (const prop of [
            ...plannedProps(),
            ...(scriptConsole?.props() ?? []),
          ]) {
            const box = propFigures.aimBounds(prop.id);
            aimTargets.push({
              id: prop.id,
              x: prop.x,
              y: prop.y,
              z: prop.z,
              half: box?.half,
              height: box?.height,
            });
          }
          const aimed = pickFigure(orbit, heading, aimTargets);
          const aimedNpc =
            aimed === null
              ? null
              : (scriptConsole?.npc(aimed.id) ??
                plannedNpcs().find((npc) => npc.id === aimed.id) ??
                null);
          const aimedProp =
            aimed === null
              ? null
              : (scriptConsole?.prop(aimed.id) ??
                plannedProps().find((prop) => prop.id === aimed.id) ??
                null);
          // An NPC talks bare-handed and is used otherwise, the same as a prop
          // always is — so the hint has to track the held item too, not just
          // which figure the crosshair is over.
          const holding = scriptConsole?.heldItem() !== null;
          const aimKey = aimed === null ? null : `${aimed.id}:${holding}`;
          if (aimKey !== lastAimId) {
            lastAimId = aimKey;
            setNpcAim(
              aimed === null
                ? null
                : aimedNpc !== null && !holding
                  ? { id: aimed.id, name: aimedNpc.name, action: "talk" }
                  : {
                      id: aimed.id,
                      name: aimedNpc?.name ?? aimedProp?.name ?? aimed.id,
                      action: "use",
                    },
            );
          }
          // The camera has not caught up yet, so this picks from last frame's eye
          // along this frame's look. Recomputed every frame, not just on edits, so
          // the crosshair tracks what it is over.
          const pick = tool.pick();
          setTarget(pick.primary);
          // A click that the wielded tool itself resolves to a strike is left
          // to it below, rather than treated as a talk or a use — a sword
          // swing and a bare use are different gestures even when they land on
          // the same body. The use button and the E key never mean a strike,
          // whatever is wielded, so they always reach this path.
          const interacted =
            dialog() === null &&
            aimed !== null &&
            (snapshot.use ||
              (snapshot.click && pick.primary?.kind !== "actor"));
          if (interacted) {
            // An NPC talks bare-handed, the same as ever — but holding
            // anything at all is "used with it" instead, the same fact a prop
            // always reports. What that means is entirely up to the script.
            if (aimedNpc !== null && !holding) {
              npcTalk(aimed.id);
            } else {
              npcUse(aimed.id);
            }
          } else if (
            // Over empty air, or with a conversation already open, the use
            // button uses the held item.
            snapshot.use
          ) {
            const held = scriptConsole?.heldItem() ?? null;
            if (held !== null) {
              itemUse(held.id);
            }
          }
          // A script item that is a weapon fires on the primary button instead
          // of the wielded tool: the weapon's own reach, rate, and damage decide
          // the shot, and the press is consumed below so the tool never also
          // strikes.
          const heldItem = scriptConsole?.heldItem() ?? null;
          const heldWeapon = heldItem?.weapon ?? null;
          const weaponPress = heldWeapon !== null && snapshot.primary;
          if (weaponPress && heldWeapon !== null) {
            if (weaponCooldown <= 0) {
              weaponCooldown = heldWeapon.fireIntervalMs / 1000;
              // The shot's report is the firing player's own, whatever the
              // bullet then hits; unknown weapon ids are silent by name.
              environment.sound.playSfx(`gun-${heldItem!.id}`);
              const shot = pickFigure(
                orbit,
                heading,
                npcAimTargets(),
                heldWeapon.reach,
              );
              // A nearer solid voxel stands in the bullet's way the way it
              // stands in a swing's way; a wall between the player and a
              // zombie is a wall to a bullet too.
              const blocked = pickVoxel(
                world.blocks,
                orbit,
                heading,
                heldWeapon.reach,
              );
              if (shot !== null && blocked.distance > shot.distance) {
                const position = avatar.player.position;
                // The shot lands the way any other strike does, so a place
                // hears it exactly as it hears a sword swing.
                npcFigures.flashHit(shot.id);
                void scriptConsole?.hit(
                  shot.id,
                  heldWeapon.damage,
                  position.x,
                  position.z,
                );
              }
            }
          }
          if (snapshot.primary && !interacted && !weaponPress) {
            const result = tool.primary(pick);
            if (result !== null) {
              setEditStatus(result);
            }
          }
          if (snapshot.secondary) {
            const result = tool.secondary(pick);
            if (result !== null) {
              setEditStatus(result);
            }
          }
          tool.update(dt, snapshot);
          hand.show(
            avatar.firstPerson ? inventory.selectedId : null,
            tool.pose(),
          );
        }
        probe.begin(Phase.scroll);
        world.scrollTo(
          avatar.player.position.x,
          avatar.player.position.y,
          avatar.player.position.z,
        );
        probe.end(Phase.scroll);
        avatar.place();
        applyCutsceneCamera();
        // Lava is a hazard the way water is a medium: standing in it burns,
        // on a short cooldown so the player can hop out between ticks.
        const p = avatar.player.position;
        weaponCooldown -= dt;
        lavaBurnCooldown -= dt;
        if (
          (world.getLavaAt(p.x, p.y, p.z) ||
            world.getLavaAt(p.x, p.y + 1.5, p.z)) &&
          lavaBurnCooldown <= 0
        ) {
          dealDamage(LAVA_BURN, "lava");
          lavaBurnCooldown = 0.5;
        }
        // A place script may set a floor the player must not fall past. Feet
        // below it is a death the world observed, so the script hears the fact.
        if (
          voidY !== null &&
          avatar.player.position.y - avatar.player.config.halfSize < voidY
        ) {
          health.kill();
          void scriptConsole?.died("void");
        }
      }
      probe.begin(Phase.flow);
      flow.tick(dt);
      probe.end(Phase.flow);
      probe.begin(Phase.multiplayer);
      multiplayer.tick(dt);
      probe.end(Phase.multiplayer);
      setScriptItem(scriptConsole?.heldItem() ?? null);
      // The script's zones are checked against where the player stands, so a
      // step into a room is a fact the rules can fold over.
      void scriptConsole?.updatePosition(
        avatar.player.position.x,
        avatar.player.position.y,
        avatar.player.position.z,
      );
      // A script's timers fire off the shared clock: pumping is how the world
      // tells the host time has passed even when no player action arrived.
      void scriptConsole?.pump();
    }
    // The figures draw in both modes, editor open or playing: a figure the
    // level editor has just placed is reconciled the moment its model reaches
    // the browser rather than waiting for the editor to close. The script host
    // still holds still while the editor is open, so what it last placed keeps
    // being drawn but does not advance.
    if (simulationReady) {
      probe.begin(Phase.figures);
      scriptConsole?.regroundAuto();
      for (const npc of scriptConsole?.npcs() ?? []) {
        resolveNpcModel(npc.modelUri);
      }
      // A plan's own figures wear site-bundled models, fetched and baked as
      // soon as the level editor names one — the same on-demand dressing the
      // script's NPCs get for their live addresses.
      for (const npc of plannedNpcs()) {
        resolveBundledModel(npc.model);
      }
      for (const prop of plannedProps()) {
        resolveBundledModel(prop.model);
      }
      npcFigures.tick(dt);
      propFigures.tick(dt);
      fireFigures.tick(dt);
      explosionFigures.tick(dt);
      probe.end(Phase.figures);
    }
    // While the level editor is open the player block above is skipped, so the
    // window follows the editor camera instead of the player. The control is
    // advanced here too: an orbit control is driven by its own effect, while a
    // no-clip one reads the frame's input and flies.
    if (levelEditorOpen()) {
      const control = editorCameraControl();
      control.update(dt);
      const focus = control.target;
      world.scrollTo(focus.x, focus.y, focus.z);
    }
    probe.begin(Phase.environment);
    const lighting = environment.tick(dt, activeCamera());
    skyColor.set(
      lighting.skyColor[0],
      lighting.skyColor[1],
      lighting.skyColor[2],
    );
    world.renderer.applyLighting(lighting);
    // The voxel-model figures are self-lit, so they take the same day-night
    // state the renderers apply to the terrain and the standard materials.
    npcFigures.applyLighting(lighting);
    propFigures.applyLighting(lighting);
    hand.applyLighting(lighting);
    probe.end(Phase.environment);
    // The light engine catches up on the seam and edit work the frame queued,
    // under a small budget, before the renderer turns its changed blocks back
    // into geometry.
    probe.begin(Phase.light);
    world.light.flush();
    probe.end(Phase.light);
    probe.begin(Phase.rendererTick);
    world.renderer.tick(dt, activeCamera());
    probe.end(Phase.rendererTick);
    reportGauges();
  };

  // Marking a moment has to be possible without opening the console: by the
  // time the console is open the pointer is unlocked, a second has passed and
  // whatever was on screen is often no longer there. The console's own command
  // stays, for a mark worth a sentence.
  if (__PERF__) {
    window.addEventListener("keydown", (event) => {
      if (
        event.code !== "KeyM" ||
        !event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event) ||
        !walkTrace.recording
      ) {
        return;
      }
      event.preventDefault();
      walkTrace.mark("");
      onNotice?.(`marked ${walkTrace.marked}`);
    });
  }

  /**
   * Hands a finished trace to the development server, which writes it where it
   * can be read, and says where it went. Without a server behind the page —
   * every build but the one being worked on — it says that instead of failing
   * quietly.
   */
  const writeTrace = async (
    trace: WalkTraceFile,
    said: string,
  ): Promise<string> => {
    try {
      const answer = await fetch("/__walktrace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(trace),
      });
      if (!answer.ok) {
        return `${said}, but the server refused it (${answer.status})`;
      }
      const { path } = (await answer.json()) as { path: string };
      return `${said} — written to ${path}`;
    } catch {
      return `${said}, but there is no development server to write it to`;
    }
  };

  /**
   * The level editor's handle on this world, read by its UI overlay through the
   * `Voxelscape` object. The plan it exposes is the same one the world stamps.
   */
  const levelEditor = {
    open: levelEditorOpen,
    setOpen: (open: boolean) => setLevelEditorOpen(open),
    camera: editorCamera,
    cameraKind: editorCameraKind,
    setCameraKind: setEditorCameraKind,
    control: editorCameraControl,
    plan: levelPlan,
    setPlan: (plan: LevelPlan) => {
      setLevelPlan(plan);
      world.setStructures(plan.structures);
    },
    figureAimBox: (kind: "npc" | "prop", id: string) =>
      (kind === "npc" ? npcFigures : propFigures).aimBounds(id),
    highlight: levelEditorHighlight,
  };

  // Each control no-ops unless it is both enabled and the selected style, so a
  // right-drag never fights a WASD key. Opening seeds the camera on the player;
  // switching styles re-seats the incoming control from wherever the camera
  // already is, so the view does not jump back to the player.
  createEffect(
    () => ({
      open: levelEditorOpen(),
      canvas: mountedCanvasEl(),
      kind: editorCameraKind(),
    }),
    (value, prev) => {
      const { open, canvas, kind } = value;
      const active = open && canvas !== null;
      const noClip = kind === "NoClip";
      editorControl.enabled = active && !noClip;
      editorNoClipControl.enabled = active && noClip;
      input.setEnabled(!open || noClip);
      if (!active) {
        return;
      }
      const justOpened = prev === undefined || !prev.open;
      const changedKind = prev !== undefined && prev.kind !== kind;
      if (!justOpened && !changedKind) {
        return;
      }
      const feet = avatar.player.position;
      const playerTarget = new Vector3(feet.x, feet.y + 1, feet.z);
      if (justOpened && !noClip) {
        // The orbit control starts behind and above the ground the player
        // stands on, aimed at it.
        editorCamera.position.set(
          playerTarget.x + 32,
          playerTarget.y + 24,
          playerTarget.z + 32,
        );
        editorCamera.lookAt(playerTarget);
      } else if (justOpened) {
        // The no-clip control starts in the world, at the player's eye and
        // facing the way the player faces.
        const eyeY = feet.y + avatar.player.config.eyeHeight;
        const [dx, dy, dz] = lookDirection(avatar.player);
        editorCamera.position.set(feet.x, eyeY, feet.z);
        editorCamera.lookAt(feet.x + dx, eyeY + dy, feet.z + dz);
      }
      editorCamera.updateMatrixWorld();
      // An orbit seeded on the player keeps aiming at the player; one adopted
      // from a no-clip camera aims at a point ahead of where that camera
      // looked, so the two styles meet without a swing.
      const focus = justOpened
        ? playerTarget
        : editorCamera.position
            .clone()
            .add(
              editorCamera.getWorldDirection(new Vector3()).multiplyScalar(32),
            );
      editorCameraControl().syncFromCamera(editorCamera, focus);
      void document.exitPointerLock?.();
    },
  );

  const mount = (canvas: HTMLCanvasElement): (() => void) => {
    mountedCanvas = canvas;
    setMountedCanvasEl(canvas);
    editorControl.detach();
    editorControl.attach(canvas);
    editorNoClipControl.attach(canvas);
    // The editor camera aims through the cursor, so its position over the
    // canvas is tracked here rather than through the player's input handlers.
    const onEditorPointerMove = (event: PointerEvent) => {
      setEditorMouse(new Vector2(event.offsetX, event.offsetY));
    };
    const onEditorPointerLeave = () => setEditorMouse(undefined);
    canvas.addEventListener("pointermove", onEditorPointerMove);
    canvas.addEventListener("pointerleave", onEditorPointerLeave);
    const loop = createRenderLoop({
      canvas,
      scene,
      camera: activeCamera,
      antialias: multisampling(),
      debugPerf,
      resolution,
      onDebugStats,
      onFrame: advance,
      clearColor: () => skyColor,
      beforeRender: (renderer, camera) =>
        world.renderer.occlusionFrame(renderer, camera),
      afterRender: (drawn) => walkTrace.takePicture(drawn),
      describeStats: () =>
        `tris: ${world.renderer.triangleCount.toLocaleString()} | uploaded: ${world.renderer.lastTickUploadBytes.toLocaleString()} B | occluded: ${world.renderer.occlusions}`,
    });

    unmount = () => {
      unmount = null;
      editorControl.detach();
      canvas.removeEventListener("pointermove", onEditorPointerMove);
      canvas.removeEventListener("pointerleave", onEditorPointerLeave);
      setMountedCanvasEl(null);
      loop.dispose();
    };

    return unmount;
  };

  return {
    scene,
    camera,
    world,
    canvas: mountedCanvasEl,
    levelEditor,
    player: avatar.player,
    input,
    inventory,
    health,
    commands,
    placeEditor,
    debugPerf,
    showStats,
    stats,
    editStatus,
    target,
    npcAim,
    dialog,
    scriptItem,
    ending,
    narration,
    dismissNarration: () => setNarration(null),
    cutscene,
    hud: () => scriptConsole?.hud() ?? [],
    restart: restartPlace,
    talkTo: npcTalk,
    choose: npcChoose,
    leaveDialog: npcLeave,
    icons,
    loading,
    multisampling,
    mount,

    dispose() {
      unmount?.();
      scriptConsole?.dispose();
      scriptConsole = null;
      world.dispose();
      multiplayer.dispose();
      atproto.dispose();
      environment.dispose();
      npcFigures.clear();
      propFigures.clear();
      fireFigures.clear();
      explosionFigures.clear();
      hand.dispose();
      editorControl.dispose();
      editorNoClipControl.dispose();
      input.dispose();
    },
  };
};
