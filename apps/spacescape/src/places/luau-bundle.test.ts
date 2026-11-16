/**
 * The Luau bundler's rules, asserted — the mirror of `bundle.test.ts` for the same
 * promises, because reproducibility is not a property a twin inherits by being a twin.
 *
 * The claims are the three rules of `bundle.ts`'s header, restated where they bite in
 * Luau's shape: sorted ids (arrival order cannot change a byte), one chunk with the
 * guest library in it exactly once, and a `require` the place cannot point at anything
 * the bundler did not choose.
 */

import { describe, expect, it } from "vitest";

import { bundlePlaceLuau } from "./luau-bundle";
import { BundleError } from "./bundle";
import { GUEST_MODULE, RESERVED_HOST_MODULE } from "./bridge";
import { MAX_SCRIPT_SOURCE } from "./limits";

// (The guest library the bundler embeds is the real `guest/place-api.luau` — that is
// the point of bundling the app's own files here rather than a stub.)
const main = (body: string): string =>
  `local M = require("${GUEST_MODULE}")\n${body}`;

describe("reproducibility, the three rules", () => {
  it("is a function of its inputs alone", () => {
    const a = bundlePlaceLuau(
      { "main.luau": main("print(M.double(2))") },
      "main.luau",
    );
    const b = bundlePlaceLuau(
      { "main.luau": main("print(M.double(2))") },
      "main.luau",
    );
    expect(a).toBe(b);
  });

  it("does not let arrival order change a byte", () => {
    // **The whole of rule 1, and the test that caught the QuickJS twin's first bug.**
    // Two peers receive a zip's entries in the order the archive happens to list them;
    // if ids followed that, the same files would bundle to different text.
    const files = {
      "main.luau": `local x = require("./helper.luau")\nprint(x)`,
      "helper.luau": "return 1",
      "extra.luau": "return 2",
    };
    const forward = bundlePlaceLuau(files, "main.luau");
    const shuffled = bundlePlaceLuau(
      Object.fromEntries([...Object.entries(files)].reverse()),
      "main.luau",
    );
    expect(shuffled).toBe(forward);
  });

  it("keys the module table by the sorted id, not the file name", () => {
    // A require rewritten to an id and a table keyed by a name was the bug that made
    // the first end-to-end run answer `no module called 0`; the pair is asserted now.
    const bundle = bundlePlaceLuau(
      { "main.luau": `require("./helper.luau")`, "helper.luau": "return 1" },
      "main.luau",
    );
    expect(bundle).toContain(`__modules["0"]`);
    expect(bundle).toContain(`__modules["1"]`);
    expect(bundle).toContain('require("0")');
    expect(bundle).not.toContain('__modules["main.luau"]');
  });

  it("includes the guest library exactly once, however many files ask for it", () => {
    const bundle = bundlePlaceLuau(
      {
        "main.luau": `${main("print(1)")}\nlocal again = require("${GUEST_MODULE}")`,
      },
      "main.luau",
    );
    const guestOpens = [...bundle.matchAll(/__modules\["spacescape"\]/g)];
    expect(guestOpens).toHaveLength(1);
  });

  it("rewrites the legacy guest name to the one library", () => {
    const bundle = bundlePlaceLuau(
      { "main.luau": 'local M = require("voxelscape")\nprint(M)' },
      "main.luau",
    );
    expect(bundle).toContain(`require("${GUEST_MODULE}")`);
    expect(bundle).not.toContain('require("voxelscape")');
  });
});

describe("what a place may require, and what the answer costs", () => {
  const refuses = (files: Record<string, string>, entry: string): string => {
    try {
      bundlePlaceLuau(files, entry);
    } catch (error) {
      expect(error).toBeInstanceOf(BundleError);
      return (error as BundleError).message;
    }
    throw new Error("expected the bundle to refuse, and it did not");
  };

  it("refuses a file that is not there, naming the importer and the name", () => {
    expect(
      refuses({ "main.luau": 'require("./door.luau")' }, "main.luau"),
    ).toContain(
      'imports "./door.luau", which is not one of this place\'s files',
    );
  });

  it("refuses the host, with the same sentence the TypeScript twin says", () => {
    const message = refuses(
      { "main.luau": `require("${RESERVED_HOST_MODULE}")` },
      "main.luau",
    );
    expect(message).toContain("not available to a place");
  });

  it("refuses the outside: urls, absolute paths, and ..", () => {
    for (const specifier of [
      "https://somewhere/evil.luau",
      "/etc/passwd.luau",
      "../outside.luau",
    ]) {
      const message = refuses(
        { "main.luau": `require("${specifier}")` },
        "main.luau",
      );
      expect(message, specifier).toContain(specifier);
    }
  });

  it("refuses a directory in a name, because the namespace is flat", () => {
    expect(
      refuses({ "main.luau": 'require("./nest/door.luau")' }, "main.luau"),
    ).toContain("flat namespace");
  });

  it("resolves ./ and no-extension spellings of a real file to the same id", () => {
    const spellings = ["./helper.luau", "./helper", "helper.luau", "helper"];
    const ids = spellings.map((specifier) => {
      const bundle = bundlePlaceLuau(
        { "main.luau": `require("${specifier}")`, "helper.luau": "return 1" },
        "main.luau",
      );
      const call = bundle.match(/require\("(\d)"\)/);
      return call?.[1];
    });
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBeDefined();
  });

  it("refuses an entry that is not one of the files", () => {
    expect(refuses({ "other.luau": "return 1" }, "main.luau")).toContain(
      "is not one of this place's files",
    );
  });

  it("bounds each file's source the way the TypeScript twin does", () => {
    const tooBig = "x".repeat(MAX_SCRIPT_SOURCE + 1);
    expect(refuses({ "main.luau": tooBig }, "main.luau")).toContain("limit");
  });
});

describe("levels, in the shape the guest library asserts", () => {
  it("injects the documents at the sentinel, and refuses loudly without one", () => {
    const withLevels = bundlePlaceLuau(
      { "main.luau": 'require("spacescape")' },
      "main.luau",
      // The real library carries the sentinel; this asserts against it, not a stub,
      // so a library edited without its `local __levels = {}` fails here first.
      {},
    );
    expect(withLevels).toContain("local __levels = {}");

    const carrying = bundlePlaceLuau(
      { "main.luau": 'require("spacescape")' },
      "main.luau",
      { "plan.json": '{"version":1,"items":[[1,2]]}' },
    );
    expect(carrying).not.toContain("local __levels = {}");
    // The JSON's `]]` survives the escape: quoted-escaped strings are the format that
    // does not break on their own content, which is why long brackets were refused.
    expect(carrying).toContain('\\"items\\":[[1,2]]');
  });

  it("is order-independent in the injected table too", () => {
    const levels = { "b.json": "{}", "a.json": '{"k":1}' };
    const a = bundlePlaceLuau({ "main.luau": "" }, "main.luau", levels);
    const b = bundlePlaceLuau({ "main.luau": "" }, "main.luau", {
      "a.json": '{"k":1}',
      "b.json": "{}",
    });
    expect(a).toBe(b);
  });
});
