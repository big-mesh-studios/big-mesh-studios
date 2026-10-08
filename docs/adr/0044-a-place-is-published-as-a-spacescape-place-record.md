# 0044 — A place is published as `app.bms.spacescape.place`, versioned from the first record

## Context

A place can be written down and handed to somebody (`/place:open`, ADR 0021) but not shared with
somebody who does not have it yet. voxelscape publishes places to an atproto repository and shares
them as `at://` URIs, and that is the mechanism worth copying: `packages/atproto` is already a
workspace package with a generic session, identity and repository client, and voxelscape's read
path needs no account at all.

Two things about that had to be settled before any code, because both are expensive to change once
a record is out in someone else's repository.

**The collection.** An NSID is a public commitment. A record written under one can only be changed
by its owner republishing it, and a collection that turns out to be wrong is an orphan problem
rather than a rename.

**Whether a version goes on the record now.** A record lives in its owner's repository, not in a
database this project controls, so there is no migration to run over what is already published —
the only lever a reader has is interpreting whichever version it finds. A field absent from every
record already written cannot be added to them.

There was also a question about whether a place's attachments belong in a record. `apps/sdf-modeller`
produces `.sdfmod` files, and voxelscape attaches models to a place by publishing them as blobs and
naming each by URI and CID. The geometry half of that is settled — `model.bin` is
`serialiseOperations` output at FORMAT_VERSION 3, which this repository's own mesh workers already
read. The identity half is not: an `.sdfmod` has no name, no UUID and no content hash, so its file
name is the only handle that exists (ADR 0033).

## Decision

**`src/places/place-record.ts` is the record, its validators and its addressing. The collection is
`app.bms.spacescape.place`, distinct from voxelscape's, and every record carries `version: 1` from
the first publish.**

- **A collection of its own, not voxelscape's.** The two record shapes are not compatible: this
  engine's has an explicit `entry` and no `models`, `levels` or `mode`, and voxelscape's has all
  three and no entry. One collection read by both would be a place that opens as neither.
- **`placeRkey`, `placeAtUri` and `parsePlaceAtUri` are copied from the reference** (`voxelscape`'s
  `places/place.ts`), unchanged but for the collection string. Deriving the key from the name is
  what makes a second publish an **edit** rather than a fork, so a shared link keeps naming the
  place it named.
- **The version field is required and is `1`.** `packages/atproto`'s `versionedRecord` is the
  mechanism for reading across versions, and it is deliberately **not** used yet: a chain with one
  schema is a version check spelled at length. The first shape change adds `.upgradesTo(...)`.
- **A record's world fields are checked by `isPlaceManifest`, not by rules written twice.** `name`,
  `seed`, `spawn`, `entry` and the script names _are_ a manifest, so a change to what a place may
  say is a change in one place rather than two that can drift.
- **No `models` in the record.** A record is JSON and an attachment is bytes, so carrying one means
  uploading a blob and naming it by URI and CID — which needs a publisher and a model with an
  identity, and neither exists yet. **A project carrying an attachment refuses to publish** rather
  than publishing a place with a file silently missing from it.
- **`parsePlaceAtUri` requires a `did:`, not a handle.** Resolving a handle is a network round trip
  through a directory this code does not own, and a publisher that has a DID should hand it over.

### And in the manifest, alongside this

**`PlaceManifest` gains `models`, and ADR 0021's reason for omitting it no longer applies.** ADR
0021 omitted it because voxelscape's models are figures attached to NPCs and there are no figures.
The field is here now for a narrower reason: **a manifest's job is to say what a place's files
are**, and a project may carry files that are not part of its program — `manifest.json` is itself
such a file, described and carried and run by nothing.

What that does **not** do is promise a figure system. `readPlaceZip` reads the bytes and nothing
decodes them. A field that promised a renderer would be exactly what ADR 0021's rules exist to
prevent, so this is the line: the manifest describes, and describing is not promising.

## Consequences

**Two files that can no longer disagree.** `src/places/project.ts` holds the one shape all three
representations convert to — `writePlaceZip` ⇄ `readPlaceZip`, and `makePlaceRecord` ⇄
`projectFromRecord`. "Can this place round trip" is now one question with one answer rather than
three, and a zip cannot drift from a record without one of those four refusing.

**Republishing a renamed place publishes a second place.** `placeRkey` derives from the name, so
renaming is a new key and therefore a new address. This is the same behaviour voxelscape has and
the price of addressing a place by what it is called; the alternative is a generated key, and a
generated key gives every save of an unchanged place a new URL.

**`makePlaceRecord` is currently unusable on any project with an attachment,** and says so by
name. That is a real gap, and it is a gap rather than a silent omission on purpose: the two things
it needs are a publisher and a model identity, and neither is a small addition.

**`MAX_PLACE_MODELS` is eight and `MAX_PLACE_MODEL_BYTES` is four megabytes, both low.** Eight is
low because nothing reads the files and four megabytes is low because the bytes cannot be
interpreted — a file nobody can interpret should not be able to fill a tab. Both are one line to
raise when the feature that needs more lands.

**Nothing in the application reads any of this yet.** The editor that holds a project, the publisher
and the browser are later work, so for now `/place:open` continues to hand `startPlace` the parts
it wants and `app.tsx` is unchanged. That is the staging, not an oversight: the exporter has no
caller until there is an editor to export from.

## Alternatives

**Publish into voxelscape's collection, and read its places too.** One collection, one catalogue,
one account model. Refused because the record shapes are incompatible in both directions — the
fields are not a subset either way, so sharing a collection means reading fields the other engine
cannot interpret and refusing places for reasons the author cannot see.

**Hand-write the record's validators the way voxelscape does,** rather than routing the world fields
through `isPlaceManifest`. More consistent with the reference file and with a future split into a
shared lexicon, and it is a second copy of the seed bounds, the spawn bounds, the entry rule and
the path rules that will drift.

**Omit `version` until a shape change arrives,** which is what the reference's `PlaceRecord` does.
Fewer fields for the first publish, and a field that can never be added to a record already written
— which is the one thing a version field exists to make possible.

**Use `versionedRecord` now, with a one-entry chain,** so the mechanism is present and exercised.
A chain of one is a version check spelled at length, and the `.upgradesTo` call is the whole of the
difference when the second version arrives.

**Carry attachments in the record as inline strings,** base64 or otherwise, rather than as blob
references. One record rather than a record plus uploads, and it puts megabytes of base64 into
every listing that reads the record — and `listAll` reads records to name them.

**Let the manifest name attachments but keep refusing to read them,** which is ADR 0021's position
restated. It leaves `writePlaceZip` unable to write a project the editor can hold, so a saved place
would round-trip to one missing a file it was saved with.

## What this does not decide

**Whether attachments ever appear in a record,** and if so whether a model is referenced by blob
URI and CID the way voxelscape does or gets an identity of its own first. That needs a decision
about `apps/sdf-modeller`'s project files, which currently have none.

**How a place is found.** Publishing under a name makes a place addressable; listing every account
holding one is `listAll` in voxelscape, and which of its ceilings apply here is a later decision
along with the browser that shows them.

**Whether a place carries its own terrain.** ADR 0016's `flatten` puts the document first, so places
already layer over the world's landscape, and nothing here says a place may have one of its own.

**Whether a place is signed, versioned, or moderated.** Every published record is readable by
anyone holding the URL and every published edit is indistinguishable from its author's original,
which is the same position voxelscape takes and is not a position this repository would want to
take without saying so.
