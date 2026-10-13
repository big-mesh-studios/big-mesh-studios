# A flat world as well as a planet

**What this is.** The work, in order, to let a place run on a flat planet as well as a
spherical one — a console command to switch at runtime, and a per-place setting in the
manifest that says which. Written down because it is longer than a context window and
because the finding that shaped it (below) is worth more than the phases that follow.

**Status: shipped.** Every phase below is implemented, and the decision is
[`docs/adr/0050-a-world-is-a-sphere-or-a-plane.md`](../../docs/adr/0050-a-world-is-a-sphere-or-a-plane.md).
This file is kept as the working notes; **where the implementation departed from the plan, the
departure is marked** — those are the parts worth reading before the ADR.

**Why.** A spherical planet makes coordinate-wise layout hard to reason about: a place
author has no constant `y` for ground level, and the working `y` for a point depends on its
`x` and `z`. On a flat world `y` is always up and one `y`-value is ground level, which is
what makes laying out a building coordinate-wise tractable.

**Decisions already taken** (2026-10-13):

| Question                                  | Answer                                             |
| ----------------------------------------- | -------------------------------------------------- |
| How does the console command switch?      | Live rebuild in place                              |
| How much of the sky needs a flat variant? | Full port — sky, atmosphere, fog, clouds, no globe |
| Where does the per-place setting live?    | `manifest.json`                                    |
| What vocabulary?                          | `"sphere" \| "flat"`                               |

## What shipped, and where it differs from the plan below

Four departures, all of which the ADR records:

| Planned                      | Shipped                   | Why                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `worldGeometry(shape, seed)` | `worldGeometry(shape)`    | **No seed.** The terrain's seed is `DEFAULT_PLANET.seed` at module scope and never was a place's `manifest.seed`, which seeds the _script's_ `engine.random`. Threading it through would have been a behaviour change, and phase 1 is explicitly not one. _(Worth deciding separately: two peers loading a place get the same ground — but not the ground that place's seed implies.)_ |
| `WorldGeometry.reach`        | `cloudDeck(spec)` instead | **`reach` was a field with no reader** until phase 3, which is the "a manifest field nothing reads" problem this repository writes warnings about. It became `cloudDeck`, beside `CLOUD_CLEARANCE`, and it reads `surfaceReachOf` — which is `seaLevelOf`'s sibling and was added to `packages/csg/src/base-field.ts` rather than restated in the app.                                 |
| `Fog.spherical` as a uniform | As planned                | The atmosphere's two solves are both evaluated per fragment. Deliberate, and written down in `atmosphere.ts` — the alternative is rebuilding four materials to change one flag. **The clouds take the opposite trade** and build-time it, because every use is per-sample.                                                                                                             |
| No cloud layer on flat       | **Clouds on both worlds** | The plan's own line — "a flat world's clouds are a slab, not a shell" — read as though the slab did not exist. It did not need to: the file's history records the flat expressions it used to have, and the slab solve is _shorter_ than the quadratic it replaces. A sky with no weather is a worse flat world than a planet with it.                                                 |

Two bugs the new tests found, both recorded in the ADR: `Game.setWorld` released a camera
claim without putting the lens back, and the plane's cloud span emptied every descending ray.

## The finding that shaped everything

**The chunk lattice does not need changing.** `chunkCellOf`
(`src/world/level-data.ts:202-218`) is a per-axis `Math.floor` around the world origin,
unbounded in both directions, and ADR 0036 made the planet's centre the origin _precisely so
the lattice could stay cubic_. A flat world uses the identical lattice.

The two things that were assumed to be the spherical part already exist as pairs:

| Concern          | Spherical                                        | Flat                                               | Status                                     |
| ---------------- | ------------------------------------------------ | -------------------------------------------------- | ------------------------------------------ |
| Base field       | `planetField` (`packages/csg/src/planet.ts:197`) | `terrainField` (`packages/csg/src/terrain.ts:495`) | both exist, union at `base-field.ts:26-31` |
| Gravity / up     | `sphericalFrame` (`src/world/up.ts:88`)          | `flatFrame` (`up.ts:71`, `radiusAt → Infinity`)    | both exist                                 |
| Sea predicate    | `water-mesher.ts:111` (radial)                   | `water-mesher.ts:113` (`y - seaLevel`)             | **already branched**                       |
| In-sea predicate | `app.tsx:311`                                    | `app.tsx:312`                                      | **already branched**                       |
| Spawn            | `game.ts:499`                                    | `game.ts:526-533`                                  | **already branched**                       |
| `/player:space`  | `game.ts:499-508`                                | same site                                          | **already branched**                       |
| World bound      | `player.ts:556` (sphere)                         | same site (cube)                                   | **already branched**                       |
| Water normal     | `sphericalWater` (`water.ts:65`)                 | `flatWater` (`water.ts:70`)                        | both exist, **`flatWater` unreferenced**   |
| Water _mesher_   | ✓                                                | ✓                                                  | no change needed                           |

`mesh/water-mesher.ts` branching on `isPlanetField` is the precedent to follow for the rest
of the render layer: it is the same numbers read from the same union, so the two worlds
differ only in where a distance is measured from.

**The player's actual pain is a real bug this fixes.** `sculpt.terrainHeight`
(`src/sculpt.ts:205-214`) returns `undefined` for a planet, so `getHeightAt` falls back to
`0`, and `app.tsx:1296-1300` says every shipped demo authored against `getHeightAt(0, 0)`
built **135,000 units inside the ground** on a sphere. On a flat world the same call returns
a real height — the `"heightAt" in base` guard at `sculpt.ts:211` already does the right
thing once the base field is a terrain.

**What is genuinely missing is the render layer**, which has no flat counterpart at all:

- `src/world/sky.ts:569` — altitude is `cameraPosition.length()`.
- `src/render/atmosphere.ts:222-227` — the air column integrates a ray against a sphere.
- `src/world/clouds.ts:815-873`, `1196-1246`, `528-557` — two concentric spheres, solved
  **three times** term for term.
- `src/world/globe.ts` / `src/render/globe.ts` — a displaced sphere.

**And this resurrects a `?flat` flag that was deliberately deleted.** `app.tsx:171-184`
records why:

> The flag had a real cost that was easy to forget — a spherical frame with a sea at an
> altitude is an ocean at an infinite radius, and a flat frame with a sea radius is no ocean
> at all, because a flat frame's `radiusAt` is `Infinity`. Both are silent, and both would
> have been found by a player rather than by a test.

That trap is closed by construction now: the sea is always `seaLevelOf(spec)`, read off the
field (`base-field.ts:112-122`), so there is exactly one number and it cannot disagree with
the frame. `app.tsx:310-314` already reads it that way.

---

## Phase 1 — Extract the world constants (no behaviour change)

`app.tsx` has six module-scope constants built once at import:

| Constant          | Line   | Read from                                      |
| ----------------- | ------ | ---------------------------------------------- |
| `GAME_BASE_FIELD` | `:185` | `:846` (Session), `:290`                       |
| `GAME_LANDSCAPE`  | `:210` | `:227` (into `GAME_GROUND`)                    |
| `GAME_GROUND`     | `:227` | `:313` (`inSea`)                               |
| `GAME_FRAME`      | `:200` | `:311-312` (`inSea`), `:998` (`Game`)          |
| `GAME_SEA`        | `:290` | `:995`, `:1001`, `:1103`, `:1304`, `:2113`     |
| `GAME_WATER`      | `:245` | `:850` (Session), `:2070`, `:2088-89`, `:2127` |

New file `src/world/world-geometry.ts`:

```ts
export type WorldShape = "sphere" | "flat";

export interface WorldGeometry {
  readonly shape: WorldShape;
  readonly baseField: BaseFieldSpec;      // {kind:"planet"} | {kind:"terrain"}
  readonly frame: Frame;                  // sphericalFrame(O) | flatFrame
  readonly seaLevel: number;              // seaLevelOf(spec) — one number, always
  readonly landscape: BuiltBaseField;
  readonly ground: (x, y, z) => number;   // landscape.ground ?? landscape
  readonly water: WaterShape;             // sphericalWater | flatWater
  readonly reach: number;                 // for clouds / globe / fog
}

export const worldGeometry = (shape: WorldShape, seed: number): WorldGeometry => ...
export const worldShapeFromSearch = (): WorldShape => ...   // ?world=sphere|flat
```

`app.tsx` holds a mutable cell holding the current `WorldGeometry`; `inSea` (`:310-314`) reads
through it.

**`?world=flat` works at the end of this phase with no other change.** That is the point of
doing it first: phase 1 alone makes the feature reachable, and every later phase is a
refactor of something already exercised.

**Touches**

- New `src/world/world-geometry.ts` and `.test.ts`.
- `app.tsx:185-314` and its ~12 read sites.

**Tests**

- Both shapes' spec / frame / sea level / ground function.
- `seaLevelOf` agreement between the geometry and the spec it was built from.
- `worldShapeFromSearch` defaulting to `"sphere"`, and refusing nothing the URL cannot say.

---

## Phase 2 — Live rebuild

Four new seams, all small.

### `Session.setBaseField(spec)`

`baseFieldSpec` is `readonly` (`src/session.ts:185`). Relax it; the setter does what
`setOperations` (`session.ts:305-322`) does: bump the revision, `pool.setModel(modelMessage())`,
clear `inFlight`, `requestAll()`.

**Plus `Session.invalidateAll()`.** `invalidateBox` (`session.ts:352`) only covers a box, and
on a shape switch _every_ resident chunk's mesh is for the wrong world. The precedent is
`store.resize` (`session.ts:259`), which already invalidates every slot.

### `SculptSession.setBaseField(spec)`

`this.base` is assigned once in the constructor (`sculpt.ts:164`). Rebuild `this.base` and
`this.field = this.buildField()`. `terrainHeight` (`sculpt.ts:205`) then starts returning a
number on flat, for free.

### `Game.setWorld({ frame, centre, seaRadius, waterAt, spawnRadius })`

`GameWorld.frame` / `centre` (`game-world.ts:131-133`) and `Game.seaRadius` (`game.ts:166`)
are `readonly`. `GameWorld.getInWaterAt` (`game-world.ts:245-263`) and `Game.placeInSpace`
(`game.ts:486-512`) already branch correctly once the values move.

The player must be **respawned, not moved**. `createPlayer(position, config, frame)`
(`player.ts:253`) builds the basis from the frame, so a player carried across the switch
would lie on their side at the equator and upside down at the pole.

### Water material — the one hard blocker

`WaterMaterial.shape` is a `private readonly` constructor parameter property (`water.ts:119`),
read once per fragment at graph-construction time (`water.ts:142`). It is **not** a uniform
thunk, so it cannot be swapped by mutating a field, and `water.ts:44-52` deliberately
rejects a branch on `positionWorld`.

Two options:

1. Build both materials and swap `Session`'s `seaMaterial` (`session.ts:109`, `:213`).
   Needs `Session.setSeaMaterial`. **Recommended** — one extra compiled shader, paid
   lazily, and it keeps the file's stated design.
2. Move the shape behind a uniform. Rejected: `water.ts:44-52` argues the shape is a
   _property of the landscape_ rather than a branch on `positionWorld`.

### The switch itself

One `applyWorldGeometry(g)` in `app.tsx`, holding the whole switch in one place, called from
the console command and from `startPlace`. Then `fog.nearField`, `globe`, `clouds`, the
sky / fog radius uniforms, and `setPlanetBake` / `setCloudStatus`.

The frame loop's globe block (`app.tsx:2100-2128`) stays as it is — `globe` is already
`Globe | null` and every read is guarded (`:2100`, `:2165`).

**Tests**

- `Session.setBaseField` invalidates and re-requests.
- `Session.invalidateAll` reaches every slot.
- `SculptSession.setBaseField` makes `terrainHeight` defined on flat.
- `Game.setWorld` respawns the player upright on both frames.
- `GameWorld.getInWaterAt` for both values of `frame.spherical`.

---

## Phase 3 — The flat sky port

Three files, each already parameterised by `seaRadius`. The work is replacing a sphere solve
with a slab, and threading the real sea level in where it is currently hardcoded.

### Atmosphere — `src/render/atmosphere.ts`

`airMassNode` (`:212-243`) keeps lines 219-220, 228-232 and 241 **verbatim** — the segment
parameterisation and its length are shape-free. Replace:

- the sphere quadratic (`:222-227`) with a **slab** solve (`ray.y` against `seaLevel` and
  `seaLevel + ATMOSPHERE_HEIGHT`);
- the two Gauss-node altitudes (`:234`, `:236`) with `.y`.

Mirror it in `shellSpan` (`:102-121`) and `heightOf` (`:123-125`): `atmosphere.test.ts`
asserts the host and the shader agree term for term, and that oracle relationship is the
thing to preserve.

### Fog — `src/render/fog.ts`

Only `airMassNode` is sphere-specific. `apply`'s near term (`:163-169`) is a pure eye-distance.

Separately, and as a prerequisite: **`Fog.planetRadius` is `readonly` and defaults to 136000
in all three instances** (`water.ts:94`, `render/globe.ts:169`, `SurfaceMaterial`), and
`createSky(scene)` (`sky.ts:739`) takes no radius at all. None is ever given the real sea
level. Making those fields mutable (the uniforms are per-draw thunks, so it is free) and
threading `GAME_SEA` through fixes a latent bug today and is required for the flat port.

**One decision this surfaces:** `fog.nearField` is _only_ ever written from inside the
globe's `if` (`app.tsx:2125-2127`). With no globe it stays at `1` forever. That happens to
be right for a flat world's window fog, but it must be set deliberately rather than inherited.

### Sky — `src/world/sky.ts`

| Site       | Change                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `:569`     | `cameraPosition.length()` → `.y.sub(seaLevel)`. `eyeRadius` feeds only `:570` and `:582`.                                  |
| `:620-676` | **Delete the limb.** There is no silhouette to rim on a height field.                                                      |
| `:580-583` | `fromSpace` loses its only consumer (the limb). Its other consumer is `inSpace` at `:686`, which gates the stars.          |
| `:686`     | Redefine `inSpace` as `altitude > ATMOSPHERE_HEIGHT`, so a player above the air still gets stars.                          |
| `:585-591` | **Already flat-correct.** `raw.y` is the ray's elevation above world `+Y`, which on a flat world _is_ the local elevation. |
| `:451-457` | `planetRadius` / `atmosphereHeight` / `scaleHeight` are `readonly` — make them mutable, add `setWorld(seaLevel, flat)`.    |
| —          | Starfield, sun / moon discs and `elevationFade` are direction-only. No change.                                             |

### Clouds — `src/world/clouds.ts` + `cloud-layer.ts`

The heaviest item: **three term-for-term duplicate span solves** — `CloudMaterial`
(`:815-873`), `CheapCloudMaterial` (`:1196-1246`) and the host mirror `cloudSpan`
(`:528-557`). All become one slab solve, extracted so there are two implementations rather
than four. Three degeneracies to handle that the sphere version gets for free:

- `ray.y == 0` (grazing),
- looking down from above the layer,
- the eye being inside the layer.

| Site                                              | Change                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `heightAt` `:483-487`                             | `(world.y − seaLevel − CLOUD_BOTTOM) / CLOUD_THICKNESS`                                                                            |
| `shapeAt` `:464-469`, `shapeScale` `:218`, `:787` | planar `world.xz` frequency instead of a direction tiling                                                                          |
| `CLOUD_FEATURE` `:182`                            | `DEFAULT_PLANET_RADIUS * 0.12` — hardwired to 136000                                                                               |
| `CLOUD_BOTTOM` `:129`                             | `reachOf(DEFAULT_PLANET)`, the library default, not this world                                                                     |
| `driftAngleAt` `:498-499`, `spun` `:420-425`      | angular rotation → a planar offset in tile units                                                                                   |
| `warpOffset` `:582-583`                           | **Reverts** to `vec3(warp.x, warp.y, …)` — the comment at `:572-581` says `y` was freed _because_ `y` carries altitude on a sphere |
| `cloud-field.ts:1119-1148`                        | the cheap slice bake is an equirect grid through `directionAtEquirect`; needs a planar equivalent                                  |
| `MAX_DISTANCE` `:224`                             | **Stays, and becomes more load-bearing** — on a flat world it is the only thing terminating a grazing ray                          |

**The carrier sphere is fine on both worlds** (`cloud-layer.ts:85`): with the carrier
centred on the eye, `normalize(positionWorld − cameraPosition)` is pixel-invariant, and
`Side.BackSide` needs the camera inside. No change.

**`equirectUV` must move before anything else.** `render/globe.ts:144-150` is imported by
`clouds.ts:107`, `:437`, `:1258`. It is a shared mapping helper that happens to live in the
globe's file.

### Globe

Never call `createGlobe` on flat, and skip `bakePlanetMapsOffThread` (`app.tsx:1054-1058`)
entirely — that is **~5 seconds of noise for a 3072×1536 map** nobody will look at.
`setPlanetBake` feeds a HUD line that should say why.

### Day / night

Nothing. `day-night.ts` is already a world-`+Y`-up solar model.

**Tests**

- `airMassFlat` against a flat `airMassReference` oracle, mirroring the existing sphere
  relationship.
- Flat `cloudSpan` degenerate cases.
- `sky.setWorld` producing the same `atmosphere` value as the sphere version at sea level.

---

## Phase 4 — Per-place setting

**`manifest.json`**, alongside `seed` and `spawn` — the same class of fact, and read before
anything exists.

1. `place-file.ts` — `PLACE_WORLD_SHAPES`, `PlaceManifest.world?: WorldShape`, and the check
   in `isPlaceManifest` (`:210`). Unknown fields are already tolerated (`:204-208`), so this
   is **additive, not a format break**.
2. `place-record.ts` — **nothing**. `isPlaceRecord` (`:150-156`) re-uses `isPlaceManifest`,
   so published records ride along for free.
3. `project.ts` — `emptyPlaceProject` default; `projectFromRecord` (`:344-369`) must **not**
   rebuild the manifest field or it is silently dropped on a round-trip.
4. `create-place-editor.ts` — `setWorld()` beside `setSeed` / `setSpawn` (`:68-69`).
5. `PlaceEditor.tsx:144-161` — a control in the header next to name and seed.
6. `demos.ts` — `DemoPlace.world?`, exactly as `spawn` / `spawnAt` / `spawnLift` (`:77-113`).
7. `app.tsx` — `startPlace` gains a `world`. **This is the moment the repo's own reasoning
   flips**: `app.tsx:1326-1333` argues against an options object on a seven-argument
   function, and a per-place setting is the case that makes it break. **Convert `startPlace`
   to an options object** rather than adding an eighth positional parameter; all four call
   sites (`:1246`, `:1481`, `:1576`, `:1605`) are in one file.
8. `describePlace` (`:385-399`) — `/place:state` reports the loaded place's world, because
   "is this place all right" is what it is asked.

---

## Phase 5 — Console command

**`/planet:shape [sphere|flat]`** and **`/planet:state`** — two commands, which is what earns
the scope (ADR 0014: _"a subsystem earns a scope once two commands share it"_).

Shape follows `/cloud:quality` (`commands.ts:373-389`), **not** `/player:fly` (`:394-401`):
bare reports rather than flips, and anything but the two words is a usage line. `readToggle`
is for genuine booleans; this is a choice, and there is a wrong answer to it, so a silent
guess is worse than a refusal.

- `CommandsParams` gains a structural `planet: WorldCommands` beside `CloudCommands`
  (`commands.ts:190-205`) — the pattern that keeps the table testable against a three-line
  fake.
- `app.tsx:1618-1653` wires the adapter, with the `layer === null` guard idiom already used
  for the clouds.
- `commands.test.ts` — the hard-coded `/help` name list at `:129-148` **will fail** until
  updated; the refusal-loop and "nothing reached the game" assertions follow the
  `/cloud:quality fast|on|1` precedent at `:516-531`.

`/planet:shape` sets the console's world and the _default_ for the next place; a loaded
place's manifest wins over it, and `/planet:state` says which is in force.

---

## Phase 6 — Docs

**ADR 0050**, plus a row in `docs/adr/README.md`. It has to supersede the `?flat` removal
recorded in `app.tsx:171-184`, and partially extend:

- **0040** — the atmosphere is a shell and the clouds wrap the planet,
- **0042** — the cloud volume is addressed by direction _and_ altitude,
- **0039** — past a height the planet is a displaced globe, which simply does not fire on a
  flat world.

Worth carrying forward: **the lattice was never the spherical part.** ADR 0038 spent itself
proving the warped-cube lattice could not serve a planet this size (0041), and the shipped
answer turned out to be that the lattice is cubic in both worlds and only the field is a
sphere.

**Tests to update:** `place-file.test.ts`, `place-record.test.ts`, `project.test.ts`,
`load-place.test.ts`, `demos.test.ts`, `create-place-editor.test.ts`, `commands.test.ts`.
No new limits, so `limits.test.ts` should be untouched. `pnpm place-reference:check` is
unaffected — this adds no guest API.

---

## Risks

1. **The water material cannot be swapped.** `private readonly`, read at graph-construction
   time (`water.ts:119`, `:142`). The only hard blocker; costs one extra compiled material.
2. **The clouds are three duplicated solves.** The highest-risk item — a partial edit that
   compiles and draws the wrong span looks like a cloud bug, not a flat-world bug. Extract
   first, then branch.
3. **Four `Fog` / `SkyMaterial` instances hardcode `DEFAULT_PLANET_RADIUS`** and none is
   ever given the real sea level (`water.ts:94`, `render/globe.ts:169`, `SurfaceMaterial`,
   `sky.ts:471`). A latent bug today, and a prerequisite for the flat port.
4. **`app.tsx:2108`** computes the globe-fade altitude as `Math.hypot(...)`. Guarded by
   `globe !== null`, so it goes quiet rather than breaking — the failure mode `app.tsx:1048-1053`
   complains about elsewhere.
5. **A shape switch is not free.** Every resident chunk is invalidated and re-meshed. The
   command should say so rather than appear to hang.
