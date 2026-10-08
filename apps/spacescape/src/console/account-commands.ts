/**
 * The console's `/account:` commands.
 *
 * ## Why these are their own table
 *
 * `place-commands.ts` made the argument and this is the same one: `commands.ts` is the game's own
 * behaviour reached by name, and an account is not the game — it is who is holding it. Everything
 * here is a call into `Atproto`, and merging it in with `Commander.with` is what keeps the
 * application's thirty-odd commands free of any mention of a repository.
 *
 * ## What a person needs from a console here
 *
 * **A sign-in is three states, and the console should never make somebody guess which one they are
 * in.** Signed out, waiting for a popup nobody can see from a locked pointer, and signed in as a
 * name — the first and the last are what `/account:state` answers, and the middle one is why
 * `/account:login` returns a promise that resolves only once the account has actually been adopted.
 * A command that returned the moment the popup opened would report success for a login the person
 * can still cancel.
 */

import type { CommandEntry } from "./commands";

/**
 * The part of an account the commands read.
 *
 * **Narrow and structural rather than the `Atproto` interface itself**, so a test can stand one in
 * without a session, an OAuth client or a network — the same reason `PlaceCommands` is structural.
 */
export interface AccountCommands {
  /** Signs in as `handle` through a popup. Resolves once an account has been adopted or refused. */
  login(handle: string): Promise<string>;
  logout(): Promise<string>;
  /** One line saying who is signed in, or that nobody is. */
  describe(): string;
}

/**
 * The commands, as a table the same shape `commands.ts` declares its own in.
 *
 * `/account:login` and `/account:logout` return promises — see the header — and the console prints
 * `…` under their echo and replaces that line when they settle, so a sign-in waiting on a popup is
 * visibly waiting rather than apparently hung.
 */
export const accountCommands = (
  account: AccountCommands,
): Record<string, CommandEntry> => ({
  "/account:login": {
    description: "sign in to an atproto account, to publish places under it",
    args: "<handle>",
    run: (rest) => {
      const handle = rest[0];
      if (handle === undefined) {
        // **The argument is required and the message says so**, because the OAuth flow needs a
        // handle to know which server to authorize against — there is no "sign in to atproto"
        // without saying as whom.
        return "usage: /account:login <handle>  (e.g. you.bsky.social)";
      }
      return account.login(handle);
    },
  },

  "/account:logout": {
    description: "sign out of the account this browser is holding",
    run: () => account.logout(),
  },

  "/account:state": {
    description: "say who is signed in",
    run: () => account.describe(),
  },
});
