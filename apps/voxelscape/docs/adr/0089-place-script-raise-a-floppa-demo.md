# The Raise a Floppa demo runs a compressed long-form care loop

The Raise a Floppa demo is a port of the Roblox game of the same name, whose
full arc is far larger than one sitting: a care loop, a shop of two dozen
helpers, raids, the backrooms, time travel, and an ascension ending reachable
only after hundreds of millions of dollars. This decision is which of the
original's systems the demo keeps whole, how it bends the ones it keeps to fit
a single session and this world's primitives, and what it leaves out.

## The demo is the original's loop, not a slice of it

The demo keeps every system the game is known for, in the order a player meets
it: hunger and happiness that fall over time, money that falls from petting,
the Interwebs shop's food and helpers, the bowl and the litter box, the mess a
meal leaves behind, Ms. Floppa, the Neko Maid, the roommate's rent, the catnip
high, the dawn raids, the yellow backrooms behind the night door, the Faith
Altar's ascension, and the Time Machine's ride through past, future and
eternity. It is the long-form port rather than a core slice: a system left out
would not be a smaller game but a different one, because the original is the
sum of its interlocking errands.

## The economy is compressed for one session

The source's shelf runs from a five-dollar tin of food to a sixteen-million-
dollar ascension, and its rents and catnip farms scale into the tens of
thousands. A solo demo at those numbers could not reach an ending, so every
price, rate, and donation is bent down by two or three orders of magnitude
while keeping the shape of the shelf: food in tens of dollars, helpers in
hundreds, the Time Machine at a thousand, and the three altar offerings summing
to exactly the hundred percent the source asks for. The numbers live in one
table (`raise-a-floppa-care`), so they are what the demo's one session was tuned
against rather than scattered through the rules.

## Hunger is the health bar, and the bowl feeds the cat

The original ties hunger and health into one stat, and a starved Floppa
explodes. The demo keeps that: the hunger bar is the cat's health, a meal
raises it, and a raid's blow or a long neglect that empties it ends the game
with the source's own ending, "You Monster". A meal can be given to the cat
directly or dropped in the bowl; when the cat is hungry and the bowl holds
food it walks over and eats on its own, and the litter box decides whether the
mess lands in the box or on the floor.

## Raids are scripted NPCs stepped like monsters

The dawn bandits are raw `npc` figures the demo steers itself, the way
`cube-cavern-mobs` steers the cavern's bestiary, rather than engine monsters:
each closes on the cat, strikes it on a cadence, and falls to the player's
sword through the same `entity-hit` fact a dungeon monster answers. A bought
Guard Doge bites whatever comes near. A raid begins only from the third day,
so a new player meets the loop before it meets a threat.

## The cat's care falls faster than the original's, and a lost run is forgotten

Hunger and happiness fall on their own timers, so a session is minutes rather
than hours, and the backrooms' sanity drains in seconds. Money, the shelf
purchases, faith, the Time Cube, the days survived, the roommate's rent and the
time-stops already visited are remembered through the data helpers, so closing
the tab and reopening resumes the run; the cat's current hunger and happiness
are not remembered, and begin full each time. A cat that starves or falls to a
raid ends the run with the source's own "You Monster", and that death forgets
the run's remembered values, so the next run starts from nothing but the best
day count. The split is the most visible bend from the source, where a save
carries the pet's whole state: a demo that reopened a starved cat would punish
the player for closing the tab, and a demo that let a dead cat keep the wallet
would have no game over at all.

## The day-night clock is pinned, and night opens the backrooms

The world's own clock is pinned at day and told to jump to night every minute
and a half, rather than left to run its own cycle, so the rest of the world's
day-night behaviour stays out of the demo's way while night still looks like
night. At night the west door in the yard's fence opens onto the yellow
backrooms — a sealed hall built into the site plan, with its own sanity bar, a
Screeching Bingus that chases, a Dark Web vendor, and a way home. Reaching zero
sanity wakes the player at home, a little hungrier.

## Considered options

- **The full long-form economy with real prices.** Rejected: the original's
  numbers reach the millions because its players idle for hours, and a demo
  that could not reach its own ending is not a demonstration of it.
- **A care loop with no raids, backrooms, or time machine.** Rejected: those
  are the parts a player remembers, and each is a different way the world's
  primitives carry a script — NPC AI, a second site, a camera-free sequence of
  narrated stops.
- **Engine monsters for the bandits.** Rejected: the world's monsters are
  addressed by terrain seed and cell, and a raid that visits the house must be
  the script's own population, not the terrain's.
- **Persisting the cat's live stats too.** Rejected: a starved cat greeting a
  returning player is a punishment, not a save, and the wallet is what the shop
  needs to survive.
- **Calling out to a hand-authored backrooms model set.** Rejected: the demo
  ports mechanics, not another author's assets; the yellow hall is plan boxes.
