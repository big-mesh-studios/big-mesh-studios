# Structure plans can build stairs and inclines

The structure plan vocabulary had boxes, roads, and houses. An obstacle course
is almost entirely stairs and slopes, and building
them from boxes means a creator computes every tread by hand and every peer
rebuilds the same arithmetic — or the plan is huge and the filler pays for it
per block. This decision adds two shapes that say the geometry once.

## The shapes are declared, and the filler expands them to boxes

`stairs` names a bottom corner, the horizontal axis it climbs along, how many
treads, how far each rises and runs, and how wide it is. `ramp` names two ends
and a width and becomes one column per voxel of its run, solid from the lower
end to the height interpolated there, so its surface climbs a voxel at a time.
Both are validated like the shapes beside them — tread counts and rises are
bounded, an incline's run has a maximum — and `expandShape` turns each into the
boxes the trusted filler already stamps. The plan stays data; the sandbox still
never writes a voxel (ADR 0027).

Expanding in the trusted filler rather than in the guest is what keeps the plan
small: a fifty-tread staircase is one shape on the wire and in the zip, and the
blocks it fills are computed once per block against the same bounds every other
shape uses.

## Considered options

- **Leave stairs and slopes to the creator as boxes.** Rejected: every course
  would hand-roll the same tread loop, and a mistake in it would be a different
  mistake in each place.
- **Add a true diagonal shape the filler rasterizes as a slab.** Rejected: the
  filler writes voxels from axis-aligned boxes, and the mesh is built from
  those voxels; a sheared slab is the same stepped surface with more machinery.

## Consequences

- `PlanStairs` and `PlanRamp` join `PlanShape`, and the plan validator bounds
  their treads, rises, runs, and widths.
- A ramp's run is capped because each column of it becomes a box the filler
  walks per block; the cap keeps a single shape from making a block's fill
  unbounded.
