# A script holds the camera behind a figure it is driving

A camera shot names where it goes before it plays, which is what a cutscene is:
a list of fixed stops. A car a script moves itself has no pose to name in
advance — it is wherever the player steers it this frame — so the chase view a
driving game needs could not be authored. This adds a follow camera: a figure
to sit behind and how far back, above, and ahead to look, held until the script
clears it.

```ts
// effects.ts
| { tag: "camera-follow";       payload: { player; entityId; back?; up?; lookAhead?; fov? } }
| { tag: "camera-follow-clear"; payload: { player } }
```

## The world samples the figure's live pose every frame

`camera-follow` stores the figure id and the offsets; the world's camera step
reads the figure's current world pose — the same pose a query answers with,
which for a driven prop is where the script last moved it — and places the eye
`back` behind the figure's heading and `up` above its feet, looking `lookAhead`
ahead of it. It runs after the player's own camera is placed and does nothing
while a cutscene owns the view, so a scripted shot still wins for its moment.
The follow is voice-tier: each peer follows the figure for its own local
player, and nothing about it is replicated.

## Considered options

- **Re-issue a `camera` effect every tick.** Rejected: each issue starts a new
  one-shot sequence from the live camera pose, so the view would never settle,
  and it authors a camera sequence per frame where one stored target does.
- **A seat's yaw alone.** Rejected for a car: the seat turns the player to the
  car, which aligns a third-person view, but the camera keeps the player's own
  height and distance and cannot sit behind and above a moving body.
- **A first-person camera inside the car.** Rejected as the only view: a voxel
  car has no interior to see from, and the cube hidden in first person leaves
  nothing of the vehicle on screen.
- **A camera owned by the prop's model.** Rejected: where a view sits is the
  player's, not the model's, and the offsets are the script's to choose.

## Consequences

- `camera-follow` and `camera-follow-clear` join the vocabulary; the host
  stores the target per player, and the world places the camera from a
  figure's live pose.
- A script can hold a chase or over-the-shoulder view on any figure it moves,
  which with a driven prop and the local input read is a driving camera.
- The view is per peer and not replicated, so every peer follows its own
  player's body.
