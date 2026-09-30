# The level editor offers every block, and draws each as the tile the world draws it with

The editor's block palette was a hand-kept list of sixteen, and the world had
thirty-three blocks it could place. The seventeen it left out were every wool
colour and fire embers, so a plan could be written with a wool in it but not
built with one. Two other lists in the world disagreed about the set as well: the
ids a place script may name was a different sixteen, and the tile table was
complete at thirty-three. Nothing failed and nothing said so. Seventeen blocks
were simply unreachable from the tool whose whole job is placing them.

## One list of blocks, in the world

`world/voxel-blocks.ts` states every block: its id, the name the world shows, the
name a place script names it by, and the family it belongs to. It is the whole
set, and three things read it — the editor's palette, a script's `engine.blocks`,
and the label the shape list puts beside each shape. A wool a plan names and a
wool a script names and a wool the palette offers are now the same entry, read
three times.

The list reads each block's tile out of `world/voxel-tiles.ts` rather than
restating it, so a block and the tile the world draws it with cannot drift. That
table moved out of `renderers/atlas.ts`, where it had no business being: it is
plain data, and everything that names a block's tile — the palette, a place
editor's custom blocks, the icon a block is drawn as — can now do so without a
graphics context in its import graph.

Two ids in the tile table are not blocks a structure chooses. The flowing levels
of a fluid and its falling column are drawn like their source, and a structure
produces them by placing that source; the world's flow derives the rest. They are
excluded by name in the test that would otherwise catch them.

## The picker draws tiles

The palette was one text tab per block, in the same wrapping row as the eight
tools, the undo and redo pair, and the camera style. That does not survive
thirty-three blocks, least of all in a sheet capped at half a short landscape
viewport, where the row had to scroll to reach a colour.

It is a grid of chips now, each a block's tile above its name, grouped into
Terrain, Nature, Built and Wool. The picker is a panel of its own rather than
part of the tool row, because thirty-three chips and four group headings do not
fit above eight tool tabs on a phone, and a tool row you have to scroll to find
a colour in is no longer a tool row. It keeps the same 44-pixel minimum target a
finger needs that the rest of the editor's controls already have.

Chips carry a name as well as a picture. The wools include both Gray and Light
Gray, and both Magenta and Purple, and no amount of colour separates those.

The grid is a radio group: one tab stop, and the arrow keys move through it by
block and by row, checking the block they land on the way a radio group does.

## Eighteen of the tiles are generated, so the editor generates them too

Most tiles are crops of the spritesheet the world is drawn from, cropped by
background position the way a hotbar item crops the items sheet. Eighteen are
not in it. The sixteen wools, obsidian and glowstone are generated onto the end
of the sheet at load, which grows it from 1152 by 1280 to 1152 by 1792 and
records where each new tile landed. They exist in no file, so no sprite offset
can address them.

So each of the three generators keeps its painting loop as an exported function
beside the injector that grew the sheet with it, and the editor calls those
directly at the size an icon wants. A block's icon is then the same pixels the
world draws the block with, from the same code, rather than an approximation of
them. This is the one edge from the level editor into the renderers, and it is
recorded in the architecture rules rather than taken quietly.

Air is the one block with no tile at all, being the nothing a box of it carves
out of the terrain, and is drawn as the two-tone grid an empty cell is shown as
everywhere else. Water has no tile in the table either, since the water mesh
draws it rather than the terrain mesh, so it names the sheet's own water tile for
its icon alone.

A block's tile the sheet could not be read for leaves its chip an empty well,
which no block's own tile resembles, rather than a plausible wrong picture.

## Considered options

- **Leave the palette a list of names.** Rejected: it is what produced the gap in
  the first place. A hand-kept list of what exists is a list that falls behind,
  and nothing here failed loudly enough to notice.
- **Add the seventeen missing blocks to the existing tab row.** Rejected: it
  fixes the coverage and leaves the control unusable, which is the half of the
  problem that is visible.
- **Mint new blocks from the tiles the sheet already carries but nothing wires
  up** — red wood, white trunk, orange leaves, grey brick, the coloured cottons,
  the glass. Rejected for now: it is world content rather than an editor fix, and
  each one wants an id, a tile-table entry, and a decision about whether it is
  breakable and what it yields.
- **Bake the eighteen generated tiles into the spritesheet once.** Rejected: it
  would make the editor's job smaller at the price of a binary asset, and it
  overturns the reason obsidian is generated at all, which is to keep an
  artist-made image out of the sheet.
- **Keep the tile table in the renderers and let the palette import it from
  there.** Rejected: a table of tile names is not a thing that needs a texture,
  and reaching into the renderers for it would put a graphics context in the
  import graph of everything that names a block.
- **Icon-only chips, the name on the tooltip.** Rejected: Gray and Light Gray
  have to be told apart, and a thumb-sized grid is where a tooltip is least
  likely to be waited for.

## Consequences

- `world/voxel-blocks.ts` is the set; adding a block means adding an entry there
  and a tile, and the editor, the script sandbox, and the shape labels all pick
  it up.
- `voxel-blocks.test.ts` holds the sets to each other: that every block but air
  has a tile, that every tiled id but a fluid's flowing states is offered, that
  every block's icon tile is either in the shipped atlas or one the sheet is
  generated with, and that each wool is generated under the name a script and an
  item both know it by. A block whose icon names a tile that does not exist fails
  the suite rather than the palette.
- The level editor now reaches into the renderers, which
  `tools/architecture.ts` records.
- A wool item's icon colour is the colour its tile is drawn in, rather than a
  second set of values kept alongside it, so the two agree.
