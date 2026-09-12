# Hazards, a kill plane, and checkpoints make an obby playable

An obstacle course needs three things the effect vocabulary did not carry: a
way for a hazard to be known when it is touched, a way for dying to be a fact
the rules can count, and a place for the player to come back to other than the
world's one spawn. This decision adds all three.

## Touching a hazard is a fact, and what it means stays in the script

A prop marked `hazard` is watched by the world: the first frame the player's
cube overlaps it, the world reports a `player-touched` fact naming the prop.
The world draws no conclusion — it does not damage, kill, or score — and the
script decides what the touch means, the same split the engine already keeps
between a zombie's swing and the rules around it. The touch fires on entering,
not every frame, the way a zone does.

## Killing, respawning, and a floor the player must not fall past

`player-kill` empties the player's hearts at once and starts the death fall
the monsters already use; when the fall has lain out the player stands at their
last checkpoint. `player-respawn` stands them up with no fall, for a script
that has already made its point. `player-checkpoint` records where that is,
given in feet coordinates so it composes with `player-place`. `void` sets a
height below which the world kills the player, which is how a fall off a high
course ends before it reaches the schoolyard.

The player's death is authored as a `player-died` fact, with a cause the
script may label, so a game can count deaths and react to them the way it
reacts to any other event.

## Considered options

- **Have the engine kill the player when it detects a hazard.** Rejected:
  damage and death are already the intersection of the monsters' attacks, the
  sword, and the script's rules (ADR 0038); a built-in hazard death would be a
  fourth source that has to reconcile with all of them.
- **Make the checkpoint an atproto record or shared state.** Rejected: a
  checkpoint is one player's place to return to, not a world fact every peer
  converges on, and it must reset with the run rather than outlive it.
- **Kill the player from a timer the script sets for the fall.** Rejected: the
  world already samples the player's height each frame for lava, so it can see
  the floor crossed directly and author the death at the moment it happens.

## Consequences

- `player-touched` and `player-died` join the event vocabulary, and
  `player-checkpoint`, `player-kill`, `player-respawn`, and `void` join the
  effect vocabulary.
- The world keeps the respawn point and the kill plane, and clears both when
  the place restarts; a fresh interpreter has no memory of the last run's
  checkpoints.
- `prop.hazard` is independent of `prop.solid`, so a hazard can be a sign the
  player walks through or a wall they collide with.
