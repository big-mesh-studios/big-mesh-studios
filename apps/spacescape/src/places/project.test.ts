/**
 * A place as a thing that can be edited, saved, zipped and published.
 *
 * ## What is being tested
 *
 * **That a project survives a trip.** The zip path is the format's own claim — a place that can be
 * written and opened again — and the record path is the same claim across a network. Both are
 * tested by going there and back, because a format that reads its own output is the only property
 * that makes a hand-written file from another tool defensible at all.
 *
 * **And that the starter script runs.** `emptyPlaceProject` is the first thing a person sees when
 * they open an editor, and it is a string in this repository rather than a file the compiler sees —
 * so unlike `src/places/demo/`, a typo in it would not be caught by `tsc`. It is caught here, by
 * bundling and running it for real, which is the only place a mistake in it can be caught.
 */

import { describe, expect, it } from "vitest";

import {
  emptyPlaceProject,
  isPlaceProject,
  makePlaceRecord,
  projectFromRecord,
  projectFromZip,
  STARTER_SCRIPT,
  STARTER_SCRIPT_FILE,
  writePlaceZip,
  type PlaceProject,
} from "./project";
import { readPlaceZip } from "./load-place";
import {
  PLACE_COLLECTION,
  PLACE_RECORD_VERSION,
  type PlaceRecord,
} from "./place-record";
import { MAX_PLACE_MODEL_BYTES } from "./place-file";
import {
  PlaceHost,
  type HostEffects,
  type HostWorld,
  type RayHit,
} from "./host";
import { PlaceRegistry } from "./place-registry";
import { FoldOrder } from "../edit/fold-order";
import { SculptDocument } from "../edit/document";
import { Field, OperationBVH } from "@big-mesh-studios/csg";
import type { Vec3 } from "@big-mesh-studios/core";
import type { ClockCommands } from "../console/commands";

/** A project that passes, for a test to spoil one part of. */
const project = (over: Partial<PlaceProject> = {}): PlaceProject => ({
  manifest: {
    name: "harbour",
    seed: 20260901,
    entry: "main.ts",
    scripts: ["main.ts"],
  },
  scripts: { "main.ts": 'import { log } from "voxelscape";' },
  models: {},
  levels: {},
  ...over,
});

/** A project carrying one attachment, which nothing decodes yet. */
const withModel = (): PlaceProject => ({
  ...project(),
  manifest: { ...project().manifest, models: ["lantern.sdfmod"] },
  models: { "lantern.sdfmod": new Uint8Array([1, 2, 3, 4]) },
});

describe("a project", () => {
  it("is checked against its own manifest, in both directions", () => {
    expect(isPlaceProject(project())).toBe(true);

    // **A manifest naming a file the project does not hold is a place that will not open.**
    expect(
      isPlaceProject(
        project({
          manifest: { ...project().manifest, scripts: ["main.ts", "span.ts"] },
        }),
      ),
    ).toBe(false);

    // **And a file the manifest does not name is one the loader will refuse the zip for**, which is
    // the same defect seen from the other side.
    expect(
      isPlaceProject(
        project({ scripts: { ...project().scripts, "span.ts": "export {};" } }),
      ),
    ).toBe(false);
  });

  it("refuses a value that is not a project", () => {
    for (const value of [null, undefined, 7, "harbour", []]) {
      expect(isPlaceProject(value), String(value)).toBe(false);
    }
  });
});

describe("a project written as a zip", () => {
  it("opens again as the project that was saved", async () => {
    const saved = withModel();
    const loaded = await readPlaceZip(await writePlaceZip(saved));

    expect(loaded.files).toEqual(saved.scripts);
    expect(loaded.entry).toBe("main.ts");
    // **The attachment survives as bytes.** Not as a decoded model — nothing decodes one yet —
    // but as the same four bytes, which is what makes a project that carries one a project rather
    // than a project with a field nothing fills.
    expect(Object.keys(loaded.models)).toEqual(["lantern.sdfmod"]);
    expect(loaded.models["lantern.sdfmod"]).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it("becomes the project it was written from", async () => {
    const saved = withModel();
    const loaded = projectFromZip(
      await readPlaceZip(await writePlaceZip(saved)),
    );

    expect(isPlaceProject(loaded)).toBe(true);
    expect(loaded.manifest.name).toBe(saved.manifest.name);
    expect(loaded.manifest.models).toEqual(["lantern.sdfmod"]);
  });

  it("says in its manifest only the files it actually holds", async () => {
    // **The manifest written is re-derived from the project, not copied from it.** A manifest
    // edited independently of the files beside it is a zip whose two halves disagree, and the very
    // loader this feeds would refuse it — so the disagreement is made impossible here rather than
    // discovered there.
    const saved = withModel();
    const loaded = await readPlaceZip(await writePlaceZip(saved));

    expect(loaded.manifest.scripts).toEqual(["main.ts"]);
    expect(loaded.manifest.models).toEqual(["lantern.sdfmod"]);
  });

  it("refuses a project whose manifest and files disagree", async () => {
    const disagreeing = project({
      manifest: { ...project().manifest, scripts: ["main.ts", "span.ts"] },
    });

    await expect(writePlaceZip(disagreeing)).rejects.toThrow(
      /manifest and its files disagree/,
    );
  });

  it("refuses a path that walks out of the zip's own root", async () => {
    // **Checked before a byte is written**, because a project holding one is a bug in whatever
    // produced it, and writing it would produce an archive that cannot be opened with no reason
    // given.
    const escaping = project({
      manifest: { ...project().manifest, scripts: ["../outside.ts"] },
      scripts: { "../outside.ts": "export {};" },
    });

    await expect(writePlaceZip(escaping)).rejects.toThrow(
      /not a path this can write/,
    );
  });

  it("refuses an attachment over the size limit, by name", async () => {
    const huge = project({
      manifest: { ...project().manifest, models: ["big.sdfmod"] },
      models: {
        "big.sdfmod": new Uint8Array(MAX_PLACE_MODEL_BYTES + 1),
      },
    });
    const zip = await writePlaceZip(huge);

    await expect(readPlaceZip(zip)).rejects.toThrow(
      /"big\.sdfmod" is over the \d+ byte limit on one attachment/,
    );
  });
});

describe("a project published as a record", () => {
  it("round trips through the record a repository would hold", () => {
    const saved = project();
    const published = makePlaceRecord(saved, "2026-10-08T09:00:00.000Z");
    const read = projectFromRecord(published);

    expect(read).not.toBeNull();
    expect(read?.manifest.name).toBe("harbour");
    expect(read?.manifest.seed).toBe(20260901);
    expect(read?.manifest.entry).toBe("main.ts");
    expect(read?.scripts).toEqual(saved.scripts);
  });

  it("carries the collection, the version, and when it was published", () => {
    const published = makePlaceRecord(project(), "2026-10-08T09:00:00.000Z");

    expect(published.$type).toBe(PLACE_COLLECTION);
    expect(published.version).toBe(PLACE_RECORD_VERSION);
    expect(published.createdAt).toBe("2026-10-08T09:00:00.000Z");
    // **The version is written on the very first publish**, because a field absent from every
    // record already written cannot be added to them.
    expect(published).toHaveProperty("version", 1);
  });

  it("omits a spawn rather than writing one it does not have", () => {
    // **So a record reads exactly as a publish before the field existed would have written it**,
    // which is what keeps a reader's absence-check meaningful.
    expect(
      makePlaceRecord(project(), "2026-10-08T09:00:00.000Z"),
    ).not.toHaveProperty("spawn");

    const spawned = project({
      manifest: { ...project().manifest, spawn: [4, 30, -8] },
    });
    expect(makePlaceRecord(spawned, "2026-10-08T09:00:00.000Z").spawn).toEqual([
      4, 30, -8,
    ]);
  });

  it("refuses to publish an attachment nothing can publish yet", () => {
    // **Not dropped silently.** A record is JSON and an attachment is bytes, so carrying one means
    // uploading it as a blob and naming the blob — which needs a publisher and a model with an
    // identity, and `apps/sdf-modeller`'s project file has neither (ADR 0033). Publishing a place
    // with its file quietly missing would be worse than refusing.
    expect(() =>
      makePlaceRecord(withModel(), "2026-10-08T09:00:00.000Z"),
    ).toThrow(/nothing can publish yet/);
  });

  it("reads a record back in name order, whatever order it was written in", () => {
    // **A record lists its scripts in whatever order its publisher walked them**, so a project
    // read back must not depend on it.
    const shuffled: Record<string, unknown> = {
      $type: PLACE_COLLECTION,
      version: 1,
      name: "harbour",
      seed: 1,
      entry: "a.ts",
      createdAt: "2026-10-08T09:00:00.000Z",
      scripts: [
        { name: "b.ts", source: "export const b = 1;" },
        { name: "a.ts", source: "export const a = 1;" },
      ],
    };

    expect(projectFromRecord(shuffled)?.manifest.scripts).toEqual([
      "a.ts",
      "b.ts",
    ]);
  });

  it("refuses a record that is not one", () => {
    for (const value of [null, undefined, 7, "harbour", {}, []]) {
      expect(projectFromRecord(value), String(value)).toBeNull();
    }
  });
});

/** A flat floor at `y = 0` and nothing else, so the place's own geometry is what is walked on. */
const stubWorld = (): HostWorld & { places: PlaceRegistry } => {
  const places = new PlaceRegistry(new FoldOrder());
  const document = new SculptDocument();
  return {
    places,
    terrainHeight: () => 0,
    geometryChanged: () => {},
    solidAt: (x, y, z) =>
      new Field(new OperationBVH(places.flatten(document.list))).distance(
        x,
        y,
        z,
      ) < 0,
    waterAt: (_x, y, _y) => y < -10,
    raycast: (): RayHit | undefined => undefined,
  };
};

const stubEffects = (asked: string[]): HostEffects => ({
  narrate: () => {},
  dialog: () => {},
  closeDialog: () => {},
  ending: () => {},
  log: (text) => asked.push(`log:${text}`),
  toast: (text) => asked.push(`toast:${text}`),
  movePlayer: (at: Vec3, yaw) =>
    asked.push(`move:${at.x},${at.y},${at.z},${yaw ?? ""}`),
  setPlayerSpeed: (m) => asked.push(`speed:${m}`),
  setPlayerJump: (m) => asked.push(`jump:${m}`),
  setFlying: (on) => asked.push(`fly:${on}`),
  lookAt: (at: Vec3, fov) =>
    asked.push(`look:${at.x},${at.y},${at.z},${fov ?? ""}`),
  clearCamera: () => asked.push("camera-clear"),
});

const stubClock = (asked: string[]): ClockCommands => ({
  jumpTo: (seconds) => asked.push(`clock:${seconds}`),
  setSpeed: (multiplier) => asked.push(`clock-speed:${multiplier}`),
  clearOverride: () => asked.push("clock-live"),
  describe: () => "stub clock",
});

describe("the place a new project starts from", () => {
  const loadStarter = async (): Promise<{
    host: PlaceHost;
    notices: string[];
    asked: string[];
  }> => {
    const started = emptyPlaceProject(20260901);
    const asked: string[] = [];
    const notices: string[] = [];
    const host = new PlaceHost({
      files: started.scripts,
      entry: started.manifest.entry,
      seed: started.manifest.seed,
      now: () => 1_700_000_000_000,
      world: stubWorld(),
      effects: stubEffects(asked),
      clock: stubClock(asked),
      onNotice: (message) => notices.push(message),
    });
    await host.load();
    return { host, notices, asked };
  };

  it("is a project this can write, open and run", () => {
    // **The first thing a person sees, checked the whole way round before they ever see it.**
    const started = emptyPlaceProject(20260901);

    expect(isPlaceProject(started)).toBe(true);
    expect(started.manifest.entry).toBe(STARTER_SCRIPT_FILE);
    expect(started.manifest.scripts).toEqual([STARTER_SCRIPT_FILE]);
    expect(started.models).toEqual({});
  });

  it("runs without a single refusal", async () => {
    // **The starter is a string here rather than a file the compiler sees**, so unlike
    // `src/places/demo/` a typo in it is not caught by `tsc` — this is the only place it can be.
    const { notices } = await loadStarter();
    expect(notices).toEqual([]);
  });

  it("builds a shape, a light and a zone, so the whole vocabulary is on screen", async () => {
    // **One of each kind.** A starter that showed only geometry would leave a person unable to
    // discover that this engine has lights and reacts to them at all.
    const { host } = await loadStarter();

    expect(host.places.operationCount).toBeGreaterThan(0);
    expect(host.lightCount).toBe(1);
    expect(host.zoneList.length).toBe(1);
  });

  it("reacts when the player walks into its zone", async () => {
    // **And the zone is a working one, not a box that is merely drawn.** Walking into it is the
    // whole of this engine's reactivity, so a starter whose zone does nothing would be the worst
    // possible first impression.
    const { host, asked } = await loadStarter();

    host.movePlayer(0, 40, 0);
    host.step();

    expect(asked).toContain("log:arrived at centre");
  });

  it("survives being written out and opened again", async () => {
    const started = emptyPlaceProject(20260901);
    const reopened = projectFromZip(
      await readPlaceZip(await writePlaceZip(started)),
    );

    expect(isPlaceProject(reopened)).toBe(true);
    expect(reopened?.scripts[STARTER_SCRIPT_FILE]).toBe(STARTER_SCRIPT);
  });
});

describe("a record read back from a repository", () => {
  it("is not trusted to be the record its fields describe", () => {
    // **A record passes `isPlaceRecord` and still has to produce a project that passes
    // `isPlaceProject`.** The two ask different questions — whether this is a place, and whether
    // it is a place whose files are all present — and only the second one catches a record whose
    // entry names a script it forgot to carry.
    const incomplete: Record<string, unknown> = {
      $type: PLACE_COLLECTION,
      version: 1,
      name: "harbour",
      seed: 1,
      entry: "span.ts",
      createdAt: "2026-10-08T09:00:00.000Z",
      scripts: [{ name: "main.ts", source: "export {};" }],
    };

    expect(projectFromRecord(incomplete)).toBeNull();
  });

  it("is a type a publisher can hand to a repository without a cast", () => {
    // **The shape `putRecord` wants.** Checked here because the failure it prevents is a type
    // error at a call site that does not exist yet, which no test in this file would otherwise
    // ever reach.
    const record: PlaceRecord = makePlaceRecord(
      project(),
      "2026-10-08T09:00:00.000Z",
    );
    const body: Record<string, unknown> = record;

    expect(body.$type).toBe(PLACE_COLLECTION);
  });
});
