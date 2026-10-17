/**
 * The application shell: a canvas, a header, and whichever scene the URL asks for.
 *
 * Three scenes now, and the switch is still a query parameter rather than a build
 * flag. The default is the **game**: a first-person player over the terrain who
 * digs and places with the same stroke machinery the sculptor uses. `?edit` keeps
 * the orbit-and-sculpt view the application grew up as, and `?spike` is the phase
 * 0 diagnostic that proved the renderer, the packed vertex layout and the
 * octahedral fold. A spike behind a build flag is a spike that stops being
 * rebuilt; a game that cannot be put back into the editor it came from is a game
 * whose tools are only ever tested from the outside.
 *
 * The frame loop differs by scene, and deliberately so: the game steps a body and
 * follows it, the editor streams toward an orbit target, and the spike streams
 * nothing. What they share is one renderer and one render call.
 */

import {
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  onSettled,
  runWithOwner,
  Show,
} from "solid-js";
import {
  Color,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from "@random-mesh/rmsl/scene";

import { Console, createConsole, type ConsoleState } from "./console/console";
import { createCommands, type Commander } from "./console/commands";

import {
  LevelEditorHint,
  LevelEditorOverlay,
  LevelEditorTouchControls,
} from "./level-editor/LevelEditorOverlay";
import { createLevelApplier } from "./places/level/apply-level";
import {
  createLevelEditor,
  type LevelEditor,
  drawsInAPlane,
  type ToolKind,
} from "./level-editor/level-editor-store";
import { createOrbitCameraControl } from "./level-editor/camera/orbit";
import { createNoClipCameraControl } from "./level-editor/camera/noclip";
import {
  DEFAULT_FRAME_DISTANCE,
  type CameraControlsKind,
  type CameraControl,
  type CameraPose,
} from "./level-editor/camera/CameraControl";
import { DEFAULT_SHAPE_SIZES, isAxial } from "./level-editor/panels/vocabulary";
import {
  DEFAULT_WALL_HEIGHT,
  DEFAULT_WALL_THICKNESS,
} from "./level-editor/panels/vocabulary";
import { DrawLinesUi } from "./level-editor/draw/DrawLinesUi";
import {
  createDrawLinesController,
  type DrawLinesController,
} from "./level-editor/draw/draw-lines-controller";
import {
  createDrawLinesOverlay,
  type DrawLinesOverlay,
} from "./level-editor/draw/draw-lines-overlay";
import {
  createSelectionOverlay,
  type SelectionOverlay,
} from "./level-editor/view/selection-overlay";
import {
  createImagePlaneOverlay,
  type ImagePlaneOverlay,
} from "./level-editor/view/image-plane";
import {
  createImagePlaneState,
  type ImagePlaneState,
} from "./level-editor/image/image-plane-state";
import {
  readReferenceImage,
  textureFromReference,
} from "./level-editor/image/image-loader";
import { floorDrawing, floorPlacement } from "./level-editor/draw/floor";
import { IDENTITY } from "./level-editor/view/quaternion";
import { planeThrough, rayPlanePoint } from "./level-editor/draw/plane";
import {
  deleteWallSegment,
  wallsCentre,
  wallSegments,
} from "./places/level/walls";
import {
  projectToScreen as projectPointToScreen,
  type ScreenPoint,
  type ScreenSize,
} from "./level-editor/view/move-handle";
import {
  createHighlight,
  highlightBounds,
} from "./level-editor/view/highlight";
import { pickItem } from "./level-editor/view/picking";
import { createMoveHandles } from "./level-editor/view/move-handles";
import {
  segmentUnderPointer,
  type PickableSegment,
  type SegmentPick,
} from "./level-editor/view/pick-segment";
import {
  armUnderPointer,
  distanceDragged,
  type Axis,
} from "./level-editor/view/move-handle";
import { createRotateHandles } from "./level-editor/view/rotate-handles";
import {
  radiansDragged,
  ringUnderPointer,
} from "./level-editor/view/rotate-handle";
import { createGhost, shapeGhostMesh } from "./level-editor/view/ghost";
import {
  axisAngle,
  IDENTITY as IDENTITY_QUAT,
  multiply,
  toEuler,
} from "./level-editor/view/quaternion";
import { pointer } from "@big-mesh-studios/ui/pointer";
import type { Quat, Vec3 } from "@big-mesh-studios/core";
import {
  isLevelFigure,
  LEVEL_FILE,
  type LevelItem,
  type LevelPlan,
  type LevelWalls,
} from "./places/level/types";
import {
  pickAlong,
  rayThroughScreen,
  toNdc,
  type Ray,
} from "@big-mesh-studios/picking";
import { OrbitController } from "./controls/orbit-camera";
import {
  describePrecision,
  detectFragmentPrecision,
  type PrecisionProbe,
} from "./render/precision";
import { SurfaceMaterial } from "./render/surface-material";
import { createViewport, type Viewport } from "./render/viewport";
import { VERTEX_BYTES } from "./render/spike-geometry";
import {
  GAME_WINDOW,
  Session,
  starterOperations,
  type SessionStats,
} from "./session";
import { DEFAULT_PLANET, DEFAULT_TERRAIN } from "@big-mesh-studios/csg";
import { DEFAULT_LOD_BANDS, LOD_OFF, lodIsOff, type LodBands } from "./world";
import { SculptSession } from "./sculpt";
import { DEFAULT_BRUSH } from "./edit/brush";
import { buildSpikeScene, type SpikeScene } from "./spike-scene";
import { createInput } from "./player/input";
import { DEFAULT_PLAYER_CONFIG, playerEye, type Medium } from "./player/player";
import { TouchControls } from "./player/touch-controls";
import { Game } from "./engine/game";
import { createWaterMaterial, type WaterMaterial } from "./world/water";
import {
  describeWorldShape,
  waterShapeOf,
  worldGeometry,
  worldShapeFromSearch,
  type WorldGeometry,
  type WorldShape,
} from "./world/world-geometry";
import { createCloudLayer, type CloudLayer } from "./world/cloud-layer";
import { createZoneLines, type ZoneLines } from "./places/zones";
import { PlaceHost, type Dialog, type Ending } from "./places/host";
import { ModelLibrary } from "./places/model-library";
import { FigureSet } from "./figures/figure-set";
import { PlaceOverlay } from "./places/ui/PlaceOverlay";
import { MAX_DRAWN_LIGHTS } from "./render/point-lights";
import { demoPlace, loadDemoModels } from "./places/demos";
import { surfaceHeightAt } from "./world/surface-height";
import { PLACE_MIME_TYPE, type PlaceSpawn } from "./places/place-file";
import type { LoadedPlace } from "./places/load-place";
import type { PlaceFiles } from "./places/bundle";
import {
  placeCommands,
  NO_PLACE_LOADED,
  type PlaceCommands,
} from "./console/place-commands";
import { createAtproto } from "./atproto/atproto";
import { createPlaceLibrary, createPlacePublisher } from "./atproto/places";
import {
  accountCommands,
  type AccountCommands,
} from "./console/account-commands";
import {
  createPlaceEditor,
  type PlaceEditorState,
} from "./places/editor/create-place-editor";
import type { PlaceEditorProps } from "./places/editor/PlaceEditor";
import { readDraft } from "./places/editor/drafts";
import { readSetting, writeSetting } from "./persistence/settings";
import { projectFromZip, type PlaceProject } from "./places/project";
import type { PublishedPlace } from "./places/place-record";
import { PlacesBrowser } from "./places/browser/PlacesBrowser";
import { PlaceDocs } from "./places/reference/PlaceDocs";
import { MAX_OPERATIONS_PER_PLACE } from "./places/place-registry";
import { MAX_ZONES } from "./places/limits";
import {
  bakeCloudFieldOffThread,
  type CloudBakeSource,
} from "./world/cloud-bake-client";
import {
  bakePlanetMapsOffThread,
  type PlanetBakeSource,
} from "./world/planet-bake-client";
import {
  createGlobe,
  GLOBE_MAP_HEIGHT,
  GLOBE_MAP_WIDTH,
  globeOpacityAt,
  type Globe,
} from "./world/globe";
import { createSky } from "./world/sky";
import { DayNightController } from "./world/day-night-controller";

import styles from "./app.module.css";

/** How often the header is refreshed. A frame's worth of churn is unreadable. */
const READOUT_INTERVAL_MS = 250;

/**
 * Everything a place is, as the one runner takes it.
 *
 * **An object because a place has grown past what positions can carry.** Seven positions, four
 * of them optional and all adjacent, is a signature where `startPlace(files, entry, seed, name,
 * spawn, models)` and `startPlace(files, entry, seed, name, spawn, levels)` are both valid and
 * neither is wrong — and a caller that swapped the last two would compile perfectly and load a
 * place with no models and no levels. The seventh parameter's own note said an options object
 * was a bigger change than adding one more; that was true while the parameters were being added
 * and stops being true the moment one of them is a choice.
 *
 * **`world` is the last one and the reason for the change**, and it is the field that says what
 * the ground is rather than what a script did to it.
 */
interface StartPlace {
  readonly files: PlaceFiles;
  readonly entry: string;
  /** Seeds the place's own `engine.random`, not the terrain. See `PlaceHost`. */
  readonly seed: number;
  readonly name: string;
  /** Where the player starts. See `PlaceManifest.spawn`. */
  readonly spawn?: PlaceSpawn;
  /** Models this place stands its props and NPCs out of. See `model-library.ts`. */
  readonly models?: Readonly<Record<string, Uint8Array>>;
  /** Levels this place carries, which the host puts in the world before the script runs. */
  readonly levels?: Readonly<Record<string, string>>;
  /**
   * What kind of world to build this place on.
   *
   * **Absent means "keep the one this session is already on"**, which is not the same as the
   * manifest's absent-means-sphere. A place is opened into a running session, and rebuilding
   * the world under a player who did not ask for it would move the ground out from under them
   * every time they loaded anything; so this is a *request*, and one that says nothing is a
   * request for what is already there.
   */
  readonly world?: WorldShape;
}

/** The largest step a frame is allowed to advance the world, in seconds. */
const MAX_STEP = 0.05;

/**
 * How far below a spherical world's sea the spawn probe starts, in world units.
 *
 * **A named number rather than a literal at each of two call sites**, because it is the only
 * number standing between a spawn and the inside of a planet: the probe has to begin in solid
 * rock and trace outward, and a value that drifted between the initial spawn and a shape change
 * would put one of them somewhere else.
 */
const SPAWN_PROBE_DEPTH = 200;

const searchHas = (flag: string): boolean =>
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).has(flag);

/** The URL's own parameters, or nothing where there is no URL to read them from. */
const searchParams = (): URLSearchParams | undefined =>
  typeof location === "undefined"
    ? undefined
    : new URLSearchParams(location.search);

const isSpike = (): boolean => searchHas("spike");
const isEdit = (): boolean => searchHas("edit");
const isGame = (): boolean => !isSpike() && !isEdit();

/**
 * The world this page runs, and every number the rest of the file derives from it.
 *
 * **`world/world-geometry.ts` collects what used to be six constants here** — a base field, a
 * frame, a sea level, a landscape and the two functions off it — because they are all
 * consequences of one fact, which is whether the surface is a sphere or a plane. `?world=flat`
 * is what changes it; a place's manifest will be the other thing that does.
 *
 * **The lattice is not the spherical part, and nothing here has to change for a flat world.**
 * `chunkCellOf` is a per-axis floor around the world origin and ADR 0036 put the planet's
 * centre there precisely so it could stay that way, so both worlds stream on the identical
 * cubic lattice. What differs is a field and a frame.
 *
 * **One sea level rather than two conventions, which is what `?flat` got wrong before.**
 * `WORLD.seaLevel` is `seaLevelOf(spec)` — a distance from the centre on a sphere, an altitude
 * on a plane — so a flat frame can never be handed a sea radius and end up with no ocean at
 * all. See `world-geometry.ts` and the note it replaces.
 *
 * **`let` rather than `const` because the console is going to replace it**, in one assignment,
 * once the switch that does it is written. Every reader below keeps reading the name it reads
 * today.
 */
let WORLD: WorldGeometry = worldGeometry(worldShapeFromSearch(searchParams()));

/**
 * The landscape without its caves, which is what "is this water" has to ask.
 *
 * **The landscape is a second copy of the field the workers build, and the reason that is
 * acceptable is ADR 0009's**: both sides build it from the same numbers, so they cannot disagree.
 * It exists because the player's collision and the water predicate both ask per frame, and a
 * field they cannot reach without building it would mean a message per query.
 *
 * **One field and two answers rather than two fields, and the second is `ground`.** `baseFieldFor`
 * is called once by `worldGeometry` and the result carries both answers on it, so there is no
 * second construction to keep in step and nothing for ADR 0009's two-threads-must-agree rule to
 * catch: the mesher's gate and this predicate are handed *the same function object*.
 *
 * **Why two answers are needed at all.** `landscape(p) > 0` means "outside material", and a cave
 * is material with a hole in it — so its air reads as outside material and a cave below sea level
 * reported the player as swimming, in a place the sea's mesh never reaches. The sea exists only
 * in a shell at its own level; everything below that and outside material is rock the sea has not
 * reached, and a deep cave is exactly that. `ground(p) > 0` means "not underground", which a cave
 * never satisfies, and it is the same question the water mesher's gate now asks.
 *
 * **`let` rather than `const` because a shape change replaces the world underneath it**, and
 * `inSea` below reads this name per query rather than holding the function it was built from.
 */
let GAME_GROUND = WORLD.ground;
/**
 * The game's water.
 *
 * **A material and a shape, and no geometry at all.** The sea used to be a 256-segment
 * sphere at this radius, which meant the sphere — not the ground — decided where water
 * was: dig a shaft down through a hill, cross the radius inside the rock, and the shaft
 * filled with water. `mesh/water-mesher.ts` now meshes the sea per chunk from this same
 * radius and the landscape's own field, so what this number is for is the physics, the
 * globe and the atmosphere — everything that asks how deep something is rather than
 * anything that draws it.
 *
 * `WORLD.water` rather than a constant here, because which way the sea faces is a property
 * of the landscape: a sphere's points away from its centre everywhere, a plane's is world up
 * at every point, and taking the radial one on a flat world points sideways at one end of the
 * sea and backwards at the other. See `world/water.ts:44-52`.
 *
 * **One material per shape, built once each and kept, rather than one per switch.** A material
 * is a GL object and its shape is a constructor argument read once while the shader graph is
 * built (`water.ts:119`, `:142`), so a change of shape is a change of material rather than a
 * change of uniform — and a cache is what keeps `/planet:shape` from compiling a shader every
 * time somebody toggles it back.
 */
const waterMaterials = new Map<WorldShape, WaterMaterial>();

const waterMaterialFor = (shape: WorldShape): WaterMaterial => {
  const built = waterMaterials.get(shape);
  if (built !== undefined) return built;
  const material = createWaterMaterial(waterShapeOf(shape));
  waterMaterials.set(shape, material);
  return material;
};

let GAME_WATER = { material: waterMaterialFor(WORLD.shape) };

/**
 * Where the remembered cloud quality is kept.
 *
 * **Namespaced, because the settings store shares one object store with the place draft.**
 * `drafts.ts` uses `place-draft`; a prefix keeps the two sets of keys from ever colliding as
 * more preferences are added. Read once when the cloud layer is built and written whenever
 * `/cloud:quality` sets it, so the quality a machine ended up on is the quality it starts on next.
 */
const CLOUD_QUALITY_KEY = "setting:cloud-quality";

/**
 * The material the figure under the crosshair is drawn with.
 *
 * **Built at module scope and not per frame, because a material is a GL object** — the same
 * reason `GAME_WATER` is above, and it is written down there. One instance for every aimed
 * figure in the world, because uniforms live on the material and every figure shares one: a
 * figure is tinted by being *given a different material*, and its geometry is still the
 * model's, still shared with every other placement of it. See ADR 0047 and `figure-set.ts`.
 *
 * **`tintStrength` is a number rather than a flag** so that the frame loop can hold it at one
 * while a figure is aimed at and let a future change fade it, without a second material or a
 * shader rebuild — the uniform is declared whatever its value, for the reason
 * `point-lights.ts` gives.
 */
/**
 * Somewhere to put a camera's forward direction, so the frame loop allocates nothing.
 *
 * **A module-level scratch rather than a local**, because `getWorldDirection` writes into
 * whatever it is handed and a frame that allocated a `Vector3` for it would be the only
 * allocation on a path that is otherwise allocation-free by design. Nothing here holds it past
 * the statement that fills it.
 */
const TMP_FORWARD = new Vector3();

const FIGURE_TINT = {
  material: Object.assign(new SurfaceMaterial(), {
    tint: { r: 255, g: 224, b: 150 },
    tintStrength: 0.45,
    // **No pattern**, and the flag is the whole reason. A figure model carries no material, so
    // every one of its fragments would read id zero — which is correct, and free only because
    // saying so skips four lattices per pixel on the nearest thing to the camera in the scene.
    wantsPattern: false,
  }),
};

/**
 * Whether a point is in water, as the sea is actually meshed.
 *
 * **Two terms, and the second one is `GAME_GROUND` rather than `GAME_LANDSCAPE`.** Below the sea,
 * and not underground. It is the ground — the *landscape* without its caves, not the model — which
 * is what keeps a shaft dug through a hill dry: the landscape says solid there, so there is no
 * water to be in even though the shaft is below sea level and full of air.
 *
 * **And caves are the same case, which is why the word is `ground` and not `landscape`.** A cave is
 * material with a hole in it, so `GAME_LANDSCAPE` calls its air "outside material" and a cave
 * below sea level reported the player as swimming — in water that is not there, because the sea's
 * geometry is only a shell at sea level and nothing meshes the rest of it. `GAME_GROUND` calls the
 * same air "underground", which is what it is.
 *
 * **"Below the sea" is a different question on each world, and the frame is what says which.**
 * A sphere's sea is a distance from the centre and a plane's is an altitude, so the test asks
 * `radiusAt` on one and reads `y` on the other — which is the branch `?flat` needed then could not
 * have had, because a flat frame's `radiusAt` is `Infinity` and a spherical frame handed an
 * altitude is an ocean at an infinite radius. Both failures are silent. Reading the sea off the
 * same spec as the frame is what removes the pair: `WORLD.seaLevel` and `WORLD.frame` are one
 * decision, so there is nothing left to get wrong.
 *
 * The physics asked the same question before with `radiusAt < seaRadius && !getSolidAt`,
 * and the difference is `getSolidAt`, which asks the *edited* model. That mismatch is what
 * would otherwise let a player swim down a dry shaft.
 */
const inSea = (p: { x: number; y: number; z: number }): boolean => {
  if (WORLD.frame.spherical && WORLD.frame.radiusAt(p) >= WORLD.seaLevel)
    return false;
  if (!WORLD.frame.spherical && p.y >= WORLD.seaLevel) return false;
  return GAME_GROUND(p.x, p.y, p.z) > 0;
};

/** Whether this device points with something coarse, so the touch UI shows. */
const isCoarsePointer = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(any-pointer: coarse)").matches;

/**
 * The level-of-detail bands to run with, overridable from the query string.
 *
 * `?lod=off` switches level of detail off, and `?lod=FULL:COARSE` sets the two bands.
 * The reason this is reachable at runtime rather than only in a test is that it is the
 * one experiment that separates the two possible causes of a crack: with every chunk at
 * full resolution there are no level transitions, so any crack that survives is not one,
 * and any that disappears was one.
 */
const lodBandsFromSearch = (): LodBands | undefined => {
  if (typeof location === "undefined") return undefined;
  const mode = new URLSearchParams(location.search).get("lod");
  if (mode === null) return undefined;
  if (mode === "off") return LOD_OFF;
  const [full, coarse] = mode.split(":").map(Number);
  if (!Number.isFinite(full) || !Number.isFinite(coarse)) return undefined;
  return { full, coarse };
};

/** What the header says about level of detail, so the mode is never a guess. */
const describeBands = (bands: LodBands): string =>
  lodIsOff(bands)
    ? "off (every chunk full resolution)"
    : `full within ${bands.full} chunks, coarse within ${bands.coarse}`;

/**
 * Where the cloud layer is, as the header says it.
 *
 * **The one asynchronous thing in the scene, and therefore the only one that can fail
 * silently.** The field is baked on a worker, so for the first second or two there is
 * no cloud layer at all, and a player looking up sees clear sky — which is exactly what
 * a broken sky looks like. So the state is on screen rather than in a log, and it names
 * the failure rather than only the absence.
 */
type PlanetBakeStatus =
  | { readonly state: "baking" }
  | {
      readonly state: "ready";
      readonly maps: Extract<PlanetBakeSource, "worker" | "main thread">;
      readonly width: number;
    }
  | { readonly state: "failed"; readonly reason: string }
  /**
   * There is no planet to bake.
   *
   * **Its own state rather than a `failed` with a reason**, because "failed" means something went
   * wrong and a person reading the header would go looking for it. A flat world has no globe by
   * construction — the bake is never started, rather than started and refused — and a header that
   * cannot distinguish the two states would be reporting a fault that did not happen.
   */
  | { readonly state: "not on this world" };

type CloudStatus =
  | { readonly state: "baking" }
  | {
      readonly state: "ready";
      readonly field: Extract<CloudBakeSource, "worker" | "main thread">;
    }
  | { readonly state: "failed"; readonly reason: string };

/**
 * One line, or several, saying what a running place has actually done.
 *
 * **Counts rather than a list.** `/place:state` is asked "is this place all right", and the
 * answer to that is four integers and whether anything went wrong — not the four thousand
 * operations it made. A person who wants those can read `/place:notices`, which is where the
 * things that went wrong go.
 *
 * `MAX_ZONES` and `MAX_OPERATIONS_PER_PLACE` are printed beside the counts so the numbers mean
 * something: "3 shapes" says nothing on its own, and "3 shapes of 2000" says where the ceiling
 * is.
 */
const describePlace = (id: string, host: PlaceHost): string => {
  const zones = host.zoneList;
  return [
    id,
    `shapes   ${host.places.operationCount} of ${MAX_OPERATIONS_PER_PLACE}`,
    `zones    ${zones.length} of ${MAX_ZONES}`,
    `lights   ${host.lightCount} (nearest ${Math.min(host.lightCount, MAX_DRAWN_LIGHTS)} drawn)`,
    `timers   ${host.pendingTimerCount}`,
    `events   ${host.events.length}`,
    `data     ${host.storedData.size}`,
    host.lastProblem === undefined ? "" : `problem  ${host.lastProblem}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
};

/**
 * The planet bake, in one line.
 *
 * **The name, not just the state.** A globe baked on the main thread means the player watched half a
 * second of the world stop; a globe baked on a worker means they did not. Both produce a correct
 * planet, so only the difference is worth reporting.
 */
const describePlanetBakeStatus = (status: PlanetBakeStatus): string => {
  if (status.state === "baking") return "maps still baking";
  if (status.state === "failed") return `failed — ${status.reason}`;
  if (status.state === "not on this world")
    return "none — a flat world has no globe";
  return `${status.maps} | ${status.width}px`;
};

const describeCloudStatus = (status: CloudStatus): string => {
  switch (status.state) {
    case "baking":
      return "baking the field…";
    case "ready":
      return `ready (baked on the ${status.field})`;
    case "failed":
      return `NOT BUILT — ${status.reason}`;
  }
};

export default function App() {
  let canvas!: HTMLCanvasElement;
  const [precision, setPrecision] = createSignal<PrecisionProbe | undefined>();
  const [stats, setStats] = createSignal<SessionStats | undefined>();
  const [spikeCounts, setSpikeCounts] = createSignal<
    SpikeScene["counts"] | undefined
  >();
  const [spike] = createSignal(isSpike());
  const [edit] = createSignal(isEdit());
  const [bands] = createSignal(lodBandsFromSearch());
  const [history, setHistory] = createSignal({ undo: 0, redo: 0 });
  const [locked, setLocked] = createSignal(false);
  const [underwater, setUnderwater] = createSignal(false);
  const [coarse] = createSignal(isCoarsePointer());
  const [suspended, setSuspended] = createSignal(false);
  /**
   * Whether the top-left status readout is on screen.
   *
   * **Hidden by default**, because the readout is debug chrome — chunk counts and triangle
   * counts are what a developer watches, not what a player needs — and it is shown again with
   * `/status show`. Component-scope rather than in the level editor's store because it is the
   * whole game's readout and not the editor's.
   */
  const [statusVisible, setStatusVisible] = createSignal(false);
  /** What the loaded place most recently complained about, for a line over the game. */
  const [placeBanner, setPlaceBanner] = createSignal<string | undefined>();
  /** A toast a place asked for, since there is no HUD to show it in. */
  const [placeToast, setPlaceToast] = createSignal<string | undefined>();
  /**
   * The last thing a place said, and who said it.
   *
   * **Beside the toast because it is the same kind of thing**, and because there should be one
   * answer to "how long does a line from a place stay on screen" rather than one per component.
   * A narration replaces the last one rather than queueing: two lines at once is a conversation
   * nobody is having.
   */
  const [narration, setNarration] = createSignal<
    { who: string; text: string } | undefined
  >();
  /**
   * The dialog and the ending on screen, as the overlay reads them.
   *
   * **Signals rather than a call through to the host**, because a Solid component reads its props
   * as signals and the host holds no reactive state. The host keeps the dialog too — `choose`
   * checks it against what was actually shown — so these are a mirror of it and not a second copy
   * of the truth.
   */
  const [placeDialog, setPlaceDialog] = createSignal<Dialog | undefined>();
  const [placeEnding, setPlaceEnding] = createSignal<Ending | undefined>();
  /**
   * What is loaded, kept so an ending's "play again" can run it again.
   *
   * **Held rather than re-derived from the console**, because an ending is the last thing a place
   * does and making the player type a command to start over would turn the button into a lie. It
   * is exactly the argument `startPlace` takes, passed straight through — so restarting is calling
   * that function again with the values it was called with, and there is no second code path for
   * it to disagree with the first.
   */
  let loadedForRestart: StartPlace | undefined;
  /**
   * The hidden file input `/place:open` clicks.
   *
   * **A signal rather than a document query, because the console owns its own input** and a
   * command reaching into the DOM for a second one would be a second, unowned text field. It is
   * `display: none` — not visually hidden — because a file input that is laid out and empty is a
   * box on the screen saying nothing about what it is for.
   */
  const [placePicker, setPlacePicker] = createSignal<HTMLInputElement>();
  /**
   * The loaded place's field lookup, for the player's physics.
   *
   * **A signal rather than a field, because `Game` is built before the host exists** and the
   * world's reader has to close over *something* that will be. `undefined` while no place is
   * loaded and `host.mediumAt` once one is — which is what lets the reader passed to `Game` be
   * `undefined` too, so a world with no place genuinely has no `getMediumAt` rather than one
   * that always answers "none".
   */
  const [placeMedium, setPlaceMedium] = createSignal<
    ((x: number, y: number, z: number) => Medium | undefined) | undefined
  >();
  const [planetBake, setPlanetBake] = createSignal<PlanetBakeStatus>({
    state: "baking",
  });
  const [cloudStatus, setCloudStatus] = createSignal<CloudStatus>({
    state: "baking",
  });

  // Created here rather than in the settled effect so the touch UI can bind to it
  // and the effect can attach it to the canvas. It listens to nothing until it is
  // attached, so an editor or spike session simply leaves it inert.
  const input = createInput();

  /**
   * The command table the console runs against, held outside the settled effect
   * because it can only be built once there is a `Game` to ask, and the console
   * has to be able to read it — for its completions — from the component body.
   * `null` until the game scene exists, which is also the answer the console
   * gives for a command run before then.
   */
  const [commander, setCommander] = createSignal<Commander | null>(null);

  /**
   * The console's scrollback and command handling, built here rather than in the
   * game branch so that closing and reopening the panel keeps its history. See
   * `docs/adr/0010-suspend-the-pointer-lock-not-the-input.md` for the other
   * thing the console has to own above the frame loop.
   */
  const terminal: ConsoleState = createConsole({
    onCommand: (line) =>
      commander()?.run(line) ??
      "the world is still loading — try again shortly",
    commands: () => commander()?.help() ?? [],
  });

  /**
   * The running place's host, and the call that made it — holders rather than direct references,
   * for the reason the console's state is a holder.
   *
   * **Two things need these from outside the branch the place is built in**: the frame loop,
   * which asks the host for its lights and steps it every frame, and the overlay's "play again",
   * which has to call `startPlace` again rather than making the player type a command to start
   * over.
   *
   * **`restartPlace`, not `startPlace`, because the branch defines its own `startPlace`.** A
   * holder with the same name would be shadowed by that local, so it would stay `undefined` and
   * "play again" would return without doing anything. The branch publishes its runner here after
   * defining it; the button reads this holder.
   */
  let placeHost: PlaceHost | undefined;
  let restartPlace: ((place: StartPlace) => Promise<string>) | undefined;

  /**
   * Whether the place editor is open, and the place it is editing.
   *
   * **Both above the game branch**, for the reason the console's own state is (its ADR 0010): the
   * editor has to survive the panel unmounting and the scene being torn down and rebuilt, because
   * a person closes it to look at the world and comes back to the file they were in. The editor's
   * state is created once here rather than per scene for the same reason — a project that was reset
   * on every rebuild would lose an afternoon's work to a resize.
   */
  /** What the editor's slot renders: a component, or prose until the chunk lands. */
  type EditorPanel = (
    props: PlaceEditorProps,
  ) => import("@solidjs/web/jsx-runtime").JSX.Element;

  /**
   * How the editor's Run button reaches the world, and a bridge to it from out here.
   *
   * **A holder rather than a direct call**, because `startPlace` belongs to the game branch and the
   * editor's panel is rendered from the application root — the console does the same with
   * `commander`, which is `null` until the scene exists. So Run before the world is ready prints
   * the same line every other command prints in that state, rather than reaching into a `Game`
   * that is not there.
   */
  let runPlace: ((project: PlaceProject) => Promise<string>) | undefined;
  /** How the catalog loads a place, set by the game branch for the same reason `runPlace` is. */
  let openPublished: ((place: PublishedPlace) => Promise<void>) | undefined;
  /**
   * How the editor opens a place zip, set by the game branch for the same reason `runPlace` is.
   *
   * **The same function `/place:open` calls**, reached as a holder because the picker and the
   * loader live in the game branch while the editor's header is rendered from the application
   * root. Undefined only before the world exists, and the editor cannot be opened before then.
   */
  let openPlaceOnDisk: (() => Promise<string>) | undefined;
  const runEditedPlace = (project: PlaceProject): Promise<string> =>
    runPlace?.(project) ??
    Promise.resolve("the world is still loading — try again shortly");

  const [editorOpen, setEditorOpen] = createSignal(false);
  /** Whether the published-place catalog is showing. Owned here for the same reason as the editor. */
  const [browserOpen, setBrowserOpen] = createSignal(false);
  /** Whether the place API reference is showing. */
  const [docsOpen, setDocsOpen] = createSignal(false);
  const placeEditor: PlaceEditorState = createPlaceEditor(DEFAULT_TERRAIN.seed);

  /**
   * This component's own owner, captured before `onSettled` runs.
   *
   * **`onSettled` executes inside a *tracked effect*, and a tracked effect's owner is marked
   * children-forbidden** (`@solidjs/signals` `dev.js:4075`). Anything reactive created in
   * there is refused with `PRIMITIVE_IN_FORBIDDEN_SCOPE` — and the refusal arrives during
   * the *next flush*, so it is reported against whatever happened to run at that moment
   * rather than against the line that caused it. The level editor's effects are the first
   * reactive primitives this file has created after `onSettled` starts.
   *
   * This owner is not forbidden, and it is also the right one to use: the effects belong to
   * the component, so they are disposed when it unmounts. The alternative is to hoist the
   * effects to component level and pass the scene in through holders — the same fix with
   * more plumbing. `level-editor/scope.test.tsx` holds the failing case and the fix together
   * so neither can drift from the other.
   */
  const appOwner = getOwner();

  /**
   * The level editor's own state, above the game branch for the same reason the place
   * editor's is.
   *
   * **A level is somebody's work**, in the way a project is: it has to survive the scene
   * being torn down and rebuilt by a resize, and it has to outlive the editor's own
   * component so that closing it to look at the world does not cost the level.
   *
   * The two holders exist because the scene is built inside `onSettled` and this state is
   * created before it — the same shape `openPublished` has. Both are filled during `onSettled`
   * and read by the effects below, which is why they are `let` and not optional arguments.
   */
  let applyLevel: ((plan: LevelPlan) => void) | undefined;
  let clickLevelWorld: ((clientX: number, clientY: number) => void) | undefined;
  /**
   * Reads a chosen image file and lays it down. Filled in `onSettled`, where the collision field
   * and camera that place it live, and called from the Image tool's panel.
   */
  let chooseReferenceImage: ((file: File) => void) | undefined;

  /**
   * The draw-lines controller, and the overlay that draws its draft into the scene.
   *
   * **A signal and a plain holder, because they have different audiences.** The overlay is a
   * scene object the frame loop updates and nothing reactive reads, so it is a `let`. The
   * controller's snapshot is read by `DrawLinesUi`, which is a component, so it is a signal —
   * filled inside `onSettled` (which is where the camera, the field and the frame exist) and
   * read by the render the same way `clickLevelWorld` is.
   */
  const [drawLines, setDrawLines] = createSignal<
    DrawLinesController | undefined
  >();
  let drawLinesOverlay: DrawLinesOverlay | undefined;
  /** The picked wall edge, drawn over the world so a delete can see what it will remove. */
  let selectionOverlay: SelectionOverlay | undefined;
  /**
   * The reference image laid on the ground, for tracing against. Editor chrome, not geometry:
   * it never becomes a level item and never folds into the world. Hidden until Phase 2 gives it
   * an image; here so its scene position (after the world, before the draft) is fixed in one
   * place. See `docs/image-plane-plan.md`.
   */
  let imagePlaneOverlay: ImagePlaneOverlay | undefined;
  /**
   * The walls item being re-drawn, if any.
   *
   * **So Finish updates a wall rather than adding a second one.** The draft is seeded from the
   * item the person asked to edit, and this is the name it is written back under — the item's
   * id, not its index, because an edit elsewhere in the list would move an index out from under
   * a queue that has not run yet.
   */
  /**
   * The item a draw is writing back over, rather than adding beside.
   *
   * **One signal for both drawing tools, not one each.** An edit is an edit: the person has
   * an item open, pressed Edit lines or Edit outline, and redrawing writes over that same
   * item. Two signals would be two teardowns in the tool-switching effect below and two
   * half-remembered states, and the only thing that tells them apart is which tool is live —
   * which that effect already knows.
   */
  const [editingDrawId, setEditingDrawId] = createSignal<string | undefined>();
  /**
   * Whether the Walls tool is picking a segment to delete rather than drawing.
   *
   * **A sub-mode of the one tool, not a tool of its own**, because deleting a wall is drawing's
   * eraser and a person reaches for it while their hand is still on the Walls tool. While it is
   * on, a press picks the nearest segment instead of placing a point, and the drawing cluster is
   * replaced by a Delete button. It is cleared whenever the drawing tools are left.
   */
  const [segmentSelect, setSegmentSelect] = createSignal(false);
  /**
   * The wall segment the last pick landed on, or `undefined` when nothing is picked.
   *
   * **The item and the edge, not the two points**, so a delete can re-derive the edge from the
   * item as it is now — an edit to the file, an undo or a reorder between the pick and the press
   * would leave stale coordinates naming a different segment.
   */
  const [pickedSegment, setPickedSegment] = createSignal<
    SegmentPick | undefined
  >();
  /**
   * The pick id for the draft's own edges, while the Walls tool is drawing a wall that is not
   * yet an item.
   *
   * **Because a first insert has lines on screen and no item to name them by.** Before Finish the
   * run being drawn lives only in the controller, so a segment pick has to be able to say "the
   * draft, edge 3" — a name no level item can collide with because ids are generated from the
   * kind and position, and this is not one of them.
   */
  const DRAFT_SEGMENT_ID = "__wall-draft__";
  /**
   * How near, in CSS pixels, the aim snaps onto a placed point.
   *
   * **Finger-sized, like `GRAB_RADIUS`.** A mouse snaps comfortably at a third of this; a
   * fingertip is fifty pixels across and cannot report its centre, so a radius sized for a
   * cursor would make a point that a finger can see and cannot land on.
   */
  const SNAP_RADIUS_PX = 28;
  /**
   * How large the drawn end-point rings are, in CSS pixels.
   *
   * **Half the snap tolerance, so a ring marks a point rather than the whole catch area.** The
   * two were the same number for a while — "what a person can hit is what they can see" — but a
   * ring the size of a fingertip reads as a target on top of every vertex, and the snap is
   * generous on purpose. The tolerance is unchanged; only the marker shrinks.
   */
  const MARKER_RADIUS_PX = SNAP_RADIUS_PX / 2;

  /** The models a place has carried, for the editor's picker. */
  const [levelModels, setLevelModels] = createSignal<readonly string[]>([]);
  const [levelCameraKind, setLevelCameraKind] =
    createSignal<CameraControlsKind>("orbit");
  const [levelEditorOpen, setLevelEditorOpen] = createSignal(false);
  /**
   * The game's own streaming window shape, which the level editor widens while it is open.
   *
   * **A signal, because `/window:` changes it while the game runs.** The editor needs a taller
   * window — its camera orbits a model rather than standing on the ground, and a flat window cuts
   * a tall building off two chunks up — but the game's walking player wants the flat one it was
   * tuned for. Keeping the game's shape here lets the editor borrow a taller one and hand this
   * back on close, and lets the console change the game's own window for a performance test.
   */
  const [gameWindow, setGameWindow] = createSignal<{
    radius: number;
    yRadius: number;
  }>({
    radius: GAME_WINDOW.radius,
    yRadius: GAME_WINDOW.yRadius,
  });
  /**
   * Whether a place is loaded, which is what there would be for a level to attach to.
   *
   * **A signal at component level, set from the place's own lifecycle** inside `onSettled`,
   * because that is where a place is loaded and unloaded. The alternative — reading the host
   * during render — cannot work: the host is built inside `onSettled` and the render is not,
   * so the overlay's props would be handed a variable that does not exist out here. The same
   * reason the app already has `setCommander` written from in there.
   */
  const [placeOpen, setPlaceOpen] = createSignal(false);
  /** The tool a touch `Apply` returns to, so `Select` can be toggled back off it. */
  let lastPlacement: ToolKind = "shape";

  /**
   * The reference image an editor session traces against.
   *
   * **At component scope, not inside `onSettled`**, because the level store is created here and
   * serializes through it (`LevelReferenceSeam`): the order is "make the state, then the store
   * that writes it". It makes signals and memos, which is exactly what component scope is for —
   * `onSettled`'s own owner forbids that, which is why the draw controller is made under
   * `runWithOwner` instead. Its `upAt` is the world's own, so a picture on the ground follows the
   * local vertical wherever it is moved (ADR 0037).
   */
  const imagePlane: ImagePlaneState = createImagePlaneState({
    upAt: (point) => WORLD.frame.upAt(point),
  });

  const levelEditor: LevelEditor = createLevelEditor(
    {
      level: () => ({ version: 1, items: [] }),
      setLevel: (plan) => applyLevel?.(plan),
      cameraKind: levelCameraKind,
      setCameraKind: setLevelCameraKind,
    },
    {
      // The level file carries the picture and its placement; an imported one is handed back
      // here. `undefined` means the file carried none, so the current one is cleared.
      get: () => imagePlane.reference(),
      set: (reference) => {
        if (reference === undefined) imagePlane.clear();
        else imagePlane.load(reference);
      },
    },
  );

  /**
   * Writes the level standing in the level editor into the place being edited.
   *
   * **One function for two doors** — the level editor's own "Add to place" button and the place
   * editor's `+ from the level editor` — because they do the same thing and a second copy is a
   * second place for them to disagree. The level is already standing in the world (the level
   * editor put it there); this makes it something the place *carries*, which is the difference
   * between it surviving a reload and being lost with the scene.
   *
   * **A refusal is printed rather than swallowed**, and publishing is not offered as a way to
   * keep it: a place carrying a level or model cannot be published (`makePlaceRecord`), so the
   * zip is the only way it travels.
   */
  const attachLevelFromEditor = (): void => {
    const refused = placeEditor.writeLevel(
      LEVEL_FILE,
      levelEditor.exportJson(),
    );
    terminal.print(
      refused ??
        `attached ${LEVEL_FILE} to ${placeEditor.project().manifest.name} — save the place as a zip to keep it`,
    );
  };

  /**
   * Opens a level the place carries in the level editor.
   *
   * **The other direction from `attachLevelFromEditor`.** The level is already in the world, so
   * this is what lets somebody take a level a script uses and change it without leaving the
   * place editor and finding the file again. A refusal is printed rather than opening an empty
   * editor over the level that would not read.
   */
  const openLevelInEditor = (name: string, text: string): void => {
    if (!levelEditor.importJson(text)) {
      terminal.print(`${name}: ${levelEditor.notice() ?? "could not be read"}`);
      return;
    }
    setEditorOpen(false);
    setLevelEditorOpen(true);
  };

  /** Toggles the touch cluster between placing and selecting. */
  const toggleSelect = (): void => {
    if (levelEditor.tool() === "select") {
      levelEditor.setTool(lastPlacement);
      return;
    }
    lastPlacement = levelEditor.tool();
    levelEditor.setTool("select");
  };

  /**
   * Turns whatever has been drawn into what the tool was for, or writes it back.
   *
   * **One branch, and it is the only one this gesture needs.** Walls and floors are the same
   * gesture — aim, commit, finish, in a plane the first press established — and they differ
   * only in what counts as finished: a wall wants chains, a floor wants one closed loop. So
   * everything before this point in `app.tsx` that asks "is a drawing happening" asks
   * `drawsInAPlane` and nothing about which; only the finish knows, because only the finish
   * knows what a finished thing is.
   *
   * **Either way one level item, and the item is what the inspector edits.** A fresh draw
   * hands its geometry over in world space; `apply-level.ts` turns each wall segment into a
   * box and a floor into one `Polygon` operation. An edit reuses the item it was seeded from,
   * so the height, thickness, combine, material and colour a person already chose survive the
   * change of shape. Either way the controller is reset, because the next thing a person does
   * is draw another one.
   */
  const finishDrawing = (): void => {
    const controller = drawLines();
    if (controller === undefined) return;
    if (levelEditor.tool() === "floor") {
      const drawn = controller.finishFloor();
      // **Nothing here re-checks the refusal.** `finishFloor` is the only thing that knows
      // what a floor is, and `DrawLinesUi` has already disabled its Finish button with the
      // reason — so a second rule in a second place is a second place to forget one.
      if (drawn === undefined) return;
      const placement = floorPlacement(drawn.outline, drawn.plane);
      const editingId = editingDrawId();
      const index =
        editingId === undefined
          ? -1
          : levelEditor.items().findIndex((item) => item.id === editingId);
      const editing = index === -1 ? undefined : levelEditor.items()[index];
      // **Narrowed to a polygon as well as to a shape**, so the outline can be written
      // without a cast: a person who pressed Edit outline on a box would otherwise have a
      // box quietly gain a `points` key, which is a payload the level reader refuses.
      if (
        editing !== undefined &&
        editing.kind === "shape" &&
        editing.shape.type === "Polygon"
      ) {
        // **The outline is replaced and everything else carried over**, for the same reason
        // the walls edit is: the person is changing the layout, not re-deciding what the
        // floor is made of. `at` and the turn move with the points, because both are
        // functions of them.
        levelEditor.updateItem(index, {
          ...editing,
          at: [placement.at.x, placement.at.y, placement.at.z],
          orientation: [
            placement.orientation.x,
            placement.orientation.y,
            placement.orientation.z,
            placement.orientation.w,
          ],
          shape: { ...editing.shape, points: placement.points },
        });
        setEditingDrawId(undefined);
      } else {
        levelEditor.addFloor({
          ...placement,
          thickness: DEFAULT_WALL_THICKNESS,
        });
      }
      controller.reset();
      // **Select once a floor is finished or updated**, so the next click edits what was just
      // made rather than starting a second draw. The teardown effect that watches
      // `drawsInAPlane` clears the draft on the way out.
      levelEditor.setTool("select");
      return;
    }

    const drawn = controller.finish();
    if (drawn === undefined) return;

    const up: [number, number, number] = [
      drawn.plane.up.x,
      drawn.plane.up.y,
      drawn.plane.up.z,
    ];
    const lines = drawn.chains.map((chain) =>
      chain.map((point): [number, number, number] => [
        point.x,
        point.y,
        point.z,
      ]),
    );

    const editingId = editingDrawId();
    const index =
      editingId === undefined
        ? -1
        : levelEditor.items().findIndex((item) => item.id === editingId);
    const editing = index === -1 ? undefined : levelEditor.items()[index];

    if (editing !== undefined && editing.kind === "walls") {
      // **The centre is recomputed from the new lines**, because the item's `at` is a function
      // of its points and an edit can move them. Everything else is carried over: the person
      // is changing the layout, not re-deciding what the wall is made of.
      const at = wallsCentre({ up, height: editing.height, lines });
      levelEditor.updateItem(index, {
        ...editing,
        up,
        lines,
        at: [at.x, at.y, at.z],
      });
      setEditingDrawId(undefined);
    } else {
      levelEditor.addWalls({
        up,
        lines,
        height: DEFAULT_WALL_HEIGHT,
        thickness: DEFAULT_WALL_THICKNESS,
        combine: levelEditor.combine(),
      });
    }
    controller.reset();
    // **Select once the walls are finished or updated**, so the next click picks what was just
    // built rather than beginning another draw.
    levelEditor.setTool("select");
  };

  /**
   * Seeds the draw controller from a wall so its lines can be edited, and switches to the tool.
   *
   * **The plane comes back from the first point and the stored `up`**, which is the whole
   * reason a walls item keeps its own vertical: a wall drawn on a planet has no world `up` to
   * re-derive from, and re-drawing it on a plane at the wrong angle would tilt every segment.
   * The lines are handed to the controller as world points, so what the person sees on the
   * canvas is the wall they picked.
   */
  const beginEditWalls = (id: string): void => {
    const controller = drawLines();
    if (controller === undefined) return;
    const item = levelEditor
      .items()
      .find(
        (candidate): candidate is LevelWalls =>
          candidate.kind === "walls" && candidate.id === id,
      );
    if (item === undefined) return;
    const first = item.lines[0]?.[0];
    if (first === undefined) return;
    controller.seed(
      planeThrough(
        { x: first[0], y: first[1], z: first[2] },
        { x: item.up[0], y: item.up[1], z: item.up[2] },
      ),
      item.lines.map((line) =>
        line.map((point) => ({ x: point[0], y: point[1], z: point[2] })),
      ),
    );
    setEditingDrawId(id);
    levelEditor.setTool("walls");
  };

  /**
   * Seeds the draw controller from a floor so its outline can be edited, and switches to the tool.
   *
   * **The plane comes back out of the item's own turn, and not from `planeThrough`.** That is
   * the whole reason `floorDrawing` exists: a fresh basis in the same plane is a different set
   * of coordinates for the same points, and `floorCentre` takes the centre from the bounding
   * box *in that basis* — so a redraw with nothing moved would slide the floor across the room
   * by however far two enclosing boxes differ. Recovering the frame from the orientation makes
   * a no-op redraw a no-op on the file, which is what a person pressing Edit and then Finish
   * without touching anything is testing for.
   */
  const beginEditOutline = (id: string): void => {
    const controller = drawLines();
    if (controller === undefined) return;
    const item = levelEditor
      .items()
      .find((candidate) => candidate.kind === "shape" && candidate.id === id);
    if (
      item === undefined ||
      item.kind !== "shape" ||
      item.shape.type !== "Polygon"
    ) {
      return;
    }
    // **A floor with no turn stored has no turn to recover**, and the identity is what the
    // rest of the editor means by an absent one (`apply-level.ts` substitutes it too), so
    // this reads the same as the fold will.
    const turn = item.orientation;
    const drawn = floorDrawing(
      item.shape.points,
      {
        x: item.at[0],
        y: item.at[1],
        z: item.at[2],
      },
      turn === undefined
        ? IDENTITY
        : {
            x: turn[0],
            y: turn[1],
            z: turn[2],
            w: turn[3],
          },
    );
    // **One chain, because a floor is one outline.** Seeding it as a chain rather than as a
    // finished floor means the closing point is absent, which is what the person sees: a
    // loop they can add a corner to rather than one that is already shut.
    controller.seed(drawn.plane, [drawn.outline]);
    setEditingDrawId(id);
    levelEditor.setTool("floor");
  };

  /**
   * Deletes the picked wall segment, shortening its line or splitting it in two.
   *
   * **Re-derived from the item as it is now**, not from the coordinates the pick was made at, so
   * an undo or a reorder between the pick and the press cannot delete a different segment. One
   * `updateItem` or `removeItem`, therefore one undo step; a two-point line whose only edge went
   * takes the line with it, and an item with no lines left is removed outright.
   *
   * **Component scope, not the game branch**, because the Delete button in `DrawLinesUi` is
   * rendered from the application root and has to reach it.
   */
  const deletePickedSegment = (): void => {
    const pick = pickedSegment();
    if (pick === undefined) return;
    // **A draft edge — a first insert or an edit — is changed in the draft.** Finish or Update
    // walls writes it out, so deleting the stored item here is what let the segment come back:
    // the draft still held it. `DRAFT_SEGMENT_ID` is the no-item-yet case, `editingDrawId` the
    // edit case.
    if (pick.itemId === DRAFT_SEGMENT_ID || editingDrawId() === pick.itemId) {
      drawLines()?.deleteSegment(pick.index);
      setPickedSegment(undefined);
      return;
    }
    const index = levelEditor
      .items()
      .findIndex((item) => item.id === pick.itemId);
    if (index === -1) return;
    const item = levelEditor.items()[index];
    if (item === undefined || item.kind !== "walls") return;
    const lines = deleteWallSegment(item.lines, pick.index);
    if (lines === undefined) return;
    setPickedSegment(undefined);
    if (lines.length === 0) {
      levelEditor.removeItem(index);
      return;
    }
    const at = wallsCentre({ up: item.up, height: item.height, lines });
    levelEditor.updateItem(index, { ...item, lines, at: [at.x, at.y, at.z] });
  };

  /**
   * The atproto account this browser is holding.
   *
   * **Built here rather than in the game branch**, so that signing in survives the scene being
   * torn down and rebuilt — a page that reloads the world should not sign a person out. It holds no
   * resource until somebody asks it to restore or sign in, which is why constructing it is free
   * even though nothing uses it until Phase 4's Publish button does.
   */
  const account = createAtproto();

  /**
   * Reading and writing published places.
   *
   * **Built once, above the game branch, and stateless until used.** The library holds no account
   * and no token — a published place is public (ADR 0044) — and the publisher takes getters rather
   * than a client so that signing in later needs no re-wiring. Both are cheap constructors; nothing
   * here touches the network until a command runs.
   */
  const placeLibrary = createPlaceLibrary();
  const placePublisher = createPlacePublisher({
    getClient: () => account.repoClient(),
    getRepo: () => account.account()?.did ?? null,
  });

  /**
   * Publishes whatever the editor is holding.
   *
   * **At application scope rather than in the game branch**, because it needs neither the world nor
   * the running place: a project, the signed-in account, and the publisher. That is also what lets
   * the editor's own Publish button and `/place:publish` be the same function rather than two
   * copies of the same three lines — and a refusal is a line rather than a throw, since the console
   * prints whatever comes back under the command's echo.
   */
  const publishEditedPlace = async (): Promise<string> => {
    try {
      const project = placeEditor.project();
      const address = await placePublisher.publish(project);
      return `published ${project.manifest.name} at ${address}`;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

  /**
   * The account, as the console's commands take it.
   *
   * **`describe()` after acting, rather than a sentence written here.** `Atproto.signIn` reports a
   * failure by setting its state rather than by throwing, precisely so the state is the one place
   * that knows — so asking it for the line is what keeps one wording for "signed in as", "signing
   * in as", and "not signed in — …".
   */
  const accountConsole: AccountCommands = {
    login: async (handle) => {
      await account.signIn(handle);
      return account.describe();
    },
    logout: async () => {
      await account.signOut();
      return "signed out";
    },
    describe: () => account.describe(),
  };

  /**
   * Whatever the editor's panel renders, which is nothing until its chunk lands.
   *
   * **A dynamic import rather than a static one**, so CodeMirror and its language worker are not
   * in the first frame of a session that never opens the editor. Until it resolves the editor is a
   * line of prose, which is a degraded editor rather than a broken one — see `PlaceEditorPanes`
   * for the other half of that, which is that authoring needs a network at all.
   */
  // **Null rather than a placeholder component as the initial value**, because a bare function
  // given to `createSignal` is read as a compute and this is a value — the same subtlety the
  // editor's own state has to work around.
  const [placeEditorPanel, setPlaceEditorPanel] =
    createSignal<EditorPanel | null>(null);

  void import("./places/editor/PlaceEditor").then((module) =>
    setPlaceEditorPanel(() => module.PlaceEditor),
  );

  /**
   * A draft a reload found, adopted into the editor.
   *
   * **Once, on the first frame that has a console to adopt it into**, and a refusal is silent
   * because there is nothing to refuse — a person with no draft and a person whose draft could not
   * be read are in the same position, which is the same rule `drafts.ts` states about a read
   * failure.
   */
  void readDraft().then((draft) => {
    if (draft !== null) placeEditor.adopt(draft);
  });

  // A memo rather than a `<Show>` with a narrowed child, because `<Show>` calls its children
  // function with tracking switched off. Reading the narrowed accessor *in the return
  // position* reads the signal untracked: a dev-mode STRICT_READ_UNTRACKED warning, and a row
  // that would silently never update if the probe landed after the first render.
  const precisionText = createMemo(() => {
    const measured = precision();
    return measured === undefined
      ? "not probed yet"
      : describePrecision(measured);
  });

  // Solid 2 replaced `onMount` with `onSettled`, which fires once after the current
  // activity settles. It does *not* return a disposal — the callback returns the teardown,
  // and `onCleanup` inside one is a dev-mode error that halts the reactive system. So the
  // two halves of the lifecycle live in one block, and the block's last statement is its
  // own undo.
  onSettled(() => {
    const measured = detectFragmentPrecision();
    setPrecision(measured);
    if (!measured.ok)
      console.warn("fragment precision probe:", measured.reason);

    // ---- Phase 0 spike ----
    if (spike()) {
      const scene = buildSpikeScene(canvas, measured);
      setSpikeCounts(scene.counts);
      const detach = scene.orbit.attach(canvas);
      scene.orbit.apply();

      scene.viewport.renderer.setAnimationLoop(() => {
        scene.orbit.apply();
        scene.viewport.render();
      });

      return () => {
        detach();
        scene.dispose();
      };
    }

    // ---- The shared streamed scene ----
    const viewport: Viewport = createViewport(canvas, {
      ...(measured.ok ? { precision: measured.precision } : {}),
    });
    viewport.setBackground(new Color(0.07, 0.07, 0.09));

    // The sky, added before anything else in the scene. rmsl has no render-order
    // key — draw order is scene traversal order — and the dome neither tests nor
    // writes depth, so it has to be first for the terrain, water and clouds to land on
    // top of it. Only the game gets one: the editor's near-black is deliberate, for
    // reading a model's silhouette against.
    //
    // **Handed this world's sea level and shape rather than left to find them**, because the
    // altitude the sky computes from them decides whether there is air overhead at all.
    const sky = isGame()
      ? createSky(viewport.scene, {
          seaLevel: WORLD.seaLevel,
          spherical: WORLD.frame.spherical,
        })
      : null;

    const material = new SurfaceMaterial();

    /**
     * The figures a place has put in the world, and the ones it has not yet.
     *
     * **Built here rather than in the place section below, because `Game` needs it** and `Game`
     * is built before the place exists — the same problem `mediumAt` has, solved the same way:
     * the reader below reaches into this rather than holding a snapshot.
     *
     * **Always present rather than sometimes**, because the frame loop asks it every frame what
     * the crosshair is on, and a null check there is a branch on a hot path for a state that is
     * the empty set. It is built over the terrain's own material, so an ordinary figure is lit
     * by the same shader, sky, fog and point lights as the ground it stands on.
     */
    const figures = new FigureSet(material, FIGURE_TINT.material);
    const previewMaterial = new MeshBasicMaterial({
      color: new Color(1, 0.85, 0.4),
    });

    const chosen = bands();
    // The game starts on bare terrain. The editor's starter primitives sit
    // around the origin, and a body spawned into a ninety-unit sphere is a body
    // spawned inside the ground.
    const initialOperations = isGame() ? [] : starterOperations();
    const session = new Session({
      scene: viewport.scene,
      material,
      operations: initialOperations,
      baseField: WORLD.baseField,
      // **Only the game draws a sea.** The editor shares this session and orbits a model
      // with no water in it, and meshing water for it would be a second sampling pass over
      // every chunk to produce geometry nothing draws.
      ...(isGame() ? { seaMaterial: GAME_WATER.material } : {}),
      // A wider and flatter window than the editor's — see `GAME_WINDOW`, which the
      // fog's own test reads so that these two cannot drift apart.
      ...(isGame() ? GAME_WINDOW : {}),
      ...(chosen !== undefined ? { bands: chosen } : {}),
    });

    const sculpt = new SculptSession({
      session,
      camera: viewport.camera,
      operations: session.operations,
      baseField: session.baseField,
    });

    /**
     * Reshapes the streaming window to what the current mode wants.
     *
     * **The editor gets a spherical window and the game keeps its flat one.** The walking player
     * wants ground ahead and a little above, which is what `GAME_WINDOW` is tuned for; the editor
     * orbits a model and wants to see the top of a tower, so its Y reaches as far as its X and Z.
     * Called on every open and every close, and by `/window:` while the game runs — a rebuild of
     * the window, which is a visible re-mesh but only when somebody asks for one.
     */
    const applyWindow = (): void => {
      const base = gameWindow();
      session.reshapeWindow(
        base.radius,
        levelEditorOpen() ? base.radius : base.yRadius,
      );
    };

    // ---- The editor: orbit and sculpt by pointer ----
    if (edit()) {
      const orbit = new OrbitController(viewport.camera, { radius: 900 });
      const preview = new Mesh(
        new SphereGeometry(DEFAULT_BRUSH.radius, 24, 16),
        previewMaterial,
      );
      preview.visible = false;
      viewport.scene.add(preview);

      const follow = (): void => {
        session.follow(orbit.state.target);
        const where = sculpt.preview;
        preview.visible = where.visible;
        if (where.visible) {
          preview.position.set(
            where.position.x,
            where.position.y,
            where.position.z,
          );
        }
        preview.scale.setScalar(sculpt.settings.radius / DEFAULT_BRUSH.radius);
      };
      const streamStroke = (): void => sculpt.flushPreview();

      const pointerOptions = () => ({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      });
      const down = new Set<number>();
      let sculptPointer: number | undefined;

      const onPointerDown = (event: PointerEvent): void => {
        if (event.button !== 0 || event.shiftKey) return;
        down.add(event.pointerId);
        sculptPointer ??= event.pointerId;
        sculpt.tool.pointerDown(
          event,
          pointerOptions().width,
          pointerOptions().height,
        );
        sculpt.tool.setSuspended(down.size > 1);
        orbit.setToolOwnsLeft(true);
      };
      const onPointerMove = (event: PointerEvent): void => {
        sculpt.tool.pointerMove(
          event,
          pointerOptions().width,
          pointerOptions().height,
        );
      };
      const release = (pointerId: number, abandon: boolean): void => {
        down.delete(pointerId);
        if (pointerId !== sculptPointer) {
          sculpt.tool.setSuspended(down.size > 1);
          return;
        }
        sculptPointer = undefined;
        sculpt.tool.setSuspended(false);
        if (abandon) sculpt.tool.pointerLeave();
        else sculpt.tool.pointerUp();
        orbit.setToolOwnsLeft(false);
        setHistory({ undo: sculpt.undoDepth, redo: sculpt.redoDepth });
      };
      const onPointerUp = (event: PointerEvent): void =>
        release(event.pointerId, false);
      const onPointerCancel = (event: PointerEvent): void =>
        release(event.pointerId, true);
      const onPointerLeave = (event: PointerEvent): void => {
        if (!down.has(event.pointerId)) return;
        release(event.pointerId, true);
      };
      const onKeyDown = (event: KeyboardEvent): void => {
        if (!event.ctrlKey && !event.metaKey) return;
        const shift = event.shiftKey;
        if (event.key === "z" && !shift) sculpt.tool.undo();
        else if ((event.key === "z" && shift) || event.key === "y")
          sculpt.tool.redo();
        else return;
        event.preventDefault();
        setHistory({ undo: sculpt.undoDepth, redo: sculpt.redoDepth });
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerCancel);
      canvas.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("keydown", onKeyDown);

      const detachOrbit = orbit.attach(canvas);
      orbit.apply();

      let lastReadout = 0;
      viewport.renderer.setAnimationLoop((time: number) => {
        orbit.apply();
        follow();
        streamStroke();
        viewport.render();

        if (time - lastReadout > READOUT_INTERVAL_MS) {
          lastReadout = time;
          setStats(session.stats());
        }
      });

      return () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerCancel);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("keydown", onKeyDown);
        detachOrbit();
        preview.geometry.dispose();
        session.dispose();
        viewport.dispose();
      };
    }

    // ---- The game: a first-person player over the terrain ----
    // A sky colour rather than the editor's near-black, so water and cloud meet
    // the horizon rather than a void. The day-night cycle writes over it every
    // frame; this is only what the very first one is drawn with.
    const skyColour = new Color(0.53, 0.81, 0.92);
    viewport.setBackground(skyColour);
    const game = new Game({
      session,
      sculpt,
      viewport,
      input,
      seaRadius: WORLD.seaLevel,
      // Where the sea is, as it is meshed rather than as the sea level alone would say.
      waterAt: inSea,
      frame: WORLD.frame,
      // The spawn probe has to start inside the planet. The sea radius is within a few units of
      // the surface everywhere, so it is a good enough probe and needs no number of its own.
      spawnRadius: WORLD.seaLevel - SPAWN_PROBE_DEPTH,
      // **Reaches into the place host, which does not exist yet.** Declared above this line and
      // assigned inside the settled effect, so at this moment it is `undefined` and the physics
      // reads that as "this world has no fields" — the honest answer, and cheaper than a reader
      // that always returns null. See `GameOptions.mediumAt`.
      mediumAt: (p) => placeMedium()?.(p.x, p.y, p.z),
      // **The other half of the same shape, and the same reason.** A figure is not in the fold
      // — it is its own mesh (ADR 0047) — so the only way the player collides with one is if
      // the world asks the figures as well as the field, and it does it with one `min`, which is
      // what lets the player stand on a figure rather than through it.
      figureDistanceAt: (p) => figures.solidDistanceAt(p),
      /**
       * What a press of use means, which is the whole of this application's interaction with
       * anything a place has put in the world.
       *
       * **A callback rather than an action `Game` performs**, because everything a use needs is
       * owned by somebody else: the ray is the camera's, the figures are a place's, and the held
       * item is the place's own bookkeeping. `Game` knows *when* — after the camera has settled
       * for the frame — and nothing about what it is for.
       */
      onUse: (input) => {
        if (!input.use || host === undefined) return;
        const camera = viewport.camera;
        const forward = camera.getWorldDirection(TMP_FORWARD);
        // **The eye, not the body.** `player.position` is the cube's centre, so tracing from
        // it with the camera's forward put the pick ray `eyeHeight` below the drawn crosshair
        // and made a player aim above a prop to use it. The eye is the point the crosshair
        // radiates from, it is above the player rather than behind them, and the direction is
        // still the camera's — the same ray, just starting where the crosshair does.
        const aimed = figures.pick(playerEye(game.player), {
          x: forward.x,
          y: forward.y,
          z: forward.z,
        });

        const held = host.heldItem;
        if (aimed !== undefined) host.use(aimed.figure.id, held);
        else host.useItem(held);
      },
    });
    // The clouds, built once their field has been baked — on a worker, because the bake
    // is two and a half seconds of arithmetic and the only reason to move it is that it
    // was happening on the thread that draws. The layer is null until the field lands,
    // and the frame loop's optional call is the whole of the handling: the first second
    // or so has a sky, a terrain and a sea, and no weather yet.
    // **The globe's maps, baked beside the clouds' field and for the same reason.**
    //
    // Roughly five seconds of noise for 3072×1536 — extrapolated from the measured 564ms for
    // 1024×512 in `planet-maps.test.ts` — on a machine that is a phone. The frame loop is already
    // running, so this cannot happen on the main thread without the player watching the world stop.
    // The client falls back to the main thread if a worker cannot be had, because a hitch is a much
    // smaller problem than a planet that never arrives, and it says which of the two happened so the
    // HUD can report it.
    let globe: Globe | null = null;
    let layer: CloudLayer | null = null;
    /**
     * The bakes currently in flight, so teardown can terminate their workers.
     *
     * **Held beside the meshes rather than captured in each callback**, because a worker that is
     * never joined is a thread that lives for the life of the tab (`cloud-bake-client.ts:16`) and
     * because a shape switch starts a second one — a list is what lets the teardown stop all of
     * them without knowing how many there have been.
     */
    const cloudBakes: { dispose(): void }[] = [];

    /**
     * Bumped whenever the far field is replaced, so a bake that was started for a world that has
     * gone does not install itself into the next one.
     *
     * **A generation rather than a boolean, because the far field is now built more than once.**
     * A `disposed` flag can say "do not install" but cannot say "install again", so a world that
     * switched to flat and back would have a sky with no clouds and a header that could not
     * explain it. Two flags that can only be set — which is what the old code had, because the
     * far field was built exactly once — become one number that means "which attempt is current".
     */
    let farField = 0;

    /**
     * Starts the globe's and the clouds' bakes, for a spherical world.
     *
     * **Neither exists on a flat one, and neither is started.** The globe is a displaced sphere
     * at a radius, and a height field has no silhouette to displace; the clouds' shell is solved
     * against two concentric spheres, which a plane does not have. Skipping the bake is not an
     * optimisation — on a flat world it is roughly five seconds of noise for a map of a planet
     * that is not there, which is the single largest piece of work this file would otherwise ask
     * a phone to do for nothing.
     */
    const startGlobe = (): void => {
      const attempt = ++farField;

      const planetMaps = bakePlanetMapsOffThread(
        DEFAULT_PLANET,
        GLOBE_MAP_WIDTH,
        GLOBE_MAP_HEIGHT,
      );
      void planetMaps.maps.then(
        (maps) => {
          // Between the bake starting and this running, the world can have been torn down or
          // changed shape — and a mesh added to a scene it no longer belongs to is a leak with
          // no owner.
          if (attempt !== farField) return;
          try {
            globe = createGlobe(viewport.scene, maps);
            setPlanetBake({
              state: "ready",
              maps:
                planetMaps.source() === "main thread"
                  ? "main thread"
                  : "worker",
              width: maps.width,
            });
          } catch (reason) {
            console.warn("the globe could not be built:", reason);
            setPlanetBake({
              state: "failed",
              reason: reason instanceof Error ? reason.message : String(reason),
            });
          }
        },
        (reason: unknown) => {
          if (attempt !== farField) return;
          setPlanetBake({
            state: "failed",
            reason: reason instanceof Error ? reason.message : String(reason),
          });
        },
      );
    };

    /**
     * Starts the cloud layer's bake, on either world.
     *
     * **Separate from the globe because the two do not belong to the same world.** A flat
     * world has no silhouette and so has no globe, but it has weather: the deck's span solve
     * and its volume address are two more solves and two more addresses rather than anything
     * harder, and a sky with no clouds in it is a worse flat world than a planet with clouds.
     * Putting them together would have made "a flat world has no far field" true, and it is
     * not.
     */
    const startClouds = (): void => {
      const attempt = ++farField;

      const cloudBake = bakeCloudFieldOffThread(DEFAULT_TERRAIN.seed);
      cloudBakes.push(cloudBake);
      void cloudBake.field.then(
        (field) => {
          if (attempt !== farField) return;
          try {
            layer = createCloudLayer(
              viewport.scene,
              DEFAULT_TERRAIN.seed,
              field,
              WORLD.seaLevel,
              WORLD.deck,
            );
            setCloudStatus({
              state: "ready",
              field:
                cloudBake.source() === "main thread" ? "main thread" : "worker",
            });
            /**
             * **The remembered technique, applied once the layer exists.** Reading it before the
             * bake would race the layer's own construction, so it is read here where `layer` is
             * guaranteed, and checked against the two names before it is trusted — a value from a
             * build whose vocabulary has since changed must not reach `setQuality`.
             */
            void readSetting<string>(CLOUD_QUALITY_KEY).then((remembered) => {
              if (attempt !== farField) return;
              if (remembered === "high" || remembered === "low") {
                layer?.setQuality(remembered);
              }
            });
          } catch (reason) {
            // A material that throws on its first draw is the same fault as no layer at
            // all, and it used to be invisible: the promise's callback threw, the
            // rejection went to a handler nobody had, and the sky was empty with nothing
            // in the header to say why.
            console.warn("cloud layer could not be built:", reason);
            setCloudStatus({
              state: "failed",
              reason: reason instanceof Error ? reason.message : String(reason),
            });
          }
        },
        (reason: unknown) => {
          if (attempt !== farField) return;
          setCloudStatus({
            state: "failed",
            reason: reason instanceof Error ? reason.message : String(reason),
          });
        },
      );
    };

    /**
     * Takes the far field away: the globe's meshes and the cloud layer's.
     *
     * **The generation moves first, so a bake already in flight cannot install itself after
     * this.** Doing it the other way round leaves a window in which the promise's callback runs
     * against a world that has just declared itself flat and adds a sphere back to it.
     */
    const dropFarField = (): void => {
      farField++;
      globe?.dispose();
      globe = null;
      layer?.dispose();
      layer = null;
    };

    // **The globe only where there is a silhouette to displace**, and the clouds everywhere.
    if (WORLD.frame.spherical) startGlobe();
    startClouds();

    /**
     * Puts a different world under this session, without reloading the page.
     *
     * **One function, in a fixed order, because a shape change touches every layer and the order
     * is what makes it safe.** The module-scope readers go first so that anything reached from
     * them — `inSea`, the frame loop's material writes — answers about the new world rather than
     * the old one; then the streaming side, which invalidates every chunk it is holding; then the
     * physics, which re-bases the player; then the far field, which exists on one of the two
     * worlds and not the other.
     *
     * **A refusal rather than a no-op when asked for the world it is already running.** "Nothing
     * happened" is the least useful thing a console can print, and a caller who asked for a
     * shape deserves to be told the state is already what they asked for rather than being left
     * to infer it from the silence.
     *
     * **The far field is rebuilt rather than merely hidden**, because a bake is not reversible:
     * there is no way to stop one five seconds of noise into the future and keep the work. So a
     * switch to flat drops the globe and the clouds outright and reports them as absent, and a
     * switch back starts them again — which is why `farField` is a generation rather than the
     * pair of flags this used to need, and why a switch is visibly slow the first time each way.
     */
    const setWorldShape = (shape: WorldShape): string => {
      if (shape === WORLD.shape) {
        return `the world is already ${describeWorldShape(shape)}`;
      }
      const next = worldGeometry(shape);

      // **The readers first.** `inSea` and the frame loop's per-frame writes both read these
      // names, and a chunk that landed between the switch and the first re-mesh would otherwise
      // be shaded by one world's rules and gated by the other's.
      WORLD = next;
      GAME_GROUND = next.ground;
      GAME_WATER = { material: waterMaterialFor(shape) };

      // **Then the streaming side.** The sea's material is pointed first, because
      // `setBaseField` re-asks for every chunk and a chunk meshed before the material moved
      // would be a chunk shaded by the world's it has just left.
      session.setSeaMaterial(GAME_WATER.material);
      // **The main thread's field before the workers'**, so the player's collision and the
      // mesher are never reading two different landscapes — which is ADR 0009's rule, and the
      // gap between the two lines is a frame.
      sculpt.setBaseField(next.baseField);
      session.setBaseField(next.baseField);

      // **Then the physics.** `setWorld` re-derives the player's basis from the new frame, which
      // a body carried across could not do.
      game.setWorld(
        { frame: next.frame, seaRadius: next.seaLevel },
        next.seaLevel - SPAWN_PROBE_DEPTH,
      );

      dropFarField();
      if (next.frame.spherical) {
        startGlobe();
      } else {
        setPlanetBake({ state: "not on this world" });
      }
      startClouds();

      // **The sky and the fogs last**, because they are the only things that read the sea
      // level rather than asking for it, and they should not report an altitude for a world
      // that has not finished becoming one. The fog goes with the sky because it is one
      // material per surface and the same two numbers — a world whose air is a slab while its
      // sky measures it against a shell is worse than either being wrong on its own.
      const shell = {
        seaLevel: next.seaLevel,
        spherical: next.frame.spherical,
      };
      sky?.setWorld(shell);
      material.fog.setWorld(shell);
      GAME_WATER.material.fog.setWorld(shell);
      FIGURE_TINT.material.fog.setWorld(shell);

      return `the world is now ${describeWorldShape(shape)}; ${session.stats().chunks} chunks re-meshing`;
    };

    const detachInput = input.attach(canvas);
    const stopLock = input.onPointerLockChange(setLocked);
    const stopSuspension = input.onPointerLockSuspensionChange(setSuspended);
    // The clock, which `/clock:` drives. It holds three numbers and no reference to
    // anything that draws, so `app.tsx` is where the two meet: the state comes out of
    // `tick` below and the five materials take it here.
    const clock = new DayNightController();
    // ---- A place ----
    //
    // `host` is null until one is loaded, and everything below asks rather than assumes:
    // the frame loop has no place to step and the console has nothing to report, which is the
    // state the application spends its whole life in before anyone types `/place:load`.
    const zoneLines: ZoneLines = createZoneLines(viewport.scene);
    // **Added after the session and after the zone lines**, because rmsl has no render-order
    // key — draw order is scene traversal order (ADR 0014). A figure drawn behind the terrain
    // is a figure that only shows through the gaps, which is the same argument `zones.ts`
    // makes about its own wireframes.
    figures.attach(viewport.scene);
    /** The loaded place's problems, newest last, for `/place:notices`. */
    const notices: string[] = [];
    /** What is loaded — a demo's id, or a zip's own name — for `/place:state`. */
    let loadedName: string | undefined;
    let host: PlaceHost | undefined;

    /**
     * The loaded place's models, meshed once each.
     *
     * **Held beside the host rather than inside it, because it owns GPU buffers and the host
     * owns no renderer.** A place's geometry is operations in a registry the session already
     * owns, so dropping a place is dropping a name from a map; a model is a `BufferGeometry`
     * that has to be disposed, and the only thing that can dispose it is the one that made it.
     * `dropPlace` takes it away for the same reason it takes away `zoneLines`.
     */
    let modelLibrary: ModelLibrary | undefined;

    const notice = (message: string): void => {
      notices.push(message);
      setPlaceBanner(message);
    };

    /**
     * Prints a line into the console scrollback from outside a command.
     *
     * **A place's `log`, which has no command to arrive through.** The console's history is
     * closed over `onCommand`, and a place logging is not a command — so this appends an entry
     * directly rather than pretending to be one. Without it a place's only output is whatever
     * `/place:notices` remembers, which is its *problems*, not its messages.
     */
    const runConsoleLine = (text: string): void => {
      terminal.print(text);
    };

    /**
     * Opens a place zip the person picks, and loads it.
     *
     * **A promise that always settles, including on dismissal.** The console prints `…` and
     * replaces the line when the promise resolves, so a picker the person cancelled without ever
     * choosing a file would leave that `…` on screen for the rest of the session — which is the
     * one failure the pending line in ADR 0020 was built to make impossible. `cancel` is the
     * browser's own signal for a dismissed picker, and it is the only one that fires in that case.
     */
    const openFromDisk = (): Promise<string> =>
      new Promise<string>((resolve) => {
        const picker = placePicker();
        if (picker === undefined) {
          resolve("this build has no place picker — use /place:list");
          return;
        }

        // **Reset first, so opening the same file twice in a row still fires
        // `change`.** A file input holding a value does not report the same file again, and
        // "open the place I just fixed" is the single most likely thing a person does twice.
        picker.value = "";
        picker.addEventListener(
          "change",
          () => {
            const file = picker.files?.[0];
            if (file === undefined) {
              resolve("no file chosen");
              return;
            }
            void loadFromDisk(file).then(resolve);
          },
          { once: true },
        );
        // **`addEventListener` rather than an `onclick`-style property,** because a Solid ref is
        // the raw element and this code runs outside any reactive scope — an attribute it will
        // never see change.
        picker.addEventListener("cancel", () => resolve("no file chosen"), {
          once: true,
        });
        picker.click();
      });

    /** Reads one file and runs it, reporting the manifest's refusal or the load's own. */
    const loadFromDisk = async (file: File): Promise<string> => {
      // **Imported here rather than at the top of the module.** `jszip` is a hundred kilobytes
      // and nothing on the first frame needs it, so a place file costs a place file and not
      // everybody's first paint.
      const { readPlaceZip } = await import("./places/load-place");

      let place: LoadedPlace;
      try {
        place = await readPlaceZip(file);
      } catch (error) {
        // **The whole reason, from the format's own gate.** A refused zip has said precisely
        // what is wrong with it, and summarising that here would throw away the only sentence a
        // person can act on.
        return error instanceof Error ? error.message : String(error);
      }

      // **Adopted into the editor as well as run.** A place somebody opened off disk is one they
      // will want to change and send back, and `/place:open` is the only way a place arrives that
      // was not typed in this editor — so without this it would be the one place Save cannot save.
      const refused = placeEditor.adopt(projectFromZip(place));
      if (refused !== null) return refused;

      const report = await startPlace({
        files: place.files,
        entry: place.entry,
        seed: place.manifest.seed,
        name: place.manifest.name,
        spawn: place.manifest.spawn,
        // **The bytes the loader already carried.** Phase 1 put `models` in the manifest and
        // the loader read them, and the one thing it did not do was hand them to anything —
        // which made a whole field of the format decorative. This is where it stops being that.
        models: place.models,
        // **And the levels the loader already carried**, for the same reason: the field was in
        // the format and nothing read it, which is what made it decorative.
        levels: place.levels,
        // **And the world, which is the manifest's own statement about what the ground is.**
        world: place.manifest.world,
      });
      return report.startsWith("could not load")
        ? report
        : `opened ${place.manifest.name}\n${report}`;
    };

    // **Published to the editor's header.** One implementation for the console's `/place:open`
    // and the editor's "open" button, so a place opened either way is adopted and run the same.
    openPlaceOnDisk = openFromDisk;

    const dropPlace = (): void => {
      host?.dispose();
      host = undefined;
      placeHost = undefined;
      setPlaceOpen(false);
      figures.clear();
      figures.aim(undefined);
      // **The overlay with everything else**, for the same reason: a question left on screen with
      // nothing left to answer it, and an ending for a place that has gone.
      setPlaceDialog(undefined);
      setPlaceEnding(undefined);
      setNarration(undefined);
      modelLibrary?.dispose();
      modelLibrary = undefined;
      loadedName = undefined;
      // **Taken away with the place, not left behind.** A reader closing over a disposed host would
      // answer from an empty collection — which is right by luck — and keep the whole host
      // reachable from the frame loop for as long as the application lives.
      setPlaceMedium(undefined);
      notices.length = 0;
      setPlaceBanner(undefined);
      setPlaceToast(undefined);
      zoneLines.update([]);
      sculpt.places.clearAll();
      sculpt.refreshPlaces();
    };

    /**
     * The height of the world's surface above `(x, z)`, for a place that means to build on it.
     *
     * **A height field answers this itself and a planet is traced**, which is why this is a
     * function rather than `sculpt.terrainHeight` passed through: that returns `undefined` on a
     * sphere and the host falls back to zero, so every shipped place — authored against
     * `getHeightAt(0, 0)` — built at the planet's core, a hundred and thirty-five thousand units
     * inside the ground. `world/surface-height.ts` owns the trace and its test; this binds it to
     * this world's own field and sea.
     */
    const groundHeightAt = (x: number, z: number): number =>
      surfaceHeightAt(x, z, {
        seaRadius: WORLD.seaLevel,
        heightAt: sculpt.terrainHeight,
        solidAt: (sx, sy, sz) => game.world.getSolidAt({ x: sx, y: sy, z: sz }),
      });

    /**
     * Builds a host over a place's files and runs it, reporting what happened.
     *
     * **One path for every source.** A place in the tree and a place out of a zip are the same
     * `{ files, entry }` by the time they get here, and the point of `load-place.ts` is that
     * they are — so `/place:load bridge` and `/place:open` differ only in where the files came
     * from and which seed the world is built under. Two code paths would mean two places where a
     * geometry change stops reaching the mesh.
     *
     * **An options object, and this is the case its own note predicted.** The note under the
     * seventh positional parameter said an options object would be "a bigger change to every
     * call site than adding one more parameter" — which was true while the parameters were
     * being added and is false the moment one of them is a *choice*. Seven positions of which
     * the fifth, sixth, seventh and eighth are all optional is a function where two arguments
     * apart mean the same thing, and a call site that gets them in the wrong order compiles
     * perfectly.
     */
    const startPlace = async (place: StartPlace): Promise<string> => {
      const { files, entry, seed, name } = place;
      const { spawn, models, levels, world } = place;
      // **Dropped before the new one is built, not after.** Two places at once would both
      // write into one registry, and the operation indices from the first would be spent under
      // the second's fold order.
      dropPlace();

      // **Remembered, so the ending's "play again" can mean something.** This is the same
      // argument `startPlace` takes, passed straight through — so restarting is calling this
      // function again with the values it was called with, and there is no second code path for
      // it to disagree with the first. Set before anything can fail, so a place that fails to
      // load is still restartable into the same failure rather than into nothing.
      loadedForRestart = {
        files,
        entry,
        seed,
        name,
        spawn,
        models,
        levels,
        world,
      };

      // **The world is put in place before anything is built on it**, and before the models are
      // read rather than after, because everything below this line reads the ground: the
      // host's `terrainHeight`, the physics's collision field, the mesher's water gate. A place
      // that arrives naming a world and is run on the other one would build against a surface
      // that is not there, and `getHeightAt(0, 0)` would hand it the wrong answer — which on a
      // sphere means the origin rather than a height.
      //
      // **Before the drop rather than after**, so a place that fails to switch cannot leave the
      // previous one half standing.
      if (world !== undefined) setWorldShape(world);

      // **The models, read and meshed before the host exists**, so a place that names a model
      // it does not attach finds out at load rather than at the moment it stands the first
      // prop. A model that will not read is a notice and not a failure: one unreadable file
      // among forty should not decide whether the place runs.
      if (models !== undefined && Object.keys(models).length > 0) {
        modelLibrary = await ModelLibrary.from(models);
        for (const problem of modelLibrary.problems) {
          notice(`model "${problem.name}": ${problem.reason}`);
        }
      }

      // **The level editor's model picker follows whatever place just loaded**, so a model
      // attached in the place editor is choosable for a prop or an NPC without a reload. Empty
      // when the place carries none, so the previous place's models do not linger in the list.
      // The library itself is read lazily by the level applier (`models.get` below), so this is
      // only the names the picker draws from.
      setLevelModels(modelLibrary?.names() ?? []);

      // **Annotated, because the initializer now mentions `next`.** `mediumAt` below closes over
      // `next.mediumAt` so that a script's top-level code can ask what field it is standing in,
      // and without the annotation TypeScript cannot infer a value from an initializer that
      // refers to the value — it gives up and says `any`, which then loses every narrowing the
      // rest of this function depends on.
      const next: PlaceHost = new PlaceHost({
        files,
        entry,
        // **The levels the place carries, read into the world and compiled into the guest library
        // before the script runs.** Without this the host bundles with no levels, and a script
        // that asks for one with `level(name)` throws "this place carries no level" — which is
        // what attaching a level in the editor and then dropping it here looked like.
        levels,
        seed,
        now: () => clock.nowMs(),
        world: {
          places: sculpt.places,
          // **The figures and the models they are placed from, handed in rather than built
          // here.** The host writes into a `FigureSet` the session already put in the scene, for
          // the reason `places` is handed in: the fold indices come from the session's own
          // counter and a figure set built anywhere else is one the renderer never draws. The
          // model reader is the same seam — a host can be stood up in a test with two fixtures
          // and never touch a zip.
          figures,
          models: modelLibrary,
          terrainHeight: groundHeightAt,
          solidAt: (x, y, z) => game.world.getSolidAt({ x, y, z }),
          waterAt: (x, y, z) => inSea({ x, y, z }),
          // **The same answer the physics gets**, by the same method, so a place asking "what am
          // I standing in" and a player standing in it cannot get different replies. Assigned
          // before `load()` runs, because a script's top-level code is allowed to ask.
          mediumAt: (x, y, z) => next.mediumAt(x, y, z),
          raycast: (origin, direction, maxDistance) =>
            game.raycast(origin, direction, maxDistance),
          // The seam that makes a place visible: without it a shape a script made would be
          // in the collision field and in no mesh.
          geometryChanged: (bounds) => sculpt.refreshPlaces(bounds),
        },
        effects: {
          log: (text) => runConsoleLine(text),
          toast: (text) => setPlaceToast(text),
          narrate: (who, text) => setNarration({ who, text }),
          dialog: (dialog) => {
            setPlaceDialog(dialog);
            // **A line under a dialog is a line nobody is reading**, so opening one takes the
            // narration away rather than leaving it under the panel until the dialog closes.
            setNarration(undefined);
          },
          closeDialog: () => setPlaceDialog(undefined),
          ending: (ending) => {
            setPlaceEnding(ending);
            setPlaceDialog(undefined);
            setNarration(undefined);
          },
          movePlayer: (at, yaw) => game.teleportPlayer(at, yaw),
          setPlayerSpeed: (multiplier) => game.setPlayerSpeed(multiplier),
          setPlayerJump: (multiplier) => game.setPlayerJump(multiplier),
          setFlying: (on) => game.setFlying(on),
          lookAt: (at, fov) => game.lookAt(at, fov),
          clearCamera: () => game.clearCameraLook(),
        },
        clock,
        onNotice: notice,
      });

      try {
        await next.load();
      } catch (error) {
        next.dispose();
        // A place that will not bundle is the one failure a person can fix, so the whole
        // reason comes back rather than a summary of it.
        return `could not load "${name}": ${error instanceof Error ? error.message : String(error)}`;
      }

      host = next;
      setPlaceOpen(true);
      placeHost = next;
      loadedName = name;
      // **The physics can now feel this place.** One assignment, and every frame's collision run
      // asks the host directly rather than being handed a snapshot that could be a frame old.
      //
      // **Wrapped in an arrow because a Solid setter treats a bare function as an updater.** Given
      // `next.mediumAt` directly, the setter would call it with one argument — `prev` — and read
      // the result as the new value, so the signal would hold whatever a three-argument query
      // returned when called with a single `undefined`. Wrapping it says "the new value is a
      // function" rather than "the new value is what this function returns", which is the
      // difference between a working conveyor and a signal holding `undefined` forever.
      setPlaceMedium(() => next.mediumAt);
      zoneLines.update(host.zoneList);

      // **A place's own spawn, honoured or there is no point in the field.** The manifest
      // carries it and the reference uses it, so reading it here is what makes `spawn` a promise
      // the format keeps rather than one it makes.
      if (spawn !== undefined) {
        game.teleportPlayer({ x: spawn[0], y: spawn[1], z: spawn[2] });
      }

      // **The load's own problems, not "loaded".** A place that built half of itself reports
      // as a success, and "loaded" on a world with a missing bridge is the least useful thing
      // a console can say.
      const summary = describePlace(name, host);
      return notices.length === 0
        ? summary
        : `${summary}\n— with ${notices.length} problem(s):\n${notices.map((line) => `  ${line}`).join("\n")}`;
    };

    // **Published for the overlay's "play again".** The button is rendered from the application
    // root, outside this branch, and reads the holder declared beside `placeHost`. Assigning
    // here closes the loop; without it the holder stays `undefined` and the button no-ops.
    restartPlace = startPlace;

    /**
     * Loads one of the places in the tree.
     *
     * **On the world's own seed rather than a number written here.** A demo is part of this
     * build rather than something somebody made elsewhere, so it is meant to be stood on and
     * looked at on the ground this world already has — and a peer running the same build has the
     * same `DEFAULT_TERRAIN` and therefore the same ground (ADR 0016).
     */
    const loadDemo = async (id: string): Promise<string> => {
      const demo = demoPlace(id);
      if (demo === undefined) return `no place called "${id}"`;
      // **A demo is placed on the ground rather than left where the player is.** A demo builds
      // at `getHeightAt(0, 0)` — the surface above the origin — so the player has to be put
      // there, or a person who had walked to the far side of the planet would load a place and
      // never see it. The height is the same one the script asks for, from the same function.
      const half = DEFAULT_PLAYER_CONFIG.halfSize ?? 5;
      return startPlace({
        files: demo.files,
        entry: demo.entry,
        seed: DEFAULT_TERRAIN.seed,
        name: demo.id,
        spawn:
          demo.spawn ??
          ([
            demo.spawnAt?.[0] ?? 0,
            groundHeightAt(0, 0) + (demo.spawnLift ?? 0) + half + 1,
            demo.spawnAt?.[1] ?? 0,
          ] as const),
        // **A demo's models are URLs and are fetched here rather than at module scope**, so a
        // demo with none costs nothing to open and a model that is not there costs a notice
        // rather than a thrown 404.
        models:
          demo.models === undefined
            ? undefined
            : await loadDemoModels(demo.models),
        // **And the world the demo is about, if it says.** Every shipped demo is a sphere,
        // and this is here because the day one is not is the day the field earns its place.
        world: demo.world,
      });
    };

    // The place commands, as the same interface the table in `place-commands.ts` takes — so
    // that file's tests can stand a host in and never touch a `Game`. Annotated rather than
    // inferred, so a parameter the table hands over is typed here without a second declaration.
    const places: PlaceCommands = {
      loadDemo,
      openFromDisk,
      unload: () => {
        if (host === undefined) return NO_PLACE_LOADED;
        const name = loadedName ?? "place";
        dropPlace();
        return `unloaded ${name}`;
      },
      describe: () =>
        host === undefined
          ? NO_PLACE_LOADED
          : describePlace(loadedName ?? "place", host),
      notices: () => notices,
      toggleEditor: () => {
        setEditorOpen((open) => !open);
        return editorOpen()
          ? "editor closed"
          : "editor open — write a place, then run it";
      },
      toggleLevel: () => {
        setLevelEditorOpen((open) => !open);
        return levelEditorOpen()
          ? "level editor closed"
          : "level editor open — click the world to place things, ctrl-Z to undo";
      },

      /**
       * Opens or closes the catalog.
       *
       * **A line rather than a listing**, because the catalog is an overlay: two hundred names and
       * addresses in a scrollback is a list nobody scans, and the overlay is where a load button,
       * a search and the listing's own ceilings belong.
       */
      toggleBrowser: () => {
        setBrowserOpen((open) => !open);
        return browserOpen() ? "catalog closed" : "catalog open";
      },
      toggleDocs: () => {
        setDocsOpen((open) => !open);
        return docsOpen() ? "reference closed" : "reference open";
      },

      /**
       * Loads a published place by its address, and adopts it into the editor.
       *
       * **Adopted as well as run**, so a place somebody loaded can be edited and republished under
       * their own account — the whole point of a place being open. The same two steps `/place:open`
       * takes, over a record instead of a zip.
       */
      loadAddress: async (uri) => {
        try {
          return await openRecord(await placeLibrary.recordAtUri(uri));
        } catch (error) {
          return `could not open "${uri}": ${error instanceof Error ? error.message : String(error)}`;
        }
      },

      publish: publishEditedPlace,
    };

    /**
     * Loads a place already read from a repository, and adopts it into the editor.
     *
     * **Adopted as well as run**, so a place somebody loaded can be edited and republished under
     * their own account — the whole point of a place being open. Both `/place:load at://…` and the
     * catalog reach this, which is why it takes a record rather than an address: the catalog already
     * has the record it drew the row from and should not fetch it twice.
     */
    const openRecord = async (place: PublishedPlace): Promise<string> => {
      const project = await placeLibrary.project(place);
      const refused = placeEditor.adopt(project);
      if (refused !== null) return refused;
      return startPlace({
        files: project.scripts,
        entry: project.manifest.entry,
        seed: project.manifest.seed,
        name: project.manifest.name,
        spawn: project.manifest.spawn,
        world: project.manifest.world,
      });
    };

    /**
     * Lets the catalog load a place.
     *
     * **A holder rather than a direct call**, for the same reason the editor's Run is: the overlay
     * is rendered from the application root and `startPlace` belongs to the game branch. The result
     * goes to the scrollback, because the overlay has already closed by the time a place that will
     * not open can say so.
     */
    openPublished = async (place) => {
      runConsoleLine(await openRecord(place));
    };

    /**
     * Hands the editor's Run button the real runner.
     *
     * **The one place `startPlace` is wrapped as a project**, and it wraps rather than calling
     * directly so that `manifest.scripts` is derived from the files rather than trusted — a
     * manifest edited independently of its files is exactly what `isPlaceProject` refuses, and
     * Run is the last gate before the interpreter.
     */
    runPlace = async (project: PlaceProject) =>
      startPlace({
        files: project.scripts,
        entry: project.manifest.entry,
        seed: project.manifest.seed,
        name: project.manifest.name,
        spawn: project.manifest.spawn,
        // **The attachments the editor holds, or Run is a button that quietly loses them.** A
        // project carrying a `.sdfmod` or a level is exactly what `writePlaceZip` and the zip
        // loader already move; Run has to hand the same bytes to `startPlace`, which reads the
        // models and puts the level in the world before the script runs.
        models: project.models,
        levels: project.levels,
        world: project.manifest.world,
      });

    // The console's commands are the game's own methods by another name, so the
    // game is what they are built over. It exists here, and nowhere earlier,
    // which is why the table can only be built now.
    setCommander(
      createCommands({
        setFlying: (flying) => game.setFlying(flying),
        setNoClip: (noclip) => game.setNoClip(noclip),
        toSpace: (altitude) => game.placeInSpace(altitude),
        clock,
        setStatus: (visible) => {
          const next = visible ?? !statusVisible();
          setStatusVisible(next);
          return next ? "status shown" : "status hidden";
        },
        // The two cloud knobs, adapted rather than passed as an object, because the
        // layer does not exist yet and only this scope knows that. `state()` says so
        // rather than reporting zeroes, which is what a null layer would otherwise look
        // like.
        cloud: {
          coverage: (value) => {
            if (layer === null)
              return "no cloud layer yet — the field is still baking";
            const material = layer.material;
            if (value !== undefined) material.coverage = value;
            return `coverage ${material.coverage.toFixed(3)}`;
          },
          density: (value) => {
            if (layer === null)
              return "no cloud layer yet — the field is still baking";
            const material = layer.material;
            if (value !== undefined) material.density = value;
            return `density ${material.density.toFixed(3)}`;
          },
          quality: (value) => {
            if (layer === null)
              return "no cloud layer yet — the field is still baking";
            if (value !== undefined) {
              layer.setQuality(value);
              // **Remembered for the next visit**, so a machine that chose the cheap technique
              // does not pay for the expensive one again on reload. Never awaited: the console
              // prints the line now and the write settles whenever it settles.
              void writeSetting(CLOUD_QUALITY_KEY, value);
            }
            return `quality ${layer.quality}`;
          },
          state: () =>
            layer === null
              ? `no cloud layer yet — ${describeCloudStatus(cloudStatus())}`
              : `built | quality ${layer.quality} | coverage ${layer.material.coverage.toFixed(3)} | density ${layer.material.density.toFixed(3)} | ${describeCloudStatus(cloudStatus())}`,
        },
        // The window's reach, adapted the same way the world's shape is. `applyWindow` is what
        // turns the stored shape into a reshape, so the command and the editor widen the same
        // one and neither can drift from the other.
        windowSize: {
          radius: (value) => {
            if (value !== undefined) {
              setGameWindow((current) => ({ ...current, radius: value }));
              // **Reshaped at once only when the editor is shut**, because the editor's own
              // window is a function of this one and rewrites it on open and close anyway.
              if (!levelEditorOpen()) applyWindow();
            }
            return `window radius ${gameWindow().radius} chunks in x and z`;
          },
          yRadius: (value) => {
            if (value !== undefined) {
              setGameWindow((current) => ({ ...current, yRadius: value }));
              if (!levelEditorOpen()) applyWindow();
            }
            return `window radius ${gameWindow().yRadius} chunks in y`;
          },
          state: () =>
            `window ${gameWindow().radius} chunks in x and z, ${gameWindow().yRadius} in y${levelEditorOpen() ? " (widened to match while the editor is open)" : ""}`,
        },
        // The world's shape, adapted the same way the clouds are: `setWorldShape` lives with
        // the scene it rebuilds and the module-scope readers it replaces, and this is the
        // only scope that knows both exist. `describe` reads the same module binding rather
        // than holding a value, because a line of state that can be out of date is worse
        // than one that cannot.
        world: {
          shape: (value) =>
            value === undefined
              ? setWorldShape(WORLD.shape)
              : setWorldShape(value),
          describe: () =>
            [
              `shape   ${describeWorldShape(WORLD.shape)}`,
              `sea     ${WORLD.seaLevel.toFixed(0)} ${WORLD.frame.spherical ? "units from the centre" : "world y"}`,
              `window  ${describeBands(chosen ?? DEFAULT_LOD_BANDS)}`,
              `far     ${describePlanetBakeStatus(planetBake())}`,
            ].join("\n"),
        },
      })
        .with(placeCommands(places))
        .with(accountCommands(accountConsole)),
    );

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      const shift = event.shiftKey;
      if (event.key === "z" && !shift) sculpt.tool.undo();
      else if ((event.key === "z" && shift) || event.key === "y")
        sculpt.tool.redo();
      else return;
      event.preventDefault();
      setHistory({ undo: sculpt.undoDepth, redo: sculpt.redoDepth });
    };
    window.addEventListener("keydown", onKeyDown);

    let lastTime = 0;
    let lastReadout = 0;
    // ---- The level editor ----
    //
    // **Here rather than beside the scene assembly above**, because it needs the model
    // library, which is declared below and filled in when a place loads — and still *last*
    // in the scene, which is the point of it: rmsl draws in insertion order (ADR 0014) and
    // a selection box behind the thing it is highlighting is worse than no box at all.
    //
    // It has no scene, no renderer and no camera of its own. It pins this canvas into a
    // pane, drives this camera, and asks this world to change.
    const levelHighlight = createHighlight(viewport.scene);
    // **The reference image first of the editor overlays**, so the draft, the selection and the
    // handles all paint over it — a tracing aid is underneath the thing being traced against it.
    // It ignores depth (`image-plane.ts`), so it must still be added after the world to show
    // through the terrain at all (ADR 0014). Hidden until Phase 2 gives it an image.
    imagePlaneOverlay = createImagePlaneOverlay(viewport.scene);
    // The draft's own lines, added after the world so a wall being drawn shows over terrain
    // (its material does not depth-test — see `draw-lines-overlay.ts`) and before the ghost
    // and the handles, so those still draw on top of it.
    drawLinesOverlay = createDrawLinesOverlay(viewport.scene);
    // **After the draft**, so the picked edge's highlight paints over the yellow line it is
    // selecting rather than the other way round (ADR 0014).
    selectionOverlay = createSelectionOverlay(viewport.scene);
    /**
     * The gizmo, and where it goes in the scene.
     *
     * **Three objects in one order, and the order is the whole of it.** rmsl draws in
     * insertion order ([ADR 0014](../../docs/adr/0014-the-sky-dome-is-drawn-first.md)), so
     * the only way to make a control draw over the world is to add it after the world — and
     * the handles set `depthTest` to false, which changes nothing unless they are traversed
     * *last*. So: the ghost over the terrain, the arrows over the ghost, the rings over the
     * arrows. The ghost is in a group of its own for the same reason (see `ghost.ts`): a mesh
     * re-added to the scene on every drag would otherwise land after the handles on the
     * second drag and draw over the arrows being dragged.
     */
    const levelGhost = createGhost(viewport.scene);
    const levelMoveHandles = createMoveHandles(viewport.scene);
    const levelRotateHandles = createRotateHandles(viewport.scene);
    const levelApplier = createLevelApplier({
      places: sculpt.places,
      figures,
      /**
       * **A reader, not the library.** `modelLibrary` is assigned when a place loads and
       * cleared when it unloads, so a reference taken now would be `undefined` for the rest
       * of the session. Asking on each call means a figure placed after a place loads finds
       * its model, and one placed before it says so rather than crashing.
       */
      models: { get: (name) => modelLibrary?.get(name) },
      /**
       * **Deferred, and this is the reason the seam is worth having.** `sculpt.invalidate`
       * records what changed and waits for the mesher to be free; `sculpt.refreshPlaces` —
       * what the place host uses — sends the model now. The host runs once per step and a
       * step is already the unit the world moves in. An editor's pointer is not, and sending
       * per pointer event cancels the very mesh that would show the edit, which is why a
       * level editor built on the host's path appears to do nothing until you let go.
       */
      geometryChanged: (bounds) => sculpt.invalidate(bounds),
    });
    /** Both holders the editor's own state writes through. See where they are declared. */
    applyLevel = (plan) => levelApplier.apply(plan);
    setLevelModels(modelLibrary?.names() ?? []);

    /**
     * Both styles are built; only one is stepped.
     *
     * Building on demand would mean a style that has never been live has never held the
     * pose it would have to adopt, so switching into it would jump. Here both start at the
     * origin and neither has a pose worth keeping until somebody switches, at which point
     * the handover below carries it across.
     */
    const orbitLevel = createOrbitCameraControl(viewport.camera);
    const noClipLevel = createNoClipCameraControl(viewport.camera, input);
    const levelCamera = (): CameraControl =>
      levelCameraKind() === "orbit" ? orbitLevel : noClipLevel;

    /**
     * Where the editor opens: the player's own view, written as a pose.
     *
     * **Neither style's default is a place anybody asked to look at.** `OrbitController`
     * starts aimed at the origin, and on this world the origin is a hundred and thirty-five
     * thousand units *inside* the planet — so an editor left there draws the backfaces of
     * terrain nothing can see, which reads as a blue screen with no ground under the
     * pointer and nothing anybody can place. Opening adopts this instead.
     *
     * The same shape `no-clip`'s own `pose` hands back — the eye, and a point a
     * `DEFAULT_FRAME_DISTANCE` along the line it was looking along — so a handover from the
     * game and a handover between the styles are one idea rather than two.
     */
    const poseFromPlayer = (): CameraPose => {
      const at = playerEye(game.player);
      const forward = viewport.camera.getWorldDirection(TMP_FORWARD);
      return {
        at,
        target: {
          x: at.x + forward.x * DEFAULT_FRAME_DISTANCE,
          y: at.y + forward.y * DEFAULT_FRAME_DISTANCE,
          z: at.z + forward.z * DEFAULT_FRAME_DISTANCE,
        },
      };
    };

    /**
     * The style that is currently listening on the canvas, and the one call that swaps it.
     *
     * **A holder rather than `levelCamera()` at each site, because the two styles are not
     * interchangeable once attached.** A switch has to take the old one down before starting
     * the new one, and a close has to take down whichever was live — which the kind alone
     * cannot say, because the kind can change while the editor is shut.
     */
    let attachedLevelCamera: CameraControl | undefined;

    const takeLevelCamera = (kind: CameraControlsKind): void => {
      if (attachedLevelCamera?.kind === kind) return;
      attachedLevelCamera?.dispose();
      const next = kind === "orbit" ? orbitLevel : noClipLevel;
      next.attach(canvas);
      attachedLevelCamera = next;
    };

    /**
     * Whether the input controller's listeners act while the editor is open.
     *
     * **It depends on which style is live, because the two want opposite things.**
     *
     * `no-clip` *is* the input controller — its flight, its look and its touch drag all come
     * from `createInput`, and there is nothing else — so silencing it silenced the whole
     * editor: a finger dragged across the canvas and nothing happened.
     *
     * `orbit` reads none of it and must not have it. With the listeners live, a mouse press on
     * the canvas re-takes the pointer lock, and **a locked pointer freezes `clientX`**, so
     * every drag after that arrives as a drag of zero pixels — an editor whose camera cannot
     * be moved, which is the symptom this rule exists to prevent.
     *
     * **The flag rather than a read**, because an effect arm has no tracking scope: asking
     * `levelEditorOpen()` here would warn `STRICT_READ_UNTRACKED` and would then be a value
     * that cannot change under the caller.
     */
    const applyEditorInput = (open: boolean): void => {
      input.setEnabled(open && levelCameraKind() === "no-clip");
    };

    /**
     * Whether a gizmo drag is running, and whether one just finished.
     *
     * **`justDragged` is the important one, and it exists because a drag ends in a
     * `pointerup`.** The editor's own click handler is on `pointerup` too — that is where a
     * place is put — so a gizmo drag would be followed one event later by a click that
     * places a shape, or, with the select tool, by a re-pick that clears the selection of the
     * very thing that was just dragged. Set on `pointerdown`, read and cleared by the click,
     * so a press that turned out to be a drag does not also place.
     *
     * **`dragging` is a plain variable and not a signal.** Every read here is inside a
     * pointer handler or the frame loop, neither of which is a tracked scope, and a signal
     * would be read outside one.
     */
    let dragging = false;
    let justDragged = false;

    /**
     * Where the pointer is on the canvas, in the canvas's own pixels.
     *
     * **The canvas's rectangle, not the page's** — it is absolutely positioned into the
     * editor's pane, so `clientX` is measured from the page and the handles are measured
     * from the canvas. This is the same correction `clickLevelWorld` makes for `toNdc`.
     */
    const pointerOnCanvas = (event: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    /**
     * The ray through a point given in page coordinates, in the canvas's own pixels.
     *
     * **Rect-relative, not page-relative.** The canvas is positioned into the editor's pane,
     * so a page coordinate would aim at the wrong place by exactly the pane's offset — the
     * same correction `pointerOnCanvas` makes, and the reason `clickLevelWorld` below shares
     * this rather than dividing page pixels by the canvas's size.
     */
    const rayAtClient = (clientX: number, clientY: number): Ray | undefined => {
      const rect = canvas.getBoundingClientRect();
      viewport.camera.updateMatrixWorld();
      const ndc = toNdc(
        clientX - rect.left,
        clientY - rect.top,
        rect.width,
        rect.height,
      );
      return rayThroughScreen(viewport.camera, ndc.x, ndc.y);
    };

    /** Moves the draw's aim to wherever a pointer or a crosshair is. */
    const drawAim = (clientX: number, clientY: number): void => {
      const controller = drawLines();
      if (controller === undefined) return;
      const ray = rayAtClient(clientX, clientY);
      if (ray === undefined) return;
      controller.aim(pointerOnCanvas({ clientX, clientY }), ray);
    };

    /**
     * What a press — or the touch **Apply** button — does for the walls tool.
     *
     * **`commit` is the whole device difference.** A mouse press commits (the left-click
     * shortcut for Next); a finger press begins aiming and latches on release. Apply places a
     * point at the crosshair, which is the same commit, so a phone can draw either by dragging
     * or by aiming the camera and tapping.
     */
    const drawPress = (
      clientX: number,
      clientY: number,
      commit: boolean,
    ): void => {
      const controller = drawLines();
      if (controller === undefined) return;
      const ray = rayAtClient(clientX, clientY);
      if (ray === undefined) return;
      const pointer = pointerOnCanvas({ clientX, clientY });
      if (!controller.state().active) {
        if (!controller.begin(pointer, ray)) {
          levelEditor.setNotice("nothing under the pointer to draw on");
        }
        return;
      }
      // `begin` while a plane exists is a press that wants to aim; see the controller.
      if (commit) controller.commit();
      else controller.begin(pointer, ray);
    };

    /**
     * How far the camera is from a point, for the handles' size.
     *
     * **Camera to the item, and not camera to whatever the camera orbits** — see
     * `VIEW_SHARE`. The orbit style could answer with its radius, but no-clip's is a fiction
     * a `pose` call invents, and the item is what the handles are drawn over.
     */
    const distanceTo = (at: Vec3): number => {
      const eye = viewport.camera.position;
      return Math.hypot(eye.x - at.x, eye.y - at.y, eye.z - at.z);
    };

    /** The world-space point a level item's array position stands for. */
    const itemAt = (item: LevelItem): Vec3 => ({
      x: item.at[0],
      y: item.at[1],
      z: item.at[2],
    });

    /** The turn a level item carries, as the quaternion the maths here speaks. */
    const itemOrientation = (item: LevelItem): Quat => {
      if (item.kind !== "shape" || item.orientation === undefined) {
        return IDENTITY_QUAT;
      }
      return {
        x: item.orientation[0],
        y: item.orientation[1],
        z: item.orientation[2],
        w: item.orientation[3],
      };
    };

    /**
     * Where the handles stand, and whether they are showing at all.
     *
     * **Called from the frame loop and not from an effect**, because the camera is not a
     * signal: an effect would place the handles once per selection change and leave them
     * where they were after every zoom and every orbit — arrows of a fixed size on screen,
     * which is the one thing the whole scaling in `move-handles.ts` exists to prevent.
     *
     * **Orbit only.** Under no-clip the pointer lock is on and `clientX` does not move, so
     * there is nothing to hit-test against and the gizmo is not offered — see
     * `CameraControl.claimGesture`.
     */
    const standHandles = (): void => {
      const item = levelEditor.selectedItem();
      /**
       * **The reference image gets the move handles while the Image tool is on**, so it is
       * moved the way an item is — along a world axis by the arrows — rather than by the
       * grazing-angle drag its own plane made unstable. It offers no rings: a picture is turned
       * about up by the field in its panel, and three world-axis rings would be three ways to do
       * a thing the panel already does exactly.
       */
      const imagePose =
        levelEditor.tool() === "image" ? imagePlane.pose() : undefined;
      const wanted =
        levelEditor.gizmo() !== "off" && levelCameraKind() === "orbit";
      const moveTarget =
        imagePose !== undefined || (item !== undefined && turnable(item));
      levelMoveHandles.setVisible(
        wanted && moveTarget && levelEditor.gizmo() === "move",
      );
      levelRotateHandles.setVisible(
        wanted &&
          item !== undefined &&
          turnable(item) &&
          levelEditor.gizmo() === "rotate",
      );
      const at =
        imagePose?.at ?? (item === undefined ? undefined : itemAt(item));
      if (at === undefined || !wanted) return;
      const distance = distanceTo(at);
      levelMoveHandles.place(at, distance);
      levelRotateHandles.place(at, distance);
    };

    /**
     * Whether this item can be turned.
     *
     * **A sphere cannot, and a figure can only about up.** A figure's model already carries a
     * yaw and the host refuses anything else, so offering three rings for one would be
     * offering two that silently do nothing.
     */
    const turnable = (item: LevelItem | undefined): boolean => {
      if (item === undefined) return false;
      if (item.kind === "figure") return true;
      // **A drawn wall has no single turn to grab.** Its height is edited in the inspector and
      // its direction is a property of the line, not of the item, so a rotate gizmo would have
      // nothing to turn. It is also why `standHandles` shows no move arrows for one: the gate
      // is this same answer.
      if (item.kind === "walls") return false;
      return isAxial(item.shape.type);
    };

    /**
     * A frame of the editor, in place of the game's.
     *
     * **`game.tick` does not run, and that is the whole design.** It is what calls
     * `placeCamera` every frame, so the player would fight the editor for the camera — and
     * it is also what moves the player, steps the place and runs its `onTick`. A level
     * should not change under the person editing it, so all of it stops; the game picks up
     * again from its own state on the first frame after the editor closes.
     *
     * The sky and the clouds are not updated either, and that is deliberate rather than an
     * omission: both are placed from the player's position, which is frozen, and a cloud
     * layer drifting past while somebody places a wall makes the wall harder to see.
     */
    /**
     * Draws the draft, or hides it when the walls tool is not what is active.
     *
     * **Called from the frame loop, not from an effect**, for the reason the handles are: a
     * ring's size is a function of the camera's distance, which is not a signal, so an effect
     * would leave the rings a zoom behind. Reading `drawLines()` and `levelEditor.tool()` here
     * is an untracked read in a non-reactive scope, exactly as `standHandles` reads the
     * selection.
     */
    const renderDrawLines = (): void => {
      const overlay = drawLinesOverlay;
      if (overlay === undefined) return;
      const controller = drawLines();
      const drawing =
        drawsInAPlane(levelEditor.tool()) && controller !== undefined;
      overlay.setVisible(drawing);
      if (!drawing || controller === undefined) return;
      const rect = canvas.getBoundingClientRect();
      const size: ScreenSize = { width: rect.width, height: rect.height };
      overlay.render(
        controller.state(),
        viewport.camera,
        size,
        MARKER_RADIUS_PX,
      );
    };

    /**
     * The picked segment's two ends, wherever it is drawn from.
     *
     * **Found through `pickableSegments` rather than reading the item or the draft directly**, so
     * the highlight and the pick agree by construction: the same list that decided what a tap hit
     * decides what to draw, and the "editing the draft" versus "stored item" branch stays in one
     * place.
     */
    const pickedSegmentEndpoints = (
      pick: SegmentPick,
    ): [Vec3, Vec3] | undefined => {
      const found = pickableSegments().find(
        (segment) =>
          segment.itemId === pick.itemId && segment.index === pick.index,
      );
      return found === undefined ? undefined : [found.a, found.b];
    };

    /**
     * Shows the picked segment's highlight, or puts it away when nothing is picked.
     *
     * **Every frame, like the draft**, because a segment dragged by the draft's own node editing
     * or an item deleted by an undo moves under the highlight, and a highlight that only updated
     * on the pick would point at where the edge used to be.
     */
    const renderSelection = (): void => {
      const overlay = selectionOverlay;
      if (overlay === undefined) return;
      const pick = pickedSegment();
      const ends =
        pick === undefined ? undefined : pickedSegmentEndpoints(pick);
      if (ends === undefined) {
        overlay.hide();
        return;
      }
      overlay.show(ends[0], ends[1]);
    };

    const editorFrame = (dt: number): void => {
      levelCamera().update(dt);
      /** Before the render, because the handles are part of what is about to be drawn. */
      standHandles();
      /** The draft, if there is one, on the same frame the world is drawn. */
      renderDrawLines();
      /** The picked wall edge, over the draft it may have come from. */
      renderSelection();
      /** Whatever the level asked for, now that the mesher may be free to take it. */
      sculpt.flushInvalidated();
      viewport.render();
    };

    /**
     * Reads a chosen image file and lays the picture down in front of the camera.
     *
     * **Read here rather than in the panel** because the bytes are the editor's and placing the
     * picture needs the collision field and the camera, which live in this scope. The panel is
     * handed the one thing it cannot do — a `File` to hand to a picker callback.
     *
     * **Placed where the camera is looking, but only the first time.** A picture being *replaced*
     * keeps the placement somebody has already lined up with the terrain; a first one lands under
     * the view rather than at the world's origin, which is wherever the camera happens to be.
     */
    chooseReferenceImage = (file: File): void => {
      void (async () => {
        const image = await readReferenceImage(file);
        if (imagePlane.image() === undefined) {
          viewport.camera.updateMatrixWorld();
          const ground = pickAlong(
            sculpt.collisionField,
            rayThroughScreen(viewport.camera, 0, 0),
          );
          if (ground !== undefined) imagePlane.setAt(ground.point);
        }
        imagePlane.setImage(image);
        imagePlane.setVisible(true);
      })();
    };

    /**
     * A click in the world, meaning whatever the active tool says it means.
     *
     * **The screen point is in the canvas's own coordinates**, not the page's, because the
     * canvas is absolutely positioned into the editor's pane and so no longer sits where the
     * page says it does. `toNdc` divides by the canvas's own size, which is what makes this
     * correct in both the overlay and the game.
     */
    clickLevelWorld = (clientX: number, clientY: number): void => {
      // **The walls tool places a point, not a shape.** On a phone this is the Apply button at
      // the crosshair and it commits, exactly as Next does; on a desktop the pointer handlers
      // own the press, so this path is the touch one.
      if (drawsInAPlane(levelEditor.tool())) {
        // **The touch Apply button picks in the segment sub-mode**, exactly as a tap does on a
        // mouse: a phone has no hover, so the button is how it says where it is pointing.
        if (segmentSelect()) {
          pickWallSegmentAt(clientX, clientY);
          return;
        }
        drawPress(clientX, clientY, true);
        return;
      }

      viewport.camera.updateMatrixWorld();
      const ndc = toNdc(
        clientX,
        clientY,
        canvas.clientWidth,
        canvas.clientHeight,
      );
      const ray = rayThroughScreen(viewport.camera, ndc.x, ndc.y);

      if (levelEditor.tool() === "select") {
        const hit = pickItem(
          levelEditor.items(),
          ray,
          (origin, direction, reach) => {
            const found = figures.pick(origin, direction, reach);
            // `FigureHit` reports a distance; the editor needs the id to find the item in
            // the level, which namespaces its own. See `view/picking.ts`.
            return found === undefined
              ? undefined
              : { id: found.figure.id, distance: found.distance };
          },
        );
        levelEditor.select(hit?.index);
        return;
      }

      // **The Image tool places nothing on a click.** Its picture is chosen from the panel and
      // moved by a drag; a tap is a no-op. Without this the tool would fall through to the
      // prop/npc cast below and stand a figure wherever somebody tapped.
      if (levelEditor.tool() === "image") return;

      // **Where it goes is the terrain under the pointer**, not the pointer's direction —
      // a shape placed by eye would end up wherever the view happened to be pointing.
      const ground = pickAlong(sculpt.collisionField, ray);
      if (ground === undefined) {
        levelEditor.setNotice("nothing under the pointer to build on");
        return;
      }
      // Pushed out along the normal by half a shape, so a wall placed on a slope sits *in*
      // the slope rather than half-buried in it.
      const half = DEFAULT_SHAPE_SIZES[levelEditor.shapeKind()] / 2;
      const at: [number, number, number] = [
        ground.point.x + ground.normal.x * half,
        ground.point.y + ground.normal.y * half,
        ground.point.z + ground.normal.z * half,
      ];
      if (levelEditor.tool() === "shape") {
        levelEditor.addShapeAt(
          at,
          levelEditor.shapeKind(),
          levelEditor.combine(),
        );
      } else {
        levelEditor.addFigureAt({
          kind: "figure",
          id: "",
          // Narrowed by the branch above: `shape` returned already, so what is left is
          // `prop` or `npc`, which is exactly what `figure` takes.
          figure: levelEditor.tool() as "prop" | "npc",
          model: modelLibrary?.names()[0] ?? "",
          at,
          // A prop is solid and an npc is not standing in a wall; both default the same way
          // and the inspector changes it.
          ...(levelEditor.tool() === "npc" ? { name: "New character" } : {}),
        });
      }
    };

    /**
     * Puts the dragged item's own mesh under the pointer, or nothing if it has none.
     *
     * **A shape is meshed; a figure is not.** A shape has no mesh anywhere — it lives in the
     * fold — so one is built for the drag, which `ghost.ts` explains is once per drag and not
     * once per frame. A figure is already a `Mesh` over its model's geometry
     * ([ADR 0047](../../docs/adr/0047-a-figure-is-its-own-mesh.md)), and `ownGeometry` is
     * false because that geometry belongs to every other placement of the model too.
     */
    const showDragged = (item: LevelItem): void => {
      if (item.kind === "walls") {
        // **Not reachable today, and stated rather than assumed.** A walls item is not
        // `turnable`, so `standHandles` shows neither the move arrows nor the rotate rings, so
        // no drag can begin on one. If a move handle is ever offered for walls, this is the
        // line that has to build their preview — a mesh from `wallParts`, which is what
        // `ghost.ts` would need.
        return;
      }
      if (!isLevelFigure(item)) {
        levelGhost.show(shapeGhostMesh(item, levelGhost.material), true);
        return;
      }
      const model = modelLibrary?.get(item.model);
      levelGhost.show(
        model?.draw(levelGhost.material, item.meshResolution),
        false,
      );
    };

    /**
     * A drag along one of the arrows, from the press to the release.
     *
     * **The screen-space test runs before anything is claimed**, so a press that was not on a
     * handle falls through to the camera and to `clickLevelWorld` untouched. The handles are
     * measured against their own drawn lines rather than by raycasting (`move-handle.ts`),
     * which is what makes them big enough for a finger.
     *
     * **One write, on the way out.** Everything inside the loop is a proposal: the ghost
     * follows the pointer and the arrows follow the ghost, and the level is not touched
     * until the drag ends — so a drag is one apply and one undo step rather than one per
     * pointer move.
     *
     * **The reference image is the one exception, and it is deliberate.** A picture is editor
     * chrome rather than a level item, so there is nothing to undo and no reason to hold the
     * move back — it follows the pointer live, with no ghost, because the picture itself is the
     * thing being moved. It is still moved along a world axis, which is what makes it steady at
     * every camera angle where the plane drag it replaces was not.
     */
    const grabHandle = async (
      initial: PointerEvent & { currentTarget: HTMLElement },
    ): Promise<void> => {
      const item = levelEditor.selectedItem();
      const imagePose =
        levelEditor.tool() === "image" ? imagePlane.pose() : undefined;
      if (levelEditor.gizmo() !== "move" || dragging) return;
      if (item === undefined && imagePose === undefined) return;
      // Placed first, so the screen-space test measures the arrows as the last frame drew
      // them rather than where they were when the selection changed.
      standHandles();
      const rect = canvas.getBoundingClientRect();
      const arms = levelMoveHandles.armsOnScreen(viewport.camera, {
        width: rect.width,
        height: rect.height,
      });
      const axis = armUnderPointer(pointerOnCanvas(initial), arms);
      if (axis === undefined) return;

      const start =
        imagePose?.at ?? (item === undefined ? undefined : itemAt(item));
      if (start === undefined) return;

      dragging = true;
      justDragged = true;
      /** The camera stands down for the length of the drag, and no longer. */
      levelCamera().claimGesture(true);
      levelMoveHandles.setHeld(axis);
      // A picture is drawn by this overlay and shows the move itself; only an item, whose mesh
      // is not a scene object the editor can move, needs a ghost built for it.
      if (imagePose === undefined && item !== undefined) showDragged(item);

      const arm = arms.find((candidate) => candidate.axis === axis);
      let moved = start;

      try {
        await pointer(initial, ({ totalDelta }) => {
          if (arm === undefined) return;
          const along = distanceDragged(
            totalDelta,
            arm,
            levelMoveHandles.armLength(),
          );
          const direction = unitAlong(axis);
          moved = {
            x: start.x + direction.x * along,
            y: start.y + direction.y * along,
            z: start.z + direction.z * along,
          };
          if (imagePose !== undefined) imagePlane.setAt(moved);
          else levelGhost.moveTo(moved);
          // **The arrows follow the move**, or the handle would slide out from under the
          // finger while the drag continued.
          levelMoveHandles.place(moved, distanceTo(moved));
        });
      } finally {
        levelMoveHandles.setHeld(undefined);
        levelGhost.hide();
        levelCamera().claimGesture(false);
        dragging = false;
      }

      // The picture was written live; an item is written once, here, as one undo step.
      if (imagePose !== undefined) return;

      const index = levelEditor.selectedIndex();
      if (
        index === undefined ||
        (moved.x === start.x && moved.y === start.y && moved.z === start.z)
      ) {
        return;
      }
      const current = levelEditor.items()[index];
      if (current === undefined) return;
      levelEditor.updateItem(index, {
        ...current,
        at: [moved.x, moved.y, moved.z],
      });
    };

    /**
     * A drag round one of the rings, from the press to the release.
     *
     * **The same shape as `grabHandle` on purpose** — one grabs an arrow and one grabs a
     * ring, and the difference between them is four lines. Two implementations would drift.
     *
     * **`multiply(turn, orientation)`, and the order is load-bearing**: the ring is a world
     * axis, so the turn goes *before* the item's own. Composed the other way round the item
     * turns about an axis that is not the one under the finger, which looks entirely healthy
     * — see `quaternion.ts`.
     */
    const grabRing = async (
      initial: PointerEvent & { currentTarget: HTMLElement },
    ): Promise<void> => {
      const item = levelEditor.selectedItem();
      if (levelEditor.gizmo() !== "rotate" || item === undefined || dragging) {
        return;
      }
      standHandles();
      const rect = canvas.getBoundingClientRect();
      const rings = levelRotateHandles.ringsOnScreen(viewport.camera, {
        width: rect.width,
        height: rect.height,
      });
      const axis = ringUnderPointer(pointerOnCanvas(initial), rings);
      if (axis === undefined) return;
      /**
       * **A figure offers one ring, and it is the one about up.** `FigureSpec` carries a
       * `yaw` and the host refuses a turn on any other axis, so a figure's rings would be
       * two shapes that take a drag and then do nothing with it. Refusing here is the same
       * answer as `turnable`, and it is a refusal the finger can see: the ring is not there
       * to be grabbed.
       */
      if (isLevelFigure(item) && axis !== "y") return;

      dragging = true;
      justDragged = true;
      levelCamera().claimGesture(true);
      levelRotateHandles.setHeld(axis);
      showDragged(item);

      const start = itemOrientation(item);
      const from = pointerOnCanvas(initial);
      const direction = unitAlong(axis);
      const ring = rings.find((candidate) => candidate.axis === axis);
      let turned = start;

      try {
        await pointer(initial, ({ event }) => {
          if (ring === undefined) return;
          // **The pointer's place, not its travel.** The angle is a bearing from the ring's
          // middle, so it needs where the pointer is now rather than how far it has come.
          const swept = axisAngle(
            direction.x,
            direction.y,
            direction.z,
            radiansDragged(from, pointerOnCanvas(event), ring),
          );
          turned = multiply(swept, start);
          levelGhost.turnTo(turned);
        });
      } finally {
        levelRotateHandles.setHeld(undefined);
        levelGhost.hide();
        levelCamera().claimGesture(false);
        dragging = false;
      }

      const index = levelEditor.selectedIndex();
      if (index === undefined) return;
      const current = levelEditor.items()[index];
      if (current === undefined) return;

      if (isLevelFigure(current)) {
        /**
         * **A figure has a yaw and nothing else**, and the host refuses anything more, so
         * the turn is written back as the one angle it has rather than as a quaternion the
         * file has no field for. Read out of the turned quaternion rather than accumulated,
         * for the same reason the drag is: a yaw that drifts over a long drag is a shape
         * that does not go back where it was put down.
         */
        const yaw = (toEuler(turned).yaw * Math.PI) / 180;
        if (yaw !== (current.yaw ?? 0)) {
          levelEditor.updateItem(index, { ...current, yaw });
        }
        return;
      }

      // **A drawn wall has no turn to write.** Its rings are never shown (`turnable`), so a
      // rotate drag cannot start on one; this is the branch that keeps the type honest if one
      // ever is.
      if (current.kind === "walls") return;

      if (
        turned.x === start.x &&
        turned.y === start.y &&
        turned.z === start.z &&
        turned.w === start.w
      ) {
        return;
      }
      levelEditor.updateItem(index, {
        ...current,
        orientation: [turned.x, turned.y, turned.z, turned.w],
      });
    };

    /** One of the three unit vectors an axis names, for a drag to travel along or about. */
    const unitAlong = (axis: Axis): Vec3 =>
      axis === "x"
        ? { x: 1, y: 0, z: 0 }
        : axis === "y"
          ? { x: 0, y: 1, z: 0 }
          : { x: 0, y: 0, z: 1 };

    /**
     * Scratch for the draw projection, allocated once.
     *
     * **A `Matrix4` and a `Vector3` reused rather than built per call**, because this is asked
     * once per pointer move and once per frame for the rings — the same reason
     * `view/move-handles.ts` keeps its own. The view-projection is read fresh each call,
     * because the camera moves between them.
     */
    const drawViewProjection = new Matrix4();
    const drawVector = new Vector3();
    const projectForDrawing = (point: Vec3): ScreenPoint | undefined => {
      viewport.camera.updateMatrixWorld();
      drawViewProjection
        .copy(viewport.camera.projectionMatrix)
        .multiply(viewport.camera.matrixWorldInverse);
      drawVector.set(point.x, point.y, point.z);
      const rect = canvas.getBoundingClientRect();
      return projectPointToScreen(drawVector, drawViewProjection, {
        width: rect.width,
        height: rect.height,
      });
    };

    /**
     * Every wall edge a segment pick can land on, in the shape `pick-segment.ts` tests.
     *
     * **While a wall is being edited the draft is what those edges are.** "Update walls" writes
     * the draft back over the item, so a delete that changed the committed item instead would be
     * undone by the very button that is meant to keep it — which is exactly what happened when
     * this always read the stored items. So an edit session offers its own chains, numbered as the
     * draft sees them, and only a draw that is not editing offers the level's stored walls.
     */
    const pickableSegments = (): PickableSegment[] => {
      const editingId = editingDrawId();
      const controller = drawLines();
      const segments: PickableSegment[] = [];

      // **The draft's own edges, on a first insert as much as an edit.** Before Finish the run
      // being drawn is only in the controller — there is no item to name it by — so it is offered
      // under `DRAFT_SEGMENT_ID`, numbered as the controller itself orders the runs. An edit names
      // them by the item it is editing instead, so a delete lands in the draft either way.
      if (levelEditor.tool() === "walls" && controller !== undefined) {
        let index = 0;
        for (const chain of controller.state().chains) {
          for (let point = 0; point + 1 < chain.length; point++) {
            segments.push({
              itemId: editingId ?? DRAFT_SEGMENT_ID,
              index,
              a: chain[point]!,
              b: chain[point + 1]!,
            });
            index += 1;
          }
        }
      }

      // **The level's already-drawn walls, except one being edited** — the draft already stands
      // for that one, and offering both would be two edges a pixel apart that mean different
      // things when deleted.
      for (const item of levelEditor.items()) {
        if (item.kind !== "walls" || item.id === editingId) continue;
        for (const segment of wallSegments(item)) {
          segments.push({
            itemId: item.id,
            index: segment.index,
            a: segment.a,
            b: segment.b,
          });
        }
      }
      return segments;
    };

    /**
     * Picks the nearest wall segment under a pointer, for the Walls tool's segment sub-mode.
     *
     * **Selects the item too**, so the highlight box shows which wall the edge belongs to while
     * the Delete button names what pressing it will do. A pick that finds nothing clears the
     * previous selection, so a tap on empty sky is a way to put the segment down again.
     */
    const pickWallSegmentAt = (clientX: number, clientY: number): void => {
      const rect = canvas.getBoundingClientRect();
      const pointer = { x: clientX - rect.left, y: clientY - rect.top };
      const pick = segmentUnderPointer(
        pickableSegments(),
        projectForDrawing,
        pointer,
        SNAP_RADIUS_PX,
      );
      setPickedSegment(pick);
      if (pick === undefined) return;
      const index = levelEditor
        .items()
        .findIndex((item) => item.id === pick.itemId);
      if (index !== -1) levelEditor.select(index);
    };

    /**
     * The draw controller: the state machine `DrawLinesUi` reads and the pointer handlers
     * drive.
     *
     * **Made under `appOwner`, and the signal written outside it, and both halves are
     * load-bearing.** The controller makes a signal, and `onSettled`'s own owner forbids that
     * (`PRIMITIVE_IN_FORBIDDEN_SCOPE`), so the *making* runs under the component's owner. But
     * writing to a signal from inside an owned scope is itself refused
     * (`REACTIVE_WRITE_IN_OWNED_SCOPE`) and halts the whole reactive system — a black screen —
     * so the *write* stays out here in `onSettled`'s body, where the other setup writes
     * (`setPrecision`, `setLevelModels`) already are. `runWithOwner` returns the controller, so
     * the two are one expression rather than a holder that exists for three lines.
     */
    setDrawLines(
      runWithOwner(appOwner, () =>
        createDrawLinesController({
          groundAt: (ray) => pickAlong(sculpt.collisionField, ray)?.point,
          upAt: (point) => WORLD.frame.upAt(point),
          projectToScreen: projectForDrawing,
          snapRadius: SNAP_RADIUS_PX,
        }),
      ),
    );

    /**
     * The four things that watch, created under the component's own owner rather than under
     * `onSettled`'s tracked effect — see where `appOwner` is declared for why, and
     * `level-editor/scope.test.tsx` for the case this works around.
     *
     * **Everything they need is already defined by this point.** The two plain declarations
     * above are deliberately not inside this call: they are values, not subscriptions, and
     * making them local to the callback would hide the fact that the frame loop uses one of
     * them.
     */
    runWithOwner(appOwner, () => {
      /** Which style was live last, so a change is a change rather than an initial read. */
      let lastCameraKind: CameraControlsKind | undefined;

      /**
       * The draft is left behind when no drawing tool is active, or the editor closes.
       *
       * **Both, in one effect, because they are the same thing to the draft** — "you are no
       * longer drawing" — and two effects would be two teardowns to keep in step. The edit
       * target goes with it, so a finish after switching tools adds a new item rather than
       * overwriting one nobody is looking at any more.
       *
       * **`drawsInAPlane` rather than `tool() === "walls"`, so the two drawing tools share
       * one teardown.** Leaving the draft behind is the whole of what a floor does not want
       * either, and a floor's half-cleared loop showing up under the walls tool would be a
       * chain a walls Finish then picks up.
       */
      createEffect(
        () => levelEditorOpen() && drawsInAPlane(levelEditor.tool()),
        (drawing) => {
          if (drawing) return;
          drawLines()?.reset();
          setEditingDrawId(undefined);
          // **The segment sub-mode belongs to the Walls tool**, so leaving the drawing tools
          // leaves it too — otherwise a later visit to the Walls tool would open ready to pick.
          setSegmentSelect(false);
          setPickedSegment(undefined);
        },
      );

      // A switch of style hands the pose across rather than re-seeding from defaults, so
      // the view does not jump — and it hands the *listener* across with it, because the
      // style that is no longer live must stop answering gestures meant for the one that is.
      //
      // **Both signals in the compute, not only the kind.** Reading `levelEditorOpen()` inside
      // the arm would be a reactive read outside a tracking scope: it would warn
      // `STRICT_READ_UNTRACKED`, and a person closing the editor would expect this effect to
      // notice. The kind guard makes the extra run a no-op, which is what it has always been.
      createEffect(
        () => ({ kind: levelCameraKind(), open: levelEditorOpen() }),
        ({ kind, open }) => {
          if (lastCameraKind === undefined) {
            lastCameraKind = kind;
            return;
          }
          if (lastCameraKind === kind) return;
          const from = lastCameraKind === "orbit" ? orbitLevel : noClipLevel;
          const to = kind === "orbit" ? orbitLevel : noClipLevel;
          lastCameraKind = kind;
          // **Not while the editor is shut.** Neither style is attached then, so there is no
          // listener to move; and the next open frames from the player, which is a better
          // answer than one carried over from a camera that has not run since the last close.
          if (!open) return;
          to.adopt(from.pose());
          to.update(0);
          takeLevelCamera(kind);
          applyEditorInput(open);
        },
      );

      // The box follows the selection, from a subscription rather than from the click: a
      // selection can also change by undo, by an import and by the list, and each of those
      // would otherwise need its own "move the box" call.
      createEffect(levelEditor.selectedItem, (item) => {
        if (item === undefined) {
          levelHighlight.hide();
          return;
        }
        const half = isLevelFigure(item)
          ? modelLibrary?.get(item.model)?.half
          : undefined;
        levelHighlight.show(highlightBounds(item, half));
      });

      /**
       * The reference image's texture follows its bytes.
       *
       * **Rebuilt whenever the bytes change, and the decode is async**, so a late answer for an
       * image that has since been replaced is discarded rather than overwriting the new one —
       * the token is why two quick picks cannot leave the first picture on screen. Only the
       * bytes are watched here; where it lies and how it shows are the effect below.
       */
      createEffect(
        () => imagePlane.image(),
        (image) => {
          const overlay = imagePlaneOverlay;
          if (overlay === undefined || image === undefined) return;
          let live = true;
          void textureFromReference(image).then(({ texture, aspect }) => {
            if (!live) {
              texture.dispose();
              return;
            }
            overlay.setImage(texture, aspect);
          });
          return () => {
            live = false;
          };
        },
      );

      /**
       * The reference image's pose, opacity and visibility follow its state and the editor.
       *
       * **Hidden whenever the editor is closed**, so a reference cannot be left lying on the
       * terrain of the running game — the same rule the highlight and the selection overlay
       * follow. A pose that is `undefined` (no image) also hides it, so "no image" and "image,
       * not shown" are one state to the renderer.
       */
      createEffect(
        () => ({
          open: levelEditorOpen(),
          pose: imagePlane.pose(),
          opacity: imagePlane.opacity(),
          visible: imagePlane.visible(),
        }),
        ({ open, pose, opacity, visible }) => {
          const overlay = imagePlaneOverlay;
          if (overlay === undefined) return;
          if (pose !== undefined) overlay.setPose(pose);
          if (opacity !== undefined) overlay.setOpacity(opacity);
          overlay.setVisible(open && visible === true && pose !== undefined);
        },
      );

      /**
       * Everything the editor takes from the game while it is open, and hands back on close.
       *
       * **One effect rather than three, because they share a lifetime.** Three effects over
       * the same signal are three teardowns to keep in step, and the one that matters most —
       * the canvas click that places — is a listener that must not outlive the editor by one
       * frame, let alone by one dropped cleanup.
       *
       * **The teardown is returned, not handed to `onCleanup`.** The second argument to
       * `createEffect` is the effect's *arm*, and Solid 2 runs that arm with no owner: an
       * `onCleanup` in it is a no-op that warns `NO_OWNER_CLEANUP` and registers nothing.
       * Every teardown below was therefore lost on close — the input stayed disabled, the
       * pointer lock stayed suspended (so the "click to play" prompt never came back and the
       * canvas refused to re-lock), and the click handler stayed bound, placing walls in a
       * world whose editor was shut. What the arm does support is returning the teardown,
       * which runs before the next run and at dispose. `level-editor/scope.test.tsx` holds
       * the measurement this rests on.
       */
      createEffect(levelEditorOpen, (open) => {
        if (!open) return;

        // **A taller window while editing**, so a tall build is not cut off two chunks up.
        applyWindow();

        /**
         * **Framed before anything listens**, because a camera at the planet's core draws a
         * blue screen and picks nothing — see `poseFromPlayer`.
         */
        const camera = levelCamera();
        camera.adopt(poseFromPlayer());
        camera.update(0);

        /**
         * **Fog off while editing.** The air hides the very edges a person is placing against —
         * a wall's far end fades into the haze before it is finished, and a floor's outline is
         * hard to read against a blue wash. It is turned back on in the teardown, so the game the
         * editor returns to looks like the game it left.
         *
         * **All four fogs, because the scene shares one air.** The terrain, the sea, the figure
         * tint and the globe each own a `Fog`; disabling only the terrain's would leave the sea
         * still hazed and the editor's clear view half a picture.
         */
        const setFogEnabled = (enabled: boolean): void => {
          material.fog.enabled = enabled;
          GAME_WATER.material.fog.enabled = enabled;
          FIGURE_TINT.material.fog.enabled = enabled;
          if (globe !== null) globe.material.fog.enabled = enabled;
        };
        setFogEnabled(false);

        /**
         * Whether the current walls press has taken the pointer from the camera, and the one
         * call that keeps it balanced.
         *
         * **Claimed per press, not for the whole session.** `setToolOwnsLeft` declines *every*
         * single-pointer drag and the wheel, so holding it for as long as the walls tool is on
         * would take away right-drag orbit and zoom on a desktop — the whole of navigation.
         * Claiming on the press and releasing on the lift blocks one-finger orbit exactly while
         * a finger is aiming; a mouse's right button and the wheel are left alone, and a mouse's
         * left press is already claimed by `takeLeftButton`. Two fingers still navigate, because
         * `OrbitController` runs its multi-pointer branch before it consults the flag
         * (`camera/orbit.ts:325-329`).
         */
        let drawClaim = false;
        const claimDraw = (claimed: boolean): void => {
          if (claimed === drawClaim) return;
          drawClaim = claimed;
          levelCamera().claimGesture(claimed);
        };

        /**
         * Where the segment sub-mode's press began, so a drag can be told from a tap.
         *
         * **A pick is a tap, and an orbit is a drag.** The camera still gets the press in the
         * sub-mode — a person who wants to look at the wall from elsewhere has to be able to —
         * so the pick waits for the release and only happens if the pointer came back to roughly
         * where it went down. Six pixels is the same slack a browser calls a click.
         */
        let segmentPress: { x: number; y: number } | undefined;

        /**
         * Whether the current floor-edit press is dragging a picked corner.
         *
         * **A drag on a corner, not on the world.** The floor's node editor picks a corner on the
         * press and moves it on every move until the release; a press that lands on no corner
         * falls through to the ordinary draw gesture, so drawing and node editing share the tool.
         */
        let nodeDrag = false;

        /**
         * The gizmo's press, registered **before** the camera attaches.
         *
         * **The order is the point.** `OrbitController` reads its tool flag while deciding
         * what a drag means, and it listens on the same element, so a listener registered
         * after it would be told about the press second — by which time the camera has
         * already started a gesture with it. Registering first means the claim is in place
         * before anything else hears about the press.
         */
        const onPointerDown = (event: PointerEvent): void => {
          justDragged = false;
          // **The walls tool owns the press entirely**, so it is branched on first: its press
          // is not a gizmo grab, and on a mouse it is the shortcut for `Next`.
          if (drawsInAPlane(levelEditor.tool())) {
            // **The floor's node editor grabs a corner before anything else.** A press on a
            // corner starts a drag; a press that misses falls through to the draw gesture.
            if (
              levelEditor.tool() === "floor" &&
              editingDrawId() !== undefined &&
              (event.pointerType !== "mouse" || event.button === 0)
            ) {
              const controller = drawLines();
              if (controller?.pickPoint(pointerOnCanvas(event)) === true) {
                nodeDrag = true;
                if (event.pointerType !== "mouse") claimDraw(true);
                return;
              }
            }
            // **Picking listens for the release, not the press**, so a drag in the sub-mode is
            // still an orbit. The pick happens on `pointerup` if the pointer stayed put.
            if (segmentSelect()) {
              segmentPress = { x: event.clientX, y: event.clientY };
              return;
            }
            // A finger or pen aims with the drag, so the camera stands down for the press.
            if (event.pointerType !== "mouse") claimDraw(true);
            drawPress(
              event.clientX,
              event.clientY,
              event.pointerType === "mouse" && event.button === 0,
            );
            return;
          }
          // **Cast to the listener type `pointer()` takes, and not the other way round.**
          // The cast is safe because this listener is on `canvas` and `pointer()` reads
          // `currentTarget` only to take the capture — which is the element that raised the
          // press, because `currentTarget` during a listener *is* the element it is bound to.
          const press = event as PointerEvent & { currentTarget: HTMLElement };
          if (levelEditor.gizmo() === "move") void grabHandle(press);
          else if (levelEditor.gizmo() === "rotate") void grabRing(press);
        };
        canvas.addEventListener("pointerdown", onPointerDown);

        /**
         * The aim, on every move: hover for a mouse, drag for a finger.
         *
         * **One handler for both, because the browser already tells them apart.** A mouse
         * fires `pointermove` while its button is up, so a hover aims; a finger fires it only
         * while touching, so a drag aims. There is nothing here to branch on — branching would
         * be re-deciding something the device has already decided.
         */
        const onPointerMove = (event: PointerEvent): void => {
          if (!drawsInAPlane(levelEditor.tool())) return;
          // **A corner drag moves that corner and nothing else.** The aim is left alone, so the
          // preview segment does not jump to the pointer while a node is being placed.
          if (nodeDrag) {
            const controller = drawLines();
            const plane = controller?.state().plane;
            const ray = rayAtClient(event.clientX, event.clientY);
            const point =
              plane === undefined || ray === undefined
                ? undefined
                : rayPlanePoint(ray, plane);
            if (controller !== undefined && point !== undefined) {
              controller.movePicked(point);
            }
            return;
          }
          // **Picking does not aim**, so a half-drawn draft is left where it was rather than
          // stretching toward a pointer that is choosing a segment to remove.
          if (segmentSelect()) return;
          drawAim(event.clientX, event.clientY);
        };
        canvas.addEventListener("pointermove", onPointerMove);

        takeLevelCamera(levelCameraKind());
        applyEditorInput(true);

        // The canvas, once the editor owns it. Detached on close, because a listener that
        // outlives the editor is a click handler that places a wall with the editor shut.
        const onPointerUp = (event: PointerEvent): void => {
          /**
           * **A release commits nothing, on either device.** On a mouse the commit already
           * happened on the press; on a finger the aim latches and waits for Next, so the
           * readout can be typed into after the finger lifts. This is the one line that makes
           * the touch flow work, and it is deliberately before every other branch. A finger's
           * claim on the camera ends here with it.
           */
          if (drawsInAPlane(levelEditor.tool())) {
            if (nodeDrag) {
              nodeDrag = false;
              claimDraw(false);
              return;
            }
            if (segmentSelect()) {
              const start = segmentPress;
              segmentPress = undefined;
              // A mouse's right button and middle button are navigation, never a pick.
              if (event.pointerType === "mouse" && event.button !== 0) return;
              if (
                start !== undefined &&
                Math.hypot(event.clientX - start.x, event.clientY - start.y) <=
                  6
              ) {
                pickWallSegmentAt(event.clientX, event.clientY);
              }
              return;
            }
            claimDraw(false);
            return;
          }
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          /**
           * **A drag that just ended is not a click.** The gizmo's own drag ends in this
           * same event, so without this the click would place a shape on top of whatever
           * was just moved — or, with the select tool, re-pick and clear the selection of the
           * thing that was moved. Read-and-cleared rather than left set, so the *next*
           * press is a click again.
           */
          if (justDragged) {
            justDragged = false;
            return;
          }
          clickLevelWorld?.(event.clientX, event.clientY);
        };
        canvas.addEventListener("pointerup", onPointerUp);
        // **A taken-back pointer must give the camera back too.** The browser cancels a
        // gesture it decides is its own, and a claim that outlived it would leave a camera that
        // cannot be moved with one finger until the next press.
        const onPointerCancel = (): void => {
          claimDraw(false);
          segmentPress = undefined;
        };
        canvas.addEventListener("pointercancel", onPointerCancel);

        // The pointer lock goes, because a locked pointer delivers every click to the canvas
        // as a click on the crosshair and the editor is trying to read where it landed.
        const releaseLock = input.suspendPointerLock();

        return () => {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerCancel);
          input.setEnabled(true);
          releaseLock();
          attachedLevelCamera?.dispose();
          attachedLevelCamera = undefined;
          // **A claim that outlived its drag would leave a camera that cannot be moved**,
          // so closing the editor with one held — which a press during the frame between
          // the drag starting and the editor closing can arrange — gives it back. The
          // drawing claim is its own and is given back separately.
          claimDraw(false);
          levelCamera().claimGesture(false);
          dragging = false;
          justDragged = false;
          segmentPress = undefined;
          nodeDrag = false;
          levelGhost.hide();
          /** A highlight that outlived the editor would sit on a wall in the running game. */
          selectionOverlay?.hide();
          /** A reference image outlived the editor would sit on the terrain in the running game. */
          imagePlaneOverlay?.setVisible(false);
          /** The air comes back with the game, so the world is hazed as it was. */
          setFogEnabled(true);
          /** And the game's own flat window comes back with its camera. */
          applyWindow();
        };
      });
    });

    viewport.renderer.setAnimationLoop((time: number) => {
      const dt =
        lastTime === 0 ? 1 / 60 : Math.min((time - lastTime) / 1000, MAX_STEP);
      lastTime = time;

      // **The editor owns the frame while it is open.** Everything below this is the game's,
      // and running it would put `placeCamera` and the place's own `onTick` back in charge of
      // a world somebody is in the middle of editing.
      if (levelEditorOpen()) {
        editorFrame(dt);
        return;
      }

      game.tick(dt);

      // ---- The place, on the same frame ----
      //
      // **Moved before the clock, and stepped after it**, which is the order that makes the
      // three answers agree. `movePlayer` sees where the player *is* this frame, so a zone
      // crossed during this frame's movement fires now rather than next; then the clock ticks,
      // so a timer that comes due is measured against the second the player is standing in;
      // then `step` runs, and the effects it dispatches are in the world before `render` is
      // called below. A place therefore never builds something a frame draws without.
      host?.movePlayer(
        game.player.position.x,
        game.player.position.y,
        game.player.position.z,
      );

      // The clock, on the frame's own dt, and the one place the day's lighting is
      // derived. Everything downstream reads this single object: the sky, the clouds,
      // the terrain, the water and the clear colour. They cannot disagree about what
      // hour it is because there is only one answer to ask.
      const light = clock.tick(dt);

      // The clear colour is the sky's horizon colour, which is what the terrain's fog
      // fades to and what the water reflects. One colour, set once, rather than three
      // places that each hold a copy and are each right on a different afternoon.
      host?.step();

      // ---- The crosshair ----
      //
      // **After `game.tick` and after the place has stepped**, because the camera was placed in
      // the first and the world was changed in the second, and a crosshair traced against either
      // of them would be a frame behind the thing it is pointing at. The ray is the camera's own
      // forward direction rather than a rebuilt one from the player's basis, because the camera is
      // what the player sees and can be somewhere else entirely — `/place:open` and `lookAt` both
      // move it without moving the body.
      //
      // **And it is a tint, not a hit.** Nothing is pressed here: the aim only says which figure
      // is under the crosshair, and Phase 4 is what turns a press into a talk or a use.
      if (figures.size > 0) {
        const camera = viewport.camera;
        const forward = camera.getWorldDirection(TMP_FORWARD);
        // **The eye, not the body.** The same correction as `onUse` above; the tint and the
        // use have to answer from one ray, or a prop lights up when aimed at and then refuses
        // the press.
        figures.aim(
          figures.pick(playerEye(game.player), {
            x: forward.x,
            y: forward.y,
            z: forward.z,
          })?.figure.id,
        );
      } else {
        figures.aim(undefined);
      }

      // ---- The lights, once a frame ----
      //
      // **One call, one array, three materials.** The host picks the nearest `MAX_DRAWN_LIGHTS`
      // to the player and the array is shared by reference, so this is a single sort rather than
      // three — and the count is fixed, so a light appearing never rebuilds a shader (ADR 0023).
      //
      // The clouds and the sky are deliberately absent: a cloud is marched through rather than lit
      // at a surface, and there is no surface at the top of the sky to light. ADR 0023 says why.
      const lights =
        host?.visibleLights(game.player.position, MAX_DRAWN_LIGHTS) ?? [];
      material.lights.lights = lights;
      // **Only the game's material, and only when there is one.** `GAME_WATER` is built at
      // module scope because a material is a GL object and building it per frame would be a leak;
      // it is handed to the session as the sea's material only in the game.
      GAME_WATER.material.lights.lights = lights;
      // **The tint material is in the list for the same reason the water is.** It is the
      // material an aimed figure is drawn with, and an aimed figure has to be lit by *this*
      // frame's sun and *this* frame's lanterns — a selection glowing in last frame's light is
      // a selection that cannot be trusted. One assignment, because there is exactly one of it.
      FIGURE_TINT.material.lights.lights = lights;

      // A place that changes its zones mid-step has just redrawn the terrain by way of
      // `geometryChanged`, so the overlay is rebuilt after the step rather than before it —
      // otherwise the boxes trail the world by a frame, which is visible exactly when someone
      // is watching a zone appear.
      zoneLines.update(host?.zoneList ?? []);

      skyColour.set(light.skyColor[0], light.skyColor[1], light.skyColor[2]);
      material.sky.lighting = light;
      material.fog.colour = light.skyColor;
      // **The sea's material gets the same two assignments, every frame** — one material for
      // every water mesh, so this one pair is all of it.
      GAME_WATER.material.sky.lighting = light;
      GAME_WATER.material.fog.colour = light.skyColor;
      // **And so does the tint material, which is the fourth surface sharing this sky.** The
      // whole of ADR 0023's argument is that every lit thing answers from one `SkyLight`, and a
      // figure the player is looking straight at is the most obviously lit thing on screen.
      FIGURE_TINT.material.sky.lighting = light;
      FIGURE_TINT.material.fog.colour = light.skyColor;
      // **The same two assignments the terrain and the water get, every frame.** That is the whole
      // reason the swap is invisible: the globe is lit by this sun and hazed by this air, from the
      // same `SkyLight` and the same `Fog`, so at the altitude the two overlap they cannot disagree
      // about what the light is doing. The globe's own ocean reads the same uniforms the sea's
      // material does, through `render/water-look.ts`.
      if (globe !== null) {
        globe.material.sky.lighting = light;
        globe.material.fog.colour = light.skyColor;
        const at = game.player.position;
        // The player's radius, which is what the fade is a function of. `Math.hypot` rather than a
        // square root of a sum of squares because on a planet this size it is a large coordinate and
        // this is subtracted from a radius to produce a crossover — the kind of number where
        // "about right" is a bug.
        const radius = Math.hypot(at.x, at.y, at.z);
        // **The crossfade, both halves.** `globe.update` writes the globe's own opacity; the chunks
        // get the complement, so at the bottom of the band the terrain is opaque and the globe is
        // gone and at the top it is the other way round. A hard switch would pop and a seam where
        // both are half-present, which is why it is a band at all.
        const shown = globeOpacityAt(radius - WORLD.seaLevel);
        globe.update(radius);
        material.opacity = 1 - shown;
        material.transparent = shown > 0;
        // **Out of the depth buffer while it fades.** A chunk that still wrote depth would occlude
        // the globe behind it even as its own colour faded out, so the two would never overlap
        // cleanly. Opaque again the moment the globe is gone.
        material.depthWrite = shown === 0;
        // **The near-field fog goes out with the chunks, and the atmosphere stays.** The window term
        // exists to hide where the streamed terrain stops, which is meaningless once the globe has
        // taken over — and leaving it on from orbit was what turned the planet into sky. The globe
        // and the sea get the same number so the crossfade cannot show a fog seam either.
        const nearField = 1 - shown;
        material.fog.nearField = nearField;
        GAME_WATER.material.fog.nearField = nearField;
        globe.material.fog.nearField = nearField;
      }

      // A star is sized in CSS pixels, so the dome needs the ratio the canvas is
      // actually drawing at — which the viewport owns and changes on a resize.
      if (sky !== null) sky.material.pixelScale = viewport.pixelRatio;
      sky?.update(game.player.position, light);
      layer?.update(game.player.position, light);
      if (game.underwater !== underwater()) setUnderwater(game.underwater);
      viewport.render();

      if (time - lastReadout > READOUT_INTERVAL_MS) {
        lastReadout = time;
        setStats(session.stats());
        setHistory({ undo: sculpt.undoDepth, redo: sculpt.redoDepth });
      }
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      setCommander(null);
      stopLock();
      stopSuspension();
      detachInput();
      sky?.dispose();
      // **The place before the session.** A `dropPlace` touches `sculpt.places` and re-meshes
      // through `refreshPlaces`, and `session.dispose()` is about to take away the very field
      // that reads them — so the order is the one that lets both finish.
      dropPlace();
      zoneLines.dispose();
      // **The bakes before their meshes.** A bake disposed of after the mesh it was going to
      // build is a worker left running for the life of the tab, and one that answers after
      // teardown adds a mesh to a scene nobody owns.
      for (const bake of cloudBakes) bake.dispose();
      cloudBakes.length = 0;
      dropFarField();
      session.dispose();
      viewport.dispose();
    };
  });

  return (
    <div class={styles.root}>
      <canvas ref={canvas} class={styles.canvas} />
      {/* The picker `/place:open` clicks. `display: none` rather than visually hidden,
          and it is here rather than inside the console because a file dialog is not a
          text field and giving the terminal two of its own would be worse. */}
      <input
        // **The setter, not the getter.** A ref hands its element to the function it is given,
        // and `placePicker` is an accessor that takes no arguments — so `ref={placePicker}` was
        // called with the element and ignored it, the signal stayed `undefined` forever, and
        // every open (the console's and the editor's) reported that this build had no picker.
        ref={setPlacePicker}
        type="file"
        accept={PLACE_MIME_TYPE}
        style={{ display: "none" }}
      />
      {/* Not while the pointer lock is merely suspended — the console has taken
          it, so "click to play" would be inviting a click at a moment when the
          world is already being played. */}
      <Show when={isGame() && !coarse() && !locked() && !suspended()}>
        <div
          style={{
            position: "absolute",
            inset: "0",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            color: "rgba(255,255,255,0.85)",
            "font-size": "18px",
            "pointer-events": "none",
            "text-shadow": "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          Click to play — left digs, right places
        </div>
      </Show>
      <Show when={isGame()}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "14px",
            height: "14px",
            margin: "-7px 0 0 -7px",
            "pointer-events": "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "6px",
              top: "0",
              width: "2px",
              height: "14px",
              background: "rgba(255,255,255,0.8)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "0",
              top: "6px",
              width: "14px",
              height: "2px",
              background: "rgba(255,255,255,0.8)",
            }}
          />
        </div>
        <Show when={underwater()}>
          <div
            style={{
              position: "absolute",
              inset: "0",
              background: "rgba(26, 89, 140, 0.45)",
              "pointer-events": "none",
            }}
          />
        </Show>
        {/* ---- What a place said ----
         *
         * `pointer-events: none` on both, because this sits over the crosshair and a place
         * that logs every tick must not stop the player being able to play. */}
        <Show when={placeBanner()}>
          {(message) => (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "calc(50% + 48px)",
                transform: "translateX(-50%)",
                padding: "6px 12px",
                "border-radius": "4px",
                background: "rgba(180, 60, 40, 0.85)",
                color: "#fff",
                "font-size": "12px",
                "font-family": "monospace",
                "pointer-events": "none",
                "white-space": "pre-wrap",
              }}
            >
              {message()}
            </div>
          )}
        </Show>
        <Show when={placeToast()}>
          {(text) => (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "72px",
                transform: "translateX(-50%)",
                padding: "8px 14px",
                "border-radius": "4px",
                background: "rgba(20, 24, 30, 0.85)",
                color: "#e6edf3",
                "font-size": "13px",
                "font-family": "monospace",
                "pointer-events": "none",
              }}
            >
              {text()}
            </div>
          )}
        </Show>
        <PlaceOverlay
          narration={narration}
          dialog={placeDialog}
          ending={placeEnding}
          onChoose={(entityId, option) => placeHost?.choose(entityId, option)}
          onRestart={() => {
            const again = loadedForRestart;
            const start = restartPlace;
            if (again === undefined || start === undefined) return;
            // **`void`, deliberately: the report goes to the console** like every other load,
            // and the ending panel is already gone by the time this resolves because
            // `startPlace` drops the place first. A failure here lands in `/place:notices`
            // rather than on a screen nobody is looking at any more.
            // **Passed straight back**, including the world — so a place restarted on a flat
            // world is restarted on a flat world, and there is no second code path for the
            // button to disagree with the load that preceded it.
            void start(again);
          }}
          suspendPointerLock={() => input.suspendPointerLock()}
        />
        <Show when={coarse()}>
          <TouchControls input={input} />
        </Show>
      </Show>
      <header class={styles.header}>
        <h1 class={styles.title}>spacescape</h1>
        <p class={styles.subtitle}>
          <Show
            when={spike()}
            fallback={
              <Show
                when={edit()}
                fallback="Game — first-person mountains, dig and place"
              >
                Phase 4 — chunked surface nets, streamed in workers
              </Show>
            }
          >
            Phase 0 spike — renderer, packed vertices, sampler3D
          </Show>
        </p>
        <Show when={statusVisible()}>
          <dl class={styles.readout}>
            <div class={styles.row}>fragment precision: {precisionText()}</div>
            <div class={styles.row}>
              vertex layout: float32x3 + snorm16x2 + unorm8x4 = {VERTEX_BYTES} B
            </div>
            <div class={styles.row}>
              level of detail:{" "}
              {bands() === undefined
                ? "default (full within 1 chunk, coarse within 2)"
                : describeBands(bands() as LodBands)}
            </div>
            <Show when={isGame()}>
              <div class={styles.row}>
                clouds: {describeCloudStatus(cloudStatus())}
              </div>
              {/* The globe is only visible from a long way up, so its state is reported whether or
                not anybody is looking at it: a planet that never arrives and a planet that arrives
                wrong are otherwise the same picture — sky. */}
              <div class={styles.row}>
                globe: {describePlanetBakeStatus(planetBake())}
              </div>
            </Show>

            <Show when={spikeCounts()}>
              {(counts) => (
                <div class={styles.row}>
                  vertices: {counts().sphere} sphere, {counts().box} box
                </div>
              )}
            </Show>

            <Show when={stats()}>
              {(value) => (
                <>
                  <div class={styles.row}>
                    chunks: {value().filled}/{value().chunks} filled,{" "}
                    {value().drawn} drawn
                  </div>
                  <div class={styles.row}>
                    triangles: {value().triangles.toLocaleString()} · workers:{" "}
                    {value().busy} busy, {value().pending} pending,{" "}
                    {value().queued} queued
                  </div>
                  {/* **The sea's own count, and only where there is a sea.** The total above adds
                    the two surfaces together, which cannot tell a coast from a mountain range —
                    and the sea is the one new enough to be worth watching while it streams. */}
                  <Show when={isGame()}>
                    <div class={styles.row}>
                      water: {value().waterFilled} chunks,{" "}
                      {value().waterTriangles.toLocaleString()} triangles
                    </div>
                  </Show>
                  <Show when={history().undo > 0 || history().redo > 0}>
                    <div class={styles.row}>
                      history: {history().undo} undoable, {history().redo}{" "}
                      redoable
                    </div>
                  </Show>
                </>
              )}
            </Show>
          </dl>
        </Show>
        <p class={styles.hints}>
          <Show
            when={!spike()}
            fallback={
              <>
                drag or right-drag to orbit · shift-drag or middle-drag to pan ·
                wheel or pinch to dolly · <a href="?">game</a>
              </>
            }
          >
            <Show
              when={edit()}
              fallback={
                <>
                  WASD move · mouse look · space jump · left digs · right places
                  · ctrl-z undo · / for commands · <a href="?edit">editor</a> ·{" "}
                  <a href="?spike">spike</a>
                </>
              }
            >
              drag to sculpt · right-drag to orbit · shift-drag to pan · ctrl-z
              undo · <a href="?">game</a> · <a href="?spike">spike</a>
            </Show>
          </Show>
        </p>
      </header>
      {/* Last, so it paints over the crosshair and the click-to-play prompt
          without either needing a z-index of its own. The game scene only: its
          commands are the player's, and an editor with no player to fly would
          be a console of usage errors. */}
      <Show when={isGame()}>
        <PlaceDocs
          open={docsOpen()}
          onClose={() => setDocsOpen(false)}
          input={input}
        />
        {/*
          The level editor, over the running world.

          **Inside the app rather than inside the console**, because it is not a panel: it
          pins the canvas into a pane of its own and the panels hang off that. Mounted only
          while it is open, so its listeners and its input suspension exist exactly as long
          as it is on screen.
        */}
        <Show when={levelEditorOpen()}>
          <LevelEditorOverlay
            editor={levelEditor}
            canvas={canvas}
            models={levelModels()}
            /**
             * **Only with a place open**, because that is the only thing there is to attach it
             * to. With no place the button is not disabled — it is absent, since a greyed-out
             * button next to a question nobody asked is worse than no button.
             */
            canAttach={placeOpen()}
            onAttach={attachLevelFromEditor}
            onClose={() => setLevelEditorOpen(false)}
            imagePlane={imagePlane}
            onChooseImage={(file) => chooseReferenceImage?.(file)}
            onEditWalls={beginEditWalls}
            onEditOutline={beginEditOutline}
          />
          <Show when={levelEditor.coarsePointer()}>
            <LevelEditorTouchControls
              selecting={() => levelEditor.tool() === "select"}
              onToggleSelect={toggleSelect}
              onApply={() => {
                // **The centre of the canvas**, because there is no pointer: under a
                // first-person camera the crosshair is the aim, and that is where the
                // player would have clicked.
                const box = canvas.getBoundingClientRect();
                clickLevelWorld?.(
                  box.left + box.width / 2,
                  box.top + box.height / 2,
                );
              }}
            />
          </Show>
          {/*
            **The draw controls, only while the walls tool is on.** They carry the flow's own
            acts — Next, Undo point, New line, Finish, and the direction locks — so a person
            drawing a wall has them under the thumb whether they are on a phone or a laptop.
          */}
          <Show when={drawsInAPlane(levelEditor.tool())}>
            <DrawLinesUi
              controller={drawLines}
              onFinish={finishDrawing}
              floor={levelEditor.tool() === "floor"}
              editing={editingDrawId() !== undefined}
              segmentSelect={segmentSelect}
              onToggleSegmentSelect={() => {
                setPickedSegment(undefined);
                setSegmentSelect((on) => !on);
              }}
              segmentPicked={pickedSegment() !== undefined}
              onDeleteSegment={deletePickedSegment}
            />
          </Show>
          <LevelEditorHint
            cameraKind={levelCameraKind}
            coarsePointer={levelEditor.coarsePointer}
            tool={levelEditor.tool}
          />
        </Show>
        <PlacesBrowser
          open={browserOpen()}
          onClose={() => setBrowserOpen(false)}
          library={placeLibrary}
          accountDid={account.account()?.did ?? null}
          resolveHandle={(did) => account.resolveHandle(did)}
          onPlay={async (place) => {
            await openPublished?.(place);
          }}
          input={input}
        />
        <Console
          terminal={terminal}
          input={input}
          editor={{
            open: editorOpen,
            setOpen: setEditorOpen,
            content: () => {
              const Panel = placeEditorPanel();
              return Panel === null ? (
                <p class="place-loading">loading the editor…</p>
              ) : (
                <Panel
                  state={placeEditor}
                  onRun={runEditedPlace}
                  onPublish={publishEditedPlace}
                  onStatus={terminal.print}
                  // **Read through the holder rather than closed over directly.** The header is
                  // rendered from the application root and the loader belongs to the game
                  // branch, so this is the seam that lets both use one implementation.
                  onOpen={() =>
                    openPlaceOnDisk?.() ??
                    Promise.resolve(
                      "the world is still loading — try again shortly",
                    )
                  }
                  onAttachLevelFromEditor={attachLevelFromEditor}
                  onOpenLevelInEditor={openLevelInEditor}
                  onClose={() => setEditorOpen(false)}
                />
              );
            },
            run: runEditedPlace,
          }}
        />
      </Show>
    </div>
  );
}
