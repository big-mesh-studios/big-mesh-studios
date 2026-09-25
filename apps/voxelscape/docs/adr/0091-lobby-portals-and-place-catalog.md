# The root lands on a Lobby whose portals open built-in demos, and whose arcade opens the place catalog

The world's own root address, which used to serve the `home` demo, now serves a
new `lobby` demo: a flat plaza ringed by walk-in portals, one per built-in demo,
with an arcade prop in the middle that opens the place catalog — the search over
published places a player can enter.

## The root lands on a hub, not on terrain

`App.tsx` opens `HOME_DEMO_ID`, the demo it routes to whenever no place is
named. That used to be `home`, a tile of pleasant terrain; a visitor to the
root saw scenery but no hint that other worlds existed. The root now lands on
`lobby`, where every other built-in demo is visible as a glowing arch and
reachable on foot, and the catalog is a step away. The `home` demo still exists
and still runs; it is simply no longer the root.

Each portal is a target a `portal` map in the lobby script describes: the voxel
ring half-width of an arch, the standing zone's world extent at the arch, and
the demo id and shown name. The script stands an arch of greystone columns and
a brick lintel from its `onPlan`, plays a looping `spark` emitter and a `light`
at the arch, shows the demo's name on a `billboard` overhead, and defines one
`zone` per portal. A player who walks into a zone is sent to the demo through
the same `teleport` effect and routing every place uses — `demo:<id>` — so a
portal is a prop and a zone, not a new kind of navigation.

The arcade gets a `prompt` ("Search places") instead of its own zone: using the
arcade triggers the script's `openCatalog()`, which opens the catalog through a
`catalog` effect. The `catalog` effect is voice-tier, like the HUD and the
cutscene: it is shown to one player, never shared, and it is a UI request, so
no fact is authored for it — the world decides what to make of it. It carries an
optional seed, the handle or DID the search should start on; the lobby opens
with no seed, so the catalog falls back to the player's own account.

## Considered options

- **Keep the root on `home`, with the portals added around it.** Rejected: the
  `home` demo's quarter-acre of boulders and trees has no plaza to ring, and
  editing it to hold a hub would remake it anyway. A fresh `lobby` demo is the
  hub on purpose.
- **A portal per demo on the world's own micro-route list.** That was already
  how navigation worked; walking through an arch just calls it. What is new is
  the fixed visual vocabulary of the arch, the zone, and the billboard, so a
  player learns in the lobby what to look for anywhere else.
- **Reach the catalog only from the lobby's arcade.** Rejected: the catalog is
  now a first-class part of the interface, so `B` opens and closes it anywhere,
  and a compass button on the hotbar reachable on coarse pointers (which have
  no `B` key) does the same. Only the lobby's arcade triggers it from a script.
- **Give the catalog its own route and page.** Rejected: the catalog is a sheet
  over the running world, and choosing a place navigates like any other pick.
  There is nothing a page could show that the sheet does not.

## Consequences

- `demos.ts` carries the `lobby` demo (with the `arcade` model) ahead of the
  others in `BUILTIN_DEMOS`, and `App.tsx` names it `HOME_DEMO_ID`.
- The `catalog` effect, the `openCatalog()` helper, and the `onCatalog`
  callback on the script host and console were added so a script can open the
  world's catalog the same voice-tier way it toasts or ends.
- `PlacesBrowser` draws the catalog from the world's `catalog` accessor,
  answers a handle or DID through `PlaceLibrary.list`, and navigates on a pick
  the way a teleported player would — `window.location.hash` to the place's
  `handle/name` route, which the router already serves.
- `EditHud` gains the compass button; `B` and the button both dispatch the same
  `toggle-catalog` window event the level editor already uses for inventory.
