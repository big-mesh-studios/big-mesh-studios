# A place script carries state between places through the account scope

A teleport sends a player to another place (ADR 0077), and the place they
arrive in knows nothing about what they had: an item carried out of one level is
gone in the next. This decision adds an `account` data scope — values that
belong to the signed-in player and to no one place — and lets a teleport name
the keys it carries into it.

```ts
// sandbox.ts
export type DataScope = "player" | "global" | "account";

// effects.ts
| { tag: "teleport"; payload: { player; place; carry?: string[] } }
```

## Account data is place-independent and lives in a fixed record

A player scope value is keyed by the place, so it does not survive the jump. The
account scope has no place: it is read and written under one fixed record in the
player's own repository (`app.bms.voxelscape.account`, record key `self`),
alongside the per-place record ADR 0079 writes. The synced table loads both at
start and writes both after a change, so a value saved in one place is there in
the next; a value saved in a place is not, unless the script carries it.

## A teleport copies the keys it names, and nothing is lost if it is refused

`carry` names player-scope keys; before the jump the host copies each value it
holds into the account scope. It copies rather than moves, because a jump may be
refused (an address this world cannot open) and a move would leave the value
neither here nor there. A game that wants a carried item to leave the place it
came from clears its own player value, the same bookkeeping it already keeps.

## Considered options

- **Encoding the carried state in the teleport address.** Rejected: it would put
  arbitrary values in a URL and in the router, where they are neither bounded
  nor validated, and would not survive a reload of the destination.
- **A place-scope key namespaced by destination.** Rejected: a player may go
  anywhere, and the destination is not known to the place they are leaving
  except by the address the teleport already names.
- **Moving rather than copying.** Rejected: a refused jump must not lose the
  value, and a copy leaves the source place's own bookkeeping in charge of what
  it keeps.

## Consequences

- `DataScope` gains `"account"`; `data-set`/`data-delete`/`data-get` accept it,
  and the synced table and atproto source read and write a second record.
- A script can now build inventories, currencies, and progression that a player
  carries between places, and each place decides what it reads and writes.
- The account scope is per player; a value shared by everyone across places
  still has no writer and is not built.
