# bms-voxelscape

A browser voxel-world renderer/game: an infinite scrolling ball of procedurally generated terrain blocks, viewable through two interchangeable rendering strategies.

## Language

**WorldBlock**:
One chunk of the world — a voxel volume of fixed world extent (128 world units per axis), whose resolution is set by its level of detail: `VOXEL_SIZE=2` world units per voxel at LOD 0, doubling each level, so a block holds a 64³, 32³, or 16³ voxel volume (`VoxelStore`). Shared by both renderers; owned by neither. Blocks stack in every axis. Defined in `src/level-data.ts`.
_Avoid_: Chunk, block (ambiguous with voxel), region

**VoxelStore**:
The `WorldBlock`'s CPU voxel data (`store.data`), laid out with a 1-voxel meshing border on every face (`VOXEL_PADDING`): the interior is the volume, and the border carries the voxels the neighbouring `WorldBlock`s will contain, generated deterministically from the same world-coordinate terrain function during the fill — including the top/bottom border rows that duplicate vertically-stacked neighbours' boundary rows. `get`/`set` address the interior only; the border is consumed solely by the mesh builders (`atPadded` with any axis from `-1..n`) so seam faces are culled without ever reading another block's store — no stale-neighbour races and no worker shells.
_Avoid_: Chunk data, padded store (the border lives in the same `data` array, not a separate buffer)

**Cloud Block**:
The white voxel (`VOXEL_CLOUD`) the fill scatters through the cloud band centred on `FILL_CLOUD_Y`, sampled from a seeded 3D Perlin field (`world/cloud-fill.ts`), so the clouds are deterministic per world and tile over the noise's lattice period. Solid to the player — it is the secret floor they can stand on — but skipped by the ground-height samplers, so spawn, monster and weather heights still read the terrain; it breaks into a Cloud inventory item like any collectable block.
_Avoid_: sky block

**Sphere**:
The set of `WorldBlock`s the window keeps loaded: every chunk cell within `chunkRadius` (default 4) euclidean chunks of the player's cell, centred on the player in every axis. When the player crosses a chunk boundary, cells that leave the ball are evicted and cells that enter teleport a freed slot to the leading cell and refill its `WorldBlock` in place (same slot, new data) rather than allocating a new one. Owned and managed by **ChunkSphere**.
_Avoid_: Chunk grid, world grid (the sphere's per-slot integer coordinates are an internal `ChunkSphere` implementation detail — don't confuse with **Sphere** itself)

**ChunkSphere**:
The class that owns the **Sphere**: builds its block pool at startup (each `WorldBlock` built directly, on the main thread), keeps it centred on the player (`scrollTo`), and requests fresh terrain data for each cell a scroll reveals from a **FillClient** (built synchronously at startup, asked for asynchronously afterwards), asking for each cell at the level of detail its distance from the player earns (`lodAt`): full resolution within three chunks, one level coarser in the shell out to four, and coarsest beyond. A cell that stays in the ball but crosses a level-of-detail ring is refilled in place at the new resolution, so terrain the player walks toward sheds its coarse voxels before it comes into view. Each request also carries the six neighbours' voxel sizes (`borderSizesOf`), so a block's seam border culls against a neighbour built at a different level of detail. Every entering cell — the player's included — streams in through the worker pool, ordered nearest-first so the player's cell is asked for first; the composer holds the player's physics (`cellReady`) until that cell's fill lands. The grid coordinates are its private windowing state; nothing else needs them, because seam culling uses each block's own generated **VoxelStore** border rather than reading neighbours. Exposes `query`, a **BlockQuery** that resolves a world point to the block owning its voxel in O(1), and `slotAt`, the slot for that cell.
_Avoid_: Terrain streamer, chunk manager

**FillClient**:
Generates a `WorldBlock`'s procedural voxel data and derived GPU level layout on request, using a pool of Web Workers when available and falling back to generating synchronously (on the caller's thread) when none is. A scroll's entering shell is split round-robin across the pool, so the terrain the player walks toward is generated on several threads at once. Tags each request with a per-slot generation counter, so a result that arrives after its slot has been requested again is dropped rather than overwriting newer data. Owned by **ChunkSphere**, which is its only caller.
_Avoid_: Fill worker (that's the underlying Web Worker `FillClient` wraps, not `FillClient` itself)

**TriangleRenderer**:
The one way a `WorldBlock` is drawn: its visible voxel faces meshed into real triangle geometry (culled-face meshing, built off the main thread by a worker) and rasterized normally. Geometry is drawn per **superchunk** — a 2x2x2 group of blocks (128³ voxels, 256³ world units): each block is still built alone (with its generated border, so internal seam faces are culled), then the block meshes are re-origined and concatenated into one mesh pair per superchunk, so 8 chunks cost one draw call instead of 8. The merged geometry is uploaded only once a superchunk's meshing members all land (a six-frame stall backstop forces a partial upload), so a scroll's shell of chunks costs a handful of uploads rather than one per landed chunk. Merges are viewport-culled: a dirty superchunk whose cell box misses the camera's frustum stays dirty and merges the frame the camera turns onto it, so the merge+upload cost of a scroll tracks what the player actually looks at (three.js already culls the draw calls the same way). Mesh rebuilds are queued and drained as the frame budget allows, so a block whose voxels just changed shows the change once its geometry has caught up. Seam faces are culled against the block's own generated **VoxelStore** border, so the worker never reads a neighbour's data. Owns its meshes, materials, the underwater tint, and the triangle count the console reports. Exposes plain typed methods — it has no idea a console exists; see **Commander**.
_Avoid_: Renderer (too generic), mesh renderer, tri renderer, BlockRenderer (there is no interface — there is one renderer)

**DayNightController**:
Owns applying the pure `dayNightState` cycle (`src/day-night.ts`) to the scene: the sun/ambient lights, the sun/moon billboards, and the clock itself (`elapsed`/override/speed). `tick(dt, camera)` advances the clock, updates its own lights and billboards, and returns the computed `DayNightState` for the caller to also feed into **TriangleRenderer**'s `applyLighting` — it does not hold a reference to the renderer, the same one-directional dependency `ChunkSphere` already has. Exposes plain typed methods (`jumpTo(seconds)`, `clearOverride()`, `setSpeed(multiplier)`, `describe()`); like the renderer, has no idea a console exists.
_Avoid_: SkyController (undersells that it also owns the clock, not just lights/billboards)

**Commander**:
The single place every console command is declared: one object literal, keyed by command name — `/scope:command` for a subsystem two or more commands reach (`/clock:speed`, `/render:resolution`), flat for the ones that stand alone (`/weather`, `/fullscreen`); a scope is named for what the player has rather than what the code is built on, which is why the atproto commands are `/account:*` — built once in `App.tsx` after every command-owning object (`DayNightController`, **TriangleRenderer**) already exists. Each entry's `run` closure does its own raw-argument parsing/validation/aliasing and calls a plain typed method on the owning object — the owning objects themselves stay ignorant that a console exists. Chosen over a `register()`-call-per-owner pattern specifically because TypeScript rejects a duplicate key in an object literal as a compile error, catching a command-name collision at typecheck time; a `register()` pattern (or a plain object literal decided at runtime some other way) only catches it — if at all — when the colliding code actually executes.
_Avoid_: CommandRegistry, command registry (implies the rejected `register()`-call pattern)

**Weather**:
A rare-storm state machine over `"clear" | "rain" | "thunder" | "snow"`, keyed to the day-night clock's shown seconds (not wall-clock), so `/clock:speed` advances weather at the same rate as the sun and `/clock:day` pins it. Storms are rare (mean gap of five day-night cycles), rain being the common kind; thunder adds lightning strikes to the rain. The pure functions (`weatherAt`, `applyWeather`, `weatherLighting`) are unit-tested in `weather.ts`; `WeatherController` is what applies them to the scene.
_Avoid_: WeatherSystem, climate (overbroad), storm tracker

**WeatherController**:
Owns the weather's scene objects — the rain and snow particle systems (billboard quads whose per-particle attributes are baked once; all motion happens in the vertex shader via a time uniform, no per-frame vertex reallocation), the thunder `Line2` lightning bolts, and the strike flash — plus the intensity ramp. `tick(dt, camera, clockSeconds)` advances everything and returns `{ weather, intensity }`; like `DayNightController` it holds no renderer reference, and `App.tsx` composes its result into the day-night state via `applyWeather`. Exposes plain typed methods (`setWeather`, `describe`); has no idea a console exists.
_Avoid_: SkyController (that's `DayNightController`'s job), particle manager

**SoundController**:
Synthesizes the weather's audio from the Web Audio API: a CC0 rain recording (`public/audio/rain.ogg`) and a CC0 thunder clap (`public/audio/thunder.ogg`), each falling back to procedural synthesis until/unless it loads, a looping wind layer that ramps with the storm intensity, and per-strike thunder delayed and attenuated by the strike's distance (`thunderTiming`). The context is created lazily on the first pointer/key gesture (`unlock`), because browsers suspend audio until then; every method guards on it. Holds no renderer or console references — `WeatherController` reports strikes through its plain `onStrike(x, z)` callback, and `App.tsx` wires that to `sound.thunderStrike`. Exposes plain typed methods (`unlock`, `tick`, `thunderStrike`, `setVolume`, `describe`, `dispose`).
_Avoid_: AudioManager, SFXPlayer (it's weather-specific procedural synthesis, not a general audio system)

**EditLayer**:
The sparse, world-coordinate store of every voxel edit, keyed by absolute LOD-0 voxel coordinate and holding the new id plus an `updatedAt` timestamp. Terrain is noise-generated, so an edit makes sense only as a delta against that base — kept here (not in any `VoxelStore`) because `ChunkSphere` refills slots from noise and would erase a build the moment the player scrolls away. `FillClient` re-applies it to every freshly filled slot (`applyToBlock`), `EditingController` records into it, and `App.tsx` backs it with IndexedDB (`createEditPersistence`) and strands it to atproto. `snapshot()` is the single source fed to both persistences.
_Avoid_: EditStore, diff map (each entry is the new id + timestamp, not a before/after pair)

**EditingController**:
Turns crosshair actions into voxel edits: consumes a CPU DDA voxel pick (`pickVoxel`) computed from the camera look direction, breaks a reachable collectable voxel (adding it to the **Inventory**) or places the selected block into the adjacent cell (dirt placed with open air above grows grass on top), and pushes the result through the shared **EditLayer** into the containing block's store, notifying the renderer's `onBlockChanged` for the slot. Refuses to break the world floor or place inside the player. A plain domain object exposing `breakBlock`, `placeBlock`, `pick`; has no idea a console or network exists.
_Avoid_: VoxelEditor, block tool (undersells that it also owns inventory handoff, not just voxel mutation)

**Inventory**:
How many of each placeable block the player holds — dirt (grass and dirt both break into a single dirt item) and the cloud blocks mined from the sky — plus which block is selected for placement. Water isn't collectable. A tiny plain class with an `onChange` callback the hotbar HUD (`EditHud`) subscribes to; `EditingController.breakBlock` adds and `placeBlock` consumes.
_Avoid_: ItemStackSystem (it's a flat per-id count, not stack slots)

**PlayerHealth**:
The player's hit points, in the Ocarina-of-Time idiom of hearts: each heart holds two hit points (`HEART_HP`), and a hit that cuts through a heart leaves it half full — `heartStates` in `src/player/health.ts` turns hit points into the per-heart fills the HUD draws. A plain class with an optional change callback the hearts HUD subscribes to, like **Inventory** for the hotbar. It also owns the death sequence: a player whose hearts empty falls to the ground over `DEATH_FALL_SECONDS`, lies there for `DEATH_LIE_SECONDS`, then fires `onFallDone` so the app can stand them back up at spawn with full hearts — the same fall a zombie corpse plays, read through `fallProgress` so the camera can draw it (`deathCameraPose` in `src/player/player.ts`). A zombie's swing (`ZOMBIE_DAMAGE` in `src/monsters/zombie.ts`) is what empties the hearts.
_Avoid_: Healthbar, HP (each unit of health is a half-heart, and the HUD draws hearts, not a bar)

**PlayerSkin**:
The material a player cube is drawn with, local player and remote peer alike: one small canvas repeated over all six faces, holding the cube's assigned colour until the account's profile picture arrives (`setPicture`) and the picture from then on. The canvas feeds `MeshStandardMaterial`'s colour slot rather than replacing the material, so a player still takes the world's light instead of glowing flat at midnight, and a picture that arrives late is painted into the canvas the cube already samples — nothing swaps the texture out, because a renderer frees a texture only when the renderer itself goes away.
_Avoid_: Avatar (that's the local player's whole cube-plus-camera object, `PlayerAvatar`), texture (it's the material and the canvas behind it, not just the image)

**AtprotoController**:
Owns the atproto/Bluesky connection and the edit-chunk sync. Configures atcute's OAuth client (loopback client for localhost dev, hosted `client-metadata.json` for prod, see `src/atproto/oauth.ts`), drives the OAuth popup (`connect`), restores/revokes the session, and on `sync` uploads the **EditLayer**'s recent edits as `app.bms.voxelscape.edit` records (32³ chunks, `src/atproto/edits.ts`) then fetches the whole collection and merges it back with per-voxel last-write-wins. Also the one place identities are resolved: a DID's document (cached per session) gives the PDS endpoint a peer's records are read from, `resolveHandle` gives the confirmed handle the multiplayer mesh labels that peer's avatar with, and `resolvePicture` gives the bytes of the picture their account shows for itself, read from that same server as the **PlayerSkin** on their cube. Exposes plain typed methods (`init`, `connect`, `sync`, `signOut`, `resolveHandle`, `describe`); wired to the shared `EditLayer` in `App.tsx`, no renderer or console knowledge.
_Avoid_: PDSClient, BlueskyConnector (it's specifically the edit-sync + OAuth owner, not a general atproto client)

**Monster**:
A simulated creature — currently only a zombie — with a deterministic identity and spawn. Every monster that can exist is addressed by the terrain seed and a (cell, slot) pair (`monsterId`, `monsterAt` in `src/monsters/monster.ts`), so any client agrees on which monster is which without a shared server; only some addresses hold a monster, at a configured density. A monster is a snapshot: pose (cube centre plus heading and horizontal velocity), health, and a `sleep | wander | chase | attack` state with the wander/attack timers that state carries. It exists only while its spawn cell is within a player's materialization window; phase 1 forgets it otherwise (later phases persist it).
_Avoid_: NPC, mob (a **Monster** is any simulated creature; a **Zombie** is the first kind)

**MonsterController**:
Owns the local simulation of monsters: materializes the spawn cells around the players (from the terrain queries and the player positions it is handed), chooses each monster's owner (the nearest player, ties broken by DID and kept through a hysteresis margin, so every client picks the same owner and it doesn't ping-pong), steps the monsters this client owns through their brains (`stepZombie` in `src/monsters/zombie.ts`), broadcasts those states on the pose cadence, applies the broadcasts it receives for monsters it does not own, and merges the durable atproto records into the same map (last-write-wins by producing clock, ties by owner DID). A plain domain object — no renderer, network, or console knowledge — that exposes its snapshot map, `mergeFromAtproto`, `recordsForPersistence`/`markPersisted`, and a `describe()` for the debug console. `src/monsters/remote-monsters.ts` renders whatever is in that map.
_Avoid_: MobController, monster system (undersells that it both spawns and steps the simulation)

**MonsterSync**:
The atproto persistence for monsters: writes the records this client's **MonsterController** says are due (one record per monster it owns, rkey = the monster id) and discovers every repo holding a monster record through the relay, fetching each and merging it into the controller. Started and stopped with the atproto session, alongside the multiplayer mesh; the records it writes are the source of truth behind the WebRTC broadcasts.
_Avoid_: monster syncer (there is no other kind), atproto monster uploader (it also discovers and merges, not just uploads)

**RemoteMonsters**:
The scene objects that render the monsters as ray-marched voxel models: one mesh per snapshot, all sharing one **VoxelModelMaterial** and geometry baked from the zombie model, walked in place when the monster is moving. Reads the **MonsterController**'s snapshots each frame (constructor-injected getter) rather than owning its own model, so a monster that appears or disappears in the snapshots gets a mesh made or destroyed to match. A monster the local simulation stepped this frame is drawn exactly where it is; one received from an owner's broadcast is dead-reckoned between deliveries — extrapolated by its velocity, eased on small errors, snapped on large ones (`src/monsters/reckon.ts`). `applyLighting` feeds the day-night state into the shared material each frame (the material is self-lit), and `setModel`/`loadModelFromBlob` swap the model for one saved from rm-stacker. Owns its scene objects directly, like **WeatherController**.
_Avoid_: MonsterRenderer (it doesn't render voxel terrain or a strategy — it's the monsters' meshes)

**VoxelModelMaterial**:
The ray-marched material an entity's voxel model is drawn with (`@big-mesh-studios/stacker/renderer`): a fragment shader that steps a 3D DDA through a packed voxel volume and shades the surface with a palette, writing accurate per-fragment depth so models occlude by their geometry. Works on a regular `Mesh` (positioned, rotated, scaled freely) and on an `InstancedMesh` at the identity; the app draws monsters as regular Meshes. Self-lit from `lightDir`/`lightColour`/`ambientColour` uniforms, which **RemoteMonsters.applyLighting** sets from the day-night state. The volume, palette, and grid size are baked in by the same package's `solveVoxels`/`encodePalette`; the model itself comes from a zip read by the package's `load`.
_Avoid_: DuckMaterial (the material is generic; a duck was its first demo), voxel shader (undersells that it owns the volume data and depth handling, not just a shader)

**ModelLibrary**:
The published drawings this world can wear (`src/atproto/models.ts`): the models somebody made in rm-stacker and published to their own atproto account, read through the public half of the protocol — a repository listing, a record fetched by the key its name makes, and the zip blob it points at. Needs no session and no account of this world's own, because none of those three calls does. `find` takes one model by the name it was published under, `list` says what an account has to offer, and `file` fetches the zip **RemoteMonsters** then reads. The record vocabulary comes from `@big-mesh-studios/stacker/lexicon`, so the editor writing these records and this reading them name the collection once between them.
_Avoid_: asset store (nothing here stores anything — it reads what somebody else published), model loader (that's the stacker package's `load`, which turns the zip into bitmaps)

## Relationships

- A **Sphere** holds a fixed-size ball of **WorldBlock**s, indexed by pool slot.
- A **WorldBlock** is drawn by the **TriangleRenderer**, which meshes it.
- **ChunkSphere** owns the **Sphere** and reports changes to it (via callbacks); the **TriangleRenderer** is one such callback consumer, not something **ChunkSphere** depends on directly.
- **ChunkSphere** is **FillClient**'s only caller; **FillClient** doesn't know a **Sphere** or **ChunkSphere** exists, only the blocks and indices it's asked to fill.
- Block seam faces are culled against each block's own generated **VoxelStore** border, so the **TriangleRenderer**'s mesh worker never reads another block's store (and no block needs re-meshing when a neighbour's data later changes).
- The **TriangleRenderer** merges each group of 2x2x2 blocks into one superchunk geometry, so a scroll that refills a shell of chunks redraws a handful of superchunk meshes rather than one per chunk.
- **DayNightController** and **TriangleRenderer** each expose plain domain methods and know nothing about the console; **Commander** is the only thing that knows console command names, aliases, or help text exist.
- **WeatherController** is keyed to the day-night clock's shown seconds, which `DayNightController.tick` returns via `DayNightState.elapsed`; **App.tsx** composes the weather's `{ weather, intensity }` into the day-night state (`applyWeather`) before feeding it to the renderer's `applyLighting` — the same one-directional wiring `DayNightController` already has.
- **WeatherController** reports lightning strikes through its plain `onStrike(x, z)` callback; **SoundController** is one such consumer (wired in `App.tsx` to `sound.thunderStrike`), not something **WeatherController** depends on.
- **EditLayer** is the single source of truth for voxel edits, keyed by world voxel (not slot); **FillClient**, **EditingController**, **AtprotoController**, and IndexedDB persistence all read or write it.
- **EditingController** is wired to the renderer in `App.tsx` (its `onBlockEdited` calls the renderer's `onBlockChanged`); it holds no renderer reference itself.
- **EditingController** is how blocks move between the world and the **Inventory**: breaking adds, placing consumes, selection drives `placeBlock`.
- **RemoteMonsters** reads the **MonsterController**'s snapshot map each frame (constructor-injected getter), so the controller stays renderer-free and the meshes track whatever it simulates.
- **RemoteMonsters** is fed the same day-night state the renderers get, through `applyLighting`, because its **VoxelModelMaterial** is self-lit.
- What the monsters are drawn as is chosen at startup, in `createVoxelscape`, nearest source first: the zip at `public/models/zombie.zip` this site serves, then the model the world's model account published under `zombie` through the **ModelLibrary**, which replaces it once it arrives. Until the first of those lands there is no model, and a monster is not drawn — the material marches an empty volume to a miss. `/monsters:model` swaps it for any account's afterwards, and `/monsters:file` for a zip on this device; both arrive at `RemoteMonsters.loadModelFromBlob`.
- **MonsterController** broadcasts its owned monsters through the mesh via the **MultiplayerController** (`broadcastMonsters`), wired to its `onBroadcast` callback in `App.tsx`; a peer's monsters arrive through `onRemoteMonsters` and `applyMonsterUpdates` — the same optimistic-path separation the edit overlay already uses. Its durable records are written and fetched by **MonsterSync**, wired through `recordsForPersistence`/`markPersisted` and `mergeFromAtproto`.
- A zombie's swing lands on the player it attacks: the **MonsterController** reports it through `onHitPlayer` (the attacked player's DID and the damage), and the app applies it to the local **PlayerHealth** or broadcasts it over the mesh for the hit peer's client to apply — the zombie's owner and the hurt player's client are each authoritative over their own part, as with sword damage (ADR 0013).

## Example dialogue

> **Dev:** "Right after the sphere scrolls, is the triangle geometry already correct?"
> **Domain expert:** "Not necessarily — the `TriangleRenderer` queues its mesh rebuilds, and a superchunk waits for its members before it uploads, so there can be a brief pop-in as it catches up. That is the cost of drawing the world one way: nothing else can show the block meanwhile."

> **Dev:** "Why doesn't `DayNightController` just call the renderer's `applyLighting` itself from inside `tick`? It would save a line in `App.tsx`."
> **Domain expert:** "Same reason `ChunkSphere` doesn't hold a renderer reference — `DayNightController` shouldn't need to know a renderer exists to do its job. `App.tsx` is where those two get wired together."

## Flagged ambiguities

- "renderer" was once used loosely for both a rendering strategy and the subsystem picking between two of them — resolved by there being one renderer, **TriangleRenderer**, which the word now means without ambiguity.
