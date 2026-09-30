# The place reference is read out of the world and drawn once

A place script's vocabulary is three hundred and forty-three entries — every function it
calls, every effect it dispatches, every fact it is handed, every type those are
written in, and every bound the trusted side enforces — and it was written down
nowhere. The declarations themselves are the truth and were already checked, but a
script author had no way to read them: the module is a shorthand ambient
declaration, most of what it exports is a union member rather than a named type,
and nothing in the repository turned any of that into prose. This decision is how
the reference comes to exist, and why the same artifact answers in three places
at once.

## The declarations are read, not written

`apps/voxelscape/tools/place-reference.ts` builds a TypeScript program over the
world's own sources and reads the `voxelscape` module's exports through the
checker. Signatures are printed by `typeToString`, so a function reads exactly as
the editor's language service would show it; a payload's fields come from the
same declaration the trusted side validates against, so the two cannot disagree;
and a JSDoc block above a declaration is its sentence.

The one thing that is written by hand is what the sources do not say: the reading
order, and what an effect or a fact is _for_. `EFFECT_GROUPS` puts the ninety
effects into the twelve families a reader thinks in, `EFFECT_MEANING` and
`EVENT_MEANING` say in a sentence what each one is for, and `REMOVED_BY` names
what undoes an effect where the vocabulary does not follow the `-remove`
convention. A blank sentence in any of those fails `--check`, so the reference
cannot be generated half-written.

## The drawing is committed, and checked against the sources

The read result is written to `packages/place-reference/src/place-api.json` and
committed, rather than generated at build time. The site, the in-game panel, and
the tests all import it as a typed value, which means a wrong reference is a
type error at the point it is used instead of a build that fails for everyone
downstream of a machine that could not run the reader.

The cost of committing it is that it can go stale, so `place-reference:check`
regenerates the drawing in memory and compares it to the committed file, and CI
runs it. Verified against a deliberately truncated artifact: it exits 1 and says
which file is out of date. `packages/place-reference` types the artifact against
the model in its own `index.ts`, so a reader that emits a field nothing declares
fails `pnpm check-types` instead of rendering a blank row.

## One artifact answers in three places

The site at `apps/place-docs` and the `/place:docs` overlay are two renderings of
the one drawing, not two things that were kept in step. Adding an effect changes
`effects.ts`, the generator reads it, and both surfaces show it.

The site is two prerendered pages with the stylesheet inlined and no hydration:
the content is a reference, and a reference a reader searches should not cost a
JavaScript runtime to search. Its one script is the filter. The in-game overlay is
a lazy chunk — 131 kB raw, 27 kB gzipped — because nothing in it is needed to
play, and a visitor who never runs `/place:docs` should not download it.

## A type named in a public signature is part of the surface

Twenty-seven declarations in `voxelscape.d.ts` were reachable but unexported, so
a reader following `createNpc` out of its signature met the name
`CreateNpcOptions` with no entry to click, and a script could not name the type
it was building. They are exported now, along with `EffectTag` and
`PayloadFor` — the two `dispatch` names — and `SurfaceReach`, which a plan author
needs and which the six plan shapes reference.

The rule this follows is the one the module already used for `WorldQuery` and
`ScriptEvent`: a type that appears in an exported signature is part of what the
module offers, whether or not a script is expected to write it down. What stays
unexported is `ParsedEffect`, which is the trusted side's own bookkeeping and is
named by no signature a guest can reach.

## Considered options

- **TypeDoc, or another documentation generator.** Rejected: it wants named
  declarations, and this module is a shorthand ambient module whose surface is
  mostly union members — `ParsedEffect` and `ScriptEventPayload` are unions of
  ninety and twenty-three, and a generator that documents declarations documents
  two of the three hundred here and leaves the rest unmentioned.
- **Generating at build time instead of committing.** Rejected: the site and the
  in-game panel would each need the reader in their build, the artifact would be
  a second untyped source of truth rather than a checked one, and a stale
  reference would be impossible to notice in review.
- **Hand-writing the reference.** Rejected: it is the thing that goes stale
  silently. The declarations are already the truth; a document that repeats them
  is a document that lies the first time a signature changes.
- **The reference inside the console panel, beside the script editor.** Rejected
  on size: the console is a dock at the bottom of the screen with the terminal
  in it, and three hundred and forty entries need a sheet. The overlay is the level editor's
  shape instead, and opening one puts the others away.
- **Fetching the reference over the network in the overlay.** Rejected: the point
  of `/place:docs` is that it works in the world with no connection, which is also
  how a creator runs it locally.

## Known limits

- Eleven names still reach the reference from another file without an entry of
  their own: `Dim3` in `PlanContext`, and `LivePlayer`, `MotionSpec`,
  `CameraShot`, `ScriptEventPayload` and the six named `Plan*` shapes. They
  arrive through indexed-access aliases such as
  `WorldQuery["getPlayers"]`, which print a type the module never declares, so a
  script cannot name them either. The six `Plan*` shapes are drawn as the
  alternatives of `PlanShape` with all their fields, which is where a reader
  meets them; the rest show a name where a structure would read better. Spelling
  them out means expanding a type the module does not export, recursively, which
  is a change to the reader rather than to the world.
- `LevelPlan`'s fields are all declared required, while `isLevelPlan` and
  `normalizeLevelPlan` treat every one of them as optional and pass a missing one
  through as `undefined`. A plan handler written against the declaration has to
  supply `npcs` and `props` for a plan that is nothing but structures, which is
  why `onPlan` accepts a bare shape list as well. Left as the world has it: the
  two are answering different questions, and which of them is wrong is a question
  about the plan vocabulary rather than about its documentation.
- The effect and fact sentences are in this repository's own words, not the
  world's. `EFFECT_MEANING` and `EVENT_MEANING` are a reading of what each tag is
  for, and a reader who disagrees with one of them has found a real disagreement
  — which is the argument for keeping them in a file that is read in review
  rather than in a comment that is easy to walk past.
