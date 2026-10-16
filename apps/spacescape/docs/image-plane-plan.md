# Spacescape image-plane tool plan

A phased plan for the level-editor **image plane** tool: insert a 2D image rendered
semi-transparent on the local ground plane (≈ the XZ plane on flat ground) with the depth test
off, so it shows through mountains and can be traced with the Walls and Floor tools.

File references are to `apps/spacescape/src/` unless stated otherwise.

## Decisions (agreed)

- **Persistence:** an optional **top-level `imagePlane` field** in `level.json`. It is _not_ a
  `LevelItem`, so it never enters the CSG fold. `readLevelPlan` validates only `version` and
  `items` (`places/level/level-plan.ts:157`), so an older build ignores the field and still
  loads the level — this is the backward-compatibility guarantee. A newer build reads it.
- **Manipulation (revised):** the image behaves like a selected item. Its own **Reference panel**
  edits position (`X/Y/Z`), `Width`, `Rotation`, `Opacity`, `Show`, and offers Choose/Clear; and
  while the Image tool is on it gets the **move gizmo's world-axis arrows**. The earlier
  drag-the-picture-on-its-own-plane gesture was removed: the plane is near horizontal, so a low
  camera makes the pointer ray meet it at a grazing angle and a small move throws the picture a
  long way ("slides around"). A world-axis drag does not depend on that angle.
- **Mobile:** the Reference controls are their **own panel/tab** in `LevelEditorOverlay`'s sheet,
  not a floating cluster, so they survive the small screen like every other panel.
- **Orientation & count:** **one** image, lying on the **local ground plane** (normal =
  `WORLD.frame.upAt(at)`, matching the walls/floor drawing plane — see `world/up.ts` / ADR 0037),
  which reduces to world-XZ on flat ground.

## Why this is editor chrome, not geometry

The purpose is tracing, so the plane has to be visible through the terrain (depth test off) and
must not affect the fold. It is therefore neither a `LevelItem` nor an operation; it is a single
mesh in the scene plus an optional annotation on the level document. That keeps `apply-level.ts`,
`types.ts`'s item union, the picking paths and the inspector untouched.

## Renderer facts this relies on

- The renderer is the custom RMSL scene graph (`@random-mesh/rmsl/scene`), one `viewport.scene`
  from `render/viewport.ts:68`. **Draw order is insertion order, not a sort key** (ADR 0014).
- A depth-test-off textured quad already has a template: `draw/draw-lines-overlay.ts:186-206`
  (`transparent`, `depthTest = false`, `depthWrite = false`, added last).
- `MeshBasicMaterial` takes `map: Texture`, `transparent`, `opacity`, `side`; `Material` has
  `depthTest`/`depthWrite`; `Texture` accepts any `TexImageSource` (so an `ImageBitmap`);
  `PlaneGeometry` is XY (rotate to XZ).
- `quatFromBasis(ex, ey, ez)` already exists (`places/level/walls.ts:144`) and is exactly the
  matrix→quaternion extraction the plane's orientation needs. `onbFromDirection(up)` gives the
  plane basis (`draw/plane.ts:90`).

---

## Phase 1 — Render the plane (in-memory)

New `level-editor/view/image-plane.ts`, modelled on `view/highlight.ts` and
`draw/draw-lines-overlay.ts`:

- `createImagePlaneOverlay(scene)` → `{ setImage(texture, aspect), setPose({at, up, yaw, width}),
setOpacity(o), setVisible(v), dispose() }`.
- `new Mesh(new PlaneGeometry(1, 1), material)`; `material = new MeshBasicMaterial({ map,
transparent: true, opacity, side: Side.DoubleSide })`; then `material.depthTest = false;
material.depthWrite = false`.
- Orientation: `onbFromDirection(up)` → `{b1, b2}`, rotate `b1`/`b2` about `up` by `yaw`, build
  the quaternion with `quatFromBasis(axisA, axisB, up)`, set `mesh.quaternion`.
- Scale `mesh.scale.set(width, width / aspect, 1)`; place at `at`.
- `dispose()` removes the mesh, disposes the geometry and the old texture.
- **Ordering:** create it in `app.tsx` in the editor-overlay block (~~`2419-2441`), after all world
  meshes and **before** `drawLinesOverlay` so the draft and handles still paint on top; drive it
  from `editorFrame` (~~`2790`).

**Resolved (was: verify visually).** RMSL's `Texture` exposes no `flipY` and the renderer sets
`UNPACK_FLIP_Y_WEBGL = 0`, so an image uploaded as-is lands upside down against the plane's V-up
UVs. Fixed at the decode in `image-loader.ts` with
`createImageBitmap(blob, { imageOrientation: "flipY" })`.

## Phase 2 — State + image loader

New `level-editor/image/image-plane-state.ts`:

- Signal-based store (`createImagePlaneState`): `image` (the untouched `{ bytes, mime }`),
  `at`, `yaw`, `width`, `opacity`, `visible`, and a `pose` memo. `up` is a memo of
  `upAt(at)`, so it follows the local ground (ADR 0037) rather than being a stored second truth.
- `image-loader.ts`: `readReferenceImage(file)` copies the **untouched bytes + `file.type`**
  (no decode, testable against a fake `File`); `textureFromReference({bytes, mime})` builds the
  `Texture` with `createImageBitmap` (browser-only, not unit-tested). The bytes are the truth;
  the texture is a derived, disposable view.
- **The base64 codec moved to Phase 4**, where the file format actually needs it — the live
  state keeps raw bytes, not an encoded string.
- `app.tsx`: makes the store at **component scope** (before the level store, which serializes
  through it via the reference seam) and adds two effects — one rebuilding the overlay texture
  when the bytes change (with a cancelled token so a late decode cannot overwrite a newer image),
  one driving pose/opacity/visibility and hiding the plane whenever the editor is closed.

## Phase 3 — Tool, panel, move gizmo

- `level-editor-store.ts`: add `"image"` to `ToolKind` and `TOOL_KINDS`. **Do not** add it to
  `drawsInAPlane` — it is not a draw tool, so the walls/floor draft teardown and click routing
  stay untouched.
- `panels/ToolbarPanel.tsx`: add `TOOL_LABELS`/`TOOL_TITLES` entries (the `?? kind` fallback
  already covers a miss).
- New `panels/ReferencePanel.tsx`, added to `LevelEditorOverlay`'s `PANELS` as its **own tab**:
  **Choose image…** (hidden `<input type="file" accept="image/*">`, `click()` inside the gesture,
  async read — copied from `LevelIoPanel.tsx`), plus position (`Vec3Field`), `Width`, `Rotation`,
  `Opacity`, `Show`, `Clear`.
- `app.tsx` **move gizmo**: `standHandles` places the move arrows on the image while the Image
  tool is on (no rotate rings — the panel turns it about up); `grabHandle` moves it along a world
  axis and writes `imagePlane.setAt` live (no ghost, not undoable). This replaced the removed
  plane-drag. Guard `clickLevelWorld` so `"image"` cannot fall through to the `prop`/`npc` cast.

## Phase 4 — Persistence (top-level field)

New `places/level/image-plane.ts`:

- `interface LevelImagePlane { at; yaw; width; opacity; mime; bytes: Uint8Array }` — the live
  form. `up` is _not_ stored: it is derived from `at` on load (ADR 0037), so there is no second
  truth to drift.
- `encodeImagePlane` / `decodeImagePlane` plus the chunked `bytesToBase64` / `base64ToBytes`
  (the bytes go to the file as base64, the `mime` beside them verbatim). The reader validates
  every field, caps the decoded size at `MAX_IMAGE_PLANE_BYTES`, refuses unknown keys, and is
  whole-or-refused (consistent with `level-plan.ts`).
- `places/level/level-plan.ts`: `writeLevelPlan(plan, imagePlane?)` emits
  `{ version, items, imagePlane? }`; existing one-arg callers are unaffected. **`readLevelPlan` is
  unchanged** — it keeps ignoring the extra top-level key, which is the compatibility guarantee.
- `level-editor-store.ts`: `createLevelEditor(host, reference?)` takes an optional
  `LevelReferenceSeam` (`{get,set}`); `exportJson()` calls
  `writeLevelPlan(plan(), reference?.get())`; `importJson()` decodes the parsed value's
  `imagePlane` and refuses the file if malformed; `reseed()` clears it. `app.tsx` supplies the
  seam from the image state (`reference()` / `load()`), so `onAttach` and `LevelIoPanel` need no
  change — both go through `exportJson()`.

**Caveat:** `MAX_PLACE_LEVEL_CHARS = 1 MB` (`places/place-file.ts:140`), so a large embedded
image will fail "Add to place". The cap is bounded and the notice says so; a bigger reference
still exports/imports as a plain level file.

## Phase 5 — Tests + verification

- Pure: pose→basis/quaternion mapping; base64 round-trip; `writeLevelPlan(plan, ref)` includes
  `imagePlane`; `decodeImagePlane` accepts valid / refuses malformed; `readLevelPlan` still
  ignores the top-level key; the state's `reference()`/`load()` round-trip.
- Store: `importJson` adopts a reference, `exportJson` includes it, a malformed one refuses the
  file, `reseed` clears it.
- Mounted: `overlay.test.tsx` still mounts the whole overlay (now including the Reference tab).
