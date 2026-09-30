# A place script tints one figure and draws a glowing line

A script could place figures, light the world, run particles, and lay marks,
and it could not change how a single figure looked or draw a line between two
things. A ghost needed to fade, a boss needed a colour, a status effect needed
a tint, and a laser sight, a rope, or a chain needed a line. This decision adds
a per-figure tint and fade, and a straight glowing beam, both following the
figure they name.

```ts
// effects.ts
| { tag: "entity-look"; payload: { id; color?; alpha? } }
| { tag: "entity-look-clear"; payload: { id } }
| { tag: "beam"; payload: { id; fromEntity?; from?; toEntity?; to?; color?; width? } }
| { tag: "beam-remove"; payload: { id } }
```

## A look is a material uniform, so a looked figure wears its own set

`VoxelModelMaterial` gains `tint` (a colour multiplier) and `alpha`, applied to
the marched colour before the hit flash. The model's shared material set is
worn by every copy, so a per-figure look cannot live on it: `VoxelFigures`
makes a set of its own for each distinct look a model wears and caches it by
signature. Figures with the same look and model share a set, so the cost is one
set per distinct look, not one per figure. A hit flash still wins for its
moment and then the figure falls back to whatever look it wears. Lighting is
fed to the look sets alongside the shared ones.

## A beam is one wide segment between two resolved ends

`VoxelBeams` draws each beam as a `Line2` — the same world-unit line the
weather draws lightning with — and rewrites its two endpoints every tick from
the host's resolved list. Each end is either a fixed world point or a figure it
names; an entity endpoint sits a metre above the figure's feet and follows its
live pose, so a beam from a moving caster moves with it. A beam is one segment,
not a polyline, which covers laser sights, ropes, and chains; a curved beam is
a later thing.

## Considered options

- **A tint as a property of the whole model library.** Rejected: a look is a
  property of one figure, and two figures of the same model often differ.
- **One material set per figure, always.** Rejected: a crowd of identical
  figures would each upload the model's volumes again; caching by look keeps
  the shared-set saving for every figure that wears no look.
- **A beam as a thin `Mesh` box.** Rejected: the weather already draws wide
  lines in world units, and a line needs no facing or thickness on the third
  axis where a box would.
- **A polyline trail behind a moving figure.** Deferred: it needs per-figure
  position history and a curve, where the one-segment beam already covers the
  straight cases.

## Consequences

- `entity-look`/`entity-look-clear` and `beam`/`beam-remove` join the
  vocabulary; handles gain `setLook`/`clearLook`, and the lib gains
  `createBeam`.
- A script can now fade ghosts, colour teams, highlight targets, and draw
  sights, ropes, and chains, all following the figures they name.
- This closes the presentation gap from the Roblox comparison: lights,
  particles, decals, billboards, per-entity material, and beams are all
  scriptable, and only a curved trail remains optional.
