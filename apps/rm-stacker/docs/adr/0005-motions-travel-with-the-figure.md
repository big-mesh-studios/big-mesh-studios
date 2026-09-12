# A figure's motions travel inside its own zip, not a new lexicon field

A figure has carried several named motions for a while now — a walk, an
idle, a t-pose — chosen between in the editor and saved to the browser's own
database. Publishing a model has never touched them: `saveFigure` writes only
`parts.json` and each part's drawings, so the moment a model leaves this
editor for somewhere else, whatever it does over time is left behind. A
published model is a shape standing still.

This decision makes motions leave with the rest of the figure, by writing
them into the same zip `saveFigure`/`loadFigure` already read and write:
`parts.json` gains a `motions` array (`version: 4`) alongside its existing
`parts` list.

## Why not a field on `ModelRecord` instead

`ModelRecord` (`packages/stacker/src/lexicon.ts`) already carries `name`,
`dimensions`, and an optional `thumbnail` beside the figure's zip blob. Those
three exist so a listing can be drawn — a name to show, a box to lay out, a
picture to render — without downloading and decoding the zip itself. A
motion answers a different question, one nothing asks until the zip is
already open: what does this part do between frame twelve and frame
twenty-four? There is no listing-level use for it, so there is nothing to
gain by lifting it out of the blob the way `thumbnail` was worth lifting out.

Keeping it inside the zip instead means:

- **No atproto or lexicon change at all.** `ModelRecord`'s shape, and every
  reader of it, stands exactly as it is. `publishCurrent`'s existing call —
  `saveFigure(figure(), motions())` — carries motions through the same
  `file: LexBlob` it always has.
- **One reader, not two.** `packages/stacker/src/format.ts` is already the
  single place both rm-stacker and voxelscape go to make sense of a model's
  bytes (ADR 0015). A motion riding in `parts.json` means that stays true;
  a motion riding in the record would mean a second shape, read a second way,
  kept in step with the first by hand.

## Considered options

- **A `motions` field on `ModelRecord`, the way `registries` was added.**
  Rejected: `registries` (a later decision) is there to be _browsed_ without
  opening a model at all — that is exactly the lexicon-level use case a field
  earns its place by having, and motions have no equivalent. Adding it anyway
  would mean the record and the zip disagree about where a figure's motion
  data actually lives, for no reader that needs it.
- **A second file inside the zip (`motions.json`) rather than a field on the
  existing manifest.** Rejected as unnecessary complexity: `parts.json` is
  already read whole and parsed as one object; a sibling field costs nothing
  a sibling file would not, and keeps one file to open rather than two.

## Consequences

- `PartsManifest`'s version comment now narrates four changes, not three;
  `readManifest` always returns `version: 4` regardless of what it read, the
  same as it always returned `3` before — the number documents what the
  writer supports, not something a reader branches on.
- A file written before this ships has no `motions` key at all, and reads
  back as `motions: []` — the same "missing means it never had one" tolerance
  already given to a part's `turn`, `scale`, and `sections`.
- `saveFigure`/`loadFigure` both gain a `motions` parameter/field, defaulted
  and optional respectively, so every existing caller that has no reason to
  care about motions keeps compiling and behaving exactly as it did.
- rm-stacker's own IndexedDB storage of motions (a separate key, predating
  this decision) becomes a fallback rather than the source of truth: the zip
  is read first, and the old key is only consulted for a browser profile
  whose last autosave predates this change. The next autosave re-embeds
  motions in the zip and the fallback is never consulted again for that
  profile.
