# Clouds: static blocky puffs, wrapped around the player

> Superseded by [ADR 0020](./0020-remove-moving-clouds.md), which removes the
> puff field because the still Cloud Blocks (ADR 0019) cover the same ground
> and the two together read as a duplication.

Minecraft-style clouds were added as a third environment system (after
day-night, ADR 0003, and weather, ADR 0006) with the same one-directional
seam: a pure, seeded generator plus a scene-owning controller that knows
nothing about renderers or the console.

## Generation

A puff's geometry is built once, at startup, from the world's terrain seed so
every client agrees on the sky. Each of the tile's 8×8 cells samples a 3D
Perlin noise (`PerlinNoise3D`, added to `world/noise.ts` beside the existing
2D one) into a 16³-voxel volume at a coarse 8-unit voxel size, and a voxel is
solid where the fBm exceeds a threshold. The solid set is culled-face meshed
the way the terrain is — one quad per exposed face — so a puff is a low-poly
cluster of blocks with no interior geometry.

Two knobs shape the result:

- **Flatness**: the y coordinate read into the 3D noise is scaled by
  `CLOUD_FLATNESS`, which raises the vertical frequency of the field and makes
  each puff come out wider than it is tall — the flat-bottomed, pancake
  silhouette that reads as "cloud", not "drifting boulder".
- **Coverage**: the same periodic noise sampled once at a cell's centre. A
  cell below the coverage threshold is left empty — the knob for carving clear
  patches out of the sky; the default sits below the noise floor so it never
  triggers. Where coverage is high the fill threshold drops, so denser areas
  grow fatter puffs and the sky reads as banks rather than a uniform peppering.

A cell's volume is exactly its tile cell, so geometry is generated in
tile-local coordinates and needs no padding or seam handling — cells do not
share faces.

## Cover, tuned to about 40%

The generator's knobs were discovered, not guessed, by a parameter search over
`cloudCoverage` — the fraction of the wrap tile's x/z columns that hold at
least one cloud voxel. `cloudCoverage(seed, opts)` rebuilds the same periodic
field the controller does (mixing the terrain seed the same way), so a test
can assert how much sky a config covers. The shipped defaults
(`CLOUD_FLATNESS = 5`, `CLOUD_THRESHOLD = 0.37`, `CLOUD_COVERAGE_DRIVE = 0.8`)
land at about 0.40 on the world's default terrain seed and average about 0.40
across seeds; two tests in `clouds.test.ts` pin both numbers.

Cover is set by the threshold against the noise's value distribution; the
feature size (frequency) sets the look, not the total cover. To hit 40% the
threshold has to drop low enough that the fill spans most of a volume's height,
which is why the puffs at this cover read as a scattered layer rather than the
thinner pancakes a sparse sky allows.

## Anchoring: the world, not the camera

The field is anchored to world coordinates, so the player can fly up through
the cloud layer and pass through a puff — the clouds do not retreat as the
camera approaches. `PerlinNoise3D` gained a lattice `period` (the field uses
8), and `CLOUD_FREQUENCY` maps exactly that many periods across the wrap tile,
so the puff noise tiles seamlessly over the tile's width in every axis.

Only the lattice coordinates are reduced modulo the period; the intermediate
permutation lookups stay in the full 0..255 range, so a small period keeps the
full gradient variety. (Reducing the lookups too, as an early version did,
reused just `period` distinct hashes and made the field's cover swing wildly
between seeds — a difference of 0.3 at the same settings.)

Each frame the controller places every cell mesh at

```
camera + wrap(anchor + drift - camera)
```

— the same camera-centred modulo wrap the rain and snow particles use, with
`drift` accumulating the wind within half a tile. The cell anchors are
symmetric around the origin (cell `cx` spans `[(cx - TILE_CELLS/2) * cell,
... )`), so the wrapped tile covers the camera's half-tile window completely:
there are clouds on every side of the player, wherever they stand. The wrap
keeps the field anchored to the world at the same time, because it is a period
of the field itself: a mesh sits at a fixed world position as the camera walks
and only jumps a whole tile when a wrap boundary is crossed, which the periodic
noise renders invisible — so a flying player still passes through a puff, the
camera crossing a tile boundary is seamless, and the "infinite" cloud layer
stays a fixed handful of static meshes whose positions a few float writes move
each frame, with no geometry rewrites and no worker. The drift wrap is equally
invisible: the field is `noise(P - drift)`, and a full-tile wrap is a period
of the field itself.

Clouds drift with wall-clock time, not the day-night clock, so
`/clock:speed` fast-forwards the sun and weather without racing the clouds —
the motion a player expects of a sky object.

## Lighting and weather

The shared `CloudMaterial` mirrors `TriangleMaterial`: sun/moon/ambient terms
plus distance fog, but over a per-phase tint instead of an atlas texture. The
controller's `applyLighting` is fed the _weather-mixed_ day-night state, so
the fog colour a puff fades into darkens and tints under a storm exactly like
the terrain's, and the phase tint warms the puffs at dusk and darkens them at
night.

## Draw order

`environment.clouds.cloudField` sits between the sky group and the terrain in
`scene.add`, so the sun/moon squares pass behind the puffs and no ground
overdraws them (every puff is above the highest terrain).

## Considered options

- **Animated in the vertex shader like the weather particles.** Rejected:
  the particles' trick exists to avoid re-uploading thousands of vertices;
  clouds are a handful of meshes, so plain per-frame `position` writes are
  cheaper and keep the geometry visibly blocky rather than billboard-flat.
- **Camera-relative placement (`camera + anchor`).** Rejected: the clouds
  would ride with the camera, so a player flying toward a puff could never
  reach it. The camera-centred _wrap_ (`camera + wrap(anchor - camera)`) is
  different: the wrap is a period of the periodic field, so the pattern stays
  put in the world while the drawn window surrounds the player.
- **A fixed lattice window (`floor(camera / TILE) * TILE + anchor`).** Rejected
  as the original approach: the window is anchored to the world lattice rather
  than the camera, so a player at a window edge sees a stretch of sky with no
  clouds in one direction. The camera-centred wrap keeps the drawn field within
  half a tile of the player on every side instead.
- **World-anchored cells without periodic noise.** Rejected: as the camera
  crosses a tile boundary the meshes must jump by one tile, and without
  periodicity that would show the pattern from a different world region at
  the seam. The lattice-period noise makes the jump seamless.
- **2D noise heightfield cloud sheet.** Rejected: the request was for clouds
  chunky in all three axes, which needs a 3D field; 2D would give flat slabs.

## Consequences

- `world/noise.ts` gained `PerlinNoise3D`, which now takes an optional lattice
  `period` (default 256, matching the classic hashing) so a field can tile.
- `clouds.ts` exposes `cloudCoverage(seed, opts)` — the measured fraction of
  covered sky — which the parameter search and the two coverage tests use.
- `CloudController` builds its field in the constructor (a few milliseconds
  of main-thread noise sampling at startup) and owns it for the session;
  there is no cloud data to stream or persist.
- `createEnvironment` gained a `seed` config, fed from `terrain.seed` in the
  composer, so the sky is deterministic per world.
- `scene-order.test.ts` names `environment.clouds.cloudField` in its declared
  draw order.
- `/clouds` toggles the field; `CloudController.describe()` reports its state.
