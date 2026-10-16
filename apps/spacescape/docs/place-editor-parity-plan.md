# Spacescape place editor parity plan

Making the place script/code editor (`apps/spacescape/src/places/editor/`) catch up to the
sibling editor in `apps/voxelscape/src/ui/PlaceEditor.tsx`: working autocomplete, a UI for
attaching saved level assets, and a UI for attaching props/NPCs modelled in
`apps/sdf-modeller` as `.sdfmod` files.

Each phase is a self-contained change with its own tests. After every phase run
`npm run check-types` and the affected test files only (the machine is slow); run the full
`npm test` once, at the end.

File references are to `apps/spacescape/src/` unless stated otherwise.

## Scope decisions (settled)

- **Models**: local `.sdfmod` files only, attached by a file picker. No browsing of
  published models. `apps/sdf-modeller` does not publish to atproto and the only published
  models (`app.bms.stacker.model`, `packages/stacker/src/lexicon.ts:28`) are rm-stacker voxel
  figures in a format this engine cannot read (`places/model-library.ts` decodes CSG
  `model.bin`, not stacker parts).
- **Levels**: multiple, capped at `MAX_PLACE_LEVELS = 4`, listed with a remove control.
- **Sharing**: zip only. Publishing a place carrying models or levels is refused by
  `makePlaceRecord` (`places/project.ts:293-300`) and stays refused — the models/levels pane
  should surface that refusal as a status line rather than fail silently.
- **Look**: a close port of voxelscape's layout and styling, adapted to spacescape's docked
  console panel and palette. Includes the spawn field and double-click tab rename.

## Already working (do not change)

- **Zip export**: `Save` → `writePlaceZip` writes scripts + models + levels
  (`places/project.ts:259-269`).
- **Zip import**: `/place:open` → `loadFromDisk` reads the zip, adopts it into the editor,
  and passes `models` / `levels` to `startPlace` (`app.tsx:1955-1973`).

So the zip round-trip for code + level + props + NPCs already works. What is missing is the
editor UI that puts attachments *into* the project, and the Run path that carries them in the
author's own session.

## Phase 0 — Fix autocomplete

`EDITOR_COMPILER_OPTIONS.baseUrl` is `"."` (`places/editor/guest-library-files.ts:117`). The
language worker's virtual filesystem stores every file at an absolute path
(`/places/guest/voxelscape.ts`), but a relative `baseUrl` resolves against the worker's cwd and
produces a *relative* resolved path that never matches, so `import { createShape } from
"voxelscape"` fails with "Cannot find module 'voxelscape'" and the guest-API completions
vanish. Reproduced with the real `@typescript/vfs`: `"."` fails, `"/"` resolves.

- `places/editor/guest-library-files.ts`: change `baseUrl` to `"/"` (or drop it) and add a
  comment saying why it must be absolute.
- `places/editor/guest-library-files.test.ts`: add a test that runs
  `ts.resolveModuleName("voxelscape", "/main.ts", EDITOR_COMPILER_OPTIONS, host)` where the
  host's `getCurrentDirectory()` is `"/"`, and asserts the resolved file is the guest
  library's absolute path. Uses only the existing `typescript` devDependency.

## Phase 1 — Make Run carry attachments (author's session)

`runPlace` (`app.tsx:2339-2347`) passes `files/entry/seed/name/spawn/world` to `startPlace` but
**not** `project.models` / `project.levels`, even though `startPlace` supports both
(`app.tsx:2079-2084`, and levels via the host). Attaching anything would appear to work and
then not run.

- `app.tsx` `runPlace`: add `models: project.models` and `levels: project.levels`.
- `app.tsx` `startPlace`: after `modelLibrary = await ModelLibrary.from(models)`
  (`app.tsx:2080`), call `setLevelModels(modelLibrary?.names() ?? [])` so the level editor's
  prop/NPC picker (`LevelEditorOverlay` `models={levelModels()}`, `app.tsx:4211`) reflects
  newly attached models. Today it is set once at `app.tsx:2518` and never refreshed.
- Tests: a startPlace-level test that a project carrying a model plus a level reaches the host
  and the model names reach the picker signal.

## Phase 2 — Editor state methods

All edits go through `edit()` so the manifest's `scripts` / `models` / `levels` lists stay
re-derived from the project (`places/editor/create-place-editor.ts:122-155`). Add to
`PlaceEditorState`:

- `attachModel(name, bytes)` — refuse unsafe names, collisions with a script or level, over
  `MAX_PLACE_MODELS`, over `MAX_PLACE_MODEL_BYTES`.
- `removeModel(name)`.
- `removeLevel(name)`.
- `renameScript(from, to)` — refuse unsafe/taken names; keep the entry pointer valid.

Use `isSafePathName` (`places/place-file.ts`) and the `MAX_PLACE_*` limits there. One flat
namespace across scripts, models and levels is enforced by `isPlaceProject`; a collision would
make the draft quietly stop saving, so refuse it here and say why.

- Tests in `places/editor/create-place-editor.test.ts`: each method refused on its limits and
  collisions; every change leaves the project `isPlaceProject`-coherent.

## Phase 3 — Models pane (local `.sdfmod`)

A new pane in `places/editor/PlaceEditor.tsx`, modelled on voxelscape
`src/ui/PlaceEditor.tsx:1056-1197` but without the browse section:

- Heading "attached to this place", a hidden
  `<input type="file" accept=".sdfmod" multiple>`, a `+ from a file` button, a card list with
  each model's name and a remove button, and an empty state.
- Reads files into `Uint8Array` and calls `attachModel`; reports over-limit/duplicate names
  through `onStatus`.
- Update the existing "carried, not read" note — with the level editor picker and
  `createNpc`/`createProp` the models *are* read now.
- The pane should say that attachments travel by zip, not by publish, so the Publish refusal
  is not a surprise.

## Phase 4 — Levels pane + import

A new pane in `PlaceEditor.tsx`:

- Lists `project.levels` (name, item count parsed from the level JSON, remove), with an empty
  state.
- A `+ level` control with two actions: **from a file** (read a `level.json`, `writeLevel`)
  and **from the level editor** (`levelEditor.exportJson()`).
- The "from the level editor" action needs a new `onAttachLevelFromEditor` prop on
  `PlaceEditor`, wired in `app.tsx` next to the level editor's existing `onAttach`
  (`app.tsx:4218-4228`), because the panel has no access to `levelEditor`.
- Cap at `MAX_PLACE_LEVELS`; keep the level editor writing `LEVEL_FILE = "level.json"`
  (`places/level/types.ts`).

## Phase 5 — Visual parity

- Port voxelscape's structure (header fields, tabs with script / `+ script` / `+ level` /
  `models` / `levels`, and the panes) into `places/editor/PlaceEditor.tsx`.
- Port the visual language of `apps/voxelscape/src/ui/PlaceEditor.module.css` into spacescape's
  plain `places/editor/place-editor.css` (spacescape uses plain class names, not CSS modules),
  adapted to the docked-console palette in `console/console.module.css`.
- Add the **spawn** field (state already has `setSpawn`; manifest has `spawn`) and
  **double-click tab rename** (Phase 2's `renameScript`).

## Phase 6 — Verification

- `npm run check-types`.
- Affected tests: `places/editor/create-place-editor.test.ts`,
  `places/editor/guest-library-files.test.ts`, plus new pane tests.
- Full `npm test` once, at the end.

## Out of scope (unless requested later)

- Publishing models/levels over atproto (record schema + blob upload + a `.sdfmod`
  publisher in sdf-modeller). This is what would let other players load attachments from a
  published place instead of a zip.
- Voxelscape's Open… / clone-ownership flows; spacescape has `/place:load` and `loadFromDisk`.
