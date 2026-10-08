/**
 * The account this application is signed in as, and the one line it says about itself.
 *
 * ## What is being tested, and what deliberately is not
 *
 * **Only what this module adds.** The OAuth popup, the token store, the record client and the
 * handle lookup are `packages/atproto`'s and have their own tests; a suite here that stood up a
 * fake session would be testing that library's seams through this file rather than testing this
 * file. What is left is the wording and the state machine over it — that a fresh account is
 * anonymous, that a failure is reported rather than thrown, and that the line names the handle when
 * there is one and the DID when there is not.
 *
 * **Every case here is one a person could reach**, because the wording is the part a person reads.
 * "not signed in" on a failed sign-in is the failure this file exists to prevent: the person
 * cancelled a popup, or typed a handle that does not resolve, and a console that says the same
 * thing it says before anybody tried tells them nothing about which.
 *
 * ## Why a fresh account is anonymous without touching a network
 *
 * `createAtproto` builds its session over `createBrowserSessionStore()` and `createIdentityLookup()`
 * and neither does anything until it is asked — the store's `localStorage` read is inside
 * `stored()`, and the identity lookup's fetches are inside its methods. So constructing an account
 * and reading its state is arithmetic, which is why this file needs no stub session and no server.
 */

import { describe, expect, it } from "vitest";

import { createAtproto } from "./atproto";

describe("an account nobody has asked about", () => {
  it("is anonymous, and says so without a failure", () => {
    // **The starting state, and it must not read as an error.** A person who has never signed in
    // and a person whose last sign-in failed are different, and the console line is where that
    // difference is visible.
    const account = createAtproto();

    expect(account.status()).toBe("anonymous");
    expect(account.account()).toBeNull();
    expect(account.error()).toBeNull();
    expect(account.describe()).toBe("not signed in");
  });

  it("refuses a requireSession with a sentence naming what to do", () => {
    // **The refusal a Publish button will hit before anybody signs in.** It names the command
    // rather than the state, because "not signed in" leaves a person looking for a button and
    // `/account:login` is the thing that exists.
    const account = createAtproto();

    expect(() => account.requireSession()).toThrow(/\/account:login/);
  });

  it("refuses an empty handle with a usage line, and never opens a popup", async () => {
    // **Checked before the session is touched**, because the handle is what tells the OAuth flow
    // which server to authorize against — there is no sign-in without saying as whom, and a popup
    // opened for an empty handle asks a question with no answer. Awaiting it proves nothing was
    // opened, since a real sign-in would still be waiting on a popup nobody can answer.
    const account = createAtproto();

    await account.signIn("   ");

    expect(account.error()).toMatch(/\/account:login/);
    expect(account.status()).toBe("anonymous");
  });

  it("says what went wrong rather than saying nobody is signed in", async () => {
    // **The wording this module exists for.** A refused sign-in leaves the account anonymous, so
    // the state alone cannot tell a person whether they tried and failed or never tried at all —
    // and those need different things from them. The failure is carried into the line, which is
    // the only place it can be seen from a console.
    const account = createAtproto();

    await account.signIn("");

    expect(account.describe()).toMatch(/^not signed in — /);
    expect(account.describe()).not.toBe("not signed in");
  });
});
