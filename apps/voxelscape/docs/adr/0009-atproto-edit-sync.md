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

## OAuth: atcute browser popup

Authentication uses the atproto OAuth flow via `@atcute/oauth-browser-client`,
configured once per document in `src/atproto/oauth.ts`:

- **Development** builds a loopback client for the current origin
  (`buildLoopbackConfig`), so localhost needs no metadata server.
- **Production** fetches the hosted `client-metadata.json` and reads the
  redirect URI and scope out of it. atcute needs both up front, so the client
  reads the same document the authorization server does rather than declaring
  them separately.

atcute has no popup helper, so `signInPopup` builds the flow out of its
redirect primitives. The opener holds a blank popup window open across
`createAuthorizationUrl` (it has to be opened inside the click that started the
sign-in or the browser blocks it), then navigates it to the authorization URL.
The popup lands back on the app, `completeSignIn` exchanges the callback
parameters through `finalizeAuthorization`, and it reports the resulting DID to
the opener over a same-origin `BroadcastChannel` before closing. Only the DID
crosses: atcute persists sessions to this origin's localStorage, so the opener
resolves it back to a session with `getSession` and wraps that in an
`OAuthUserAgent`, which is the `@atcute/client` `Client`'s fetch handler and
keeps the DPoP-bound token refresh in charge of tokens.

The callback parameters arrive in the URL hash (`response_mode=fragment`), and
the deployed `redirect_uris` points at the site root because GitHub Pages has
no single-page fallback that could serve a dedicated callback path. So
`index.tsx` decides between the game and the callback page by looking for those
parameters, not by path.

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
