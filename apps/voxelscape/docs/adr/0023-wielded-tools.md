# Wield every hotbar item through a tool of its own

The bronze sword is the first inventory item that is not a placeable block, and
it was added by branching on its id wherever it had to behave differently.
There are six such branches. The frame loop picks a monster instead of a voxel
when the sword is selected (`create-voxelscape.ts:511`) and skips the place
action when it is (`:528`). `HeldItem` draws its mesh and runs its swing only
while the sword is the selection (`held-item.ts:139`), and is otherwise
hardwired to one model, one hand scale, and the pose table in `swing.ts`.
`Inventory` carries a `TOOLS` record with a guard against it in both `add` and
`remove`. `EditHud` chooses the sword's spritesheet icon over an item's first
letter. A pickaxe, a bow, or a shovel means editing all six.

Two smaller problems share that cause. The crosshair's `inReach` is a single
boolean standing for two different questions — whether a voxel is under the
crosshair, and whether a monster is within swing reach — which is why it lit up
over empty air until the frame loop was taught which question to ask for which
selection. And `SWORD = 4` sits inside the voxel id space: the inventory
identifies a block item by the voxel id it places, because `placeBlock` writes
`selectedId` into the world directly, so the sword needed a number no voxel had
taken, and 4 is exactly the free slot between `VOXEL_WATER = 3` and
`VOXEL_CLOUD = 5`. A later `VOXEL_SAND = 4` would be silently refused by
`Inventory.add`, would select the sword through `setSelected`, would draw a
sword in its own hotbar slot, and would fire all six branches — with no type
error and no exception anywhere.

## Decision

Every hotbar item resolves to a **Tool**: an object that says what its
crosshair looks for, what each button does, and how it is drawn in the hand and
in the hotbar. A dirt slot is a `BlockTool` closed over `VOXEL_DIRT`, wrapping
the existing `EditingController`; the sword is a `SwordTool`. Nothing in the
frame loop asks what is selected any more — it calls `pick`, the two button
actions, and `update` on whatever is wielded.

```ts
interface Tool {
  pick(): ToolPick;
  primary(pick: ToolPick): string | null;
  secondary(pick: ToolPick): string | null;
  update(dt: number, buttons: InputSnapshot): void;
}
```

An action both acts and starts whatever animation it has, so no button edge is
read in two places; `update` advances time and holds the guard.

### What the two buttons mean

The primary button strikes what the crosshair is over; the secondary button
uses the wielded tool. `SwordTool`'s primary strikes the nearest of a monster
within 5.4 units or a voxel within 9, so the sword damages what is close and
digs what is not, and its secondary raises a guard while it is held.
`BlockTool`'s primary breaks the targeted voxel and its secondary places into
the cell against the targeted face.

This is Minecraft 1.9's rule for the primary button — the target picks the
verb, not the held item — with the pre-1.9 sword's right-click guard for the
secondary, which 1.9 removed only because shields took over the button from an
off-hand slot this world does not have. The two reaches keep their present
ratio, which already nearly matches Minecraft's three units to entities against
four and a half to blocks.

Because block reach exceeds sword reach, any wall standing between the player
and a monster within sword reach is itself within block reach, so taking the
nearer of the two picks is what stops a swing landing through terrain. No
occlusion test is needed beyond choosing the nearest.

### What a pick is

`Tool.pick()` returns both of the frame's targets at once:

```ts
interface ToolPick {
  primary: Target | null;
  secondary: WorldVoxel | null;
}
```

`Target` is a tagged value naming a monster or a voxel, and it replaces
`inReach`. The crosshair reads `primary` alone, and it now means one thing
whatever is held: the primary button has something to act on. `secondary` is
the cell a placement would fill, and is geometry rather than permission — a
tool's `secondary` action still validates and returns its own message.

The frame loop picks once and passes the result into the actions, rather than
each action picking again. Today a single dig raycasts the world twice, once
for the crosshair and once inside `EditingController.breakBlock`.

### The crosshair

`voxelscape-context`'s `inReach` accessor becomes a `target` accessor carrying
the `Target`, and the crosshair draws a colour per state: a dim white when
there is no target, solid white on a voxel, and the hearts' `#d22f35` on a
monster. That gives the interface one red, meaning damage, and answers the
question the sword's shorter reach makes the player ask constantly — whether a
monster is close enough to hit yet.

### How items are declared

Item ids become their own space, disjoint from voxel ids, and are strings.
`ItemId` is a union written out by hand, and every item is declared once in
`ITEMS`, typed `Record<ItemId, ItemDefinition>` so that a duplicate key is a
compile error and a missing one is too. Deriving `ItemId` from the literal
instead is what the type system refuses: an entry's factory is typed in terms
of `ItemId`, so `keyof typeof ITEMS` would put `ITEMS` in its own initializer.
A tool cannot be built at module scope —
`BlockTool` needs the `EditingController` and `SwordTool` needs the monsters,
the mesh, and the player's look, all of which are built inside
`createVoxelscape` — so each entry holds a factory taking a `ToolContext`, and
`createVoxelscape` builds that context once and calls every factory with it.

A block item carries its voxel id as data on its tool rather than being one.
The two spaces then meet in exactly two places, which are the only two
operations crossing between the world and the hand: `BREAK_YIELD` translates a
broken voxel to the item it yields, and each `BlockTool` translates its item
back to the voxel it places.

### The guard

`PlayerHealth` gains a `guarding` flag that halves the damage `takeDamage`
applies, and `SwordTool` sets it through an `onGuard` callback wired in
`createVoxelscape`, the same shape `EditingController`'s `onEdit` already has.
Guarding is a state of the player rather than of the tool, so a shield in a
later off-hand would raise the same flag, and the generic `Tool` interface
never learns that guarding exists.

Both places a zombie's swing reaches health — the local branch at
`create-voxelscape.ts:201` and `onRemotePlayerDamage` at `:326` — run on the
victim's own client, which is already where authority over a player sits, so
neither call site changes and nothing new is broadcast. The guard halves rather
than negates, and does not require facing the attacker; a facing arc is what
distinguishes a shield, which is a separate item.

### The hand

`HeldItem` becomes `Hand`: it holds a mesh per item that has a sprite, shows
the wielded one, and applies the pose that tool's `update` returned. Each tool
owns its own timing and pose maths, so a bow's draw or a pickaxe's hold-to-mine
owes nothing to the sword's, and no tool touches the scene graph.
`createVoxelscape` loads the sprites `ITEMS` names and hands each model to
`Hand`, the way it already loads the monsters' model and the sword's.

The sword swings on a tap rather than a hold, so the wind-up stops being a
charge; `PULLED_POSE` becomes the pose the guard holds the sword in.

The swing belongs to the primary button rather than to what the button hit, so
one animation covers digging and fighting alike, and it plays on a press that
strikes nothing at all.

### Input

`break`, `place`, `placeHeld` and `placeReleased` become `primary`,
`secondary`, `secondaryHeld` and `secondaryReleased`. This is a rename with no
new fields: block-editing vocabulary stops naming buttons that a bow will also
use, and each existing edge keeps its present meaning.

Nothing about the touch controls moves. A canvas tap already queues the primary
edge and the green `ActionButton` already reports a held secondary, which is
exactly the pairing a tapped swing and a held guard need.

## Considered options

- **Leave blocks on the existing place path and give only non-block tools a
  `Tool`.** Rejected: the frame loop and the hotbar would each keep a branch
  asking whether the selection is a block or a tool, which is the same shape of
  branch this replaces, only counted differently.
- **Minecraft 1.9's sword unchanged**, where the secondary does nothing.
  Rejected because 1.9 could empty that button only by giving it to an off-hand
  shield and to interactable blocks, neither of which exists here — copying it
  would import the emptiness without the things that fill it, and leave the one
  holdable touch input dead whenever the sword is out.
- **The pre-1.9 sword unchanged**, attacking monsters only. Rejected because
  breaks here are instant, so a sword that cannot dig forces a slot change to
  clear one voxel and buys nothing back: the mining penalty that makes the
  trade fair in Minecraft has no time to attach to.
- **A wireframe box on the placement cell**, so the two buttons could target
  different things and both stay legible. Set aside once the sword's secondary
  became a targetless guard: no tool has two targets in different places any
  more, and a block tool's two cells come from one pick and sit against each
  other. The box is worth adding for its own sake — it would say exactly which
  face a block lands on — but it is a change to the heads-up display with no
  bearing on this one.
- **Have `pick` report whether the secondary would succeed** rather than where
  it would land, so a box could be trusted. Rejected with the box: it would run
  the inventory, occupancy, player-overlap and world-bounds checks every frame
  for a button that is mostly not being pressed.
- **Move tools to a high numeric range, `TOOL_SWORD = 1000`.** One line, and
  the collision stops happening in practice. Rejected because the two spaces
  stay the same type: a voxel id remains assignable everywhere an item id is
  expected, and the four parallel records (`COLLECTABLE`, `TOOLS`, `BREAKABLE`,
  `BREAK_YIELD`) stay hand-synchronized.
- **Declare items and tools apart**, with a `Record<ItemId, Tool>` built in
  `createVoxelscape` beside a table of names. It would let each tool take
  exactly the dependencies it needs rather than the whole `ToolContext`.
  Rejected for keeping an item's declaration in one place; the exhaustiveness
  it was wanted for comes from `Record<ItemId, ItemDefinition>` anyway.
- **Reduce the guard's damage at the two call sites**, through one
  `hurtPlayer` funnel in `createVoxelscape` that asks the wielded tool.
  Rejected because it makes guarding something only a wielded tool can do,
  which an off-hand shield would then have to work around.
- **Keep red as the crosshair's idle colour** and find a fourth colour for a
  monster. Rejected because red is what the hearts are drawn in, so spending it
  on "nothing is in reach" puts the interface's damage colour on its most
  common empty state and leaves a second, brighter red competing with it.
- **Keep the wind-up as a charge on the primary button.** Rejected because a
  press on the canvas is drag-to-look on touch, so a held primary needs either
  a movement threshold to tell a hold from a drag or a second on-screen button
  — and the hold is worth more as the guard.

## Consequences

- Adding a tool is one entry in `ITEMS` and one file. A tool drawn from the
  items spritesheet needs only its sprite name: the model builder already crops
  a sprite to its drawn pixels, so returning that rectangle gives the hotbar
  icon its crop without the hand-measured `SWORD_SPRITE_BBOX` each new tool
  would otherwise need.
- Hotbar order becomes the declaration order of `ITEMS`. It is currently the
  ascending numeric order of the ids, because JavaScript iterates integer-like
  object keys numerically whatever order they were written in.
- `Inventory` stops knowing that tools exist: both `in TOOLS` guards go, and so
  does `placeBlock`'s check that the selection is placeable, since a
  `BlockTool` is only ever constructed for a block.
- `EditingController` keeps every voxel mutation and stops reading the
  selection; `BlockTool` passes it the voxel to place.
- A dig raycasts the world once instead of twice.
- The game looks different at rest: a crosshair over nothing is a dim white
  rather than red, which is the state it is in most of the time.
- A swing no longer reaches a monster through terrain, and the sword breaks
  blocks when nothing is close enough to hit.
- The sword's pose constants leave `swing.ts` for `SwordTool`, and `swing.ts`
  keeps the interpolation and the state machine. `swing.test.ts` splits the
  same way.
- A tool test needs a whole `ToolContext` even to place a block, so the test
  files want a helper that fills the parts a given tool ignores.
- Adding an item means editing the `ItemId` union as well as `ITEMS`, and the
  compiler names every table left unfilled until it is complete.
- `items.ts` and `editing-controller.ts` import each other. Neither reads the
  other while the modules initialize — the factories are closures and the item
  table is only read inside methods — so the cycle never resolves to an
  uninitialized binding.
