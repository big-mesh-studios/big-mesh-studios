# A figure the world owns outright is drawn where it stands

`VoxelFigures` draws every figure through one `FigureMotionTrack`, which infers a
velocity from the last two positions a figure was given, projects it forward to
fill the gap, and eases the drawn position toward that projection. That is the
right answer for a figure a script step or a peer report moves, and the track was
written for exactly those. It is the wrong answer for a figure whose position the
world already holds, and the renderer had no way to tell the two apart.

Two figures were being eased that never needed it. A player's own worn model, in
the third person view, trailed roughly a unit behind the body it is drawn on at
the world's move speed; and a level editor's placement slid, because a nudge of
one unit is under the snap threshold, so the track read the edit as a velocity and
coasted the model that way for a second after the editor stopped touching it — past
the point the editor's own highlight box and click silhouette were already reading
from, so the model visibly left its own selection. This decision is the way a
caller says its position is already current.

```ts
export interface RenderedFigure {
  // ...
  /** Whether the drawn position eases toward the position this figure was last
   * given, or stands exactly on the one it is given now. */
  eased?: boolean;
}
```

Absent eases, which is what every existing figure wants. A figure that sets it
false is drawn on the position it is handed and keeps no track at all, so there is
no last velocity of its own to carry it anywhere. Two callers set it: the local
player's worn model, and the NPCs and props a level plan places.

## The split is at the source of the position, not at the size of the move

The track's extrapolation is a guess about a figure that has gone quiet, and a
figure that has not gone quiet is not a guess. Deciding per frame — was the last
report recent? is the figure's speed plausible for what it is? — was the first
thing tried and it cannot work: a figure that has genuinely stopped and a figure
whose report is merely late look identical from inside the track, and the two are
separated only by what the caller knows and the track does not. The world's own
move speed is faster than the track's assumed ceiling, so a moving figure's reports
also read as a plausible walk; no threshold inside the track distinguishes "stopped"
from "late".

So the caller answers it, and the answer is carried on the figure rather than
supplied to the renderer as a predicate over ids. A predicate would have split one
figure's description across two places, and it would have put the renderer's
question — which ids are exact — into the wiring, which is where the knowledge is
not.

## A level plan's figures are exact, and a script's still ease

The two sources of an NPC or a prop are read separately, where they are still
distinguishable. A plan's is a placement the world holds: nothing but the editor
writes it, and every read of it is current. A script's is a figure a step or a
peer's report moves, and it keeps easing. They are drawn in the order they have
always been assembled in, so where both name one id the script's is still the one
drawn.

A script moving an editor's figure needs no separate signal. The `ScriptHost` is
never seeded from a plan, and `applyRemoteNpc` moves only ids the script itself
placed, so the only way a script's movement reaches a plan's figure is an id
collision — and there the script's figure is the one drawn, from the eased path,
as it always was. A `live` flag on the `npc` effect is not stored on the figure:
it is consumed at the effect to decide whether to broadcast, and a peer report that
overwrites a position marks nothing. Recording either would have added a field with
no reader.

## The two figures are not the same kind of thing, and neither is most of the rest

A worn player model and a level editor's placement are the two that were visibly
wrong, but the honest account of the track is narrower than it looks. Of everything
that reaches a `RenderedFigure`, only a peer report is genuinely stale: a static
script figure is read fresh every frame, and a figure on a `MotionSpec` is a pure
function of the shared clock sampled every frame. Both are eased for no reason
either, and dropping them would be a larger change across every place than this
one, so it is not made here.

Remote players are also eased twice, and that is a separate fault rather than a
case of this one: `RemotePlayers.tick` eases the cube, and the figure renderer
eases again what that easing produced. The flag now exists to say so, and using it
there is a one-line change that wants its own record.

## Considered options

- **A second `VoxelFigures` for the local player and the plan.** Rejected: models
  are baked per instance, so a player's own worn model would be solved and baked
  twice, and the model resolution, the gait motions and the block light would be
  wired up a second time to keep it.
- **Snap the drawn position whenever a figure's report is less than a frame old.**
  Rejected: a report that is one frame old is what a moving figure always looks
  like, and the frame gap is the whole of what the extrapolation exists to fill.
- **Lower the snap threshold, or scale the blend by distance.** Rejected: it
  treats a symptom of mistaking an edit for motion. A player moving at the world's
  speed would still trail, just less, and stopping would still coast.
- **Gate the plan's figures on the editor being open.** Rejected: a plan's figure
  is an authored placement whether or not an overlay happens to be up, and gating
  on the overlay would make the same figure draw differently depending on what the
  page is showing, and hand the slide straight back on the frame the editor closed.
- **Make the track's extrapolation cap depend on the figure's own speed.** Rejected
  for the same reason as the threshold: the track cannot know whether a figure has
  stopped or gone quiet.

## Consequences

- `eased` is a per-figure answer, so a caller can turn it off for one figure and
  leave every other figure's motion as it was. Nothing that eases today stops
  easing.
- A figure drawn exactly is in no track, so it holds no velocity across frames. A
  figure that stops is on the last position it was given and stays there, which is
  the sail this decision removes.
- The vertical axis was already exact, and stays so: only `x` and `z` were ever
  eased.
- A worn model in the third person view now stands under the crosshair rather than
  a unit behind it, and stops when the player stops.
- A placement moved from the level editor's properties is on the new position on
  the frame it is committed, rather than sliding toward it and then on past.
- The figure renderer keeps one placement path. The flag is read in one place.
