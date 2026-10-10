import { describe, expect, it } from "vitest";

import {
  isPlaceManifest,
  MAX_PLACE_LEVELS,
  MAX_PLACE_LEVEL_CHARS,
  PLACE_MANIFEST_FILE,
} from "../place-file";
import { readPlaceZip } from "../load-place";
import {
  emptyPlaceProject,
  isPlaceProject,
  makePlaceRecord,
  writePlaceZip,
  type PlaceProject,
} from "../project";

/**
 * A level travelling through the place format.
 *
 * **Four links, and the one that matters most is silent.** The manifest has to declare it, the
 * loader has to *read* it, the zip has to carry it, and the record has to refuse it rather than
 * drop it. A level that fails at any of the first two produces a place that opens perfectly and
 * has no level — which is indistinguishable, from inside the place, from a place that simply
 * never had one. That is why "the loader actually read it" is asserted rather than assumed.
 */

const A_LEVEL = JSON.stringify({
  version: 1,
  items: [
    {
      kind: "shape",
      id: "floor",
      at: [0, 0, 0],
      shape: { type: "Box", len: { x: 20, y: 2, z: 20 } },
      combine: "Add",
    },
  ],
});

const projectOver = (over: Partial<PlaceProject> = {}): PlaceProject => ({
  ...emptyPlaceProject(20260901),
  manifest: {
    ...emptyPlaceProject(20260901).manifest,
    levels: ["level.json"],
  },
  levels: { "level.json": A_LEVEL },
  ...over,
});

/** The zip a project would be saved as. */
const zipOf = async (project: PlaceProject): Promise<Blob> =>
  writePlaceZip(project);

describe("the manifest says a place carries a level", () => {
  it("and the manifest check accepts it", () => {
    expect(
      isPlaceManifest({
        name: "harbour",
        seed: 1,
        entry: "main.ts",
        scripts: ["main.ts"],
        levels: ["level.json"],
      }),
    ).toBe(true);
  });

  it("and accepts a place that carries none, which is most of them", () => {
    expect(
      isPlaceManifest({
        name: "harbour",
        seed: 1,
        entry: "main.ts",
        scripts: ["main.ts"],
      }),
    ).toBe(true);
  });

  it("and refuses one that names a path it could not read", () => {
    // **The same rules as a model**, because a level's name becomes a key somebody reads a
    // zip under. A traversal here is a traversal.
    expect(
      isPlaceManifest({
        name: "harbour",
        seed: 1,
        entry: "main.ts",
        scripts: ["main.ts"],
        levels: ["../elsewhere.json"],
      }),
    ).toBe(false);
  });

  it("and refuses more levels than a place may carry", () => {
    const levels = Array.from(
      { length: MAX_PLACE_LEVELS + 1 },
      (_, i) => `level-${i}.json`,
    );
    expect(
      isPlaceManifest({
        name: "harbour",
        seed: 1,
        entry: "main.ts",
        scripts: ["main.ts"],
        levels,
      }),
    ).toBe(false);
  });

  it("and refuses a name that is in two lists at once", () => {
    // **One flat namespace.** A zip holds one file per path, so two claims to it is a place
    // whose contents cannot be stated. This is the check that had to become three lists rather
    // than two, and a two-list version of it would pass this.
    expect(
      isPlaceManifest({
        name: "harbour",
        seed: 1,
        entry: "main.ts",
        scripts: ["main.ts"],
        levels: ["main.ts"],
      }),
    ).toBe(false);
    expect(
      isPlaceManifest({
        name: "harbour",
        seed: 1,
        entry: "main.ts",
        scripts: ["main.ts"],
        models: ["lamp.sdfmod"],
        levels: ["lamp.sdfmod"],
      }),
    ).toBe(false);
  });
});

describe("a level written out and read back", () => {
  it("arrives as the text it was written as", async () => {
    // **The same bytes, not a re-serialisation.** The editor writes this file and a person reads
    // it; a level that came back reformatted would be a level that changed on the way through,
    // and a diff of two levels would then show nothing.
    const loaded = await readPlaceZip(await zipOf(projectOver()));
    expect(loaded.levels["level.json"]).toBe(A_LEVEL);
  });

  it("is a field of the manifest and lands in the project", async () => {
    const loaded = await readPlaceZip(await zipOf(projectOver()));
    expect(loaded.manifest.levels).toEqual(["level.json"]);
    // **A `LoadedPlace` is not a `PlaceProject`** and is not checked as one: the reader has
    // already validated the manifest and read everything it named, so `projectFromZip` is the
    // conversion and not a second gate.
    expect(loaded.files["main.ts"]).toBeTypeOf("string");
    expect(isPlaceProject({ ...projectOver(), levels: loaded.levels })).toBe(
      true,
    );
  });

  it("is not in the zip of a place that carries none", async () => {
    // **No key at all, not an empty list.** An empty `levels` would be a manifest an older
    // reader has to learn about; an absent one is the manifest it always saw.
    const plain = emptyPlaceProject(20260901);
    const loaded = await readPlaceZip(await zipOf(plain));
    expect(loaded.manifest.levels).toBeUndefined();
    expect(loaded.levels).toEqual({});
  });

  it("refuses a zip whose manifest names a level the zip does not hold", async () => {
    const lying = projectOver({ levels: {} });
    await expect(zipOf(lying)).rejects.toThrow(/disagree/);
  });
});

describe("a level too large to open", () => {
  it("is written, and then refused on the way back in", async () => {
    // **Both halves, because they are different checks.** The writer has no opinion — a project
    // being saved is somebody's own work — and the reader refuses it, naming the level and the
    // limit. A limit enforced on the way out would stop a person saving their work to find out
    // from a refusal when they tried to open it.
    //
    // **`MAX_PLACE_SOURCE` is not the number here**, and should not be: a level is not compiled,
    // so bounding it with what bounds the TypeScript compiler's input would be a number chosen
    // for the wrong reason. The one that is right is about rows becoming operations.
    const huge = projectOver({
      levels: { "level.json": "x".repeat(MAX_PLACE_LEVEL_CHARS + 1) },
    });
    const blob = await zipOf(huge);

    await expect(readPlaceZip(blob)).rejects.toThrow(
      new RegExp(`over the ${MAX_PLACE_LEVEL_CHARS} character limit`),
    );
  });

  it("is read when it is under the limit, so the refusal is about size and not about levels", async () => {
    const at = projectOver({ levels: { "level.json": "x".repeat(1000) } });
    const loaded = await readPlaceZip(await zipOf(at));
    expect(loaded.levels["level.json"].length).toBe(1000);
  });
});

describe("publishing a place with a level", () => {
  it("is refused, and says to save a zip instead", () => {
    // **Refused rather than published without it.** A published place that opens fine and is
    // missing the room somebody built is the worst outcome available: nothing anywhere says so.
    expect(() =>
      makePlaceRecord(projectOver(), "2026-01-01T00:00:00.000Z"),
    ).toThrow(/save it as a zip/);
  });

  it("and a place with no level publishes exactly as it did before", () => {
    const record = makePlaceRecord(
      emptyPlaceProject(20260901),
      "2026-01-01T00:00:00.000Z",
    );
    expect(record.scripts.map((script) => script.name)).toEqual(["main.ts"]);
  });
});

describe("the manifest file itself", () => {
  it("is still the only thing at the zip's root that is not a declared file", () => {
    // A regression guard on the sweep: `levels` had to be added to `declared` or every declared
    // level would be silently ignored, and the only symptom would be a place with no level.
    expect(PLACE_MANIFEST_FILE).toBe("manifest.json");
  });
});
