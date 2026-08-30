# Remove the moving cloud field

The world had two cloud concepts that a player could not tell apart at a
glance: the moving puff field (ADR 0018), a set of static meshes drifting
across the sky, and the still Cloud Blocks the fill scatters at the same
altitude (ADR 0019), standable voxels the player mines and places. Having both
read as a duplication — one set of white blocks moving, another set the player
stands on — so the puff field was removed and the Cloud Blocks kept.

## Decision

Delete `environment/clouds.ts` and its test file, and every reference to the
field:

- `createEnvironment` no longer takes the `seed` it existed for, does not
  construct a `CloudController`, does not tick it, and does not feed it
  lighting; the `Environment` object drops its `clouds` member.
- The composer no longer places `environment.clouds.cloudField` in the scene,
  and `scene-order.test.ts` drops it from the declared draw order.
- The `/clouds` command and the `clouds` parameter it read are gone from the
  command table.
- `lib.ts` stops re-exporting the field's generator, controller and material.
- `world/cloud-fill.ts` and `world/noise.ts` comments that pointed at the puff
  field are rewritten to describe the still clouds on their own terms.

The still-cloud module keeps its own constants (`FILL_CLOUD_*`); with no puff
field there is nothing for them to stay numerically in agreement with, which
retires the coupling requirement ADR 0019's consequences recorded. `PerlinNoise3D`
stays — `cloud-fill.ts` is still its only consumer — so the cloud blocks keep
their deterministic, tile-periodic layout unchanged.

## Considered options

- **Keep the puffs and drop the blocks.** Rejected: the user asked for the
  moving clouds to go, and the blocks are the playable thing — the player
  stands on them, mines them and places them, which the puffs never did.
- **Keep both.** Rejected: that is the confusion this change removes.

## Consequences

- The sky no longer moves; the only clouds left are the standable blocks the
  fill scatters through the `FILL_CLOUD_Y` band, which a player breaks and
  places like dirt.
- `environment/clouds.ts`, `clouds.test.ts`, and the `CloudController`,
  `CloudMaterial`, `cloudCellVolume` and `cloudCoverage` exports are gone.
- `EnvironmentConfig.seed` is removed; the environment's systems (day-night,
  weather, sound) are all seed-free.
- This supersedes ADR 0018. ADR 0019's decision stands; only its consequence
  about the two cloud fields staying numerically in agreement is vacated.
