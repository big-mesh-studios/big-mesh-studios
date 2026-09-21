# A player can wear a model instead of the cube

Every player is a cube coloured by their account, and a game that wants
costumes, character picks, or a boss form has nothing to say. This decision lets
a script dress a player in one of the place's own models, chooses a default and
lets the player change it, and shows it to every peer.

```ts
// effects.ts
| { tag: "player-model"; payload: { player; model?; modelUri? } }
```

## The cube stays the body; the model is what is drawn

The player cube is the body the physics, the camera, and the collision use, so
it is not replaced. A worn model is drawn by the same figure renderer an NPC's
model is (`VoxelFigures`), at the avatar's feet and heading, and the cube is
hidden while a model is worn — so a model changes what a player looks like and
nothing about how they move or what they can walk into. The local player's cube
is hidden through `avatar.body`; a remote player's through the avatar renderer,
which keeps the label above whichever is drawn.

## A worn model crosses the mesh as a file the place already shares

A local change broadcasts a `player-model` message carrying the place model file
name, or "" for the cube; a receiver hides that peer's cube and draws the model
with the figure renderer it already bakes the place's models into. Because every
peer in the place shares the attached models, a file name resolves on the
receiver without fetching anything. A live `at://` model (`modelUri`) is carried
in the effect for a later step but is not drawn yet.

## A script sets the default; the player picks through the UI

`player-model` is the script's lever, and the player's pick is the same effect
aimed from a fact: a script shows a panel of `ui-button`s whose `value` is a
model name, and on `ui-clicked` calls `player-model` for `event.producer` and
saves the choice with `data-set`. The place they next join reads it back and
dresses them — so the picker needs no new API, only the UI and data the
preceding decisions built.

## Considered options

- **Replace the cube with a model, physics included.** Rejected: a player's
  body, camera, and collision are tuned around the cube, and a model with a
  different shape would change how the game plays, not just how it looks.
- **A per-player model the world loads from a URL in the message.** Rejected for
  now: every peer in a place already has the place's models, so a file name is
  enough, and a URL would need its own fetch, validation, and trust bounds.
- **The script only, with no player pick.** Rejected: the picker is a button
  whose value is a model name, which the UI decision already made possible.

## Consequences

- `player-model` joins the vocabulary; the lib gains `setPlayerModel` and
  `clearPlayerModel`, typed against the place's models through `ModelsByName`.
- A player's look crosses the mesh; a peer sees the model a player wears.
- A worn model is cosmetic, so a large model does not grant a larger hitbox; a
  model-shaped body is a later decision if a game needs one.
