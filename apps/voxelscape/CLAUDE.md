# CLAUDE.md

## Solid 2.x

This project runs Solid 2.0 (`solid-js@2.0.0-beta`, with `@solidjs/web` and
`@solidjs/signals`). **Read [`node_modules/solid-js/CHEATSHEET.md`](./node_modules/solid-js/CHEATSHEET.md)
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

## Elsewhere in the repository

- [`CONTEXT.md`](./CONTEXT.md) — the domain language: what to call things, and
  what not to call them.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — the standards a comment or JSDoc
  block in this codebase has to meet, plus the checks (`npm run check-types`,
  `npm test`, `npm run format:check`) that pass before a change is done.
- [`docs/adr/`](./docs/adr) — one file per non-obvious architectural decision.
