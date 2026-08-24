# atproto / Bluesky edit-chunk sync

Edits from the world-coordinate overlay (ADR 0008) are persisted to the
player's atproto repo so other players can see a shared, mutable world. The
overlay is a delta over a deterministic terrain seed, so a record only needs
to say "voxel X,Y,Z is now id N" — any client can replay it onto its own
regenerated base terrain.

## Record schema and 32³ chunking

Edits are grouped into fixed 32×32×32-voxel chunks keyed by their absolute
world coordinates (`EDIT_CHUNK_DIM`), and each chunk becomes one custom
record in the `app.bms.voxelscape.edit` collection:

```
{
  $type: "app.bms.voxelscape.edit",
  chunk: { x, y, z },     // chunk origin in voxel units
  seed: <terrain seed>,   // which world this edit belongs to
  createdAt: <ISO>,       // drives last-write-wins
  edits: [{ x, y, z, id }] // sparse local offsets; id 0 removes
}
```

Chunking by location (not by which `WorldBlock` held the voxel) makes a
record addressable by coordinates and keeps record size bounded by _how much_
was edited in a chunk, not by the chunk's extents. A sync upload carries only
edits newer than the last upload (`updatedAt > lastUploadAt`), and the record
key combines the chunk coordinates with a timestamp plus random suffix —
readable, unique per upload, and within the atproto rkey grammar.

## Reconciliation: last-write-wins per voxel

Fetching on `/sync` lists the whole `app.bms.voxelscape.edit` collection and
folds every record into the overlay via `mergeIntoLayer`, which keeps the
edit whose `updatedAt` (from the record's `createdAt`) is newest. Equal
identifiers and duplicates are handled because an overlay entry is just a
coordinate plus a timestamp: re-uploading a voxel only raises its timestamp,
and an older record can never win. This is per-voxel LWW — adequate for a
first pass; a future richer merge (per-chunk CRDT or "keep the union of both
players' walls") is out of scope here.

## OAuth: atproto browser popup

Authentication uses the first-party atproto OAuth flow via
`@atproto/oauth-client-browser`. The `AtprotoController` builds a
`BrowserOAuthClient`:

- **Development** builds a loopback client for the current origin
  (`buildLoopbackClientId`), so localhost needs no metadata server.
- **Production** loads hosted client metadata from a `clientId` URL
  (`public/client-metadata.json`), which the authorization server fetches to
  learn the redirect URI and scope.

`connect()` calls `signInPopup(handle)`; `init()` restores any stored session
(or finishes the popup's callback, closing the window when it was the
popup). The authenticated `OAuthSession` powers an `AtpAgent` via its
`fetchHandler`, keeping the session-managed DPoP fetch in charge of tokens.

## Considered options

- **Store edits as one blob record per session.** Rejected: an unbounded
  record grows forever, and it can't be reconciled incrementally the way
  chunk-scoped records can.
- **Fetch only chunks near the player.** Rejected for the first pass: filtering
  by collection + cursor is trivial to get correct for the whole repo; a
  spatial index on top (custom indexing or per-chunk listing) can come later
  once the world is larger.
- **Merge by whole record timestamp.** Rejected: two players editing disjoint
  voxels of the same chunk would lose one player's work. Per-voxel LWW keeps
  the union of disjoint edits.
- **`register()`-style command wiring for `/connect`/`/sync`.** Already ruled
  out by ADR 0004 — the commands are entries in the `Commander` object literal.

## Consequences

- The `Commander` `run` signature now permits `Promise<string>` (async
  commands); `Console` echoes a pending line then appends the resolved output,
  so `/connect`/`/sync` can report network work without blocking the render loop.
- `App.tsx` wires `AtprotoController` to the shared `editLayer` (same instance
  the ring applies and persistence snapshots), gives it the terrain seed, and
  calls `atproto.init()` once at startup.
- `public/client-metadata.json` ships with placeholder origin values that must
  be replaced with the real deployment origin before the hosted OAuth flow is
  usable; loopback dev requires no change.
- A `/sync` round-trip is O(records) regardless of ring position, so large
  cumulative edit histories grow list/page cost over time — a migration target
  for spatial filtering.
