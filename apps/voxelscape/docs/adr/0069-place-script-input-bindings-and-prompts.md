# A place script binds keys and stands prompts

The only interactions a script could offer were the bare use of whatever the
crosshair was on and the item in hand. A game that wants a dash on Shift, a
"Open" prompt on a door, or a difference between a mouse click and the use
button had nowhere to say so. This decision adds script key bindings that
arrive as `input` facts, prompts that stand on a figure and answer as
`prompt-triggered`, and a `button` on the existing `entity-used` fact.

```ts
// effects.ts
| { tag: "bind";          payload: { id: string; key: string; label?: string } }
| { tag: "prompt";        payload: { id; entityId; verb; key?; range?; once? } }
| { tag: "prompt-remove"; payload: { id: string } }

// events.ts
| { kind: "input"; bindId: string; phase: "down" | "up" }
| { kind: "prompt-triggered"; promptId: string }
| { kind: "entity-used"; entityId; item; button?: "primary" | "secondary" | "use" }
```

## A bound key is reported, not owned; the fact carries the intent

`bind` names a key code and an id. The input layer is told the set of codes
each frame and reports every down and up edge on those codes to the script as
an `input` fact stamped with the player who pressed it; the world's own
movement controls still act on the same key, because a bound key is reported
in addition to what the key already does. A script that wants the key for
itself simply ignores the world action it also causes — which keeps the input
layer from having to know which keys a place has claimed, and keeps a script
from silently breaking movement.

## A prompt is answered through the world's own use gesture

A `prompt` stands on a figure with a verb. When the player uses that figure,
the host authors `prompt-triggered` instead of `entity-used`, and forgets a
`once` prompt. The world already resolves whether the crosshair is on a figure
in reach, so the prompt needs no separate hit-test and no new input path; its
verb is shown in the crosshair hint (`npcAim`) so the player sees "Open" where
they would otherwise see "use". The proximity check is the world's own reach,
not the prompt's `range`, which is carried for a later UI that draws the
prompt without aiming at it.

## The use button is now part of the fact

`entity-used` gains an optional `button` so a script can tell a mouse click
from the E key from a touch use. It is optional because a world that does not
report it is still valid, and every existing script that ignores the field is
unaffected.

## Considered options

- **A `RemoteEvent`-style client/server split.** Rejected: the place model has
  no server, and input is a fact one peer observes, which is what the event
  log already carries.
- **A general UI panel API for prompts.** Rejected for now: the crosshair hint
  is the existing "what is under you and what does it do" surface, and a
  world-space prompt panel is a presentation change that can come with the
  rest of the prompt UI.
- **Letting a script capture a key exclusively.** Rejected: it would let a
  place take away movement or jump with no way for the player to know, and the
  additive report costs a script nothing it cannot ignore.

## Consequences

- `bind`/`prompt`/`prompt-remove` join the vocabulary; `input` and
  `prompt-triggered` join the facts; `entity-used` gains a button.
- The input controller gains `setBoundKeys`/`onBoundKey`, and
  `create-voxelscape.ts` refreshes the bound set each frame and forwards edges.
- A script can now build custom actions, labelled world interactions, and
  button-sensitive props without a new input system or a new UI framework.
