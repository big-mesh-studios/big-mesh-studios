import type { AtprotoController } from "./atproto/atproto-controller";
import type { MonsterSync } from "./atproto/monster-sync";
import type { DayNightController } from "./environment/day-night-controller";
import type { SoundController } from "./environment/sound-controller";
import type { WeatherController } from "./environment/weather-controller";
import type { MonsterController } from "./monsters/monster-controller";
import type { RemoteMonsters } from "./monsters/remote-monsters";
import type { MultiplayerController } from "./multiplayer/multiplayer-controller";
import type { AdaptiveResolution } from "./render/adaptive";
import type { RendererSwitch } from "./renderers/renderer-switch";

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
  dayNight: DayNightController;
  rendererSwitch: RendererSwitch;
  weather: WeatherController;
  sound: SoundController;
  atproto: AtprotoController;
  multiplayer: MultiplayerController;
  monsters: MonsterController;
  monsterSync: MonsterSync;
  monsterRender: RemoteMonsters;
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
   * Shows or hides the per-frame performance readout, flipping it if `on` is
   * omitted. Showing it also puts the raymarcher into its fetch-count heatmap,
   * which it draws in place of the world.
   */
  setDebugPerf: (on?: boolean) => string;
}

/** Every debug console command, declared as a single object literal keyed by command name. */
export const createCommands = ({
  dayNight,
  rendererSwitch,
  weather,
  sound,
  atproto,
  multiplayer,
  monsters,
  monsterSync,
  monsterRender,
  resolution,
  setView,
  setPlayerVisible,
  setMoveSpeed,
  setLookSensitivity,
  setDebugPerf,
}: CommandsParams): Commander => {
  return new Commander({
    "/day": {
      description: "jump to noon (t=300s)",
      run: () => {
        dayNight.jumpTo(300);
        return "jumped to noon (t=300s)";
      },
    },
    "/sunset": {
      description: "jump to dusk (t=645s)",
      run: () => {
        dayNight.jumpTo(645);
        return "jumped to dusk (t=645s)";
      },
    },
    "/night": {
      description: "jump to midnight (t=900s)",
      run: () => {
        dayNight.jumpTo(900);
        return "jumped to midnight (t=900s)";
      },
    },
    "/sunrise": {
      description: "jump to dawn (t=1120s)",
      run: () => {
        dayNight.jumpTo(1120);
        return "jumped to dawn (t=1120s)";
      },
    },
    "/time": {
      description: "jump to a second of the 20-minute cycle",
      args: "<seconds>",
      run: (rest) => {
        const t = Number(rest[0]);
        if (!Number.isFinite(t) || t < 0) {
          return "usage: /time <seconds>  (0..1200, wraps)";
        }
        dayNight.jumpTo(t);
        return `time set to ${t}s`;
      },
    },
    "/normal": {
      description: "resume the live clock",
      run: () => {
        dayNight.clearOverride();
        return "resumed the live clock";
      },
    },
    "/speed": {
      description: "run the clock that many times fast (0 pauses)",
      args: "<multiplier>",
      run: (rest) => {
        const n = Number(rest[0]);
        if (!Number.isFinite(n) || n < 0) {
          return "usage: /speed <multiplier>  (0 pauses, 1 = real time)";
        }
        dayNight.setSpeed(n);
        return `clock speed set to ${n}×`;
      },
    },
    "/now": {
      description: "show the current clock state",
      run: () => dayNight.describe(),
    },
    "/renderer": {
      description: "switch renderer (raymarch or surface triangles)",
      args: "ray|tri",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "ray") {
          return rendererSwitch.setMode("ray");
        }
        if (arg === "tri" || arg === "mesh" || arg === "triangles") {
          return rendererSwitch.setMode("tri");
        }
        return `renderer: ${rendererSwitch.mode} — usage: /renderer ray|tri`;
      },
    },
    "/resolution": {
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
        return "usage: /resolution auto|<0.1..1>  (1 renders every display pixel)";
      },
    },
    "/perf": {
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
        return "usage: /perf [on|off]  (no argument flips it)";
      },
    },
    "/tris": {
      description: "show the current triangle count",
      run: () =>
        `triangles: ${rendererSwitch.triangleCount.toLocaleString()} (${rendererSwitch.mode} mode)`,
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
    "/volume": {
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
    "/sound": {
      description: "show the sound state",
      run: () => sound.describe(),
    },
    "/connect": {
      description: "sign in to atproto through the Bluesky login popup",
      args: "[handle]",
      run: async (rest) => atproto.connect(rest[0]),
    },
    "/sync": {
      description: "upload new edits, then fetch and merge remote edit chunks",
      run: async () => atproto.sync(),
    },
    "/atproto": {
      description: "show the atproto connection state",
      run: () => atproto.describe(),
    },
    "/logout": {
      description: "revoke the atproto session and sign out",
      run: async () => atproto.signOut(),
    },
    "/multiplayer": {
      description: "control and inspect the multiplayer mesh",
      args: "start|stop|status|debug",
      run: async (rest) => {
        const argument = rest[0];
        if (argument === "start") {
          return multiplayer.start();
        }
        if (argument === "stop") {
          return multiplayer.stop();
        }
        if (argument === "debug") {
          return multiplayer.describeDebug();
        }
        return multiplayer.describe();
      },
    },
    "/monsters": {
      description: "show the monster simulation and sync state",
      run: () =>
        `${monsters.describe()}\n${monsterSync.describe()}\n${monsterRender.describe()}`,
    },
    "/zombiemodel": {
      description: "load a zombie model zip saved from rm-stacker",
      run: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip,application/zip";
        input.style.display = "none";
        input.onchange = () => {
          const file = input.files?.[0];
          if (file === undefined) {
            return;
          }
          void monsterRender.loadModelFromBlob(file);
          input.remove();
        };
        document.body.appendChild(input);
        input.click();
        return "pick a model zip — the current model stays until one loads";
      },
    },
    "/view": {
      description: "switch the camera between first and third person",
      args: "first|third",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "first" || arg === "third") {
          return setView(arg);
        }
        return "usage: /view first|third";
      },
    },
    "/player": {
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
        return "usage: /player show|hide";
      },
    },
    "/movespeed": {
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
    "/sensitivity": {
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
