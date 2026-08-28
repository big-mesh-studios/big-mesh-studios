# Contributing

- These standards apply to both applications under [`apps/`](./apps).
- Domain language (what to call things, and what to avoid calling them) is defined per application, in [`apps/voxelscape/CONTEXT.md`](./apps/voxelscape/CONTEXT.md).
- Non-obvious architectural decisions are recorded in [`apps/voxelscape/docs/adr/`](./apps/voxelscape/docs/adr), one file per decision.
- `pnpm check-types`, `pnpm test`, and `pnpm format:check` should all pass before a change is done. Run from the repository root, each covers both applications.

## To LLM

When writing or editing a comment or JSDoc block in this codebase, hold it to two standards: **specificity** and **no redundancy**.

**Default to no comment.** The first question is not "how should this be worded" but "does the reader get this from the code". A comment that restates the line under it is worse than nothing, because it is one more thing to read and one more thing to keep true:

```ts
// Picks run along the avatar's look ray, so what the crosshair is over is
// what an edit lands on.
const editing = new EditingController({ getLook: () => avatar.look(), ... });

// Wired here so that signing in brings the multiplayer mesh online and
// signing out takes it down.
const atproto = new AtprotoController({
  onConnected: () => multiplayer.start(),
  onSignedOut: () => multiplayer.stop(),
});
```

Both say what the next line says. Delete them, and put nothing in their place.

Watch for the inversion: comments tend to grow longest exactly where the code is least surprising, because there is nothing real to say and prose fills the gap. A construction that needs seven lines to prove it is safe is usually a construction nobody doubted. What earns a comment is what the code cannot state — a hazard that bites the next person to edit it ("moving the renderers' tick inside this gate deadlocks"), an empty `catch` and why it is empty, an invariant enforced somewhere else. Keeping those short is part of the job too.

This applies while writing the code, not as a cleanup pass afterwards, and it applies to comments already in a file being edited — noticing one and leaving it is the same as writing it.

**Specificity** — a comment must say something true of _this_ declaration, not something that would be equally true of any similar one. Concretely:

- Don't justify a design decision by naming what it avoids: "kept private, nothing outside needs it" or "reports changes via a callback, not a direct reference to X" reads as a decision log, not documentation, and the justification is usually true of almost any encapsulated field or decoupled class — it says nothing specific to this one. Describe what the declaration _is_, not why it was shaped that way.
- Don't restate a language or framework truism: "duplicate object-literal keys are a compile error" is true of any TypeScript file. If a sentence would be equally correct pasted into an unrelated file, delete it.
- Don't compare the chosen approach to alternatives that were never built ("a plain object literal, rather than a `register()`-call registry, means..."). That comparison belongs in an ADR's "Considered options" section, not inline — write the ADR instead, or add to an existing one.

**No redundancy** — don't restate what's already documented next to it. If a parameter already has its own JSDoc, the class-level doc doesn't need to re-explain it. If a method's `@returns` already states a fact, don't restate it more vaguely one level up.

**No diary language** — a comment describes the code's current behavior, not its history. Avoid "used to X, now does Y", "we changed this because...", or narrating a past incident. That history belongs in a commit message or an ADR, not inline.

**JSDoc, not plain comments, for declarations** — a comment that is the leading comment directly above a function, class, interface, type, or a standalone named declaration (a config value, a class instance, a factory) and describes _that_ declaration should be a `/** ... */` JSDoc block, with `@param`/`@returns` where useful. A comment narrating one step of an in-place computation, or one that has to describe several sibling declarations together because it doesn't cleanly belong to just one, should stay a plain comment — forcing it into JSDoc on a single field would misrepresent its scope. Treat needing to write that kind of group comment as a signal worth noticing: it can mean those declarations belong together in an object of their own (see `apps/voxelscape/docs/adr/0005-fill-client-seam.md` for an example of exactly this).

**A JSDoc block must actually document the declaration** — `/** ... */` is not a nicer-looking comment, and wrapping a remark in one does not make it JSDoc. The content has to say what the declaration _is_: what the value holds, what the function does, what the type represents. A remark that instead narrates the surrounding code — why this line comes before that one, what a callback is wired to, which order things are constructed in — is a step comment wearing a JSDoc jacket, and belongs as a plain `//` above the same line.

The test: read the block on its own, without the code under it. If it reads as a description of a thing, it is JSDoc. If it only makes sense as a remark about what is happening at that point in the file, it is a plain comment. So:

```ts
// Built before `atproto`, because signing in is what starts the mesh.
const multiplayer = new MultiplayerController({ ... });

/** The render scale for this world, held across mounts rather than by any one canvas. */
const resolution = new AdaptiveResolution();
```

Both sit above a `const`; only the second describes the `const`.

**No abbreviations, no pointers elsewhere** — spell abbreviated terms out in full in comment prose (code identifiers are unaffected). Don't link to another file or an ADR in place of an explanation ("see `Foo.ts`", "see `docs/adr/0003-...md`") — a comment must stand on its own. If the link was carrying real reasoning, put that reasoning in the comment directly instead of just removing the pointer.
