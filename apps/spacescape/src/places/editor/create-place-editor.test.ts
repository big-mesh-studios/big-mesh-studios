/**
 * The editor's state: the project being worked on, and the edits that can be made to it.
 *
 * ## What is being tested
 *
 * **That no edit can leave the project incoherent.** The claim this module exists to make is that
 * `project.scripts` and `project.manifest.scripts` cannot drift, because `edit` rebuilds the
 * manifest's list from the files. That is invisible while it holds, and the failure it prevents is
 * a `writePlaceZip` refusal on the Save button — so every test here ends by asking
 * `isPlaceProject`, and one of them is the claim on its own.
 *
 * **And that an edit which cannot be made is refused rather than half-made.** Renaming to nothing,
 * removing the only file, adding a file over the limit: each has a sensible-looking wrong answer,
 * and each of those is what this file exists to catch.
 *
 * ## Every test flushes
 *
 * **A setter's value lands after a microtask flush, so `project()` still answers with the previous
 * one until then.** That is Solid 2 rather than a choice this file makes, and `console.test.tsx`
 * flushes for the same reason. The alternative — reading through the signal and hoping — is what
 * made the first version of `addScript` add the same name two hundred times.
 */

import { flush } from "solid-js";
import { describe, expect, it } from "vitest";

import { createPlaceEditor } from "./create-place-editor";
import {
  emptyPlaceProject,
  isPlaceProject,
  STARTER_SCRIPT_FILE,
} from "../project";
import {
  MAX_PLACE_FILES,
  MAX_PLACE_LEVEL_CHARS,
  MAX_PLACE_LEVELS,
  MAX_PLACE_MODEL_BYTES,
  MAX_PLACE_MODELS,
} from "../place-file";

/** An editor over a project with a second file, for the tests that need one. */
const twoFiles = (): ReturnType<typeof createPlaceEditor> => {
  const editor = createPlaceEditor(7);
  editor.addScript("span.ts");
  flush();
  return editor;
};

describe("a new place", () => {
  it("starts as the starter project, and is coherent", () => {
    const editor = createPlaceEditor();
    const started = editor.project();

    expect(isPlaceProject(started)).toBe(true);
    expect(started.manifest.entry).toBe(STARTER_SCRIPT_FILE);
    expect(started.manifest.scripts).toEqual([STARTER_SCRIPT_FILE]);
    expect(editor.active()).toBe(STARTER_SCRIPT_FILE);
  });

  it("takes the seed it was given, because a place's world has to be reproducible", () => {
    // **ADR 0016's whole argument in one call.** Two people loading the same place must arrive at
    // the same ground, and the seed is the whole of how.
    expect(createPlaceEditor(1234).project().manifest.seed).toBe(1234);
  });

  it("is the starter project a person is given, not a blank file", () => {
    // **The starter builds a shape, a light and a zone.** `project.test.ts` runs it; this says the
    // thing a person is handed is that rather than an empty document.
    expect(createPlaceEditor().project().scripts[STARTER_SCRIPT_FILE]).not.toBe(
      "",
    );
  });
});

describe("writing in a file", () => {
  it("changes the source, and leaves everything else alone", () => {
    const editor = twoFiles();
    const before = editor.project();

    editor.write("span.ts", "// a bridge");
    flush();

    expect(editor.project().scripts["span.ts"]).toBe("// a bridge");
    expect(editor.project().manifest.entry).toBe(before.manifest.entry);
    expect(editor.project().manifest.seed).toBe(before.manifest.seed);
    expect(isPlaceProject(editor.project())).toBe(true);
  });

  it("ignores a write to a file that is not there", () => {
    // **Silent rather than thrown**, because a keystroke can arrive for a tab that was just
    // removed and a person's typing should not throw. The project is untouched.
    const editor = twoFiles();
    const before = editor.project();

    editor.write("absent.ts", "// nothing");
    flush();

    expect(editor.project()).toBe(before);
  });
});

describe("the manifest a person can change", () => {
  it("renames the place", () => {
    const editor = createPlaceEditor();
    editor.setName("the harbour");
    flush();
    expect(editor.project().manifest.name).toBe("the harbour");
  });

  it("refuses a name that is not one", () => {
    // **An empty name is a field mid-edit, not a request to rename a place to nothing.** The
    // manifest's own validator would refuse it at save time, and the header would show a place
    // with no name in the meantime.
    const editor = createPlaceEditor();
    editor.setName("harbour");
    editor.setName("");
    flush();
    expect(editor.project().manifest.name).toBe("harbour");
  });

  it("changes the seed, and refuses one that is not a number", () => {
    const editor = createPlaceEditor();
    editor.setSeed(99);
    flush();
    expect(editor.project().manifest.seed).toBe(99);

    editor.setSeed(Number.NaN);
    flush();
    expect(editor.project().manifest.seed).toBe(99);
  });

  it("sets and clears a spawn", () => {
    const editor = createPlaceEditor();

    editor.setSpawn([1, 2, 3]);
    flush();
    expect(editor.project().manifest.spawn).toEqual([1, 2, 3]);

    editor.setSpawn(undefined);
    flush();
    expect(editor.project().manifest.spawn).toBeUndefined();
    // **Absent rather than undefined-valued**, because that is what the record and the zip both
    // check for, and a key present with the value `undefined` serialises to nothing anyway.
    expect(Object.hasOwn(editor.project().manifest, "spawn")).toBe(false);
    expect(isPlaceProject(editor.project())).toBe(true);
  });

  it("locks and unlocks editing, writing the field only when locked", () => {
    // **Unlocking deletes rather than writing `true`**, because absent is what a place written
    // before the field existed says and the two mean the same thing. The project stays coherent
    // either way, which is what `edit` exists to guarantee.
    const editor = createPlaceEditor();

    editor.setEditable(false);
    flush();
    expect(editor.project().manifest.editable).toBe(false);
    expect(isPlaceProject(editor.project())).toBe(true);

    editor.setEditable(true);
    flush();
    expect(editor.project().manifest.editable).toBeUndefined();
    expect(Object.hasOwn(editor.project().manifest, "editable")).toBe(false);
    expect(isPlaceProject(editor.project())).toBe(true);
  });
});

describe("adding a file", () => {
  it("names the next one itself, and opens it", () => {
    const editor = createPlaceEditor();

    const name = editor.addScript();
    flush();

    expect(name).toBe("untitled-1.ts");
    expect(editor.active()).toBe("untitled-1.ts");
    expect(editor.project().manifest.scripts).toEqual([
      STARTER_SCRIPT_FILE,
      "untitled-1.ts",
    ]);
  });

  it("takes the name it was given when it is usable", () => {
    const editor = createPlaceEditor();
    expect(editor.addScript("span.ts")).toBe("span.ts");
    flush();
  });

  it("refuses a name already taken rather than overwriting the file", () => {
    // **Overwriting would be the wrong answer to a near-miss.** Somebody who asks for `span.ts`
    // twice has made a mistake, and silently destroying the first is worse than saying no.
    const editor = twoFiles();
    expect(editor.addScript("span.ts")).toBeNull();
    flush();
    expect(editor.project().scripts["span.ts"]).toBe("");
  });

  it("refuses a name that is not a safe path or is not a script", () => {
    // **`isSafePathName` is the whole traversal defence** (ADR 0021), and a name here becomes a
    // key in a zip and a module id in the bundler. A file that is not `.ts` is refused for the
    // other reason: it would not be bundled.
    const editor = createPlaceEditor();
    for (const name of ["../evil.ts", "/etc/passwd", "a\\b.ts", "notes.md"]) {
      expect(editor.addScript(name), name).toBeNull();
    }
    flush();
    expect(editor.project().manifest.scripts).toEqual([STARTER_SCRIPT_FILE]);
  });

  it("refuses a file over the limit", () => {
    const editor = createPlaceEditor();
    while (true) {
      flush();
      if (editor.project().manifest.scripts.length >= MAX_PLACE_FILES) break;
      expect(editor.addScript()).not.toBeNull();
    }
    flush();
    expect(editor.addScript("one-too-many.ts")).toBeNull();
    expect(editor.project().manifest.scripts).toHaveLength(MAX_PLACE_FILES);
  });
});

describe("removing a file", () => {
  it("removes it from the manifest's list too", () => {
    // **The claim the module exists to make.** The manifest names its files, and a list that
    // outlived the file it names is a place `writePlaceZip` refuses.
    const editor = twoFiles();

    editor.removeScript("span.ts");
    flush();

    expect(editor.project().scripts["span.ts"]).toBeUndefined();
    expect(editor.project().manifest.scripts).toEqual([STARTER_SCRIPT_FILE]);
    expect(isPlaceProject(editor.project())).toBe(true);
  });

  it("refuses to remove the only file, because then the place has no entry", () => {
    // **The tempting alternative is to make another file the entry**, and that changes what runs
    // without anybody asking. A place with one program does not get to lose it.
    const editor = createPlaceEditor();
    expect(editor.removeScript(STARTER_SCRIPT_FILE)).toBeNull();
    flush();
    expect(editor.project().scripts[STARTER_SCRIPT_FILE]).toBeDefined();
  });

  it("hands the entry to another file when the entry itself goes", () => {
    // **And says which file it moved to by opening it**, so the person is not left looking at a
    // file that is no longer there.
    const editor = twoFiles();
    editor.setEntry("span.ts");
    editor.setActive("span.ts");

    editor.removeScript("span.ts");
    flush();

    expect(editor.project().manifest.entry).toBe(STARTER_SCRIPT_FILE);
    expect(editor.active()).toBe(STARTER_SCRIPT_FILE);
  });

  it("leaves the entry alone when a different file goes", () => {
    const editor = createPlaceEditor();
    editor.addScript("span.ts");
    editor.setEntry("span.ts");
    editor.setActive(STARTER_SCRIPT_FILE);

    editor.removeScript("span.ts");
    flush();

    expect(editor.project().manifest.entry).toBe("main.ts");
    expect(editor.active()).toBe(STARTER_SCRIPT_FILE);
  });

  it("ignores a request to remove a file that is not there", () => {
    const editor = twoFiles();
    expect(editor.removeScript("absent.ts")).toBeNull();
    flush();
    expect(editor.project().manifest.scripts).toHaveLength(2);
  });
});

describe("attaching a model", () => {
  it("carries the bytes and names them in the manifest", () => {
    const editor = createPlaceEditor();
    const bytes = new Uint8Array([1, 2, 3]);

    expect(editor.attachModel("fridge.sdfmod", bytes)).toBeNull();
    flush();

    expect(editor.project().models["fridge.sdfmod"]).toBe(bytes);
    expect(editor.project().manifest.models).toEqual(["fridge.sdfmod"]);
    expect(isPlaceProject(editor.project())).toBe(true);
  });

  it("replaces a model already attached under the same name", () => {
    // **A re-saved `.sdfmod` updates in place**, rather than becoming a second attachment whose
    // name — the only handle a model has (ADR 0033) — would be the same for two files.
    const editor = createPlaceEditor();
    editor.attachModel("fridge.sdfmod", new Uint8Array([1]));
    flush();
    const next = new Uint8Array([9, 9]);

    expect(editor.attachModel("fridge.sdfmod", next)).toBeNull();
    flush();

    expect(editor.project().models["fridge.sdfmod"]).toBe(next);
    expect(editor.project().manifest.models).toEqual(["fridge.sdfmod"]);
  });

  it("refuses an unsafe or colliding name, and says why", () => {
    // **One flat namespace across scripts, models and levels** (`place-file.ts`). A name used by
    // a script is refused rather than overwriting it, and the refusal names the reason.
    const editor = twoFiles();
    expect(editor.attachModel("../evil.sdfmod", new Uint8Array())).toMatch(
      /name/,
    );
    expect(editor.attachModel("span.ts", new Uint8Array())).toMatch(
      /already used/,
    );
    flush();
    expect(editor.project().manifest.models).toBeUndefined();
  });

  it("refuses one model too many", () => {
    const editor = createPlaceEditor();
    for (let index = 0; index < MAX_PLACE_MODELS; index++) {
      expect(
        editor.attachModel(`m${index}.sdfmod`, new Uint8Array([1])),
      ).toBeNull();
    }
    flush();
    expect(
      editor.attachModel("one-too-many.sdfmod", new Uint8Array([1])),
    ).toMatch(/at most/);
    expect(editor.project().manifest.models).toHaveLength(MAX_PLACE_MODELS);
  });

  it("refuses bytes over the limit", () => {
    const editor = createPlaceEditor();
    const big = new Uint8Array(MAX_PLACE_MODEL_BYTES + 1);
    expect(editor.attachModel("big.sdfmod", big)).toMatch(/limit/);
    flush();
    expect(editor.project().manifest.models).toBeUndefined();
  });
});

describe("removing a model", () => {
  it("drops it and its manifest entry", () => {
    const editor = createPlaceEditor();
    editor.attachModel("fridge.sdfmod", new Uint8Array([1]));
    flush();

    expect(editor.removeModel("fridge.sdfmod")).toBeNull();
    flush();

    expect(editor.project().models["fridge.sdfmod"]).toBeUndefined();
    expect(editor.project().manifest.models).toBeUndefined();
    expect(isPlaceProject(editor.project())).toBe(true);
  });

  it("says so when there is nothing under that name", () => {
    const editor = createPlaceEditor();
    expect(editor.removeModel("absent.sdfmod")).toMatch(/no model/);
  });
});

describe("a level", () => {
  it("is written, listed, and removed", () => {
    const editor = createPlaceEditor();

    expect(editor.writeLevel("level.json", '{"version":1}')).toBeNull();
    flush();
    expect(editor.project().levels["level.json"]).toBe('{"version":1}');
    expect(editor.project().manifest.levels).toEqual(["level.json"]);

    expect(editor.removeLevel("level.json")).toBeNull();
    flush();
    expect(editor.project().levels["level.json"]).toBeUndefined();
    expect(editor.project().manifest.levels).toBeUndefined();
    expect(isPlaceProject(editor.project())).toBe(true);
  });

  it("is refused when the name collides or the text is too long", () => {
    const editor = twoFiles();
    expect(editor.writeLevel("span.ts", "{}")).toMatch(/already used/);
    expect(
      editor.writeLevel("big.json", "x".repeat(MAX_PLACE_LEVEL_CHARS + 1)),
    ).toMatch(/limit/);
    flush();
    expect(editor.project().manifest.levels).toBeUndefined();
  });

  it("is refused once the place carries the most it may", () => {
    const editor = createPlaceEditor();
    for (let index = 0; index < MAX_PLACE_LEVELS; index++) {
      expect(editor.writeLevel(`l${index}.json`, "{}")).toBeNull();
    }
    flush();
    expect(editor.writeLevel("one-too-many.json", "{}")).toMatch(/at most/);
    expect(editor.project().manifest.levels).toHaveLength(MAX_PLACE_LEVELS);
  });
});

describe("renaming a file", () => {
  it("keeps its position and follows it with the entry and the open tab", () => {
    const editor = twoFiles();
    editor.setEntry("span.ts");
    editor.setActive("span.ts");
    editor.write("span.ts", "// a bridge");
    flush();

    expect(editor.renameScript("span.ts", "bridge.ts")).toBeNull();
    flush();

    expect(editor.project().scripts["bridge.ts"]).toBe("// a bridge");
    expect(editor.project().scripts["span.ts"]).toBeUndefined();
    // **Its position is the second tab's**, so a rename does not shuffle the tab bar.
    expect(editor.project().manifest.scripts).toEqual([
      STARTER_SCRIPT_FILE,
      "bridge.ts",
    ]);
    expect(editor.project().manifest.entry).toBe("bridge.ts");
    expect(editor.active()).toBe("bridge.ts");
    expect(isPlaceProject(editor.project())).toBe(true);
  });

  it("refuses a name that is taken, unsafe or not a script", () => {
    const editor = twoFiles();
    expect(editor.renameScript("span.ts", STARTER_SCRIPT_FILE)).toMatch(
      /already used/,
    );
    expect(editor.renameScript("span.ts", "../evil.ts")).toMatch(/name/);
    expect(editor.renameScript("span.ts", "notes.md")).toMatch(/name/);
    flush();
    expect(editor.project().scripts["span.ts"]).toBe("");
  });

  it("ignores a rename of a file that is not there", () => {
    const editor = twoFiles();
    expect(editor.renameScript("absent.ts", "other.ts")).toMatch(/no file/);
    flush();
    expect(editor.project().manifest.scripts).toHaveLength(2);
  });

  it("is a no-op when the name does not change", () => {
    const editor = twoFiles();
    expect(editor.renameScript("span.ts", "span.ts")).toBeNull();
    flush();
    expect(editor.project().scripts["span.ts"]).toBe("");
  });
});

describe("choosing the entry", () => {
  it("makes another file the one that runs", () => {
    const editor = twoFiles();
    editor.setEntry("span.ts");
    flush();
    expect(editor.project().manifest.entry).toBe("span.ts");
  });

  it("refuses an entry that is not one of the place's own files", () => {
    // **The same check the manifest makes**, and the reason a place cannot name a program that
    // does not exist.
    const editor = twoFiles();
    editor.setEntry("absent.ts");
    flush();
    expect(editor.project().manifest.entry).toBe(STARTER_SCRIPT_FILE);
  });
});

describe("starting over", () => {
  it("throws the work away and gives a new place", () => {
    const editor = twoFiles();
    editor.write("span.ts", "// hours of work");

    editor.newProject(42);
    flush();

    expect(editor.project().manifest.scripts).toEqual([STARTER_SCRIPT_FILE]);
    expect(editor.project().manifest.seed).toBe(42);
    expect(editor.project().scripts[STARTER_SCRIPT_FILE]).toBe(
      emptyPlaceProject(42).scripts[STARTER_SCRIPT_FILE],
    );
  });
});

describe("adopting a place from somewhere else", () => {
  it("takes a project and opens its entry", () => {
    const editor = createPlaceEditor();
    const opened = twoFiles().project();

    expect(editor.adopt(opened)).toBeNull();
    flush();
    expect(editor.project().manifest.name).toBe(opened.manifest.name);
    expect(editor.active()).toBe(opened.manifest.entry);
  });

  it("refuses something that is not a place, and says so", () => {
    // **A refusal that names the problem rather than silently doing nothing**, because the caller
    // is a file picker or a URI and the person is waiting to find out whether it worked.
    const editor = twoFiles();
    const before = editor.project();

    expect(editor.adopt({ manifest: {}, scripts: {} })).toMatch(/not a place/);
    expect(editor.adopt(null)).toMatch(/not a place/);
    flush();
    expect(editor.project()).toBe(before);
  });
});

describe("the revision that replaces open code panes", () => {
  it("changes when a project is adopted from outside", () => {
    // **The one signal the code panes use to replace their documents.** A folder, zip or
    // published place arrives through `adopt`, and the active tab can keep the same file name
    // while its source changes — which CodeMirror deliberately treats as an echo of typing.
    const editor = createPlaceEditor();
    const before = editor.revision();

    expect(editor.adopt(twoFiles().project())).toBeNull();
    flush();

    expect(editor.revision()).toBeGreaterThan(before);
  });

  it("changes when the editor starts over", () => {
    const editor = twoFiles();
    const before = editor.revision();

    editor.newProject(42);
    flush();

    expect(editor.revision()).toBeGreaterThan(before);
  });

  it("does not change for a keystroke or a refused adoption", () => {
    const editor = twoFiles();
    const before = editor.revision();

    editor.write(STARTER_SCRIPT_FILE, "// a keystroke");
    expect(editor.adopt({ manifest: {}, scripts: {} })).toMatch(/not a place/);
    flush();

    expect(editor.revision()).toBe(before);
  });
});

describe("no sequence of edits can leave a project incoherent", () => {
  it("stays coherent through an interleaving of every edit there is", () => {
    // **The claim, as a property rather than as one example.** Each edit alone is covered above;
    // this is the one that fails if `edit` ever stops rebuilding the manifest's list, because no
    // single-edit test would notice a drift introduced by the next one.
    const editor = createPlaceEditor(20260901);
    const order = [
      () => editor.addScript("span.ts"),
      () => editor.write("span.ts", "// a"),
      () => editor.setEntry("span.ts"),
      () => editor.setName("the harbour"),
      () => editor.setSpawn([4, 30, -8]),
      () => editor.addScript("roof.ts"),
      () => editor.setEntry("roof.ts"),
      () => editor.removeScript("span.ts"),
      () => editor.write("roof.ts", "// b"),
      () => editor.setSeed(7),
      () => editor.removeScript("roof.ts"),
      () => editor.setSpawn(undefined),
      // **The attachments and a rename, woven in with the rest.** A model and a level are two
      // more lists the manifest has to agree with, and a rename re-keys a script — each of which
      // `edit` has to keep coherent alongside everything a plain edit does.
      () => editor.attachModel("fridge.sdfmod", new Uint8Array([1])),
      () => editor.writeLevel("level.json", '{"version":1}'),
      () => editor.renameScript(STARTER_SCRIPT_FILE, "entry.ts"),
      () => editor.removeModel("fridge.sdfmod"),
      () => editor.removeLevel("level.json"),
    ];

    for (const [index, step] of order.entries()) {
      step();
      flush();
      const project = editor.project();
      // **The manifest's list, the files, and the entry, all three agreeing** — which is what
      // `isPlaceProject` checks and what `writePlaceZip` refuses without.
      expect(project.manifest.scripts, `after step ${index}`).toEqual(
        Object.keys(project.scripts),
      );
      expect(project.manifest.scripts, `after step ${index}`).toContain(
        project.manifest.entry,
      );
      expect(isPlaceProject(project), `after step ${index}`).toBe(true);
    }
  });

  it("ends where a person would expect, not merely coherently", () => {
    // **Coherence is necessary and not sufficient** — a check that only asserted `isPlaceProject`
    // would pass a state machine that ran the steps in the wrong order.
    const editor = createPlaceEditor(20260901);
    editor.addScript("span.ts");
    editor.setEntry("span.ts");
    editor.removeScript("span.ts");
    flush();

    expect(editor.project()).toEqual(emptyPlaceProject(20260901));
  });
});
