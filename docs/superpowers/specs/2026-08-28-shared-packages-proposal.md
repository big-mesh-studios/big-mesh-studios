# Proposal: what else moves into `packages/*`

Date: 2026-08-28

Companion to [the stacker package design](./2026-08-28-stacker-package-design.md),
which covers the voxel-model renderer, file format and lexicon. This one covers
everything else the two applications hold twice: the maths shapes, the atproto
plumbing, and the Solid helpers. It also names the code that looks shared and
is not.

## What is actually duplicated

### The maths shapes — three copies, not two

`apps/rm-stacker/src/maths.ts` (499 lines) and
`apps/voxelscape/src/utils/maths.ts` (547 lines) are the same file. The world's
copy is a strict superset: it adds the `RGB` interface and namespace,
`Vector2D.length` and `Vector2D.clone`, and inlines `Dimensions2D` rather than
importing it from `types.ts`. Nothing in either is a deliberate divergence.

There is a third copy. `apps/voxelscape/src/voxel-model/data.ts` (71 lines)
re-declares `Vector3D`, `Dimensions3D`, `RGBA` and `Bitmap`, trimmed to what the
model code needs — and that is the copy the world actually uses. Seven modules
import `voxel-model/data`; three import `utils/maths`, and only for `Vector2D`
(`Joystick.tsx`, `pointer.ts`) and `RGB` (`ActionButton.tsx`). `Matrix3x3` and
`HSVA` are not referenced anywhere in the world outside their own definitions.

So the world carries 547 lines of maths to use two symbols from it, and keeps a
second, smaller definition of the four shapes that matter to it.

### The atproto plumbing — the same flow, drifted

Both applications sign in to atproto, resolve identities and read and write
records, and both do it with the same five modules. Four of them are the same
code:

| module           | editor | world | difference                                                                                  |
| ---------------- | ------ | ----- | ------------------------------------------------------------------------------------------- |
| `handles.ts`     | 51     | 46    | none — prose and `function` vs `const` arrow only                                           |
| `identity.ts`    | 80     | 92    | `pdsEndpoint` returns `string \| undefined` in the editor, `string` (throwing) in the world |
| `oauth.ts`       | 272    | 256   | the popup channel name, and the loopback `redirect_uri`                                     |
| `repo-client.ts` | 100    | 125   | genuinely diverged, see below                                                               |

`oauth.ts` is the largest of these and its two differences are one constant
each: `POPUP_CHANNEL` is `"rm-stacker.oauth"` against `"bms.voxelscape.oauth"`,
and the loopback redirect is `` `http://127.0.0.1:${port}${BASE_URL}` `` against
`` `http://127.0.0.1:${port}/oauth/callback` ``. Everything either side of them —
resolving the client configuration, loading the hosted metadata document,
detecting a loopback environment, running the popup — is line-for-line the same.

`repo-client.ts` is the one that diverged on purpose, and the two divergences do
not conflict. The world's takes a `repo` per call and resolves which server
hosts it, so it can read a peer's records off the peer's own server, and it adds
`getRecord`. The editor's is pinned to the signed-in account's own repository and
adds `uploadBlob`, which is where a published model's zip goes. The union of the
two is a coherent interface: per-call `repo`, plus `getRecord`, plus `uploadBlob`.

The OAuth callback page is a fifth duplicate — `OAuthCallbackPage.tsx` (53) and
`oauth-callback-page.tsx` (61), the same component with the same comments
rewritten.

`atproto/models.ts` is **not** a duplicate despite the shared filename. The
editor's is the record vocabulary, which the stacker design already moves to
`packages/stacker/src/lexicon.ts`. The world's is a reader of models published
by an arbitrary account. Different things.

`create-atproto.ts` (363 lines, a Solid store) and `atproto-controller.ts` (500
lines, a class) do the same job in opposite idioms. Unifying them is a real
project and not one this proposal takes on.

### The user-interface helpers — four, and two have already drifted

- `combineRefs` — in both `utils/utils.ts` files, byte-identical, five lines.
- `create-media-query.ts` — byte-identical.
- `createPopover` — in `rm-stacker/src/components/components.tsx` and in
  `voxelscape/src/utils/create-popover.tsx`, and **the two no longer agree**.
  The editor opens and closes with `showPopover()` / `hidePopover()`; the world
  uses `togglePopover(true)` / `togglePopover(false)`, with a comment recording
  why — the first pair throws when the popover is already in the state being
  asked for. The world hit that and fixed it, and the editor still throws on a
  redundant `open()`. Their props also differ: `title` on the editor's
  `Trigger`, `onToggle` on the world's `PopOver`.
- `pointer.ts` — 100 lines each. The world's accumulates a `totalDelta` across
  the drag; the editor's is the copy from before that was added.

Two of the four have drifted, and in both cases the older copy still compiles —
nothing anywhere reports that the editor's popover throws where the world's does
not. That is the case for this package: not tidiness, but that the divergence is
silent and has already happened twice.

Merging the popovers costs two things. The props become the union of both. And
the editor's `PopOver` hardcodes `class={[props.class, styles.popover]}` against
its own CSS module, which cannot travel into a package — that class becomes one
the caller passes.

Not shared, and staying in the applications: `isEditableTarget` (world),
`intersectSide`, `sideMaskToCSS`, `screenToWorld`, `hexToRgba` and `createDialog`
(editor — the first two depend on the editor's `SIDE_MASK`), and every styled
component, which is bound to a CSS module or to daisyui.

Also staying, against an earlier draft of this proposal that moved them: the
editor's `tryCatch`, `keysOf`, `createEnqueue`, `uint8ArrayToBase64`,
`base64ToUint8Array` and `byteTo2DigitHex`. They are generic, but every one of
them is used only by the editor, between one and four times. Putting them in a
shared package would make them look shared when nothing shares them. The world's
free `clamp` is likewise a single use, and a scalar clamp's home is
`packages/maths` beside `Vector2D.clamp`, not here.

### What is not shared, despite appearances

`apps/rm-stacker/src/command/` and `apps/voxelscape/src/commands.ts` both talk
about commands and are unrelated. The editor's is an undo/redo edit command —
`WritePixel`, `FillRectangle`, `ErasePixel`, each paired with the inverse
command that undoes it. The world's is a debug console dispatcher — `/help`,
`/day`, `/renderer` — whose design [ADR 0004](../../../apps/voxelscape/docs/adr/0004-commander.md)
records. Same word, different concept; there is nothing to extract.

## The conflict this settles

The stacker design makes `packages/stacker/src/data.ts` "the single definition of
the model shapes" — `Vector3D`, `Dimensions3D`, `RGBA`, `Bitmap` — sourced from
the world's `voxel-model/data.ts`. Those are exactly the shapes `packages/maths`
would own. Carried out as written alongside a maths package, the repository ends
up with four homes for `Bitmap` instead of three.

**Option A — `packages/maths` owns every shape.** `packages/stacker` depends on
it, and its `data.ts` shrinks to the vocabulary that is genuinely about a model:
`SideKind`, `sideKindSet`, `Sides`, plus a re-export of the maths shapes so a
consumer of `@big-mesh-studios/stacker/renderer` still gets one import.

**Option B — `packages/stacker` owns the 3D shapes**, as designed, and
`packages/maths` takes only what is left: `Vector2D`, `Dimensions2D`, `RGB`,
`HSVA`, `Matrix3x3`.

**Option A is chosen.** `Vector3D extends Vector2D` and `Dimensions3D extends
Dimensions2D`; option B puts a base interface and the interface extending it in
two different packages, which is worse than the dependency edge it avoids.
Option A also leaves `packages/maths` with no dependency of its own, which makes
it the one package that can be extracted before anything else is decided.

This amends the stacker design: its `src/data.ts` is no longer "the single
definition of the model shapes" but the model's own vocabulary, and it takes
`@big-mesh-studios/maths` as a dependency.

## Proposed packages

```
packages/maths      @big-mesh-studios/maths     shapes and their operations; no dependencies
packages/stacker    @big-mesh-studios/stacker   the model: data, solver, march, material, format, lexicon
packages/atproto    @big-mesh-studios/atproto   identity, oauth, repo client
packages/utils     @big-mesh-studios/utils     pointer, media query, popover, ref combining
```

`packages/rm-stacker` is deleted (the stacker design already calls for this).
`pnpm-workspace.yaml` gains `packages/*`.

### `packages/maths`

The world's `utils/maths.ts` as it stands, plus `Dimensions2D` promoted back
into the file from the editor's `types.ts`. That is the whole merge: the world's
copy already contains everything the editor's does.

Then delete `apps/voxelscape/src/voxel-model/data.ts` and point its seven
importers at the package, delete `apps/voxelscape/src/utils/maths.ts` and
`apps/rm-stacker/src/maths.ts`, and rewrite the 29 editor and 3 world imports.
The editor's `types.ts` keeps the shapes that are about the editor's own model —
`DimensionKind`, `AlignmentKind`, `Alignment3D`, `Axis`, `ModeKind`,
`PreviewState`, `SideAxis`, `SideAxes` — and, until the stacker package lands,
`sideKindSet`, `SideKind` and `Sides`.

The unused `Matrix3x3` and `HSVA` come along rather than being dropped: they are
the editor's, they are used there, and the package is where the editor now
reads them from.

### `packages/atproto`

- `identity.ts` — `createDidDocumentResolver`, `createHandleResolver`,
  `pdsEndpoint`. The world's throwing signature, since a caller that got no
  server has nothing to do next either way, and throwing names the reason.
- `handles.ts` — `claimedHandle`, `confirmHandle`. Straight merge; the world's
  `handles.test.ts` moves with it.
- `oauth.ts` — the same flow, with the two application-specific values passed in
  rather than compiled in. The natural shape is a `configureOAuth`-style entry
  that takes `{ popupChannel, loopbackRedirectPath }` and returns the flow,
  keeping atcute's module-level client state inside the package.
- `repo-client.ts` — the union interface: per-call `repo` with PDS resolution
  (the world's), `getRecord` (the world's), `uploadBlob` (the editor's).
- `OAuthCallbackPage.tsx` — one component, if the package may hold Solid code.
  It renders a status line and closes the window; the styling in both copies is
  inline. If the package is to stay framework-free, this stays duplicated and is
  the only thing that does.

Left in the applications: `create-atproto.ts` and `atproto-controller.ts`, the
world's `models.ts`, `monsters.ts`, `monster-sync.ts`, `edits.ts`, `profile.ts`,
and the editor's `thumbnail.ts`.

### `packages/utils`

Four modules, around two hundred lines in total:

- `combine-refs.ts` — `combineRefs`, from either copy.
- `create-media-query.ts` — from either copy.
- `create-popover.tsx` — the world's body, which is the one that does not throw,
  with the union of both props and the editor's CSS-module class lifted out to
  the caller.
- `pointer.ts` — the world's, with `totalDelta`. Its only dependency is
  `Vector2D`, so this package depends on `packages/maths`.

This package depends on `packages/maths`, and not the other way round. The three
Solid-coupled modules pull in `solid-js` and `@solidjs/web`; `packages/maths` has
no dependencies at all and is what the published `packages/stacker` reads its
shapes from. Keeping the two apart is what stops a published package acquiring a
framework dependency for the sake of some interfaces and arithmetic.

This is the smallest of the four packages and the last to be done, but not the
one with the weakest case — see the drift above.

## Published, or workspace-only

`packages/stacker` has to be published — the world imports it and the design
gives it a `dist-lib` build for that reason. The other three have no consumer
outside this repository, and stay private:

```json
{
  "name": "@big-mesh-studios/maths",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

Their `exports` point straight at TypeScript source. Vite and vitest compile a
linked workspace dependency the same as the application's own code, so these
three carry no `vite.config.lib.ts`, no `tsconfig.lib.json`, no `build-lib`
script and no `dist-lib` — and no ordering constraint on `pnpm check-types` or
`pnpm test`, which is what today makes `pnpm build-lib` a prerequisite for the
world's types resolving. Only `packages/stacker` keeps the built entry points,
and only because it is published.

One consequence to hold: `pnpm check-types` in an application now typechecks
that application's own code plus whatever it reads out of these packages'
source, so a package needs no separate type check of its own, but a type error
inside one surfaces at its consumers rather than at itself.

## Unresolved: how a published `packages/stacker` depends on `packages/maths`

`vite.config.lib.ts` externalizes every bare import, and `tsconfig.lib.json`
emits declarations with plain `tsc --emitDeclarationOnly`. So a published
`packages/stacker` that reads its shapes from `packages/maths` writes
`import { Vector3D } from "@big-mesh-studios/maths"` into both its JavaScript and
its declarations, and whoever installs it needs that package to exist. A private,
never-published `packages/maths` cannot satisfy that.

Three ways out, none of them chosen yet:

1. **Publish `packages/maths` as well.** It is a dependency-free leaf and the
   most reusable thing in the repository. `publishConfig.exports` can point the
   published package at `dist-lib` while in-repo consumers keep reading `src`,
   if the pnpm version in use supports overriding `exports` that way.
2. **Bundle it into `stacker`'s `dist-lib`** by dropping it from the `external`
   predicate. Rollup then inlines the JavaScript, but `tsc` still writes the bare
   import into the declarations, so this also needs declaration bundling that the
   repository does not have today.
3. **Give the 3D shapes back to `stacker`** — option B above. The objection
   raised against it is weaker than it first appeared: the world's
   `voxel-model/data.ts`, which is where those shapes would come from, already
   declares `Vector3D` standalone rather than extending `Vector2D`, so the
   inheritance that option B was said to split is already split there.

Option 1 keeps ownership where the rest of this proposal puts it and adds the
least machinery.

## Suggested order

1. **`packages/maths`** — no dependencies, and mechanical: one merged file, then
   an import rewrite. It also collapses the world's `voxel-model/data.ts`, which
   removes the conflict above before the stacker design is carried out.
2. **`packages/stacker`** — as designed, amended for option A.
3. **`packages/atproto`** — the only one needing design work, in `oauth.ts` and
   `repo-client.ts`.
4. **`packages/utils`** — last; nothing depends on it. Merging the two popovers
   fixes the editor's redundant-`open()` throw as a side effect, so the editor's
   popover call sites are worth checking for anything written to work around it.

Each step ends with `pnpm check-types`, `pnpm test`, `pnpm format:check` passing
from the root, per [CONTRIBUTING.md](../../../CONTRIBUTING.md).
