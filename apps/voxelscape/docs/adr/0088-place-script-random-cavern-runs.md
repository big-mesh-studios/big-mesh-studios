# The Cube Cavern demo generates each floor at run time

The Cube Cavern demo is a port of a randomly generated dungeon crawler, so its
whole shape is a question the boot plan cannot answer: the rooms, their
doorways, where the monsters stand, and which chests the floor holds are
different every run. This decision is how the demo builds a floor at run time
out of the world's existing seams, and which of the original's own choices it
keeps or bends to fit them.

## The floor is a structure the script stamps, not a plan

The boot plan is bounded to the region around the spawn and is the same on
every peer for a given seed, so it cannot hold a fresh maze each run. Instead
the demo grades a flat cavern site with a `surface` in `onPlan` (so no natural
hill pokes through a room), then builds each floor's rooms and walls as a
`structure` group the script stamps with `createStructure` when the floor
opens, and takes down with `structure-remove` when it changes. This is the same
path the dusty-trip demo proved for structures built ahead of the player; the
cavern just builds the whole floor at once, bounded to a five-by-five grid.

The site sits just south of the hub, inside the window the world streams around
the spawn, and its floor is graded in the boot plan rather than the run-time
structure. Both matter: a site further out than the stream radius would not be
loaded when the script moves the player onto it, and a floor that only arrived
with the run-time structure could leave the player falling through cells whose
fill had not landed. With the ground already streamed in, moving the player onto
a floor is safe, and the run's own rooms simply appear over it.

## The source's room chain becomes a grid

The original threads 8-12 hand-authored rooms down a corridor that turns left,
right, or forward, drawing each room from one of three directional pools. The
world has no such room models to import, so the demo lays the same idea on a
grid: a seeded depth-first walk carves a spanning tree of doorways, a handful
of extra doors add loops, and the entrance, a mid-floor shop, and the exit take
fixed cells. The themes, the three-floor descent, the mid-run shop, the
key-locked exit, and the boss on the last floor are the original's.

## A floor is fully determined by its seed

`buildFloor(seed, floor, theme)` is a pure function of its arguments: a
mulberry32 generator walks the same maze, stands the same monsters, and cuts
the same doorways every time. The demo seeds a run from the shared clock at the
moment it begins, so two runs differ, but a replay of the same run reproduces
it exactly — the determinism rule a place script owes its peers (ADR 0026).

## Monsters chase by range, not on a navigation graph

`findPath` samples only a column's top surface, so it cannot see a wall
(ADR 0066), and the original's own enemies move with a simple seek rather than
pathfinding. The demo's monsters therefore walk straight at the nearest player
whenever one is within their aggro range, with no route and no line-of-sight
gate. A sight check is not worth its cost here: a `raycast` from a monster's
own body meets that same body first, so gating a chase on it would stop every
chase, and rooms are small enough that a monster which clips a wall closing on a
nearby player reads as intended.

## The source's drop rates are bent for one player

The original rolls 165 outcomes per kill: 37 bronze coins, one key, one clip,
one hat. With no one to trade with and a key needed to leave each floor, a
solo demo at those rates would stall, so the demo keeps the shape of the roll
but lifts the coin and key rates and prices keys in the shop as well. Its
`dist`, `speed`, `health`, and `damage` numbers for every yellow monster are
the source's own, and the other six themes carry their real stats as table data
with a yellow model stood in until their own art exists.

## Considered options

- **Building the whole cavern in `onPlan`.** Rejected: a plan is fixed at boot
  and shared by every peer, so it cannot vary per run, and the plan region is
  too small for a run's rooms and the hub at once.
- **A hand-authored maze per floor.** Rejected: the point of the port is the
  random floor, and a fixed maze needs no seed, no generation, and no test.
- **A navigation graph like Baldi's.** Rejected: that graph is hand-authored
  for a fixed school, and a generated maze would need one built per floor; a
  sight-gated straight seek is simpler and matches the original's own AI.
- **Importing the source's `.rbxl` room models.** Rejected: the rooms are
  another author's scenery, and the demo ports mechanics, not assets.

## Consequences

- The demo adds `cube-cavern-level.ts` (pure: themes, monster stats, and
  `buildFloor`), `cube-cavern-items.ts` (pure: items, prices, drops, recipes),
  `cube-cavern-mobs.ts` (the sight-gated AI), and `cube-cavern.ts` (the run
  state machine), with `tools/make-cube-cavern-models.ts` for its stand-in art.
- A run's loot, max health, and deepest floor reached persist through the data
  helpers, so a later run reads them back (ADR 0076).
- Adding one of the other six themes is a model list and a table entry, not a
  new mechanic.
