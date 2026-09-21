# A place script asks the world for a walkable route

An NPC that chases a player, retreats to a waypoint, or walks a patrol could
only move in a straight line or along a `motion` path its author had written
by hand. The zombies demo re-derives a chase every tick against player
positions; anything that has to go _around_ a wall was the script's problem,
and the script has no map. This decision gives a place script a deterministic
route search, `findPath`, and builds `npc.walkTo` on top of it.

## The search is a fixed A* over the voxel grid

`findPath(from, to, options)` snaps both ends to walkable cells — a cell is
walkable when the terrain has ground under it and a voxel of clearance above —
then runs A* with four neighbours, a Manhattan heuristic, and a fixed
tie-break (lowest cost, then estimated remaining, then cell address). Every
part of that is deterministic, so two peers over the same terrain return the
same route; the bounds (`MAX_PATH_NODES`, `MAX_PATH_CELLS`) cap how hard one
call may try. The route is a list of world-unit waypoints at cell centres,
which is a shape a script could have written itself.

Terrain is read through the same `getHeightAt`/`getSolidAt` the rest of the
world's physics uses, so a route matches what a player can actually walk. A
figure standing on a prop has an unwalkable origin cell; both ends are snapped
to the nearest walkable cell within a fixed ring, so a route still exists from
the ground beside it.

## `walkTo` reuses motion, so the world still samples the movement

`npc.walkTo({ x, z, speed })` searches a route, converts it to offsets from
the figure's declared position, and dispatches one `npc` effect with a `once`
motion whose duration is the route length over the speed. The world's existing
motion sampler moves the figure — the same deterministic path-and-clock
machinery every moving platform already rides — so `walkTo` adds no per-tick
script stepping and no new replicated state. There is deliberately no arrival
event: a script that needs one can compare against `getNow` or the figure's
reported position.

## Considered options

- **A navmesh baked from terrain.** Rejected for now: the world is a voxel
  grid already, and baking a separate graph would have to be rebuilt as the
  window streams and as scripts edit voxels.
- **A host-owned chaser that steps toward a target every tick.** Rejected:
  that is the monsters' owned tier, and a scripted figure is not owned; a
  route is derived state the world can sample on every peer.
- **Eight-way movement.** Rejected: a diagonal between two solid cells is a
  corner no body fits through, and four-way keeps the tie-break and the route
  easy to reason about.

## Consequences

- `WorldQuery` gains `findPath`; `NpcHandle` gains `walkTo`; the guest math's
  `Math.hypot` and the existing motion vocabulary do the rest.
- A script can now build patrols, chases, retreats, and escort walks without
  owning a map, and a route is reproducible on every peer.
- The search is approximate: it treats a column's surface as its walkable
  height, so a route does not thread a cave or an overpass. A finer search is
  a later decision if a game needs one.
