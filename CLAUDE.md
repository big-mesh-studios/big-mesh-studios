# CLAUDE.md

## Comments

**Read the "To LLM" section of [`CONTRIBUTING.md`](./CONTRIBUTING.md) before
writing or editing any comment or JSDoc block**, and hold every one you write
to it. The short version, which is not a substitute for reading it:

- A comment above a function, class, interface, type, or a standalone named
  declaration is a `/** ... */` JSDoc block, with `@param`/`@returns` where
  useful. Plain `//` comments are for narrating a step inside a computation.
- A JSDoc block has to describe the declaration — what the value holds, what
  the function does. A remark about construction order or what a callback is
  wired to is a step comment, and stays a plain `//` even when it sits above a
  named declaration. The syntax is not what makes it JSDoc.
- Say what the declaration _is_, not what it avoids, what it used to be, or
  which alternative was rejected. Decisions belong in `docs/adr/`.
- Cut anything that would be equally true pasted into an unrelated file.
- Spell abbreviations out in full in prose, and don't point at another file in
  place of an explanation.

## Solid 2.x

Both applications run Solid 2.0 (`solid-js@2.0.0-beta`, with `@solidjs/web`
and `@solidjs/signals`). **Read
[`apps/voxelscape/node_modules/solid-js/CHEATSHEET.md`](./apps/voxelscape/node_modules/solid-js/CHEATSHEET.md)
before writing or editing any reactive or JSX code**, and re-read its closing
section, "What changed from 1.x", before trusting anything you remember about
Solid — most published Solid code and most model training data is 1.x, and the
two versions differ in ways that still typecheck and still run.

Things this codebase already relies on that a 1.x reflex gets wrong:

- `createSignal(fn)` is a **writable memo**: the value is derived from whatever
  the function reads, recomputes when those sources change, and can still be
  overwritten with the setter. It does not store the function.
- `createEffect` takes two arguments, `(compute, apply)`. The one-argument form
  is an error.
- A setter's value reaches reads and the DOM after a microtask flush, not
  synchronously. Call `flush()` when a read has to see the write right away —
  including in tests.
- Imports come from `solid-js` and `@solidjs/web`. The `solid-js/web` and
  `solid-js/store` subpaths no longer exist.

## What is under `apps`

- [`apps/rm-stacker/`](./apps/rm-stacker) — the editor: somebody draws a voxel
  model by painting the six faces of a box, and publishes it to their own
  atproto account.
- [`apps/voxelscape/`](./apps/voxelscape) — the world: an infinite scrolling
  grid of procedurally generated terrain, whose monsters wear a model read back
  from the editor.
- [`apps/homepage/`](./apps/homepage) — the front page the site root serves,
  naming the other two and linking to each. One page, written in Solid like
  the other two and rendered to a file at build time, so nothing is sent to
  the browser to run.

The world depends on the editor's published package, so `apps/rm-stacker`'s
`dist-lib` has to be built before the world's types resolve. `pnpm build-lib`
at the root does that.

Each of the three keeps its own `package.json` and `tsconfig.json`. Formatting
is settled once at the root, for both: one `.prettierrc`, and `pnpm format`
run from the repository root.

## Elsewhere in the repository

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — the standards a comment or JSDoc
  block in this codebase has to meet, plus the checks (`pnpm check-types`,
  `pnpm test`, `pnpm format:check`) that pass before a change is done. They
  apply to both applications.
- [`apps/voxelscape/CONTEXT.md`](./apps/voxelscape/CONTEXT.md) — the world's
  domain language: what to call things, and what not to call them.
- [`apps/voxelscape/docs/adr/`](./apps/voxelscape/docs/adr) — one file per
  non-obvious architectural decision in the world.
