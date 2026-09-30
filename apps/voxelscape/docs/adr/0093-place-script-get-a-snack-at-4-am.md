# The Get a Snack at 4 AM demo ports the original place's own map and gags

The demo began as a proof that a place script can build a world, stand
characters and props in it, and end a game: a small brick house, two rooms the
player walks between, a shop, and a sleep ending. The original Roblox place the
demo is named after is a much larger game, and this decision is which of it the
demo now carries, where the port's data came from, and what it leaves out.

## The place file holds the map and the words, not the game's rules

The port reads the original `.rbxl` place file directly, and what that file
contains decides everything below. Its geometry, its parts and models, its 125
proximity prompts, its 291 text labels, its item names, its store's shelf, and
its twelve ending names are all fully recoverable. Its game rules are not:
Roblox has not saved server scripts from a published place for years, so all 86
of the place's `Script`s are the one-line placeholder that says so, and its 21
client scripts and modules are compiled Luau bytecode rather than source.

So the demo's rules are ported from what the file does still say — the
breakfast pairs, the interaction vocabulary, the sign text, the shop's eight
goods, the twelve endings — and rebuilt on the world's own primitives rather
than translated line by line. The pairs come from the constant table of the
place's compiled `BreakfastCombos` module, where the game's own names and
comments for each pairing survive as strings: "Perfect Breakfast", "Soggy Chips",
"Melted Ice Cream", "That's Not How That Works", and thirty more. What the
file does not hold is the code that chose between them, so the demo matches on
the pairs themselves.

## The house is the original's two by two, with the store across the road

The original house is four rooms on a cross: the bedroom and the bathroom along
its north wall, the kitchen and the living room along its south wall, with the
store to the east past a road and a parking lot. The demo's plan is that shape
at a size that fits the boot plan's region: the same four rooms, the same
cross, a doorway on each arm, the front door on the east wall onto the drive,
and the store with its door on the west wall facing the road.

The forecourt is the original's, and it is where several of the place's gags
live: the parking lot with the cashier's car, the bench somebody left a sandvich
on, the manhole, the stand of trees along the road, and the broken vending
machine on the wall that the place asks you to feed sodas. The car's own sign
line is the original's, an egg held up to it is the original's joke, and the
vending machine's eighth soda floods the shop, which is the ending the place
names `Flood`.

## The plan counts voxels and the rooms count world units

A voxel in this world is two world units on every axis, and a place's boot plan
is addressed in voxels while its rooms, props, and items are placed in world
units. The demo's plan is therefore written at half the numbers its rooms use:
the house the plan draws is fourteen voxels by thirteen, which is the
twenty-eight by twenty-six the four rooms are laid out in, and the store is five
by six, which is the twenty by twelve the shop is. Mixing the two is invisible
in the source and glaring in the world — the first version of this port drew the
plan at the rooms' own numbers, so the building came out twice the size of
everything standing in it. One test reads the compiled plan back and holds the
house floor, the store floor, and the reach of the walls to the sizes the rooms
assume.

## The breakfast machine is what the pairs go into

The original builds a breakfast from two items in its breakfast machine, which
signs itself "Place any two items to create an instant breakfast! IT REALLY
WORKS!" The demo replaced its two plates with that machine, so the pair table
lands where the original puts it, and every pairing in that table is reachable:
the perfect breakfast is a fried egg with milk, a raw egg with milk is
"Pergfect Breakfast", a hot brew with a cold soda is "Balanced Beverages", and a
hot drink on an egg is refused by name. Two items the machine cannot name are
still a breakfast, which is the ending.

Every one of the place's twelve endings is now reachable: `Sleep`, `Chips`,
`Orange`, `Toothpaste`, `Shoplifting`, `Fire`, `Breakfast`, `Flood`, `Freezer`,
`Patty`, `Sandvich`, and `Sword`, alongside the demo's own `Wake up Dad`. Five
are new systems rather than new text — the freezer the place keeps "OUT OF ORDER
DUE TO BEING TOO COLD", the sword on the bedroom wall, the patty and the
sandvich, and the flood — and each hangs off one prop and one item.

## The store sells the place's eight goods, and the demo invents their prices

The place's price list survived only as the names of what it prices: Bloxy Cola,
Witch Brew, Patty, Egg, Milk, Orange Juice, Fuel, and Ice Cream. Those are the
demo's eight shelf goods, and the place's own prompt for each of them survives
in the demo's interaction with it. The numbers are the demo's, chosen so a
player who collects the loose cash can afford the perfect breakfast and still
buy the crate of sodas the flood needs.

The place's break timer is real and is kept: the counter stands unattended after
three minutes and fifty-one seconds, which is what its own sign counted down
from. What the place does not do — the demo does not check that a good was paid
for at the door, only that the player left the shop holding one they never
rung up.

## The port still ships this repository's own models

The place's meshes are another author's artwork and are not imported. Every prop
and item is drawn by this repository's model generator from the size and the
colours the port needs, which is the same rule the Cube Cavern and Raise a
Floppa ports follow. What the port takes from the file is arrangement and text:
which room holds which fixture, which item exists, what it is called, and what
the game says about it.

## Considered options

- **Decompiling the place's client bytecode to recover the rules.** Rejected:
  the bytecode is a compiled form whose control flow needs a decompiler this
  repository does not vendor and cannot fetch, and the game's rules were on the
  server side that Roblox no longer saves, so the best case would have been the
  client half at the cost of a tool the world never sees. The constant tables
  hold the names and the pairings, which is what the demo actually needed.
- **Importing the place's room models and furniture meshes.** Rejected: they
  are another author's assets, and a demo that cannot build its own world proves
  less about what a place script can do.
- **Keeping the two plates as the pair surface.** Rejected: the machine is what
  the original uses, and its own prompt names it, so the pairs moved there.
- **Building the house at the original's real dimensions.** Rejected: the place
  is a little over a hundred units on a side, which does not fit the region a
  boot plan covers around the spawn. The rooms and their neighbours are the
  original's; the scale is the demo's.
- **Sizing the demo's items and prices from the file.** Rejected: the file has
  no prices, and a demo priced in the tens of thousands would end its session
  before it began.
