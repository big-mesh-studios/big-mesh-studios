# Give weather sound its own module

Weather gained audible feedback: a looping rain layer, a wind layer that
fades with storm intensity, and per-strike thunder. Rain and thunder use CC0
field recordings (`public/audio/rain.ogg` from Freesound #640655 by barkenov;
`public/audio/thunder.ogg`, an 11 s clap cut from Freesound #717890 by TRP);
wind is synthesized from the Web Audio API because it is exactly the sound
noise and filters do well. The procedural rain hiss and thunder crack+rumble
that shipped first proved unsatisfying and inaudible, so the recordings
replaced them as the primary layers while remaining fallback beds until (or
unless) the files load.

## Shape

`SoundController` (`src/sound-controller.ts`) follows the established
controller pattern: it owns its `AudioContext` graph and exposes plain typed
methods (`unlock`, `tick`, `thunderStrike`, `setVolume`, `describe`,
`dispose`), holding no renderer or console references. `App.tsx` wires it
exactly like the weather and day-night controllers.

Strike timing lives in `WeatherController`'s private wall-clock RNG, so the
sound controller cannot derive strikes on its own without duplicating that
logic. Instead `WeatherController` gained an optional `onStrike(x, z)`
constructor callback — a plain event, the same shape as `WorldRing`'s
`onBlockChanged` — fired when a strike spawns. `App.tsx` binds it to
`sound.thunderStrike(x, z)`.

## Sound design

- The CC0 rain loop is fetched and decoded lazily at `unlock`, looped through a
  gentle high-pass to drop field-recording rumble, and ramped with storm
  intensity. Until it loads, a procedural hiss (looped white noise through a
  low-pass, rocked by a slow LFO) plus a brown-noise "gush" carry the rain; a
  thin version of that hiss stays under the recording once it lands.
- Wind is brown noise through a band-pass, boosted a little extra during snow.
- Thunder is the recorded clap played once per strike (a slight random pitch
  shift for variety) with a detuned sub-oscillator underneath for weight, all
  delayed and attenuated by the strike's distance. Until the recording loads, a
  synthesized high-passed crack plus a low-passed brown rumble plays instead.
  `thunderTiming(distance)` delays the boom by distance over the speed of sound
  and attenuates gain with distance, so a strike flashes instantly and rumbles
  a moment later, softer when far away.

## Autoplay

Browsers suspend `AudioContext`s until a user gesture. `unlock()` creates and
resumes the context lazily; `App.tsx` binds it to the first `pointerdown` or
`keydown` on `window` and removes the listener after firing. Until then every
method is a no-op guard, so the controller is safe to construct and tick
before any interaction.

## Considered options

- **Keep rain and thunder fully procedural.** The initial white-noise hiss and
  synthesized crack+rumble were judged unconvincing (and thunder inaudible),
  and shaping them further (colored noise, multi-band) is a worse ROI than two
  CC0 field recordings. Rain and thunder are common, characterful sounds with
  abundant CC0 recordings, so the assets are cheap; wind stays procedural.
- **Positional `PannerNode` thunder.** Rejected for now: distance-based delay
  and gain already read as thunder, without the tuning surface (and risk of a
  low-quality pan when the strike is near the camera) that panning adds.
- **Audio inside `WeatherController`.** Rejected: same reason
  `DayNightController` doesn't reach into `RendererSwitch` — the weather
  controller should produce weather, not own its presentation, and the
  gesture-driven audio lifecycle is cleaner kept separate.

## Consequences

- The sound layer stays silent until the player's first pointer or key input.
- The rain and thunder recordings are CC0 assets; their provenance is noted in
  `public/audio/README.md`. If a fetch fails (for example in a library build
  without the asset), the corresponding procedural layer takes over.
- `SoundController` imports nothing side-effectful at module top level, so the
  pure `thunderTiming` helper is unit-testable in the node environment.
- `dispose()` stops the loops and closes the `AudioContext` on unmount.
