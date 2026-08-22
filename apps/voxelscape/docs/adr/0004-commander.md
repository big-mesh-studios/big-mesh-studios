# Centralize console commands in a single object-literal declaration

Console commands were a single hand-written `switch` in `App.tsx`, mixing day-night
commands (`/day`, `/sunset`, `/night`, `/sunrise`, `/time`, `/normal`, `/speed`,
`/now`) and renderer commands (`/renderer`, `/tris`) together, with `/help`'s text
hand-maintained separately from the actual command behavior. Once day-night's clock
and lighting moved into `DayNightController` (ADR 0003), this would have meant either
duplicating the switch's structure a second time or finding a shared pattern — the
switch itself was already the thing making `App.tsx` hard to read, so it was not worth
preserving.

We introduced `Commander`, built once in `App.tsx` from a single object literal keyed
by command name, after every command-owning object (`DayNightController`,
`RendererSwitch`) already exists. Each entry's `run` closure does its own
raw-argument parsing and validation and calls a plain typed method on the owning
object (`dayNight.jumpTo(300)`, `rendererSwitch.setMode("ray")`) — the owning objects
themselves expose no command-shaped API and have no idea a console exists. `/help`'s
text is generated from the same object, so it can no longer drift out of sync with
actual command behavior.

## Considered options

- **A `register()`-call registry**, where `DayNightController` and `RendererSwitch`
  each push their own commands into a shared `CommandRegistry` at construction time.
  Rejected: a command-name collision is only caught if and when both constructors
  actually run, and there's no single place to read the full list of commands — you'd
  have to go find every `register()` call across the codebase. It also would have
  made the owning classes depend on a registry type just to declare commands, adding a
  dependency neither class otherwise needs.
- **An array of `{name, help, run}` entries**, checked for duplicate names at
  construction time with a `Set`. Rejected once the object-literal alternative was
  considered: TypeScript already rejects a duplicate key in an object literal as a
  compile error (a single declaration, not two properties silently colliding into
  one), which is a stronger guarantee than a runtime check — the collision is caught
  by `pnpm check-types`, before the code ever runs, rather than only when the
  offending line executes.

## Consequences

- Command declaration order is `/help` order (object key order is insertion order in
  JavaScript) — the day-night commands are declared before the renderer commands in
  `App.tsx` to preserve the existing `/help` output order.
- Anyone adding a new console command edits exactly one object literal in `App.tsx`
  (or wherever `Commander` ends up being constructed) — not the class the command
  happens to be about.
