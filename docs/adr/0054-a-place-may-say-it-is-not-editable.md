# 0054 — A place may say it is not editable, and that is one bit of a mode

## Context

voxelscape's `PlaceMode` is `solo` / `solo:edit` / `multi` / `multi:edit`: one field deciding
whether a place starts multiplayer and whether its blocks may be broken or placed. Spacescape has
no multiplayer, so `place-file.ts` and `place-record.ts` deliberately left `mode` out — two of its
four values would be switches wired to nothing, and a field the engine accepts but does not keep
is a promise rather than a format.

The half of that mode which _is_ true here is the edit lock. A place built to be looked at, read,
or played as a story should not be a sandbox the moment somebody presses the secondary mouse
button, and a published place needs to carry that choice with it: a shared `at://` address is the
only thing a future player has, so a lock that lived only in a zip or only in a session would be a
lock its author could not actually publish.

## Decision

**`editable?: boolean` is a manifest field and a record field. Absent means editable; `false`
means the player may not dig or place while the place runs.**

- **Absent is the default, not `true`.** Every place written before the field existed stays
  editable, and a publisher that has not chosen a lock writes nothing. `writePlaceZip` carries the
  manifest through unchanged; `makePlaceRecord` writes `editable: false` only when it is false,
  and `projectFromRecord` reads it back so a fork cannot silently unlock the place.
- **The validator refuses anything but a boolean.** `"false"` is a tool guessing at a type, and
  coercing it would make two spellings mean one thing while the next guess means something nobody
  chose.
- **The engine applies it to the player's aim, not to the place.** `Game.setEditing(false)` makes
  `updateAim` refuse to begin a stroke and ends one already underway; `dropPlace` puts it back to
  `true`. A place's own script writes through `PlaceHost` and is unaffected, because scripted
  geometry is the place's content rather than a player changing it.
- **No per-click refusal message.** `Game` owns the aim and has no message channel; the place's
  load report says `editing off — dig and place are disabled` instead. A place that wanted to
  narrate every blocked click could ask for a much larger seam than this decision is worth.

The place editor exposes the field as a two-state `editing` control, and `setEditable(true)`
deletes the key rather than writing `true`, the same rule `setSpawn` and `setWorld` follow for
their defaults.

## Consequences

**A record's edit lock is a public promise of the same kind as its name.** Once published, changing
`editable` means republishing under the same key; another account's copy keeps the lock its author
chose. That is the same position every other field on a place record is in (ADR 0044).

**Existing places do not move.** `editable` is optional, so every zip and every record already
written opens exactly as it did, and only `false` changes behaviour. The record still needs no
second `version`: adding an optional field is not the breaking change ADR 0044 reserved a version
for.

**The level editor and the place editor are not locked.** `/place:level`, Run, and the editor's
own script panes stay available while a locked place runs. This is the author's tooling, and a
lock that also took it away would make a published place impossible to keep working on from the
same build.

**Multiplayer is still open.** This ADR does not decide whether a place starts multiplayer, who
may join, or whose edits become durable. It adds the one bit of `mode` that can be honoured today,
and leaves `solo` / `multi` to the feature that would need them.

## Alternatives

**Copy voxelscape's four-value `mode`.** One field matching the reference exactly, and two values
that would do nothing until multiplayer exists — the switch-wired-to-nothing that
`place-file.ts` already refused once.

**A runtime-only `/place:lock` command.** No format change and no publication question, and a lock
that is lost the moment the place is shared, which is the only case where it matters.

**Refuse the player's edits inside `SculptSession` instead of `Game`.** A deeper gate would catch
every caller, but the sculpt session also serves the `?edit` page and the pointer tool, and a
place's `editable` is a fact about the player's game rather than about the brush.
