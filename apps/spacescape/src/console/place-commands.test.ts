/**
 * The `/place:` command table.
 *
 * Built over a `PlaceCommands` of the caller's own making, which is why this file never
 * mentions a `PlaceHost`: the table asks its caller for four things and knows nothing about
 * how they are answered. The tests below are therefore about *what the console says* — which
 * is the part a person reads — and the host's own behaviour is covered in `host.test.ts`.
 */

import { describe, expect, it } from "vitest";

import { Commander } from "./commands";
import {
  NO_PLACE_LOADED,
  placeCommands,
  type PlaceCommands,
} from "./place-commands";

/** Records what the table asked for, and answers in a way a test can read. */
interface Recorder extends PlaceCommands {
  loaded: string[];
  unloaded: number;
  /** Every file the table asked to open, in order. */
  opened: number;
  /** Every address the table asked to load, in order. */
  addresses: string[];
  browsed: number;
  published: number;
  /** Whether the reference was asked to open. */
  docs: number;
}

const table = (
  answers: Partial<PlaceCommands> = {},
): { commander: Commander; recorder: Recorder } => {
  const loaded: string[] = [];
  const recorder: Recorder = {
    loaded,
    unloaded: 0,
    opened: 0,
    addresses: [],
    browsed: 0,
    published: 0,
    docs: 0,
    loadDemo: (id) => {
      loaded.push(id);
      return Promise.resolve(`loaded ${id}`);
    },
    openFromDisk: () => {
      recorder.opened++;
      return Promise.resolve("opened bridge");
    },
    unload: () => {
      recorder.unloaded++;
      return "unloaded bridge";
    },
    describe: () => "bridge\nshapes   7 of 2000",
    notices: () => [],
    toggleEditor: () => "",
    toggleLevel: () => "",
    loadAddress: (uri) => {
      recorder.addresses.push(uri);
      return Promise.resolve(`opened ${uri}`);
    },
    toggleBrowser: () => {
      recorder.browsed++;
      return "catalog open";
    },
    publish: () => {
      recorder.published++;
      return Promise.resolve("published bridge");
    },
    toggleDocs: () => {
      recorder.docs++;
      return "reference open";
    },
    ...answers,
  };
  return { commander: new Commander(placeCommands(recorder)), recorder };
};

describe("the place commands exist under the prefix", () => {
  it("declares one per action", () => {
    const names = table()
      .commander.help()
      .map((command) => command.name)
      .filter((name) => name.startsWith("/place:"));
    // **Every one of them**, because a command that is written but not declared is a
    // command nobody can reach: `Commander` looks names up in its record and an
    // entry missing from that record simply does not exist.
    expect(names).toEqual([
      "/place:demos",
      "/place:load",
      "/place:browse",
      "/place:publish",
      "/place:open",
      "/place:docs",
      "/place:editor",
      "/place:level",
      "/place:unload",
      "/place:state",
      "/place:notices",
    ]);
  });

  it("describes each of them, which is what /help prints", () => {
    for (const command of table().commander.help()) {
      if (!command.name.startsWith("/place:")) continue;
      expect(command.description).not.toBe("");
    }
  });

  it("names both things /place:load takes: an id and an address", () => {
    // **Both, because they are different sources.** A usage line showing only the demo ids tells a
    // person with an `at://` address that this command is something other than what it is.
    const load = table()
      .commander.help()
      .find((command) => command.name === "/place:load");
    expect(load?.args).toBe("<id | at://…>");
  });
});

describe("/place:demos", () => {
  it("names every shipped place", () => {
    const listed = table().commander.run("/place:demos") as string;
    for (const id of ["bridge", "lanterns", "lookout"]) {
      expect(listed).toContain(id);
    }
  });

  it("says what each one is for, not just its name", () => {
    const listed = table().commander.run("/place:demos") as string;
    expect(listed).toContain("doorway");
  });

  it("answers without a host, because listing is not loading", () => {
    // Nothing is loaded and nothing needs to be: this is the one place command
    // that has to work before anyone has typed anything else.
    const { recorder, commander } = table({
      describe: () => NO_PLACE_LOADED,
    });
    expect(commander.run("/place:demos")).toContain("bridge");
    expect(recorder.loaded).toEqual([]);
  });
});

describe("/place:load", () => {
  it("loads the id it was given", async () => {
    const { commander, recorder } = table();
    await commander.run("/place:load bridge");
    expect(recorder.loaded).toEqual(["bridge"]);
  });

  it("resolves to what the caller said happened", async () => {
    const { commander } = table({
      loadDemo: () => Promise.resolve("loaded bridge\n2 shapes"),
    });
    await expect(commander.run("/place:load bridge")).resolves.toBe(
      "loaded bridge\n2 shapes",
    );
  });

  it("says how to use it rather than loading nothing", async () => {
    const { commander, recorder } = table();
    const answer = (await commander.run("/place:load")) as string;
    expect(answer).toContain("usage: /place:load");
    expect(recorder.loaded).toEqual([]);
  });

  it("names the places that would work in its usage line", async () => {
    const answer = (await table().commander.run("/place:load")) as string;
    expect(answer).toContain("bridge");
    expect(answer).toContain("lookout");
  });

  it("says there is no such place, and points at /place:demos", async () => {
    const { commander, recorder } = table();
    const answer = (await commander.run("/place:load castle")) as string;
    expect(answer).toContain('no shipped place called "castle"');
    expect(answer).toContain("/place:demos");
    expect(recorder.loaded).toEqual([]);
  });

  it("ignores a second word rather than treating it as part of the id", async () => {
    // A person typing `/place:load bridge now` means "bridge", and asking for
    // `bridge now` would answer "no such place" — which is wrong in a way they
    // cannot see the reason for.
    const { commander, recorder } = table();
    await commander.run("/place:load bridge now");
    expect(recorder.loaded).toEqual(["bridge"]);
  });
});

describe("/place:load by address", () => {
  it("reads a published place over the network rather than a shipped one", async () => {
    // **The address form and the id form are different sources**, and the table tells them apart
    // by the `at://` prefix rather than by trying one and falling back — a fallback would ask the
    // network about a demo id every time somebody mistyped one.
    const { commander, recorder } = table();
    const uri = "at://did:plc:abc/app.bms.spacescape.place/harbour";

    await commander.run(`/place:load ${uri}`);

    expect(recorder.addresses).toEqual([uri]);
    expect(recorder.loaded).toEqual([]);
  });

  it("still loads a demo by id", async () => {
    const { commander, recorder } = table();
    await commander.run("/place:load bridge");
    expect(recorder.loaded).toEqual(["bridge"]);
    expect(recorder.addresses).toEqual([]);
  });
});

describe("/place:browse", () => {
  it("toggles the catalog rather than printing a list", async () => {
    // **An overlay, not a scrollback line.** Two hundred names and addresses in a console is a list
    // nobody reads, which is the whole reason this is not the text listing the other commands are.
    const { commander, recorder } = table();

    const answer = await commander.run("/place:browse");

    expect(recorder.browsed).toBe(1);
    expect(answer).toContain("catalog");
  });
});

describe("/place:docs", () => {
  it("toggles the reference rather than printing it", async () => {
    // **An overlay, like the catalog and the editor.** A reference read in a scrollback is a
    // reference nobody reads, and a person writing a place wants it beside the world.
    const { commander, recorder } = table();

    const answer = await commander.run("/place:docs");

    expect(recorder.docs).toBe(1);
    expect(answer).toContain("reference");
  });
});

describe("/place:publish", () => {
  it("asks the caller to publish the place in the editor", async () => {
    const { commander, recorder } = table();

    const answer = await commander.run("/place:publish");

    expect(recorder.published).toBe(1);
    expect(answer).toContain("published");
  });
});

describe("/place:open", () => {
  it("asks for a file and reports what happened", async () => {
    const { commander, recorder } = table();
    await expect(commander.run("/place:open")).resolves.toBe("opened bridge");
    expect(recorder.opened).toBe(1);
  });

  it("takes no argument, because the dialog is the argument", () => {
    // **No `<file>` placeholder.** A name here would suggest a path could be typed, and the
    // browser's dialog is the only way in — so a suggestion that cannot be followed is worse
    // than none.
    const open = table()
      .commander.help()
      .find((command) => command.name === "/place:open");
    expect(open?.args).toBeUndefined();
  });

  it("passes a dismissal back rather than resolving to nothing", async () => {
    // **The pending line depends on this.** The console replaces its `…` when the promise
    // settles; a caller that never resolves for a cancelled picker leaves that line on screen
    // for the rest of the session, which is the one outcome the pending line exists to prevent.
    const { commander } = table({
      openFromDisk: () => Promise.resolve("no file chosen"),
    });
    await expect(commander.run("/place:open")).resolves.toBe("no file chosen");
  });

  it("reports a refusal from the format rather than a load failure", async () => {
    // **The format's own gate, passed through.** A zip with no manifest, or one whose manifest
    // names a file it does not hold, has been told precisely what is wrong with it before this
    // table is reached, and re-summarising it would throw away the only actionable sentence.
    const { commander } = table({
      openFromDisk: () => Promise.resolve("no manifest.json at the zip's root"),
    });
    await expect(commander.run("/place:open")).resolves.toMatch(
      /manifest\.json/,
    );
  });
});

describe("/place:unload", () => {
  it("takes the place away", () => {
    const { commander, recorder } = table();
    expect(commander.run("/place:unload")).toBe("unloaded bridge");
    expect(recorder.unloaded).toBe(1);
  });

  it("says so even when there was nothing to take away", () => {
    // **An unload that reports success when it did nothing** is the failure mode
    // here: the person presses it twice and gets two identical confirmations, and
    // the second is a lie. The caller's own wording is what is checked, because
    // this table cannot know whether anything was loaded — which is also why the
    // idle case is the caller's line and not this table's.
    const { commander } = table({ unload: () => NO_PLACE_LOADED });
    expect(commander.run("/place:unload")).toBe(NO_PLACE_LOADED);
  });
});

describe("/place:state", () => {
  it("reports what the caller says is loaded", () => {
    expect(table().commander.run("/place:state")).toContain(
      "shapes   7 of 2000",
    );
  });

  it("says plainly that nothing is loaded", () => {
    const { commander } = table({ describe: () => NO_PLACE_LOADED });
    // A console that says nothing when idle is a console that looks broken, so
    // the idle line has to be a sentence with a next step in it.
    expect(commander.run("/place:state")).toBe(NO_PLACE_LOADED);
    expect(NO_PLACE_LOADED).toContain("no place loaded");
    expect(NO_PLACE_LOADED).toContain("/place:load");
  });
});

describe("/place:notices", () => {
  it("says so when the place has reported nothing", () => {
    // **Not an empty string.** An empty console line is indistinguishable from a
    // command that was typed wrong, and "nothing is wrong" is the answer most
    // worth stating plainly.
    expect(table().commander.run("/place:notices")).toBe(
      "the place has reported nothing",
    );
  });

  it("numbers the notices, so one can be quoted back", () => {
    const { commander } = table({
      notices: () => [
        "shape 4 was refused: no such combine",
        "timer 1 was refused",
      ],
    });
    const printed = commander.run("/place:notices") as string;
    expect(printed).toContain("1. shape 4 was refused");
    expect(printed).toContain("2. timer 1 was refused");
  });

  it("shows the most recent few, not the whole log", () => {
    // A console is a scrollback, not a log file. Twenty refusals is a page of
    // numbers that hides the one that was new.
    const many = Array.from({ length: 40 }, (_, at) => `notice ${at}`);
    const printed = table({ notices: () => many }).commander.run(
      "/place:notices",
    ) as string;
    expect(printed).toContain("notice 39");
    expect(printed).not.toContain("notice 0\n");
  });

  it("says nothing about a notice it did not show", () => {
    const many = Array.from({ length: 40 }, (_, at) => `notice ${at}`);
    const printed = table({ notices: () => many }).commander.run(
      "/place:notices",
    ) as string;
    expect(printed).not.toContain("notice 0.");
  });
});

describe("what this table does not know", () => {
  it("never reaches past its caller for anything", () => {
    // Every command resolves through the functions in `PlaceCommands` — no
    // import of a host, a renderer, a scene or a `File` anywhere in the file. That is
    // the property that lets `host.test.ts` and this file stand in for each other,
    // and it is worth asserting because a `PlaceHost` import here would type-check
    // and quietly break it. It is also why `openFromDisk` is a callback rather than
    // a file input: this table must not know a DOM exists.
    const answers: PlaceCommands = {
      loadDemo: () => Promise.resolve("loaded"),
      openFromDisk: () => Promise.resolve("opened"),
      unload: () => "unloaded",
      describe: () => "nothing",
      notices: () => [],
      toggleEditor: () => "",
      toggleLevel: () => "",
      loadAddress: () => Promise.resolve("opened"),
      toggleBrowser: () => "catalog",
      publish: () => Promise.resolve("published"),
      toggleDocs: () => "reference",
    };
    expect(Object.keys(answers).sort()).toEqual([
      "describe",
      "loadAddress",
      "loadDemo",
      "notices",
      "openFromDisk",
      "publish",
      "toggleBrowser",
      "toggleDocs",
      "toggleEditor",
      "toggleLevel",
      "unload",
    ]);
  });
});
