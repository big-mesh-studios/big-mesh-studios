# The level editor selects planned NPCs and props

The select tool used to name only the nearest structure the cursor ray crossed.
An NPC or prop a creator had placed could be edited from the plan list and its
properties panel, but not picked with the same click that picked a house or a
staircase, so selection did not match what the creator sees.

## Selection is one pass over every item, tested as its own body

`pickItem` replaces `pickShape` as the tool's pick. It runs the ray over the
whole plan — structures, NPCs, and props — and takes the nearest crossing, so a
figure standing in front of a wall beats the wall as a click, and a structure
nearer than a figure beats it back. The old structure behaviour is untouched:
a `box` the ray starts inside is still skipped, so a creator standing inside a
carved box can select what they built in it, and the ADR 0056 consequences still
hold for every structure item.

An NPC or a prop is tested against the exact upright body the player's own
crosshair aims at — `places/figure-pick.ts`'s `pickFigure` — counting a body
that is not square in plan at its turned silhouette. The body's half-width and
drawn height come from the model it wears once that has loaded (`VoxelFigures`
remembers each model's proportions), falling back to the default body of half a
metre by two metres before the model arrives. The feet height is the plan's own
`y`, resolved from the terrain where the plan left it unset, so a creature
standing on a hill (or a prop whose model was never fetched) sits where it
draws.

Choosing the same geometry the player aims at means the editor is WYSIWYG: a
prop a player could not click in the world because a vending machine's model
is wider than a person cannot be hidden from the editor by its own silhouette.

## Considered options

- **Keep picking only structures.** Rejected: the properties panel already
  edits figures, and a click that finds nothing while a figure is clearly under
  the cursor reads as a broken select.
- **Test every figure as the default body.** Rejected: a wide or short model
  gets a body that does not visually match it, recreating the mismatch this ADR
  exists to avoid.
- **A two-pass pick (structures first, then figures).** Rejected: priority by
  kind is arbitrary; one pass keeps the nearer item winning regardless of kind.

## Consequences

- The select tool reports an item index into the whole plan, exactly the index
  the list panel and the properties panel already edit.
- The highlight box sizes itself to the selected figure's body and turns to its
  heading, matching the shape highlight's box for a structure.
- `pickShape` remains as a convenience for callers that want only structures;
  `pickItem` is the editor's own pick.
