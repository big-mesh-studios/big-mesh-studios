# voxelscape — place script API TODO

Work planned but not done, from the Roblox-gap analysis. Phases 0–2 are
implemented; the items below are what remains. Each names the ADR or module it
would touch.

## Phase 2 — presentation

- [ ] **Lights, particles, decals, billboards, per-entity material (2.3).**
      Deferred as the heaviest item: it needs new scene objects and render passes,
      not just a vocabulary. Candidate API: `light` (point/spot, on an entity or a
      point), `particle` (fixed emitter presets or a bounded spec), `beam`/`trail`,
      `billboard` (name tag, health bar, text), and `entity-look`
      (colour/alpha/material). All bounded and counted like the other effects.
      Would touch `effects.ts`, `script-host.ts`, `voxel-figures.ts`, and the
      renderer.

- [ ] **Positional (3D) audio.** The `sound` depth added in ADR 0072 names
      volume, pitch, and loop, but not a position or an entity to play from. Needs
      a listener posed against each playing source and a `PannerNode` (or the
      equivalent) in `sound-controller.ts`.

## Phase 3 — platform

- [ ] **Persistence, leaderboards, badges via atproto.** `data-get`/`data-set`
      (per-player and global) as effects whose reads arrive as facts, plus
      `badge-award`. Backed by atproto records and/or IndexedDB, with a
      last-write-by-clock merge. The key open question is async reads inside a
      synchronous, deterministic step (see ADR 0026).
- [ ] **Cross-place teleport.** A `teleport { player, placeUri }` effect
      resolved against the published place registry, with a `player-teleported`
      fact and trust/safety bounds.
- [ ] **Monetization.** Explicitly out of scope so far: no payments platform
      exists in this stack.

## Smaller deferred items from earlier phases

- [ ] **Entity impulse / knockback.** Phase 1 added `player-push` but no
      impulse for NPCs or props; without a body model an entity knockback needs
      owned-tier work (ADR 0068).
- [ ] **Host projectile entity.** Projectiles are a script pattern over
      `raycast` + `report-hit` + `getLocalPlayer` owner-gating; a built-in
      projectile would need owner election, broadcast, and dead-reckoning
      (ADR 0068). Revisit only if a game needs it.
- [ ] **Prompt world-space UI and `range` triggering.** Prompts work through
      the crosshair hint and the use gesture; a drawn prompt panel and a
      proximity-based trigger using the prompt's own `range` are not built
      (ADR 0069).
- [ ] **Block-edit facts.** `block-set`/`block-fill`/`block-clear` change the
      world and replicate through the edit layer, but author no
      `block-placed`/`block-broken` facts, so a script's own derived rules do not
      hear its edits as facts (ADR 0063). Add per-voxel facts, bounded, if a game
      needs them.
- [ ] **Skeletal/keyframe interpolation fidelity in the rigger bake.** The
      bake samples at every rig key and eases linearly between, so sparse
      parent-bone motion with dense child keys is approximated; emit per-bone-ease
      keys if exact curves are needed (ADR 0070).

## Known unrelated test failure

- `tools/voxel-rendering.test.ts > framePhases` fails at HEAD
  (`expected 'light' to be 'draw'`). It reads `render/perf-probe.ts`'s phase
  order and is not caused by the place script API work.
