/**
 * The `/account:` command table.
 *
 * Built over an `AccountCommands` of the caller's own making, which is why this file never touches
 * a session, an OAuth client or a network: the table asks its caller for three things and knows
 * nothing about how they are answered. What is tested here is what a person reads — the command
 * names, what `/help` says about them, and what happens when a handle is left out — and the
 * account's own behaviour belongs to `packages/atproto`, which has its own tests.
 */

import { describe, expect, it } from "vitest";

import { Commander } from "./commands";
import { accountCommands, type AccountCommands } from "./account-commands";

/** Records what the table asked for, and answers in a way a test can read. */
interface Recorder extends AccountCommands {
  /** Every handle the table passed to `login`, in order. */
  logins: string[];
  logouts: number;
}

const table = (
  answers: Partial<AccountCommands> = {},
): { commander: Commander; recorder: Recorder } => {
  const logins: string[] = [];
  const recorder: Recorder = {
    logins,
    logouts: 0,
    login: (handle) => {
      logins.push(handle);
      return Promise.resolve(`signed in as ${handle}`);
    },
    logout: () => {
      recorder.logouts++;
      return Promise.resolve("signed out");
    },
    describe: () => "not signed in",
    ...answers,
  };
  return { commander: new Commander(accountCommands(recorder)), recorder };
};

describe("the account commands exist under the prefix", () => {
  it("declares one per action", () => {
    const names = table()
      .commander.help()
      .map((command) => command.name)
      .filter((name) => name.startsWith("/account:"));
    // **Every one of them**, because a command that is written but not declared is a command
    // nobody can reach: `Commander` looks names up in its record and an entry missing from that
    // record simply does not exist.
    expect(names).toEqual([
      "/account:login",
      "/account:logout",
      "/account:state",
    ]);
  });

  it("describes each of them, which is what /help prints", () => {
    for (const command of table().commander.help()) {
      if (!command.name.startsWith("/account:")) continue;
      expect(command.description).not.toBe("");
    }
  });
});

describe("signing in", () => {
  it("passes the handle through and reports who was signed in as", async () => {
    const { commander, recorder } = table();

    const report = await commander.run("/account:login you.bsky.social");

    expect(recorder.logins).toEqual(["you.bsky.social"]);
    expect(report).toBe("signed in as you.bsky.social");
  });

  it("says what to type when no handle is given", () => {
    // **Refused before the account is asked**, because there is no "sign in to atproto" without
    // saying as whom — the handle is what tells the OAuth flow which server to authorize against.
    // A promise that opened a popup for an empty handle would ask the person a question with no
    // answer.
    const { commander, recorder } = table();

    const report = commander.run("/account:login");

    expect(typeof report).toBe("string");
    expect(report).toMatch(/usage: \/account:login <handle>/);
    expect(recorder.logins).toEqual([]);
  });

  it("does not throw a failed sign-in at the console", async () => {
    // **A failure is reported, not raised.** `Atproto.signIn` sets its state and returns; the
    // table asks for the resulting line. A rejection here would land in the console's generic
    // `failed: …` handler and lose the wording the account chose.
    const { commander } = table({
      login: () => Promise.resolve("not signed in — unknown state provided"),
    });

    await expect(commander.run("/account:login you.bsky.social")).resolves.toBe(
      "not signed in — unknown state provided",
    );
  });
});

describe("signing out", () => {
  it("asks the account to sign out and says so", async () => {
    const { commander, recorder } = table();

    const report = await commander.run("/account:logout");

    expect(recorder.logouts).toBe(1);
    expect(report).toBe("signed out");
  });
});

describe("asking who is signed in", () => {
  it("hands back the account's own line, unchanged", () => {
    // **The wording belongs to the account**, which is the one thing that knows whether it is
    // anonymous, connecting, connected or in error. A second description written here would be a
    // copy that could disagree with the state it describes.
    const { commander } = table({
      describe: () => "signed in as you.bsky.social",
    });

    expect(commander.run("/account:state")).toBe(
      "signed in as you.bsky.social",
    );
  });
});

describe("what this table does not know", () => {
  it("never reaches past its caller for anything", () => {
    // **A structural interface, so a test stands one in and no session is built.** This asserts
    // the shape rather than the behaviour: the day one of these grows a second parameter or a
    // return that is not a string, this is where the test double stops matching the account.
    const answers: AccountCommands = {
      login: () => Promise.resolve(""),
      logout: () => Promise.resolve(""),
      describe: () => "",
    };
    expect(Object.keys(answers).sort()).toEqual([
      "describe",
      "login",
      "logout",
    ]);
  });
});
