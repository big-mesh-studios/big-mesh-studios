// The place projects this world ships as demonstrations. A built-in demo is a
// working place that is not published anywhere: `/place:demo` reloads into one
// and `App.tsx` opens it straight from here, so a newcomer can walk a scripted
// world without an account or a zip. Each demo's model files live under
// `public/models/` and are read as bytes when the demo opens; its script source
// is a real TypeScript file imported as raw text, so it is written and read the
// way a creator's own script is.
import { MAIN_SCRIPT_FILE, type PlaceProject } from "./project";
import type { PlaceManifest } from "./place";
import GASA4_SCRIPT from "./demo-scripts/gasa4.ts?raw";
import LATE_TO_SCHOOL_SCRIPT from "./demo-scripts/late-to-school.ts?raw";
import ZOMBIES_SCRIPT from "./demo-scripts/zombies.ts?raw";
import DONT_POOP_SCRIPT from "./demo-scripts/dont-poop-yourself-at-school.ts?raw";
import HOME_SCRIPT from "./demo-scripts/home.ts?raw";
import {
  DONT_POOP_MODELS,
  GASA4_MODELS,
  LATE_TO_SCHOOL_MODELS,
  ZOMBIES_MODELS,
} from "./demo-scripts/model-lists";

/** One built-in demo: the world it names, its scripts, and the models they wear. */
export interface BuiltinDemo {
  id: string;
  /** The manifest fields the world boots from, script list excluded. */
  manifest: Omit<PlaceManifest, "scripts">;
  /** The demo's script files, keyed by manifest-relative path. */
  scripts: Record<string, string>;
}

/**
 * The "Get a Snack at 4 AM" demo: a flat street of brick houses under a pinned
 * 4 AM sky, a kitchen with a stove and two plates, a store whose counter the
 * cashier rings up at, and two NPCs to talk to. It is the proof that a place's
 * script can build its world (`engine.onPlan`), stand NPCs and rm-stacker props,
 * define and hand out items, set timers, place the player, and end the game.
 */
const GASA4: BuiltinDemo = {
  id: "get-a-snack-at-4-am",
  manifest: {
    name: "Get a Snack at 4 AM",
    seed: 4_004,
    // The player wakes in the bedroom.
    spawn: [-14, 0, -12],
    models: GASA4_MODELS,
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: GASA4_SCRIPT,
  },
};

/**
 * The "Late to School" demo: a flat block of four houses, a school, a corner
 * shop, and an arcade under a pinned morning sky, with the neighborhood's
 * characters standing in it and the first few endings reachable. It is the
 * proof that a place's script can build a small town (`engine.onPlan`), stand a cast
 * of NPCs, define and hand out items, remember the endings a player has reached
 * across restarts, and end the game.
 */
const LATE_TO_SCHOOL: BuiltinDemo = {
  id: "late-to-school",
  manifest: {
    name: "Late to School",
    // The history book's page and the Dimensionator code, in one seed.
    seed: 2_546,
    // The player wakes in their bedroom.
    spawn: [-12, 0, 16],
    models: LATE_TO_SCHOOL_MODELS,
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: LATE_TO_SCHOOL_SCRIPT,
  },
};

/**
 * The "Zombies" demo: a population of zombies materializing procedurally
 * around wherever a player explores the default terrain, fought off with a
 * sword the player starts holding. It is the working example of a place
 * script owning a live-tracked NPC kind end to end — spawning, chasing,
 * fighting, and dying — rather than one built into the engine.
 */
const ZOMBIES: BuiltinDemo = {
  id: "zombies",
  manifest: {
    name: "Zombies",
    seed: 90_210,
    spawn: [0, 0, 0],
    mode: "multi",
    models: ZOMBIES_MODELS,
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: ZOMBIES_SCRIPT,
  },
};

/**
 * The "Don't Poop Yourself at School" demo: a faithful port of the Roblox
 * obby. The player is lifted from the yard to a classroom lobby and must reach
 * the restroom at the far east end of the school before the bladder meter
 * fills. The nine sections are: Lobby → Stairs (two rolling toilet rolls,
 * moving plank) → Hallway (wet-floor sign hazard) → Cafeteria (conveyor-belt
 * lunch trays) → Gym (sliding platform, spinning turntable, falling platform)
 * → Library (floating book-pads, rolling globe hazard) → Mud Room (quicksand
 * field) → Final Pads → Bathroom (win). Four NPCs: Janitor, Bully, Principal
 * (gives a hall pass), and Teacher.
 */
const DONT_POOP: BuiltinDemo = {
  id: "dont-poop-yourself-at-school",
  manifest: {
    name: "Don't Poop Yourself at School",
    seed: 4_202,
    // The player starts on the yard; the script lifts them to the lobby.
    spawn: [0, 0, 0],
    models: DONT_POOP_MODELS,
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: DONT_POOP_SCRIPT,
  },
};

/**
 * The demo `App.tsx` opens at the site's own root address, in place of
 * fetching a live place over atproto every time somebody lands there. A
 * guide stands near the spawn and says hello — the same world the studio's
 * own published "home" place had carried, before this stopped needing a
 * network round trip to show it.
 */
const HOME: BuiltinDemo = {
  id: "home",
  manifest: {
    name: "home",
    seed: 54_321,
    spawn: [0, 0, 0],
    mode: "multi:edit",
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: HOME_SCRIPT,
  },
};

/** Every built-in demo, in the order a list shows them. */
export const BUILTIN_DEMOS: BuiltinDemo[] = [
  GASA4,
  LATE_TO_SCHOOL,
  ZOMBIES,
  DONT_POOP,
  HOME,
];

/** The built-in demo with `id`, or null when there is none. */
export const builtinDemo = (id: string): BuiltinDemo | null =>
  BUILTIN_DEMOS.find((demo) => demo.id === id) ?? null;

/**
 * Turns a built-in demo into the project the world boots from, reading the
 * model files it names from the site's `models/` directory. A model that will
 * not load is left out, so a demo still opens without its props rather than
 * failing whole.
 */
export const loadBuiltinDemo = async (
  demo: BuiltinDemo,
): Promise<PlaceProject> => {
  const models: Record<string, Uint8Array> = {};
  for (const file of demo.manifest.models ?? []) {
    try {
      // Served from the site's own root, the same folder every other address
      // in this application is built from (see `vite.config.ts`'s `base`).
      const response = await fetch(`${import.meta.env.BASE_URL}models/${file}`);
      if (response.ok) {
        models[file] = new Uint8Array(await response.arrayBuffer());
      }
    } catch {
      // A demo without one of its models is still a working demo.
    }
  }
  return {
    manifest: { ...demo.manifest, scripts: Object.keys(demo.scripts) },
    scripts: demo.scripts,
    models,
  };
};
