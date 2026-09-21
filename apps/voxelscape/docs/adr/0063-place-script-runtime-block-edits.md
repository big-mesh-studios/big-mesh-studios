# A place script edits voxels at runtime through the shared edit layer

A place's `onPlan` builds its terrain once, before the first fill; after that,
the only thing that could change a voxel was a player's own tool. A script that
wants a door to open, a bridge to collapse, a wall to rise when a wave starts,
or an explosion to crater the ground had no way to say so. This decision adds
three effects — `block-set`, `block-fill`, and `block-clear` — that write
voxels during play, bounded in both the region they may address and the number
of voxels one call may touch.

```ts
// effects.ts
| { tag: "block-set";   payload: { voxel: [number, number, number]; id: number } }
| { tag: "block-fill";  payload: { min: [number, number, number];
                                   max: [number, number, number]; id: number } }
| { tag: "block-clear"; payload: { min: [number, number, number];
                                   max: [number, number, number] } }
```

## A scripted edit is a player's edit, on the same machinery

The host reports each effect through an `onBlockEdit` callback in LOD-0 voxel
coordinates, and the world funnels it into the same `EditingController` a
player's tool uses: the same overlay record, the same broadcast to peers, the
same block-store write, the same incremental re-light, the same IndexedDB save.
That means a script's change persists, syncs, and merges exactly as a player's
does — there is no second terrain model, and a script cannot accidentally write
a voxel that a later player edit will not reconcile against. `block-set` is a
one-voxel box; `block-clear` is a fill with id 0.

## The bounds are the fill's volume and the region, not the script's intent

The validator caps one call at `MAX_BLOCK_FILL` voxels and the coordinate at
`MAX_BLOCK_COORD`, and `EditingController.fill` skips any voxel no loaded block
covers, so a fill past the streaming window's edge costs nothing rather than
failing. There is deliberately no plan-region check here: a script may edit
anywhere its blocks have streamed, the same reach the player's own tool has,
and the world's own ring is the limit.

## Considered options

- **A single `terrain` effect taking a shape (`box`, `sphere`, `replace`).**
  Rejected: the shape vocabulary belongs to a plan that is rasterised once; for
  a live edit, a box is the one shape a script can compute cheaply and a
  player's own edit already reduces to.
- **Write the voxels the way `onPlan` does, outside the edit layer.** Rejected:
  plan-shaped terrain is part of the world's generation, not an edit, so it has
  no `updatedAt`, does not sync, and a restart would rebuild it from the plan
  while a script's live edit should survive the way a player's does.
- **Author `block-placed`/`block-broken` facts for every scripted voxel.**
  Deferred: a large fill would flood the event log one fact per voxel, and the
  script already knows what it did. The world change itself is what must
  converge, and it does.

## Consequences

- Three effects join the vocabulary; `EditingController` gains a `fill` method
  that is a player-facing no-op until a script calls it.
- The number of voxels one call touches is capped, so a hostile fill cannot
  stall a peer's frame with an unbounded batch.
- A script's world change is durable and shared: it saves to IndexedDB, reaches
  peers over the mesh, and settles with the atproto edit sync like any edit.
