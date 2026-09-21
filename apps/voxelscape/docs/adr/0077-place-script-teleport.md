# A place script sends a player to another place

A game that ends in a sequel, a hub that leads to a level, or a portal between
two worlds all need the same thing: a script saying "send this player there".
This decision adds a `teleport` effect that sends one player to another place,
and a `player-teleported` fact so the peers left behind see them leave.

```ts
// effects.ts
| { tag: "teleport"; payload: { player: string; place: string } }
// events.ts
| { kind: "player-teleported"; place: string }
```

## A teleport names a place this world can already open

`place` is either a published place's `at://` address or a built-in demo as
`demo:<id>`. The world maps it to one of its own routes — `/demos/<id>` for a
demo, `/<repo>/<rkey>` for a published place — and navigates the browser there;
a `handle/world` path is accepted as it stands. Only the local player is ever
moved: the effect names a player, and a target that is not this peer is left
alone, because navigating away is something only the player's own browser can
do. The host authors `player-teleported` first, so the fact reaches the peers
still in the place before the page changes.

## A teleport cannot leave the application

The address is bounded and mapped through the world's own router, never passed
to `window.location` as an external URL. An address the router cannot open is
reported to the console and ignored. A script can therefore no more send a
player to an arbitrary site than it can name a sound file of its own — the same
fixed, first-party boundary every other effect keeps.

## Considered options

- **A raw URL the world navigates to.** Rejected: it would turn a place script
  into a redirect to anywhere, and a published place is already an address this
  world knows how to open.
- **Teleporting every peer to the place.** Rejected: leaving is per player, and
  a peer's browser is not this one's to steer.
- **A portal as a prop the world detects.** Kept as a script pattern: a prop
  and a zone already report a touch, and the script calls `teleport`, the same
  way it builds any other interaction.

## Consequences

- `teleport` joins the vocabulary and `player-teleported` joins the facts; the
  lib gains a `teleport` helper.
- A script can now build portals, level exits, hubs, and sequels, with the
  peers left behind hearing that a player left.
- Cross-place state (what a player carried between places) is not addressed;
  that belongs with the durable data backing.
