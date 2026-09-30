# A place script shows one player an overlay of panels and buttons

A script could show a fixed HUD bar, a dialog, or a toast, and nothing a player
could press outside a conversation. A shop, an inventory, a menu, a scoreboard,
or an avatar picker all need the same missing thing: an overlay the script
composes and the player presses. This decision adds a small scripted UI — panels
docked to a screen corner, each holding labels, bars, buttons, and item-sprite
images — and the fact a button press becomes.

```ts
// effects.ts
| { tag: "ui-panel"; payload: { player; id; title?; anchor? } }
| { tag: "ui-label"; payload: { player; panel; id; text; color? } }
| { tag: "ui-bar"; payload: { player; panel; id; label?; value; max } }
| { tag: "ui-button"; payload: { player; panel; id; label; value? } }
| { tag: "ui-image"; payload: { player; panel; id; sprite } }
| { tag: "ui-remove"; payload: { player; panel; item? } }

// events.ts
| { kind: "ui-clicked"; panel; button; value? }
```

## The UI is voice-tier, like the HUD, with a press that is a fact

A panel is shown to one player and never converges, the way a HUD readout and a
narration line are — it is a notification, not shared state. A press is a fact:
the world reports `clickUi(player, panel, button)` and the host looks the button
up in the tree the script built, so the `ui-clicked` fact carries the button's
own `value` and a peer cannot forge a button that was never shown. That keeps
the same shape every other player action has: the observing peer authors the
fact, and every peer's script folds it.

## Panels dock to a corner and stack their items

A panel names one of four corners and holds its items in the order the script
set them, so a script builds a shop by adding a label, a bar, and buttons, and
updates a bar in place by dispatching the same id again. Layout is a column of
items inside a docked box: responsive, mobile-friendly, and something a script
can reason about without a layout engine. Images draw from the world's item
spritesheet, so a button can carry the item it buys without a place supplying
an image of its own — the same fixed-vocabulary boundary the sound, particle,
and decal effects keep.

## Considered options

- **A general instance GUI (frames, layout, anchoring per element).** Rejected:
  it is an entire UI toolkit behind an untrusted boundary, where a docked panel
  with rows covers what a game actually asks for.
- **Absolute positioning from the script.** Rejected: it reads badly across
  phone and desktop, and a script should not have to know the viewport.
- **Place-supplied images.** Rejected: it needs a place asset pipeline, where
  the item spritesheet and the decal glyphs already cover the common cases.
- **Buttons as entity interactions.** Rejected: a shop is not a thing in the
  world; an overlay with buttons is.

## Consequences

- `ui-panel`/`ui-label`/`ui-bar`/`ui-button`/`ui-image`/`ui-remove` join the
  vocabulary, `ui-clicked` joins the facts, and the lib gains matching helpers.
- A script can now build shops, inventories, menus, scoreboards, and pickers,
  and an avatar picker (ADR 0079) falls out of a button whose `value` is a model
  name.
- The overlay is DOM, so it is bounded to a small number of panels and items
  and cannot be used to build an arbitrary application.
