# A place script saves player and global data, and ranks it

A game that progresses needs to remember something across runs, and a shared
score needs to rank one player against another. A script could keep both in its
own globals, and a restart — which builds a fresh interpreter — loses them, and
a peer that joins later never had them. This decision adds a place data table a
script writes with `data-set`/`data-delete`, reads with `getData`, and ranks
with `getDataLeaderboard`, plus `badge-award` for the common case.

```ts
// effects.ts
| { tag: "data-set"; payload: { scope: "player" | "global"; player?; key; value } }
| { tag: "data-delete"; payload: { scope; player?; key } }
| { tag: "badge-award"; payload: { player?; badge } }

// events.ts
| { kind: "data-changed"; scope; player; key; deleted; value? }
| { kind: "badge-earned"; player; badge }
```

## The table is in memory so a step stays deterministic

A script reads data inside a `tick`, and two peers must compute the same answer
from the same facts (ADR 0026), so the table is held in memory and read
synchronously: `getData` answers from it in the same step. Persistence happens
behind that table, never during a step — the whole table is written through a
storage seam after a change. The page's own storage backs it today (a
`bms-voxelscape:data:<seed>:<entry>` key, like the ending log); a network store
that reads and writes asynchronously plugs into the same `DataStorage` seam
without the script API changing.

## A write is a fact, so a save and a leaderboard converge

`data-set` writes the local table and authors a `data-changed` fact; every peer
folds that fact into its own table, so a value a player saved is known to a peer
that joined later and a shared leaderboard ranks every player whose save has
been seen. `data-delete` authors the same fact with `deleted` set, and
`badge-earned` folds back into the table as the player's `badge:<name>` key.
Player scope names a player ("" is the local one); global scope is one value
everyone shares and everyone may write, idempotently, so duplicate facts from
peers agreeing on the same value are harmless.

## Considered options

- **Reads as facts, never a query.** Rejected for a synchronous store: a
  `data-loaded` fact would only be needed once a value is not already in the
  table, and inventing it now adds a race to every read for no benefit. It is
  the first addition a network-backed store would make.
- **One peer authoritative over the data.** Rejected: it reintroduces the
  elected writer the place model was built to avoid; a table every peer folds
  from the same facts needs no writer.
- **Values in script globals.** Rejected: a restart loses them, and a late peer
  never has them.
- **Storing whole objects.** Rejected: a value is a string, a finite number, or
  a boolean, so it serialises identically for every peer and the table stays a
  bounded flat map.

## Consequences

- `PlaceData` lives in `places/place-data.ts`; the host owns a table, wires it
  to storage, and folds remote `data-changed`/`badge-earned` facts into it.
- A script can now save progress, keep a global value, award a badge, and rank
  players by a saved number, all from the effect vocabulary.
- The durable backing is the page's storage for now; an atproto-backed
  `DataStorage` is the next step for cross-device saves.
