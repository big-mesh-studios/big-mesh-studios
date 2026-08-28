import type { TriangleRenderer } from "./renderers/triangle-renderer";
import type { AtprotoController } from "./atproto/atproto-controller";
import type { ModelLibrary } from "./atproto/models";
import { MONSTER_MODEL_NAME } from "./atproto/models";
import type { MonsterSync } from "./atproto/monster-sync";
import type { DayNightController } from "./environment/day-night-controller";
import type { SoundController } from "./environment/sound-controller";
import type { WeatherController } from "./environment/weather-controller";
import type { MonsterController } from "./monsters/monster-controller";
import type { RemoteMonsters } from "./monsters/remote-monsters";
import type { MultiplayerController } from "./multiplayer/multiplayer-controller";
import type { AdaptiveResolution } from "./render/adaptive";

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
  /** What draws the world's blocks, for the triangle count it reports. */
  renderer: TriangleRenderer;
  dayNight: DayNightController;
  weather: WeatherController;
  sound: SoundController;
  atproto: AtprotoController;
  multiplayer: MultiplayerController;
  monsters: MonsterController;
  monsterSync: MonsterSync;
  monsterRender: RemoteMonsters;
  /** The published drawings the monsters can be dressed in. */
  models: ModelLibrary;
  /** The account those drawings are read from when a command names none. */
  modelAccount: string | null;
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
   * Shows or hides the per-frame performance readout, flipping it if `on` is
   * omitted.
   */
  setDebugPerf: (on?: boolean) => string;
}

/**
 * Which account a model command was aimed at and which model of theirs it
 * asked for. A handle is a domain name and an account id begins with `did:`,
 * so a first word that is neither names the model instead and the account
 * stays whichever one the world reads its own drawings from.
 */
const readModelRequest = (
  rest: string[],
  fallbackAccount: string | null,
): { account: string | null; name: string } => {
  const first = rest[0];
  const namesAccount =
    first !== undefined && (first.includes(".") || first.startsWith("did:"));
  const words = namesAccount ? rest.slice(1) : rest;
  return {
    account: namesAccount ? first : fallbackAccount,
    name: words.length === 0 ? MONSTER_MODEL_NAME : words.join(" "),
  };
};

/** What went wrong, in the words a player reading the console can act on. */
const describeError = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/** Every debug console command, declared as a single object literal keyed by command name. */
export const createCommands = ({
  renderer,
  dayNight,
  weather,
  sound,
  atproto,
  multiplayer,
  monsters,
  monsterSync,
  monsterRender,
  models,
  modelAccount,
  resolution,
  setView,
  setPlayerVisible,
  setMoveSpeed,
  setLookSensitivity,
  setFlying,
  setDebugPerf,
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
    "/render:triangles": {
      description: "show the current triangle count",
      run: () => `triangles: ${renderer.triangleCount.toLocaleString()}`,
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
    "/monsters:state": {
      description: "show what the monsters are doing and what has been saved",
      run: () =>
        `${monsters.describe()}\n${monsterSync.describe()}\n${monsterRender.describe()}`,
    },
    "/monsters:model": {
      description: "dress the monsters in a model an account published",
      args: "[handle] [name]",
      run: async (rest) => {
        const { account, name } = readModelRequest(rest, modelAccount);
        if (account === null) {
          return "name the account the model was published by";
        }
        try {
          const model = await models.find(account, name);
          const line = await monsterRender.loadModelFromBlob(
            await models.file(model),
          );
          return `${line} — "${model.record.name}", published by ${account}`;
        } catch (err) {
          return `no "${name}" from ${account} — ${describeError(err)}`;
        }
      },
    },
    "/monsters:published": {
      description: "list the models an account has published",
      args: "[handle]",
      run: async (rest) => {
        const account = rest[0] ?? modelAccount;
        if (account === undefined || account === null) {
          return "name the account whose models to list";
        }
        try {
          const published = await models.list(account);
          if (published.length === 0) {
            return `${account} has published no models`;
          }
          return published
            .map(({ rkey, record }) => {
              const { width, height, depth } = record.dimensions;
              return `${rkey} — "${record.name}", ${width}×${height}×${depth}`;
            })
            .join("\n");
        } catch (err) {
          return `nothing to list from ${account} — ${describeError(err)}`;
        }
      },
    },
    "/monsters:file": {
      description: "take the monsters' look from a model saved on this device",
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
        return "pick a model zip — the monsters keep their look until one loads";
      },
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
