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
import ANIMAL_HOSPITAL_LUAU_SOURCE from "./demo/animal-hospital.luau?raw";
import ANIMAL_HOSPITAL_LEVEL from "./demo/animal-hospital.json?raw";

/**
 * A world's shape, re-exported so a demo declares it the way a manifest does.
 *
 * **One vocabulary at both ends.** A demo and a zip are the same place by the time they reach
 * the runner, and a demo naming its world with a word of its own would be a second list to
 * drift from the engine's.
 */
export type { WorldShape } from "../world/world-geometry";

/**
 * The seed a demo falls back to when it does not name one.
 *
 * **Imported rather than written out**, because this is the number `loadDemo` seeded a demo's
 * `engine.random` with before a demo was also a project — and the editor's Run has to draw the
 * same patients, at the same coordinates, as the console's Load of the same place.
 */
import { DEFAULT_TERRAIN } from "@big-mesh-studios/csg";

import type { WorldShape } from "../world/world-geometry";
import type { MeshSettings } from "../mesh/mesh-resolution";
import type { PlaceProject } from "./project";

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

  /**
   * What kind of world this demo is about, as `"sphere"` or `"flat"`.
   *
   * **The same field a manifest carries, for the same reason**, and absent on every shipped
   * demo because every shipped demo is on the world this build opens on. It is here so that the
   * first flat demo is one line rather than a new path through `app.tsx`, and so that `/place:load`
   * and `/place:open` cannot come to disagree about what a demo runs on.
   */
  readonly world?: WorldShape;

  /**
   * The level documents this place carries, by the name its script says when it asks for one.
   *
   * **The same `{ name: text }` shape `project.levels` holds and the zip loader builds**, so a
   * demo and a handed-in archive are the same thing to `bundlePlace` by the time they get there —
   * ADR 0021's sentence for the loader, applied one stop earlier. The host folds these into the
   * world *before* the script runs, and `level(name)` inside the guest library asserts presence;
   * the first demo to carry one is the hospital.
   */
  readonly levels?: Readonly<Record<string, string>>;

  /**
   * The seed for the place's own `engine.random`, if it insists on one.
   *
   * **Absent means the world's own**, which is what the demos that build from
   * `getHeightAt(0, 0)` want; a port of a published place states the manifest's number
   * instead, so the draws it made then are the draws it makes here.
   */
  readonly seed?: number;

  /**
   * Whether the player may dig and place while this demo runs, as the manifest says.
   *
   * **Absent means yes**, which is every demo written before the field existed and the
   * twin `PlaceManifest.editable` sentence.
   */
  readonly editable?: boolean;

  /**
   * The meshing this place's geometry expects, exactly as its manifest declares it.
   *
   * **A demo of a published place carries the published place's grid.** The hospital's
   * walls were tuned at `lodSampleSizes [3.2, 6.4, 16]` with creases at 35°; run on the
   * engine default they are the same *place* through a coarser lens — the resolution
   * is part of the artwork, not a detail around it. Absent means the engine's default.
   */
  readonly mesh?: MeshSettings;
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
  {
    id: "animal-hospital",
    summary:
      "The ward in Luau — a patient's journey is the language's own coroutine, and the ceremony the TypeScript twin pays for that is gone",
    // **One file, but not because a place is one file.** The bundle reaches its guest
    // library through the require shim like any other import; the library is not listed
    // here because it belongs to the build, not to the place — ADR 0018's rule, ported.
    files: { "main.luau": ANIMAL_HOSPITAL_LUAU_SOURCE },
    entry: "main.luau",
    // **Flat, and spawned from the original manifest's numbers.** The hospital is a
    // level-plan place on a plane world; `spawn` is stated rather than computed because
    // the lobby floor is not the ground under the origin — the same values the published
    // TypeScript place carries.
    world: "flat",
    spawn: [-267.84, -51.4, 78.22],
    // **Names exactly as the script and the level ask for them**, in their own folder so
    // none of them can shadow a snack model of a similar shape.
    models: Object.fromEntries(
      [
        "hospital-chair.sdfmod",
        "hospital-bed.sdfmod",
        "hospital-computer.sdfmod",
        "hospital-camera.sdfmod",
        "hospital-printer.sdfmod",
        "melty.sdfmod",
        "forms.sdfmod",
        "label.sdfmod",
      ].map((name) => [
        name,
        `${import.meta.env.BASE_URL}models/animal-hospital/${name}`,
      ]),
    ),
    levels: { "animal-hospital.json": ANIMAL_HOSPITAL_LEVEL },
    // **The rest of the original manifest, carried through as its own fields**, so the
    // Luau demo is the same place rather than the same geometry recompiled: the seed the
    // published place drew its patients with, the meshing its walls were tuned at, and
    // the `editable: false` that makes it a ward to walk through rather than a sandbox.
    seed: 20260901,
    editable: false,
    mesh: {
      lodSampleSizes: [3.2, 6.4, 16],
      sharpEdges: 35,
      splitColours: true,
      bakeOcclusion: 0.8,
    },
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

/** What the caller has that a `DemoPlace` does not: the fetched models and the resolved spawn. */
export interface DemoProjectOptions {
  /**
   * The demo's model bytes, by name, as `loadDemoModels` returned them.
   *
   * **The bytes rather than the URLs, because a project holds attachments.** A demo names
   * where its models live so the build can hash them; a project names their content, because
   * that is what the editor edits, the zip writes and a second peer hashes. The caller
   * fetches, this maps, and there is one fetch rather than one per consumer.
   */
  readonly models?: Readonly<Record<string, Uint8Array>>;
  /**
   * Where the player starts, resolved from `spawn`/`spawnAt`/`spawnLift`.
   *
   * **Resolved by the caller because the fallback is a question about the world**, not about
   * the demo: it is the surface over the origin, which only the running session can answer.
   * A hand-placed demo states its own and passes it through unchanged.
   */
  readonly spawn?: PlaceSpawn;
}

/**
 * A shipped demo as the project the editor holds.
 *
 * **A demo *is* a project in all but name**, and this is the name. Everything the editor, the
 * zip writer and the loader expect is here: one manifest whose `scripts`/`models`/`levels`
 * lists are derived from the files actually present, so `isPlaceProject` is true by
 * construction rather than by hope.
 *
 * **Why this exists at all: `/place:load <demo>` adopts it.** The code that is running is the
 * code that `/place:editor` shows — a demo is the example a person is most likely to want to
 * read, and an editor holding an unrelated starter would make the console's two commands
 * disagree about what "the place" means.
 *
 * **The model keys are sorted**, because `loadDemoModels` fills its result in whatever order
 * the fetches resolve. A project's key order reaches `writePlaceZip` and therefore the zip's
 * byte order, and a demo that zips differently on two runs is the reproducibility problem
 * `bundle.ts` spends its header on, one layer out.
 */
export const demoProject = (
  demo: DemoPlace,
  options: DemoProjectOptions = {},
): PlaceProject => {
  const given = options.models ?? {};
  const models: Record<string, Uint8Array> = {};
  for (const name of Object.keys(given).sort()) {
    models[name] = given[name]!;
  }
  const levels = demo.levels ?? {};
  const scripts = demo.files;
  const modelNames = Object.keys(models);
  const levelNames = Object.keys(levels).sort();

  return {
    manifest: {
      name: demo.id,
      seed: demo.seed ?? DEFAULT_TERRAIN.seed,
      entry: demo.entry,
      scripts: Object.keys(scripts).sort(),
      ...(modelNames.length > 0 ? { models: modelNames } : {}),
      ...(levelNames.length > 0 ? { levels: levelNames } : {}),
      ...(demo.world === undefined ? {} : { world: demo.world }),
      ...(demo.editable === undefined ? {} : { editable: demo.editable }),
      ...(demo.mesh === undefined ? {} : { mesh: demo.mesh }),
      ...(options.spawn === undefined ? {} : { spawn: options.spawn }),
    },
    scripts,
    models,
    levels,
  };
};
