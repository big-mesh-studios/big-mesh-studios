# Give the weather system its own module

Following the day-night seam (ADR 0003), weather was added as a second
environment system with the same shape: a pure, unit-tested model
(`src/weather.ts`) plus a scene-owning controller (`src/weather-controller.ts`)
that knows nothing about renderers or the console.

## Weather time

The weather schedule is keyed to the day-night clock's _shown_ seconds, not
wall-clock time. `DayNightState` gained an `elapsed` field carrying the raw
(unwrapped) shown time, so `weatherAt(seed, elapsed)` runs on the same time
scale the sun and moon run on. Fast-forwarding the clock (`/speed`) advances
weather at the same rate, and pinning it (`/day`, `/time`) pins the weather
too — a forced time is a forced sky.

Storms are rare: the seeded schedule gives a mean gap of five day-night
cycles (`5 × CYCLE_SECONDS`) between storms, which reads as "mostly clear".
Rain is the common storm; thunder and snow are rarer draws.

## Particles in the vertex shader

Rain and snow are `Mesh` billboard quads whose per-particle attributes
(`particlePos`, `corner`, `drift`, `life`, `offset`, `size`, `spin`, `uv`)
are baked once at startup, exactly like the flame particles in the RMSL
`bomb-bloom` demo. All motion is in `ParticleMaterial`'s vertex body:
`mod(time + offset, life) / life` recycles each particle through its
lifetime (a `smoothstep` fade masks the wrap), drift and sway are animated
in-shader, and the quad billboards in view space. Per-frame CPU cost is a
time/intensity uniform plus re-centring the mesh on the camera — the vertex
arrays are never reallocated.

Lightning bolts are `Line2` polylines (`LineGeometry` + `Line2NodeMaterial`,
world-units, additive) whose jagged path is re-jittered every frame while a
strike is lit, then faded out; each strike also fires a brief additive
full-screen flash.

## One-directional wiring

`WeatherController` owns its particles, bolts, and flash mesh, and `tick`
returns `{ weather, intensity }`. It does not hold a `RendererSwitch`
reference. `App.tsx` composes: `dayNight.tick(...)`, then
`applyWeather(dn, weather.tick(...))`, then feeds the result to
`rendererSwitch.applyLighting` and the clear colour. The returned weather is
the controller's _tint_ weather, which stays on the last storm during the
intensity ramp-out so the sky fades back instead of cutting to clear.

## Considered options

- **Key weather to wall-clock time.** Rejected: it would diverge from the
  day-night time-scale the user asked for, and `/speed`/`/day` would no
  longer drive it.
- **Run particle motion on the CPU each frame.** Rejected: reallocating or
  rewriting per-particle vertex data every frame is the cost the
  vertex-shader approach avoids; the `bomb-bloom` demo already proves the
  GPU-side pattern.

## Consequences

- `DayNightState` gained an `elapsed` field; the wrap test in
  `day-night.test.ts` compares it modulo the cycle.
- The particle/bolt/flash meshes are added to the scene by `WeatherController`
  after the translucent water passes, so they blend over terrain and water.
- `weather.ts`'s `applyWeather` tints only the shader-rendered scene (sky,
  fog, lights fed to the renderers); the day-night controller's own
  standard-material lights (the player cube) stay day-night pure.
