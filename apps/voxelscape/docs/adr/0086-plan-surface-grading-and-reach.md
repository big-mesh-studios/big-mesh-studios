# A plan surface can grade flat and reach past its bounds

The `surface` plan shape skinned the terrain: it replaced the top voxels of
every column in its footprint with its block, following whatever height the
terrain reached. That is what a desert floor wants, but a road does not — the
road in the dusty-trip demo climbed every hill the terrain put in front of it.
A surface also had to name a finite footprint, so a road that should run the
length of the world had to guess a bound and stop there. This decision adds a
flat grade and an unbounded reach to the shape.

```ts
// structure-fill.ts
interface PlanSurface {
  kind: "surface";
  min?: Dim3;
  max?: Dim3;
  reachX?: "bounds" | "infinite";
  reachZ?: "bounds" | "infinite";
  level?: number;
  depth: number;
  id: number;
}
```

## A level grades every column to one flat top

Without a `level` the surface behaves as before. With one, each column in the
footprint is brought to that LOD-0 voxel: the air between the terrain and the
level is filled with the shape's block, and the terrain above the level is cut
away and capped. A road runs level through a hollow and a hill alike, and
because the car reads the real voxel surface the same flat height carries it.

The grade stays block-local. Each block finds its own topmost voxel in a column
and fills or cuts within its own y-range, so a column split across two blocks
meets at the seam without either block knowing the other's terrain. It is the
same reason the fill is per-block at all: a block the window has not reached
cannot be consulted, and every peer generating a cell from the same plan must
reach the same voxels. The declared level is in LOD-0 voxels, so a coarse block
maps it onto its own grid the way `depth` was already mapped.

## An infinite reach is resolved against the window

`reachX`/`reachZ` name an axis the footprint spans without bound. The surface
paints whatever terrain a loaded cell already holds, so the cells it can touch
are exactly the loaded cells whose columns fall inside its bounded axes; that
set is found by testing the window rather than by enumerating the footprint,
which an unbounded axis leaves without a bound. `cellsTouchedByPlan` therefore
skips surfaces, and `ChunkSphere.setStructures` adds the covered loaded slots
itself. A plan change regenerates no more than the window holds, and a surface
that reaches the whole world costs no more than one that reaches a field.

## Considered options

- **Leave the road to `box` and `road` shapes at a fixed y.** Rejected: a box
  sits at its own y and cannot carve, so a hill would bury the road and a
  hollow would leave it floating.
- **A separate `grade` shape beside `surface`.** Rejected: the two differ only
  in whether a level was given, and the terrain-following and grading cases
  share their footprint, reach, and validation.
- **Bounded "very large" footprints instead of an infinite reach.** Rejected:
  it still makes a plan change enumerate a footprint far larger than the
  window, and it would need retuning as the window grows.
- **Enumerating an infinite footprint in `cellsTouchedByPlan`.** Rejected: the
  function is pure and has no window, so it cannot bound the enumeration.

## Consequences

- `PlanSurface` gains `level`, `reachX`, `reachZ`, and optional corners, and
  the plan validator bounds the level as a coordinate and requires corners only
  on a bounded axis.
- `cellsTouchedByPlan` no longer reports surface cells; `ChunkSphere` resolves
  them against the window, so an infinite surface is bounded by the streamed
  window alone.
- A flat surface over void would leave a column hanging from the lowest loaded
  block; grading assumes terrain beneath the footprint, which is where a road
  is laid.
