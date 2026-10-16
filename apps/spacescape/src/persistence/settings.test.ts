/**
 * The settings store, tested for the one contract that matters off a browser: it never throws.
 *
 * The interesting behaviour — a value surviving a reload — is a browser fact this environment
 * cannot produce without an IndexedDB implementation, so it is checked by hand in the app. What
 * is testable here is the promise `drafts.ts` makes and this module repeats: with nowhere to keep
 * anything, every read answers `undefined` and every write resolves having done nothing.
 */

import { describe, expect, it } from "vitest";

import { available, readSetting, release, writeSetting } from "./settings";

describe("the settings store with nowhere to keep anything", () => {
  it("answers rather than throws", async () => {
    release();
    // Node has no IndexedDB. A runtime that does (a browser) is exercised in the app, not here.
    if (available()) return;
    await expect(
      writeSetting("setting:test", { a: 1 }),
    ).resolves.toBeUndefined();
    await expect(readSetting("setting:test")).resolves.toBeUndefined();
  });
});
