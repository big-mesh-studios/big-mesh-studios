# Distributed monster simulation: ownership, broadcast, and atproto truth

Monsters are simulated on players' machines rather than a server: each monster
is simulated by the player nearest to it, its state is broadcast to connected
peers over the WebRTC mesh as the optimistic fast path, and its position is
persisted to atproto as the durable source of truth. This ADR records the
model and why it takes the shape it does.

## Deterministic identity and spawning

Every monster that can exist is addressed by the terrain seed and a (cell,
slot) pair (`monsterId`/`monsterAt` in `src/monsters/monster.ts`); only some
addresses hold a monster, at a configured density. Because the address is a
pure function of the world, any client agrees on which monster is which and
where it starts without any shared state. A monster exists only while its
spawn cell is within a player's materialization window; the atproto record
from the last owner is what lets a monster "reappear" in the same state later.

## Ownership: the nearest player simulates, with hysteresis

The player nearest to a monster (ties broken by the lower DID, so every client
picks the same owner) simulates it: its brain steps on that client, and that
client broadcasts the result. Everyone else renders the broadcasts and does
not step the monster itself. Ownership carries hysteresis — the recorded owner
keeps a monster until another player is clearly closer — so two players
hovering around a monster don't ping-pong it, and a handoff is a simple
consequence of the nearest-player rule. The new owner announces itself simply
by writing a record whose `owner` field names it.

## Two channels: WebRTC broadcasts and atproto records

The WebRTC mesh carries monster state as `MonsterWire` messages at the pose
broadcast cadence (150ms while moving, 2s idle). Receivers dead-reckon between
deliveries: extrapolate by velocity, ease on small errors, snap on large ones
(`src/monsters/reckon.ts`). This is the optimistic path — fast, but only as
reliable as the mesh.

atproto carries a coarse snapshot per monster: one `app.bms.voxelscape.monster`
record per monster in the owner's repo, keyed by the monster id, written at a
throttled cadence (5s) and immediately on a state or ownership change. The
union of every repo's records is the source of truth for where monsters are.
Discovery re-scans the relay's `listReposByCollection` for the monster
collection, fetches each repo's records, and merges them in. This is what a
late joiner converges to, and what a handoff resumes from.

## Reconciliation: last-write-wins by producing clock

A merge keeps the record whose `updatedAt` is newest, ties broken by the owner
DID so every client resolves a conflict the same way regardless of fetch
order. Each snapshot carries both the producing client's `authoritativeAt`
(the ordering key) and the local `updatedAt` (the reader's arrival time, which
drives its dead-reckoning freshness). Records from another world's seed are
ignored. Like the edit sync (ADR 0009), this accepts clock skew between
producers; the optimistic broadcast path keeps state fresh in the meantime,
and the record converges on the latest write.

## Considered options

- **Deterministic lockstep over the mesh.** Rejected: it would give identical
  state, but every client is authoritative over its own player, so the inputs
  to a monster's brain are never identical across machines — and lockstep
  advances at the slowest peer.
- **Rendezvous/consistent hashing over nearby players.** Rejected: stable
  under membership churn but ignores actual distance, so a far player could
  own a monster it barely affects.
- **Everyone nearby simulates, LWW only.** Rejected: no explicit owner means
  the most divergence between players' screens; ownership is what gives the
  same state "as much as possible".
- **Write every step to atproto.** Rejected: atproto is not a real-time bus,
  and full-rate writes would burn PDS quota; the record is coarse and throttled
  by design, with WebRTC carrying the live stream.
- **Observer-written records too.** Rejected: only the owner writes, so each
  repo holds one record per monster it simulates and discovery volume stays
  bounded; an owner's repo persists after it leaves, which is what a new owner
  resumes from.

## Consequences

- A monster at the edge of a client's k-nearest-neighbour cluster may show its
  recorded position rather than live motion until a broadcast or a discovery
  pass lands — the acknowledged cost of a bounded mesh over a whole world.
- Handoff races (two clients briefly both thinking they own a monster) are
  settled by the record merge, not prevented; the owner field and the
  hysteresis margin keep them rare.
- atproto records carry no velocity and only integer positions, so a client
  resuming from a record shows a still monster until the new owner's
  broadcasts arrive.
- `MonsterSync` (discovery + write loop) starts and stops with the atproto
  session, alongside the multiplayer mesh.
