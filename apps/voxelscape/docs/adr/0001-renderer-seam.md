> Superseded by [ADR 0016](./0016-one-renderer.md), which removes the ray
> marcher and with it the seam this describes.

# Give the two renderers a real module boundary

`App.tsx` grew two complete, independently-built rendering strategies (fragment-shader
voxel raymarching and culled-face triangle meshing) inline: four parallel mesh arrays,
a bare `rendererMode` variable, an `applyRendererMode` visibility toggle, and several
`if (rendererMode === ...)` branches scattered through the animate loop and render
call. The triangle materials' shading logic was a hand-maintained copy of the
raymarcher's lighting/fog math (see the old `mesh-material.ts` header comment:
"replicates the raymarched look"), so the two could silently drift — plausibly the
cause of `c9a3f83` ("fixed missing water on some devices when using the triangle
renderer").

We introduced a `BlockRenderer` interface (`applyLighting`, `tick`, `setVisible`,
`onBlockChanged`, `dispose`) implemented by `RaymarchRenderer` and `TriangleRenderer`,
each owning its own meshes, materials, and per-mode extras (the triangle renderer's
underwater tint, the raymarch renderer's fetch-count heatmap) that previously lived as
mode-check branches in `App.tsx`. A `RendererSwitch` coordinator owns both instances,
the active mode, and the `/renderer` console command. All three live under the new
`src/renderers/` directory — the repo's first subdirectory; the rest of `src/` stays
flat until a broader reorganization.

## Considered options

- **Dedup only**: extract the shared lighting/fog values into one config object both
  materials read from, leave mesh-array management in `App.tsx`. Rejected — fixes the
  drift risk but leaves the god-object problem (this is meant to be the first cut of a
  larger `App.tsx` decomposition, not a one-off fix).
- **No coordinator**: `App.tsx` holds both renderer instances directly and branches on
  mode itself. Rejected — the point of the seam is that understanding "how mode
  switching works" shouldn't require reading `App.tsx`.

## Consequences

- `applyLighting` must be called on _both_ renderers every frame regardless of which is
  active, so the hidden one is already correct the instant the mode toggles — this is
  not a symmetric `tick()`, and future renderers must preserve that split.
- `TriangleRenderer`'s mesh-build queue is only drained while it's active by design
  (raymarch texture sync is cheap enough to run unconditionally; triangle rebuilds are
  not), so switching into `tri` mode can show a brief catch-up pop-in. Do not "fix" this
  into an always-draining queue without checking the perf cost first.
- `level.ts` and `mesh-material.ts` are retired; their raymarch/triangle-specific
  content moved into `src/renderers/`. `level-data.ts` (the shared `WorldBlock` model)
  is untouched and now imported directly rather than through `level.ts`'s re-export.
