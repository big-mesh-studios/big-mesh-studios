# A player chooses an avatar, and walks it

A player is a cube coloured by their account, and a cube cannot walk. A place
script can dress a player in a model (ADR 0081) but has no say in what that
model does once the player moves, so a walking figure slides along as one rigid
pose however fast it goes. The model format already carries motions, the figure
renderer already plays one a script names (ADR 0070), and nothing bridges the
two: the player's speed is on the client and the model has no way to be told it.
This decision adds the bridge — an avatar kind the player picks, a gait read off
their own speed, and a baked model for the world to wear one as.

```ts
// effects.ts
| { tag: "player-avatar"; payload: { player; kind } }
| { tag: "player-model";  payload: { player; model?; modelUri? } }
```

## An avatar kind is a look, and the world owns which

`cube` and `human` are the two kinds. The cube is a model file of no name: it
is what a player is drawn as when nothing else is, which is what makes adding a
second kind an addition rather than a change. A kind says what stands at the
player's feet, how tall it is drawn, and which of its model's motions play for
which role — nothing about the body, which stays the cube the physics, the
camera and the collision all use.

The player's kind is read from the page's own storage and written when they
change it with `/player:avatar` or a script's `setPlayerAvatar`, so it survives
a reload and follows them into every place. A place script's `player-model`
still dresses its players for the place they are in (ADR 0081) and does not
become the kind they carry into the next, which is what lets a game have a boss
form without a player leaving it wearing the boss. The two effects differ on
purpose: a kind is who a player is and is remembered as theirs, while a model is
what one place dressed them in and is forgotten on the way out.

`setFigure` takes a `LoadedFigure` rather than a `Figure` and a separate list of
motions, because a `LoadedFigure` answers to a plain `Figure` too: the world's
four sites that bake a model by file name were handing over the figure and
leaving the motions to default to nothing, so every model the world loaded from
a file stood still however it was moved. Nothing had noticed, because every
model bundled before this one was written in the older format and had no motions
to lose. Taking the figure and its motions as one value is what stops a caller
from dropping them again.

## The gait is counted in strides, not seconds

A gait is a role — `idle`, `walk` or `run` — and a phase in cycles of whatever
motion plays that role. The phase advances by ground covered over a stride, not
by elapsed time, so a player's feet keep step with the ground under them however
fast they are going and however long their model's clip is. The role is read off
horizontal speed with a gap between walking and running, so a player on the
boundary holds the clip they already had instead of swapping several times a
second, and a change of role starts the new clip at its first key.

The renderer converts the phase to a frame by the chosen motion's own run rather
than its frame rate. A clip keyed 33 frames at 30 a second is 1.1 seconds long,
not one, and counting in seconds would leave the last stride hanging past the
loop — a pop at every seam. One stride is one whole cycle of the clip playing.

A role the model does not carry falls to the one below it that it does: a model
with a walk and no run walks at any speed, and one with no idle stands still
rather than marching on the spot. The role names a model is authored against are
`idle`, `walk` and `run`, and the baked human carries exactly those.

## A peer is walked by what it reports, not what it is told

The mesh still carries one thing about how a player looks: a model file name.
A peer's gait is inferred from the last two poses that arrived, and the speed
goes stale past the window the drawn position stops extrapolating at, so a peer
that stops moving stands still. Nothing about the gait is replicated, and two
peers drawing the same player from the same reports agree on the pose because
the phase is a function of the distance travelled rather than of the clock.

`PlayerGait` lives in the player area and the gait vocabulary with the figure
renderer that resolves it, since a role name and a phase are what a figure is
drawn at and the thresholds that produce them are the player's. The renderer
takes the role names as a parameter rather than importing the registry, so it
holds no opinion about which models can walk.

## The human is generated, not drawn into the world by hand

`voxel-rigger` already bakes a rig's motion into a model motion so a world that
only knows the model zip can play it. Its bake covered one motion per export,
which named the file after the clip, so a walk and a run could not both reach
one model; it now bakes a whole set at once and the Export button writes them
together. A script under that app reads the rig and the body, binds the parts
to the bones their names carry, and writes `player-human.zip` — so the world's
copy is a command away rather than a download somebody made once.

## Considered options

- **A figure-shaped body.** Rejected, and this is ADR 0081's decision rather
  than a new one: the physics, camera and collision are tuned around a cube,
  and a model's different shape would change how the game plays.
- **Let the script drive the animation by speed.** Rejected: a script learns
  nothing of a player's velocity, would be pushed per-frame pose updates, and
  every peer would need the result replicated rather than recomputed.
- **Drive the phase off the shared clock**, the way a script's `figure-animate`
  is sampled. Rejected: the legs then slip against the ground whenever the
  speed changes, and two peers watching one player disagree at the boundary.
- **Carry the gait over the mesh** as a pose stream. Rejected: a pose is five
  numbers a peer already sends, and the speed is recoverable from two of them —
  a second channel for a derivation both sides can make is a channel that can
  disagree.
- **Blend the walk into the run** rather than choosing between them. Deferred:
  the model format poses a figure at one frame of one motion, so a blend is a
  second motion to bake and interpolate, and a threshold already reads.

## Consequences

- `/player:avatar` chooses a kind, with no argument reporting the current one,
  and `setPlayerAvatar` does the same from a place script. The world comes up
  wearing whatever the page last chose. A picker is a later step; the command
  and the script call are the whole surface for now.
- Every model the world bakes from a file now carries its motions, so a figure a
  script dresses a player in can animate too — and a place's own animated model
  plays its motions for the first time.
- A worn avatar is drawn in the third person view only, since it stands where
  the first person eye is.
- A player whose avatar is walking and who slows below walking speed rests in
  its idle clip, and drops to the rest pose in the air.
- The stride a world-level avatar declares is in world units, and the world's
  move speed is fast enough that a human avatar takes strides several times its
  own height. Lowering `/player:speed` brings the two into agreement, which is
  what a slower move speed would want to check.
- A model a place script dresses a player in is not an avatar and has no gait;
  it stands in its rest pose however fast the player moves.
