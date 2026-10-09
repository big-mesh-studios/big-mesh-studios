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

import { createMemo, createSignal, onSettled, Show } from "solid-js";
import {
  Color,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from "@random-mesh/rmsl/scene";

import { Console, createConsole, type ConsoleState } from "./console/console";
import { createCommands, type Commander } from "./console/commands";
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
import {
  baseFieldFor,
  DEFAULT_CAVES,
  DEFAULT_PLANET,
  DEFAULT_TERRAIN,
  seaLevelOf,
} from "@big-mesh-studios/csg";
import type { BaseFieldSpec } from "@big-mesh-studios/csg";
import { LOD_OFF, lodIsOff, type LodBands } from "./world";
import { SculptSession } from "./sculpt";
import { DEFAULT_BRUSH } from "./edit/brush";
import { buildSpikeScene, type SpikeScene } from "./spike-scene";
import { createInput } from "./player/input";
import {
  DEFAULT_PLAYER_CONFIG,
  playerEye,
  type Medium,
} from "./player/player";
import { TouchControls } from "./player/touch-controls";
import { Game } from "./engine/game";
import { createWaterMaterial, sphericalWater } from "./world/water";
import { sphericalFrame } from "./world/up";
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

/** The largest step a frame is allowed to advance the world, in seconds. */
const MAX_STEP = 0.05;

const searchHas = (flag: string): boolean =>
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).has(flag);

const isSpike = (): boolean => searchHas("spike");
const isEdit = (): boolean => searchHas("edit");
const isGame = (): boolean => !isSpike() && !isEdit();

/**
 * The world's base field, physics frame and sea — one planet, and no switch.
 *
 * **There was a `?flat` mode here and it is gone**, along with the two things that existed only to
 * serve it: the sea's `level` variant and the water plane. The flag had a real cost that was easy to
 * forget — a spherical frame with a sea at an altitude is an ocean at an infinite radius, and a flat
 * frame with a sea radius is no ocean at all, because a flat frame's `radiusAt` is `Infinity`. Both
 * are silent, and both would have been found by a player rather than by a test. With one world there
 * is no pair to get wrong.
 *
 * `flatFrame` itself stays, and `Frame` stays an abstraction: a flat frame is its infinite-radius
 * case, and `player.test.ts` runs the player against it as the control the spherical frames are
 * compared to. Dropping the simplest case of an abstraction would weaken the suite, not shrink it.
 */
const GAME_BASE_FIELD: BaseFieldSpec = {
  kind: "planet",
  // **`DEFAULT_PLANET` spread rather than used whole**, and the caves are the reason. A default
  // planet with caves in it cannot state any property of its *surface* — `∂f/∂r` is exactly 1 and
  // a normal's radial component is exactly 1, and both stop being true within a few units of a
  // cave — so `planet.test.ts` would lose three of its own correctness checks. The library's
  // default stays the plain planet; the game's world says what it wants.
  //
  // **Why this world has caves at all.** A planet here is 272,000 units across with a 1,280-unit
  // horizon, so a player sees nothing but the ground under a sky with no depth to it. The caves
  // are the only thing underfoot that is not sky, and they are what gives a shaft somewhere to
  // go. A height field's caves can be optional because a landscape is already three-dimensional;
  // a sphere's surface is not.
  params: { ...DEFAULT_PLANET, caves: DEFAULT_CAVES },
};
const GAME_FRAME = sphericalFrame({ x: 0, y: 0, z: 0 });

/**
 * The landscape, built once here for the questions only the main thread asks.
 *
 * **A second copy of the field the workers build, and the reason that is acceptable is
 * ADR 0009's**: both sides build it from the same numbers, so they cannot disagree. This
 * one exists because the player's collision and the water predicate both ask per frame, and
 * a field they cannot reach without building it would mean a message per query.
 */
const GAME_LANDSCAPE = baseFieldFor(GAME_BASE_FIELD)!;

/**
 * The landscape without its caves, which is what "is this water" has to ask.
 *
 * **A second field over the same spec, not a rebuilt one.** `baseFieldFor` is called once and the
 * result carries both answers on it, so there is no second construction to keep in step and
 * nothing for ADR 0009's two-threads-must-agree rule to catch: the mesher's gate and this
 * predicate are handed *the same function object*.
 *
 * **Why two answers are needed at all.** `GAME_LANDSCAPE(p) > 0` means "outside material", and a
 * cave is material with a hole in it — so its air reads as outside material and a cave below sea
 * level reported the player as swimming, in a place the sea's mesh never reaches. The sea exists
 * only in a shell at its own level; everything below that and outside material is rock the sea has
 * not reached, and a deep cave is exactly that. `GAME_GROUND(p) > 0` means "not underground",
 * which a cave never satisfies, and it is the same question the water mesher's gate now asks.
 */
const GAME_GROUND: (x: number, y: number, z: number) => number =
  GAME_LANDSCAPE.ground ?? ((x, y, z) => GAME_LANDSCAPE(x, y, z));

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
 * `sphericalWater` because the base field is a planet, and a height field's sea would face
 * `+Y` instead. That is a property of the landscape, which is why it is passed rather than
 * read out of the radius.
 */
const GAME_WATER = { material: createWaterMaterial(sphericalWater) };

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
 * The altitude or radius water settles at, read from the landscape rather than repeated.
 *
 * **`seaLevelOf` and not `DEFAULT_PLANET.radius`, because this is the one place a caller
 * used to restate a number the world already carried** — and a number restated is a number
 * that can disagree. Every worker builds the same sea from the same spec (ADR 0009), so
 * reading it here is reading the same value they do.
 */
const GAME_SEA = seaLevelOf(GAME_BASE_FIELD);

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
 * The physics asked the same question before with `radiusAt < seaRadius && !getSolidAt`,
 * and the difference is `getSolidAt`, which asks the *edited* model. That mismatch is what
 * would otherwise let a player swim down a dry shaft.
 */
const inSea = (p: { x: number; y: number; z: number }): boolean => {
  if (GAME_FRAME.spherical && GAME_FRAME.radiusAt(p) >= GAME_SEA) return false;
  if (!GAME_FRAME.spherical && p.y >= GAME_SEA) return false;
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
  | { readonly state: "failed"; readonly reason: string };

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
  let loadedForRestart:
    | {
        files: PlaceFiles;
        entry: string;
        seed: number;
        name: string;
        spawn?: PlaceSpawn;
        models?: Readonly<Record<string, Uint8Array>>;
      }
    | undefined;
  /**
   * The hidden file input `/place:open` clicks.
   *
   * **A signal rather than a document query, because the console owns its own input** and a
   * command reaching into the DOM for a second one would be a second, unowned text field. It is
   * `display: none` — not visually hidden — because a file input that is laid out and empty is a
   * box on the screen saying nothing about what it is for.
   */
  const [placePicker] = createSignal<HTMLInputElement>();
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
   */
  let placeHost: PlaceHost | undefined;
  let startPlace:
    | ((
        files: PlaceFiles,
        entry: string,
        seed: number,
        name: string,
        spawn?: PlaceSpawn,
        models?: Readonly<Record<string, Uint8Array>>,
      ) => Promise<string>)
    | undefined;

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
    const sky = isGame() ? createSky(viewport.scene) : null;

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
      baseField: GAME_BASE_FIELD,
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
      seaRadius: GAME_SEA,
      // Where the sea is, as it is meshed rather than as the sea level alone would say.
      waterAt: inSea,
      frame: GAME_FRAME,
      // The spawn probe has to start inside the planet. The sea radius is within a few units of
      // the surface everywhere, so it is a good enough probe and needs no number of its own.
      spawnRadius: GAME_SEA - 200,
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
    const planetMaps = bakePlanetMapsOffThread(
      DEFAULT_PLANET,
      GLOBE_MAP_WIDTH,
      GLOBE_MAP_HEIGHT,
    );
    let globe: Globe | null = null;
    let globeDisposed = false;

    void planetMaps.maps.then(
      (maps) => {
        if (globeDisposed) return;
        try {
          globe = createGlobe(viewport.scene, maps);
          setPlanetBake({
            state: "ready",
            maps:
              planetMaps.source() === "main thread" ? "main thread" : "worker",
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
        setPlanetBake({
          state: "failed",
          reason: reason instanceof Error ? reason.message : String(reason),
        });
      },
    );

    const cloudBake = bakeCloudFieldOffThread(DEFAULT_TERRAIN.seed);
    let layer: CloudLayer | null = null;
    let cloudsDisposed = false;

    void cloudBake.field.then(
      (field) => {
        // Between the field being baked and this running, the scene can have been torn
        // down — and a mesh added to a disposed scene is a leak with no owner.
        if (cloudsDisposed) return;
        try {
          layer = createCloudLayer(
            viewport.scene,
            DEFAULT_TERRAIN.seed,
            field,
            GAME_SEA,
          );
          const source = cloudBake.source();
          setCloudStatus({
            state: "ready",
            field: source === "main thread" ? "main thread" : "worker",
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
        setCloudStatus({
          state: "failed",
          reason: reason instanceof Error ? reason.message : String(reason),
        });
      },
    );
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

      const report = await startPlace(
        place.files,
        place.entry,
        place.manifest.seed,
        place.manifest.name,
        place.manifest.spawn,
        // **The bytes the loader already carried.** Phase 1 put `models` in the manifest and
        // the loader read them, and the one thing it did not do was hand them to anything —
        // which made a whole field of the format decorative. This is where it stops being that.
        place.models,
      );
      return report.startsWith("could not load")
        ? report
        : `opened ${place.manifest.name}\n${report}`;
    };

    const dropPlace = (): void => {
      host?.dispose();
      host = undefined;
      placeHost = undefined;
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
        seaRadius: GAME_SEA,
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
     */
    const startPlace = async (
      files: PlaceFiles,
      entry: string,
      seed: number,
      name: string,
      spawn?: PlaceSpawn,
      /** Models this place stands its props and NPCs out of. See `model-library.ts`. */
      models?: Readonly<Record<string, Uint8Array>>,
    ): Promise<string> => {
      // **Dropped before the new one is built, not after.** Two places at once would both
      // write into one registry, and the operation indices from the first would be spent under
      // the second's fold order.
      dropPlace();

      // **Remembered, so the ending's "play again" can mean something.** This is the same
      // argument `startPlace` takes, passed straight through — so restarting is calling this
      // function again with the values it was called with, and there is no second code path for
      // it to disagree with the first. Set before anything can fail, so a place that fails to
      // load is still restartable into the same failure rather than into nothing.
      loadedForRestart = { files, entry, seed, name, spawn, models };

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

      // **Annotated, because the initializer now mentions `next`.** `mediumAt` below closes over
      // `next.mediumAt` so that a script's top-level code can ask what field it is standing in,
      // and without the annotation TypeScript cannot infer a value from an initializer that
      // refers to the value — it gives up and says `any`, which then loses every narrowing the
      // rest of this function depends on.
      const next: PlaceHost = new PlaceHost({
        files,
        entry,
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
      return startPlace(
        demo.files,
        demo.entry,
        DEFAULT_TERRAIN.seed,
        demo.id,
        demo.spawn ?? [0, groundHeightAt(0, 0) + half + 1, 0],
        // **A demo's models are URLs and are fetched here rather than at module scope**, so a
        // demo with none costs nothing to open and a model that is not there costs a notice
        // rather than a thrown 404.
        demo.models === undefined
          ? undefined
          : await loadDemoModels(demo.models),
      );
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
      return startPlace(
        project.scripts,
        project.manifest.entry,
        project.manifest.seed,
        project.manifest.name,
        project.manifest.spawn,
      );
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
      startPlace(
        project.scripts,
        project.manifest.entry,
        project.manifest.seed,
        project.manifest.name,
        project.manifest.spawn,
      );

    // The console's commands are the game's own methods by another name, so the
    // game is what they are built over. It exists here, and nowhere earlier,
    // which is why the table can only be built now.
    setCommander(
      createCommands({
        setFlying: (flying) => game.setFlying(flying),
        setNoClip: (noclip) => game.setNoClip(noclip),
        toSpace: (altitude) => game.placeInSpace(altitude),
        clock,
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
            if (value !== undefined) layer.setQuality(value);
            return `quality ${layer.quality}`;
          },
          state: () =>
            layer === null
              ? `no cloud layer yet — ${describeCloudStatus(cloudStatus())}`
              : `built | quality ${layer.quality} | coverage ${layer.material.coverage.toFixed(3)} | density ${layer.material.density.toFixed(3)} | ${describeCloudStatus(cloudStatus())}`,
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
    viewport.renderer.setAnimationLoop((time: number) => {
      const dt =
        lastTime === 0 ? 1 / 60 : Math.min((time - lastTime) / 1000, MAX_STEP);
      lastTime = time;
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
        const shown = globeOpacityAt(radius - GAME_SEA);
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
      cloudsDisposed = true;
      cloudBake.dispose();
      layer?.dispose();
      // **The globe before the scene it is in.** `session.dispose` clears the scene, so a globe
      // disposed after it has no geometry left to remove — and the flag stops a bake that lands
      // after teardown from adding a mesh nobody owns.
      globeDisposed = true;
      globe?.dispose();
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
        ref={placePicker}
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
            const start = startPlace;
            if (again === undefined || start === undefined) return;
            // **`void`, deliberately: the report goes to the console** like every other load,
            // and the ending panel is already gone by the time this resolves because
            // `startPlace` drops the place first. A failure here lands in `/place:notices`
            // rather than on a screen nobody is looking at any more.
            void start(
              again.files,
              again.entry,
              again.seed,
              again.name,
              again.spawn,
              again.models,
            );
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
