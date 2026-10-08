# Places: players author their own games in spacescape

The work, in order, and why it is in that order. Written down because the plan is longer than a
context window and the reasoning behind each step is worth more than the step itself.

**The target.** A person opens an editor inside spacescape, writes a place's TypeScript, runs it in
the live world, and publishes it to their own atproto account so somebody else can load it by
address. The equivalent of what `apps/voxelscape` already does, for the smooth-landscape engine.

**What already exists.** The entire runtime. `apps/spacescape/src/places/` has the QuickJS sandbox
(`interpreter.ts`, ADR 0015), the bundler (`bundle.ts`, ADR 0018), the trusted host (`host.ts`,
ADR 0019), a closed effect vocabulary of 23 tags (`effects.ts`, ADR 0017), the event log, place
ownership over the CSG fold (`place-registry.ts`, ADR 0016), the zip format (`place-file.ts` /
`load-place.ts`, ADR 0021), the frame hook (ADR 0020), lights (ADR 0023) and fields (ADR 0022), four
shipped demo places, and about 7,000 lines of tests. **No player can reach any of it**, which is
the whole of what remains.

---

## Phase 1 — Project model, record, exporter ✅

**Done.** A place becomes a thing that can be edited, saved, zipped and published.

|                                                                                      |                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `place-record.ts`                                                                    | `PLACE_COLLECTION = "app.bms.spacescape.place"`, `version: 1` required, `placeRkey`/`placeAtUri`/`parsePlaceAtUri` copied from voxelscape. World fields validated by `isPlaceManifest` rather than by rules written twice. |
| `project.ts`                                                                         | `PlaceProject { manifest, scripts, models }` — the one shape all three representations convert to. `writePlaceZip`, `makePlaceRecord`, `projectFromRecord`, `isPlaceProject`, starter place.                               |
| `place-file.ts`                                                                      | `models?: string[]` added, with a flat-namespace check across scripts and attachments.                                                                                                                                     |
| `load-place.ts`                                                                      | Carries attachment bytes instead of dropping them.                                                                                                                                                                         |
| [ADR 0044](../../docs/adr/0044-a-place-is-published-as-a-spacescape-place-record.md) | The collection, the version field, and why attachments are in the manifest but not the record.                                                                                                                             |

Two commitments were settled here because they are expensive to change once a record is published:
the collection's NSID, and putting `version` on the **first** record rather than the second.

`app.tsx` is untouched; `/place:open` still hands `startPlace` the parts it wants, so `project.ts`
has no production caller yet. Recorded in ADR 0044 as staging rather than oversight.

---

## Phase 2 — The editor ✅

**The first thing a player can reach.** A panel out of the existing console, CodeMirror with the
real guest library in its type service, and a Run button that rebuilds the world.

- **Dependency.** `@big-mesh-studios/solid-codemirror: workspace:*`, plus the catalog entries
  voxelscape uses. `vite.config.ts` already sets `worker: { format: "es" }` and `base: "./"`.
- **The language service, and the part that could have been painful and is not.**
  `bundle.ts:45` already ships the guest library as `GUEST_SOURCE` (`import GUEST_SOURCE from
"./guest/place-api.ts?raw"`), and `guest/voxelscape.ts:29-38` already documents the `paths`
  recipe for exactly this. Feed `GUEST_SOURCE` into the worker's virtual FS as `voxelscape.ts` and
  pass `tsconfig={{ paths: { voxelscape: ["./voxelscape.ts"] }, target: "ES2015" }}`. Real source,
  completions on all 32 guest functions, **no generated `.d.ts` and no `declare module`** —
  `guest/voxelscape.ts:19-27` records that route as tried here and failed.
- **One compiler — deferred, and the reason is worth recording.** `bundle.ts:43` imports
  `typescript` directly; the worker loads `typescript@5.9.3` from esm.sh. Switching the bundler to
  `loadTypeScript()` from `solid-codemirror/typescript-cdn` (voxelscape ADR 0029) makes
  `bundlePlace` **async**, because the compiler arrives by dynamic import — and it has ~30 call
  sites, nearly all in `bundle.test.ts` and `place-runtime.test.ts`, plus `PlaceHost.load` and
  `Interpreter.evaluate`. That is a refactor larger than the editor, so it is its own change.
  **The practical risk is lower than it looks:** the bundler calls `transpileModule`, which checks
  nothing, and with the pinned options above the output for ordinary code is the same across 5.7
  and 5.9. What a player can see is a completion or a lint the runtime would not honour.
  Cheaper interim answer if it ever matters: move the catalog `typescript` to `^5.9.3` so the local
  copy matches the CDN, at the cost of a repo-wide `tsc` bump.
- **The panel.** `/place:editor` grows out of the console: second panel size, CSS transition,
  scrim, collapse chevron, full-viewport media query. `console.tsx:1-13` already documents this
  layout as _"removed pending the place script editor"_ — the panel's second size, the transition,
  the scrim, the dock header's collapse chevron, and the media query that took the grown panel to
  the whole viewport.
- **Run.** The existing `startPlace` path (`app.tsx:812`); the result goes to console scrollback
  replacing the pending line, which is ADR 0020's mechanism and already there.
- **Draft.** IndexedDB, following `apps/sdf-modeller/src/file/database.ts` — autosave the project
  zip verbatim, `AUTOSAVE_MS = 1000`. A place that vanishes on refresh is the fastest way to kill
  authoring.
- **Tabs.** Scripts, plus a pane for the attachments from Phase 1. Voxelscape's fixed non-text tabs
  are the pattern.
  **Two Solid 2 subtleties cost real time and are worth writing down.**

1. **`createSignal` reads a bare function as a compute, not a value.** The editor's state and this
   integration both wanted `setX(fn)` to mean "an updater" and `createSignal(fn)` to mean "a
   component"; the first does hold, the second does not.
2. **A setter's value lands after a flush, so a read right after a write sees the old one.** The
   first `addScript` read `project()` to pick a name, got the stale value, returned
   `untitled-1.ts` two hundred times, and hung the suite. Every read now happens inside the
   updater, which is handed the signal's own current value. `console.test.tsx` flushes for the same
   reason.

---

## Phase 3 — Sign-in ✅

`packages/atproto` is ~1,000 lines and fully generic — nothing in it names voxelscape or a place.
Nearly all of what follows was copy-and-change, and the value is in the three places it could not be.

|                                                   |                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `atproto/oauth.ts`                                | The sign-in flow: popup channel and client-metadata URL.                 |
| `atproto/oauth-callback-page.tsx` + `.module.css` | The page a redirect lands on, copied as-is.                              |
| `atproto/atproto.ts`                              | Three signals and a `requireSession`, in rm-stacker's shape.             |
| `atproto/atproto.test.ts`                         | The wording and the state over it, with no fake session.                 |
| `console/account-commands.ts`                     | `/account:login`, `/account:logout`, `/account:state`.                   |
| `index.tsx`                                       | The `localhost → 127.0.0.1` redirect and the `isOAuthCallback()` branch. |
| `public/client-metadata.json`                     | This application's own client document.                                  |

Four things worth carrying forward:

- **`popupChannel: "bms.spacescape.oauth"`, and it is a correctness fix rather than a name.** atcute's
  OAuth state and this origin's `localStorage` are shared by every application served from it, and all
  three of this repository's apps sit under one GitHub Pages origin — so a channel another app uses is
  a channel that answers somebody else's sign-in.
- **Neither sibling's URL form transfers, and the plan's original advice was wrong.** It said to take
  rm-stacker's `new URL("client-metadata.json", new URL(BASE_URL, origin))`, on the reading that
  voxelscape's `window.location.href` form is unreliable — but this application's `base` is `"./"`
  in **dev as well as a build**, unlike both siblings. So `BASE_URL` is the string `"./"`,
  `new URL("./", origin)` resolves to the **origin root** (`…github.io/client-metadata.json` rather
  than under `/big-mesh-studios/spacescape/`), and the loopback redirect becomes
  `http://127.0.0.1:5173./`. The correct forms for a relative base are the opposite pair:
  `clientMetadataUrl: () => new URL("client-metadata.json", window.location.href).href`, and
  `loopbackRedirectPath: "/"` — the dev server serves this application at its root whatever `base`
  says. Both are asserted in `atproto/oauth.test.ts`, because the failure is a 404 on the deployed
  site that only a real sign-in reveals.
- **`tsconfig.json` needs `@atcute/atproto` in `types`,** and this is the one thing that did not work
  by copying. That package is what augments atcute's `Client` with the standard lexicon set; without
  it the generic resolves to `never`, and `packages/atproto`'s source fails to compile — under
  _spacescape's_ config only, so `pnpm --filter @big-mesh-studios/atproto check-types` passes while
  importing it does not. Both siblings list it. It is now a direct dependency for the types alone.
- **The account is built above the game branch**, beside the editor's state, so signing in survives a
  scene teardown rather than being lost to a reload of the world.
- **The atproto stack is in the main bundle, deliberately.** `index.tsx` must ask `isOAuthCallback()`
  before its first render, so `atproto/oauth` is eager and the session, identity and store come with
  it: **+48 kB raw / +16 kB gzip**, measured. Lazy-loading the session alone would move most of that
  out of first paint, and it is not done because a callback can arrive on _any_ load and the code that
  recognises one cannot wait for a chunk.

**The test item this phase was given does not belong to it.** "Carry voxelscape's ~350 lines of
`locate`/`fetch` stubs" is about the place library's listing ceilings — `listAll`, `ListingLimits`,
the relay directory — which is Phase 4. Phase 3's own tests are the command table and the account's
wording, because everything else is `packages/atproto`'s and tested there.

---

## Phase 4 — Publish and browse ✅

The other half of sharing: a place can leave the account that made it, and one can arrive from
somebody else's.

|                                                                |                                                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `atproto/places.ts`                                            | `createPlaceLibrary` (anonymous, network-wide) and `createPlacePublisher`. `ListingLimits` and `listAll` ported nearly verbatim. |
| `atproto/places.test.ts`                                       | The ceilings, the relay directory, and a publish's address — with injected `locate`/`fetch`.                                     |
| `places/browser/PlacesBrowser.tsx` + `.css`                    | The catalog overlay: search, mine, paging, load, and the `capped` honesty.                                                       |
| `console/place-commands.ts`                                    | `/place:publish`, `/place:browse`, `/place:load at://…`; `/place:list` renamed `/place:demos`.                                   |
| `places/editor/PlaceEditor.tsx`                                | A Publish button.                                                                                                                |
| [ADR 0045](../../docs/adr/0045-a-published-place-is-public.md) | The read/write split, `ListingLimits`, and the overlay-vs-0017 question.                                                         |

Five things worth carrying forward:

- **The read half takes no account at all.** `PlaceLibrary` builds a plain `Client` against whatever
  server a DID's document names, which is what makes the catalog usable _before_ sign-in — the order
  a new player arrives in. `PlacePublisher` is a separate object for exactly that reason.
- **`listAll` is bounded in eight directions and reports `capped`.** Ported from voxelscape because
  it answers questions that have nothing to do with what a place is: a listing reads accounts it did
  not choose, some slow, some gone, one malicious. One account that will not answer is passed over
  rather than failing the listing.
- **The overlay did not contradict ADR 0017, and the distinction is written down.** 0017's _the
  console is the only overlay_ was a decision about **scripted** UI, and it is still true of that — a
  place cannot draw a pixel. The catalog is the application's own interface, shown by a command, and
  reachable by nobody's place.
- **`/place:browse` toggles an overlay rather than printing text**, and an earlier draft of this
  phase built the text version first. It worked; a list of two hundred names in a scrollback is a
  list nobody scans, so it was replaced and the command now mirrors `/place:editor`.
- **A place loaded from the catalog is adopted into the editor**, so somebody else's place can be
  edited and republished under a different account. That is a feature and also the whole of the
  attribution story: the record says who published _this copy_ and nothing about where it came from.

**What was not ported from voxelscape, and should not be:** `resolveModel` and the model-publish
block (this record carries no model references — ADR 0044), `models.ts`, `edits.ts`,
`constellation.ts` (built on voxelscape's `EditLayer` over 32³ voxel chunks, where this engine's
world is a CSG operation list), and `atproto-controller.ts`'s edit-sync half.

---

## Phase 5 — API reference ✅

`tools/place-reference.ts` over the guest library → a committed `place-api.json` → `/place:docs`.

**The plan called this "nearly mechanical". It is not, and starting it found two things worth
writing down before anybody ports the sibling's 1,379-line tool.**

**1. The effect vocabulary is not part of a place author's API.** `guest/place-api.ts` does **not**
export `dispatch` — the one call to `engine.dispatch` is inside the library (`place-api.ts:76`), and
what an author writes is `createShape`, `createZone`, `createLight`, `after`, `onTick` and so on.
So `effects.ts` and its 23 tags are the **host's validation vocabulary**, not the author-facing
surface, and a reference built from them would document a function no script can import. voxelscape
does export `dispatch`, which is why its reference is built around effects; this engine's is not.
**The spacescape reference is functions, types, values, events and limits** — and `effects` is an
empty section, or is left out altogether.

**2. The port is real work at four separate seams**, each of which the sibling's tool assumes the
other way:

- **A real module, not an ambient declaration.** voxelscape's tool reads
  `declare module "voxelscape" { … }` through `moduleOf`. This engine's guest library is an ordinary
  module (`guest/place-api.ts`) aliased by `paths`, so `moduleOf` goes and the source file's own
  symbol is what `getExportsOfModule` is asked for.
- **Arrow-function consts.** `functionsOf` only recognises `ts.isFunctionDeclaration`; every guest
  function here is `export const name = (…) => …`, so the variable-declaration case has to be added.
- **`typesOf` and `valuesOf` take a `ts.ModuleDeclaration`** and read `module.name`; both need a
  `SourceFile` variant.
- **No plans, no shapes, no `sandbox.ts`.** `shapesOf`, `planTypesOf`, `PLAN_SHAPES`, `PLACE_PLAN`
  and `SANDBOX` all go, and with them the `plan`/`shapes` sections.

What survives untouched is the ~650 lines of pure checker plumbing (`typeText`, `tidy`, `nodeDoc`,
`symbolDoc`, `docOf`, `membersOf`, `typeDeclarations`, `targetOf`, `aliasOf`, `literalOf`,
`fieldsOfLiteral`, `isGuestVisible`, `referencedName`, `literalMember`, `alternativesOf`,
`pointedAt`, `typeFieldsOfAlias`, `spelledOut`, `typesOf`), which is the part worth reusing.

**What landed, self-contained in this app rather than generalising the shared package:**

|                                                                                        |                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/place-reference.ts`                                                             | The generator: the sibling's checker plumbing, adapted to a real module with arrow-function exports, and rebuilt around functions, values, types, events and limits. |
| `src/places/reference/types.ts`                                                        | The drawing's shape, and the argument for why it has no `effects`.                                                                                                   |
| `src/places/reference/index.ts`                                                        | The committed `place-api.json`, typed.                                                                                                                               |
| `src/places/reference/PlaceDocs.tsx` + `.css`                                          | The `/place:docs` panel: four sections, a filter, a close button.                                                                                                    |
| `src/places/reference/reference.test.ts`                                               | The invariants a hand-edit would break — nothing blank, and the function/value split.                                                                                |
| `place-reference` / `place-reference:check` scripts, and a CI step beside voxelscape's | The drift guard.                                                                                                                                                     |

Three things the port turned up, each recorded because it is invisible otherwise:

- **The regex that reads an event's sentence must not let its body contain `*/`.** The tail is
  matched lazily, and against a file header it backtracked past a comment that is not followed by a
  kind and swallowed everything up to one that is — so `player-joined` was documented with the
  whole of `events.ts`'s introduction.
- **A union member written in parentheses keeps its `ParenthesizedType`**, so `PlaceEventUnion`'s
  members were not recognised as intersections until they were unwrapped.
- **A comment above an array element is leading trivia, not a declaration's JSDoc.** Neither
  `nodeDoc` nor `ts.getJSDocCommentsAndTags` finds an event kind's sentence; reading the leading
  comment ranges does.

**Twenty-one declarations in the guest library had no sentence at all** — sixteen functions
(`clamp`, `lerp`, `log`, `toast`, `movePlayer`, the `remove*` three, and so on), four option types,
and `MAX_PRODUCER_LENGTH`. The generator refuses to draw an entry without one, so they were written
rather than the check weakened. **Which is the point of the check being a failure.**

**The editor does not wait on this.** Phase 2 already puts the real guest library into the language
worker, so a place author has typed completions, hover and lint for every function — the reference's
job is the readable document (`/place:docs`) and the committed artifact, not the completions.

**The `/place:docs` overlay itself is the small half**: one component over the JSON, following the
catalog's panel pattern (`src/places/browser/`), opened by a `/place:docs` command beside
`/place:editor` and `/place:browse`.
---

## Later, and deliberately not planned here

**Props and NPCs from `.sdfmod`.** The geometry half is settled — `model.bin` is
`serialiseOperations` at FORMAT_VERSION 3, which this repository's mesh workers already read, and
Phase 1 carries the bytes. Two real obstacles remain. **`.sdfmod` has no identity**: no name, no
UUID, no content hash, so its file name is the only handle (ADR 0033), and ADR 0021 predicted
"attach model by name" would be one line when the thing exists — the manifest field is one line, and
the naming decision it names is not. **ADR 0022's fork is still open**: a prop as declared
seat/surface data (cheap, and it makes the deliberately-unimplemented `getSeatYawAt` /
`getSurfaceVelocityAt` a few lines each per ADR 0019's stated omission) versus real SDF geometry
(expensive — `Operation` has no transform field and fold order _is_ the model). **The editor is
what settles this**: real authored scripts will show which one players need.

**Animation.** Out of scope. voxel-rigger's rig and motion system is rm-stacker-specific, and
duplicate it for SDF models is separate work. Props can land before it.

**Terrain.** `?edit` exists and `Game.updateAim` already maps primary→dig, secondary→place. Whether
a place carries its own landscape or always builds on the world's is open; ADR 0016's `flatten` puts
the document first, so places already layer over terrain.

**Multiplayer.** Not built, and deliberately so — ADR 0021 omits `mode` because _"a manifest that
could switch it on would be a switch wired to nothing."_ The determinism substrate is already built
for it: ADR 0015's seeded clock and PRNG, ADR 0016's index-ordered fold, and
`place-runtime.test.ts`'s "two peers running one place dispatch the same effects".

---

## Risks carried forward

1. **Authoring needs network.** The TS language worker and its `lib.*.d.ts` files come from esm.sh.
   voxelscape accepts this; it is the one thing that breaks offline authoring.
2. **Published records outlive the code.** Hence `version` on the first record and ADR 0044.
3. **OAuth's fiddliest hundred lines.** `packages/atproto/src/oauth.ts:199-205` documents that
   watching `popup.closed` cancels every sign-in one second in, because the PDS sends COOP and severs
   `window.opener`. The `BroadcastChannel` is the only surviving link. Read it before touching it.
4. **A collection is a public commitment.** ADR 0044.

## Verifying

Per phase, from `apps/spacescape`:

```
npx tsc --noEmit                        # one pre-existing error in src/engine/aim.test.ts
npx vitest run src/places/              # scoped; the full monorepo is slow on this machine
cd ../.. && npx prettier --check "apps/spacescape/src/places/*.ts" "docs/adr/**"
```

`turbo` resolves from the workspace that depends on it — `AGENTS.md` — and there is no ESLint or
Biome here, Prettier only. Do not run the monorepo-wide suite.
