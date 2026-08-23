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

**No abbreviations, no pointers elsewhere** — spell abbreviated terms out in full in comment prose (code identifiers are unaffected). Don't link to another file or an ADR in place of an explanation ("see `Foo.ts`", "see `docs/adr/0003-...md`") — a comment must stand on its own. If the link was carrying real reasoning, put that reasoning in the comment directly instead of just removing the pointer.
