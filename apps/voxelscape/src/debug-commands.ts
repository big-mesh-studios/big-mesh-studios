import type { AtprotoController } from "./atproto/atproto-controller";
import { Commander } from "./commander";
import type { DayNightController } from "./day-night-controller";
import type { RendererSwitch } from "./renderers/renderer-switch";
import type { SoundController } from "./sound-controller";
import type { WeatherController } from "./weather-controller";

export interface DebugCommandsParams {
  dayNight: DayNightController;
  rendererSwitch: RendererSwitch;
  weather: WeatherController;
  sound: SoundController;
  atproto: AtprotoController;
  /** Switches the camera between first and third person views. */
  setView: (mode: "first" | "third") => string;
  /** Shows or hides the player cube (hidden in first person). */
  setPlayerVisible: (visible: boolean) => string;
  /** Sets the player's move speed (units/sec), or reports it if `n` is omitted. */
  setMoveSpeed: (n?: number) => string;
  /** Sets the look sensitivity (radians/pixel), or reports it if `n` is omitted. */
  setLookSensitivity: (n?: number) => string;
}

/** Every debug console command, declared as a single object literal keyed by command name. */
export const createDebugCommands = (params: DebugCommandsParams): Commander => {
  const {
    dayNight,
    rendererSwitch,
    weather,
    sound,
    atproto,
    setView,
    setPlayerVisible,
    setMoveSpeed,
    setLookSensitivity,
  } = params;
  return new Commander({
    "/day": {
      help: "/day       jump to noon (t=300s)",
      run: () => {
        dayNight.jumpTo(300);
        return "jumped to noon (t=300s)";
      },
    },
    "/sunset": {
      help: "/sunset    jump to dusk (t=645s)",
      run: () => {
        dayNight.jumpTo(645);
        return "jumped to dusk (t=645s)";
      },
    },
    "/night": {
      help: "/night     jump to midnight (t=900s)",
      run: () => {
        dayNight.jumpTo(900);
        return "jumped to midnight (t=900s)";
      },
    },
    "/sunrise": {
      help: "/sunrise   jump to dawn (t=1120s)",
      run: () => {
        dayNight.jumpTo(1120);
        return "jumped to dawn (t=1120s)";
      },
    },
    "/time": {
      help: "/time <s>  jump to a second of the 20-min cycle",
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
      help: "/normal    resume the live clock",
      run: () => {
        dayNight.clearOverride();
        return "resumed the live clock";
      },
    },
    "/speed": {
      help: "/speed <n> run the clock n× fast (0 pauses)",
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
      help: "/now       show the current clock state",
      run: () => dayNight.describe(),
    },
    "/renderer": {
      help: "/renderer ray|tri   switch renderer (raymarch | surface triangles)",
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
    "/tris": {
      help: "/tris      show the current triangle count",
      run: () =>
        `triangles: ${rendererSwitch.triangleCount.toLocaleString()} (${rendererSwitch.mode} mode)`,
    },
    "/weather": {
      help: "/weather clear|rain|thunder|snow|auto   set or resume the weather",
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
      help: "/volume <0..1>  set the sound volume (0 mutes)",
      run: (rest) => {
        const v = Number(rest[0]);
        if (!Number.isFinite(v)) {
          return sound.describe();
        }
        return sound.setVolume(v);
      },
    },
    "/sound": {
      help: "/sound     show the sound state",
      run: () => sound.describe(),
    },
    "/connect": {
      help: "/connect [handle]   sign in to atproto via Bluesky OAuth (popup)",
      run: async (rest) => atproto.connect(rest[0]),
    },
    "/sync": {
      help: "/sync      upload new edits and fetch+merge remote edit chunks",
      run: async () => atproto.sync(),
    },
    "/atproto": {
      help: "/atproto   show the atproto connection state",
      run: () => atproto.describe(),
    },
    "/logout": {
      help: "/logout    revoke the atproto session and sign out",
      run: async () => atproto.signOut(),
    },
    "/view": {
      help: "/view first|third   switch the camera between first and third person",
      run: (rest) => {
        const arg = rest[0];
        if (arg === "first" || arg === "third") {
          return setView(arg);
        }
        return "usage: /view first|third";
      },
    },
    "/player": {
      help: "/player show|hide   show or hide the player cube",
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
      help: "/movespeed [n]   set (or show) the player's move speed, in units/sec",
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
      help: "/sensitivity [n]   set (or show) the look sensitivity, in radians/pixel",
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
      help: "/fullscreen true|false   toggle fullscreen",
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
      help: "/clear   clear terminal",
      run: () => "",
    },
  });
};
