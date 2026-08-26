# bms-voxelscape

A browser voxel-world renderer/game: an infinite scrolling grid of procedurally generated terrain blocks, viewable through two interchangeable rendering strategies.

## Language

**WorldBlock**:
One chunk of the world — a fixed-size voxel volume (192x256x192 voxels) with its own voxel data (`VoxelStore`) and GPU texture (`Level`). Shared by both renderers; owned by neither. Defined in `src/level-data.ts`.
_Avoid_: Chunk, block (ambiguous with voxel), region

**VoxelStore**:
The `WorldBlock`'s CPU voxel data (`store.data`), laid out with a 1-voxel meshing border on each horizontal side (`VOXEL_PADDING`): the interior is the volume, and the border carries the voxels the neighbouring `WorldBlock`s will contain, generated deterministically from the same world-coordinate terrain function during the fill. `get`/`set`/`sweepSurface` address the interior only; the border is consumed solely by **TriangleRenderer**'s mesh builders (`atPadded` with `x`/`z` from `-1..nx`/`-1..nz`) so seam faces are culled without ever reading another block's store — no stale-neighbour races and no worker shells.
_Avoid_: Chunk data, padded store (the border lives in the same `data` array, not a separate buffer)

**Ring**:
The `BLOCKS x BLOCKS` (5x5) window of `WorldBlock`s kept centred on the player. When the player crosses a block boundary, the trailing row/column of the ring teleports to the leading edge and refills its `WorldBlock` in place (same slot, new data) rather than allocating a new one. Owned and managed by **WorldRing**.
_Avoid_: Chunk grid, world grid (the ring's per-slot integer coordinates are an internal `WorldRing` implementation detail — don't confuse with **Ring** itself)

**WorldRing**:
The class that owns the **Ring**: builds it synchronously at startup (each `WorldBlock` built directly, on the main thread), keeps it centred on the player (`scrollToPlayer`, `stepRing`), and requests fresh terrain data for each block a scroll reveals from a **FillClient** (mirrors the sync-vs-async split documented for **RaymarchRenderer** vs **TriangleRenderer**). The grid coordinates are its private windowing state (`BlockGrid.worldGrid`); nothing else needs them, because seam culling uses each block's own generated **VoxelStore** border rather than reading neighbours.
_Avoid_: Terrain streamer, chunk manager

**FillClient**:
Generates a `WorldBlock`'s procedural voxel data and derived GPU level layout on request, using a Web Worker when available and falling back to generating it synchronously (on the caller's thread) when the worker is unavailable or errors. Tags each request with a per-slot generation counter, so a result that arrives after its slot has been requested again is dropped rather than overwriting newer data. Owned by **WorldRing**, which is its only caller.
_Avoid_: Fill worker (that's the underlying Web Worker `FillClient` wraps, not `FillClient` itself)

**BlockRenderer**:
The interface both rendering strategies implement: given the ring's `WorldBlock`s, draw them. Exposes lifecycle hooks for visibility, per-block data changes, per-frame lighting (always applied, even when inactive, so the hidden renderer is ready for an instant toggle), and per-frame active-only work (e.g. draining a mesh-build queue).
_Avoid_: Renderer (too generic — always name the specific one)

**RaymarchRenderer**:
A `BlockRenderer` that ray-marches a DDA voxel traversal per-fragment against each `WorldBlock`'s 3D GPU texture, run inside a real bounding-box mesh per block. Cheap to keep in sync with voxel data (a texture upload), since there's no geometry to rebuild.
_Avoid_: Raytracer (it's a voxel raymarcher, not a general raytracer), ray renderer

**TriangleRenderer**:
A `BlockRenderer` that meshes each `WorldBlock`'s visible voxel faces into real triangle geometry (culled-face meshing, built off the main thread by a worker) and rasterizes it normally. Expensive to keep in sync — mesh rebuilds are queued and only drained while this renderer is active, so switching into it after a while away shows a brief catch-up pop-in by design. Seam faces are culled against the block's own generated **VoxelStore** border, so the worker never reads a neighbour's data.
_Avoid_: Mesh renderer, tri renderer

**RendererSwitch**:
The coordinator owning both `BlockRenderer` instances and the active `"ray" | "tri"` mode. Fans `applyLighting` out to both renderers unconditionally every frame; routes `tick` (active-only work) to whichever is active. Exposes plain typed methods (`setMode`, `mode`, `triangleCount`) — it has no idea a console exists; see **Commander**.
_Avoid_: rendererMode (that's the mode value it holds, not the coordinator itself)

**DayNightController**:
Owns applying the pure `dayNightState` cycle (`src/day-night.ts`) to the scene: the sun/ambient lights, the sun/moon billboards, and the clock itself (`elapsed`/override/speed). `tick(dt, camera)` advances the clock, updates its own lights and billboards, and returns the computed `DayNightState` for the caller to also feed into `RendererSwitch.applyLighting` — it does not hold a reference to `RendererSwitch`, the same one-directional dependency `WorldRing` already has. Exposes plain typed methods (`jumpTo(seconds)`, `clearOverride()`, `setSpeed(multiplier)`, `describe()`); like `RendererSwitch`, has no idea a console exists.
_Avoid_: SkyController (undersells that it also owns the clock, not just lights/billboards)

**Commander**:
The single place every console command is declared: one object literal, keyed by command name, built once in `App.tsx` after every command-owning object (`DayNightController`, `RendererSwitch`) already exists. Each entry's `run` closure does its own raw-argument parsing/validation/aliasing (e.g. `/renderer`'s `"mesh"`/`"triangles"` aliases for `"tri"`) and calls a plain typed method on the owning object — the owning objects themselves stay ignorant that a console exists. Chosen over a `register()`-call-per-owner pattern specifically because TypeScript rejects a duplicate key in an object literal as a compile error, catching a command-name collision at typecheck time; a `register()` pattern (or a plain object literal decided at runtime some other way) only catches it — if at all — when the colliding code actually executes.
_Avoid_: CommandRegistry, command registry (implies the rejected `register()`-call pattern)

**Weather**:
A rare-storm state machine over `"clear" | "rain" | "thunder" | "snow"`, keyed to the day-night clock's shown seconds (not wall-clock), so `/speed` advances weather at the same rate as the sun and `/day` pins it. Storms are rare (mean gap of five day-night cycles), rain being the common kind; thunder adds lightning strikes to the rain. The pure functions (`weatherAt`, `applyWeather`, `weatherLighting`) are unit-tested in `weather.ts`; `WeatherController` is what applies them to the scene.
_Avoid_: WeatherSystem, climate (overbroad), storm tracker

**WeatherController**:
Owns the weather's scene objects — the rain and snow particle systems (billboard quads whose per-particle attributes are baked once; all motion happens in the vertex shader via a time uniform, no per-frame vertex reallocation), the thunder `Line2` lightning bolts, and the strike flash — plus the intensity ramp. `tick(dt, camera, clockSeconds)` advances everything and returns `{ weather, intensity }`; like `DayNightController` it holds no `RendererSwitch` reference, and `App.tsx` composes its result into the day-night state via `applyWeather`. Exposes plain typed methods (`setWeather`, `describe`); has no idea a console exists.
_Avoid_: SkyController (that's `DayNightController`'s job), particle manager

**SoundController**:
Synthesizes the weather's audio from the Web Audio API: a CC0 rain recording (`public/audio/rain.ogg`) and a CC0 thunder clap (`public/audio/thunder.ogg`), each falling back to procedural synthesis until/unless it loads, a looping wind layer that ramps with the storm intensity, and per-strike thunder delayed and attenuated by the strike's distance (`thunderTiming`). The context is created lazily on the first pointer/key gesture (`unlock`), because browsers suspend audio until then; every method guards on it. Holds no renderer or console references — `WeatherController` reports strikes through its plain `onStrike(x, z)` callback, and `App.tsx` wires that to `sound.thunderStrike`. Exposes plain typed methods (`unlock`, `tick`, `thunderStrike`, `setVolume`, `describe`, `dispose`).
_Avoid_: AudioManager, SFXPlayer (it's weather-specific procedural synthesis, not a general audio system)

**EditLayer**:
The sparse, world-coordinate store of every voxel edit, keyed by absolute LOD-0 voxel coordinate and holding the new id plus an `updatedAt` timestamp. Terrain is noise-generated, so an edit makes sense only as a delta against that base — kept here (not in any `VoxelStore`) because `WorldRing` refills slots from noise and would erase a build the moment the player scrolls away. `FillClient` re-applies it to every freshly filled slot (`applyToBlock`), `EditingController` records into it, and `App.tsx` backs it with IndexedDB (`createEditPersistence`) and strands it to atproto. `snapshot()` is the single source fed to both persistences.
_Avoid_: EditStore, diff map (each entry is the new id + timestamp, not a before/after pair)

**EditingController**:
Turns crosshair actions into voxel edits: consumes a CPU DDA voxel pick (`pickVoxel`) computed from the camera look direction, breaks a reachable collectable voxel (adding it to the **Inventory**) or places the selected block into the adjacent cell (dirt placed with open air above grows grass on top), and pushes the result through the shared **EditLayer** into the containing block's store + GPU level, notifying `RendererSwitch.onBlockChanged` for the slot. Refuses to break the world floor or place inside the player. A plain domain object exposing `breakBlock`, `placeBlock`, `pick`; has no idea a console or network exists.
_Avoid_: VoxelEditor, block tool (undersells that it also owns inventory handoff, not just voxel mutation)

**Inventory**:
How many Dirt blocks the player holds (grass and dirt both break into a single dirt item; water isn't collectable), plus which block is selected for placement. A tiny plain class with an `onChange` callback the hotbar HUD (`EditHud`) subscribes to; `EditingController.breakBlock` adds and `placeBlock` consumes.
_Avoid_: ItemStackSystem (it's a flat per-id count, not stack slots)

**PlayerSkin**:
The material a player cube is drawn with, local player and remote peer alike: one small canvas repeated over all six faces, holding the cube's assigned colour until the account's profile picture arrives (`setPicture`) and the picture from then on. The canvas feeds `MeshStandardMaterial`'s colour slot rather than replacing the material, so a player still takes the world's light instead of glowing flat at midnight, and a picture that arrives late is painted into the canvas the cube already samples — nothing swaps the texture out, because a renderer frees a texture only when the renderer itself goes away.
_Avoid_: Avatar (that's the local player's whole cube-plus-camera object, `PlayerAvatar`), texture (it's the material and the canvas behind it, not just the image)

**AtprotoController**:
Owns the atproto/Bluesky connection and the edit-chunk sync. Configures atcute's OAuth client (loopback client for localhost dev, hosted `client-metadata.json` for prod, see `src/atproto/oauth.ts`), drives the OAuth popup (`connect`), restores/revokes the session, and on `sync` uploads the **EditLayer**'s recent edits as `app.bms.voxelscape.edit` records (32³ chunks, `src/atproto/edits.ts`) then fetches the whole collection and merges it back with per-voxel last-write-wins. Also the one place identities are resolved: a DID's document (cached per session) gives the PDS endpoint a peer's records are read from, `resolveHandle` gives the confirmed handle the multiplayer mesh labels that peer's avatar with, and `resolvePicture` gives the bytes of the picture their account shows for itself, read from that same server as the **PlayerSkin** on their cube. Exposes plain typed methods (`init`, `connect`, `sync`, `signOut`, `resolveHandle`, `describe`); wired to the shared `EditLayer` in `App.tsx`, no renderer or console knowledge.
_Avoid_: PDSClient, BlueskyConnector (it's specifically the edit-sync + OAuth owner, not a general atproto client)

## Relationships

- A **Ring** holds a fixed-size window of **WorldBlock**s, indexed by ring slot.
- A **WorldBlock** is rendered by both a **RaymarchRenderer** and a **TriangleRenderer** at all times; only one is visible, chosen by the **RendererSwitch**.
- The **RendererSwitch** calls `applyLighting` on both renderers every frame regardless of which is active, but calls `tick` only on the active one.
- **WorldRing** owns the **Ring** and reports changes to it (via callbacks); **RendererSwitch** is one such callback consumer, not something **WorldRing** depends on directly.
- **WorldRing** is **FillClient**'s only caller; **FillClient** doesn't know a **Ring** or **WorldRing** exists, only the blocks and indices it's asked to fill.
- Block seam faces are culled against each block's own generated **VoxelStore** border, so the **TriangleRenderer**'s mesh worker never reads another block's store (and no block needs re-meshing when a neighbour's data later changes).
- **DayNightController** and **RendererSwitch** each expose plain domain methods and know nothing about the console; **Commander** is the only thing that knows console command names, aliases, or help text exist.
- **WeatherController** is keyed to the day-night clock's shown seconds, which `DayNightController.tick` returns via `DayNightState.elapsed`; **App.tsx** composes the weather's `{ weather, intensity }` into the day-night state (`applyWeather`) before feeding it to `RendererSwitch.applyLighting` — the same one-directional wiring `DayNightController` already has.
- **WeatherController** reports lightning strikes through its plain `onStrike(x, z)` callback; **SoundController** is one such consumer (wired in `App.tsx` to `sound.thunderStrike`), not something **WeatherController** depends on.
- **EditLayer** is the single source of truth for voxel edits, keyed by world voxel (not slot); **FillClient**, **EditingController**, **AtprotoController**, and IndexedDB persistence all read or write it.
- **EditingController** is wired to the renderers in `App.tsx` (its `onBlockEdited` calls `RendererSwitch.onBlockChanged`); it holds no renderer reference itself.
- **EditingController** is how blocks move between the world and the **Inventory**: breaking adds, placing consumes, selection drives `placeBlock`.

## Example dialogue

> **Dev:** "If I switch to `tri` mode right after the ring scrolls, will the triangle geometry already be correct?"
> **Domain expert:** "Not necessarily — the `TriangleRenderer` only drains its mesh-build queue while it's the active renderer, so there can be a brief pop-in as it catches up. The `RaymarchRenderer` doesn't have this problem because syncing its GPU texture is cheap enough to do unconditionally, every time a `WorldBlock`'s data changes."

> **Dev:** "Why doesn't `DayNightController` just call `rendererSwitch.applyLighting` itself from inside `tick`? It would save a line in `App.tsx`."
> **Domain expert:** "Same reason `WorldRing` doesn't hold a `RendererSwitch` reference — `DayNightController` shouldn't need to know renderers exist to do its job. `App.tsx` is where those two get wired together."

## Flagged ambiguities

- "renderer" was used loosely for both "the active rendering strategy" and "the whole dual-renderer subsystem" — resolved: **BlockRenderer** names the strategy interface/implementations, **RendererSwitch** names the subsystem that picks between them.
