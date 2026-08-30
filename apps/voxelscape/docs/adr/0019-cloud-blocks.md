# Cloud blocks: standable voxel clouds in the fill

The moving cloud field (ADR 0018) is a set of static meshes with no collision,
so a flying player passes through it. The ask was for white cloud blocks the
fill generates near those clouds — still, standable "secret" ground.

## Decision

One white voxel id, `VOXEL_CLOUD = 5`, textured with the existing `snow` tile
on all six faces (the whitest tile already in the atlas; no spritesheet edit).
The fill (`fillStore`) scatters still clouds through the band `CLOUD_Y ± 64`
world units, sampled from the same seeded 3D Perlin field the puffs are built
from, so the still layout lines up with the visible sky. The sampling lives in
a new `world/cloud-fill.ts`, not `environment/clouds.ts`, because the fill
worker must not pull in rmsl; the module imports only `noise.ts` and mirrors
the puff knobs (frequency `CLOUD_PERIOD / CLOUD_TILE`, flatness, octaves,
threshold, and the per-column coverage gate and drive), so a column only
samples voxels where the field is densest and the fill cost of a cloud column
is gated the same way the puff cells are. A single band-overlap check on the
block's y-range keeps every other fill exactly as cheap as before.

Cloud voxels are solid to the player — `isSolidAt` and `getGroundHeightBelow`
treat them like any block, so a player lands on a cloud's top. The ground
height sampler (`topSolidYInColumn`) skips them the way it skips water, so
`getWorldHeight` — spawn, respawn, monster spawns and walking, and where rain
lands — still reads the terrain under the clouds. Breaking a cloud yields a
Cloud inventory item (`BREAK_YIELD`/`COLLECTABLE`), so it mines and places like
dirt.

## Considered options

- **Two cloud ids (a shaded core variant).** Rejected per the request: one
  white id; a second variant can be added later by banding the noise value
  without touching the fill's structure.
- **A new white cotton tile added to the spritesheet.** Rejected for now:
  reusing `snow` needs no binary asset change. Swapping the texture later is a
  one-line `VOXEL_TILES` edit.
- **Aperiodic noise for the still clouds.** Rejected: reusing the puff field's
  period-8 noise is what lines the still clouds up under the visible puffs,
  and the field's 1024-unit repeat is hidden behind the fog (`maxDistance` 480) exactly as the puff field's already is.
- **Clouds as unbreakable terrain.** Rejected per the request: they are
  collectable, so a mined cloud breaks into an item the player can place.
- **Making the puffs themselves standable.** Rejected: the puffs are meshes
  with no voxel data and no collision; standable ground has to be world
  voxels, which is what the fill writes.

## Consequences

- `voxel-store.ts` gained `VOXEL_CLOUD = 5`, within the edit wire's
  `MAX_VOXEL_ID`.
- `atlas.ts` gained a `VOXEL_TILES` entry (top/side/bottom all `snow`);
  `inventory.ts` gained the Cloud item; the hotbar now lists Dirt, Cloud,
  then the Sword.
- `world/cloud-fill.ts` owns the still-cloud knobs and the seeded noise; the
  moving field in `clouds.ts` keeps its own constants, so the two must stay
  numerically in agreement where they are meant to overlap (altitude and
  frequency).
- `fillStore` samples the cloud field only for blocks whose rows intersect the
  band, and per column only past the coverage gate, so ordinary terrain fills
  cost nothing and cloud fills stay bounded.
- `level-data.ts` skips cloud voxels in the ground-height scan only; the
  collision and standing samplers still see them.
- `voxel-store.test.ts`, `level-data.test.ts`, `inventory.test.ts` and the new
  `cloud-fill.test.ts` pin the fill, the samplers and the item.
