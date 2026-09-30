# A script reads the local player's held movement input

A script that drives something itself — a car's throttle and steering, a
turret's aim — had no throttle to read. A `bind` reports a key's down and up as
facts, which is an edge on one named key, not the analog forward/back and
strafe a player is holding this frame; and a script asking for the local
player's position gets where they are, never what they are pressing. This adds
one read, `getInput()`, that answers the local player's live movement and tool
input the way `getLocalPlayer` answers their identity.

```ts
// sandbox.ts
interface LocalInput {
  moveX: number; moveY: number;
  jumpHeld: boolean;
  lookDx: number; lookDy: number;
  primary: boolean; primaryHeld: boolean;
  secondaryHeld: boolean; use: boolean;
}
getInput(): LocalInput | null;
```

## The read is the frame's own snapshot, before a cutscene clears it

The world already takes one `InputSnapshot` a frame and hands it to the
player's mover; when a script has locked the player's controls it hands the
mover a zeroed one instead. `getInput` reports the snapshot as consumed, before
that substitution, so a locked player is exactly the case it exists for: the
script has taken the body and is steering something with the input the body
would otherwise have used. The value is voice-tier and local — only the peer
whose player it is has one, and it is never replicated — the same rule
`getLocalPlayer` and the local damage and push effects follow.

## Considered options

- **A `bind` fact carrying the axis.** Rejected: a binding listens on one key
  and reports a transition, so four directions and an analog magnitude are not
  what it says; and a key-down fact has no player on it, while input is
  inherently one player's.
- **A host vehicle that reads the input itself.** Deferred: the input read is
  the piece a script-driven body is missing, and a host body would hide the
  game's own rules — fuel, gears, seats — behind the engine.
- **Let a script poll the keyboard directly.** Rejected: a script has no host
  access at all, and determinism forbids it reading a device the clock does not
  share.

## Consequences

- `WorldQuery` gains `getInput`; the sandbox binds it, the `"voxelscape"`
  module parses it, and the world passes the frame's raw snapshot through the
  console to the host. The touch dig button also gains a held state
  (`primaryHeld`), since it had only a repeating edge before and a driving
  accelerator needs a button that is simply down.
- A script can drive a prop with the velocity primitive and read the input that
  steers it, which together are a car.
- The reading is not yet replicated, so a remote peer cannot drive a body the
  way the local player can; that arrives with the same owner-broadcast a live
  NPC needs.
