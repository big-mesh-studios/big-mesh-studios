# Contributing

- Domain language (what to call things, and what to avoid calling them) is defined in [`CONTEXT.md`](./CONTEXT.md).
- Non-obvious architectural decisions are recorded in [`docs/adr/`](./docs/adr), one file per decision.
- `npm run check-types`, `npm test`, and `npm run format:check` should all pass before a change is done.

## To LLM

When writing or editing a comment or JSDoc block in this codebase, hold it to two standards: **specificity** and **no redundancy**.

**Specificity** — a comment must say something true of _this_ declaration, not something that would be equally true of any similar one. Concretely:

- Don't justify a design decision by naming what it avoids: "kept private, nothing outside needs it" or "reports changes via a callback, not a direct reference to X" reads as a decision log, not documentation, and the justification is usually true of almost any encapsulated field or decoupled class — it says nothing specific to this one. Describe what the declaration _is_, not why it was shaped that way.
- Don't restate a language or framework truism: "duplicate object-literal keys are a compile error" is true of any TypeScript file. If a sentence would be equally correct pasted into an unrelated file, delete it.
- Don't compare the chosen approach to alternatives that were never built ("a plain object literal, rather than a `register()`-call registry, means..."). That comparison belongs in an ADR's "Considered options" section, not inline — write the ADR instead, or add to an existing one.

**No redundancy** — don't restate what's already documented next to it. If a parameter already has its own JSDoc, the class-level doc doesn't need to re-explain it. If a method's `@returns` already states a fact, don't restate it more vaguely one level up.

**No diary language** — a comment describes the code's current behavior, not its history. Avoid "used to X, now does Y", "we changed this because...", or narrating a past incident. That history belongs in a commit message or an ADR, not inline.

**JSDoc, not plain comments, for declarations** — a comment that is the leading comment directly above a function, class, interface, type, or a standalone named declaration (a config value, a class instance, a factory) and describes _that_ declaration should be a `/** ... */` JSDoc block, with `@param`/`@returns` where useful. A comment narrating one step of an in-place computation, or one that has to describe several sibling declarations together because it doesn't cleanly belong to just one, should stay a plain comment — forcing it into JSDoc on a single field would misrepresent its scope. Treat needing to write that kind of group comment as a signal worth noticing: it can mean those declarations belong together in an object of their own (see `docs/adr/0005-fill-client-seam.md` for an example of exactly this).

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
