# Give day-night scene application its own module

Following the renderer seam (ADR 0001) and the world-ring seam (ADR 0002), the
day-night cycle was the next largest tangled cluster in `App.tsx`: the sun/ambient
`DirectionalLight`/`AmbientLight`, the sun/moon billboard meshes, the clock state
(`elapsed`/`timeOverride`/`timeSpeed`), and `applyDayNight` (which read that state and
pushed it into both the scene's own lights and `RendererSwitch.applyLighting`) were all
inline. The pure math (`src/day-night.ts`: `dayNightState`, `phaseAt`, the palettes) was
already a clean, independently tested module — nothing about it needed to change.

We introduced `DayNightController`, owning the lights, billboards, and clock.
`tick(dt, camera)` advances the clock, updates its own lights/billboards, and returns
the computed `DayNightState` — it does not hold a reference to `RendererSwitch` and
does not call `applyLighting` itself. `App.tsx` calls both: `dayNight.tick(...)` and
then `rendererSwitch.applyLighting(result)`. This preserves the one-directional
dependency already established for `WorldRing`: things that produce state don't reach
into things that consume it.

## Considered options

- **`DayNightController` calls `rendererSwitch.applyLighting` directly**, saving a line
  in `App.tsx`. Rejected for the same reason `WorldRing` doesn't hold a `RendererSwitch`
  reference — nothing about deriving or applying day-night state needs to know
  renderers exist, and doing this once would make the next extraction ask "why doesn't
  this one hold a reference too?"

## Consequences

- `renderer.setClearColor(...)` (setting the WebGL clear color from the sky color)
  stays in `App.tsx`, not `DayNightController` — it's a render-loop/canvas-lifecycle
  concern, not a day-night one, and belongs to whatever module eventually owns that
  (not yet extracted).
- This ADR also motivated ADR 0004 (`Commander`): once both `RendererSwitch` and
  `DayNightController` needed to expose console-command behavior, the previous
  approach (a single hand-written `switch` in `App.tsx`) needed to be replaced rather
  than duplicated a second time.
