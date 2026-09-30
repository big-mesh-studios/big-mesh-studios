# A place script navigates its own map by waypoints, not `findPath`

The Baldi's Basics demo's school is stamped into the terrain as walls. `findPath`
(ADR 0066) decides a cell is walkable from a column's topmost solid surface, so a
three-voxel wall reads as a walkable plateau with air above it; A* takes the
shorter route straight over the walls. A scripted figure has no body collision
either, so Baldi was drawn walking through the school's walls.

## The fix is a hand-authored graph, not a smarter search

The demo now carries its own navigation graph (`baldi-nav.ts`): points on the
halls' centre lines, one at each room's doorway mouth, and one at each room's
centre, joined only where the straight run between them is clear of walls.
BFS over that fixed graph is the route; a figure walks node to node. When the
straight line to the player is clear — checked with a `raycast` that only
counts terrain — it closes directly instead. The rule is the obvious one: follow
the halls, and leave them only when nothing is in the way.

The graph is deliberately map-specific. `findPath` stays the general answer for
terrain; a place that knows its own walls can say so better than a search over
surface heights can.

## Doors a figure walks through swing open

A closed door is a script `barrier`, not terrain, so no route search can see it.
As a figure moves, the script swings open any shut door within reach, in place
of letting the figure pass through it. Yellow doors open for the cast whatever
the player's notebooks, the way the original's Baldi opens every door he meets.

## Consequences

- `baldi-nav.ts` carries no `"voxelscape"` import, so the graph and its BFS are
  unit-tested on their own.
- The graph duplicates the level's geometry; a comment ties it to `ROOMS` and
  `DOORWAYS`, and its test guards that every room is reached through its door.
- `findPath` is no longer used by this demo. A future school that wants a
  general route can still call it, or a later decision can teach the search a
  climb limit so surface sampling stops mistaking walls for ground.
