# bms-voxelscape

A browser voxel-world renderer/game: an infinite scrolling grid of procedurally generated terrain blocks, viewable through two interchangeable rendering strategies.

## Language

**WorldBlock**:
One chunk of the world — a fixed-size voxel volume (192x256x192 voxels) with its own voxel data (`VoxelStore`) and GPU texture (`Level`). Shared by both renderers; owned by neither. Defined in `src/level-data.ts`.
_Avoid_: Chunk, block (ambiguous with voxel), region

**Ring**:
The `BLOCKS x BLOCKS` (5x5) window of `WorldBlock`s kept centred on the player. When the player crosses a block boundary, the trailing row/column of the ring teleports to the leading edge and refills its `WorldBlock` in place (same slot, new data) rather than allocating a new one. Owned and managed by **WorldRing**.
_Avoid_: Chunk grid, world grid (the ring's per-slot integer coordinates are an internal `WorldRing` implementation detail — never exposed as a raw array, only through `lookupBlock`/`gridCoordAt` — don't confuse with **Ring** itself)

**WorldRing**:
The class that owns the **Ring**: populates it at startup (synchronously, on the main thread), keeps it centred on the player (`scrollToPlayer`, `stepRing`), and gets fresh terrain data into each `WorldBlock` as it scrolls — synchronously at startup, but off the main thread via a fill worker for every scroll after that (mirrors the sync-vs-async split documented for **RaymarchRenderer** vs **TriangleRenderer**). Knows nothing about rendering: it reports block changes and repositions via injected callbacks rather than holding a reference to `RendererSwitch`, the same one-directional dependency `RendererSwitch` already has on ring data. Exposes exactly three things: `blocks` (all current `WorldBlock`s), `lookupBlock(gx, gz)` (the block at a grid coordinate, if any), and `gridCoordAt(index)` (a slot's own grid coordinate — needed by `TriangleRenderer` to resolve its neighbours for cross-block face culling).
_Avoid_: Terrain streamer, chunk manager

**BlockRenderer**:
The interface both rendering strategies implement: given the ring's `WorldBlock`s, draw them. Exposes lifecycle hooks for visibility, per-block data changes, per-frame lighting (always applied, even when inactive, so the hidden renderer is ready for an instant toggle), and per-frame active-only work (e.g. draining a mesh-build queue).
_Avoid_: Renderer (too generic — always name the specific one)

**RaymarchRenderer**:
A `BlockRenderer` that ray-marches a DDA voxel traversal per-fragment against each `WorldBlock`'s 3D GPU texture, run inside a real bounding-box mesh per block. Cheap to keep in sync with voxel data (a texture upload), since there's no geometry to rebuild.
_Avoid_: Raytracer (it's a voxel raymarcher, not a general raytracer), ray renderer

**TriangleRenderer**:
A `BlockRenderer` that meshes each `WorldBlock`'s visible voxel faces into real triangle geometry (culled-face meshing, built off the main thread by a worker) and rasterizes it normally. Expensive to keep in sync — mesh rebuilds are queued and only drained while this renderer is active, so switching into it after a while away shows a brief catch-up pop-in by design.
_Avoid_: Mesh renderer, tri renderer

**RendererSwitch**:
The coordinator owning both `BlockRenderer` instances and the active `"ray" | "tri"` mode. Fans `applyLighting` out to both renderers unconditionally every frame; routes `tick` (active-only work) to whichever is active; owns the `/renderer` console command.
_Avoid_: rendererMode (that's the mode value it holds, not the coordinator itself)

## Relationships

- A **Ring** holds a fixed-size window of **WorldBlock**s, indexed by ring slot.
- A **WorldBlock** is rendered by both a **RaymarchRenderer** and a **TriangleRenderer** at all times; only one is visible, chosen by the **RendererSwitch**.
- The **RendererSwitch** calls `applyLighting` on both renderers every frame regardless of which is active, but calls `tick` only on the active one.
- **WorldRing** owns the **Ring** and reports changes to it (via callbacks); **RendererSwitch** is one such callback consumer, not something **WorldRing** depends on directly.

## Example dialogue

> **Dev:** "If I switch to `tri` mode right after the ring scrolls, will the triangle geometry already be correct?"
> **Domain expert:** "Not necessarily — the `TriangleRenderer` only drains its mesh-build queue while it's the active renderer, so there can be a brief pop-in as it catches up. The `RaymarchRenderer` doesn't have this problem because syncing its GPU texture is cheap enough to do unconditionally, every time a `WorldBlock`'s data changes."

## Flagged ambiguities

- "renderer" was used loosely for both "the active rendering strategy" and "the whole dual-renderer subsystem" — resolved: **BlockRenderer** names the strategy interface/implementations, **RendererSwitch** names the subsystem that picks between them.
