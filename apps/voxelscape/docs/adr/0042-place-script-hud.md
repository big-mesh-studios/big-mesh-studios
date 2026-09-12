# A place script's HUD readouts are voice-tier values

A game wants to show a player something the dialogue box and the toast line do
not fit: a meter that fills, a small readout of where they are. The effect
vocabulary had only words. This decision adds a small typed readout the script
can set, change, and remove.

## A readout is a value, not a script callback graph

`hud` names a readout by id, with a `kind` of `bar` or `text`, an optional
label, and the value or text it holds; `hud-remove` takes one away. The host
keeps each player's readouts in the order they were set, and the world exposes
them to the UI, which draws a bar or a line. A readout is the voice tier
(ADR 0026): it is shown to one player, it is not replicated, and two peers of a
place do not agree on it — the same shape player placement and narration
already have.

Because the guest is not stepped every frame, a readout's value changes only
when the script says so. A meter that fills over time is advanced by a script
timer rather than animated by the host, which keeps the meter's rate a rule the
script owns rather than a second clock the host runs.

## Considered options

- **Give the readout a rate and let the host animate it.** Rejected for now:
  it is a second clock for the host to keep, and a meter's fill is a game rule
  the script can already express with the timer it is given (ADR 0036).
- **Draw the meter into the world as a billboard or a model.** Rejected: it
  would be visible to other players and part of the scene, when what is wanted
  is a private readout over it.
- **Reuse `toast` or `narrate` for a meter.** Rejected: both carry a sentence
  and fade, and neither can hold a value that changes in place.

## Consequences

- `hud` and `hud-remove` join the effect vocabulary, and a `HudReadout` is what
  the host exposes and the UI draws.
- The UI polls the world's readouts on its own frame loop, the way the dialog
  overlay already polls for a dialog, so a changed readout needs no signal.
- A readout is discarded with the run: restarting a place builds a fresh
  interpreter and its HUD starts empty.
