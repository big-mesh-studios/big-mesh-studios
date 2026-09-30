# A place script reads the world back through deterministic queries

A place script could only ask the world four things: the shared clock, the
height and solidity of a point, whether a point is water, and where the
players are. Everything it placed was write-only — an NPC's current position,
a prop's model, the block underfoot, the thing a ray first meets were all
invisible to the script that had just put them there. That is enough for a
dialog tree and a zone trigger, and not enough for anything that aims: a
turret, an aggro radius, a projectile, a "nearest enemy", a script that builds
against what it can see. This decision adds a read surface to the place script
API, answered by the trusted side and pure for every peer.

## The queries are pure functions of the shared clock and replicated state

Every added function is deterministic given the same state, which is the
contract derived rules already run under (ADR 0026):

```ts
// sandbox.ts's WorldQuery, the seam both the sandbox and its callers reuse
getBlockAt(x, y, z): number;
getEntity(id): EntitySnapshot | null;
getEntitiesInBox(min, max): EntitySnapshot[];      // id order
getEntitiesInSphere(x, y, z, radius): EntitySnapshot[]; // id order
getEntitiesWithTag(tag): EntitySnapshot[];
getPlayer(did): LivePlayer | null;
getPlayersInBox(min, max): LivePlayer[];
raycast(origin, direction, maxDistance): RaycastHit | null;
```

Two properties keep a script's answers identical on every peer. First, lists
come back in id order and never in map-iteration order, so a rule that folds
over them folds over the same sequence everywhere. Second, an entity's
snapshot reports its **posed** position — `poseAt` sampled from the shared
clock, not the position the script last declared — so a script sees a moving
platform where the world draws it, and two peers sampling the same clock see
the same place. Raycasts and box tests read those posed snapshots, so an
entity query and the rendered figure agree.

## The host answers for its own figures, the world for everything else

`ScriptHost` receives terrain and player queries from the world but owns the
`npcs`/`props` maps itself, so the new entity queries are implemented on the
host and merge its own figures with the world's terrain and players. A ray
therefore tests, in one pass, the voxel grid (a DDA march over `getSolidAt`),
each figure's upright body box, and each player's cube, and returns the
nearest contact with its face normal. The box sizes are the fixed
approximations `figure-pick.ts` already uses for the crosshair (half 0.6,
height 2 unless a prop declares one), so a script's ray and a player's
crosshair agree about what a body is.

## Considered options

- **A general instance/object graph with synchronous property reads.** Rejected
  for the same reason the effect vocabulary stays closed: it replaces a
  validated, bounded, deterministic seam with an unbounded mutable object
  space, and a peer could no longer reproduce another's read without
  reproducing its whole object graph.
- **Let a script step its own figures and keep positions in its own globals.**
  Rejected: the position a script tracks is the position it last dispatched,
  which is not where a `motion` figure actually is, and it diverges from what
  the renderer draws the moment a remote peer owns the figure.
- **A synchronous `raycast` only, with no entity list queries.** Rejected:
  finding the nearest enemy through a list is the same read the ray needs, and
  a script that wants a radius or a tag should not have to cast hundreds of
  rays to get it.

## Consequences

- `WorldQuery` gains eight functions; every layer that already took it through
  `RequireOnly` gains them as optional, and `create-voxelscape.ts` supplies the
  world's own (`getBlockAt`) while the host supplies the rest.
- `raycast` is bounded: a voxel march gives up after a fixed number of cells so
  an axis-aligned direction cannot walk forever, and entity hits reuse the slab
  test the crosshair already trusts.
- A script can now drive AI, interaction, cameras, and checks against the
  running world instead of only reacting to touches and zones.
