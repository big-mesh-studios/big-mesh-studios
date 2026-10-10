/**
 * The console's `/place:` commands.
 *
 * ## Why these are separate from `commands.ts`
 *
 * `commands.ts` is a table of closures over plain methods, and it should stay that: every entry
 * there is the game's own behaviour, reached by name. These six are not — they belong to a
 * *place*, they need the host, and nothing outside the game should have to know a place exists.
 * So they are a second table merged in by `Commander.with`, which is what keeps the
 * application's thirty-odd commands free of any mention of places.
 *
 * `/place:load` genuinely waits — it bundles, starts an interpreter and runs a script's
 * top-level code — so its `run` returns a promise, and `CommandEntry.run` is typed to allow
 * one. The console prints `…` under the echo and replaces that line when it settles, so a slow
 * load is visibly slow instead of apparently hung.
 *
 * ## What a person needs from a console here
 *
 * **A place that fails to load has to say why, in a line.** Loading a place can fail in three
 * quite different ways — it does not compile, its top-level code threw, or an effect was
 * refused — and only the last of those is the place's fault. The commands below therefore
 * report the host's notices after a load rather than reporting "loaded", because "loaded" on a
 * place that built half of itself is the least useful thing a console can say.
 */

import { demoIds, demoPlace, DEMO_PLACES } from "../places/demos";
import { MAX_OPERATIONS_PER_PLACE } from "../places/place-registry";
import { MAX_ZONES } from "../places/limits";
import type { CommandEntry } from "../console/commands";

/** The part of a host the commands read. Narrow, so a test can stand one in. */
export interface PlaceCommands {
  /** Loads a built-in demo by id. Resolves to the lines to print. */
  loadDemo(id: string): Promise<string>;
  /**
   * Asks the person for a place file and loads it. Resolves to the lines to print.
   *
   * **Including when they decline to.** This is called from a pending console line, and a promise
   * that never settles leaves its `…` on screen for the rest of the session — so a caller that
   * opens a dialog owes a resolution for a dismissed one as much as for a chosen file. The
   * wording is therefore the caller's, since only it knows whether there was a picker at all.
   */
  openFromDisk(): Promise<string>;
  /** Takes the current place away entirely. */
  unload(): string;
  /** One line, or several, saying what is loaded. */
  describe(): string;
  /** The most recent refusals and errors, newest last. */
  notices(): readonly string[];
  /**
   * Opens or closes the place editor.
   *
   * **A command rather than a keybind, and toggling rather than opening.** A keybind would have to
   * be described in a header nobody reads, and a command is discoverable through `/help` and through
   * the console's own completion — which matters more here than elsewhere, because the editor is
   * the first thing in this engine a person has to be told about.
   */
  toggleEditor(): string;
  /**
   * Opens or closes the level editor, which is an overlay on the running world rather than a
   * panel in the console.
   *
   * **Here rather than in the world's own commands** because a level is a place's content:
   * it becomes a file the place carries, and a place with no level has nothing for it to be.
   */
  toggleLevel(): string;
  /**
   * Loads a place somebody published, by its `at://` address.
   *
   * **The other way a place arrives**, and the only one that needs no file and no account: a
   * published place is public, so this reads the record and runs it (ADR 0044). Resolves to the
   * lines to print, because reading over a network can fail in ways a person has to be told.
   */
  loadAddress(uri: string): Promise<string>;
  /**
   * Opens or closes the published-place catalog.
   *
   * **A toggle like `toggleEditor`**, and an overlay rather than a console listing because a catalog
   * is something a person reads and picks from — a list of two hundred names and addresses in a
   * scrollback is a list nobody scans. The overlay itself is where the ceilings are made honest.
   */
  toggleBrowser(): string;
  /**
   * Publishes the place the editor is holding to the signed-in account.
   *
   * @throws Never — a refusal is a line, because the console's generic `failed: …` would lose the
   * wording `makePlaceRecord` and the session chose. Resolves to the lines to print.
   */
  publish(): Promise<string>;
  /**
   * Opens or closes the place API reference.
   *
   * **A toggle like the two above, and an overlay for the same reason the catalog is one**: a
   * reference is read in a panel, and a person writing a place wants it beside the world rather
   * than in a scrollback.
   */
  toggleDocs(): string;
}

/** How many notices `/place:state` shows. A console is a scrollback, not a log file. */
const MAX_NOTICES_SHOWN = 6;

/**
 * The commands, as a table the same shape `commands.ts` declares its own in.
 *
 * `/place:load` returns a promise where the rest return strings — see the header.
 */
export const placeCommands = (
  places: PlaceCommands,
): Record<string, CommandEntry> => ({
  "/place:demos": {
    description: "list the places this build ships",
    run: () =>
      [
        "shipped places:",
        ...DEMO_PLACES.map((demo) => `  ${demo.id.padEnd(10)} ${demo.summary}`),
      ].join("\n"),
  },

  "/place:load": {
    description: "load a shipped place by name, or a published one by address",
    args: "<id | at://…>",
    run: async (rest) => {
      const wanted = rest[0];
      if (wanted === undefined) {
        // **Both forms are named in the usage line**, because a person who has an address and is
        // shown only the demo ids has been told the command is something other than it is.
        return `usage: /place:load <id | at://…>  (shipped: ${demoIds().join(", ")})`;
      }
      if (wanted.startsWith("at://")) {
        return places.loadAddress(wanted);
      }
      if (demoPlace(wanted) === undefined) {
        return `no shipped place called "${wanted}". Try /place:demos, or /place:browse.`;
      }
      return places.loadDemo(wanted);
    },
  },

  "/place:browse": {
    description: "open (or close) the catalog of published places",
    run: () => places.toggleBrowser(),
  },

  "/place:publish": {
    description: "publish the place in the editor to your account",
    run: () => places.publish(),
  },

  "/place:open": {
    description: "open a place from a .zip file",
    run: () => places.openFromDisk(),
  },

  "/place:docs": {
    description: "open (or close) the place API reference",
    run: () => places.toggleDocs(),
  },

  "/place:editor": {
    description: "open (or close) the place script editor",
    run: () => places.toggleEditor(),
  },

  "/place:level": {
    description: "open (or close) the level editor — place things by clicking",
    run: () => places.toggleLevel(),
  },

  "/place:unload": {
    description: "take the loaded place away",
    run: () => places.unload(),
  },

  "/place:state": {
    description: "say what is loaded, and how much of it there is",
    run: () => places.describe(),
  },

  "/place:notices": {
    description: "say what the place has been told is wrong",
    run: () => {
      const lines = places.notices();
      if (lines.length === 0) return "the place has reported nothing";
      return lines
        .slice(-MAX_NOTICES_SHOWN)
        .map((line, at) => `${at + 1}. ${line}`)
        .join("\n");
    },
  },
});

/**
 * The line `/place:state` prints when nothing is loaded.
 *
 * Exported because the test asserts this text — a console that says nothing when idle is a
 * console that looks broken.
 */
export const NO_PLACE_LOADED = `no place loaded. Try /place:load ${demoIds()[0] ?? "bridge"}.`;

export { MAX_OPERATIONS_PER_PLACE, MAX_ZONES };
