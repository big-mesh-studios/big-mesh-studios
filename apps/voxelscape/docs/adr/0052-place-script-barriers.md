# A barrier walls a player in without walling anything else

A battle arena wants breaches the horde chews open that stay shut to the
player: windows the zombies pour through that are never a way out, gates that
stay sealed until someone pays. Solid props already block the player, but only
while they stand — a torn board or a purchased door opens the gap to everyone.
This adds a `barrier` effect that stands a box only bodies collide with, so a
script can wall off a route for the player while the world's own inhabitants
still walk through the same opening.

## A barrier is a box that joins the player's solids and nothing else

A `barrier` names a box in world units (`min` to `max`, like a `zone`), and a
`barrier-remove` forgets that id. The world refreshes its prop boxes each
frame, and a barrier's box is pushed into the same list a solid prop's box
joins — the player's collision sees it exactly as it sees a solid prop. Nothing
else does.

That is the whole trick, and it is why the barrier is invisible: scripts steer
NPC movement by sampling terrain (`solidAt`/`heightAt`/`waterAt`), never props,
so a horde routes through the same voxel gap its own side opened. Bullets
hit-test terrain voxels, not props or player solids, so a player can shoot
through the gap a barrier still denies their body. The barrier is drawn
nothing, so a player cannot see, bump, or otherwise hear the wall — which makes
a breached window read as an open hole they still cannot exit through.

## Barriers stand with the props, at the script's boot

A script has its own service in the script host, stored like zones or fields
and reported the same way (`barriers()`/`barrier(id)`). When a run dies, the
arena reseals its breaches but leaves the barriers standing: the windows are
walls to the player in every round, boarded or not, exactly as the game says.

## Considered options

- **Extend `field` with a blocking kind.** Rejected: a field acts on whoever
  stands inside it through the physics sampler's medium read, while a barrier
  acts on nobody — it is a surface the player collides against, so it belongs
  with the solid props in the player's collision list.
- **Move the player toward a doorway in the script instead.** Rejected: a
  teleport clamp fights the physics every frame and only holds while the script
  is listening; a collision box does what a wall does, deterministically.
- **Reuse solid props.** Rejected: a prop wears a model that draws in a gap the
  scene must read as open, and every prop is a thing a player can see and
  interact with; a barrier draws nothing and has no figure to stand.
- **Let the player collide with an invisible model.** Rejected: that makes a
  model the collision source and pins the invisible crevice to whatever voxels
  a file happens to draw, instead of the script author spelling out the box.

## Consequences

- `barrier` and `barrier-remove` join the effect vocabulary and the lib as
  `createBarrier`, the box authored in world units like a `zone`/`field`.
- The mansion stands nine barriers — one per window — at boot and never retires
  them, making its long-standing "never a player's way through, only theirs"
  a fact of collision rather than a hope about the horde's routing.
- Because nothing but the player's body collides with a barrier, it stays the
  single place to wall a player off from routes anything script-steered or
  fired still travels.
