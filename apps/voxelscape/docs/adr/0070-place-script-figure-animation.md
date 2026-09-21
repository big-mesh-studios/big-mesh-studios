# A place script plays a model's motions on a figure, and voxel-rigger exports them

A scripted figure could be placed, turned, and moved, and it could not move its
own parts. The zombie walked as a rigid box; a wave, a swing, a death throe, or
any pose beyond a whole-figure `motion` was out of reach. The model format
already carries animated motions — rm-stacker writes them, `modelDescriptorFor`
already lists their names, and `voxel-rigger` authors them from glTF skeletons
— so what was missing was a way for a script to choose one and for the world to
play it. This decision adds `figure-animate`/`figure-stop`, samples the motion
on the shared clock, and adds the export on the rigger's side that makes the
two ends meet.

```ts
// effects.ts
| { tag: "figure-animate"; payload: { id; name; speed?; loop? } }
| { tag: "figure-stop";    payload: { id } }
```

## The world samples the motion; the script only names it

The host keeps the chosen `{ name, speed, loop }` on the figure, and the
renderer looks the motion up in the model's own saved motions and poses the
figure each frame. The frame is derived from the **shared clock**, not the wall
clock, so two peers watching the same figure see the same pose — the same
determinism a `motion`'s path already relies on. The host never needs the
motion's contents: an unknown name is a silent rest pose, and a script names a
motion exactly as the model's file does.

An animation survives a `move` or an attribute change because the host carries
it over whenever it replaces a figure's record; `figure-stop` is the only thing
that clears it. A `play` call and a `walkTo` can therefore be used together
without one erasing the other.

## Rendering poses a baked copy instead of re-baking

`BakedFigure` solves each part's volume and box once and hands out copies for
drawing many figures. A motion only moves parts about, so the volumes never
change: a new `FigureCopy.stand(placement)` re-stands the existing part meshes
from a placement computed off the posed figure. No volume is re-solved and no
texture re-uploaded to play a motion, so a crowd of animated figures costs the
same uploads as a crowd of still ones.

## voxel-rigger bakes a rig's motion into the model's motion

The rigger animates a **skeleton** of bones with parts bound to them, which the
model format does not carry: a model motion moves parts directly. `bakeMotion`
bridges them — it flattens the figure so each part stands parentless, samples
every bone at each key of the rig's motion, reads each bound part's world
transform off its bone, and writes it as that part's key. `writeAnimatedModel`
saves the flattened figure with that motion, and the rigger's **Export** button
uses it. A test holds the bake to the rig: posing the baked motion at a key
must put each part where the rig put it, including after a round trip through
the zip.

## Considered options

- **Ship a separate animation file the world loads.** Rejected: the model zip
  already has a motions list, `modelDescriptorFor` already reads it, and a
  second file would need its own fetch, validation, and pairing rules.
- **Have the script step the pose each tick.** Rejected: it would push per-part
  transforms across the effect boundary every frame, and a figure a peer draws
  from a broadcast would need the poses replicated rather than recomputed.
- **Make voxel-rigger the only producer.** Rejected: a model motion is part of
  the stacker format, and rm-stacker can write one too; the world reads the
  format, not the tool.

## Consequences

- `figure-animate`/`figure-stop` join the vocabulary; `NpcHandle`/`PropHandle`
  gain `play`/`stop`, typed against the model's real motion names through
  `ModelsByName`.
- A figure's animation is voice-tier in presentation but deterministic in
  content: every peer computes the same frame from the shared clock.
- `voxel-rigger` gains an **Export** that writes a model zip the world plays;
  the bake is the compatibility seam between the two apps.
