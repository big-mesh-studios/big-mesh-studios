# A place script reads a player's hearts and gives them back

A script could take a player's hit points (`player-damage`) or empty them
(`player-kill`), and could not read how many were left, restore any, or change
how many a player has. A healing fountain, a boss that sets a longer health bar
for its arena, an NPC that patches a player up, or a HUD that lies about a
player's condition all need the other half of that conversation. This decision
lets a script read a player's current and maximum hit points and write both
back.

## Reading joins the player query; writing joins the effect vocabulary

`getPlayer(did)` and `getPlayers` already answer with a player's live position
(ADR 0061); they now also answer `health` and `maxHealth`. Two effects write
back:

```ts
// effects.ts
| { tag: "player-heal";       payload: { player: string; amount: number } }
| { tag: "player-max-health"; payload: { player: string; maxHealth: number } }
```

`player-heal` restores up to the amount without passing the maximum, and
`player-max-health` sets the most a player may hold, bringing a current value
above it down to it. A respawn fills whatever maximum is current, so raising
the bar does not hand out the new hearts until the next life — a deliberate
choice that keeps "set the ceiling" and "fill to the ceiling" separate.

## The health model stays the hearts the world already draws

`PlayerHealth` owns half-heart hit points and the death sequence; nothing here
changes that. `maxHp` stops being `readonly` and gains a `setMax` that floors
at one heart's worth and clamps a current value above the new ceiling. The
hearts HUD and `heartStates` already take the maximum as an argument, so a
raised ceiling draws more hearts with no HUD change.

## Targets are the existing local-ownership rule, not new replication

A `player-heal`/`player-max-health` aimed at the empty player or the local DID
applies to the local `PlayerHealth`, the same rule `player-damage` already
follows. A target naming a peer is currently a no-op for heal and maximum —
there is no broadcast for them yet — where damage has one; a later change can
add the mirror broadcast if a game needs remote healing.

## Considered options

- **An absolute `player-health` effect carrying the new value.** Rejected:
  `player-damage`/`player-heal` are deltas, so a rule stays a fold over events
  rather than a read-then-write race, and an absolute setter would let a script
  resurrect a dead player by writing hit points.
- **One `player-health` effect that sets both the ceiling and the current
  value.** Rejected for the same reason: it conflates the two, where the two
  effects keep "raise the bar" and "refill" separate.
- **Publish health as a replicated player fact every change.** Rejected: health
  is owned per player (ADR 0026's owned tier), already read locally by the HUD,
  and need not enter the shared log.

## Consequences

- `LivePlayer` gains optional `health`/`maxHealth`; the world's `getPlayers`
  supplies them for the local player, and a peer's are absent until a broadcast
  exists.
- `PlayerHealth.setMax` is the one new mutation; `player-heal` uses the `heal`
  it already had.
- A script can now build healing, escalating arenas, and health readouts.
