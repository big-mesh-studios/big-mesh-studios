# Hide chunk geometry the camera cannot see

Before this change the window drew every chunk whose `drawRange` slice the
frustum could reach. A view down a ridge or into a wall still rasterised the
chunks hidden behind it — every covered triangle ran the fragment shader — so
the draw cost followed the frustum's worst case, not what was actually on
screen. ADR 0022 deferred the _merge_ of superchunks the camera could not
see; the draw calls remained bounded by the superchunk-level frustum test.

## Decision

Each block slot already draws its own slice of the shared superchunk geometry
(`drawRange`). Every slot now also gains a flat-colour probe mesh in a scene
of its own: the same geometry under a probe material that writes the slot's
packed id as a constant colour instead of lighting, texture, or fog. One
probe material is shared by every terrain chunk, and one more instance (with
`depthWrite` off) by the water chunks, so the whole probe scene compiles
exactly two programs whatever the window holds and no translucent water ever
counts as an occluder.

Every `occlusionIntervalFrames` frames — and immediately when the camera
moves a superchunk's worth of world or turns its forward past about 41
degrees — `occlusionFrame` draws the probe scene into an offscreen
`WebGLRenderTarget` at one-eighth of the drawing buffer (floored at 64 px),
reads the pixels back, and keeps the set of slots whose id appeared anywhere.
`applyVisibility` then hides any chunk which that measured set covered but
never saw: the query only answers for the screen it was taken from, so a
chunk is hidden only when the last query actually looked at it and it won no
pixel. A chunk whose probe joined the scene after the query was never
measured by it and is always drawn, and the chunks within one superchunk cell
of the player's own are always drawn too, because the probe cannot describe
the view from inside an occluder.

The occlusion pass belongs to the application, not the renderer: the probe
scene, the target, and the readback live in `TriangleRenderer`, and the
render loop's new `beforeRender` hook calls `occlusionFrame` right before the
visible pass, so the probe is drawn on the same camera view the player sees
and the readback it returns applies from the frame after.

rmsl gained the minimal support the pass needs: `WebGLRenderTarget` (an
offscreen colour-plus-depth surface the app sizes), `readPixels`, and
per-`Mesh` `drawRange` over shared geometry. The probe scene is drawn by the
same renderer on the same context, so it pays for no second renderer's worth
of programs, buffers, or textures.

## Considered options

- **GPU occlusion queries.** A hardware occlusion query samples one draw's
  coverage and reads back a count, and costs a pipeline stall per object
  asked. Our chunk geometry is shared, and the pass would have to issue one
  query per chunk; a single coloured readback answers every chunk at once
  with one stall every few hundred frames.
- **CPU-side conservative hiding (raycasts, portals).** A CPU pass cannot
  know what covers what as cheaply as the depth buffer that already decides
  it, and it spends per-frame main-thread time the readback does not.
- **Rely on distance again (LOD / fog).** ADR 0023 already coarsens distant
  chunks; occlusion hides _near_ geometry genuinely covered by nearer
  geometry, which no distance budget can.

## Consequences

- `occlusionFrame` stalls the pipeline for its readback. The `/render:perf`
  timer brackets it as part of the frame, and `/render:occlusion` reports the
  `occlusions` count of chunks skipped, toggles the pass, and changes the
  query interval.
- A query's result applies one frame late by construction (`tick` decides
  visibility with the previous query's answer), and a chunk a query misses
  stays hidden until a later query — or a move/turn fast track — sees it.
- Colored readbacks key chunks by slot id, so the pass is unaffected by which
  level of detail a chunk draws; a probe is the same geometry the world pass
  draws, at the same distance from the depth test.
