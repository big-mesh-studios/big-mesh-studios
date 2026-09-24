// The place projects this world ships as demonstrations. A built-in demo is a
// working place that is not published anywhere: `/place:demo` reloads into one
// and `App.tsx` opens it straight from here, so a newcomer can walk a scripted
// world without an account or a zip. Each demo's model files live under
// `public/models/` and are read as bytes when the demo opens; its script source
// is a real TypeScript file imported as raw text, so it is written and read the
// way a creator's own script is.
import {
  MAIN_SCRIPT_FILE,
  type AttachedModel,
  type PlaceProject,
} from "./project";
import type { PlaceManifest } from "./place";
import GASA4_SCRIPT from "./demo-scripts/gasa4.ts?raw";
import LATE_TO_SCHOOL_SCRIPT from "./demo-scripts/late-to-school.ts?raw";
import ZOMBIES_SCRIPT from "./demo-scripts/zombies.ts?raw";
import ZOMBIE_SCRIPT from "./demo-scripts/zombie.ts?raw";
import ZOMBIES_MANSION_SCRIPT from "./demo-scripts/zombies-mansion.ts?raw";
import DONT_POOP_SCRIPT from "./demo-scripts/dont-poop-yourself-at-school.ts?raw";
import DUSTY_TRIP_SCRIPT from "./demo-scripts/dusty-trip.ts?raw";
import BALDI_SCRIPT from "./demo-scripts/baldi.ts?raw";
import BALDI_LEVEL_SCRIPT from "./demo-scripts/baldi-level.ts?raw";
import BALDI_QUIZ_SCRIPT from "./demo-scripts/baldi-quiz.ts?raw";
import HOME_SCRIPT from "./demo-scripts/home.ts?raw";
import {
  BALDI_MODELS,
  DONT_POOP_MODELS,
  DUSTY_TRIP_MODELS,
  GASA4_MODELS,
  LATE_TO_SCHOOL_MODELS,
  ZOMBIES_MANSION_MODELS,
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
    "zombie.ts": ZOMBIE_SCRIPT,
  },
};

/**
 * The "Zombies: The Mansion" demo: a roofless five-room mansion and its
 * courtyard under a pinned night, breathing an endless horde in through the
 * windows while the player opens the rooms eastward. It is the proof that a
 * place script can steer that horde through a fixed arena whose breaches they
 * tear down, price the doors and racks with a kill-based economy, and its
 * weapons ride the scripting item system.
 */
const ZOMBIES_MANSION: BuiltinDemo = {
  id: "zombies-mansion",
  manifest: {
    name: "Zombies: The Mansion",
    seed: 77_007,
    // The foyer, where the starter pistol is already in hand; the spawn's
    // height is the terrain surface, so the middle entry is written at the
    // foyer floor. The script's own checkpoint stands every later respawn
    // on the same spot.
    spawn: [0, 62, 8],
    mode: "multi",
    models: ZOMBIES_MANSION_MODELS,
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: ZOMBIES_MANSION_SCRIPT,
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
 * The "A Dusty Trip" demo: a sand plain and a road under the default sky, a
 * drivable car a player gets into and steers, gas stations down the road, a
 * dust storm closing from behind, and mutants that chase the driver. It is the
 * proof that a place script can drive a solid prop with its own physics from
 * the local player's held input, carry a rider on it, hold a follow camera, and
 * run a chase-and-survive loop.
 */
const DUSTY_TRIP: BuiltinDemo = {
  id: "a-dusty-trip",
  manifest: {
    name: "A Dusty Trip",
    seed: 42_069,
    spawn: [0, 0, 0],
    mode: "solo",
    models: DUSTY_TRIP_MODELS,
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: DUSTY_TRIP_SCRIPT,
  },
};

/**
 * The "Baldi's Basics in Education and Learning" demo: a port of the
 * original's core loop on a rebuild of its school. Seven notebooks hide in a
 * grid of classrooms and special rooms off a crossing of halls, each opens a
 * multiple-choice math quiz, and every notebook and wrong answer raises
 * Baldi's aggression, with it his speed. A friendly Baldi greets the player
 * until the second notebook or the first wrong answer turns him hostile and
 * brings out his cast; all seven notebooks arm the escape, whose three fake
 * exits must be tried before the east door wins. It is the proof that a place
 * script can ask a player questions through scripted UI mid-place, tune an
 * enemy's speed to the player's own record, swing a door on its hinge, and run
 * a loop of quarry-and-escape rather than a fixed beginning and end.
 */
const BALDI: BuiltinDemo = {
  id: "baldi-basics",
  manifest: {
    name: "Baldi's Basics in Education and Learning",
    seed: 6_115,
    // The school's centre, on the plaza grass; 62 is the plaza surface in
    // world units (the row-30 slab's top, times two). The plan may only build
    // within a limited region around the spawn, so it sits at the centre of
    // the school the script raises; the script then walks the player to the
    // west entrance.
    spawn: [0, 62, 0],
    mode: "solo",
    models: BALDI_MODELS,
  },
  scripts: {
    [MAIN_SCRIPT_FILE]: BALDI_SCRIPT,
    "baldi-level.ts": BALDI_LEVEL_SCRIPT,
    "baldi-quiz.ts": BALDI_QUIZ_SCRIPT,
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
  ZOMBIES_MANSION,
  DONT_POOP,
  DUSTY_TRIP,
  BALDI,
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
  const models: Record<string, AttachedModel> = {};
  for (const file of demo.manifest.models ?? []) {
    try {
      // Served from the site's own root, the same folder every other address
      // in this application is built from (see `vite.config.ts`'s `base`).
      const response = await fetch(`${import.meta.env.BASE_URL}models/${file}`);
      if (response.ok) {
        models[file] = { bytes: new Uint8Array(await response.arrayBuffer()) };
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
