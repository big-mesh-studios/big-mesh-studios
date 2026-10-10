/**
 * The places this build ships with.
 *
 * ## Why they are here at all
 *
 * A place's on-disk form — a zip with a manifest — is a later phase, and until then the only
 * way to load one is to have it in the tree. That is worth doing for two reasons beyond
 * convenience: it is the only way to *see* the whole stack working end to end in a browser
 * before anything is on disk, and a built-in place is something to point the reference
 * implementation at while the two are still being brought into agreement.
 *
 * ## A demo is more than one file, where it should be
 *
 * `bridge` ships as `main.ts` plus `span.ts`, because a place is a bundle and a single-file
 * demo would only ever demonstrate the case that needs no bundler. That one import is the
 * whole of the multi-file path: the bundler rewrites `./span` to a module id, and the
 * interpreter requires it the ordinary way.
 *
 * ## They are `?raw`, so they are type-checked and bundled
 *
 * **A place's source is TypeScript that the compiler sees**, the same as the guest library —
 * which is the point of ADR 0018 and the reason these are `.ts` files rather than strings. A
 * demo that does not compile is a failing demo rather than a broken example, and a typo in an
 * effect's field name is caught here rather than at runtime by a refusal.
 *
 * `import … ?raw` rather than a `Record<string, string>` literal, so the source is the file and
 * the file is the source. There is no second copy to drift.
 *
 * ## What they are not
 *
 * Not a showcase. Each is small enough to read in one sitting and does one thing, because a
 * demo that does four things demonstrates none of them — the same argument
 * `csg/cost.test.ts` makes about asserting a *change* rather than a number.
 */

import type { PlaceSpawn } from "./place-file";

import SNACK_SOURCE from "./demo/snack.ts?raw";
import SNACK_COMBOS_SOURCE from "./demo/snack-combos.ts?raw";
import SNACK_TABLES_SOURCE from "./demo/snack-tables.ts?raw";
import {
  MODELS as SNACK_MODELS,
  PLATFORM_LIFT as SNACK_LIFT,
  SPAWN as SNACK_SPAWN,
} from "./demo/snack-tables";
import BRIDGE_SOURCE from "./demo/bridge.ts?raw";
import SPAN_SOURCE from "./demo/span.ts?raw";
import LANTERN_SOURCE from "./demo/lanterns.ts?raw";
import LOOKOUT_SOURCE from "./demo/lookout.ts?raw";
import CONVEYOR_SOURCE from "./demo/conveyor.ts?raw";

/** One of the places this build ships. */
export interface DemoPlace {
  readonly id: string;
  /** What it does, in a phrase, for the console's list. */
  readonly summary: string;
  readonly files: Readonly<Record<string, string>>;
  readonly entry: string;
  /**
   * Where this place's models live, by the name a script asks for them under.
   *
   * **A URL rather than the bytes, because a demo is part of this build.** A `?url` import is
   * hashed and copied into the bundle's output, which means a model that changes is a changed
   * file and a rebuild picks it up; inlining forty zips as base64 would put several hundred
   * kilobytes of them in the JavaScript and make every model a parse on the first frame. The
   * bytes arrive through `loadDemoModels`, which is called at load and not at module scope for
   * the same reason `jszip` is imported lazily.
   *
   * **Optional, and absent from every demo but one.** A place that builds its world out of
   * primitives has no models, and the honest shape for "none" is the field being absent rather
   * than an empty map — which is the rule ADR 0017 states for a payload. What is *not*
   * optional is that a script naming a model this place does not attach gets nothing and not an
   * empty shape: see `model-library.ts`.
   */
  readonly models?: Readonly<Record<string, string>>;

  /**
   * Where to put the player when this place loads, in world units.
   *
   * **Declared rather than assumed**, the same field a place's manifest carries. A demo that
   * builds on the planet's surface wants the player on the surface too, and a demo that builds
   * in the air wants them wherever the thing is — so the placement is the demo's to state.
   *
   * **Absent means the ground above the origin**, which is what a demo authored against
   * `getHeightAt(0, 0)` wants and is the reason this can be left out of most of them. See
   * `loadDemo` for how the fallback is computed: from the same surface query the script itself
   * gets, so the two cannot disagree about where the ground is.
   */
  readonly spawn?: PlaceSpawn;

  /**
   * Where the fallback spawn sits in plan, in world units, when `spawn` is not given.
   *
   * **Because a demo's floor is not always over the origin.** The fallback is the ground above
   * `(0, 0)`, and `snack` puts the corner where its interior walls cross there: the ground over
   * the origin is inside that wall, so the player starts stuck in it. The bedroom the player
   * wakes in is one quadrant over, so the demo states its own `[x, z]` and the app keeps
   * computing the `y` from the surface and `spawnLift`. Absent is `[0, 0]`, which is every other
   * demo.
   */
  readonly spawnAt?: readonly [number, number];

  /**
   * How far above that fallback ground to put the player, when `spawn` is not given.
   *
   * **For a demo whose own floor is raised above the ground**, which is `snack`: it builds on a
   * flat platform above the sea, so a spawn on the raw ground would land in the platform's side
   * or in the water. The value is the same one the script raises its floor by — imported from
   * the tables both share — so the spawn the app computes and the floor the script builds move
   * together. Absent is zero, which is every other demo.
   */
  readonly spawnLift?: number;
}

/**
 * Every demo, in the order `/place:list` shows them.
 *
 * **Ids are names, not indices**, so a console command naming one keeps working when a demo is
 * added or removed around it.
 */
export const DEMO_PLACES: readonly DemoPlace[] = [
  {
    id: "bridge",
    summary:
      "a bridge in two files, with a doorway and a zone that notices you arriving",
    files: { "main.ts": BRIDGE_SOURCE, "span.ts": SPAN_SOURCE },
    entry: "main.ts",
  },
  {
    id: "lanterns",
    summary:
      "a row of real lights, and a timer that turns them on one at a time",
    files: { "main.ts": LANTERN_SOURCE },
    entry: "main.ts",
  },
  {
    id: "conveyor",
    summary:
      "a belt you can stand on and be carried by, and quicksand beside it",
    files: { "main.ts": CONVEYOR_SOURCE },
    entry: "main.ts",
  },
  {
    id: "lookout",
    summary: "a platform above the ground, and the camera pointed at it",
    files: { "main.ts": LOOKOUT_SOURCE },
    entry: "main.ts",
  },
  {
    id: "snack",
    summary:
      "Get a Snack at 4 AM — a house, a shop, a stove, and thirteen ways for a night to go wrong",
    // **Three files, because a place is a bundle.** `snack.ts` is the state machine,
    // `snack-combos.ts` is the breakfast machine's thirty-three-row pair table, and
    // `snack-tables.ts` is every coordinate and price the two of them share.
    files: {
      "snack.ts": SNACK_SOURCE,
      "snack-combos.ts": SNACK_COMBOS_SOURCE,
      "snack-tables.ts": SNACK_TABLES_SOURCE,
    },
    entry: "snack.ts",
    // **The player starts on the platform, not the ground under it, and in the bedroom rather
    // than on the origin the interior walls cross.** See `PLATFORM_LIFT` and `SPAWN`.
    spawnLift: SNACK_LIFT,
    spawnAt: SNACK_SPAWN,
    // **Thirty-nine models, named exactly as the script asks for them.** A name here that the
    // script does not use is a wasted download; a name the script uses and this omits is a prop
    // that never appears, reported by `ModelLibrary` as a problem against the place's name.
    models: Object.fromEntries(
      SNACK_MODELS.map((name) => [
        name,
        `${import.meta.env.BASE_URL}models/${name}.sdfmod`,
      ]),
    ),
  },
];

/** The demo with that id, or undefined. */
export const demoPlace = (id: string): DemoPlace | undefined =>
  DEMO_PLACES.find((demo) => demo.id === id);

/**
 * Fetches a demo's models and hands back the bytes, by name.
 *
 * **Every failure is dropped rather than thrown, and the reason is in what this feeds.** The
 * next thing to happen is `ModelLibrary.from`, which reports a model it cannot read as a notice
 * and carries on with the rest — so a demo whose vending machine failed to fetch still opens,
 * with a vending machine missing and a line in `/place:notices` saying which. Throwing here
 * would make one 404 decide whether the whole place runs.
 *
 * **Fetched in parallel and read into whatever order they arrive**, because nothing here cares
 * about order: `ModelLibrary` reads the bytes and `place-file.ts` already checks that a
 * manifest's names and its attachments agree, so the order a place *asks* for models in is not
 * this module's business.
 */
export const loadDemoModels = async (
  urls: Readonly<Record<string, string>>,
): Promise<Record<string, Uint8Array>> => {
  const bytes: Record<string, Uint8Array> = {};
  await Promise.all(
    Object.entries(urls).map(async ([name, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        bytes[name] = new Uint8Array(await response.arrayBuffer());
      } catch {
        // Nothing to say here. `ModelLibrary` is where a model that did not arrive becomes a
        // sentence a person reads, and it says it by name, which is better than a fetch stack
        // here that nothing would ever print.
      }
    }),
  );
  return bytes;
};

/**
 * The demo ids, for a console command's completion.
 *
 * Read from `DEMO_PLACES` rather than written out, so adding a demo makes it completable with
 * nothing else to remember.
 */
export const demoIds = (): readonly string[] =>
  DEMO_PLACES.map((demo) => demo.id);
