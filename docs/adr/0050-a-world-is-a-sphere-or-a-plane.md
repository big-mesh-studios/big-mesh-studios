# 0050 — A world is a sphere or a plane, and the plane is a whole one

## Context

A place author working in three dimensions wants `y` to mean something. On a sphere it does not:
there is no constant `y` for ground level, and the working `y` for a point is a function of its
`x` and `z`, because the surface is at a distance from the centre and the distance is not an
altitude. Laying out a building coordinate-wise — deciding that the lintel is 200 above the floor
and the floor is at `y = 40` — is arithmetic that cannot be done without trigonometry, and the
trigonometry is the only hard part of the job.

The obvious answer is a flag. There **was** one: `app.tsx` carried a `?flat` mode, and it was
removed, with a note explaining why.

> **There was a `?flat` mode here and it is gone**, along with the two things that existed only
> to serve it: the sea's `level` variant and the water plane. The flag had a real cost that was
> easy to forget — a spherical frame with a sea at an altitude is an ocean at an infinite radius,
> and a flat frame with a sea radius is no ocean at all, because a flat frame's `radiusAt` is
> `Infinity`. Both are silent, and both would have been found by a player rather than by a test.
> With one world there is no pair to get wrong.

The note is right about the cost and its conclusion has expired. What it describes is **two
conventions for one number**: a sea level that was sometimes an altitude and sometimes a radius.
`seaLevelOf(spec)` (`base-field.ts:112-122`) now makes it one number read two ways — a distance
from the centre on a sphere, an altitude on a plane — and it travels with the parameters into
every worker. There is no pair to get wrong because there is only one thing to get wrong, and
`app.tsx:310-314` was already reading it that way.

**A second thing had to be true before this could be worth doing, and it was found rather than
designed.** The chunk lattice was never the spherical part.

`chunkCellOf` (`level-data.ts:202-218`) is a per-axis `Math.floor` around the world origin,
unbounded in both directions. The window is a squashed ball around the focus
(`sphereCells`, `level-data.ts:279-309`) rather than a shell, and LOD is Euclidean in chunk
cells. ADR 0036 put the planet's centre at the origin _precisely so the lattice could stay
cubic_ — a lattice re-centred on the planet would have to be rebuilt to put a planet anywhere
else. So both worlds stream on the identical cubic lattice, and what differs is a field and a
frame:

|                     | Spherical                          | Flat                  | State before this record |
| ------------------- | ---------------------------------- | --------------------- | ------------------------ |
| base field          | `planetField`                      | `terrainField`        | both existed             |
| gravity / up        | `sphericalFrame`                   | `flatFrame`           | both existed             |
| sea predicate       | `water-mesher.ts:111`              | `water-mesher.ts:113` | already branched         |
| in-sea predicate    | `app.tsx:311`                      | `app.tsx:312`         | already branched         |
| spawn, space, bound | `game.ts:499,526`, `player.ts:556` | same sites            | already branched         |
| water normal        | `sphericalWater`                   | `flatWater`           | both existed, one unused |

Which is also why ADR 0038 spent itself proving the warped-cube lattice could not serve a planet
this size (0041), and the shipped answer turned out to be that the question had been asked of the
wrong component.

**The render layer had no flat counterpart at all**, and that is where the work was:

- `sky.ts:569` — altitude was `cameraPosition.length()`.
- `atmosphere.ts:222-227` — the air column integrated a ray against a sphere.
- `clouds.ts` — two concentric spheres, solved **three times** term for term, in the raymarch, in
  the cheap layer, and in the host mirror.
- `globe.ts` / `render/globe.ts` — a displaced sphere at a radius.
- And four `Fog` / `SkyMaterial` instances that hardcoded `DEFAULT_PLANET_RADIUS` and were never
  given the real sea level by anything.

## Decision

**A world is chosen by one word — `sphere` or `flat` — and every layer reads that word rather
than carrying its own idea of what shape it is on.**

The word is decided once, in `world/world-geometry.ts`, which collects everything that follows
from it: the spec the workers are given, the physics frame, the sea level, the landscape and the
two answers off it, the water's shape, and the cloud deck. Everything else asks.

**It is stated in `manifest.json`, beside `seed` and `spawn`.** Not by a script, because the world
has to exist before the script's first line runs — the interpreter's top-level code asks the
session what is in it — so `setWorld("flat")` would be asking for a world that must already be
flat. `seed` and `spawn` are the same class of fact: what the ground is, declared before anything
is drawn on it. An absent `world` is a sphere, because every place written before the field
existed is a place on a planet.

**The console switches it at runtime, without a reload.** `/planet:shape [sphere|flat]`, in the
shape of `/cloud:quality` rather than `/player:fly`: a bare argument reports and an explicit word
sets, because each shape is the other's absence and a bare flip would be a coin toss.

**A switch invalidates every chunk rather than marking them out of date.** ADR 0007's rule is
that `markOutOfDate` is sound while the cell has not moved — whatever is on the GPU for a slot is
a surface of the cell that slot still stands for. A shape change breaks that: the geometry was
built from a field that no longer exists, so it is not a wrong _version_ of the right surface, it
is another surface entirely.

**The player is re-based rather than moved.** `createPlayer` builds a body's orientation from the
frame it is handed, so a body carried across keeps the up it had — and because the first thing
the physics does is add gravity along `up`, that means walking into the wall beside it.

**The sky draws no limb on a plane, and the globe is not built at all.** A limb is air seen
against a silhouette; a height field has no silhouette. And skipping the globe's bake is not an
optimisation — it is roughly five seconds of noise for a 3072×1536 map of a planet that is not
there.

## Consequences

**It is the same engine, not a second one.** `planet-world.test.ts:665-706` already asserted that
"a flat world and a planet differ only in what they are asked for", and that is now true of the
application rather than of a test: both worlds satisfy the same `PlayerWorld`, are streamed by the
same `Session`, and are meshed by the same mesher.

**A place can be read on a plane.** `sculpt.terrainHeight` returns `undefined` for a planet —
correctly, since the surface above a column on a sphere is the column's whole length — so
`getHeightAt` falls back to `0`. `app.tsx:1296-1300` says what that means: **every shipped demo
was authored against `getHeightAt(0, 0)` and built 135,000 units inside the ground.** On a plane
the same call answers with a height.

**The atmosphere's two solves are both in the shader.** `airMassNode` takes `spherical` as a node
rather than a constant, so both the sphere's quadratic and the plane's two divisions are evaluated
per fragment. That is a deliberate trade against rebuilding four materials to change one flag —
about a dozen extra arithmetic operations against a fragment doing four point lights and a
procedural material — and it is written down in `atmosphere.ts` rather than left for somebody to
discover in a profile.

**The clouds take the opposite trade.** Their `spherical` is a build-time flag, because every use
of it is inside the march — the volume's address, the weather map, the drift and the entry solve
are all per-sample — and a uniform would evaluate both worlds' address at every one of
`MAX_STEPS × LIGHT_STEPS` samples instead of once per fragment. A cloud layer is torn down and
rebuilt on a shape change anyway; there is no way to stop a bake that is already running and keep
the work.

**The cheap cloud layer had to agree about the _address_, not just the scale.** Its slice is cut
across the shape volume, so a sphere's slice is an equirectangular sweep of directions and a
plane's is a grid of positions. A flat world's cheap layer reading a sphere's slice would place
its clouds nowhere near where the raymarch put them — which is a different bug from the one the
plan anticipated, and would have been invisible until somebody compared the two.

**`CLOUD_FEATURE` does not scale, and `CLOUD_FEATURE_FLAT` is a different argument rather than a
different number.** `CLOUD_FEATURE` is `0.12 · R` and the record says why in 0042: a direction is a
direction on a sphere, so a feature's subtended _angle_ and the volume's _wrap count_ are the
same number. There is no radius to divide by on a plane, so that argument does not apply and a
number derived from it would be derived from nothing. The four thousand units is chosen from the
part of the argument that survives — a distance at which weather is recognisable, with the eye
standing under it — and it is _smaller_, because a plane's horizon runs further and features have
to be smaller to stay countable.

**The deck's base moves, in the opposite direction to what a reader would guess.** A height
field's noise reaches further per unit of scale than a sphere's — its amplitude bound is two where
the 3D one's is one — so `surfaceReachOf` puts a flat world's deck _higher_ above the sea. Reusing
the planet's would have put a flat world's clouds inside its own mountains, which reads as a
permanently clear sky rather than as a wrong constant.

**Four places were silently wrong before this and are not now.** `createSky` took no world at
all; `Fog.planetRadius` was `readonly` and defaulted to 136,000 in all three instances and was
never given a sea level; `CLOUD_BOTTOM` came from `reachOf(DEFAULT_PLANET)` while `app.tsx`
passed `GAME_SEA` as `seaRadius`. The one number that decides whether there is air overhead was
the one number nothing chose.

**Two bugs were found by tests written for this and are worth naming.**

1. `Game.setWorld` cleared `cameraTarget` and `cameraFov` by hand and left the player at 0.2
   radians with nothing holding the claim — ADR 0020's bug rather than a smaller version of it.
   It calls `clearCameraLook()` now, which is what puts the lens back.
2. The plane's cloud span solve had a guard meaning "never march below the ground" that emptied
   **every** descending ray, because every descending ray's exit is below its eye. A ground
   player looking up at weather got nothing.

**`startPlace` became an options object, which its own note predicted it would not.** That note
said an options object would be "a bigger change to every call site than adding one more
parameter" — true while the parameters were being added, and false the moment one of them is a
_choice_. Seven positions of which four are optional and adjacent is a signature where
`startPlace(…, spawn, models)` and `startPlace(…, spawn, levels)` are both valid and neither is
wrong.

**The place format gains an optional field, which is not a version bump.** `world` is absent on
every record already written and reads as a sphere, which is the only world any of them could
have been about. A second `PLACE_RECORD_VERSION` would orphan every record in a public collection
(0044) to describe a change that is a missing key.

**This extends 0040, 0042 and 0039, and supersedes part of nothing.** 0040's atmosphere shell and
clouds that wrap the planet hold on a sphere and become a slab on a plane — 0042's direction-and-
altitude address becomes a position-and-altitude one, and its note that a feature's angular size
and the wrap count are the same number becomes false where there is no angle. 0039's displaced
globe simply does not fire: there is no altitude at which the terrain stops and a globe takes
over, because a height field's far edge is `FOG_FAR` away and the fog is what hides it.

## Alternatives

**A query-string flag only, with no per-place setting.** This is what the deleted `?flat` was, and
it is what this record's first draft of the plan proposed. Rejected because the second half of the
request is the half that matters: a place that says what it is about travels to whoever opens it,
whereas a flag lives in one person's address bar.

**`setWorld("flat")` as a script call, like `setTime(300)`.** Rejected because the world must
exist before the interpreter's first statement runs. It could be made to work by pre-scanning the
bundle for the call before running anything, which is a second parse of a program that has already
been compiled, and which would make "what world is this place on" answerable by two different
mechanisms depending on where in the file the call appeared.

**Rebuilding the world as a whole — disposing the session and constructing a new one.** This is
what a reload does, and it would have been much less code. Rejected because a console command that
reloads the page loses the loaded place and the console's scrollback, and because "the ground
changed under the player" is a smaller and more explicable event than "the tab restarted".

**Replacing the sphere's shell solve with the plane's everywhere**, on the argument that a plane's
is the simpler one. Rejected: they are the same question about two shapes, not one shape and a
special case, and the sphere's is what 0040's limb and 0042's wrap count are both built on.

**Not porting the clouds, and giving a flat world a clear sky.** Cheaper by a good margin, and it
would have left a flat world visibly poorer than a planet for no reason a person could state. The
port cost four functions and two uniforms; the slab solve is shorter than the quadratic it
replaces.
