import {
  Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  onSettled,
  Show,
} from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import styles from "./App.module.css";
import { createPlaceLibrary } from "./atproto/places";
import { builtinDemo, loadBuiltinDemo } from "./places/demos";
import { DEFAULT_WORLD_URL, placeAtUri, type PlaceMode } from "./places/place";
import { readPlaceProject, type PlaceProject } from "./places/project";
import { compilePlacePlan, planRegionAround } from "./places/plan";
import { DEFAULT_TERRAIN, type TerrainConfig } from "./world/noise";
import type { Dim3 } from "./world/level-data";
import type { StructurePlan } from "./world/structure-fill";
import type { PlaceBoot } from "./voxelscape/create-voxelscape";
import CoarseControls from "./ui/CoarseControls";
// `Console` is the whole scripting surface — the terminal, and, once
// `/place:editor` runs, the place editor's content grown into the same
// panel alongside it (see `PlaceEditorContent`, rendered from inside it).
import { Console, createConsole } from "./ui/Console";
import { DialogOverlay } from "./ui/Dialog";
import { EditHud } from "./ui/EditHud";
import { HealthHud } from "./ui/HealthHud";
import { StatsToast } from "./ui/StatsToast";
import { LoadingScreen, LoadingToast } from "./ui/LoadingScreen";
import { createToasts, Toast } from "./ui/Toasts";
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import { createVoxelscape } from "./voxelscape/create-voxelscape";
import {
  useVoxelscape,
  VoxelscapeContext,
} from "./voxelscape/voxelscape-context";

/** How long a line the world reports on its own is left on screen. */
const NOTICE_SECONDS = 6;

/**
 * The account and place name that plays at the site's own root address —
 * so what the default world is, and who it's owned by, is a place like any
 * other rather than terrain baked into the app itself.
 */
const HOME_PLACE_HANDLE = "bigmesh.eurosky.social";
const HOME_PLACE_NAME = "home";

/**
 * How the world is built this session: always a published place's world —
 * the address bar's own, or `HOME_PLACE_HANDLE`/`HOME_PLACE_NAME`'s when the
 * address bar names none — except when that place can't be reached, which
 * falls back to a procedural world with every field below left unset.
 */
interface LaunchConfig {
  /** A place's terrain seed; omitted only on the fallback procedural world. */
  terrain?: TerrainConfig;
  /** A place's spawn point; omitted only on the fallback procedural world. */
  spawn?: Dim3;
  /** The structures a place's script asks the filler to stamp into every chunk. */
  structures?: StructurePlan;
  /** The place's scripts to run from boot; omitted only on the fallback procedural world. */
  place?: PlaceBoot;
  /**
   * How this place handles other players and their edits; omitted on the
   * fallback procedural world and for a place published before modes
   * existed, both of which keep today's behaviour rather than being
   * migrated onto one.
   */
  mode?: PlaceMode;
  /**
   * What this world is, for scoping multiplayer and edits to it: a place's
   * `at://` address, a demo's own synthetic address, or omitted only on the
   * fallback procedural world (which stays in the one unscoped pool it
   * always has).
   */
  placeUri?: string;
  /** One line about how this world was chosen, toasted once it exists. */
  notice?: string;
}

const World: Component<{
  launch: LaunchConfig;
  navigate: (to: string) => void;
}> = (props) => {
  let hud: HTMLDivElement | undefined;

  const [notice, setNotice] = createSignal<string>();

  const coarsePointer = createMediaQuery("(any-pointer: coarse)");
  const toasts = createToasts();
  const voxelscape = createVoxelscape({
    terrain: props.launch.terrain,
    spawn: props.launch.spawn,
    structures: props.launch.structures,
    place: props.launch.place,
    mode: props.launch.mode,
    placeUri: props.launch.placeUri,
    chunkRadius: radiusInUrl(),
    antialias: antialiasInUrl(),
    navigate: props.navigate,
    onDebugStats: (line) => {
      if (hud !== undefined) {
        hud.textContent = line;
      }
    },
    onNotice: (line) => {
      setNotice(line);
      // Nobody has the console open when the world reports its atproto state,
      // so the same line is put where it can be read without opening it.
      toasts.show(() => line, NOTICE_SECONDS * 1000);
    },
  });

  // A line the boot decided on — the place joined, or why that failed — goes
  // out once the world exists to hold it.
  onSettled(() => {
    if (props.launch.notice !== undefined) {
      toasts.show(() => props.launch.notice!, NOTICE_SECONDS * 1000);
    }
  });

  onCleanup(voxelscape.dispose);

  // The one terminal `Console` renders, whether or not the place editor is
  // open, so a command's history and output are never split across two
  // independent scrollbacks.
  const terminal = createConsole({
    onCommand: (line) => voxelscape.commands.run(line),
    commands: () => voxelscape.commands.help(),
    notice,
  });

  return (
    <VoxelscapeContext value={voxelscape}>
      <div class={styles.container}>
        {/* A canvas holds the sample count its drawing context was made with
            for the whole life of that context, so the only way to turn
            multisampling on or off is to throw the canvas away and mount the
            world onto a new one. Keying the list on the setting is what does
            that: the same value keeps the canvas, a changed one replaces it. */}
        <For each={[voxelscape.multisampling()]}>{() => <WorldCanvas />}</For>
        <Show when={coarsePointer()}>
          <CoarseControls />
        </Show>
        <EditHud />
        <HealthHud />
        <DialogOverlay />
        <EndingOverlay />
        <LoadingScreen />
        <Console terminal={terminal} />
        <toasts.Stack>
          <Show when={voxelscape.showStats()}>
            <Toast>
              <StatsToast />
            </Toast>
          </Show>
          <Show when={voxelscape.debugPerf()}>
            <Toast>
              <div
                ref={(el) => {
                  hud = el;
                }}
                class={styles["debug-perf"]}
              />
            </Toast>
          </Show>
          <LoadingToast />
        </toasts.Stack>
      </div>
    </VoxelscapeContext>
  );
};

/**
 * The world's drawing surface, mounted when it appears and unmounted when it
 * goes. Kept apart from the rest of the world's markup because it is replaced
 * whenever multisampling changes, and everything else on screen stays.
 */
const WorldCanvas: Component = () => {
  const voxelscape = useVoxelscape();
  let canvas!: HTMLCanvasElement;
  onSettled(() => voxelscape.mount(canvas));
  return (
    <canvas
      ref={(element) => {
        canvas = element;
      }}
      class={styles.canvas}
      {...voxelscape.input.canvasHandlers}
    />
  );
};

/** The screen a place's script shows when its game ends, with a way to start over. */
const EndingOverlay: Component = () => {
  const voxelscape = useVoxelscape();
  return (
    <Show when={voxelscape.ending() !== null}>
      <div class={styles.ending} role="dialog" aria-label="ending">
        <div class={styles["ending-panel"]}>
          <h1 class={styles["ending-title"]}>{voxelscape.ending()!.title}</h1>
          <p class={styles["ending-text"]}>{voxelscape.ending()!.text}</p>
          <button
            class={styles["ending-button"]}
            onClick={() => voxelscape.restart()}
          >
            Play again
          </button>
        </div>
      </div>
    </Show>
  );
};

/** What shows while a place address is resolving, if it ever takes a moment. */
const Joining: Component<{ line: string }> = (props) => (
  <div class={styles.container}>
    <div class={styles.joining}>{props.line}</div>
  </div>
);

/**
 * Whether the address bar turns multisampling off, or undefined when it says
 * nothing. A benchmark measures the world both ways: the multisampled canvas is
 * the largest thing the page holds on a phone's graphics card.
 */
const antialiasInUrl = (): boolean | undefined => {
  const asked = new URLSearchParams(window.location.search).get("antialias");
  if (asked === null) {
    return undefined;
  }
  return asked !== "0" && asked !== "false";
};

/**
 * The chunk window's horizontal radius the address bar asks for, or undefined
 * when it asks for none. A benchmark run trades window size for how long the
 * first fill takes, so it names the radius it wants to measure at.
 */
const radiusInUrl = (): number | undefined => {
  const asked = new URLSearchParams(window.location.search).get("radius");
  if (asked === null) {
    return undefined;
  }
  const radius = Number(asked);
  return Number.isInteger(radius) && radius >= 1 && radius <= 8
    ? radius
    : undefined;
};

const App: Component<{}> = () => {
  const [launch, setLaunch] = createSignal<LaunchConfig | null>(null);
  const [joiningLine, setJoiningLine] = createSignal("joining world…");

  const places = createPlaceLibrary();
  // Which of `src/routes.tsx`'s routes matched: `id` for `/demos/:id`,
  // `handle`/`worldName` for `/:handle/:worldName`, all undefined on `/`.
  const params = useParams<{
    id?: string;
    handle?: string;
    worldName?: string;
  }>();

  const routerNavigate = useNavigate();
  // Bumped on every `navigate` call, whatever address it is given — the
  // router itself treats navigating to the address already showing as
  // nothing to do, which would otherwise leave `/place:demo` unable to
  // restart the demo already running. The boot effect below tracks this
  // alongside `params`, so either changing boots the world again.
  const [bootGeneration, setBootGeneration] = createSignal(0);
  const navigate = (to: string): void => {
    setBootGeneration((n) => n + 1);
    routerNavigate(to);
  };

  /**
   * Builds the world a place project describes: its terrain seed, spawn, the
   * structure plan its script compiles, and the scripts themselves. `placeUri`
   * identifies the place itself (an `at://` address, or a demo's synthetic
   * one) for scoping multiplayer and edits to it, distinct from the terrain
   * seed a script or a coincidence could share with an unrelated place.
   */
  const buildLaunch = async (
    project: PlaceProject,
    source: string,
    placeUri: string,
  ): Promise<LaunchConfig> => {
    const entry = project.manifest.scripts?.[0];
    if (entry === undefined) {
      return {
        terrain: { ...DEFAULT_TERRAIN, seed: project.manifest.seed },
        spawn: project.manifest.spawn,
        mode: project.manifest.mode,
        placeUri,
        notice: `${source} names no scripts — playing its terrain`,
      };
    }
    let structures: StructurePlan | undefined;
    let planNote = "";
    try {
      structures = await compilePlacePlan({
        files: project.scripts,
        entry,
        models: project.models,
        seed: project.manifest.seed,
        region: planRegionAround(project.manifest.spawn),
      });
      planNote = ` · ${structures.length} structure shape(s)`;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      planNote = ` · its plan did not compile (${detail})`;
    }
    return {
      terrain: { ...DEFAULT_TERRAIN, seed: project.manifest.seed },
      spawn: project.manifest.spawn,
      structures,
      place: {
        files: project.scripts,
        entry,
        seed: project.manifest.seed,
        models: project.models,
      },
      mode: project.manifest.mode,
      placeUri,
      notice: `${source}${planNote}`,
    };
  };

  // Boots the world the address bar names, and reboots it whenever that
  // address — or `bootGeneration`, on a `navigate` to the address already
  // showing — changes. A boot a newer one has superseded is left to finish
  // on its own time rather than cancelled outright, but is kept from
  // overwriting what the newer one decides.
  createEffect(
    () => ({
      demoId: params.id,
      handle: params.handle,
      worldName: params.worldName,
      generation: bootGeneration(),
    }),
    ({ demoId, handle, worldName }) => {
      let current = true;
      setLaunch(null);
      setJoiningLine("joining world…");

      void (async () => {
        if (demoId !== undefined) {
          const demo = builtinDemo(demoId);
          if (demo === null) {
            if (current) {
              setLaunch({
                notice: `there is no demo "${demoId}" — /place:demos lists them`,
              });
            }
            return;
          }
          if (current) {
            setJoiningLine(`opening "${demo.manifest.name}"…`);
          }
          try {
            const config = await buildLaunch(
              await loadBuiltinDemo(demo),
              `playing the demo "${demo.manifest.name}"`,
              `${DEFAULT_WORLD_URL}#/demos/${demo.id}`,
            );
            if (current) {
              setLaunch(config);
            }
          } catch (error) {
            const detail =
              error instanceof Error ? error.message : String(error);
            if (current) {
              setJoiningLine(`could not open the demo — ${detail}`);
              setLaunch({ notice: `could not open the demo (${detail})` });
            }
          }
          return;
        }

        // No address bar params names the site's own home place, not a
        // hardcoded procedural world — so root, `/:handle/:worldName`, and
        // `/demos/:id` all boot through the same place-fetching path.
        const [joinHandle, joinName] =
          handle === undefined || worldName === undefined
            ? [HOME_PLACE_HANDLE, HOME_PLACE_NAME]
            : [handle, worldName];
        if (current) {
          setJoiningLine(`joining ${joinHandle}/${joinName}…`);
        }
        try {
          const place = await places.find(joinHandle, joinName);
          if (current) {
            setJoiningLine("opening the place's scripts…");
          }
          const config = await buildLaunch(
            await readPlaceProject(await places.file(place)),
            `joined "${place.record.name}" — playing its world`,
            placeAtUri(place.repo, place.rkey),
          );
          if (current) {
            setLaunch(config);
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          if (current) {
            setJoiningLine(`could not join — ${detail}`);
            setLaunch({
              notice:
                handle === undefined || worldName === undefined
                  ? `could not load the default world (${detail}) — playing a procedural one instead`
                  : `could not join ${handle}/${worldName} (${detail}) — playing this world instead`,
            });
          }
        }
      })();

      return () => {
        current = false;
      };
    },
  );

  return (
    // A world is thrown away and a fresh one built whenever the config
    // driving it changes, the same way `WorldCanvas` throws away its canvas
    // on a multisampling change: keying the list on the config is what does
    // that. `launch()` is a freshly built object each time the boot effect
    // above lands on one, so identity alone is enough to tell two worlds
    // apart, including two builds of the very same place or demo.
    <For
      each={launch() ? [launch()!] : []}
      fallback={<Joining line={joiningLine()} />}
    >
      {(config) => <World launch={config} navigate={navigate} />}
    </For>
  );
};

export default App;
