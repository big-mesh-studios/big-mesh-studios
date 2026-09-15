import type { TriangleRenderer } from "./renderers/triangle-renderer";
import type { WorldWorkerPool } from "./world/worker-pool";
import type { VoxelWorld } from "./world/create-voxel-world";
import { DEFAULT_LOD_BANDS, lodIsOff, LOD_OFF } from "./world/chunk-sphere";
import type { AtprotoController } from "./atproto/atproto-controller";
import type { DayNightController } from "./environment/day-night-controller";
import type { SoundController } from "./environment/sound-controller";
import type { WeatherController } from "./environment/weather-controller";
import type { MultiplayerController } from "./multiplayer/multiplayer-controller";
import type { PlayerHealth } from "./player/health";
import type { AdaptiveResolution } from "./render/adaptive";
import type { PlaceLibrary, PlacePublisher } from "./atproto/places";
import { PLACE_MODES, parsePlaceAtUri } from "./places/place";
import { BUILTIN_DEMOS, builtinDemo, loadBuiltinDemo } from "./places/demos";
import {
  emptyPlaceProject,
  readPlaceProject,
  type PlaceProject,
} from "./places/project";

/**
 * Declares every debug console command as a single object literal, keyed by
 * command name, built once after every command-owning object already
 * exists. Each entry's `run` closure does its own raw-argument parsing,
 * validation, and aliasing, then calls a plain typed method on the owning
 * object — the owning objects themselves expose no command-shaped API and
 * have no idea a console exists.
 */
export interface CommandEntry {
  /** What the command does, one line, shown against its name by `/help`. */
  description: string;
  /** The arguments it takes, written as they would be typed. */
  args?: string;
  run: (rest: string[]) => string | Promise<string>;
}

/**
 * The widest window the console will ask for. Not a memory limit — a window
 * this wide holds about eight thousand blocks and still weighs under one
 * hundred and forty mebibytes of voxels and light — but a block is an object
 * with a store, a slot in the renderer and a draw range of its own, and asking
 * for a radius in the hundreds would hang the tab building them before it
 * drew anything. What actually stops a window getting wider arrives long
 * before this: the blocks a chunk crossing has to stream, and the triangles
 * the card is handed.
 */
const MAX_CHUNK_RADIUS = 32;

/**
 * What `/world:radius` takes, spelled out. Shown when it is asked with nothing
 * to do, and when what it was given was not a size, because a token like
 * `[chunks in Y]` says what to type without saying what it means.
 */
const RADIUS_USAGE =
  "usage: /world:radius <chunks> [chunks in Y]\n" +
  `chunks is how far the window reaches around the player, from 1 to ${MAX_CHUNK_RADIUS}, ` +
  "a chunk being 128 world units. A second number does the same up and down; " +
  "smaller than the first it flattens the window, which suits a world with more " +
  "ground than sky. Every block refills.";

/** What `/world:lod` takes, spelled out, and why the two numbers differ. */
const LOD_USAGE =
  "usage: /world:lod off | auto | <full> <coarser>\n" +
  "full is how far full-resolution blocks reach and coarser how far the tier " +
  "below it reaches; past that, blocks are coarsest. Each tier doubles the voxel " +
  "size, so a block one tier out holds an eighth of the voxels and two tiers out " +
  "a forty-ninth, which is what makes a wide window affordable. off keeps every " +
  "block at full resolution however far away; auto puts the distances back to 3 " +
  "and 4. Every block refills.";

/**
 * What the block window is, in one line: how far it reaches, how many blocks
 * that is, where its levels of detail change, and what its voxels and light
 * weigh. The two commands that reshape it both answer with this, so asking and
 * changing read the same.
 */
const describeWindow = (world: VoxelWorld): string => {
  const bands = world.lodBands;
  const detail = lodIsOff(bands)
    ? "every block at full detail"
    : `full detail to ${bands.full} chunks, coarser to ${bands.coarse}, coarsest beyond`;
  const mib = (world.voxelBytes / 1048576).toFixed(1);
  return (
    `window radius ${world.chunkRadius} chunks (${world.chunkRadiusY} in Y), ` +
    `${world.blocks.length} blocks, ${world.ringRadius} world units of sight; ` +
    `${detail}; ${mib}MiB of voxels and light`
  );
};

/** One command as `/help` describes it: what to type, and what it does. */
export interface CommandHelp {
  /** The command's name, leading slash included. */
  name: string;
  args?: string;
  description: string;
}

/** What running a line produces: lines to print, or the commands `/help` lists. */
export type CommandOutput = string | CommandHelp[];

export class Commander {
  private readonly commands: Record<string, CommandEntry>;

  constructor(commands: Record<string, CommandEntry>) {
    this.commands = commands;
  }

  run(line: string): CommandOutput | Promise<CommandOutput> {
    const [name, ...rest] = line.trim().toLowerCase().split(/\s+/);
    if (name === "/help") {
      return this.help();
    }
    const command = this.commands[name];
    if (command === undefined) {
      return `unknown command "${line}" — try /help`;
    }
    return command.run(rest);
  }

  /** Every command's name, alphabetically, as something completing one wants them. */
  names(): string[] {
    return this.help()
      .map((command) => command.name)
      .sort();
  }

  /** Every command there is, in the order they are declared, `/help` first. */
  help(): CommandHelp[] {
    return [
      { name: "/help", description: "list every command" },
      ...Object.entries(this.commands).map(([name, command]) => ({
        name,
        args: command.args,
        description: command.description,
      })),
    ];
  }
}

export interface CommandsParams {
  /** What draws the world's blocks, for the triangle count it reports. */
  renderer: TriangleRenderer;
  /** The world's shared fill-and-mesh worker pool, to report and resize it. */
  workerPool: WorldWorkerPool;
  /** The streamed block window, to report and resize it. */
  world: VoxelWorld;
  dayNight: DayNightController;
  weather: WeatherController;
  sound: SoundController;
  atproto: AtprotoController;
  multiplayer: MultiplayerController;
  /** The player's hearts, for a command to restore them. */
  health: PlayerHealth;
  /** The published places others have made, read without a session. */
  places: PlaceLibrary;
  /** Publishing a place of your own, to the signed-in account. */
  placePublisher: PlacePublisher;
  /** The seed a freshly created place starts from: the world being played. */
  defaultSeed: number;
  /**
   * This world's own address, for `/place:mode`: a published place's `at://`
   * address, or the default world's own fixed address.
   */
  placeUri: string;
  /** Moves the address bar to a different place or demo, for `/place:join` and `/place:demo`. */
  navigate: (to: string) => void;
  /** Opens whether the place script editor is showing, and reports the flip. */
  togglePlaceEditor: () => string;
  /** Opens whether the level editor is showing, and reports the flip. */
  toggleLevelEditor: () => string;
  /** Driving the place script loaded for this session, over the console. */
  script: {
    demo(): Promise<string>;
    state(): Promise<string>;
    talk(id: string): Promise<string>;
    choose(option: number): Promise<string>;
    leave(): Promise<string>;
  };
  resolution: AdaptiveResolution;
  /** Switches the camera between first and third person views. */
  setView: (mode: "first" | "third") => string;
  /** Shows or hides the player cube (hidden in first person). */
  setPlayerVisible: (visible: boolean) => string;
  /** Sets the player's move speed (units/sec), or reports it if `n` is omitted. */
  setMoveSpeed: (n?: number) => string;
  /** Sets the look sensitivity (radians/pixel), or reports it if `n` is omitted. */
  setLookSensitivity: (n?: number) => string;
  /**
   * Turns flight on or off (toggling if `flying` is omitted): no gravity, and
   * forward/back follows the full look direction.
   */
  setFlying: (flying?: boolean) => string;
  /**
   * Turns no-clip on or off (toggling if `noclip` is omitted): flight control
   * with collision off, so the player passes through solid voxels.
   */
  setNoClip: (noclip?: boolean) => string;
  /**
   * Shows or hides the per-frame performance readout, flipping it if `on` is
   * omitted.
   */
  setDebugPerf: (on?: boolean) => string;
  /** Shows or hides the statistics toast, and says which it did. */
  setShowStats: (on?: boolean) => string;
  /** Begins tracing a walk under this name, and says so. */
  traceStart: (name: string) => string;
  /** Marks this moment of the walk being traced, with what was seen. */
  traceMark: (note: string) => string;
  /** Writes down this one moment, without recording a walk around it. */
  traceSnap: (note: string) => Promise<string>;
  /** Ends the trace, writes it, and says where it went. */
  traceStop: () => Promise<string>;
  /**
   * Turns multisampling on or off, flipping it if `on` is omitted. The canvas
   * is remade either way, since a context holds the sample count it was made
   * with for its whole life.
   */
  setMultisampling: (on?: boolean) => string;
}

/** What went wrong, in the words a player reading the console can act on. */
const describeError = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/**
 * Which account a place command was aimed at and which place of theirs it
 * asked for, the same shape as the model request: a first word that looks like
 * an account names one, anything else names the place and the account falls
 * back to the caller's (the account signed in here, for the places it owns).
 */
const readPlaceRequest = (
  rest: string[],
  fallbackAccount: string | null,
): { account: string | null; name: string } => {
  const first = rest[0];
  const namesAccount =
    first !== undefined && (first.includes(".") || first.startsWith("did:"));
  const words = namesAccount ? rest.slice(1) : rest;
  return {
    account: namesAccount ? first : fallbackAccount,
    name: words.join(" ").trim(),
  };
};

/** Every debug console command, declared as a single object literal keyed by command name. */
export const createCommands = ({
  renderer,
  workerPool,
  world,
  dayNight,
  weather,
  sound,
  atproto,
  multiplayer,
  health,
  places,
  placePublisher,
  defaultSeed,
  placeUri,
  navigate,
  togglePlaceEditor,
  toggleLevelEditor,
  script,
  resolution,
  setView,
  setPlayerVisible,
  setMoveSpeed,
  setLookSensitivity,
  setFlying,
  setNoClip,
  setDebugPerf,
  setShowStats,
  traceStart,
  traceMark,
  traceSnap,
  traceStop,
  setMultisampling,
}: CommandsParams): Commander => {
  return new Commander({
    "/clock:day": {
      description: "jump to noon (t=300s)",
      run: () => {
        dayNight.jumpTo(300);
        return "jumped to noon (t=300s)";
      },
    },
    "/clock:sunset": {
      description: "jump to dusk (t=645s)",
      run: () => {
        dayNight.jumpTo(645);
        return "jumped to dusk (t=645s)";
      },
    },
    "/clock:night": {
      description: "jump to midnight (t=900s)",
      run: () => {
        dayNight.jumpTo(900);
        return "jumped to midnight (t=900s)";
      },
    },
    "/clock:sunrise": {
      description: "jump to dawn (t=1120s)",
      run: () => {
        dayNight.jumpTo(1120);
        return "jumped to dawn (t=1120s)";
      },
    },
    "/clock:time": {
      description: "jump to a second of the 20-minute cycle",
      args: "<seconds>",
      run: (rest) => {
        const t = Number(rest[0]);
        if (!Number.isFinite(t) || t < 0) {
          return "usage: /clock:time <seconds>  (0..1200, wraps)";
        }
        dayNight.jumpTo(t);
        return `time set to ${t}s`;
      },
    },
    "/clock:speed": {
      description: "run the clock that many times fast (0 pauses)",
      args: "<multiplier>",
      run: (rest) => {
        const n = Number(rest[0]);
        if (!Number.isFinite(n) || n < 0) {
          return "usage: /clock:speed <multiplier>  (0 pauses, 1 = real time)";
        }
        dayNight.setSpeed(n);
        return `clock speed set to ${n}×`;
      },
    },
    "/clock:live": {
      description: "resume the live clock",
      run: () => {
        dayNight.clearOverride();
        return "resumed the live clock";
      },
    },
    "/clock:state": {
      description: "show the current clock state",
      run: () => dayNight.describe(),
    },
    "/world:workers": {
      description: "report, pin, or reset the world's worker count",
      args: "auto|<0..8>",
      run: (rest) => {
        const argument = rest[0];
        if (argument === undefined || argument === "auto") {
          if (argument === "auto") {
            workerPool.setAuto();
          }
          return workerPool.describe();
        }
        const count = Number(argument);
        if (Number.isInteger(count) && count >= 0 && count <= 8) {
          workerPool.setCount(count);
          return workerPool.describe();
        }
        return "usage: /world:workers auto|<0..8>  (0 runs fills and meshes on the main thread)";
      },
    },
    "/world:radius": {
      description:
        "how far the streamed block window reaches, in chunks of 128 units",
      args: `<chunks> [chunks in Y]`,
      run: (rest) => {
        if (rest.length === 0) {
          return `${describeWindow(world)}\n${RADIUS_USAGE}`;
        }
        const radius = Number(rest[0]);
        const radiusY = rest[1] === undefined ? undefined : Number(rest[1]);
        const whole = (n: number | undefined): boolean =>
          n === undefined ||
          (Number.isInteger(n) && n >= 1 && n <= MAX_CHUNK_RADIUS);
        if (!whole(radius) || !whole(radiusY)) {
          return RADIUS_USAGE;
        }
        world.reshape({ chunkRadius: radius, chunkRadiusY: radiusY });
        return describeWindow(world);
      },
    },
    "/world:lod": {
      description:
        "the distances at which blocks drop to coarser voxels, in chunks",
      args: "off|auto|<full> <coarser>",
      run: (rest) => {
        const argument = rest[0];
        if (argument === undefined) {
          return `${describeWindow(world)}\n${LOD_USAGE}`;
        }
        // Off generates every block of the window at full resolution, which is
        // what the coarse shells are worth looking at against.
        if (argument === "off") {
          world.reshape({ lodBands: LOD_OFF });
          return describeWindow(world);
        }
        if (argument === "auto") {
          world.reshape({ lodBands: DEFAULT_LOD_BANDS });
          return describeWindow(world);
        }
        const full = Number(argument);
        const coarse = Number(rest[1]);
        if (
          !Number.isInteger(full) ||
          !Number.isInteger(coarse) ||
          full < 1 ||
          coarse < full
        ) {
          return LOD_USAGE;
        }
        world.reshape({ lodBands: { full, coarse } });
        return describeWindow(world);
      },
    },
    "/render:resolution": {
      description: "adapt the render resolution, or pin it",
      args: "auto|<0.1..1>",
      run: (rest) => {
        const argument = rest[0];
        if (argument === undefined) {
          return resolution.describe();
        }
        if (argument === "auto") {
          resolution.setAuto();
          return resolution.describe();
        }
        const scale = Number(argument);
        if (Number.isFinite(scale) && scale > 0 && scale <= 1) {
          resolution.setFixed(scale);
          return resolution.describe();
        }
        return "usage: /render:resolution auto|<0.1..1>  (1 renders every display pixel)";
      },
    },
    "/trace:start": {
      description: "record a walk, to hand to somebody who was not there",
      args: "<what you are looking for>",
      run: (rest) => traceStart(rest.join(" ")),
    },
    "/trace:mark": {
      description: "mark this moment of the walk, and what is wrong with it",
      args: "<what you see>",
      run: (rest) => traceMark(rest.join(" ")),
    },
    "/trace:snap": {
      description: "write down this one moment, without recording a walk",
      args: "<what you see>",
      run: (rest) => traceSnap(rest.join(" ")),
    },
    "/trace:stop": {
      description: "end the walk being recorded and write it down",
      run: () => traceStop(),
    },
    "/debug:stats": {
      description: "show or hide the statistics toast",
      args: "[on|off]",
      run: (rest) => {
        const argument = rest[0];
        if (argument === "on") {
          return setShowStats(true);
        }
        if (argument === "off") {
          return setShowStats(false);
        }
        if (argument === undefined) {
          return setShowStats();
        }
        return "usage: /debug:stats [on|off]";
      },
    },
    "/render:perf": {
      description: "show or hide the frame-time readout",
      args: "[on|off]",
      run: (rest) => {
        const argument = rest[0];
        if (argument === undefined) {
          return setDebugPerf();
        }
        if (argument === "on") {
          return setDebugPerf(true);
        }
        if (argument === "off") {
          return setDebugPerf(false);
        }
        return "usage: /render:perf [on|off]  (no argument flips it)";
      },
    },
    "/render:msaa": {
      description:
        "turn multisampling on or off, which remakes the canvas and reuploads to it",
      args: "[on|off]",
      run: (rest) => {
        const argument = rest[0];
        if (argument === undefined) {
          return setMultisampling();
        }
        if (argument === "on") {
          return setMultisampling(true);
        }
        if (argument === "off") {
          return setMultisampling(false);
        }
        return "usage: /render:msaa [on|off]  (no argument flips it)";
      },
    },
    "/render:triangles": {
      description: "show the current triangle count",
      run: () => `triangles: ${renderer.triangleCount.toLocaleString()}`,
    },
    "/render:occlusion": {
      description:
        "turn the occlusion culler on/off, set its query interval, or force a fresh query",
      args: "[on|off|force] [<frames>]",
      run: (rest) => {
        const argument = rest[0];
        if (argument === "off") {
          renderer.occlusionEnabled = false;
          return "occlusion: off";
        }
        if (argument === "on") {
          renderer.occlusionEnabled = true;
          return `occlusion: on, query every ${renderer.occlusionIntervalFrames} frames`;
        }
        if (argument === "force") {
          renderer.forceOcclusionQuery();
          return `occlusion: a fresh query runs next frame; last query saw ${renderer.lastVisibleCount} chunks`;
        }
        if (argument !== undefined) {
          const frames = Number(argument);
          if (Number.isFinite(frames) && frames >= 1) {
            renderer.occlusionIntervalFrames = frames;
            return `occlusion: on, query every ${renderer.occlusionIntervalFrames} frames`;
          }
          return "usage: /render:occlusion [on|off|force] [<frames>]";
        }
        return `occlusion: ${renderer.occlusionEnabled ? "on" : "off"}, query every ${renderer.occlusionIntervalFrames} frames, last query saw ${renderer.lastVisibleCount} chunks, hidden ${renderer.occlusions}: ${renderer.occlusionBreakdown}`;
      },
    },
    "/render:probe": {
      description:
        "draw every chunk in its own colour, showing the occlusion probe view",
      args: "[on|off]",
      run: (rest) => {
        const argument = rest[0];
        if (argument === "on") {
          renderer.probeDebug = true;
          renderer.forceOcclusionQuery();
          return "probe view: on — the world shows the occlusion culler's render";
        }
        if (argument === "off") {
          renderer.probeDebug = false;
          return "probe view: off";
        }
        if (argument === undefined) {
          renderer.probeDebug = !renderer.probeDebug;
          renderer.forceOcclusionQuery();
          return `probe view: ${renderer.probeDebug ? "on" : "off"}`;
        }
        return "usage: /render:probe [on|off]  (no argument flips it)";
      },
    },
    "/sound:volume": {
      description: "set the sound volume (0 mutes)",
      args: "<0..1>",
      run: (rest) => {
        const v = Number(rest[0]);
        if (!Number.isFinite(v)) {
          return sound.describe();
        }
        return sound.setVolume(v);
      },
    },
    "/sound:state": {
      description: "show the sound state",
      run: () => sound.describe(),
    },
    "/player:view": {
      description: "switch the camera between first and third person",
      args: "first|third",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "first" || arg === "third") {
          return setView(arg);
        }
        return "usage: /player:view first|third";
      },
    },
    "/player:cube": {
      description: "show or hide the player cube",
      args: "show|hide",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "show") {
          return setPlayerVisible(true);
        }
        if (arg === "hide") {
          return setPlayerVisible(false);
        }
        return "usage: /player:cube show|hide";
      },
    },
    "/player:speed": {
      description: "set (or show) the player's move speed, in units per second",
      args: "[n]",
      run: (rest) => {
        const n = Number(rest[0]);
        return setMoveSpeed(
          rest[0] === undefined || !Number.isFinite(n) || n <= 0
            ? undefined
            : n,
        );
      },
    },
    "/player:sensitivity": {
      description: "set (or show) the look sensitivity, in radians per pixel",
      args: "[n]",
      run: (rest) => {
        const n = Number(rest[0]);
        return setLookSensitivity(
          rest[0] === undefined || !Number.isFinite(n) || n <= 0
            ? undefined
            : n,
        );
      },
    },
    "/player:fly": {
      description: "turn flight on or off (no gravity; W follows the look)",
      args: "[on|off]",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "on") {
          return setFlying(true);
        }
        if (arg === "off") {
          return setFlying(false);
        }
        if (arg === undefined) {
          return setFlying();
        }
        return "usage: /player:fly [on|off]  (no argument flips it)";
      },
    },
    "/player:no-clip": {
      description: "turn no-clip on or off (fly through solid blocks)",
      args: "[on|off]",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "on") {
          return setNoClip(true);
        }
        if (arg === "off") {
          return setNoClip(false);
        }
        if (arg === undefined) {
          return setNoClip();
        }
        return "usage: /player:no-clip [on|off]  (no argument flips it)";
      },
    },
    "/player:heal": {
      description: "restore the player's hearts to full",
      run: () => {
        health.heal(health.maxHp);
        return `hearts restored to ${health.hp}`;
      },
    },
    "/account:login": {
      description: "sign in through the Bluesky login popup",
      args: "[handle]",
      run: async (rest) => atproto.connect(rest[0]),
    },
    "/account:logout": {
      description: "sign out, and revoke the session that was signed in",
      run: async () => atproto.signOut(),
    },
    "/account:sync": {
      description: "upload new edits, then fetch and merge remote edit chunks",
      run: async () => atproto.sync(),
    },
    "/account:state": {
      description: "show which account is signed in",
      run: () => atproto.describe(),
    },
    "/multiplayer:start": {
      description: "bring the multiplayer mesh online",
      run: async () => multiplayer.start(),
    },
    "/multiplayer:stop": {
      description: "take the multiplayer mesh offline",
      run: async () => multiplayer.stop(),
    },
    "/multiplayer:state": {
      description: "show the multiplayer mesh's peers and connection state",
      run: () => multiplayer.describe(),
    },
    "/multiplayer:debug": {
      description: "show what every peer connection is doing",
      run: () => multiplayer.describeDebug(),
    },
    "/place:editor": {
      description: "open (or close) the place script editor",
      run: () => togglePlaceEditor(),
    },
    "/place:level-editor": {
      description:
        "open (or close) the level editor for this world's structures",
      run: () => toggleLevelEditor(),
    },
    "/place:create": {
      description: `publish a new, empty place under your account, seeded from the world being played, and join it — modes: ${PLACE_MODES.join(", ")} (default solo:edit)`,
      args: "<name> [mode]",
      run: async (rest) => {
        const last = rest[rest.length - 1];
        const mode = PLACE_MODES.find((candidate) => candidate === last);
        const name = (mode === undefined ? rest : rest.slice(0, -1))
          .join(" ")
          .trim();
        if (name === "") {
          return `usage: /place:create <name> [${PLACE_MODES.join("|")}]`;
        }
        const project = emptyPlaceProject(defaultSeed);
        project.manifest.name = name;
        if (mode !== undefined) {
          project.manifest.mode = mode;
        }
        try {
          const atUri = await placePublisher.publish(project);
          const parsed = parsePlaceAtUri(atUri);
          if (parsed === null) {
            return `created — ${atUri}`;
          }
          const handle = await atproto.resolveHandle(parsed.repo);
          navigate(`/${handle ?? parsed.repo}/${parsed.rkey}`);
          return `created "${name}" — joining its world`;
        } catch (err) {
          return `create failed: ${describeError(err)}`;
        }
      },
    },
    "/place:mode": {
      description: `sets this place's mode — modes: ${PLACE_MODES.join(", ")}. Only the place's owner may change it.`,
      args: "<mode>",
      run: async (rest) => {
        const mode = PLACE_MODES.find((candidate) => candidate === rest[0]);
        if (mode === undefined) {
          return `usage: /place:mode <mode>  (mode is one of ${PLACE_MODES.join(", ")})`;
        }
        if (parsePlaceAtUri(placeUri) === null) {
          return "this isn't a published place — there's no mode to set";
        }
        if (atproto.did === null) {
          return "sign in first — use /account:login";
        }
        try {
          const place = await places.recordAtUri(placeUri);
          // Republishing under this account's own DID is the only way this
          // app ever writes a place record, so this check is what actually
          // stops anyone but the place's owner from changing its mode.
          if (place.repo !== atproto.did) {
            return "only this place's owner can change its mode";
          }
          const project = await places.project(place);
          project.manifest.mode = mode;
          await placePublisher.publish(project);
          return `"${place.record.name}" is now ${mode}`;
        } catch (err) {
          return `could not set mode: ${describeError(err)}`;
        }
      },
    },
    "/place:publish": {
      description:
        "publish a place zip to your account — a file from this device, or a built-in demo by id",
      args: "[demo id]",
      run: (rest) => {
        const publish = (project: PlaceProject): Promise<string> =>
          placePublisher.publish(project).then(
            async (atUri) => {
              const parsed = parsePlaceAtUri(atUri);
              if (parsed === null) {
                return `published — ${atUri}`;
              }
              const handle = await atproto.resolveHandle(parsed.repo);
              return `published — ${import.meta.env.BASE_URL}#/${handle ?? parsed.repo}/${parsed.rkey}`;
            },
            (err) => `publish failed: ${describeError(err)}`,
          );

        const demoId = rest[0];
        if (demoId !== undefined) {
          const demo = builtinDemo(demoId);
          if (demo === null) {
            return `no demo "${demoId}" — /place:demos lists them`;
          }
          return loadBuiltinDemo(demo).then(publish);
        }

        let settle!: (line: string) => void;
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip,application/zip";
        input.style.display = "none";
        input.onchange = () => {
          const file = input.files?.[0];
          input.remove();
          if (file === undefined) {
            settle("no zip picked");
            return;
          }
          void readPlaceProject(file).then(publish).then(settle);
        };
        input.oncancel = () => {
          input.remove();
          settle("publish cancelled");
        };
        document.body.appendChild(input);
        input.click();
        return new Promise<string>((resolve) => {
          settle = resolve;
        });
      },
    },
    "/place:published": {
      description: "list the places an account has published",
      args: "[handle]",
      run: async (rest) => {
        const account = rest[0] ?? atproto.did;
        if (account === null || account === undefined) {
          return "name the account whose places to list, or sign in first";
        }
        try {
          const published = await places.list(account);
          if (published.length === 0) {
            return `${account} has published no places`;
          }
          return published
            .map(({ record }) => {
              const [x, y, z] = record.spawn;
              return `"${record.name}" — seed ${record.seed}, spawn ${x},${y},${z}`;
            })
            .join("\n");
        } catch (err) {
          return `nothing to list from ${account} — ${describeError(err)}`;
        }
      },
    },
    "/place:join": {
      description: "join a place someone published, playing its world",
      args: "[handle] [name]",
      run: async (rest) => {
        const { account, name } = readPlaceRequest(rest, atproto.did);
        if (account === null || account === undefined) {
          return "name the account whose place to join, or sign in first";
        }
        if (name === "") {
          return "usage: /place:join [handle] [name]";
        }
        try {
          const place = await places.find(account, name);
          const handle = await atproto.resolveHandle(place.repo);
          navigate(`/${handle ?? place.repo}/${place.rkey}`);
          return `joining "${place.record.name}" — loading its world`;
        } catch (err) {
          return `no "${name}" from ${account} — ${describeError(err)}`;
        }
      },
    },
    "/place:demos": {
      description: "list the built-in demo places",
      run: async () =>
        BUILTIN_DEMOS.map((demo) => `${demo.id} — ${demo.manifest.name}`).join(
          "\n",
        ) || "no built-in demos",
    },
    "/place:demo": {
      description: "play a built-in demo place",
      args: "[id]",
      run: async (rest) => {
        const id = rest[0] ?? BUILTIN_DEMOS[0]?.id;
        if (id === undefined) {
          return "no built-in demos";
        }
        const demo = builtinDemo(id);
        if (demo === null) {
          return `no demo "${id}" — /place:demos lists them`;
        }
        navigate(`/demos/${demo.id}`);
        return `opening the demo "${demo.manifest.name}" — loading its world`;
      },
    },
    "/script:demo": {
      description: "load and run the bundled sample place script",
      run: async () => script.demo(),
    },
    "/script:state": {
      description: "show what the loaded script is doing",
      run: async () => script.state(),
    },
    "/script:talk": {
      description: "start talking to an NPC the script placed",
      args: "<id>",
      run: async (rest) => script.talk(rest[0] ?? ""),
    },
    "/script:choose": {
      description: "pick an option of the current conversation",
      args: "<1..n>",
      run: async (rest) => {
        const option = Number(rest[0]);
        if (!Number.isInteger(option)) {
          return "usage: /script:choose <option number>";
        }
        return script.choose(option);
      },
    },
    "/script:leave": {
      description: "end the current conversation",
      run: async () => script.leave(),
    },
    "/weather": {
      description: "set or resume the weather",
      args: "clear|rain|thunder|snow|auto",
      run: (rest) => {
        const arg = rest[0];
        if (
          arg === "clear" ||
          arg === "rain" ||
          arg === "thunder" ||
          arg === "snow" ||
          arg === "auto"
        ) {
          weather.setWeather(arg);
          return `weather set to ${arg}`;
        }
        return weather.describe();
      },
    },
    "/fullscreen": {
      description: "enter or leave fullscreen",
      args: "true|false",
      run: async ([fullscreen]) => {
        const shouldRequest =
          Boolean(fullscreen) ||
          (fullscreen === undefined &&
            document.fullscreenElement !== document.body);

        if (shouldRequest) {
          try {
            await document.body.requestFullscreen();
            return `full screen request succeeded.`;
          } catch (error) {
            return `full screen request failed.`;
          }
        }

        try {
          document.exitFullscreen();
          return `exit screen request succeeded.`;
        } catch {
          return "exit fullscreen failed.";
        }
      },
    },
    "/clear": {
      description: "clear the console output",
      run: () => "",
    },
  });
};
