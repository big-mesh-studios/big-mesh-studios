# Spacescape usability tweaks plan

A phased plan for the level-editor and general-usability TODO list. Each phase is a
self-contained change with its own tests. After every phase run `npm run check-types` and the
affected test files only (the machine is slow); run the full `npm test` once, at the end.

File references are to `apps/spacescape/src/` unless stated otherwise.

## Phase 1 — Hide the status readout by default, add `/status [show|hide]`

The "status text" is the top-left readout (`<dl class={styles.readout}>`, `app.tsx:3492`):
fragment precision, vertex layout, chunks, triangles, etc.

- `app.tsx`: add `const [statusVisible, setStatusVisible] = createSignal(false)` beside the
  other UI signals near `:560`; wrap the `<dl>` in `<Show when={statusVisible()}>`.
- `console/commands.ts`: add `setStatus(visible: boolean): boolean` to `CommandsParams`
  (`:146`); add a `/status` entry to `createCommands`. Bare `/status` reports; `/status show`
  and `/status hide` set it. `readToggle` (`:251`) only knows `on|off`, so a small local reader
  is used that also accepts `show|hide`.
- Wire the setter at `app.tsx:2139`.
- Tests: extend the recorder in `console/commands.test.ts`.

## Phase 7 — Auto-select the Select tool after Finish / Update

- `app.tsx` `finishDrawing` (`:831`): call `levelEditor.setTool("select")` at the end of both
  the floor and walls branches (new and update). The existing teardown effect (`:2935`) already
  resets the draft when the drawing tool is left.

## Phase 3 — Disable fog while the level editor is open

`Fog.apply` (`render/fog.ts:209`) always mixes toward the fog colour; `nearField = 0` only
kills the window term, so a real off switch is needed.

- `render/fog.ts`: add `enabled = true` and a `uFogEnabled` material uniform (`:194`); multiply
  the fog amount by it in `apply` (`:234`).
- `app.tsx`: in the `levelEditorOpen` effect (`:3006`) set `enabled = false` on all four shared
  `Fog` instances (`material.fog`, `GAME_WATER.material.fog`, `FIGURE_TINT.material.fog`,
  `globe.material.fog`) on open, and restore `true` in the returned teardown.

## Phase 2 — Persist cloud quality in IndexedDB

Cloud quality is a closure variable in `world/cloud-layer.ts:111` (default `"high"`), changed
only by `/cloud:quality` (`console/commands.ts:408`, adapter `app.tsx:2164`).

- New `persistence/settings.ts`: generic, non-throwing `readSetting<T>(key)` / `writeSetting(key,
value)` over the same `spacescape` / `Store` IndexedDB used by `places/editor/drafts.ts`.
- `app.tsx`: read `"cloud-quality"` on startup and apply it to `layer`; write it from the
  `cloud.quality` adapter whenever a value is set.

## Phase 5 — Draw readout: focus signal, 0/90 button, half-size markers

All in `level-editor/draw/DrawLinesUi.tsx`, `draw-lines-controller.ts`, `plane.ts`,
`draw-lines-overlay.ts`, with wiring in `app.tsx`.

- **5a (item 5):** a `focused: "length" | "angle"` signal plus refs in the `Readout`
  (`DrawLinesUi.tsx:47`). `onFocus` sets it; `Tab` switches and focuses the other field; an
  effect on each aim update selects-all and keeps focus so a desktop user can type while the
  mouse aims. `Enter` still commits.
- **5b (item 6):** add `"nearest"` to `AngleLock` (`plane.ts:191`). `applyAngleLock` implements
  it as `snapAngleTo(start, to, plane, 90)` — whichever of 0/90 is closer to the free aim, with
  the direction preserved. Replace the `0°` / `90°` buttons in `LOCKS` (`DrawLinesUi.tsx:34`)
  with a single `0/90°`.
- **5c (item 7):** pass `SNAP_RADIUS_PX / 2` to `overlay.render(...)` (`app.tsx:2543`) so the
  drawn rings are half size. The snap tolerance stays at the full `SNAP_RADIUS_PX` (visual
  only, so the finger-sized grab target is unchanged).

## Phase 6 — Delete a single wall segment (Walls tool sub-mode)

- Add a **Select segment** toggle to the Walls tool (`DrawLinesUi.tsx`). While on, drawing is
  suspended and a click/tap picks the nearest wall segment (screen-space; reuse the
  `move-handle` hit-test approach) across the level's walls. The picked segment is highlighted
  and a **Delete** button appears.
- Deleting drops that edge: an interior edge splits the polyline into two, an end edge trims it,
  and a segment that would drop a line below two points removes that line. One
  `levelEditor.updateItem(...)` per delete, so one undo step.
- Pure delete helper added beside `wallSegments` in `places/level/walls.ts`.

## Phase 4 — Y view distance: editor-only widening + a console knob to test it

The game window is `{ radius: 5, yRadius: 2 }` (`session.ts:71`), and the level editor shares
that session, so Y is squashed there too. `ChunkWindow.reshape` (`world/chunk-window.ts:397`)
already exists.

- `session.ts`: add `reshapeWindow(radius, yRadius)` → `this.window.reshape(...)` then
  `this.requestAll()`, following the `setBaseField` (`:299`) pattern.
- `app.tsx`: a `gameWindow` signal holding `{ radius: 5, yRadius: 2 }`. On `levelEditorOpen`
  open, reshape to `yRadius = radius` (match X/Z); on close, reshape back to `gameWindow()`.
- `console/commands.ts`: add `/window:radius <n>`, `/window:yradius <n>` and `/window:state` so
  the Y widening can be tried during normal play. The commands update `gameWindow` and reshape
  immediately when the editor is closed.
- The goal is to measure old-hardware performance; if normal play stays smooth the change can be
  made global later.

## Phase 8 — Floor outline node editor

A direct node editor for a selected floor's outline. The existing redraw-based "Edit outline"
button is currently dead (`PropertiesPanel.tsx:149` never passes `onEditOutline` to
`ShapeFields`); this replaces it.

- `draw/floor.ts`: pure `moveOutlinePoint`, `insertPointBefore`, `insertPointAfter`, respecting
  the 3..64 point bounds (`floorPointBounds`) and `outlineIsSimple`.
- A node-edit mode with an overlay drawing node markers (reuse the `draw-lines-overlay` /
  `move-handle` screen-space pattern) and pointer handling shaped like `grabHandle`
  (`app.tsx:2676`); a drag moves the node in the shape's own plane via `planeCoords` /
  `rayPlanePoint`.
- Wire the floor's outline bar button to the node editor. With a node selected, show
  **Add before** and **Add after**.
- Recompute `at` / `orientation` from the edited points (as `finishDrawing` does); one
  `updateItem` per drag or insert, so one undo step.
