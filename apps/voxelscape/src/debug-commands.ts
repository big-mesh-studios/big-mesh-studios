import { Commander } from "./commander";
import type { DayNightController } from "./day-night-controller";
import type { RendererSwitch } from "./renderers/renderer-switch";

export interface DebugCommandsParams {
  dayNight: DayNightController;
  rendererSwitch: RendererSwitch;
}

/** Every debug console command, declared as a single object literal keyed by command name. */
export const createDebugCommands = (params: DebugCommandsParams): Commander => {
  const { dayNight, rendererSwitch } = params;
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
  });
};
