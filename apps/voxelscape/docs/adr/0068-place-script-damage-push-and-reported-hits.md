# A script can push a player, and report a hit it decided itself

A script could damage a player (`player-damage`) and nothing else about the
body: no knockback, no jump pad, no launch from a trap. And it could describe
an entity in every way except telling the world that something struck it — a
`entity-hit` fact was only ever authored by a weapon the engine resolved, so a
script that computed its own collision (a fireball, a spike, a falling rock)
had no way to make that hit real to the other peers. This decision adds a
velocity push, and a `report-hit` effect that authors the same `entity-hit`
fact a weapon does.

```ts
// effects.ts
| { tag: "player-push"; payload: { player: string; vx: number; vy: number; vz: number } }
| { tag: "report-hit";  payload: { player; entityId; amount; attackerX; attackerZ } }

// sandbox.ts's WorldQuery
getLocalPlayer(): string;
```

## A push is a velocity delta the body already integrates

The player's own physics steps `vx`/`vy`/`vz`; `player-push` adds to them, and
a positive `vy` clears the grounded flag so a jump pad actually leaves the
ground. That is the whole mechanism — no new body model, no impulse solver.
It is a voice-tier effect applied by the named player's own peer, the same
local-ownership rule `player-damage` follows, so no pose is replicated.

## `report-hit` is how a script's own collision reaches the log

Scripts cannot author facts — facts are the host's observations — which is what
keeps the log bounded and trustworthy. But a script that has already resolved a
collision with the new read surface (`raycast`, `getEntitiesInBox`, `findPath`)
is the authority on that collision. `report-hit` lets it state the fact: the
host stamps it, adds it to the shared log, and broadcasts it exactly as a
sword swing is. The payload names the attacking `player` so the fact carries
the right producer, and the amount is bounded like every other hit.

## Projectiles are a script pattern, gated by `getLocalPlayer`

There is no host projectile entity. A fireball is a script's own list of moving
points, advanced each tick from the shared clock, tested with `raycast` and
`getEntitiesInBox`, and made real with `report-hit` and `player-damage` when it
lands. Because every peer runs the script, the one whose `getLocalPlayer`
matches the shot's owner is the one that reports — the same owner-decides rule
the monsters use — so a hit is reported once, not once per peer.

## Considered options

- **A host-simulated projectile effect.** Rejected for now: it would need the
  full owned-tier machinery (owner election, broadcast, dead-reckon) for what
  is a few lines of script, and a script's own collision is already
  deterministic from the shared queries.
- **A `velocity` field on the player effect.** Rejected: an absolute velocity
  fights the physics and loses to whatever the player is already doing; a
  delta composes with it.
- **Let scripts dispatch `entity-hit` directly.** Rejected: it would let a
  script forge any fact shape rather than only the ones the vocabulary
  validates, and `report-hit` is the one shape that is actually needed.

## Consequences

- `player-push` and `report-hit` join the vocabulary; `getLocalPlayer` joins
  the queries so a script can tell its own shots from a peer's.
- A script can now build knockback, jump pads, traps, and projectiles out of
  the read surface, the effect vocabulary, and its own state.
- The player's velocity is now something a script can add to; a later change
  that wants to cap or damp it belongs with the body's physics.
