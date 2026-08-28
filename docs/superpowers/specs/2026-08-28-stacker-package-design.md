# Design: extract the voxel-model renderer into `packages/stacker`

Date: 2026-08-28

## Context

The repository combines two earlier applications, `apps/rm-stacker` (the editor:
draw a voxel model by painting the six faces of a box) and `apps/voxelscape`
(the world: an infinite grid of terrain whose monsters wear a model read back
from the editor). The two programs each carry the code that turns a voxel
model into rendered pixels, and it has drifted:

- Data shapes (`Vector3D`, `Dimensions3D`, `RGBA`, `Bitmap`) — defined in
  `apps/rm-stacker/src/maths.ts`, and again, trimmed, in
  `apps/voxelscape/src/voxel-model/data.ts`.
- `solveVoxels` — `apps/rm-stacker/src/voxel-solver.ts` and
  `apps/voxelscape/src/voxel-model/solver.ts` are the same function; the world
  adds `encodePalette`, which the editor restates as a private
  `paletteTexels` in `voxel-render.ts`.
- `marchVolume` — `apps/rm-stacker/src/shaders-shared.ts` and
  `apps/voxelscape/src/voxel-model/march.ts` are identical.
- `boxSize` — `apps/rm-stacker/src/voxel-preview-scene.ts` and
  `apps/voxelscape/src/voxel-model/box-size.ts`.
- The ray-marched material — `VoxelPreviewMaterial` (editor) and
  `VoxelModelMaterial` (world) started from the same class and diverged: the
  world's version handles rotation plus translation plus non-uniform scale
  (it transforms the camera and light into model space with the inverse model
  matrix and re-derives its clip positions from matrix rows), and keeps an
  instanced path; the editor's version is rotation-only (it uses the
  `normalMatrix`, a constant depth bias for its outline, and the light is
  pre-rotated on the processor before upload).

On top of the renderer, the editor app doubles as the published package:
`@big-mesh-studios/rm-stacker` publishes `./format` (the model zip
reader/writer, `load`/`save`) and `./lexicon` (the atproto record vocabulary
for a published model), which the world imports. The world is the editor
package's only in-repo consumer, importing `@big-mesh-studios/rm-stacker/format`
and `@big-mesh-studios/rm-stacker/lexicon`.

## Goal

One package, `packages/stacker` (`@big-mesh-studios/stacker`), owns every
shape and function both programs share for a voxel model: the data shapes, the
solver, the ray marcher, the unified material, the box size, the file format
reader/writer, and the lexicon. The two applications consume it, the local
duplicates are deleted, and the naming is un-tangled: the lib and the app both
get the `stacker` name, distinguished by an `-app` postfix on the app
(`@big-mesh-studios/stacker-app`), with the world and the front page renamed
the same way.

## Non-goals

- Move the editor-only renderer helpers into the package: the CPU voxel
  picker (`voxel-picker.ts`, `voxel-picker-cpu.ts`, and the `rayMarcher` /
  `cpuVoxelPicker` glue in `shaders-shared.ts`), the offscreen thumbnail
  renderer (`renderVoxelImage` in `voxel-render.ts`), `voxelCellEdges`,
  `rotateMesh`, the light and camera constants, and the Solid `VoxelPreviewView`.
  These have no counterpart in the world.
- Move the world-only model code into the package: the zombie model
  (`default-zombie-model.ts`) and the zip reader wrapper (`load-model.ts`).
- Change the deployed URL paths. `/rm-stacker/` and `/voxelscape/` on the live
  site are baked into the OAuth `client_id` in `client-metadata.json`, into
  bookmarks, and into GitHub Pages routing; they stay as they are.
- Touch `packages/atproto` and `packages/maths`, which are empty placeholders.
  The empty `packages/rm-stacker` placeholder is removed because its name
  belongs to the new lib location now.

## Target layout

```
packages/stacker       @big-mesh-studios/stacker       the lib: data, solver, march, material, box, format, lexicon
apps/stacker-app       @big-mesh-studios/stacker-app   the editor (pure app; stops publishing)
apps/voxelscape-app    @big-mesh-studios/voxelscape-app the world
apps/homepage-app      @big-mesh-studios/homepage-app  the front page
```

`pnpm-workspace.yaml` gains `packages/*`. `apps/voxelscape`'s package name
changes from `@big-mesh-studios/bms-voxelscape`; `apps/homepage`'s from
`@big-mesh-studios/homepage`. Root scripts that filter by package name are
rewritten (`dev:rm-stacker` → `dev:stacker-app`; `build` and `dev:voxelscape`
build the package's `dist-lib` before the world's types resolve, exactly as
they built the editor's today). `pnpm install` regenerates the lockfile.

## The package, `packages/stacker`

### Build and manifest

Mirrors the current lib build of `apps/rm-stacker`:

- `vite.config.lib.ts` — one entry per thing a consumer might want, formats
  `["es"]`, bare imports left external, `outDir: "dist-lib"`.
  Entries: `format`, `lexicon`, `renderer`.
- `tsconfig.lib.json` — extends the package `tsconfig.json`, declarations to
  `dist-lib`, includes the lib entries and their transitively imported modules.
- `package.json` — `type: "module"`, `files: ["dist-lib"]`, `exports` mapping
  each entry to its `dist-lib` JavaScript and declaration, `publishConfig`
  public, `sideEffects: false`. Dependencies: `@atcute/lexicons` (type-only),
  `fast-png`, `jszip`. Peer dependency: `@random-mesh/rmsl` (the same peer the
  app-lib declared). Scripts: `build-lib` (vite build + `tsc -p
tsconfig.lib.json`), `test` (vitest), `check-types`, `format` covered at the
  root.

### Modules

- `src/data.ts` — the single definition of the model shapes and the ones shared
  across entries: `Vector3D` (interface plus a `create` namespace), `Dimensions3D`
  (plus `normalize`), `RGBA`, `Bitmap` (plus `create` and `EMPTY`),
  `SideKind`, `sideKindSet`, `Sides`. Source: `apps/voxelscape/src/voxel-model/data.ts`
  extended with the `SideKind`/`sideKindSet`/`Sides` definitions now living in
  `apps/rm-stacker/src/types.ts`.
- `src/solver.ts` — `solveVoxels` (from `apps/rm-stacker/src/voxel-solver.ts`,
  re-typed to the package `Sides` instead of key-typed `Record`)) and
  `encodePalette` (from `apps/voxelscape/src/voxel-model/solver.ts`; also
  replaces the editor's private `paletteTexels` in `voxel-render.ts`).
- `src/march.ts` — `marchVolume` and its `MarchVolumeNodes` type (from
  `apps/rm-stacker/src/shaders-shared.ts`, identical to the world's
  `apps/voxelscape/src/voxel-model/march.ts`). The CPU-picker additions of
  `shaders-shared.ts` (`rayMarcher`, `cpuVoxelPicker`, and the uniform /
  varying node exports) stay in the editor.
- `src/material.ts` — the unified `VoxelModelMaterial`. The class body is the
  world's `apps/voxelscape/src/voxel-model/material.ts` (inverse-model-matrix
  camera and light transform, instancing path retained, matrix-row
  clip reconstruction), with one addition: a `depthBias` number field,
  defaulting to 0, added into the `voxel`-hit fragment depth write so a caller
  can push the surface a fixed amount away from the camera. The editor sets it
  to its outline bias constant; the world leaves it at 0.
- `src/box.ts` — `boxSize` (from either side; identical).
- `src/format.ts` — `load` and `save` and the palette-building helpers they
  need, split out of `apps/rm-stacker/src/load-save.ts`; re-exports the data
  shapes plus `sideKindSet`, `SideKind`, `Sides` so consumers of today's
  `@big-mesh-studios/rm-stacker/format` keep the same surface. The IndexedDB
  persistence half of `load-save.ts` (`loadFromIndexedDB`, `saveToIndexedDB`,
  `saveValueToDB`, `loadValueFromDB`, and the png-encoding `encodePalette`
  that writes `palette.png`) stays in the editor.
- `src/atproto/models.ts` and `src/lexicon.ts` — moved wholesale from
  `apps/rm-stacker/src/atproto/models.ts` and `apps/rm-stacker/src/lexicon.ts`:
  `MODEL_COLLECTION`, `MODEL_MIME_TYPE`, `THUMBNAIL_MIME_TYPE`, `ModelRecord`,
  `PublishedModel`, `modelRkey`, `isModelRecord`, `modelBlobCid`,
  `thumbnailBlobCid`, `blobUrl`. The module is self-contained apart from the
  `Dimensions3D` type (from the package `data`) and the `@atcute/lexicons`
  blob type; both resolve inside the package.
- `src/renderer.ts` — the barrel entry re-exporting `data.ts`, `solver.ts`,
  `march.ts`, `material.ts`, and `box.ts`.

### Tests that move into the package

- `apps/voxelscape/src/voxel-model/solver.test.ts` (covers `solveVoxels` and
  `encodePalette`).
- `apps/voxelscape/src/voxel-model/box-size.test.ts`.
- `apps/rm-stacker/src/atproto/models.test.ts`.

## The editor app, `apps/stacker-app`

Directory renamed from `apps/rm-stacker`; package name
`@big-mesh-studios/stacker-app`.

Deleted:

- `src/format.ts`, `src/lexicon.ts` (moved to the package; `format` and
  `lexicon` are no longer published, so the app keeps no entry points).
- `src/voxel-solver.ts` (moved to the package).
- `src/voxel-preview-material.ts` (replaced by the package material).
- The lib-build apparatus: `vite.config.lib.ts`, `tsconfig.lib.json`, the
  `build-lib` script, and the `exports`/`files`/`publishConfig` fields.

Split / re-wired:

- `src/load-save.ts` keeps the IndexedDB persistence half and drops `load` /
  `save` (now imported from `@big-mesh-studios/stacker/format`).
- `src/shaders-shared.ts` keeps only the picker-facing surface (the uniform
  node exports, `rayMarcher`, `cpuVoxelPicker`) and imports `marchVolume` from
  the package's `renderer` entry.
- `src/voxel-preview-scene.ts` keeps `voxelCellEdges`, `rotateMesh`, the light
  constants, and `FOV`/`NEAR`/`FAR`; `boxSize` is imported from the package.
- `src/voxel-render.ts` uses the package `VoxelModelMaterial` (with the depth
  bias on) and the package `boxSize`/`encodePalette`; the caller passes the
  light in world space, so the `Matrix3x3` pre-rotation is deleted. This is
  behavior-preserving: for a pure-rotation mesh the material's inverse model
  matrix is exactly the `worldToModel` rotation the picker already follows.
- `src/VoxelPreviewView.tsx` uses the package material the same way (world
  light, depth bias on, instancing unused) and imports `boxSize` from the
  package. `Matrix3x3` remains in use for the CPU picker's world-to-model
  matrix, which is unchanged.
- `src/stacker-store.ts` imports `solveVoxels` from the package.
- `src/profile/ProfileModal.tsx` and `src/atproto/thumbnail.ts` import the
  lexicon symbols (`thumbnailBlobCid`, `PublishedModel`, `THUMBNAIL_MIME_TYPE`)
  from `@big-mesh-studios/stacker/lexicon` instead of the moved `atproto/models`.
- `@big-mesh-studios/stacker` is added as a workspace devDependency of the
  editor app (the app imports the package from its own code now), alongside
  `@random-mesh/rmsl` already present as a peer.
- `src/atproto/models.ts` is gone (it moved); the editor's atproto code reads
  the vocabulary through the package `lexicon` entry.

`src/voxel-preview-scene.test.ts` splits: the `boxSize` cases move to the
package; the `rotateMesh` and `voxelCellEdges` cases stay with the editor.

## The world app, `apps/voxelscape-app`

Directory renamed from `apps/voxelscape`; package name
`@big-mesh-studios/voxelscape-app`. `@big-mesh-studios/stacker` is added as a
workspace devDependency in place of `@big-mesh-studios/rm-stacker`.

Deleted from `src/voxel-model/`: `data.ts`, `box-size.ts`, `solver.ts`,
`march.ts`, `material.ts`, `box-size.test.ts`, `solver.test.ts` (the last two
move with their subjects).

Re-wired:

- `src/voxel-model/load-model.ts` stays (it is the world's wrapper around the
  format reader) but imports `load` from `@big-mesh-studios/stacker/format`
  and the `Bitmap`/`Dimensions3D`/`RGBA`/`SideKind`/`Sides` types from
  `@big-mesh-studios/stacker/renderer`; `LoadedModel.sides` is the package
  `Sides`.
- `src/voxel-model/default-zombie-model.ts` stays and imports its types from
  the package `renderer` entry.
- `src/monsters/remote-monsters.ts` imports `VoxelModelMaterial`, `solveVoxels`,
  `encodePalette`, `boxSize`, and the data types from
  `@big-mesh-studios/stacker/renderer`.
- `src/atproto/models.ts` keeps importing from
  `@big-mesh-studios/stacker/lexicon` (same subpath as today, new package name).

## Repo-wide changes

- `README.md`: rename the app rows, the dev-command list, and the note that
  "the world imports `@big-mesh-studios/rm-stacker`, which resolves to
  `apps/rm-stacker/dist-lib`" (now: `@big-mesh-studios/stacker`, resolving to
  `packages/stacker/dist-lib`). Live URLs stay `/rm-stacker/` and `/voxelscape/`.
- `CLAUDE.md`: update the "What is under `apps`" section to the new names and
  add the package; update the note that `apps/rm-stacker`'s `dist-lib` must
  build before the world's types resolve (the world also depends on the new
  package's `dist-lib` now).
- `CONTRIBUTING.md`: update any application-name references in the checks
  commands.
- `apps/rm-stacker/README.md` → app README under the new name: drop the
  "install as a library" section (the app no longer publishes; the library is
  `@big-mesh-studios/stacker`), keep the demo/URL text.
- Add `packages/stacker/README.md` (short): what the package owns, and the
  `load`/`save` + lexicon usage that the editor README used to show.
- `.github/workflows/gh-pages.yml`: the build paths become
  `apps/stacker-app/dist → site/rm-stacker/` and
  `apps/voxelscape-app/dist → site/voxelscape/`; the 404 copy line, the prose
  comment, and the homepage dist copy update accordingly. Live URLs are
  unchanged.
- `.github/workflows/ci.yml` and `preview-release.yml`: update any
  app-directory or package-name references.
- `apps/voxelscape-app/CONTEXT.md` and
  `apps/voxelscape-app/docs/adr/0015-published-models.md`: update the
  `@big-mesh-studios/rm-stacker/lexicon` reference and the source-path
  pointers to the material (`src/voxel-model/material.ts` → the package).
  Factual references update in the ADR rather than rewriting its argument.
- `apps/voxelscape-app/scripts/make-sample-zombie.ts`: update the package name
  if it imports from the editor package.

## Open question asked of the approver

Keeping the live URLs (`/rm-stacker/`, `/voxelscape/`) as they are. Changing
them would break the OAuth client registration and existing links; the approver
confirmed keeping them.

## Verification

From the repository root, all must pass:

- `pnpm build-lib` — builds `packages/stacker` (and any other `build-lib`
  workspace).
- `pnpm check-types` — both applications and the package resolve their types.
- `pnpm test` — moved tests run in the package; both apps' remaining tests
  still pass.
- `pnpm format:check`.
- `pnpm build` — both apps build for deploy.
- The editor preview and thumbnail rendering still light a model the same way
  (depth bias on, world-space light), and the world's monsters still render
  with the same material (depth bias 0).
