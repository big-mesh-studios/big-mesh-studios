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

**Sand**:
The dry block (`VOXEL_SAND`) a desert place paints over its terrain with a `surface` plan shape; it is an ordinary solid voxel drawn with the tile sheet's own sand tile, with no behaviour of its own. A place with no sand block still has one — it is in every world's block list — so a desert is a place that skims its terrain with sand, not a special kind of world.
_Avoid_: desert (that is the place, not the block), dirt (a different block)

**Obsidian**:
The near-black, violet-flecked block (`VOXEL_OBSIDIAN`) a **Portal** frame is built from; its tile is generated at load and injected onto the end of the sheet the way the wool colours are, because it is one block's look rather than a shipped drawing. An ordinary solid voxel a plan may paint, with no behaviour of its own.
_Avoid_: portal block (the block is not a portal), bedrock

**Sphere**:
The set of `WorldBlock`s the window keeps loaded: every chunk cell within `chunkRadius` (default 4) chunks of the player's cell horizontally and `chunkRadiusY` (default 2) chunks above and below it — a ball flattened in Y, since the terrain, its caves, and the clouds span only a couple of chunks of height and the full round ball's upper and lower caps were stone that cost fill, mesh, and draw time for nothing the player could see. (The name is a legacy of when the window was round in every axis.) When the player crosses a chunk boundary, cells that leave the ball are evicted and cells that enter teleport a freed slot to the leading cell and refill its `WorldBlock` in place (same slot, new data) rather than allocating a new one. Owned and managed by **ChunkSphere**.
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

**Superchunk**:
The merged geometry of one 2x2x2 group of `WorldBlock`s (`src/renderers/superchunk.ts`) — the six attribute arrays every member's vertices are joined into, each member's run of indices, how much of all of it the graphics card already holds, and the **GeometryPair** it uploads into. Members `join` it, are `replace`d when their voxels change, and `retire` when the window moves their slot to another cell; a replaced or retired member leaves vertices nothing should draw, which is what `owesRebuild` reports and what ADR 0034's free list is for. Knows nothing about where it sits or when it should merge: the region is a _superchunk cell_, addressed by the key `scKey` builds and measured by `scBounds`, and **TriangleRenderer** owns which cells have geometry, which are due, what a frame may upload, and what draws each member's run.
_Avoid_: SuperchunkGeometry (that is the **GeometryPair** it fills), merged arrays (the six growable arrays inside it), arena, superchunk region (say "superchunk cell")

**GeometryPair**:
The two `BufferGeometry` objects one **Superchunk** uploads into, one per draw pass: the opaque terrain and the translucent water. Pooled rather than made per superchunk, because the renderer keys its GPU buffers by geometry object — filling a pooled pair again refills the buffers it already has, and a pair the pool has no room for is disposed so the card gets those buffers back.
_Avoid_: superchunk geometry (ambiguous with **Superchunk** itself), mesh pair (a `Mesh` is what draws a range of one of these)

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
Synthesizes the weather's audio from the Web Audio API: a CC0 rain recording (`public/audio/rain.ogg`) and a CC0 thunder clap (`public/audio/thunder.ogg`), each falling back to procedural synthesis until/unless it loads, a looping wind layer that ramps with the storm intensity, and per-strike thunder delayed and attenuated by the strike's distance (`thunderTiming`). On top of the weather it plays the world's short recorded effects — the fixed vocabulary of `SFX_URLS` (`public/audio/*.ogg`): the mansion's `zombie-growl`, `zombie-die`, `wave-complete`, and `wave-eerie` (reached through the `sound` effect a place script dispatches, ADR 0053) and each weapon's `gun-<item id>` report (fired straight by the weapon block, not by any script). One-shots share the same context and master gain, decode lazily on `unlock`, and never duck or orchestrate the weather. The context is created lazily on the first pointer/key gesture (`unlock`), because browsers suspend audio until then; every method guards on it. Holds no renderer or console references — `WeatherController` reports strikes through its plain `onStrike(x, z)` callback, and `App.tsx` wires that to `sound.thunderStrike`; place-script sounds arrive on the `onSound` callback the console forwards. Exposes plain typed methods (`unlock`, `tick`, `thunderStrike`, `playSfx`, `setVolume`, `describe`, `dispose`).
_Avoid_: AudioManager, SFXPlayer (weather + a fixed effect vocabulary is not a general audio system; a place never names its own audio)

**EditLayer**:
The sparse, world-coordinate store of every voxel edit, keyed by absolute LOD-0 voxel coordinate and holding the new id plus an `updatedAt` timestamp. Terrain is noise-generated, so an edit makes sense only as a delta against that base — kept here (not in any `VoxelStore`) because `ChunkSphere` refills slots from noise and would erase a build the moment the player scrolls away. `FillClient` re-applies it to every freshly filled slot (`applyToBlock`), `EditingController` records into it, and `App.tsx` backs it with IndexedDB (`createEditPersistence`) and strands it to atproto. `snapshot()` is the single source fed to both persistences.
_Avoid_: EditStore, diff map (each entry is the new id + timestamp, not a before/after pair)

**EditingController**:
Turns a tool's targets into voxel edits: breaks the voxel it is given (adding what it yields to the **Inventory**) or places the voxel it is given into the cell against the targeted face (dirt placed with open air above grows grass on top), and pushes the result through the shared **EditLayer** into the containing block's store, notifying the renderer's `onBlockChanged` for the slot. Refuses to place inside the player or outside the loaded blocks. Also owns the CPU DDA voxel pick (`pickVoxel`) the tools aim with. A plain domain object exposing `breakBlock`, `placeBlock`, `pick`; it does not read which item is wielded, and has no idea a console or network exists.
_Avoid_: VoxelEditor, block tool (that's `BlockTool`, the thing that calls this)

**Inventory**:
How many of each item the player holds, keyed by string item id, plus which one is selected. Dirt (grass and dirt both break into a single dirt item) and the cloud blocks mined from the sky stack; the sword is carried exactly once and never consumed. Water isn't collectable. A tiny plain class with an `onChange` callback the hotbar HUD (`EditHud`) subscribes to. It knows nothing about what wielding an item does — that is its **Tool** — and nothing about voxels: an item id is its own thing, and a block item's voxel id lives on its tool.
_Avoid_: ItemStackSystem (it's a flat per-id count, not stack slots), voxel id (an item id is a separate space; the two meet only in `BREAK_YIELD` and in each `BlockTool`)

**Tool**:
What wielding one hotbar item means: what its crosshair looks for, what each of the two buttons does with what it finds, and how it is drawn in the hand. Every item resolves to one — a `BlockTool` closed over the voxel its slot places, which wraps **EditingController** for the mutation itself, or the `SwordTool` that strikes and guards. A tool picks its own **Target** and runs its own `update`, so a bow's draw and a pickaxe's hold-to-mine owe nothing to the sword's timing. Each is built once in `createVoxelscape` from the factory its `ITEMS` entry carries, against a `ToolContext` holding everything any tool acts on.
_Avoid_: Item (that's the inventory row a tool is reached through), weapon (a block tool is not one), ToolSystem

**Target**:
What the crosshair is over, as the wielded **Tool** found it: a monster, or a voxel, each with the distance along the look ray it was crossed at. A tool's pick carries one of these for the primary button and the cell a placement would fill for the secondary. The distance is what lets the sword compare its two picks and take the nearer, which is why a swing cannot land on a monster through a wall — block reach exceeds sword reach, so any wall in front of a reachable monster is itself the nearer pick.
_Avoid_: Pick (that's `pickVoxel`/`pickMonster`'s own result, which a target is built from), hit, inReach (the boolean this replaced meant either kind depending on the selection)

**Touch controls**:
What a coarse pointer gets in place of a mouse and keyboard: a joystick in the bottom-left that drives `setTouchMove`, and a cluster of circular **Action button**s in the bottom-right — dig, place/guard, jump, and use. The look area is camera-only, so a drag that turns the view never mines or builds, and the level editor's floating apply-and-toggle cluster over its canvas is the same idea. Laid out by `CoarseControls.tsx` and `level-editor/TouchControls.tsx`, each button drawing its glyph from `ui/icons.tsx`.
_Avoid_: D-pad (only the joystick is one), HUD (that is the crosshair and hotbar, drawn the same on every pointer)

**Gamepad controls**:
What a controller reporting the standard mapping drives, read by polling `navigator.getGamepads()` once a frame beside the input drain (`src/player/gamepad.ts`): the left stick moves, the right stick turns the view, A jumps, X or the right trigger digs, B uses, the left trigger places or raises a guard, and the horizontal d-pad steps the hotbar. A pad that reports any other mapping is ignored. Each button's held state is tracked per source, so releasing the controller never clears a hold the touch buttons or keyboard still have.
_Avoid_: joypad, game controller (the platform's own term is gamepad)

**Camera style**:
Which control drives the level editor's `editorCamera`: **Orbit**, the toolbox-style control that right-drag orbits and shift+right-drag pans with the cursor, or **NoClip**, the player's own `/player:no-clip` free flight run first-person, placing the active tool at the crosshair. Chosen from the Tools panel or `/place:level-editor-camera`; a coarse pointer opens in NoClip, a fine one in Orbit. The two are implementations of the `CameraControl` seam in `level-editor/camera/`.
_Avoid_: camera mode (that is first/third person, `/player:view`), orbit point (that is one control's focus, not the style)

**Action button**:
One circular control on the **Touch controls**, drawn with a centred icon. A held one reports a held state (`setTouchPrimary` repeats its strike on a cadence, `setTouchSecondary` raises a guard or places, `setTouchJump` climbs) and a tapped one fires an edge (`queueJump`, `queueUse`). It knows nothing about what a press means — it reports press and release, and the wielded **Tool** decides.
_Avoid_: Icon button (the icon is decoration, not the thing), key (that is the keyboard's own)

**Hand**:
The first-person view of what the player is holding: a ray-marched mesh per **Tool** that draws one, riding as children of the camera so they stay fixed to the lower right of the frame. Only the wielded tool's mesh is visible, sitting at whatever pose that tool returned; the hand keeps no timing of its own. Drawn only in first person. Its models and the hotbar icons come from the same items-spritesheet sprites, cropped to their drawn pixels by `sprite-model.ts`, which reports the crop it measured so the icon needs no second measurement.
_Avoid_: HeldItem (it holds every tool's mesh, not one item), weapon view

**PlayerHealth**:
The player's hit points, in the Ocarina-of-Time idiom of hearts: each heart holds two hit points (`HEART_HP`), and a hit that cuts through a heart leaves it half full — `heartStates` in `src/player/health.ts` turns hit points into the per-heart fills the HUD draws. A plain class with an optional change callback the hearts HUD subscribes to, like **Inventory** for the hotbar. It also owns the death sequence: a player whose hearts empty falls to the ground over `DEATH_FALL_SECONDS`, lies there for `DEATH_LIE_SECONDS`, then fires `onFallDone` so the app can stand them back up at spawn with full hearts — the same fall a zombie corpse plays, read through `fallProgress` so the camera can draw it (`deathCameraPose` in `src/player/player.ts`). A zombie's swing (`ZOMBIE_DAMAGE` in `src/monsters/zombie.ts`) is what empties the hearts, halved while the guard is up — a state of the player that a wielded tool raises, so a shield in a later off-hand would raise the same one.
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
The scene objects that render the monsters as ray-marched voxel figures: one group of part meshes per snapshot, all drawn from one bake of the zombie figure and wearing one set of **VoxelModelMaterial**s, walked in place when the monster is moving. Reads the **MonsterController**'s snapshots each frame (constructor-injected getter) rather than owning its own model, so a monster that appears or disappears in the snapshots gets a copy of the figure made or destroyed to match. A monster the local simulation stepped this frame is drawn exactly where it is; one received from an owner's broadcast is dead-reckoned between deliveries — extrapolated by its velocity, eased on small errors, snapped on large ones (`src/monsters/reckon.ts`). `applyLighting` feeds the day-night state into the shared materials each frame (they are self-lit), and `setFigure`/`loadModelFromBlob` swap the figure for one saved from rm-stacker, however many parts it comes in. Owns its scene objects directly, like **WeatherController**.
_Avoid_: MonsterRenderer (it doesn't render voxel terrain or a strategy — it's the monsters' meshes)

**VoxelModelMaterial**:
The ray-marched material an entity's voxel model is drawn with (`@big-mesh-studios/stacker/renderer`): a fragment shader that steps a 3D DDA through a packed voxel volume and shades the surface with a palette, writing accurate per-fragment depth so models occlude by their geometry. Works on a regular `Mesh` (positioned, rotated, scaled freely) and on an `InstancedMesh` at the identity; the app draws monsters as regular Meshes. Self-lit from `lightDir`/`lightColour`/`ambientColour` uniforms, which **RemoteMonsters.applyLighting** sets from the day-night state. The volume, palette, and grid size are baked in by the same package's `bakeVolume`; the model itself comes from a zip read by the package's `loadFigure`, which gives back a figure of one or several parts, one material to a part.
_Avoid_: DuckMaterial (the material is generic; a duck was its first demo), voxel shader (undersells that it owns the volume data and depth handling, not just a shader)

**ModelLibrary**:
The published drawings this world can wear (`src/atproto/models.ts`): the models somebody made in rm-stacker and published to their own atproto account, read through the public half of the protocol — a repository listing, a record fetched by the key its name makes, and the zip blob it points at. Needs no session and no account of this world's own, because none of those three calls does. `find` takes one model by the name it was published under, `list` says what an account has to offer, and `file` fetches the zip **RemoteMonsters** then reads. The record vocabulary comes from `@big-mesh-studios/stacker/lexicon`, so the editor writing these records and this reading them name the collection once between them.
_Avoid_: asset store (nothing here stores anything — it reads what somebody else published), model loader (that's the stacker package's `load`, which turns the zip into bitmaps)

**Probe**:
A chunk's flat-colour draw inside the occlusion pass: the same geometry the chunk draws on the world pass, under `OcclusionProbeMaterial`, which writes the slot's packed id as a constant colour instead of lighting, texture, or fog. Every terrain chunk's probe shares one material instance and every water chunk another (its `depthWrite` off, so translucent water never counts as an occluder), so the whole probe scene compiles exactly two programs. Drawn into a low-resolution offscreen target and read back, it is the question the occlusion pass asks the GPU.
_Avoid_: shadow, id render (it is the _question_; the readback is the answer), miniature (it is the same geometry at full detail, just drawn small)

**Occlusion query**:
One read of the **Probe** scene: a draw into a render target at (at most) one-eighth of the drawing buffer, the pixels read back, and the set of slots that won a pixel kept. Runs on a fixed frame interval, or immediately when the camera moves a superchunk's worth of world or turns its forward sharply.
_Avoid_: GPU occlusion query (this is a colour readback, not a `GL_ARB_occlusion_query` object), probe pass (that's the per-chunk draw; the readback is what answers)

**Motion**:
The path and spin a place script gives one **Scripted figure** — a **MotionSpec** of waypoints, a loop mode, a duration, and an optional spin. The **ScriptHost** stores the spec and the trusted side samples `poseAt` from the shared clock each frame, so the figure's position is a pure function of the spec and the clock rather than something the script steps. A **Solid platform** samples the same pose into its collision box and reports its velocity, so a player standing on it rides it.
_Avoid_: animation (that is a model's own drawn motion, a different thing), tween (the ease is one field of it, not the thing)

**Oscillation**:
A back-and-forth offset a **Motion** adds to its figure along an axis, over the shared clock — a bobbing lift, a swaying gate. Sampled as a sine, so it carries no state and every peer computes the same pose; its velocity reaches a player standing on a solid figure through the same surface seam a **Conveyor** uses.
_Avoid_: spring (that is one use of it), bounce (that implies collision)

**Seat**:
A **Scripted prop** marked `seat` that a player stands on and is turned to face, so a turntable, a boat, or a carriage carries a rider facing the way it faces. The rider is carried by the prop's surface velocity the way any moving platform carries them; only the heading is the seat's own.
_Avoid_: vehicle (a seat is a surface, not a simulation), chair (that is a model)

**Driven prop**:
A **Scripted prop** a place script moves itself each tick, setting the body's velocity alongside its placement (`PropHandle.move`'s `vx`/`vy`/`vz`) rather than following a **Motion** sampled from the clock. The host stores that velocity and reports it through the same pose read a motion's velocity comes from, so a player standing on the prop is carried by it. Its controls, collision, and fuel are the script's own code over the world queries; it is a car, a boat, or a cart built from a solid seat prop.
_Avoid_: vehicle (there is no engine body — a vehicle is one place's use of a driven prop), physics object (nothing integrates it but the script)

**Follow camera**:
A chase view a place script holds on a **Scripted figure** with `camera-follow`: how far behind and above the figure the eye sits, and how far ahead of it the view looks, sampled from the figure's live pose each frame until `camera-follow-clear`. Voice-tier and per-player, so every peer follows its own player's body.
_Avoid_: cutscene (that is a fixed sequence of shots, not a view held on a mover), seat view

**Figure animation**:
A model's own saved motion that a place script plays on a **Scripted figure** with `figure-animate`: the host stores the chosen motion's name, speed, and loop, and **VoxelFigures** poses the figure's parts at the frame the shared clock gives. The motion itself is the stacker format's, so voxel-rigger can author one and export it in the model zip; the figure only names it.
_Avoid_: Motion (that is the scripted path and spin of the whole figure, not its parts), tween

**Camera shake**:
How far a camera shot wobbles about its eye, named by a shot's `shake` and offset by the shared clock when the world plays it. Voice-tier and per-player, so it is never replicated and never affects another peer's view.
_Avoid_: screen shake (it moves the camera, not the drawn frame)

**Sound playback**:
The id, volume, pitch, and loop a place script gives a fixed-vocabulary `sound`, plus the `sound-stop` that reaches a loop by its id. The name is still one of the world's own; only how that name plays is a script's to say.
_Avoid_: audio emitter (there is no node graph to build), track

**Scripted light**:
A point light a place script places with `light`, standing where it was put or hanging over a **Scripted figure** it names by `entityId`. Drawn by one scene `PointLight` per light in **VoxelLights**, so there is no mesh — only the renderer's shading changes. Set by a `light` effect and put out by `light-remove`.
_Avoid_: fire (that is scenery that kindles a terrain voxel), lamp

**Billboard**:
A world-space label a place script shows with `billboard`: text drawn once onto a canvas, wrapped around a quad that faces the camera every frame, standing where it was put or hanging over a **Scripted figure**. Drawn by **VoxelBillboards**. Set by a `billboard` effect and taken down by `billboard-remove`.
_Avoid_: HUD readout (that is drawn in the page over the world, not in it), sign

**Particle emitter**:
A fan of billboard particles a place script runs with `particle`, naming one of the world's fixed **Particle kind**s and optionally overriding its colour, size, spread, or lifetime. Drawn by **VoxelParticles** from one shader whose uniforms a kind sets; a looping emitter keeps going, a one-shot burns out. Set by a `particle` effect and stopped by `particle-remove`.
_Avoid_: fire (that is scenery that kindles a terrain voxel), explosion (that is its own burst), sprite

**Particle kind**:
One of the looks a **Particle emitter** may name — `spark`, `flame`, `smoke`, `dust` — each a fixed set of defaults for colour, size, spread, lifetime, drift direction, and blend. A script overrides the numbers, never the look, so no place supplies a shader of its own.
_Avoid_: preset (it is the whole look, not a starting point), effect

**Dust storm**:
A wall or funnel of blowing dust a place script drives with `storm`, drawn by **VoxelStorm** from one billboard shader that samples a seamless fBm texture. The script sets where it stands, how it is turned and sized, and how thick its dust reads; dispatching it again with the same id moves it rather than restarting it. It is scenery the script positions, not the environment's **Weather**, and it carries no force of its own — a script that wants one to shove a player stands a **Field** with it. Set by a `storm` effect and taken away by `storm-remove`.
_Avoid_: weather storm (that is the environment schedule, not a placed thing), tornado (that is the `funnel` shape, one kind of it)

**Storm shape**:
One of the two looks a **Dust storm** may name — `wall` (a broad advancing front) or `funnel` (a tapering, spinning column) — each a fixed way of laying out its billboards. A script overrides the numbers, never the look, so no place supplies a shader of its own.
_Avoid_: kind (spell it shape), preset

**Decal**:
A flat mark a place script lays on the world with `decal`, one of a fixed set of shapes — `arrow`, `cross`, `ring`, `splat` — drawn on a canvas in the mark's colour and laid on a quad in the ground plane, turned by its yaw. Drawn by **VoxelDecals**; set by a `decal` effect and lifted by `decal-remove`.
_Avoid_: texture (that is an image on a model), paint

**Entity look**:
A tint and a fade a place script puts on one **Scripted figure** with `entity-look`: a colour the model's drawn colours are multiplied by, and the share of its opacity kept. Worn as a material set of its own, since the look is a uniform and the model's shared set carries every other figure; taken off with `entity-look-clear`. The hit flash still wins for its moment.
_Avoid_: skin (that is the model and palette a figure wears), material (that is the renderer's object, which the look sets)

**Beam**:
A straight glowing line a place script draws with `beam` between two ends, each either a world point or a **Scripted figure** the line follows. Drawn as one wide segment in world units by **VoxelBeams**; set by a `beam` effect and taken down by `beam-remove`.
_Avoid_: trail (a beam is one segment, not a curve behind a mover), laser (that is one use of a beam)

**Place data**:
What a place remembers between runs: a value saved for one player or for everyone, read with `getData`, written with `data-set`, and ranked across players by `getDataLeaderboard`. Held in memory so a script reads it inside a step, and persisted as a whole behind a storage seam; a write is a `data-changed` fact every peer folds, so a save and a leaderboard converge.
_Avoid_: save file (it is a flat table of values, not a document), local storage (that is one backing for it)

**Synced place data**:
A place's data with a durable table behind the in-memory one: the player's own values are read from their atproto repository (`app.bms.voxelscape.data`, one record per place) before the script starts, and written back after a change, while the page's own storage stays the local cache. A value the table does not hold is asked for with `data-get`, answered by a `data-loaded` fact. Global values have no single owner, so they stay local.
_Avoid_: cloud save (it is the table's backing, not a separate store), account data

**Account data**:
A place's data scope for values that belong to the signed-in player and to no one place, read with `getData("account", ...)` and written with `data-set`. Kept in one fixed record (`app.bms.voxelscape.account`, key `self`) in the player's repository, so a value saved in one place is there in the next; a **Teleport** may name keys to carry into it.
_Avoid_: global data (that is one value everyone shares), inventory (that is one use of account data)

**Badge**:
A named thing a player has earned, awarded with `badge-award` and remembered as that player's place data under `badge:<name>`; folding it is announced to every peer as a `badge-earned` fact.
_Avoid_: achievement (a presentation of it), trophy

**Teleport**:
What a place script does with `teleport`: sends one player to another place, named as a published place's `at://` address or a built-in demo. Only the local player's browser is moved, and only to an address this world's own router can open; the peers left behind hear a `player-teleported` fact.
_Avoid_: portal (that is a script's prop and zone around it), redirect (it stays inside this application)

**Worn player model**:
A place model a player wears in place of the plain cube, set by `player-model` and drawn by the same figure renderer an NPC's model is. The cube stays the body the physics and camera use and is hidden while a model is worn, so a worn model is cosmetic. A player's pick travels to peers as a `player-model` mesh message, and is remembered through **Account data** / **Place data** so it survives a join.
_Avoid_: avatar (that is the whole cube-plus-camera object), skin (that is the cube's material)

**Scripted UI panel**:
An overlay a place script shows one player with `ui-panel` — a box docked to a screen corner holding **UI item**s in the order the script set them. Voice-tier, like a **HUD readout**: shown to one player and never shared. Drawn by `ScriptUi` from the world's `ui` accessor.
_Avoid_: GUI (too general), menu (one use of a panel)

**UI item**:
One label, bar, button, or item-sprite image inside a **Scripted UI panel**, set by `ui-label`/`ui-bar`/`ui-button`/`ui-image` and taken off by `ui-remove`. A button carries a value, and a player's press arrives as a `ui-clicked` fact.
_Avoid_: widget, control
An NPC or prop a place script has placed, as the **ScriptHost** holds it: where it stands, how it faces, what model it wears, and the **Motion** it follows if any. The **VoxelFigures** renderer draws whatever the current figures are each frame, placing each at its posed feet.
_Avoid_: entity (that is the monsters' word), actor

**World query**:
A read-only function a place script calls to ask the running world a question — the block underfoot, a figure's live pose, whoever stands in a box, what a ray first meets. Answers are pure functions of the shared clock and the replicated state, returned in id order, so every peer's script reads the same world at the same moment. Answered for its own figures by the **ScriptHost** and for terrain and players by the world.
_Avoid_: getter, inspector (undersells that the answers are deterministic), API (the whole surface, not one read)

**Entity tag**:
A short name on a **Scripted figure** — `"enemy"`, `"boss"`, `"door"` — so a script can find a set of figures by what they are rather than by their deterministic id. Carried on the `npc`/`prop` effects and changed later with `entity-set`; read back by a **World query** such as `getEntitiesWithTag`.
_Avoid_: group, class (that is an object model this API does not have)

**Entity attribute**:
A named value — string, number, or boolean — a place script hangs on a **Scripted figure** under a key, such as `health` or `awake`. Bounded and flat, so it serialises identically for every peer; written with `entity-set` and read from an **Entity snapshot**.
_Avoid_: property (that is the general instance model this API avoids), metadata

**Scripted block edit**:
A voxel change a place script asks for during play, set with a `block-set`, `block-fill`, or `block-clear` effect and bounded in volume and coordinates. It travels the same **EditingController** path a player's own edit does — overlay record, mesh, light, save, and peer broadcast — so a scripted change persists and reconciles exactly as a dug one. Distinct from `onPlan`, which builds the place's terrain once before the first fill.
_Avoid_: terrain write, world edit (both name the player's edit too)

**Path**:
A walkable route a place script asks the world for with `findPath`, returned as world-unit waypoints at voxel-cell centres, searched deterministically so every peer gets the same one. `NpcHandle.walkTo` turns a path into one `once` **Motion**, so the world samples the walk rather than the script stepping it.
_Avoid_: navmesh (there is no baked graph), waypoint list (that is what a path is made of)

**Team**:
A side a place script defines with `team-define` and puts a player on with `player-team`, read back on the player a **World query** returns. Derived state: every peer computes the same assignment from the same facts and writes it locally, so no fact is authored for it.
_Avoid_: faction, group (that is an **Entity tag**)

**Player value**:
A flat, finite number a place script keeps per player under a key with `player-value`, ranked across players by `getLeaderboard` and shown by `showLeaderboard` through the existing **HUD readout**. Derived state, like a **Team**.
_Avoid_: score (one use of a value), stat

**Input binding**:
A key code a place script listens on, named by `bind`; the input layer reports every down and up edge on that key as an `input` fact carrying the binding's id and the player who pressed it, in addition to whatever the key already does.
_Avoid_: hotkey (that is the world's own selection), keymap

**Local input**:
The local player's live movement and tool state a place script reads with `getInput` — the forward/back and strafe axes, whether jump is held, the look delta, the button edges, and the touch dig button's held state — so it can drive something itself. Only the peer's own player has one; another player's input reaches a script as a fact, never as a read.
_Avoid_: input state (too general), controls

**Player prompt**:
A labelled interaction a place script stands on a figure with `prompt`, answered when the player uses that figure: the host authors `prompt-triggered` instead of `entity-used`, and the prompt's verb is what the crosshair hint shows.
_Avoid_: dialog (that is the conversation tree), tooltip

**Voxelscape module**:
A place script's one reserved import, `import { onTick, dispatch, createNpc, createProp, ... } from "voxelscape"` — every function `quickjs-sandbox.ts` binds (`dispatch`/`onTick`/`onPlan`/`log`/`heightAt`/and the rest) alongside `createNpc`/`createProp` for placing or moving an NPC or prop wearing one of the place's own attached models. Resolved by the bundler itself (`bundle.ts`) to one synthetic module, not a TypeScript ambient-module trick; that module reaches the sandbox's real host object through its own internal-only import, never a specifier a project file's own source ever names. `createNpc`/`createProp` take the model's bare name as a plain string option, checked at the type level against `ModelsByName` — a per-place augmentation the editor's language service generates live from a model's own bytes (`model-dts.ts`), literal unions of its actual part and motion names — and resolved at run time against every model the place actually attaches, an unknown name throwing the moment the call runs rather than at bundle time.
_Avoid_: engine (the retired second reserved specifier this folded into itself — a script no longer imports anything by that name, only `"voxelscape"`), model import (an earlier, since-retired mechanism — a bare `with { type: "model" }` import typed nothing at the call site, only at the specifier), scripted-figures (a parked, never-merged library name this also folded into)

**Guest math**:
The small value types and helpers the `"voxelscape"` module ships to a place script — `Vector3`, `Vector2`, `Color3`, `clamp`, `lerp`, `smoothstep`, `randint`, `randFloat`, `choice`. Ordinary guest code compiled into the synthetic module, so a value never crosses the sandbox boundary and a `randint` draws from the place's seeded stream.
_Avoid_: library (it is part of the one reserved module), engine math

**NPC handle**:
The object `createNpc` hands back to a place script: where it stands, faces, the model it wears, and `.move()`/`.remove()`/`.die()` to update or end it, each dispatching the "npc"/"npc-remove"/"npc-die" effects itself. `id` is never generated inside `createNpc` — every peer replaying the same script must compute the exact same one independently, so it always comes from the script's own deterministic address, the way the Zombies demo derives one from its population seed and spawn cell. Owns only where the figure stands and dispatching its placement — a script's own bookkeeping (health, AI state, and the rest) stays the script's own.
_Avoid_: ScriptedNpc (the retired class-based name — `createNpc` is a plain factory function returning a plain object, never something a script constructs with `new`), wrapper (undersells that it dispatches for real, not just formats JSON)

**Prop handle**:
`createProp`'s counterpart to an **NPC handle** — dispatching "prop"/"prop-remove" instead, which carries solidity, whether it is a hazard, and a conveyor's surface velocity, none of which an NPC has.
_Avoid_: ScriptedProp (same reasoning as **NPC handle**)

**Cutscene**:
A list of camera shots a place script plays for one player: where the view goes, what it looks at, and how long each move and hold lasts. It is voice-tier — the world's camera director samples it and returns the view to the player when the shots end — and while one runs the player's movement and tools are taken away.
_Avoid_: cinematic, camera path (the sequence is shots, not one curve)

**Checkpoint**:
Where a player is put back on their feet after dying, set by a `player-checkpoint` effect in feet coordinates and remembered by the world until the place restarts. It is local to one player, like a **Cutscene**, not shared state.
_Avoid_: spawn (that is the place's own start, which a checkpoint replaces), save point

**Hazard**:
A scripted prop marked to report when a player's cube first overlaps it, as a `player-touched` fact. The world draws no conclusion from the touch; what it means is the script's rule.
_Avoid_: damage volume, kill brick (a hazard need not kill or even be solid)

**Kill plane**:
A height a place script sets with a `void` effect; a player whose feet fall below it is killed and returned to their **Checkpoint**. It is how a fall off a high course ends before it reaches the ground.
_Avoid_: void (the effect's tag, not the thing), death floor

**HUD readout**:
A typed value a place script shows to one player over the world — a bar with a value and a maximum, or a line of text — set by a `hud` effect and taken away by `hud-remove`. It is voice-tier, and its value changes only when the script says so.
_Avoid_: widget, overlay (that is the DOM layer it is drawn in)

**Field**:
A box in feet coordinates a place script fills with one movement behaviour: a **push** carries the player toward a target velocity (`vx`/`vz`/`vy`, any subset), a **quicksand** slows their walk and caps their sink. The world's trusted side samples the field standing at the player's centre once a frame (`mediumAt`), so the horizontal and vertical physics agree on what acts on them; overlapping fields compose, with pushes summed and the worst quicksand taking the walk. Set by a `field` effect and taken away by `field-remove`. Authorable but never carveable: fields are scripted, not voxels.
_Avoid_: fan, wind tunnel (those are one script's story about a push, not the thing), zone (a zone is a prop's touch-in region; a Field is a whole volume)

**Quicksand**:
A **Field** kind that slows the player's walking toward a `speedScale` (down to zero) and clamps how fast they sink at all (`sink`). It changes how the player moves under their own power rather than pushing them, which is why it composes with (and keeps its grip against) an overlapping push.
_Avoid_: mire, sludge (that's another script's dressing), water (water is swim physics — drag, swim up, buoyancy — not a Field)

**Conveyor**:
A sideways surface velocity a place script sets on a **Scripted prop** (`{ vx, vz }` on the `prop` payload): the standing surface carries the player's feet with that speed the way a moving **Solid platform** does, while the prop itself stays where it was placed. Mutually exclusive with the prop's own **Motion**. The player physics never knows the floor is a conveyor — it only ever reads the surface velocity, the same seam a platform rides on.
_Avoid_: moving floor (a platform moves its own box; a Conveyor moves only what stands on it), belt (that's the drawn dressing of one)

**Barrier**:
A box in world units (`min` to `max`, like a **Field**) a place script stands that only the player's body collides with: its box is added to the player's solids the same way a solid **Scripted prop**'s box is, and nothing else — no NPC, no bullet, nothing script-steered — ever hits it. Drawn nothing, so it reads as an open gap the player still cannot walk through: the wall a window that only the horde uses turns out to be. Set by a `barrier` effect and taken away by `barrier-remove`; a script author says in world units which route a player may or may not take, and the arena's own inhabitants walk straight past it.
_Avoid_: invisible wall (that's a presentation of one region a Barrier closes, not the thing), force field (a Field pushes; a Barrier only blocks), portal (a door is a prop)

**Place catalog**:
The search over published places a player enters one from, opened by a script's `catalog` effect or by the player's own `B` key and drawn by `PlacesBrowser` over the world's `catalog` accessor. Named an account by handle or DID it starts the search on that account's own places (`PlaceLibrary.list`); named none it answers every place on the network (`PlaceLibrary.listAll`) — read from the public relay's directory of which accounts hold one, then from each of those accounts, up to what one listing can afford in accounts, places, weight, and time, and paged in the overlay. Either way a row shows the place by its name, the account that published it, its mode, and how many scripts it ships; choosing one routes to it the way a **Teleport** does. Every place is discoverable because it was published, not because anything listed it.
_Avoid_: portal (that is the Lobby's doorway to a demo), browser (that is the atom — this is the whole search), teleport (that is the routing behind a pick), registry (nothing is registered; publishing is the whole claim)

**Place clock**:
The moment every peer in a place reads a script's `now` from: the wall-clock time of the lowest DID among the players in the place, offset-corrected per player by a one-round-trip time exchange over their link to that peer. Every peer derives the same timekeeper from the same roster by the same total rule — no election, no broadcast, ADR 0045 — and falls back to the local wall clock while alone, offline, or before a measurement lands. Scripts' **Motion**, timers, and cutscenes run off it, so a **Solid platform** a player stands on moves the same way for every peer.
_Avoid_: shared/world clock (that's the day-night clock **DayNightController** owns and a different thing), server time (there is no server)

**Portal**:
A walk-in doorway the Lobby builds from the world into a built-in demo: a one-voxel-thick frame of **Obsidian** with a walk-through hole, filled by a **Rift** and labelled with the demo's name overhead. A zone reaching a player who stands in the hole has the script **Teleport** that player to the demo; the frame is scenery, the **Rift** is its surface, the zone is its touch region, and the routing behind it is the same **Teleport** every place uses.
_Avoid_: gateway, mirror (that would echo the world back, not carry a player to a demo), door (the frame is voxels, not a Barrier), nether portal (that is one look a Portal wears)

**Rift**:
A flat, translucent, animated sheet a place script stands in the world with `rift` — the surface a **Portal** shows. Its colour churns across the sheet on the shared clock, swirling about its centre the way a nether portal does; a script sizes it, turns it, tints it, and says how fast it turns, never what the churn is made of. Drawn by `VoxelRifts` from one shader that samples the same seamless fBm texture the dust storms use; set by a `rift` effect and taken down by `rift-remove`.
_Avoid_: portal (that is the doorway a Rift fills), portal frame (that is the **Obsidian** around it)

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
- **EditingController** is how blocks move between the world and the **Inventory**: breaking adds and placing consumes, both driven by the `BlockTool` that passes it the voxel.
- Every hotbar item resolves to a **Tool**, and the frame loop calls `pick`, whichever button fired, and `update` on whatever is wielded — it never asks which item that is.
- A **Tool** picks its own **Target** once a frame, and the same pick is handed to the button actions, so the crosshair and the button can never disagree and a dig raycasts the world once.
- **Hand** draws the wielded **Tool**'s model at the pose that tool returned; the swing's timing belongs to the tool, not to the hand.
- Item ids and voxel ids are separate spaces meeting in exactly two places, the only two operations that cross between the world and the hand: `BREAK_YIELD` translates a broken voxel into the item it yields, and each `BlockTool` translates its item back into the voxel it places.
- A `SwordTool` swing reports its hit the way the frame loop used to: **MonsterController** applies the damage when this client owns the monster, and **MultiplayerController** broadcasts it to the owner when it does not.
- **RemoteMonsters** reads the **MonsterController**'s snapshot map each frame (constructor-injected getter), so the controller stays renderer-free and the meshes track whatever it simulates.
- **RemoteMonsters** is fed the same day-night state the renderers get, through `applyLighting`, because its **VoxelModelMaterial** is self-lit.
- What the monsters are drawn as is chosen at startup, in `createVoxelscape`, nearest source first: the zip at `public/models/zombie.zip` this site serves, then the model the world's model account published under `zombie` through the **ModelLibrary**, which replaces it once it arrives. Until the first of those lands there is no model, and a monster is not drawn — the material marches an empty volume to a miss. `/monsters:model` swaps it for any account's afterwards, and `/monsters:file` for a zip on this device; both arrive at `RemoteMonsters.loadModelFromBlob`.
- **MonsterController** broadcasts its owned monsters through the mesh via the **MultiplayerController** (`broadcastMonsters`), wired to its `onBroadcast` callback in `App.tsx`; a peer's monsters arrive through `onRemoteMonsters` and `applyMonsterUpdates` — the same optimistic-path separation the edit overlay already uses. Its durable records are written and fetched by **MonsterSync**, wired through `recordsForPersistence`/`markPersisted` and `mergeFromAtproto`.
- A zombie's swing lands on the player it attacks: the **MonsterController** reports it through `onHitPlayer` (the attacked player's DID and the damage), and the app applies it to the local **PlayerHealth** or broadcasts it over the mesh for the hit peer's client to apply — the zombie's owner and the hurt player's client are each authoritative over their own part, as with sword damage (ADR 0013).
- A **Probe** never hides a chunk the **Occlusion query** has not measured, and the chunks near the player's own cell are always drawn, so geometry that lands mid-interval or sits beside the camera never flickers out between queries.
- A **Scripted figure**'s **Motion** is a pure function of its spec and the shared clock, so every peer computes the same pose without the pose being replicated; a solid figure's pose reaches the player's physics through the collision box and its velocity.
- An **NPC handle**/**Prop handle** is how a script actually places the **Scripted figure** the **ScriptHost** ends up holding — it dispatches the same effects a script could write by hand, built from a model name checked against the place's own attached models through the **Voxelscape module**.
- A **Cutscene** and a **HUD readout** are voice-tier: the world samples them for one player and never shares them, the way it already treats narration and player placement.
- A **Hazard** reports a touch and stops there; the script decides whether the touch is a death, and a `player-kill` death is authored as a fact the rules fold over.
- A **Field** pushes and grips through the same `mediumAt` seam the way the world already hands the player ground and air; the script says where the air behaves, the physics resolves it.
- A **Conveyor** reaches the player's feet through the same surface velocity that carries them on a moving **Solid platform**, so a conveyed prop needs no physics state of its own.
- A **Place clock** is what one player's scripts and **Motion** sample: it is the lowest DID's wall time, so every peer's deadlines and platform poses agree without a single pose or deadline being replicated (ADR 0045).
- A **Portal**'s zone reaches a **Teleport** the same way a prop's own touch region reaches a script's use rule, and a pick in the **Place catalog** routes like a cloud one, so the Lobby's doorways and the arcade's list are the two faces of the same navigation.
- A **Portal** is an **Obsidian** frame around a **Rift**: the frame is ordinary voxels the plan paints and the player's body meets, while the **Rift** is a scripted sheet that carries nothing — so the doorway is walked through, not collided with.

## Example dialogue

> **Dev:** "Right after the sphere scrolls, is the triangle geometry already correct?"
> **Domain expert:** "Not necessarily — the `TriangleRenderer` queues its mesh rebuilds, and a superchunk waits for its members before it uploads, so there can be a brief pop-in as it catches up. That is the cost of drawing the world one way: nothing else can show the block meanwhile."

> **Dev:** "Why doesn't `DayNightController` just call the renderer's `applyLighting` itself from inside `tick`? It would save a line in `App.tsx`."
> **Domain expert:** "Same reason `ChunkSphere` doesn't hold a renderer reference — `DayNightController` shouldn't need to know a renderer exists to do its job. `App.tsx` is where those two get wired together."

## Flagged ambiguities

- "tool" once meant the non-stackable items an `Inventory` held — the sword, as a thing carried — while a **Tool** is what wielding any item does, blocks included. That record is gone; the word now means only the latter.
- "cull" now covers two different hides: the frustum deferral of ADR 0022 (geometry never merged/uploaded) and the occlusion hide (geometry merged and uploaded, but not drawn between **Occlusion query**s). Say which one a sentence means rather than leaning on the single word.
- "renderer" was once used loosely for both a rendering strategy and the subsystem picking between two of them — resolved by there being one renderer, **TriangleRenderer**, which the word now means without ambiguity.
