# 0058 — A level's material name reaches the fold

## Context

The level editor has offered a material dropdown since ADR 0048 put a material id in the colour's
free byte. `LevelShape` and `LevelWalls` carry `material?: string`; `parseLevelPlan` reads it and
refuses a name this build does not know; `writeLevelPlan` writes it back; the properties panel
edits it. A level file can say `"material": "brick"` and a person can see it in the editor.

It did nothing in the world. `apply-level.ts`'s `operationOf` passed softness, orientation and colour
to `placeOperation` and stopped; `wallOptions` passed softness, orientation and colour and stopped.
The comment on `wallOptions` said so in as many words — "not carried, matching `operationOf`" — and
left the wiring for a day when both could be done at once. So a level could be authored with a
material and open with every wall, floor and counter plain, with nothing in the file or the editor
to say the material had been dropped.

`Operation.material` is a **number**, not a name (ADR 0048), because an operation crosses into a
meshing worker and the table the number indexes lives in the renderer. `placeOperation`'s options
also did not carry it, so even a caller with the id had no way through.

## Decision

**`placeOperation` accepts `material?: number`, and `apply-level.ts` maps a level item's material
name to that id at the moment it builds the operation — the same conversion for a shape and for a
walls segment.**

- **One conversion, `materialOf`, used by both paths.** A shape and a walls item carry the same
  vocabulary, so both go through one function. A walls item that applied a material a shape did not
  would be one truth per item kind, which is the defect this change is removing rather than a
  smaller version of it.
- **The map belongs at the boundary between the document and the fold.** The name is the file's
  vocabulary; the id is the fold's. `parseLevelPlan` has already refused a name this build does not
  know, so the conversion cannot fail for a file that was read. The guard in `materialOf` is for a
  live plan built by the editor, whose dropdown uses the same list; an unknown name there is a bug,
  and dropping it is the honest failure rather than claiming material 0 (`plain`).
- **Absent stays absent.** A level item with no material produces an operation with no material,
  which is what ADR 0048 means by "no say in appearance". It does not produce id 0, because `plain`
  is a real pattern and a real choice.
- **No file-format change.** `material` was already in the format and already validated; this is the
  reader that was missing, not a new field. `LEVEL_VERSION` stays where it is.
- **`animal-hospital.json` names its materials.** The walls and ceiling are `plaster`, the floor
  `tile`, and the reception desk and its recesses `timber`. That is the place this was found in, and
  it is also the place that shows what the field is for: a plaster wall and a tiled floor read as a
  hospital without a texture asset.

## Consequences

**A level's materials now appear in the world, and the mesh's fourth byte carries them.** The
animal hospital shows three distinct ids — `plaster`, `tile` and `timber` — in the vertices of its
chunks, which is the check the probe uses; before this, every vertex carried the default.

**A material name is part of a level's appearance, so renaming one in the renderer changes what an
old file looks like.** The list is a closed vocabulary and `parseLevelPlan` is the gate: a name that
is no longer in `MATERIAL_NAMES` refuses the whole file, which is the same all-or-nothing rule ADR
0017 states for a payload. That is deliberately stricter than skipping the material, because a
silently plain wall is exactly the failure this change is fixing.

**The fold still holds a number, and the worker still needs no table.** ADR 0048's reason for the
number is untouched: the mesher writes the byte and the renderer's shader owns the pattern. The
conversion is main-thread work, once per operation, at the point where a file becomes a world.

**A live edit that names an unknown material loses it rather than gaining a default.** The editor's
dropdown cannot offer one, and `parseLevelPlan` cannot read one; the only way in is a plan built in
code with a name that table does not have. That is a bug in the builder, and the operation is
otherwise still applied — which is better than refusing a shape the person can see on screen.

## Alternatives

- **Put the name on `Operation` and map it in the renderer.** Rejected by ADR 0048: the operation
  crosses into a worker that has no renderer, and the byte the mesher writes has to mean something
  without the table. A name in the fold would move the renderer's vocabulary into the field.
- **Map the name inside the renderer, from a string carried alongside the byte.** Rejected for the
  same reason, and it would need a second source of truth for what the byte means.
- **Default an unknown name to `plain`.** Rejected: it would make a typo look like a decision, and
  the file reader already refuses the typo, so the only case left is a builder bug that should be
  loud rather than painted over.
- **A format version bump.** Rejected: the field was already declared, written and validated, so an
  old build reading a new file loses nothing it could have used — it drops the material, which is
  the behaviour this change fixes — and a bump would refuse every level written before it. The
  forward-compatibility cost is recorded rather than hidden: an old build still opens the file and
  draws it plain.
