# Name console commands after the subsystem they reach, and complete one scope at a time

The console grew to twenty-seven commands, all of them flat: `/day`, `/speed`,
`/renderer`, `/tris`, `/movespeed`, `/volume`. Two costs came with that. The
first is collision — `/speed` set the clock's multiplier while `/movespeed` set
the player's, two settings named apart only because the flat namespace could
not tell them apart. The second is discovery: the list of names a half-typed
command could still become is a list of everything, in alphabetical order, with
nothing to say which part of the world a name reaches.

Command names now carry the subsystem they belong to, spelled as
`/scope:command`: `/clock:speed` and `/player:speed`, `/render:mode` and
`/render:triangles`, `/sound:volume`, `/multiplayer:debug`. A subsystem earns a
scope once two commands share it, and everything it owns goes behind that scope
— signing in is `/account:login`, next to the `/account:sync` it is a
precondition for. Only the commands that belong to no subsystem stay flat:
`/weather`, `/fullscreen`, `/clear`, `/help`.

A scope is named for what the player has, not for what the code underneath is
built on. The commands behind `/account:` all reach `AtprotoController` and all
speak atproto, but someone who wants to sign in is looking for their account,
the same way someone looking for a website is not looking for HTTP. The code
keeps the protocol's name — the class, its directory, its records — and the
help text those commands print no longer says it either.

Completion follows the same seam. Pressing tab no longer fills the whole
highlighted name in: it fills up to and including the next colon, so `/cl`
reaches `/clock:` and a second tab reaches `/clock:speed`. A name with no colon
left to stop at still completes in full. The suggestion list narrows as each
scope is settled, which turns a list of twenty-seven into a list of eight.

The console's own `/multiplayer` command took a subcommand argument
(`start|stop|status|debug`), which was a scope in all but spelling. Those four
are now four commands — `/multiplayer:start`, `/multiplayer:stop`,
`/multiplayer:state`, `/multiplayer:debug` — so they are completed and listed
like every other command instead of being spelled out in one command's help
text.

## Considered options

- **`/scope.command`, with a dot.** Rejected: a dot reads as part of a word,
  and handles typed as arguments (`/account:login you.bsky.social`) already
  carry dots.
  A colon is not otherwise typed in this console, so it can only mean a scope.
- **`/scope command`, with a space.** Rejected: the space is what separates a
  command from its arguments, so the parser would have to decide whether the
  first word is a scope or a command by looking at the second, and completion
  could not tell a scope apart from an argument being typed.
- **`/mesh:` for the multiplayer commands.** Rejected: "mesh" already means
  triangle geometry throughout this codebase — the `TriangleRenderer`'s mesh
  builders, its mesh-build queue — and CONTEXT.md lists "Mesh renderer" as a
  name to avoid for exactly that reason.
- **Keeping the flat names working alongside the scoped ones.** Rejected: every
  command would answer to two names, which doubles what the suggestion list
  shows and leaves the collision (`/speed`) the scoping was meant to remove.
- **Flat `/login` and `/logout`**, on the grounds that they read as verbs rather
  than as settings of the connection. Rejected: they are the account's own
  commands, and holding them out of the scope hides them from the list
  `/account:` completes to, which is where someone looking for how to sign in
  would look.
- **`/atproto:` as the scope name**, matching `AtprotoController` and the rest
  of the code. Rejected: it makes knowing the protocol's name a precondition
  for finding the sign-in command, and nothing a player does with these four
  commands needs that name.
