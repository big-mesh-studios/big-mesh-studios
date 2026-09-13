# A script item's optional weapon spec turns the primary button into its trigger

"Zombies: The Mansion" sells guns. Buying, dying, and respawning are all
movement on the same few facts a place script already folds over: `item-give`
puts a gun in a player's inventory, `item-hold` raises it in their hand, and a
death's reset spells out the reverse with `item-take`. The one thing the item
system could not do was fire: every primary-button press reached the wielded
tool, whose sword was the only figure-strike the world knew. This decision adds
an optional weapon spec to the items a script defines and makes holding such an
item swap that press for the weapon's own shot — and, since a zombies game
needs its deaths to end a run whole, closes the loop the other way by telling
the script when one of its own players just died.

```ts
export interface WeaponSpec {
  damage: number;
  reach: number;
  fireIntervalMs: number;
}

export interface ScriptItemDefinition {
  id: string;
  name: string;
  sprite: string;
  stackable: boolean;
  /** The weapon this item is when held, or none for a plain carried item. */
  weapon?: WeaponSpec;
}
```

A place script defines its guns the way it already defines any item, and the
world reads the weapon off the same `heldItem()` call the HUD's held readout is
drawn from:

```ts
dispatch("item-define", {
  id: "rifle",
  name: "Vault Rifle",
  sprite: "axe_diamond.png",
  stackable: false,
  weapon: { damage: 10, reach: 44, fireIntervalMs: 130 },
});
```

## The weapon's three numbers, and the bounds they live inside

`WeaponSpec` deliberately has three fields and no more: the hit points one shot
deals, how far it reaches, and the gap before the next shot may fire. Those are
the whole vocabulary of "shoot at what you point at, on a rate you cannot
spam." Reticle spread, per-material falloff, projectile travel — none of that
survived, because nothing in the mansion demo needs it and every field is a
number every peer has to agree on (ADR 0026).

Like every effect payload, the spec passes through the same validation the
world applies to untrusted bytes: `isWeapon` bounds `damage` to
`MAX_WEAPON_DAMAGE` (1 000), `reach` to `MAX_WEAPON_REACH` (128 world units), and
`fireIntervalMs` to `MAX_WEAPON_FIRE_INTERVAL_MS` (60 000 ms), and `item-define`
rejects `weapon` outright when the shape does not fit. A hostile or buggy place
cannot smuggle an infinite-damage weapon in through its own script.

## The primary button becomes the weapon's trigger

When the held item carries a weapon, a primary press (or a touch tap that
landed on a fighter's body, the same trigger the tools use for a swing) fires
the shot instead of the wielded tool, and the press is consumed so the tool
never also strikes. The shot reuses the world's own strike machinery rather
than inventing a bullet's:

- `pickFigure` aims over the NPCs in front of the player, at the weapon's
  `reach`.
- A nearer solid voxel blocks the way the way it blocks a sword
  (`pickVoxel`): a wall between the player and a zombie is a wall to a bullet
  too.
- On a landing, the figure flashes as struck and the hit goes through the same
  `scriptConsole.hit` call a sword swing makes, carrying the weapon's damage and
  the attacker's standing position. To the place's script the shot is a
  plain `entity-hit` event, identical in shape to any other strike — the
  mansion's kill bounty, knockback, and credit logic never learn there was a
  bullet.

Rate lives engine-side, in the same per-frame `weaponCooldown` that the lava
burn runs on: the weapon's `fireIntervalMs` divides down at the same code point,
because a held weapon's cadence is not something the script should have to
police event by event.

## A death a script can name is a death the script hears about

The `player-died` event kind has existed since ADR 0041's hazards, but only the
void and falls ever authored it. `dealDamage` in `create-voxelscape.ts` now
calls the console's `died(cause)` the moment the last damage lands
(`health.dead`), so every named death reaches the place's rules: the mansion
uses it to run its whole reset — cash to zero, every gun taken, every breach
reboarded and resealed, the round kept — while `dont-poop-yourself-at-school.ts`
keeps its existing `player-died` fallback and gained a cause to tell it apart.

## Considered options

- **Weapons as a separate kind of hand-tool, defined and fired through a
  second vocabulary.** Rejected: guns are already items — bought with money,
  taken on death, re-given at respawn — and a parallel "weapon" concept would
  need its own define/give/take/clear effects, its own HUD path, and its own
  bounds, all duplicating what the item effects already do.
- **No `weapon` field; the script listens for primary presses via a new
  `player-fired` event and computes the shot itself.** Rejected: the world
  already has aiming, bodies, occlusion, and a hit call; re-implementing a
  ray from within the sandbox would duplicate `pickFigure`/`pickVoxel` and put
  the fire cadence back in script hands.
- **Cooldown as script-side bookkeeping over `entity-hit` timestamps.**
  Rejected: every mash of the button would still reach the script, and two
  peers' clocks would have to agree on the throttle; the engine already time-
  steps its own tools and hazards.

## Consequences

- A place script can now define and sell weapons with `item-define`'s `weapon`
  field; a held item without one (or nothing held at all) leaves the primary
  button exactly where it was, on the wielder's tool.
- The weapon spec is a validated part of the `item-define` effect payload
  (ADR 0049), so it travels through the same replication every item fact does
  and is bounded the same way.
- Shots land through the existing `entity-hit` flow — no new event kind, no new
  script-side vocabulary for bullets; `demos.test.ts`'s host helpers exercise
  them through the same `host.hit` path as a sword.
- The mansion demo (and any future gun-toting place) gets its death reset for
  free, because `dealDamage` now authors `player-died` with the cause.
