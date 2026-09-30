# A place script runs particles and lays flat marks, both from fixed vocabularies

A script had fires and explosions, each its own bespoke shader, and no way to
run a puff of smoke, a trail of sparks, a dust cloud, or a road marking. This
decision adds a general particle emitter and a flat world mark, each naming one
of a fixed set of looks so a place never supplies a shader or an image of its
own — the same reasoning that keeps sound and camera effects to fixed
vocabularies.

```ts
// effects.ts
| { tag: "particle"; payload: { id; kind?; entityId?; x?; y?; z?;
                                color?; size?; spread?; lifeMs?; loop? } }
| { tag: "particle-remove"; payload: { id } }
| { tag: "decal"; payload: { id; kind; entityId?; x?; y?; z?;
                             color?; size?; yaw? } }
| { tag: "decal-remove"; payload: { id } }
```

## One particle shader, a kind's uniforms

`VoxelParticles` draws every emitter with one geometry and one material class,
the same shape the fire and explosion renderers use: a fixed fan of billboards
whose motion runs entirely in the vertex shader, with per-particle outward
direction, upward bias, size jitter, and phase offset baked once. A kind is a
set of defaults — colour, size, spread, lifetime, whether particles rise or fly
outward, and whether they blend additively — and a script may override the
numbers but not the look. A looping emitter wraps each particle's life; a
one-shot runs it once and the renderer expires it. An emitter that names a
figure follows its live pose, and one dispatched again with a newer `at`
restarts. A material is pooled per blend, so many emitters compile a fixed set
of shaders.

## A mark is a fixed shape drawn on a flat quad

`VoxelDecals` draws one of four shapes — an arrow, a cross, a ring, a splatter
— onto a canvas in the mark's colour and lays it on a quad in the ground plane,
turned by the mark's yaw. The shape vocabulary is fixed for the same reason the
particle kinds are: a place names a mark the world already knows how to draw,
rather than supplying an image the boundary would have to trust. A mark whose
shape and colour have not changed keeps its canvas.

## Considered options

- **A general particle spec with per-particle scripts.** Rejected: it would let
  a place push an arbitrary shader through the effect boundary and make an
  emitter's cost unbounded. A kind with a few bounded overrides is the same
  fixed-vocabulary trade the sound and camera effects already made.
- **Decals as images attached to a place.** Rejected for now: it needs a place
  asset pipeline (fetch, validate, pair) the manifest does not have, where the
  fixed shapes need none.
- **Reusing the fire or explosion material for particles.** Rejected: those are
  tuned to a plume and a burst, and a kind needs its direction, spread, and
  lifetime to vary independently.

## Consequences

- `particle`/`particle-remove` and `decal`/`decal-remove` join the vocabulary;
  the lib gains `createParticle`/`createDecal` handles.
- A script can now build smoke, sparks, dust, trails, and ground markings out
  of the same effect path as everything else, bounded in count and size.
- Per-entity material (tinting or fading a figure) remains the one unbuilt
  presentation item.
